// src/lib/userStore.ts
import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'minimal_chat_user_id';
const DISPLAY_NAME_KEY = 'minimal_chat_display_name';

export const getUserContext = () => {
    // すでにIDがあれば取得、なければ新規生成して保存
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem(USER_ID_KEY, userId);
    }

    // 表示名（デフォルトはランダムなハッシュ風の匿名名）
    let displayName = localStorage.getItem(DISPLAY_NAME_KEY);
    if (!displayName) {
        displayName = `Anon-${userId.substring(0, 4)}`;
        localStorage.setItem(DISPLAY_NAME_KEY, displayName);
    }

    return { userId, displayName };
};

export const updateDisplayName = (newName: string) => {
    localStorage.setItem(DISPLAY_NAME_KEY, newName);
};