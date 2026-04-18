import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

// Googleの無料STUNサーバー（P2P接続のためのグローバルIP発見用）
const RTC_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export const useWebRTC = (
    connection: signalR.HubConnection | null,
    roomId: string | undefined,
    userId: string
) => {
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const [isCalling, setIsCalling] = useState(false);

    // 1. WebRTCの初期化とシグナル受信設定
    useEffect(() => {
        if (!connection) return;

        connection.on("ReceiveSignal", async (senderId: string, type: string, payload: string) => {
            // 自分が送ったシグナルは無視
            if (senderId === userId) return;

            const data = JSON.parse(payload);

            // ピアコネクションが存在しなければ作成（着信側）
            if (!peerConnection.current) {
                await initPeerConnection();
            }

            const pc = peerConnection.current!;

            try {
                if (type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await connection.invoke("SendSignal", roomId, userId, "answer", JSON.stringify(answer));
                    setIsCalling(true);
                } else if (type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    setIsCalling(true);
                } else if (type === 'ice') {
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                }
            } catch (error) {
                console.error("Signal processing error:", error);
            }
        });

        return () => {
            connection.off("ReceiveSignal");
        };
    }, [connection, roomId, userId]);

    // 2. ピアコネクションとマイクのセットアップ
    const initPeerConnection = async () => {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnection.current = pc;

        // マイクの取得（要件定義通り、強力なノイズキャンセルとエコーキャンセルを標準有効化）
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false
        });
        localStream.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 相手からの経路情報が見つかったらSignalR経由で送信
        pc.onicecandidate = (event) => {
            if (event.candidate && connection) {
                connection.invoke("SendSignal", roomId, userId, "ice", JSON.stringify(event.candidate));
            }
        };

        // 相手の音声ストリームを受信したらAudioタグに流し込む
        pc.ontrack = (event) => {
            if (remoteAudioRef.current && event.streams[0]) {
                remoteAudioRef.current.srcObject = event.streams[0];
            }
        };
    };

    // 3. 通話開始（Offerの送信）
    const startCall = async () => {
        if (!connection || !roomId) return;
        await initPeerConnection();
        const pc = peerConnection.current!;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 相手にOfferを送信
        await connection.invoke("SendSignal", roomId, userId, "offer", JSON.stringify(offer));
    };

    // 4. 通話終了
    const endCall = () => {
        peerConnection.current?.close();
        peerConnection.current = null;
        localStream.current?.getTracks().forEach(t => t.stop());
        setIsCalling(false);
    };

    return { startCall, endCall, isCalling, remoteAudioRef };
};