// src/features/room/hooks/useSignalR.ts
import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { type Message } from '../types';

const BACKEND_URL = 'http://localhost:5240';

export const useSignalR = (roomId: string | undefined, onMessageReceived: (msg: Message) => void) => {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

    useEffect(() => {
        if (!roomId) return;

        let isMounted = true;
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${BACKEND_URL}/hubs/chat`)
            .withAutomaticReconnect()
            .build();

        newConnection.on("ReceiveMessage", (msg: any) => {
            if (!isMounted) return;
            const newMsg: Message = {
                id: msg.id || msg.Id,
                userId: msg.userId || msg.UserId,
                type: msg.type || msg.Type,
                content: msg.content || msg.Content,
                sentAt: msg.sentAt || msg.SentAt
            };
            onMessageReceived(newMsg);
        });

        const startConnection = async () => {
            try {
                await newConnection.start();

                // 接続が完了した瞬間にアンマウントされていないかチェック
                if (!isMounted) {
                    await newConnection.stop();
                    return;
                }

                await newConnection.invoke("JoinRoomContext", roomId);
                setConnection(newConnection);
            } catch (error: any) {
                // React 18 Strict Mode による中断エラーを無視
                const isAbortError = error.name === 'AbortError' ||
                    error.message?.includes("stopped during negotiation");

                if (!isAbortError) {
                    console.error("SignalR Connection Error: ", error);
                }
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            // 接続を停止（交渉中の場合はここでAbortErrorが発生する）
            newConnection.stop().catch(() => {
                // 停止時のエラーは通常無視してOK
            });
            setConnection(null);
        };
        // 注意: onMessageReceived を依存配列に入れる場合、
        // 呼び出し側で useCallback を使っていないと、レンダリングのたびに再接続されます。
    }, [roomId, onMessageReceived]);

    return { connection };
};