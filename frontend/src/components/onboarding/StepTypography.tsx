'use client';

import { Type } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import VoiceQuestionWrapper from './VoiceQuestionWrapper';
import { useAudio } from '@/contexts/AudioContext';

interface Props {
    onNext: () => void;
}

export function StepTypography({ onNext }: Props) {
    const { setFontSize, fontSize } = useAccessibility();
    const { speak } = useAudio();

    const handleAnswer = (size: 'normal' | 'large' | 'extra-large') => {
        setFontSize(size);
        speak(`Taille ${size === 'normal' ? 'normale' : size === 'large' ? 'grande' : 'très grande'} sélectionnée.`);
    };

    const confirm = () => {
        onNext();
    };

    const handleVoiceAnswer = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes('grand')) {
            if (lower.includes('très') || lower.includes('extra')) {
                handleAnswer('extra-large');
                setTimeout(confirm, 1500); // Auto-advance
            } else {
                handleAnswer('large');
                setTimeout(confirm, 1500); // Auto-advance
            }
        } else if (lower.includes('normal') || lower.includes('moyen') || lower.includes('petit')) {
            handleAnswer('normal');
            setTimeout(confirm, 1500); // Auto-advance
        } else if (lower.includes('suivant') || lower.includes('continuer') || lower.includes('ok')) {
            confirm();
        } else {
            speak("Dites Normal, Grand, ou Très Grand.");
        }
    };

    return (
        <VoiceQuestionWrapper
            question="Choisissez la taille du texte. Dites Normal, Grand ou Très Grand."
            onAnswer={handleVoiceAnswer}
        >
            <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
                <div className="p-6 bg-green-500/20 rounded-full">
                    <Type size={64} className="text-green-400" />
                </div>

                <h2 className="text-3xl font-bold">Choisissez la taille du texte</h2>

                <div className="space-y-4 w-full max-w-md">
                    <button
                        onClick={() => handleAnswer('normal')}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${fontSize === 'normal' ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800'}`}
                    >
                        <span className="text-base">Texte Normal</span>
                        <span className="text-sm text-gray-400">Aa</span>
                    </button>

                    <button
                        onClick={() => handleAnswer('large')}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${fontSize === 'large' ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800'}`}
                    >
                        <span className="text-lg font-medium">Texte Grand</span>
                        <span className="text-lg text-gray-400">Aa</span>
                    </button>

                    <button
                        onClick={() => handleAnswer('extra-large')}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${fontSize === 'extra-large' ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800'}`}
                    >
                        <span className="text-xl font-bold">Texte Très Grand</span>
                        <span className="text-xl text-gray-400">Aa</span>
                    </button>
                </div>

                <button
                    onClick={confirm}
                    className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                >
                    Confirmer
                </button>
            </div>
        </VoiceQuestionWrapper>
    );
}
