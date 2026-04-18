// src/lib/apiClient.ts
import { type Message } from '../features/room/types';

const BACKEND_URL = 'http://localhost:5240';

export const roomApi = {
    joinRoom: async (roomId: string, userId: string, displayName: string) => {
        await fetch(`${BACKEND_URL}/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, displayName })
        });
    },

    getHistory: async (roomId: string, userId: string): Promise<Message[]> => {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages?userId=${userId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((m: any) => ({
            id: m.id || m.Id,
            userId: m.userId || m.UserId,
            type: m.type || m.Type,
            content: m.content || m.Content,
            sentAt: m.sentAt || m.SentAt
        }));
    },

    getUploadUrl: async (roomId: string, userId: string) => {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/upload-url?userId=${userId}`, { method: 'POST' });
        return await res.json(); // { uploadUrl, fileUrl }
    },

    uploadImage: async (uploadUrl: string, imageBlob: Blob) => {
        await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: imageBlob
        });
    }
};