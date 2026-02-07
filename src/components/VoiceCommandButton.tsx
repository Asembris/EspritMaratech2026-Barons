import { useEffect, useMemo, useState } from "react";
import { Mic } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { AccessibleButton } from "@/components/AccessibleButton";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeech } from "@/hooks/use-speech";
import { detectIntent } from "@/voice/detectIntent";
import { handleIntent } from "@/voice/voiceController";
import { getPageContext } from "@/voice/pageContexts";
import { askGuideLLM } from "@/voice/ollamaGuide";

function focusMainContent() {
    const candidates = ["main-content", "welcome", "banking", "shopping", "a11y"];
    for (const id of candidates) {
        const el = document.getElementById(id);
        if (el) {
            (el as HTMLElement).focus?.();
            return;
        }
    }
}

function pageHelp(pathname: string) {
    if (pathname === "/")
        return "Vous êtes sur l’accueil. Dites : banque, courses, accessibilité, lire la page, ou aide.";
    if (pathname === "/banking")
        return "Page banque. Dites : lire la page, accueil, courses, accessibilité.";
    if (pathname === "/shopping")
        return "Page courses. Dites : lire la page pour lire la liste. Dites aussi : accueil, banque, accessibilité.";
    if (pathname === "/accessibility")
        return "Page accessibilité. Dites : lire la page, accueil, banque, courses.";
    return "Dites : accueil, banque, courses, accessibilité, lire la page, ou aide.";
}

