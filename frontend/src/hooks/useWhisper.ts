'use client';

import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { transcribeAudio } from '@/lib/api';

export function useWhisper(mode: 'general' | 'command' = 'general') {
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Track recording duration
    const startTimeRef = useRef<number>(0);

    const start = useCallback(async () => {
        try {
            setError(null);
            setTranscript('');
            startTimeRef.current = Date.now();
            await startRecording();
        } catch (err) {
            console.error("Failed to start recording:", err);
            setError("Impossible de démarrer le micro.");
        }
    }, [startRecording]);

    const stop = useCallback(async () => {
        try {
            // Check duration
            const duration = Date.now() - startTimeRef.current;
            console.log("Recording duration:", duration, "ms");

            if (duration < 600) { // Increased to 600ms to be safe
                const blob = await stopRecording(); // Stop stream but ignore blob
                setError("Trop court ! Maintenez le bouton pour parler (1s min).");
                return;
            }

            const blob = await stopRecording();
            if (!blob || blob.size === 0) {
                setError("Audio vide. Réessayez.");
                return;
            }

            setIsTranscribing(true);
            const result = await transcribeAudio(blob, mode);

            if (result.text) {
                setTranscript(result.text.toLowerCase());
            } else {
                setError("Aucune parole détectée.");
            }
        } catch (err: any) {
            console.error("Transcription failed:", err);
            const msg = err.message || JSON.stringify(err);

            if (msg.includes("too short")) {
                setError("Audio trop court. Parlez plus longtemps.");
            } else {
                setError("Erreur transcription: " + msg.slice(0, 50));
            }
        } finally {
            setIsTranscribing(false);
        }
    }, [stopRecording, mode]);

    const clearTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    return {
        isRecording,
        isTranscribing,
        transcript,
        start,
        stop,
        error,
        clearTranscript
    };
}
