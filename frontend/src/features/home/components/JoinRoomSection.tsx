import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function JoinRoomSection() {
    const navigate = useNavigate();
    const [joinRoomId, setJoinRoomId] = useState('');
    const [joinUserId, setJoinUserId] = useState('');

    const handleJoin = () => {
        const cleanRoomId = joinRoomId.trim();
        const cleanUserId = joinUserId.trim();

        if (!cleanRoomId) {
            alert('Room ID を入力してください。');
            return;
        }

        if (cleanUserId) {
            localStorage.setItem('minimal_chat_user_id', cleanUserId);
        }


        navigate(`/room/${cleanRoomId}`);
    };

    return (
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
    );
}