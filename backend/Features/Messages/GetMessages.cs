using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Infrastructure;

namespace MinimalChat.Backend.Features.Messages;

public static class GetMessages
{
    /// <summary>
    /// メッセージ履歴取得エンドポイントのルーティングを登録します。
    /// </summary>
    public static void MapGetMessagesEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/rooms/{roomId:guid}/messages", async (Guid roomId, Guid userId, AppDbContext db) =>
        {
            // 1. ユーザーの参加日時 (JoinedAt) を取得
            var member = await db.RoomMembers
                .AsNoTracking() // 読み取り専用なのでトラッキングを無効化し高速化
                .FirstOrDefaultAsync(rm => rm.RoomId == roomId && rm.UserId == userId);

            if (member == null)
            {
                return Results.Unauthorized(); // 未参加ユーザーのアクセスは拒否
            }

            // 2. 【絶対の掟】JoinedAt 以降のメッセージのみを取得
            var messages = await db.Messages
                .AsNoTracking()
                .Where(m => m.RoomId == roomId && m.SentAt >= member.JoinedAt)
                .OrderBy(m => m.SentAt) // 古い順にソート
                .Select(m => new
                {
                    m.Id,
                    m.UserId,
                    m.Type,
                    m.Content, // テキスト、またはCloudflare R2の画像URL
                    m.SentAt
                })
                .ToListAsync();

            return Results.Ok(messages);
        })
        .WithTags("Messages")
        .WithSummary("ルームのメッセージ履歴を取得します（参加日時より前のログは確実に遮断します）。");
    }
}