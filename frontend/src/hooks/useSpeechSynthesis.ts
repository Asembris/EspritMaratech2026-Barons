import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechOptions {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
}

export function useSpeechSynthesis(initialOptions: SpeechOptions = {}) {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    const optionsRef = useRef({
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        lang: 'fr-FR',
        ...initialOptions
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsSupported(true);

            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);

                // Priority for better French voices
                // Google Français, Microsoft Paulina/Hortense, etc.
                const frenchVoices = availableVoices.filter(v => v.lang.startsWith('fr'));

                const preferredVoice = frenchVoices.find(v =>
                    v.name.includes('Google') ||
                    v.name.includes('Premium') ||
                    v.name.includes('Natural')
                ) || frenchVoices[0] || availableVoices[0];

                if (preferredVoice) {
                    setSelectedVoice(preferredVoice);
                }
            };

            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;

            return () => {
                window.speechSynthesis.onvoiceschanged = null;
                window.speechSynthesis.cancel();
            };
        }
    }, []);

    const speak = useCallback((text: string, immediate = true) => {
        if (!isSupported) return;

        if (immediate) {
            window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = optionsRef.current.rate;
        utterance.pitch = optionsRef.current.pitch;
        utterance.volume = optionsRef.current.volume;
        utterance.lang = optionsRef.current.lang;

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isSupported, selectedVoice]);

    const cancel = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [isSupported]);

    return {
        speak,
        cancel,
        isSpeaking,
        isSupported,
        voices,
        selectedVoice,
        setSelectedVoice
    };
}
