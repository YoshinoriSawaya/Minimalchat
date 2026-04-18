using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Infrastructure;
using MinimalChat.Backend.Features.Rooms;
using MinimalChat.Backend.Features.Messages;

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

// データベースの自動マイグレーション（開発用）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // 本番ではマイグレーションスクリプトを推奨
}

app.Run();