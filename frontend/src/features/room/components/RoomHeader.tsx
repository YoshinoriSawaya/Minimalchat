import { useState, useEffect } from 'react';

export const RoomHeader = ({
    roomId,
    roomName,
    displayName,
    isCalling,
    startCall,
    endCall,
    isConnected,
    onUpdateRoomName,    // 追加: ルーム名更新ハンドラー
    onUpdateDisplayName,  // 追加: 自分の名前更新ハンドラー
    onBack
}: {
    roomId: string;
    roomName?: string;
    displayName: string;
    isCalling: boolean;
    startCall: () => void;
    endCall: () => void;
    isConnected: boolean;
    onUpdateRoomName: (name: string) => void;
    onUpdateDisplayName: (name: string) => void;
    onBack: () => void;
}) => {
    // 設定モーダルの開閉状態
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // フォームの入力状態
    const [editRoomName, setEditRoomName] = useState(roomName || '');
    const [editDisplayName, setEditDisplayName] = useState(displayName || '');

    // モーダルを開くときに最新のPropsをセットする
    useEffect(() => {
        if (isSettingsOpen) {
            setEditRoomName(roomName || '');
            setEditDisplayName(displayName || '');
        }
    }, [isSettingsOpen, roomName, displayName]);

    const handleSave = () => {
        onUpdateRoomName(editRoomName.trim());
        onUpdateDisplayName(editDisplayName.trim());
        setIsSettingsOpen(false);
    };

    console.log("RoomName:" + roomName);
    // ルーム名が設定されていない場合はIDの一部を表示
    const displayRoomTitle = roomName ? roomName : `Room: ${roomId.substring(0, 8)}...`;

    return (
        <>
            <div style={{
                padding: '10px 15px',
                borderBottom: '1px solid #ccc',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {/* 左側: 戻るボタン + ルーム情報 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* 戻るボタン */}
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        title="戻る"
                    >
                        ⬅️
                    </button>

                    <div>
                        <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem' }}>{displayRoomTitle}</h3>
                        <p style={{ fontSize: '0.75rem', margin: 0, color: '#666' }}>
                            ID: {displayName}
                        </p>
                    </div>
                </div>

                {/* 右側: アクションボタン */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', }}>
                    {!isCalling ? (
                        <button
                            onClick={startCall}
                            disabled={!isConnected}
                            style={{ display: 'none', background: '#28a745', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: isConnected ? 'pointer' : 'not-allowed' }}
                        >
                            📞 通話開始
                        </button>
                    ) : (
                        <button
                            onClick={endCall}
                            style={{ display: 'none', background: '#dc3545', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            ⏹ 通話終了
                        </button>
                    )}

                    {/* 設定ボタン */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px' }}
                        title="設定"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            {/* 設定モーダル */}
            {isSettingsOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000 // 他の要素より上に表示
                }}>
                    <div style={{
                        backgroundColor: '#fff', padding: '20px', borderRadius: '8px',
                        width: '90%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem' }}>設定</h2>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>
                                ルーム表示名 (全体に反映)
                            </label>
                            <input
                                type="text"
                                value={editRoomName}
                                onChange={(e) => setEditRoomName(e.target.value)}
                                placeholder="例: プロジェクト会議室"
                                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>
                                あなたの表示名
                            </label>
                            <input
                                type="text"
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                style={{ padding: '8px 16px', border: '1px solid #ccc', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                style={{ padding: '8px 16px', border: 'none', background: '#007bff', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};