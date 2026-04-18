// src/features/room/hooks/useSignalR.ts
import { useEffect, useState, useCallback } from 'react';
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
                await newConnection.invoke("JoinRoomContext", roomId);
                if (isMounted) setConnection(newConnection);
            } catch (error) {
                console.error("SignalR Connection Error: ", error);
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            newConnection.stop();
        };
    }, [roomId, onMessageReceived]);

    return { connection };
};