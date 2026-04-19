import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:5240';

// APIから返ってくるデータの型定義
interface UserRoom {
    roomId: string;
    name: string | null;
    joinedAt: string;
}

export function RoomHistorySection() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<UserRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // localStorageからuserIdを取得（既存の実装に合わせます）
    const userId = localStorage.getItem('minimal_chat_user_id');

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        const fetchRooms = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/users/${userId}/rooms`);
                if (!res.ok) throw new Error('履歴の取得に失敗しました');

                const data = await res.json();
                setRooms(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRooms();
    }, [userId]);

    // User IDが存在しない場合（完全な新規ユーザー）は何も表示しない
    if (!userId) {
        return null;
    }

    return (
        <div style={{ backgroundColor: '#f0f4f8', padding: '30px', borderRadius: '8px', maxWidth: '400px', margin: '30px auto 0', textAlign: 'left' }}>
            <h2 style={{ marginTop: 0, textAlign: 'center', fontSize: '1.2rem', color: '#333' }}>
                最近参加したルーム
            </h2>

            {isLoading ? (
                <p style={{ textAlign: 'center', color: '#666' }}>読み込み中...</p>
            ) : rooms.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>参加履歴がありません</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {rooms.map((room) => (
                        <li key={room.roomId}>
                            <button
                                onClick={() => navigate(`/room/${room.roomId}`)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    textAlign: 'left',
                                    backgroundColor: '#fff',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#007bff' }}>
                                    {room.name || '名前なしルーム'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#777' }}>
                                    ID: {room.roomId.substring(0, 12)}...
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}