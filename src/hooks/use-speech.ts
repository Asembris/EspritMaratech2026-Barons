import { useCallback, useRef } from "react";

/**
 * useSpeech — Wrapper around Web Speech API's SpeechSynthesis.
 *
 * Provides a `speak` function that reads text aloud.
 * Gracefully degrades: if SpeechSynthesis is unavailable, `speak` is a no-op.
 * The `stop` function cancels any ongoing speech.
 *
 * Accessibility rationale:
 * Voice output supplements screen reader announcements for users
 * who prefer auditory feedback beyond their AT.
 */
export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text: string, lang = "fr-FR") => {
      if (!supported) return;
      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
  }, [supported]);

  return { speak, stop, supported };
}
