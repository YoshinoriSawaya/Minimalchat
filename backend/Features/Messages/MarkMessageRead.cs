using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Infrastructure;
using Amazon.S3; // S3クライアントのネームスペース

namespace MinimalChat.Backend.Features.Messages;

public static class AcknowledgeMessage
{
    // Program.cs で app.MapAcknowledgeMessageEndpoint() のように呼び出して登録します
    public static void MapAcknowledgeMessageEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/messages/{messageId}/read", HandleImageAccessAsync);
    }

    private static async Task<IResult> HandleImageAccessAsync(
        Guid messageId,
        Guid userId, // ※認証情報(Claims)から取得するのが安全です
        AppDbContext _db,
        IAmazonS3 _s3Client)
    {
        // 1. このユーザーのアクセスレコードを取得
        var access = await _db.MessageAccesses
            .FirstOrDefaultAsync(x => x.MessageId == messageId && x.UserId == userId);

        if (access == null || access.IsRead) return Results.Ok();

        // 2. 論理削除（既読）
        access.IsRead = true;
        await _db.SaveChangesAsync();

        // 3. 残りの未読数をチェック
        var remainingCount = await _db.MessageAccesses
            .CountAsync(x => x.MessageId == messageId && x.IsRead == false);

        if (remainingCount == 0)
        {
            var message = await _db.Messages.FindAsync(messageId);
            if (message != null)
            {
                if (message.Type == "Image")
                {
                    try
                    {
                        // S3から物理削除
                        await _s3Client.DeleteObjectAsync("minimal-chat-images", message.Content);
                        Console.WriteLine($"[Security] Physically deleted from S3: {messageId}");

                        // S3成功後にDB物理削除
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
                    _db.Messages.Remove(message);
                    await _db.SaveChangesAsync();
                }
            }
        }

        return Results.Ok();
    }
}