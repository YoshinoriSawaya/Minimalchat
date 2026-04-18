import { useEffect, useRef } from 'react';
import { type Message } from '../types';

export const MessageList = ({ messages, currentUserId }: { messages: Message[], currentUserId: string }) => {
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
                                <img src={m.content} alt="画像" style={{ maxWidth: '100%', borderRadius: '4px', display: 'block' }} />
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