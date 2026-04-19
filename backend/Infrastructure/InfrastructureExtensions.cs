using Amazon.S3;
using Microsoft.EntityFrameworkCore;

namespace MinimalChat.Backend.Infrastructure;

public static class InfrastructureExtensions
{
    /// <summary>
    /// インフラストラクチャ層のサービスをDIコンテナに登録します。
    /// </summary>
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // 1. SQLiteのセットアップ
        var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=minimalchat.db";
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(connectionString));

        // 2. SignalRの追加
        services.AddSignalR();

        // 3. CORSの設定
        services.AddCors(options =>
        {
            options.AddPolicy("DefaultCorsPolicy", policy => // ポリシー名を明示
            {
                policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5500", "http://localhost:5500")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        // 4. S3 (MinIO/R2) クライアントのセットアップ
        var s3Config = new AmazonS3Config
        {
            ServiceURL = "http://localhost:9000",
            ForcePathStyle = true,
            UseHttp = true,
            AuthenticationRegion = "ap-northeast-1"
        };

        var accessKey = "localadmin";
        var secretKey = "localpassword";

        services.AddSingleton<IAmazonS3>(new AmazonS3Client(accessKey, secretKey, s3Config));
        services.AddScoped<StorageInitializer>();

        return services;
    }

    /// <summary>
    /// アプリケーション起動時にインフラストラクチャの初期化（DB作成、S3ポリシー適用）を行います。
    /// </summary>
    public static async Task InitializeInfrastructureAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;

        // DBマイグレーション
        var db = services.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();

        // S3ライフサイクルポリシー適用
        var storageInit = services.GetRequiredService<StorageInitializer>();
        await storageInit.InitializeVolatilityPolicyAsync();
    }
}