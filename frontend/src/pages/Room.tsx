import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { getUserContext } from '../lib/userStore';

const BACKEND_URL = 'http://localhost:5240';

// メッセージの型定義
interface Message {
    id: string;
    userId: string;
    type: string;
    content: string;
    sentAt: string;
}

export default function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

    // ブラウザのlocalStorageからIDと表示名を取得（個人情報ゼロ）
    const { userId, displayName } = getUserContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!roomId) return;

        let hubConnection: signalR.HubConnection;

        const initializeRoom = async () => {
            try {
                // 1. ルーム参加APIを叩く（JoinedAtをサーバーに記録させる）
                await fetch(`${BACKEND_URL}/api/rooms/${roomId}/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, displayName })
                });

                // 2. 過去メッセージの取得（JoinedAt以降のログだけが返ってくる）
                const historyRes = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages?userId=${userId}`);
                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    // C#のプロパティ名のCasing違いを吸収してセット
                    const formattedHistory = historyData.map((m: any) => ({
                        id: m.id || m.Id,
                        userId: m.userId || m.UserId,
                        type: m.type || m.Type,
                        content: m.content || m.Content,
                        sentAt: m.sentAt || m.SentAt
                    }));
                    setMessages(formattedHistory);
                }

                // 3. SignalRの接続確立
                hubConnection = new signalR.HubConnectionBuilder()
                    .withUrl(`${BACKEND_URL}/hubs/chat`)
                    .withAutomaticReconnect()
                    .build();

                // リアルタイム受信のリスナー登録
                hubConnection.on("ReceiveMessage", (msg: any) => {
                    const newMsg: Message = {
                        id: msg.id || msg.Id,
                        userId: msg.userId || msg.UserId,
                        type: msg.type || msg.Type,
                        content: msg.content || msg.Content,
                        sentAt: msg.sentAt || msg.SentAt
                    };
                    // 【修正】すでに同じIDのメッセージがある場合は無視する（重複排除）
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                });

                await hubConnection.start();
                await hubConnection.invoke("JoinRoomContext", roomId);

                setConnection(hubConnection);

            } catch (error) {
                console.error("Initialization failed:", error);
            }
        };

        initializeRoom();

        // クリーンアップ処理
        return () => {
            if (hubConnection) {
                hubConnection.stop();
            }
        };
    }, [roomId, userId, displayName]);

    // メッセージが追加されたら一番下までスクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!inputText.trim() || !connection || !roomId) return;

        try {
            // HubのSendMessageを呼び出し
            await connection.invoke("SendMessage", roomId, userId, "Text", inputText);
            setInputText('');
        } catch (error) {
            console.error("Message send failed:", error);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', border: '1px solid #ccc' }}>
            {/* ヘッダー */}
            <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
                <h3>Room: {roomId?.substring(0, 8)}...</h3>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>
                    URLをコピーして相手に共有してください。<br />
                    （あなたのID: {displayName}）
                </p>
            </div>

            {/* メッセージ表示エリア */}
            <div style={{ flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
                {messages.map((m) => {
                    const isMine = m.userId === userId;
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
                                {m.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <div style={{ padding: '10px', borderTop: '1px solid #ccc', display: 'flex' }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    style={{ flex: 1, padding: '10px', fontSize: '1rem' }}
                    placeholder="メッセージを入力..."
                />
                <button
                    onClick={sendMessage}
                    disabled={!connection}
                    style={{ padding: '10px 20px', marginLeft: '10px', cursor: 'pointer' }}
                >
                    送信
                </button>
            </div>
        </div>
    );
}