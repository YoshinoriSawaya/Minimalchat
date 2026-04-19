using MinimalChat.Backend.Infrastructure;
using MinimalChat.Backend.Features.Rooms;
using MinimalChat.Backend.Features.Messages;

var builder = WebApplication.CreateBuilder(args);

// 1. サービスの登録 (インフラストラクチャ層への委譲)
builder.Services.AddInfrastructureServices(builder.Configuration);

var app = builder.Build();

// 2. ミドルウェアの構成
app.UseCors("DefaultCorsPolicy");

// 3. ルーティング & エンドポイントのマッピング
app.MapGet("/ping", () => Results.Ok(new { Status = "Alive", Time = DateTime.UtcNow }));

app.MapHub<ChatHub>("/hubs/chat");

// Features (VSA) のエンドポイント
app.MapCreateRoomEndpoint();
app.MapJoinRoomEndpoint();
app.MapGetMessagesEndpoint();
app.MapGenerateUploadUrlEndpoint();
app.MapUpdateRoomEndpoint();
app.MapGetUserRoomsEndpoint();

// 4. アプリケーション初期化処理 (非同期)
await app.InitializeInfrastructureAsync();

app.Run();