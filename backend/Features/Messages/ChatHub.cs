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
        // 1. 送信者がルーム参加者かどうかの検証
        // JoinedAt を考慮して「現在有効なメンバー」のみに限定することも可能です
        var currentMembers = _db.RoomMembers
            .Where(rm => rm.RoomId == roomId)
            .ToList();

        var isSenderMember = currentMembers.Any(rm => rm.UserId == userId);
        if (!isSenderMember) return;

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
        // ==========================================
        // 1. SET フェーズ (既読フラグを立てる)
        // ==========================================
        var access = await _db.MessageAccesses
            .FirstOrDefaultAsync(x => x.MessageId == messageId && x.UserId == userId);

        // 既に既読済み、または権限がない場合は即終了
        if (access == null || access.IsRead) return;

        access.IsRead = true;
        await _db.SaveChangesAsync();

        // ==========================================
        // 2. DELETE フェーズ (全員読んだらサーバーから物理削除)
        // ==========================================
        var unreadCount = await _db.MessageAccesses
            .CountAsync(x => x.MessageId == messageId && x.IsRead == false);

        if (unreadCount == 0)
        {
            var message = await _db.Messages.FindAsync(messageId);

            if (message != null)
            {
                if (message.Type == "Image")
                {
                    try
                    {
                        // S3から画像を物理削除
                        await _s3Client.DeleteObjectAsync("minimal-chat-images", message.Content);
                        Console.WriteLine($"[Security] Image deleted from S3: {messageId}");

                        // S3削除成功後、DBの Message レコードを物理削除
                        // （EF CoreのCascade Deleteにより、全員分の MessageAccess も自動的に物理削除されます）
                        _db.Messages.Remove(message);
                        await _db.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Error] S3 Delete failed for {messageId}. {ex.Message}");
                    }
                }
                else
                {
                    // テキストメッセージなどの場合（S3不要）
                    _db.Messages.Remove(message);
                    await _db.SaveChangesAsync();
                }
            }
        }
    }
}