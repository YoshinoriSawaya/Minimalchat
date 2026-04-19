export interface Message {
    id: string;
    userId: string;
    displayName?: string;
    type: string;
    content: string;
    sentAt: string;
    localBlob?: Blob;
}