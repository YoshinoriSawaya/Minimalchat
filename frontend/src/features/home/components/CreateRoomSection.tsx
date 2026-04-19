import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:5240';

export function CreateRoomSection() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const createRoom = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/rooms`, { method: 'POST' });
            if (!res.ok) throw new Error('Network response was not ok');

            const data = await res.json();
            const roomId = data.roomId || data.RoomId;

            navigate(`/room/${roomId}`);
        } catch (error) {
            console.error(error);
            alert('ルームの作成に失敗しました。バックエンドが起動しているか確認してください。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
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
    );
}