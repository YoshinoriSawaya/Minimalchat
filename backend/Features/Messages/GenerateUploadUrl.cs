using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Infrastructure;

namespace MinimalChat.Backend.Features.Messages;

public static class GenerateUploadUrl
{
    /// <summary>
    /// 画像アップロード用URL生成エンドポイントのルーティングを登録します。
    /// </summary>
    public static void MapGenerateUploadUrlEndpoint(this IEndpointRouteBuilder app)
    {
        // GETではなくPOSTにし、BodyまたはQueryでuserIdを受け取る
        app.MapPost("/api/rooms/{roomId:guid}/upload-url", async (Guid roomId, Guid userId, AppDbContext db, IAmazonS3 s3Client) =>
        {
            // 1. セキュリティ検証: ルーム参加者以外には絶対にURLを発行しない
            var isMember = await db.RoomMembers.AnyAsync(rm => rm.RoomId == roomId && rm.UserId == userId);
            if (!isMember) return Results.Unauthorized();

            // 2. ファイル名の強制匿名化（UUID化）
            var fileId = Guid.NewGuid();
            var objectKey = $"rooms/{roomId}/{fileId}.jpg"; // フロントのWASMでJPEGに統一するため拡張子を固定

            // 3. R2用のPresigned URLを発行（揮発性を高めるため、有効期限はわずか5分）
            var request = new GetPreSignedUrlRequest
            {
                BucketName = "minimal-chat-images", // ※実際のR2バケット名に変更してください
                Key = objectKey,
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.AddMinutes(5),
                ContentType = "image/jpeg",
                Protocol = Protocol.HTTP
            };

            var uploadUrl = s3Client.GetPreSignedURL(request);

            // 4. クライアントがダウンロード/閲覧するためのパブリックURLも一緒に返す
            // （Cloudflare側でPublic Accessを許可したカスタムドメインを設定する想定）
            // var publicUrl = $"https://your-r2-public-domain.com/{objectKey}";
            var publicUrl = $"http://localhost:9000/minimal-chat-images/{objectKey}";
            return Results.Ok(new
            {
                UploadUrl = uploadUrl,
                FileUrl = publicUrl
            });
        })
        .WithTags("Messages")
        .WithSummary("Cloudflare R2に直接画像をアップロードするための揮発性Presigned URLを発行します。");
    }
}