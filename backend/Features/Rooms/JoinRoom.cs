using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Domain;
using MinimalChat.Backend.Infrastructure;

namespace MinimalChat.Backend.Features.Rooms;

public static class JoinRoom
{
    /// <summary>
    /// ルーム参加リクエストのペイロード
    /// フロントエンドで生成したUUIDを信頼して受け取ります。PIIは一切含みません。
    /// </summary>
    public record JoinRoomRequest(Guid UserId, string DisplayName);

    /// <summary>
    /// ルーム参加エンドポイントのルーティングを登録します。
    /// </summary>
    public static void MapJoinRoomEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/rooms/{roomId:guid}/join", async (Guid roomId, JoinRoomRequest request, AppDbContext db) =>
        {
            // 1. ユーザーの存在確認とUpsert
            // FindAsync ではなく、追跡を明示的に行うか、FirstDefault を使用
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);

            if (user == null)
            {
                Console.WriteLine($"user == null");
                user = new User { Id = request.UserId, DisplayName = request.DisplayName };
                db.Users.Add(user);
            }
            else if (user.DisplayName != request.DisplayName && !string.IsNullOrWhiteSpace(request.DisplayName))
            {
                Console.WriteLine($"user1:{user}");
                // 名前が本当に変わっている時だけ更新する
                user.DisplayName = request.DisplayName;
            }
            else
            {
                Console.WriteLine($"user2:{user}");

            }

            // 2. ルームの存在確認
            var room = await db.Rooms.FindAsync(roomId);
            if (room == null)
            {
                return Results.NotFound(new { Message = "指定されたルームは存在しません。" });
            }

            // 3. 参加記録 (RoomMember) のUpsert
            var member = await db.RoomMembers
                .FirstOrDefaultAsync(rm => rm.RoomId == roomId && rm.UserId == request.UserId);

            if (member == null)
            {
                // 新規参加時のみ JoinedAt を現在時刻で記録（これが過去ログ遮断の基準になる）
                member = new RoomMember
                {
                    RoomId = roomId,
                    UserId = request.UserId,
                    JoinedAt = DateTime.UtcNow
                };
                db.RoomMembers.Add(member);
            }

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // ReactのStrict Mode等による同時リクエストの競合対策
                // 別スレッドのリクエストが直前に Insert を完了させ、制約違反が発生した場合。
                // 目的（ユーザーをルームに参加させる）はすでに達成されているため、正常終了として扱う。

                // ※ もし正確な JoinedAt が必要な場合はここでDBから再取得しますが、
                // フロントエンド側でこの戻り値を厳密に使っていない場合は、
                // メモリ上にある member の現在時刻をそのまま返しても実用上問題ありません。

                // 競合時はDBから最新の状態を再取得してレスポンスを作る
                // これにより、メモリ上の「中途半端な状態」を返さないようにする
                member = await db.RoomMembers
                    .AsNoTracking() // 再取得
                    .FirstOrDefaultAsync(rm => rm.RoomId == roomId && rm.UserId == request.UserId);
            }


            return Results.Ok(new
            {
                RoomId = roomId,
                UserId = request.UserId,
                JoinedAt = member?.JoinedAt ?? DateTime.UtcNow
            });
        })
        .WithTags("Rooms")
        .WithSummary("ユーザーをルームに参加させ、過去メッセージ遮断の基準となる参加日時を記録します。");
    }
}