'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useAudio } from '@/contexts/AudioContext';
import { useEffect } from 'react';
import VoiceQuestionWrapper from './VoiceQuestionWrapper';

interface Props {
    onNext: () => void;
}

export function StepAudioCheck({ onNext }: Props) {
    const { setSoundEnabled } = useAccessibility();
    const { speak } = useAudio();

    useEffect(() => {
        // Play sound test on mount separately to ensure it is heard
        // VoiceQuestionWrapper will also speak the instruction
        const timer = setTimeout(() => {
            speak("Ceci est un test audio.");
        }, 1000);
        return () => clearTimeout(timer);
    }, [speak]);

    const handleAnswer = (hears: boolean) => {
        setSoundEnabled(hears);
        if (hears) speak("Audio activé.");
        onNext();
    };

    const handleVoiceAnswer = (text: string) => {
        const lower = text.toLowerCase();
        // "we" is often transcribed for "oui" by Whisper
        if (lower.includes('oui') || lower.includes('yes') || lower.includes('entends') || lower.includes('we')) {
            handleAnswer(true);
        } else if (lower.includes('non') || lower.includes('pas') || lower.includes('rien') || lower.includes('no')) {
            handleAnswer(false);
        } else {
            speak("Dites Oui ou Non.");
        }
    };

    return (
        <VoiceQuestionWrapper
            question="Entendez-vous ce son ? Dites Oui ou Non."
            onAnswer={handleVoiceAnswer}
        >
            <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
                <div className="p-6 bg-yellow-500/20 rounded-full">
                    <Volume2 size={64} className="text-yellow-400" />
                </div>

                <h2 className="text-3xl font-bold">Entendez-vous ce son ?</h2>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <button
                        onClick={() => handleAnswer(true)}
                        className="flex-1 p-6 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-yellow-500 rounded-2xl transition-all"
                    >
                        <Volume2 size={32} className="mx-auto mb-2 text-green-400" />
                        <span className="text-xl font-bold block">Oui</span>
                        <span className="text-sm text-gray-400">Garder le son activé</span>
                    </button>

                    <button
                        onClick={() => handleAnswer(false)}
                        className="flex-1 p-6 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-yellow-500 rounded-2xl transition-all"
                    >
                        <VolumeX size={32} className="mx-auto mb-2 text-red-400" />
                        <span className="text-xl font-bold block">Non</span>
                        <span className="text-sm text-gray-400">Désactiver le son</span>
                    </button>
                </div>
            </div>
        </VoiceQuestionWrapper>
    );
}
