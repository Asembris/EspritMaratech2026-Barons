'use client';

import { useEffect } from 'react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useAudio } from '@/contexts/AudioContext';
import { useWhisper } from '@/hooks/useWhisper';
import { Mic, Loader2 } from 'lucide-react';

interface VoiceQuestionWrapperProps {
    question: string;
    instructions?: string;
    onAnswer: (text: string) => void;
    children: React.ReactNode;
}

export default function VoiceQuestionWrapper({ question, instructions, onAnswer, children }: VoiceQuestionWrapperProps) {
    const { isVoiceNavEnabled } = useAccessibility();
    const { speak, cancel } = useAudio();
    const { start, stop, transcript, isRecording, isTranscribing, error } = useWhisper();

    // Stop speaking when user wants to record
    const handleStart = () => {
        cancel();
        start();
    };

    // Auto-speak question if Voice Nav is enabled
    useEffect(() => {
        if (isVoiceNavEnabled) {
            const timer = setTimeout(() => {
                speak(`${question} ${instructions || "Maintenez le bouton pour répondre."}`);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isVoiceNavEnabled, question, instructions, speak]);

    // Process Answer
    useEffect(() => {
        if (transcript && !isRecording && !isTranscribing) {
            onAnswer(transcript);
        }
    }, [transcript, isRecording, isTranscribing, onAnswer]);

    return (
        <div className="flex flex-col items-center space-y-6 w-full">
            {children}

            {isVoiceNavEnabled && (
                <div className="flex flex-col items-center space-y-4 animate-fade-in w-full">
                    <p className="text-blue-400 font-medium">Mode Vocal Activé</p>

                    <button
                        onMouseDown={handleStart}
                        onMouseUp={stop}
                        onTouchStart={handleStart}
                        onTouchEnd={stop}
                        disabled={isTranscribing}
                        className={`p-8 rounded-full transition-all transform hover:scale-105 active:scale-95 ${isRecording ? 'bg-red-500 animate-pulse ring-4 ring-red-500/50' : 'bg-blue-600 hover:bg-blue-500'}`}
                        aria-label="Maintenir pour parler"
                    >
                        {isTranscribing ? <Loader2 size={48} className="text-white animate-spin" /> : <Mic size={48} className="text-white" />}
                    </button>

                    {isRecording && <p className="text-red-400 font-bold animate-pulse">Je vous écoute...</p>}
                    {isTranscribing && <p className="text-blue-400 animate-pulse">Analyse...</p>}
                    {error && <p className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}
                </div>
            )}
        </div>
    );
}
