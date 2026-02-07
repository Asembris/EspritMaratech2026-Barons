import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            throw error;
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) return;

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                chunksRef.current = [];
                setIsRecording(false);
                resolve(blob);
            };

            mediaRecorderRef.current.stop();
            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        });
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording
    };
}
