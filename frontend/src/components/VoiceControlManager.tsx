'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useWhisper } from '@/hooks/useWhisper';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useAudio } from '@/contexts/AudioContext';
import { sendVoiceCommand } from '@/lib/api';
import { Mic, Loader2, Navigation } from 'lucide-react';

export default function VoiceControlManager() {
    const { isVoiceNavEnabled, setVoiceNavEnabled } = useAccessibility();
    const { speak, cancel } = useAudio();
    const { start, stop, transcript, isRecording, isTranscribing, clearTranscript } = useWhisper('command'); // Strict Mode
    const router = useRouter();
    const pathname = usePathname();

    const [isProcessing, setIsProcessing] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);

    // Stop speaking when user wants to record
    const handleStart = () => {
        // If voice nav is disabled, clicking this ENABLES it
        if (!isVoiceNavEnabled) {
            setVoiceNavEnabled(true);
            speak("Navigation vocale activée.");
            return;
        }
        cancel();
        start();
    };

    // Keyboard Listener (Spacebar PTT)
    useEffect(() => {
        if (!isVoiceNavEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && !isRecording && !isProcessing) {
                // Prevent scrolling when holding space
                if (e.target === document.body) {
                    e.preventDefault();
                }
                handleStart();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && isRecording) {
                e.preventDefault();
                stop();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isVoiceNavEnabled, isRecording, isProcessing, start, stop, cancel]);

    const { user, logout } = useUser();

    // Auto-Summary on Navigation
    useEffect(() => {
        if (!isVoiceNavEnabled || !pathname || pathname.startsWith('/onboarding') || pathname === '/login') return;

        const summaries: Record<string, string> = {
            "/": "Accueil. Dites 'Banque', 'Magasin' ou 'Traducteur'.",
            "/banking": "Banque. Dites 'Solde' ou 'Historique'.",
            "/store": "Magasin. Dites 'Ajouter Harissa' ou 'Vider panier'.",
            "/translate": "Traducteur. Dites une phrase à traduire.",
            "/cart": "Panier. Dites 'Payer' pour commander."
        };

        const summary = summaries[pathname] || "Page chargée.";
        // Debounce slightly to allow page load
        const timer = setTimeout(() => speak(summary), 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, isVoiceNavEnabled]);

    // Process Transcript when ready
    const processedRef = useRef<string>('');

    useEffect(() => {
        // Skip if no transcript, already processed this exact one, or still recording
        if (!transcript || transcript === processedRef.current || isRecording || isTranscribing) return;

        processedRef.current = transcript; // Mark as processed immediately

        const executeCommand = async () => {
            setIsProcessing(true);
            try {
                console.log("Sending command to Agent:", transcript);
                const action = await sendVoiceCommand(transcript, pathname || "/");
                console.log("Agent Action:", action);

                setLastAction(action.message);
                if (action.message) speak(action.message);

                // --- ACTION HANDLERS ---
                switch (action.type) {
                    case 'NAVIGATE':
                        if (action.payload) router.push(action.payload);
                        break;
                    case 'SCROLL':
                        if (action.payload === 'down') window.scrollBy({ top: 500, behavior: 'smooth' });
                        if (action.payload === 'up') window.scrollBy({ top: -500, behavior: 'smooth' });
                        break;
                    case 'GO_BACK':
                        router.back();
                        break;
                    case 'CHECK_BALANCE':
                        if (user?.id) {
                            try {
                                const { getBalance } = await import('@/lib/api');
                                const data = await getBalance(user.id);
                                speak(`Votre solde est de ${data.balance} Dinars.`);
                            } catch (e) {
                                speak("Erreur lors de la vérification du solde.");
                            }
                        } else {
                            speak("Veuillez vous connecter d'abord.");
                        }
                        break;
                    case 'CHECK_HISTORY':
                        if (user?.id) {
                            try {
                                const { getTransactions } = await import('@/lib/api');
                                const data = await getTransactions(user.id);
                                if (data.transactions && data.transactions.length > 0) {
                                    const last = data.transactions[0];
                                    speak(`Dernière transaction: ${last.type} de ${Math.abs(last.amount)} Dinars. ${last.description}`);
                                } else {
                                    speak("Aucune transaction récente.");
                                }
                                router.push('/banking');
                            } catch (e) {
                                speak("Erreur lors de la vérification de l'historique.");
                            }
                        }
                        break;
                    case 'LOGOUT':
                        logout();
                        speak("Vous êtes déconnecté.");
                        break;
                    case 'OPEN_CHAT':
                        window.dispatchEvent(new Event('openArcAssistant'));
                        break;
                    case 'CLEAR_CART':
                        if (user?.id) {
                            try {
                                const { clearCart } = await import('@/lib/api');
                                await clearCart(user.id);
                                speak("Le panier a été vidé.");
                                window.dispatchEvent(new Event('cart-updated'));
                            } catch (e) {
                                speak("Erreur lors de la suppression du panier.");
                            }
                        }
                        break;
                    case 'ADD_TO_CART':
                        if (user?.id && action.payload?.product) {
                            try {
                                const { addToCart } = await import('@/lib/api');
                                await addToCart(user.id, action.payload.product, action.payload.quantity || 1);
                                speak(`J'ai ajouté ${action.payload.product} au panier.`);
                                window.dispatchEvent(new Event('cart-updated'));
                            } catch (e) {
                                speak("Erreur lors de l'ajout au panier.");
                            }
                        }
                        break;
                    case 'CONFIRM_CART':
                        if (user?.id) {
                            try {
                                const { checkoutCart } = await import('@/lib/api');
                                await checkoutCart(user.id);
                                speak("Commande confirmée! Merci pour votre achat.");
                                router.push('/store');
                            } catch (e) {
                                speak("Erreur lors de la confirmation de la commande.");
                            }
                        }
                        break;
                }

            } catch (error) {
                console.error("Agent Error:", error);
                speak("Désolé, je n'ai pas pu exécuter la commande.");
            } finally {
                setIsProcessing(false);
                clearTranscript();
            }
        };

        executeCommand();

    }, [transcript, isRecording, isTranscribing, pathname, router, speak, user, logout, clearTranscript]);

    // Hide on onboarding pages to avoid conflict with local voice buttons
    // RETURN NULL IS HERE AT THE END to avoid Hook Errors
    if (pathname?.startsWith('/onboarding')) return null;

    return (
        <>
            {/* Floating Action Button for Mobile/Desktop Agent */}
            {/* MOVED TO CENTER BOTTOM to avoid overlap with Audio Toggle */}
            <button
                onMouseDown={handleStart}
                onMouseUp={stop}
                onTouchStart={handleStart}
                onTouchEnd={stop}
                disabled={isTranscribing || isProcessing}
                className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] p-6 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90 border-4 border-white/20 ${!isVoiceNavEnabled
                    ? 'bg-gray-500 hover:bg-gray-400' // Grey if disabled
                    : isRecording
                        ? 'bg-red-500 ring-4 ring-red-500/50 animate-pulse scale-110'
                        : isTranscribing || isProcessing
                            ? 'bg-gray-600'
                            : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                aria-label="Assistant Vocal Global"
            >
                {isTranscribing || isProcessing ? (
                    <Loader2 size={40} className="text-white animate-spin" />
                ) : (
                    <Mic size={40} className="text-white" />
                )}

                {/* Helper Text if disabled */}
                {!isVoiceNavEnabled && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Activer Vocal
                    </span>
                )}
            </button>

            {/* Visual Feedback Overlay (Center Screen) */}
            {(isRecording || isProcessing || isTranscribing) && (
                <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none w-max">
                    <div className="bg-black/80 text-white px-8 py-4 rounded-full flex items-center gap-4 shadow-2xl backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-bottom-4">
                        {isRecording && (
                            <>
                                <div className="w-4 h-4 bg-red-500 rounded-full animate-ping" />
                                <span className="font-bold text-lg">Je vous écoute...</span>
                            </>
                        )}
                        {isTranscribing && (
                            <>
                                <Loader2 className="animate-spin text-blue-400 w-6 h-6" />
                                <span className="text-lg">Analyse...</span>
                            </>
                        )}
                        {isProcessing && (
                            <>
                                <Navigation className="animate-pulse text-green-400 w-6 h-6" />
                                <span className="text-lg">Exécution...</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Last Action Feedback */}
            {!isRecording && !isProcessing && lastAction && (
                <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none w-max">
                    <div className="bg-black/60 text-white px-6 py-3 rounded-full text-base animate-out fade-out duration-1000 delay-3000 border border-white/10">
                        {lastAction}
                    </div>
                </div>
            )}
        </>
    );
}
