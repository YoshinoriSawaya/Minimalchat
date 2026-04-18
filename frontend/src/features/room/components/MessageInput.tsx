import { useState } from 'react';

export const MessageInput = ({
    onSendMessage,
    onSendImage,
    isDisabled
}: {
    onSendMessage: (text: string) => void;
    onSendImage: (file: File) => void;
    isDisabled: boolean;
}) => {
    const [inputText, setInputText] = useState('');

    const handleSend = () => {
        if (!inputText.trim()) return;
        onSendMessage(inputText);
        setInputText('');
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSendImage(file);
        }
        // 同じ画像を連続で選べるようにリセット
        e.target.value = '';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 画像アップロードボタン */}
            <label style={{ cursor: 'pointer', padding: '10px', alignSelf: 'flex-start' }}>
                📷
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={isDisabled}
                />
            </label>

            {/* テキスト入力エリア */}
            <div style={{ padding: '10px', borderTop: '1px solid #ccc', display: 'flex' }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    style={{ flex: 1, padding: '10px', fontSize: '1rem' }}
                    placeholder="メッセージを入力..."
                    disabled={isDisabled}
                />
                <button
                    onClick={handleSend}
                    disabled={isDisabled || !inputText.trim()}
                    style={{ padding: '10px 20px', marginLeft: '10px', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                    送信
                </button>
            </div>
        </div>
    );
};