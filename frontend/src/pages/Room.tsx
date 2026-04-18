import { useParams } from 'react-router-dom';
import { getUserContext } from '../lib/userStore';
import { useWebRTC } from '../features/chat/useWebRTC';
import { useChatRoom } from '../features/room/hooks/useChatRoom';
import { RoomHeader } from '../features/room/components/RoomHeader';
import { MessageList } from '../features/room/components/MessageList';
import { MessageInput } from '../features/room/components/MessageInput';

export default function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const { userId, displayName } = getUserContext();

    // ロジックを隠蔽したカスタムフック群
    const { messages, connection, sendTextMessage, sendImageMessage } = useChatRoom(roomId, userId, displayName);
    const { startCall, endCall, isCalling, remoteAudioRef } = useWebRTC(connection, roomId, userId);

    const isConnected = !!connection;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', border: '1px solid #ccc' }}>
            <RoomHeader
                roomId={roomId || ''}
                displayName={displayName}
                isCalling={isCalling}
                startCall={startCall}
                endCall={endCall}
                isConnected={isConnected}
            />

            <audio ref={remoteAudioRef} autoPlay />

            <MessageList
                messages={messages}
                currentUserId={userId}
            />

            <MessageInput
                onSendMessage={sendTextMessage}
                onSendImage={sendImageMessage}
                isDisabled={!isConnected}
            />
        </div>
    );
}