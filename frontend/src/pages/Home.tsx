import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:5240';

export default function Home() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>Minimal Chat</h1>
            <p>アカウント不要。生成されたURLを共有するだけで会話を開始できます。</p>
            <button
                onClick={createRoom}
                disabled={isLoading}
                style={{ padding: '10px 20px', fontSize: '1.2rem', cursor: 'pointer' }}
            >
                {isLoading ? '通信中...' : '新しいルームを作成'}
            </button>
        </div>
    );
}