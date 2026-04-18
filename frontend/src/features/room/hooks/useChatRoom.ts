// src/features/room/hooks/useChatRoom.ts
import { useEffect, useState, useCallback, useRef } from 'react'; // ← 修正1: useRef を追加
import { type Message } from '../types';
import { roomApi } from '../../../lib/apiClient';
import { processImageWithWasm } from '../../../lib/imageProcessor';
import { useSignalR } from './useSignalR';

export const useChatRoom = (roomId: string | undefined, userId: string, displayName: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isJoined, setIsJoined] = useState(false);

    // ← 修正2: APIの二重実行を防ぐためのフラグを定義
    const isJoining = useRef(false);

    const handleReceiveMessage = useCallback((newMsg: Message) => {
        setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
        });
    }, []);

    useEffect(() => {
        if (!roomId || !userId || !displayName) {
            console.warn("Missing required parameters for joinRoom");
            return;
        }

        // ← 修正3: すでに実行中（true）なら、ここで処理を止める
        if (isJoining.current) return;
        isJoining.current = true;

        const initialize = async () => {
            try {
                console.log("Attempting to join room:", { roomId, userId, displayName });
                await roomApi.joinRoom(roomId, userId, displayName);
                const history = await roomApi.getHistory(roomId, userId);
                setMessages(history);
                setIsJoined(true); // 入室成功！
            } catch (error) {
                console.error("Initialization failed:", error);
                // 失敗した場合は再度実行できるようにフラグを戻す
                isJoining.current = false;
            }
        };

        initialize();

        // ← 修正4: コンポーネントがアンマウントされる時にフラグをリセット
        return () => {
            isJoining.current = false;
        };
    }, [roomId, userId, displayName]);

    // SignalRの管理を委譲 (入室が完了してから接続を開始する)
    const { connection } = useSignalR(isJoined ? roomId : undefined, handleReceiveMessage);

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