import { CreateRoomSection } from '../features/home/components/CreateRoomSection';
import { JoinRoomSection } from '../features/home/components/JoinRoomSection';
import { RoomHistorySection } from '../features/home/components/RoomHistorySection';

export default function Home() {
    return (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>Minimal Chat</h1>
            <p>アカウント不要。生成されたURLを共有するだけで会話を開始できます。</p>

            {/* ルーム作成セクション */}
            <CreateRoomSection />

            <hr style={{ maxWidth: '400px', marginBottom: '40px', border: 'none', borderTop: '1px solid #ccc' }} />

            {/* ルーム参加・復元セクション */}
            <JoinRoomSection />

            {/* ▼ 追加: 過去のルーム履歴セクション */}
            <RoomHistorySection />
        </div>
    );
}