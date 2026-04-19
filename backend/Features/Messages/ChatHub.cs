using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using MinimalChat.Backend.Domain;
using MinimalChat.Backend.Infrastructure;

namespace MinimalChat.Backend.Features.Messages;

/// <summary>
/// クライアント側で受信を待ち受けるメソッドの型定義（タイプセーフ化）
/// </summary>
public interface IChatClient
{
    Task ReceiveMessage(object message);
    // ↓ WebRTC用のシグナル受信メソッドを追加
    Task ReceiveSignal(Guid senderId, string type, string payload);

    // ↓ 既読・削除のリアルタイム通知用
    Task MessageReadStateUpdated(Guid messageId, Guid userId);
    Task MessageDeleted(Guid messageId);

    Task RoomNameUpdated(string newName); // 追加
}

/// <summary>
/// チャットのリアルタイム通信を管理するSignalRハブ
/// </summary>
public class ChatHub : Hub<IChatClient>
{
    private readonly AppDbContext _db;
    private readonly IAmazonS3 _s3Client; // S3クライアント


    // VSAの原則に則り、DbContextを直接注入
    public ChatHub(AppDbContext db, IAmazonS3 s3Client)
    {
        _db = db;
        _s3Client = s3Client;
    }

    /// <summary>
    /// SignalRのグループ（ルーム）に参加します。
    /// フロントエンドがWebSocket接続を確立した直後に呼び出します。
    /// </summary>
    public async Task JoinRoomContext(Guid roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
    }

    /// <summary>
    /// メッセージを受信し、データベースに保存後、ルーム全員に配信します。
    /// </summary>
    public async Task SendMessage(Guid roomId, Guid userId, string type, string content)
    {
        // 1. 送信者を含むルームメンバーを、User情報込みで取得
        var currentMembers = _db.RoomMembers
            .Include(rm => rm.User)
            .Where(rm => rm.RoomId == roomId)
            .ToList();

        var senderMember = currentMembers.FirstOrDefault(rm => rm.UserId == userId);
        if (senderMember == null) return;

        // 2. メッセージオブジェクトの作成
        var messageId = Guid.NewGuid();
        var message = new Message
        {
            Id = messageId,
            RoomId = roomId,
            UserId = userId,
            Type = type,
            Content = content,
            SentAt = DateTime.UtcNow
        };

        // 3. 【追加】その時点のルームメンバー全員を MessageAccess として登録
        // これにより、後から入ったユーザーにこのメッセージを見せない等の制御が可能になります
        var accessList = currentMembers.Select(m => new MessageAccess
        {
            Id = Guid.NewGuid(),
            MessageId = messageId,
            UserId = m.UserId
        }).ToList();

        // データベースへ保存 (Message と MessageAccess を一括追加)
        _db.Messages.Add(message);
        _db.MessageAccesses.AddRange(accessList); // DbSet名を MessageAccesses と想定
        await _db.SaveChangesAsync();

        // 4. ルーム内の全クライアントに配信するペイロード
        var payload = new
        {
            message.Id,
            message.UserId,
            DisplayName = senderMember.User?.DisplayName ?? "名無し",
            message.Type,
            message.Content,
            message.SentAt
        };

        // ルーム（グループ）全員に対して即時配信
        await Clients.Group(roomId.ToString()).ReceiveMessage(payload);
    }

    /// <summary>
    /// WebRTCのシグナリングデータ（Offer, Answer, ICE Candidate）を中継します。
    /// データベースには一切保存せず、自分以外のルーム参加者に即座にパスします。
    /// </summary>
    public async Task SendSignal(Guid roomId, Guid senderId, string type, string payload)
    {
        // 自分自身（Context.ConnectionId）を除外して、ルーム内の他メンバーに送信
        await Clients.GroupExcept(roomId.ToString(), Context.ConnectionId)
                     .ReceiveSignal(senderId, type, payload);
    }

    /// <summary>
    /// 画像のアクセス（既読）を処理し、必要に応じて物理削除を行います。
    /// フロントエンドが画像を表示した瞬間に呼び出します。
    /// </summary>
    public async Task HandleImageAccess(Guid messageId, Guid userId)
    {
        // 1. レコードの取得
        var access = await _db.MessageAccesses
            .FirstOrDefaultAsync(x => x.MessageId == messageId && x.UserId == userId);

        if (access == null)
        {
            Console.WriteLine($"NoAccess: {messageId},{userId}");
            return;
        }

        // 2. まだ未読なら既読（IsRead = true）にする
        if (!access.IsRead)
        {
            Console.WriteLine($"AccessReading: {messageId},{userId}");
            access.IsRead = true;
            await _db.SaveChangesAsync();
        }
        else
        {
            Console.WriteLine($"AccessWasReaded: {messageId},{userId}");

        }

        // 既に IsRead == true だった場合でも return せずに、ここから下のチェックを必ず実行する！

        // 3. 残りの未読数をチェック
        var remainingCount = await _db.MessageAccesses
            .CountAsync(x => x.MessageId == messageId && x.IsRead == false);

        if (remainingCount == 0)
        {
            Console.WriteLine("remainingCount == 0");
            var message = await _db.Messages.FindAsync(messageId);
            if (message != null && message.Type == "Image")
            {
                Console.WriteLine("message != null && message.Type == 'Image'");
                try
                {
                    // 1. URLを安全にパースする
                    var uri = new Uri(message.Content);

                    // 2. パス部分（例: /minimal-chat-images/rooms/123/abc.jpg）を取得
                    var path = uri.AbsolutePath;

                    // 3. バケット名の後ろから最後までを切り出す（これが正確なObjectKey）
                    var bucketPrefix = "/minimal-chat-images/";
                    var objectKey = path.Substring(path.IndexOf(bucketPrefix) + bucketPrefix.Length);

                    // 4. （念のため）URLエンコードされている文字を元に戻す
                    objectKey = Uri.UnescapeDataString(objectKey);

                    // S3から物理削除
                    await _s3Client.DeleteObjectAsync("minimal-chat-images", objectKey);
                    Console.WriteLine($"[Security] Physically deleted from S3: {objectKey}");

                    // S3成功後にDB物理削除
                    _db.Messages.Remove(message);
                    await _db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Error] S3 Delete failed for {messageId}. {ex.Message}");
                }
            }
            else if (message != null)
            {
                Console.WriteLine("message != null");
                // テキストメッセージなどの場合（今回は画像だけですが念のため）
                _db.Messages.Remove(message);
                await _db.SaveChangesAsync();
            }
            else
            {
                Console.WriteLine("Not (message != null && message.Type == 'Image')");

            }
        }
        else
        {
            Console.WriteLine("remainingCount > 0");
        }
    }
}