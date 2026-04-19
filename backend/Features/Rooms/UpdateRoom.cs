using Microsoft.AspNetCore.SignalR;
using MinimalChat.Backend.Features.Messages;
using MinimalChat.Backend.Infrastructure;

namespace MinimalChat.Backend.Features.Rooms;

public static class UpdateRoom
{
    public record UpdateRoomRequest(string Name);

    public static void MapUpdateRoomEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPut("/api/rooms/{roomId}", async (Guid roomId, UpdateRoomRequest req, AppDbContext db, IHubContext<ChatHub, IChatClient> hubContext) =>
        {
            var room = await db.Rooms.FindAsync(roomId);
            if (room == null) return Results.NotFound();

            room.Name = req.Name;
            await db.SaveChangesAsync();

            // ルームにいる全員に変更を通知（自分も含めてヘッダーを更新させる）
            await hubContext.Clients.Group(roomId.ToString()).RoomNameUpdated(req.Name);

            return Results.Ok();
        });
    }
}