// src/features/room/hooks/useChatRoom.ts
import { useEffect, useState, useCallback } from 'react';
import { type Message } from '../types';
import { roomApi } from '../../../lib/apiClient';
import { processImageWithWasm } from '../../../lib/imageProcessor';
import { useSignalR } from './useSignalR';

export const useChatRoom = (roomId: string | undefined, userId: string, displayName: string) => {
    const [messages, setMessages] = useState<Message[]>([]);

    // 新規メッセージを受信したときの処理（useSignalRに渡すコールバック）
    const handleReceiveMessage = useCallback((newMsg: Message) => {
        setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
        });
    }, []);

    // SignalRの管理を委譲
    const { connection } = useSignalR(roomId, handleReceiveMessage);

    // 初期化処理（API呼び出し）
    useEffect(() => {
        if (!roomId) return;

        const initialize = async () => {
            try {
                await roomApi.joinRoom(roomId, userId, displayName);
                const history = await roomApi.getHistory(roomId, userId);
                setMessages(history);
            } catch (error) {
                console.error("Initialization failed:", error);
            }
        };

        initialize();
    }, [roomId, userId, displayName]);

    // メッセージ送信ロジック
    const sendTextMessage = async (text: string) => {
        if (!text.trim() || !connection || !roomId) return;
        await connection.invoke("SendMessage", roomId, userId, "Text", text);
    };

    const sendImageMessage = async (file: File) => {
        if (!roomId || !connection) return;
        try {
            // WASMで画像処理
            const imageBlob = await processImageWithWasm(file);

            // アップロード用URL取得とS3等へのアップロード
            const { uploadUrl, fileUrl } = await roomApi.getUploadUrl(roomId, userId);
            await roomApi.uploadImage(uploadUrl, imageBlob);

            // SignalRでURLを送信
            await connection.invoke("SendMessage", roomId, userId, "Image", fileUrl);
        } catch (error) {
            console.error("画像送信エラー:", error);
            alert("画像の処理または送信に失敗しました。");
        }
    };

    return {
        messages,
        connection,
        sendTextMessage,
        sendImageMessage
    };
};