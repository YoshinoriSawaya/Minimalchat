using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Infrastructure;
using MinimalChat.Backend.Features.Rooms;
using MinimalChat.Backend.Features.Messages;
using Amazon.S3;

var builder = WebApplication.CreateBuilder(args);

// SQLiteのセットアップ
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=minimalchat.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// SignalRの追加（リアルタイム通信用）
builder.Services.AddSignalR();

// CORSの設定（フロントエンドからの通信を許可）
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", // React
                "http://127.0.0.1:5500", // VSCode Live Server (よくあるポート)
                "http://localhost:5500"  // VSCode Live Server // ReactフロントエンドのURL (開発環境)
        )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // SignalRに必要
    });
});

// Cloudflare R2 (S3互換) クライアントのセットアップ
var s3Config = new AmazonS3Config
{
    // Cloudflare R2のエンドポイント（アカウントIDはCloudflareダッシュボードで確認）
    // ServiceURL = "https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com",
    // ServiceURL = "https://dummy.r2.cloudflarestorage.com",
    // AuthenticationRegion = "auto"
    // MinIOのAPIエンドポイント（HTTPでOK）
    ServiceURL = "http://localhost:9000",
    // ★超重要: S3互換ストレージ（MinIO）をローカルで使う場合はこれを true にする
    ForcePathStyle = true,
    UseHttp = true,
    AuthenticationRegion = "ap-northeast-1" // ローカルなので適当な値でOK
};

// ※重要※ 
// ローカル開発中はベタ書きでも動きますが、本番環境では絶対にソースコードに直接書かず、
// Azureの環境変数（App Settings）や .NETのUserSecrets から読み込むようにしてください。
// var accessKey = builder.Configuration["R2:AccessKey"] ?? "YOUR_R2_ACCESS_KEY";
// var secretKey = builder.Configuration["R2:SecretKey"] ?? "YOUR_R2_SECRET_KEY";

// // Docker起動時に指定した環境変数と同じ値をセット
var accessKey = "localadmin";
var secretKey = "localpassword";

builder.Services.AddSingleton<IAmazonS3>(new AmazonS3Client(accessKey, secretKey, s3Config));

var app = builder.Build();

app.UseCors();

// 簡単なヘルスチェックエンドポイント（Azureコールドスタート確認用）
app.MapGet("/ping", () => Results.Ok(new { Status = "Alive", Time = DateTime.UtcNow }));

// TODO: ここに各Feature（Vertical Slice）のエンドポイントをマッピングしていく
// TODO:

app.MapHub<ChatHub>("/hubs/chat");

app.MapCreateRoomEndpoint();
app.MapJoinRoomEndpoint();
app.MapGetMessagesEndpoint();
app.MapGenerateUploadUrlEndpoint();


// データベースの自動マイグレーション（開発用）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // 本番ではマイグレーションスクリプトを推奨
}

app.Run();