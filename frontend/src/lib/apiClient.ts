// src/lib/apiClient.ts
import { type Message } from '../features/room/types';

const BACKEND_URL = 'http://localhost:5240';

export const roomApi = {
    joinRoom: async (roomId: string, userId: string, displayName: string) => {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, displayName })
        });
        // エラーハンドリング
        if (!res.ok) {
            throw new Error('Failed to join room');
        }

        // バックエンドが返したJSON（RoomName等を含む）をreturnする！
        return await res.json();
    },

    // ▼ 追加: ルームの基本情報（ルーム名など）を取得する
    getRoom: async (roomId: string) => {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`);
        if (!res.ok) {
            // ルームが存在しないなどのエラーハンドリング
            throw new Error('Room not found');
        }
        return await res.json(); // 例: { id: "...", name: "プロジェクト会議室", createdAt: "..." }
    },

    // ▼ 追加: ルーム名を更新する
    updateRoomName: async (roomId: string, name: string) => {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!res.ok) {
            throw new Error('Failed to update room name');
        }
    },
    getHistory: async (roomId: string, userId: string): Promise<Message[]> => {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages?userId=${userId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((m: any) => ({
            id: m.id || m.Id,
            userId: m.userId || m.UserId,
            displayName: m.displayName || m.displayName,
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