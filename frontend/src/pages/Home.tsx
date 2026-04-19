import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:5240';

export default function Home() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // 参加用のステート (UserIdは任意)
    const [joinRoomId, setJoinRoomId] = useState('');
    const [joinUserId, setJoinUserId] = useState('');

    const createRoom = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/rooms`, { method: 'POST' });
            if (!res.ok) throw new Error('Network response was not ok');

            const data = await res.json();
            // バックエンドのレスポンス（大文字/小文字）の違いを吸収
            const roomId = data.roomId || data.RoomId;

            // 作成されたルームへ遷移
            navigate(`/room/${roomId}`);
        } catch (error) {
            console.error(error);
            alert('ルームの作成に失敗しました。バックエンドが起動しているか確認してください。');
        } finally {
            setIsLoading(false);
        }
    };

    // ▼ 修正: 新規参加 ＆ 再入場の統合ハンドラー
    const handleJoin = () => {
        const cleanRoomId = joinRoomId.trim();
        const cleanUserId = joinUserId.trim();

        if (!cleanRoomId) {
            alert('Room ID を入力してください。');
            return;
        }

        if (cleanUserId) {
            // UserIdが入力されている場合は復元（再入場）
            localStorage.setItem('userId', cleanUserId);
        } else {
            // UserIdが空白の場合は新規参加として扱うため、
            // 古いセッション情報が残っていれば念のためクリアしておく
            localStorage.removeItem('userId');
        }

        // 指定されたルームへ遷移（あとは Room.tsx 側が新規か復元かよしなに処理してくれます）
        navigate(`/room/${cleanRoomId}`);
    };

    return (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>Minimal Chat</h1>
            <p>アカウント不要。生成されたURLを共有するだけで会話を開始できます。</p>

            <div style={{ marginBottom: '50px' }}>
                <button
                    onClick={createRoom}
                    disabled={isLoading}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                    }}
                >
                    {isLoading ? '通信中...' : '新しいルームを作成'}
                </button>
            </div>

            <hr style={{ maxWidth: '400px', marginBottom: '40px', border: 'none', borderTop: '1px solid #ccc' }} />

            <div style={{ backgroundColor: '#f9f9f9', padding: '30px', borderRadius: '8px', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                <h2 style={{ marginTop: 0, textAlign: 'center' }}>既存のルームに参加</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: '#555', fontWeight: 'bold' }}>Room ID (必須)</label>
                        <input
                            type="text"
                            placeholder="例: 5b933fd4-..."
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            style={{ padding: '10px', width: '100%', fontSize: '1rem', boxSizing: 'border-box', marginTop: '5px' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.9rem', color: '#555', fontWeight: 'bold' }}>User ID (任意)</label>
                        <input
                            type="text"
                            placeholder="※過去のセッションを復元する場合のみ"
                            value={joinUserId}
                            onChange={(e) => setJoinUserId(e.target.value)}
                            style={{ padding: '10px', width: '100%', fontSize: '0.9rem', boxSizing: 'border-box', marginTop: '5px' }}
                        />
                    </div>

                    <button
                        onClick={handleJoin}
                        style={{
                            padding: '12px 20px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            width: '100%',
                            marginTop: '10px',
                            fontWeight: 'bold'
                        }}
                    >
                        {joinUserId.trim() ? '入力したUser IDで再入場' : 'このルームに新規参加'}
                    </button>
                </div>
            </div>
        </div>
    );
}