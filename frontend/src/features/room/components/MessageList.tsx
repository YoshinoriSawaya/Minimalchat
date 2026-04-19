import { useEffect, useRef, useState } from 'react';
import { type Message } from '../types';

const ImageBubble = ({
    message,
    markImageAsAccessed
}: {
    message: Message;
    markImageAsAccessed: (id: string) => void;
}) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        // キャッシュ（Blob）が存在する場合
        if (message.localBlob) {
            // 1. Blobからブラウザ内専用のURLを生成して表示
            const url = URL.createObjectURL(message.localBlob);
            setObjectUrl(url);

            // 2. サーバーに「ローカルに確保したからS3から消してヨシ！」と通知する
            markImageAsAccessed(message.id);

            // クリーンアップ関数（コンポーネントのアンマウント時やBlob変更時にメモリを解放）
            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [message.id, message.localBlob, markImageAsAccessed]);

    // Blobがまだ無い（または変換前）なら、S3のURL(content)をフォールバックとして使う
    const src = objectUrl || message.content;

    return (
        <img
            src={src}
            alt="画像"
            style={{ maxWidth: '100%', borderRadius: '4px', display: 'block' }}
        />
    );
};

export const MessageList = ({
    messages,
    currentUserId,
    markImageAsAccessed
}: {
    messages: Message[],
    currentUserId: string,
    markImageAsAccessed: (id: string) => void;
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 新しいメッセージが来たらスクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div style={{ flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
            {messages.map((m) => {
                const isMine = m.userId === currentUserId;
                return (
                    <div key={m.id} style={{ textAlign: isMine ? 'right' : 'left', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                            {new Date(m.sentAt).toLocaleTimeString()}
                        </div>
                        <div style={{
                            display: 'inline-block',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: isMine ? '#007bff' : '#e0e0e0',
                            color: isMine ? 'white' : 'black',
                            maxWidth: '80%',
                            wordBreak: 'break-word'
                        }}>
                            {m.type === 'Image' ? (
                                <ImageBubble
                                    message={m}
                                    markImageAsAccessed={markImageAsAccessed}
                                />
                            ) : (
                                m.content
                            )}
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};