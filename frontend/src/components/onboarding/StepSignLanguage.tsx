'use client';

import { HandMetal } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import VoiceQuestionWrapper from './VoiceQuestionWrapper';
import { useAudio } from '@/contexts/AudioContext';

interface Props {
    onNext: () => void;
}

export function StepSignLanguage({ onNext }: Props) {
    const { setSignLanguageEnabled } = useAccessibility();
    const { speak } = useAudio();

    const handleAnswer = (understands: boolean) => {
        setSignLanguageEnabled(understands);
        if (understands) speak("Langue des signes activée.");
        else speak("D'accord, je note.");
        onNext();
    };

    const handleVoiceAnswer = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes('oui') || lower.includes('yes') || lower.includes('comprends') || lower.includes('we')) {
            handleAnswer(true);
        } else if (lower.includes('non') || lower.includes('pas') || lower.includes('no')) {
            handleAnswer(false);
        } else {
            speak("Je n'ai pas compris. Dites Oui ou Non.");
        }
    };

    return (
        <VoiceQuestionWrapper
            question="Comprenez-vous la Langue des Signes ?"
            onAnswer={handleVoiceAnswer}
        >
            <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
                <div className="p-6 bg-purple-500/20 rounded-full">
                    <HandMetal size={64} className="text-purple-400" />
                </div>

                <h2 className="text-3xl font-bold">Comprenez-vous la Langue des Signes ?</h2>

                {/* Placeholder for LSF Video */}
                <div className="w-full max-w-md aspect-video bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700">
                    <p className="text-gray-500">Vidéo LSF (Exemple)</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <button
                        onClick={() => handleAnswer(true)}
                        className="flex-1 p-6 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-purple-500 rounded-2xl transition-all"
                    >
                        <span className="text-xl font-bold block">Oui</span>
                        <span className="text-sm text-gray-400">Activer les résumés LSF</span>
                    </button>

                    <button
                        onClick={() => handleAnswer(false)}
                        className="flex-1 p-6 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-purple-500 rounded-2xl transition-all"
                    >
                        <span className="text-xl font-bold block">Non</span>
                        <span className="text-sm text-gray-400">Pas besoin</span>
                    </button>
                </div>
            </div>
        </VoiceQuestionWrapper>
    );
}
