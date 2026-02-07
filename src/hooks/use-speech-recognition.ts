import { useState, useCallback, useRef, useEffect } from "react";

/**
 * useSpeechRecognition — Wrapper around Web Speech API's SpeechRecognition.
 *
 * Returns:
 * - `transcript`: final recognized text
 * - `interimTranscript`: live partial text while speaking
 * - `listening`: whether recognition is active
 * - `startListening` / `stopListening`: controls
 * - `supported`: whether the browser supports speech recognition
 * - `error`: last error (speech recognition or mic)
 *
 * Fixes included:
 * - Explicit mic warm-up via getUserMedia (avoids "listening but no results")
 * - Auto-stop timeout (prevents stuck listening)
 * - Detailed console logs for diagnosis
 */
export function useSpeechRecognition(lang = "fr-FR") {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const stopTimerRef = useRef<number | null>(null);

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const supported = !!SpeechRecognitionAPI;

  useEffect(() => {
    if (!supported) return;
    

    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      console.log("[STT] onstart");
      setError(null);
    };
    recognition.onaudiostart = () => console.log("[STT] onaudiostart");
recognition.onaudioend = () => console.log("[STT] onaudioend");
recognition.onspeechstart = () => console.log("[STT] onspeechstart");
recognition.onspeechend = () => console.log("[STT] onspeechend");
recognition.onsoundstart = () => console.log("[STT] onsoundstart");
recognition.onsoundend = () => console.log("[STT] onsoundend");


    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res?.[0]?.transcript?.trim?.() ?? "";
        if (!text) continue;

        if (res.isFinal) finalText += (finalText ? " " : "") + text;
        else interimText += (interimText ? " " : "") + text;
      }

      if (interimText) {
        console.log("[STT] interim:", interimText);
        setInterimTranscript(interimText);
      }

      if (finalText) {
        console.log("[STT] final:", finalText);
        setTranscript(finalText);
        setInterimTranscript("");
        setListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      const err = event?.error ?? "unknown";
      console.error("[STT] onerror:", err, event);
      setError(err);
      setListening(false);
    };

    recognition.onend = () => {
      console.log("[STT] onend");
      setListening(false);

      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        if (stopTimerRef.current) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
        recognition.abort();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [supported, lang]);

  const startListening = useCallback(async () => {
    if (!supported || !recognitionRef.current) return;

    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setListening(true);

    // ✅ 1) Warm up mic explicitly (forces permission + audio init)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      console.error("[STT] getUserMedia error:", e);
      setError(e?.name || "not-allowed");
      setListening(false);
      return;
    }

    // ✅ 2) Start recognition
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error("[STT] start error:", e);
      setError("start-failed");
      setListening(false);
      return;
    }

    // ✅ 3) Auto-stop after 6 seconds (prevents stuck listening forever)
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    }, 6000);
  }, [supported]);

  const stopListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.error("[STT] stop error:", e);
    } finally {
      setListening(false);
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    }
  }, [supported]);

  return {
    transcript,
    interimTranscript,
    listening,
    startListening,
    stopListening,
    supported,
    error,
  };
}
