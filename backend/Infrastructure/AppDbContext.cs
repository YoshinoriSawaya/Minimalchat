using Microsoft.EntityFrameworkCore;
using MinimalChat.Backend.Domain;

namespace MinimalChat.Backend.Infrastructure;

/// <summary>
/// Minimal Chatのデータベースコンテキスト。SQLiteを使用します。
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomMember> RoomMembers => Set<RoomMember>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // RoomMembersの複合主キーを設定
        modelBuilder.Entity<RoomMember>()
            .HasKey(rm => new { rm.RoomId, rm.UserId });

        // SQLite用の最適化（必要に応じて）
        base.OnModelCreating(modelBuilder);
    }
}