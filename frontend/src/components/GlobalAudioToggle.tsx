'use client';

import { useAudio } from '@/contexts/AudioContext';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';

export default function GlobalAudioToggle() {
    const { audioEnabled, toggleAudio } = useAudio();
    const { onHover } = useHoverSpeech();

    return (
        <button
            onClick={toggleAudio}
            onMouseEnter={() => onHover(audioEnabled ? "Désactiver le son" : "Activer le son")}
            className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg z-50 transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-offset-2 ${audioEnabled
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white focus:ring-green-400'
                    : 'bg-gray-700 text-gray-400 focus:ring-gray-500'
                }`}
            aria-label={audioEnabled ? "Désactiver le son global" : "Activer le son global"}
            title={audioEnabled ? "Désactiver le son" : "Activer le son"}
        >
            <span className="text-2xl" aria-hidden="true">
                {audioEnabled ? '🔊' : '🔇'}
            </span>
        </button>
    );
}
