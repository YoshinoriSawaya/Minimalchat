using System;

namespace MinimalChat.Backend.Domain;

/// <summary>
/// ユーザー情報を表します。個人情報（PII）は一切保持しません。
/// </summary>
public class User
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string DisplayName { get; set; }
    public string? PushSubscription { get; set; } // Web Push用
}

/// <summary>
/// チャットルームを表します。
/// </summary>
public class Room
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string? Name { get; set; } // 追加: ルームの表示名
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// ルームの参加者を表します。
/// 過去メッセージの遮断に用いる JoinedAt が最も重要なプロパティです。
/// </summary>
public class RoomMember
{
    public Guid RoomId { get; init; }
    public Guid UserId { get; init; }

    /// <summary>
    /// 【重要セキュリティ要件】この日時より前のメッセージは、このユーザーには絶対に返却しない。
    /// </summary>
    public DateTime JoinedAt { get; init; } = DateTime.UtcNow;

    // ナビゲーションプロパティ
    public Room? Room { get; init; }
    public User? User { get; init; }
}

/// <summary>
/// 送信されたメッセージを表します。
/// </summary>
public class Message
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid RoomId { get; init; }
    public Guid UserId { get; init; }
    public required string Type { get; init; } // "Text" または "Image"
    public required string Content { get; init; } // 画像の場合はCloudflare R2のURL
    public DateTime SentAt { get; init; } = DateTime.UtcNow;

    // ナビゲーションプロパティ
    public Room? Room { get; init; }
    public User? User { get; init; }
}

public class MessageAccess
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }

    // 論理削除（既読）フラグ
    public bool IsRead { get; set; } = false;
}