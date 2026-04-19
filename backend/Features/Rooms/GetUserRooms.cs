using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Infrastructure;

namespace MinimalChat.Backend.Features.Rooms;

public static class GetUserRooms
{
    /// <summary>
    /// ユーザーが参加しているルーム一覧取得エンドポイントのルーティングを登録します。
    /// </summary>
    public static void MapGetUserRoomsEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users/{userId:guid}/rooms", async (Guid userId, AppDbContext db) =>
        {
            // RoomMember テーブルから指定されたユーザーが参加しているルームを抽出し、
            // Room テーブルの情報を結合（Select）して取得します。
            var rooms = await db.RoomMembers
                .AsNoTracking()
                .Where(rm => rm.UserId == userId)
                .Select(rm => new
                {
                    RoomId = rm.Room!.Id,
                    Name = rm.Room.Name,
                    JoinedAt = rm.JoinedAt // 必要に応じて参加日時も返す
                })
                .OrderByDescending(r => r.JoinedAt) // 最近参加した順などでソート
                .ToListAsync();

            if (!rooms.Any())
            {
                // まだどのルームにも参加していない場合は空の配列を返す
                return Results.Ok(Array.Empty<object>());
            }

            return Results.Ok(rooms);
        })
        .WithTags("Rooms", "Users")
        .WithSummary("ユーザーが過去に参加したルームの一覧（IDと名前）を取得します。");
    }
}