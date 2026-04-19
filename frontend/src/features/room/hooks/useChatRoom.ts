// src/features/room/hooks/useChatRoom.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import localforage from 'localforage'; // 追加
import { type Message } from '../types';
import { roomApi } from '../../../lib/apiClient';
import { processImageWithWasm } from '../../../lib/imageProcessor';
import { useSignalR } from './useSignalR';

// ★ types.ts の Message 型に `localBlob?: Blob` を追加しておくことを推奨します

export const useChatRoom = (roomId: string | undefined, userId: string, displayName: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const isJoining = useRef(false);

    // IndexedDBのインスタンス生成（ルームごとに分離）
    const getMessageStore = useCallback(() => {
        return localforage.createInstance({
            name: "MinimalChat",
            storeName: `messages_${roomId}`
        });
    }, [roomId]);

    // 画像URLからBlobを取得して付与するヘルパー関数
    const fetchAndAttachBlob = async (msg: Message): Promise<Message> => {
        // 画像タイプで、かつまだローカルにBlobを持っていない場合
        if (msg.type === 'Image' && msg.content.startsWith('http') && !msg.localBlob) {
            try {
                // S3から画像をバイナリとして取得（キャッシュさせない）
                const res = await fetch(msg.content, { cache: 'no-store' });
                if (res.ok) {
                    const blob = await res.blob();
                    return { ...msg, localBlob: blob };
                }
            } catch (error) {
                console.error("Failed to fetch image blob:", error);
            }
        }
        return msg;
    };

    const handleReceiveMessage = useCallback(async (newMsg: Message) => {
        // 画像の場合は裏でS3からBlobをダウンロード
        const processedMsg = await fetchAndAttachBlob(newMsg);

        setMessages(prev => {
            if (prev.some(m => m.id === processedMsg.id)) return prev;

            const updatedMessages = [...prev, processedMsg];
            // 更新されたメッセージリストをIndexedDBに丸ごと保存
            getMessageStore().setItem('history', updatedMessages).catch(console.error);

            return updatedMessages;
        });
    }, [getMessageStore]);

    useEffect(() => {
        if (!roomId || !userId || !displayName) {
            console.warn("Missing required parameters for joinRoom");
            return;
        }

        if (isJoining.current) return;
        isJoining.current = true;

        const initialize = async () => {
            try {
                console.log("Attempting to join room:", { roomId, userId, displayName });
                const store = getMessageStore();

                // 1. ローカル(IndexedDB)から履歴を復元（画像Blobもここで復元される）
                const localHistory = (await store.getItem<Message[]>('history')) || [];

                // 一旦ローカルの履歴で画面を最速描画（オフライン対応・高速化）
                if (localHistory.length > 0) {
                    setMessages(localHistory);
                }

                // 2. サーバーから最新履歴を取得
                await roomApi.joinRoom(roomId, userId, displayName);
                const apiHistory = await roomApi.getHistory(roomId, userId);

                // 3. ローカルに無い新しいメッセージ（自分が入室していない間の通知など）をマージ
                let mergedHistory = [...localHistory];
                let hasNewMessages = false;

                for (const apiMsg of apiHistory) {
                    if (!mergedHistory.some(m => m.id === apiMsg.id)) {
                        const processed = await fetchAndAttachBlob(apiMsg);
                        mergedHistory.push(processed);
                        hasNewMessages = true;
                    }
                }

                // 新しいメッセージがあった場合のみ、状態とIndexedDBを更新
                if (hasNewMessages) {
                    // 日付順にソート（必要に応じて）
                    mergedHistory.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
                    setMessages(mergedHistory);
                    await store.setItem('history', mergedHistory);
                }

                setIsJoined(true);
            } catch (error) {
                console.error("Initialization failed:", error);
                isJoining.current = false;
            }
        };

        initialize();

        return () => {
            isJoining.current = false;
        };
    }, [roomId, userId, displayName, getMessageStore]);

    const { connection } = useSignalR(isJoined ? roomId : undefined, handleReceiveMessage);

    const sendTextMessage = async (text: string) => {
        if (!text.trim() || !connection || !roomId) return;
        await connection.invoke("SendMessage", roomId, userId, "Text", text);
    };

    const sendImageMessage = async (file: File) => {
        if (!roomId || !connection) return;
        try {
            const imageBlob = await processImageWithWasm(file);
            const { uploadUrl, fileUrl } = await roomApi.getUploadUrl(roomId, userId);
            await roomApi.uploadImage(uploadUrl, imageBlob);
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