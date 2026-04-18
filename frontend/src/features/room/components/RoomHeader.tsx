export const RoomHeader = ({
    roomId,
    displayName,
    isCalling,
    startCall,
    endCall,
    isConnected
}: {
    roomId: string;
    displayName: string;
    isCalling: boolean;
    startCall: () => void;
    endCall: () => void;
    isConnected: boolean;
}) => {
    return (
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
            <div>
                <h3>Room: {roomId.substring(0, 8)}...</h3>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>あなたのID: {displayName}</p>
            </div>
            <div style={{ marginTop: '10px' }}>
                {!isCalling ? (
                    <button
                        onClick={startCall}
                        disabled={!isConnected}
                        style={{ background: '#28a745', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: isConnected ? 'pointer' : 'not-allowed' }}
                    >
                        📞 通話開始
                    </button>
                ) : (
                    <button
                        onClick={endCall}
                        style={{ background: '#dc3545', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        ⏹ 通話終了
                    </button>
                )}
            </div>
        </div>
    );
};