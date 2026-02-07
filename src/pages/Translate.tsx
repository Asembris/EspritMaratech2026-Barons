import { useState, useEffect, useCallback } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { LiveRegion } from "@/components/LiveRegion";
import { useSpeech } from "@/hooks/use-speech";
import { convertToGloss, ConvertResponse } from "@/lib/omarApi";
// GestureDetector removed - now using global FloatingGestureCamera

// Get sign image path for a character
const getSignImagePath = (char: string): string | null => {
    const c = char.toLowerCase();
    if (c >= 'a' && c <= 'z') {
        return `/signs/letter_${c}.png`;
    }
    if (c >= '1' && c <= '9') {
        return `/signs/num_${c}.png`;
    }
    return null;
};

/**
 * Translate Page - LSF (French Sign Language) Converter
 *
 * Converts French text to LSF notation with:
 * - Text input
 * - Gloss notation output
 * - Fingerspelling visualization with sign images
 * - Camera gesture detection
 * - Keyboard navigation
 * - Voice feedback
 */
const TranslatePage = () => {
    const { speak } = useSpeech();

    const [inputText, setInputText] = useState("");
    const [result, setResult] = useState<ConvertResponse | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [announcement, setAnnouncement] = useState("");

    useEffect(() => {
        document.title = "Traduction LSF — Plateforme Accessible";
    }, []);

    const announce = useCallback(
        (message: string) => {
            setAnnouncement(message);
            speak(message);
        },
        [speak]
    );

    const handleConvert = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);
        announce("Conversion en cours...");

        try {
            const data = await convertToGloss(inputText, false);
            setResult(data);
            setCurrentIndex(0);

            const textToSpeak = data.summarized || data.gloss;
            announce(`Traduction : ${textToSpeak}`);
        } catch (err) {
            setError("Erreur de connexion au serveur. Vérifiez que le backend est lancé.");
            announce("Erreur de connexion au serveur");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const allChars = result?.fingerspelling || [];

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!result?.fingerspelling) return;

            const chars = result.fingerspelling;

            switch (e.key) {
                case "ArrowLeft":
                    e.preventDefault();
                    setCurrentIndex((prev) => {
                        const newIdx = Math.max(0, prev - 1);
                        const char = chars[newIdx];
                        announce(char.type === "space" ? "Espace" : char.character);
                        return newIdx;
                    });
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    setCurrentIndex((prev) => {
                        const newIdx = Math.min(chars.length - 1, prev + 1);
                        const char = chars[newIdx];
                        announce(char.type === "space" ? "Espace" : char.character);
                        return newIdx;
                    });
                    break;
                case " ":
                    if (!isPlaying && result?.fingerspelling?.length) {
                        e.preventDefault();
                        playAnimation();
                    }
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [result, isPlaying, announce]);

    const playAnimation = () => {
        if (allChars.length === 0) return;
        setIsPlaying(true);
        setCurrentIndex(0);
        announce("Animation démarrée");

        let idx = 0;
        const interval = setInterval(() => {
            idx++;
            if (idx >= allChars.length) {
                clearInterval(interval);
                setIsPlaying(false);
                setCurrentIndex(0);
                announce("Animation terminée");
                return;
            }
            setCurrentIndex(idx);
            const char = allChars[idx];
            announce(char.type === "space" ? "Espace" : char.character);
        }, 600);
    };

    // Handle gesture detection
    const handleGesture = (gesture: string, action: string) => {
        announce(`Geste: ${gesture} - ${action}`);

        // Handle navigation with gestures
        if (action === "Suivant" && allChars.length > 0) {
            setCurrentIndex((prev) => Math.min(allChars.length - 1, prev + 1));
        } else if (action === "Précédent" && allChars.length > 0) {
            setCurrentIndex((prev) => Math.max(0, prev - 1));
        } else if (action === "Confirmer" && !isPlaying && allChars.length > 0) {
            playAnimation();
        }
    };

    const currentChar = allChars[currentIndex];
    const currentSignImage = currentChar && currentChar.type !== "space"
        ? getSignImagePath(currentChar.character)
        : null;

    return (
        <PageLayout>
            <Section title="Traduction en Langue des Signes" headingLevel="h1" id="translate">
                <p className="text-foreground mb-6 max-w-2xl">
                    Convertissez du texte français en notation LSF (Langue des Signes
                    Française). Utilisez les flèches ← → pour naviguer, Espace pour animer,
                    ou utilisez la détection de gestes par caméra.
                </p>

                {/* Input form */}
                <div className="max-w-xl mb-8">
                    <label
                        htmlFor="text-input"
                        className="block text-foreground font-semibold mb-2"
                    >
                        Texte à convertir
                    </label>
                    <textarea
                        id="text-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Bonjour, comment allez-vous ?"
                        className={[
                            "w-full h-32 px-4 py-3 rounded-lg border-2 border-input",
                            "bg-card text-foreground text-lg resize-none",
                            "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
                        ].join(" ")}
                        aria-describedby="text-help"
                    />
                    <p id="text-help" className="mt-1 text-muted-foreground">
                        Entrez le texte français que vous souhaitez traduire.
                    </p>

                    <AccessibleButton
                        onClick={handleConvert}
                        disabled={isLoading || !inputText.trim()}
                        variant="primary"
                        className="mt-4 w-full"
                    >
                        {isLoading ? "⏳ Conversion..." : "✨ Convertir en Signes"}
                    </AccessibleButton>
                </div>

                {/* Error */}
                {error && (
                    <LiveRegion politeness="assertive" className="mb-6">
                        <p className="p-3 rounded bg-destructive text-destructive-foreground font-medium">
                            {error}
                        </p>
                    </LiveRegion>
                )}

                {/* Announcements */}
                <LiveRegion politeness="polite" className="mb-6">
                    {announcement && !error && (
                        <p className="p-3 rounded bg-secondary text-secondary-foreground font-medium">
                            {announcement}
                        </p>
                    )}
                </LiveRegion>
            </Section>

            {/* Note: Gesture detection now available via floating camera button (bottom left) */}

            {/* Results */}
            {result && (
                <>
                    {/* Gloss Output */}
                    <Section title="Notation Gloss LSF" id="gloss">
                        <div
                            className="flex flex-wrap gap-2"
                            role="list"
                            aria-label="Mots en notation gloss"
                        >
                            {result.words.map((word, i) => (
                                <span
                                    key={i}
                                    role="listitem"
                                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 border-2 border-purple-300 dark:border-purple-500 rounded-full text-purple-700 dark:text-purple-200 font-medium"
                                >
                                    {word}
                                </span>
                            ))}
                        </div>
                    </Section>

                    {/* Fingerspelling Display */}
                    <Section title="Épellation" id="spelling">
                        {/* Current character with sign image */}
                        <div
                            className="flex flex-col items-center mb-6"
                            role="region"
                            aria-label="Caractère actuel"
                            aria-live="polite"
                        >
                            <div className="flex items-center gap-6">
                                {/* Sign image */}
                                {currentSignImage ? (
                                    <div className="w-40 h-40 rounded-xl bg-card border-2 border-border overflow-hidden flex items-center justify-center">
                                        <img
                                            src={currentSignImage}
                                            alt={`Signe LSF pour ${currentChar?.character}`}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-40 h-40 rounded-xl bg-muted border-2 border-border flex items-center justify-center text-muted-foreground">
                                        {currentChar?.type === "space" ? "Espace" : ""}
                                    </div>
                                )}

                                {/* Character display */}
                                <div
                                    className={[
                                        "w-32 h-32 rounded-xl flex items-center justify-center text-6xl font-bold",
                                        currentChar?.type === "space"
                                            ? "bg-muted text-muted-foreground"
                                            : "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
                                    ].join(" ")}
                                >
                                    {currentChar?.type === "space"
                                        ? "⎵"
                                        : currentChar?.character || "-"}
                                </div>
                            </div>
                            <p className="mt-2 text-muted-foreground">
                                {currentIndex + 1} / {allChars.length}
                            </p>
                        </div>

                        {/* Timeline */}
                        <nav
                            aria-label="Navigation des caractères"
                            className="flex gap-2 overflow-x-auto pb-2 justify-center flex-wrap mb-6"
                        >
                            {allChars.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setCurrentIndex(i);
                                        announce(item.type === "space" ? "Espace" : item.character);
                                    }}
                                    aria-label={
                                        item.type === "space"
                                            ? `Espace, position ${i + 1}`
                                            : `Lettre ${item.character}, position ${i + 1}`
                                    }
                                    aria-current={i === currentIndex ? "true" : undefined}
                                    className={[
                                        "w-10 h-12 flex items-center justify-center rounded-lg border-2 transition-all",
                                        "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring",
                                        i === currentIndex
                                            ? "border-purple-500 bg-purple-500/20 scale-110"
                                            : "border-border bg-card hover:border-primary/50",
                                        item.type === "space" ? "border-dashed" : "",
                                    ].join(" ")}
                                >
                                    <span className="text-foreground">
                                        {item.type === "space" ? "⎵" : item.character}
                                    </span>
                                </button>
                            ))}
                        </nav>

                        {/* Controls */}
                        <div className="flex justify-center gap-4">
                            <AccessibleButton
                                onClick={() =>
                                    setCurrentIndex((prev) => Math.max(0, prev - 1))
                                }
                                disabled={currentIndex === 0}
                                variant="secondary"
                            >
                                ◀️ Précédent
                            </AccessibleButton>
                            <AccessibleButton
                                onClick={playAnimation}
                                disabled={isPlaying || allChars.length === 0}
                                variant="primary"
                            >
                                {isPlaying ? "⏳ Animation..." : "▶️ Animer"}
                            </AccessibleButton>
                            <AccessibleButton
                                onClick={() =>
                                    setCurrentIndex((prev) =>
                                        Math.min(allChars.length - 1, prev + 1)
                                    )
                                }
                                disabled={currentIndex >= allChars.length - 1}
                                variant="secondary"
                            >
                                Suivant ▶️
                            </AccessibleButton>
                        </div>

                        <p className="text-center text-muted-foreground text-sm mt-4">
                            💡 Utilisez les touches ← → pour naviguer, Espace pour animer, ou les gestes de main
                        </p>
                    </Section>
                </>
            )}
        </PageLayout>
    );
};

export default TranslatePage;

