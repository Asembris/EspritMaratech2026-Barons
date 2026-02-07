'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

interface AudioContextType {
    audioEnabled: boolean;
    toggleAudio: () => void;
    speak: (text: string) => void;
    cancel: () => void;
    stop: () => void;
    isSpeaking: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
    const [audioEnabled, setAudioEnabled] = useState(true);
    const { speak: synthesisSpeak, cancel: synthesisCancel, isSpeaking } = useSpeechSynthesis({ lang: 'fr-FR' });

    // Global toggle function
    const toggleAudio = useCallback(() => {
        setAudioEnabled(prev => {
            const newState = !prev;
            if (newState) {
                // Speak immediately to confirm
                const utterance = new SpeechSynthesisUtterance("Audio activé");
                utterance.lang = 'fr-FR';
                window.speechSynthesis.speak(utterance);
            } else {
                window.speechSynthesis.cancel();
            }
            return newState;
        });
    }, []);

    // Wrapped speak function that checks state
    const speak = useCallback((text: string) => {
        if (audioEnabled) {
            synthesisSpeak(text);
        }
    }, [audioEnabled, synthesisSpeak]);

    // Global cancel
    const cancel = useCallback(() => {
        synthesisCancel();
    }, [synthesisCancel]);

    // Alias stop to cancel for compatibility
    const stop = cancel;

    return (
        <AudioContext.Provider value={{ audioEnabled, toggleAudio, speak, cancel, stop, isSpeaking }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const context = useContext(AudioContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}