export function VoiceCommandButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const { speak, supported: ttsSupported } = useSpeech();

    const {
        transcript,
        interimTranscript,
        error,
        listening,
        startListening,
        supported: sttSupported,
    } = useSpeechRecognition("fr-FR");

    const supported = sttSupported && ttsSupported;

    // ✅ Debug textbox (editable)
    const [debugText, setDebugText] = useState("");

    // ✅ Debug panel info (no console needed)
    const [debugInfo, setDebugInfo] = useState({
        lastTranscript: "",
        lastIntent: "",
        lastGuideStatus: "",
        lastGuideAnswer: "",
        lastError: "",
        lastGuideError: "",
        lastGuideMs: "",
        lastOllamaUrl: "",
    });

    // Show the Ollama URL on screen (from env)
    const ollamaUrl = useMemo(() => {
        // This is what your ollamaGuide.ts will use
        // (Vite injects it at build time)
        return import.meta.env.VITE_OLLAMA_URL || "http://localhost:11434";
    }, []);

    // Keep textbox synced with FINAL transcript
    useEffect(() => {
        if (typeof transcript === "string" && transcript) setDebugText(transcript);
    }, [transcript]);

    // Keep debug panel updated with STT error
    useEffect(() => {
        setDebugInfo((d) => ({ ...d, lastError: error || "" }));
    }, [error]);

    const readCurrentPage = () => {
        const p = location.pathname;

        if (p === "/") {
            speak(
                "Accueil. Vous pouvez aller à la banque, aux courses, ou aux paramètres d’accessibilité.",
                "fr-FR"
            );
        } else if (p === "/banking") {
            speak("Banque. Vous pouvez consulter le solde et simuler un virement.", "fr-FR");
        } else if (p === "/shopping") {
            speak("Courses. Vous pouvez ajouter et retirer des articles de votre liste.", "fr-FR");
        } else if (p === "/accessibility") {
            speak(
                "Accessibilité. Vous pouvez changer la taille du texte et activer le contraste élevé.",
                "fr-FR"
            );
        } else {
            speak("Page inconnue.", "fr-FR");
        }
    };

    const help = () => speak(pageHelp(location.pathname), "fr-FR");

    // Helper: run guide request (shared by voice + typed test)
    const runGuide = (question: string) => {
        const ctx = getPageContext(location.pathname);
        const t0 = performance.now();

        speak("Je réponds.", "fr-FR");

        setDebugInfo((d) => ({
            ...d,
            lastGuideStatus: `Calling Ollama...`,
            lastGuideAnswer: "",
            lastGuideError: "",
            lastGuideMs: "",
            lastOllamaUrl: ollamaUrl,
        }));

        askGuideLLM({ ctx, question })
            .then((answer) => {
                const ms = Math.round(performance.now() - t0);
                setDebugInfo((d) => ({
                    ...d,
                    lastGuideStatus: "Answer received",
                    lastGuideAnswer: answer,
                    lastGuideMs: `${ms} ms`,
                }));
                speak(answer, "fr-FR");
            })
            .catch((e) => {
                const ms = Math.round(performance.now() - t0);
                const msg = e?.name === "AbortError" ? "timeout" : (e?.message || e?.name || "fetch failed");

                setDebugInfo((d) => ({
                    ...d,
                    lastGuideStatus: "Ollama failed",
                    lastGuideError: msg,
                    lastGuideMs: `${ms} ms`,
                }));

                speak(
                    "Je ne peux pas répondre maintenant. Le service de guidage est indisponible.",
                    "fr-FR"
                );
            });
    };

    // When we get a FINAL transcript: detect intent → run action
    useEffect(() => {
        if (!transcript) return;

        const { intent } = detectIntent(transcript);

        setDebugInfo((d) => ({
            ...d,
            lastTranscript: transcript,
            lastIntent: intent,
            lastGuideStatus: "",
            lastGuideAnswer: "",
            lastGuideError: "",
            lastGuideMs: "",
            lastOllamaUrl: "",
        }));

        if (intent === "guide_query") {
            runGuide(transcript);
            return;
        }

        handleIntent({
            intent,
            navigate,
            speak: (t) => speak(t, "fr-FR"),
            readCurrentPage,
            help,
        });
    }, [transcript, navigate, speak, location.pathname]);

    // On route change: announce + focus main content
    useEffect(() => {
        const p = location.pathname;
        if (p === "/") speak("Accueil.", "fr-FR");
        else if (p === "/banking") speak("Page banque.", "fr-FR");
        else if (p === "/shopping") speak("Page courses.", "fr-FR");
        else if (p === "/accessibility") speak("Page accessibilité.", "fr-FR");
        focusMainContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
            {!supported && (
                <div className="max-w-[280px] rounded-md border border-yellow-500 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 shadow dark:bg-yellow-900 dark:text-yellow-200">
                    Micro ou lecture vocale non disponible sur ce navigateur.
                    Utilisez HTTPS sur mobile et Chrome/Edge si possible.
                </div>
            )}

            <label className="sr-only" htmlFor="voice-debug-text">
                Texte détecté
            </label>

            <textarea
                id="voice-debug-text"
                value={debugText || interimTranscript || ""}
                onChange={(e) => setDebugText(e.target.value)}
                placeholder={listening ? "Écoute en cours…" : "Texte détecté…"}
                rows={3}
                className="w-[280px] resize-none rounded-md border bg-background px-3 py-2 text-xs shadow focus:outline-none focus:ring-2 focus:ring-ring"
                aria-live="polite"
            />

            {/* Debug panel */}
            <div className="w-[280px] rounded-md border bg-background px-3 py-2 text-xs shadow">
                <div><b>Listening:</b> {String(listening)}</div>
                <div><b>STT:</b> {String(sttSupported)}</div>
                <div><b>TTS:</b> {String(ttsSupported)}</div>
                <div><b>Interim:</b> {interimTranscript || "-"}</div>
                <div><b>Final:</b> {transcript || "-"}</div>
                <div><b>Error:</b> {debugInfo.lastError || "-"}</div>
                <div><b>Intent:</b> {debugInfo.lastIntent || "-"}</div>
                <div><b>Guide:</b> {debugInfo.lastGuideStatus || "-"}</div>
                <div><b>Ollama URL:</b> {debugInfo.lastOllamaUrl || "-"}</div>
                <div><b>Guide time:</b> {debugInfo.lastGuideMs || "-"}</div>
                <div><b>Guide error:</b> {debugInfo.lastGuideError || "-"}</div>
            </div>

            <div className="flex items-center gap-2">
                <AccessibleButton
                    variant="secondary"
                    onClick={() => {
                        // Unlock TTS on mobile with a user gesture
                        speak("Test.", "fr-FR");

                        const { intent } = detectIntent(debugText);

                        setDebugInfo((d) => ({
                            ...d,
                            lastTranscript: debugText,
                            lastIntent: intent,
                            lastGuideStatus: "",
                            lastGuideAnswer: "",
                            lastGuideError: "",
                            lastGuideMs: "",
                            lastOllamaUrl: "",
                        }));

                        if (intent === "guide_query") {
                            runGuide(debugText);
                            return;
                        }

                        handleIntent({
                            intent,
                            navigate,
                            speak: (t) => speak(t, "fr-FR"),
                            readCurrentPage,
                            help,
                        });
                    }}
                    aria-label="Tester la commande avec le texte"
                >
                    Tester
                </AccessibleButton>

                <AccessibleButton
                    variant="accent"
                    onClick={listening ? undefined : startListening}
                    aria-label={listening ? "Écoute en cours" : "Activer la commande vocale"}
                >
                    <Mic className="w-5 h-5" aria-hidden="true" />
                    {listening ? "Écoute…" : "Voix"}
                </AccessibleButton>
            </div>

            {/* Show last guide answer + a button to speak it again */}
            {debugInfo.lastGuideAnswer && (
                <div className="max-w-[280px] rounded-md border bg-background px-3 py-2 text-xs shadow">
                    <b>Réponse guide:</b>
                    <div className="mt-1 whitespace-pre-wrap">{debugInfo.lastGuideAnswer}</div>

                    <div className="mt-2 flex justify-end">
                        <AccessibleButton
                            variant="secondary"
                            onClick={() => speak(debugInfo.lastGuideAnswer, "fr-FR")}
                            aria-label="Lire la réponse à voix haute"
                        >
                            Lire la réponse
                        </AccessibleButton>
                    </div>
                </div>
            )}
        </div>
    );
}
