import { useCallback } from 'react';
import { useAudio } from '@/contexts/AudioContext';

export function useHoverSpeech() {
    const { speak, audioEnabled } = useAudio();

    const onHover = useCallback((text: string) => {
        if (audioEnabled) {
            // Cancel current speech to avoid queue buildup and speak immediately
            window.speechSynthesis.cancel();
            speak(text);
        }
    }, [speak, audioEnabled]);

    return { onHover };
}
