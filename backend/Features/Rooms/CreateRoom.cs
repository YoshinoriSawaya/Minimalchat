using MinimalChat.Backend.Domain;
using MinimalChat.Backend.Infrastructure;

namespace MinimalChat.Backend.Features.Rooms;

public static class CreateRoom
{
    /// <summary>
    /// 新規ルーム作成エンドポイントのルーティングを登録します。
    /// </summary>
    public static void MapCreateRoomEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/rooms", async (AppDbContext db) =>
        {
            var room = new Room
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow
            };

            db.Rooms.Add(room);
            await db.SaveChangesAsync();

            return Results.Ok(new { RoomId = room.Id });
        })
        .WithTags("Rooms")
        .WithSummary("新しいチャットルームを作成します。");
    }
}