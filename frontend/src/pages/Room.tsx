import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserContext } from '../lib/userStore';
import { useWebRTC } from '../features/chat/useWebRTC';
import { useChatRoom } from '../features/room/hooks/useChatRoom';
import { RoomHeader } from '../features/room/components/RoomHeader';
import { MessageList } from '../features/room/components/MessageList';
import { MessageInput } from '../features/room/components/MessageInput';

export default function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const { userId, displayName: initialDisplayName } = getUserContext();

    // 自分の名前はローカルストレージや初期値に基づくため、コンポーネント側で管理を継続
    const [localDisplayName, setLocalDisplayName] = useState(initialDisplayName);

    // ▼ hook から roomName と updateRoomName を受け取る
    // これにより、SignalR によるリアルタイム同期が自動的に反映されるようになります
    const {
        messages,
        connection,
        roomName,           // 同期されたルーム名
        updateRoomName,     // バックエンドAPI & SignalR通知を実行する関数
        sendTextMessage,
        sendImageMessage,
        markImageAsAccessed
    } = useChatRoom(roomId, userId, localDisplayName);

    const { startCall, endCall, isCalling, remoteAudioRef } = useWebRTC(connection, roomId, userId);

    const isConnected = !!connection;

    // 自分の表示名を更新する処理
    const handleUpdateDisplayName = (newName: string) => {
        const trimmedName = newName.trim();
        if (!trimmedName) return;

        setLocalDisplayName(trimmedName);
        localStorage.setItem('displayName', trimmedName);
        // 必要に応じてここで userStore.setUserContext 等を呼び出し、全体の状態を更新します
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', border: '1px solid #ccc' }}>
            <RoomHeader
                roomId={roomId || ''}
                roomName={roomName}               // hook からの値を渡す
                displayName={localDisplayName}
                isCalling={isCalling}
                startCall={startCall}
                endCall={endCall}
                isConnected={isConnected}
                onUpdateRoomName={updateRoomName} // hook の関数をそのまま渡す
                onUpdateDisplayName={handleUpdateDisplayName}
            />

            <audio ref={remoteAudioRef} autoPlay />

            <MessageList
                messages={messages}
                currentUserId={userId}
                markImageAsAccessed={markImageAsAccessed}
            />

            <MessageInput
                onSendMessage={sendTextMessage}
                onSendImage={sendImageMessage}
                isDisabled={!isConnected}
            />
        </div>
    );
}