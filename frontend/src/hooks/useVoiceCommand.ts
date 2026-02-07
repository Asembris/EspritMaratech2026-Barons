'use client';

import { useState, useEffect, useCallback } from 'react';

// Define type for Web Speech API
interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
}

export function useVoiceCommand() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const startListening = useCallback(() => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
        const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

        if (!SpeechRecognitionConstructor) {
            setError("Votre navigateur ne supporte pas la reconnaissance vocale.");
            return;
        }

        const recognition = new SpeechRecognitionConstructor();
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript.toLowerCase();
            setTranscript(text);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            // Important: event.error is the key property
            const errorCode = event.error;
            console.error("Speech Recognition Error Code:", errorCode);

            let errorMessage = "Erreur inconnue";

            switch (errorCode) {
                case 'not-allowed':
                case 'service-not-allowed':
                    errorMessage = "Accès refusé. Vérifiez que le site est en HTTPS ou localhost et que le micro est autorisé.";
                    break;
                case 'no-speech':
                    errorMessage = "Je n'ai rien entendu. Veuillez réessayer.";
                    break;
                case 'network':
                    errorMessage = "Erreur réseau. Une connexion internet est requise.";
                    break;
                case 'aborted':
                    // User stopped listening manually
                    setIsListening(false);
                    return;
                case 'audio-capture':
                    errorMessage = "Aucun microphone détecté.";
                    break;
                default:
                    errorMessage = `Erreur (${errorCode}). Réessayez.`;
            }

            setError(errorMessage);
            setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);

        try {
            recognition.start();
        } catch (e) {
            console.error("Failed to start recognition:", e);
            setError("Impossible de démarrer le service vocal.");
            setIsListening(false);
        }
    }, []);

    return { isListening, transcript, startListening, error, setTranscript };
}
