'use client';

import { Mic, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useAudio } from '@/contexts/AudioContext';
import { useWhisper } from '@/hooks/useWhisper';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    onNext: () => void;
}

export function StepVision({ onNext }: Props) {
    const { setVoiceNavEnabled, setAutoListenMode, completeOnboarding } = useAccessibility();
    const { speak } = useAudio();
    const { isRecording, isTranscribing, transcript, start, stop, error } = useWhisper();
    const router = useRouter();

    // Auto-announce question on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            speak("Bonjour. Pouvez-vous voir clairement cet écran ? Maintenez le bouton micro pour répondre Oui ou Non.");
        }, 1000);
        return () => clearTimeout(timer);
    }, [speak]);

    // Process Whisper Answer (The "Agent" Logic)
    useEffect(() => {
        if (!transcript) return;

        console.log("Whisper Agent Received:", transcript);
        const lowerText = transcript.toLowerCase();

        // Agent Interpretation Logic
        if (lowerText.includes('non') || lowerText.includes('pas') || lowerText.includes('mal') || lowerText.includes('no')) {
            // User cannot see -> Agent enables Voice Nav + Auto-Listen + Skip all questions
            setVoiceNavEnabled(true);
            setAutoListenMode(true); // Enable hands-free mode
            speak("D'accord. J'active le mode mains-libres. Vous pouvez contrôler l'application entièrement à la voix.");
            setTimeout(() => {
                completeOnboarding();
                router.push('/'); // Skip all other questions, go straight to app
            }, 4000);
        } else if (lowerText.includes('oui') || lowerText.includes('bien') || lowerText.includes('voir') || lowerText.includes('yes') || lowerText.includes('we')) {
            // User can see -> Agent disables Voice Nav, continue normal flow
            setVoiceNavEnabled(false);
            setAutoListenMode(false);
            speak("Parfait. Continuons.");
            setTimeout(onNext, 2000);
        } else {
            speak("Je n'ai pas compris. Veuillez répéter Oui ou Non.");
        }
    }, [transcript, setVoiceNavEnabled, setAutoListenMode, speak, onNext, completeOnboarding, router]);

    const handleAnswer = (canSee: boolean) => {
        setVoiceNavEnabled(!canSee);
        if (!canSee) {
            setAutoListenMode(true); // Enable hands-free
            speak("Activation du mode mains-libres. Je vais vous guider.");
            setTimeout(() => {
                completeOnboarding();
                router.push('/'); // Skip all other questions
            }, 3000);
        } else {
            onNext();
        }
    };

    return (
        <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
            <div className="p-6 bg-blue-500/20 rounded-full">
                <Eye size={64} className="text-blue-400" />
            </div>

            <h2 className="text-3xl font-bold">Pouvez-vous voir clairement cet écran ?</h2>
            <p className="text-gray-400">Maintenez le bouton pour parler (Agent Vocal)</p>

            <button
                onMouseDown={start}
                onMouseUp={stop}
                onTouchStart={start}
                onTouchEnd={stop}
                disabled={isTranscribing}
                className={`p-8 rounded-full transition-all transform hover:scale-105 active:scale-95 ${isRecording ? 'bg-red-500 animate-pulse ring-4 ring-red-500/50' : 'bg-blue-600 hover:bg-blue-500 focus-visible-ring'}`}
                aria-label="Maintenir pour parler à l'agent"
            >
                {isTranscribing ? <Loader2 size={48} className="text-white animate-spin" /> : <Mic size={48} className="text-white" />}
            </button>

            {isRecording && <p className="text-red-400 font-bold animate-pulse">Relâchez pour envoyer...</p>}
            {isTranscribing && <p className="text-blue-400 animate-pulse">L'agent analyse votre réponse...</p>}
            {error && <p className="text-red-400 font-bold bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/50">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-4">
                <button
                    onClick={() => handleAnswer(true)}
                    className="flex-1 p-6 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-blue-500 rounded-2xl transition-all group focus-visible-ring"
                >
                    <Eye size={32} className="mx-auto mb-2 text-green-400" />
                    <span className="text-xl font-bold block">Oui</span>
                    <span className="text-sm text-gray-400">Je vois bien</span>
                </button>

                <button
                    onClick={() => handleAnswer(false)}
                    className="flex-1 p-6 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-blue-500 rounded-2xl transition-all group focus-visible-ring"
                >
                    <EyeOff size={32} className="mx-auto mb-2 text-red-400" />
                    <span className="text-xl font-bold block">Non</span>
                    <span className="text-sm text-gray-400">J'ai besoin d'aide vocale</span>
                </button>
            </div>
        </div>
    );
}
