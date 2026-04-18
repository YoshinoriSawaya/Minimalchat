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
}

/// <summary>
/// チャットのリアルタイム通信を管理するSignalRハブ
/// </summary>
public class ChatHub : Hub<IChatClient>
{
    private readonly AppDbContext _db;

    // VSAの原則に則り、DbContextを直接注入
    public ChatHub(AppDbContext db)
    {
        _db = db;
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
        // 1. ルーム参加者かどうかの検証
        var isMember = _db.RoomMembers.Any(rm => rm.RoomId == roomId && rm.UserId == userId);
        if (!isMember) return; // 参加していない不正なリクエストはサイレントに無視

        // 2. データベースへ保存
        var message = new Message
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            UserId = userId,
            Type = type,     // "Text" または "Image"
            Content = content, // 画像の場合は事前にアップロードされたR2のURL
            SentAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync();

        // 3. ルーム内の全クライアントに配信するペイロード
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
}