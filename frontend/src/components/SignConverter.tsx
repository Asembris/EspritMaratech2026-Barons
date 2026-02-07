'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { convertToGloss, ConvertResponse } from '@/lib/api';
import GestureDetector from './GestureDetector';
import { useAudio } from '@/contexts/AudioContext';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';

interface FingerspellingItem {
    character: string;
    type: 'letter' | 'number' | 'space';
    image_url: string | null;
}

export default function SignConverter() {
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<ConvertResponse | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [useLlm, setUseLlm] = useState(true);

    // Refs for accessibility
    const statusRef = useRef<HTMLDivElement>(null);
    const mainDisplayRef = useRef<HTMLDivElement>(null);

    // Use global audio context & hover speech
    const { speak } = useAudio();
    const { onHover } = useHoverSpeech();

    // Announce to screen readers
    const announce = useCallback((message: string) => {
        if (statusRef.current) {
            statusRef.current.textContent = message;
        }
        // Use hook for audio feedback
        speak(message);
    }, [speak]);

    const handleConvert = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);
        announce('Conversion en cours...');

        try {
            const data = await convertToGloss(inputText, useLlm);
            setResult(data);
            setCurrentIndex(0);

            // Speak the summarized text if available, or the gloss
            const textToSpeak = data.summarized || data.gloss;
            announce(`Traduction : ${textToSpeak}`);
        } catch (err) {
            setError('Erreur de connexion au serveur');
            announce('Erreur de connexion au serveur');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!result?.fingerspelling) return;

        const chars = result.fingerspelling;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                setCurrentIndex(prev => {
                    const newIdx = Math.max(0, prev - 1);
                    const char = chars[newIdx];
                    announce(char.type === 'space' ? 'Espace' : char.character);
                    return newIdx;
                });
                break;
            case 'ArrowRight':
                e.preventDefault();
                setCurrentIndex(prev => {
                    const newIdx = Math.min(chars.length - 1, prev + 1);
                    const char = chars[newIdx];
                    announce(char.type === 'space' ? 'Espace' : char.character);
                    return newIdx;
                });
                break;
            case ' ':
                e.preventDefault();
                if (!isPlaying) playAnimation();
                break;
        }
    }, [result, isPlaying, announce]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // All characters including spaces for timeline display
    const allChars = result?.fingerspelling || [];

    // Valid chars for main display (exclude spaces)
    const validChars = allChars.filter(
        (item): item is FingerspellingItem & { image_url: string } =>
            item.type !== 'space' && item.image_url !== null
    );

    // Find non-space index for current display
    const getCurrentValidIndex = () => {
        let validIdx = 0;
        for (let i = 0; i < currentIndex; i++) {
            if (allChars[i]?.type !== 'space') {
                validIdx++;
            }
        }
        return validIdx;
    };

    const currentValidIdx = allChars[currentIndex]?.type !== 'space' ? getCurrentValidIndex() : -1;
    const currentSign = currentValidIdx >= 0 ? validChars[currentValidIdx] : null;

    const playAnimation = () => {
        if (allChars.length === 0) return;
        setIsPlaying(true);
        setCurrentIndex(0);
        announce('Animation démarrée');

        let idx = 0;
        const interval = setInterval(() => {
            idx++;
            if (idx >= allChars.length) {
                clearInterval(interval);
                setIsPlaying(false);
                setCurrentIndex(0);
                announce('Animation terminée');
                return;
            }
            setCurrentIndex(idx);
            const char = allChars[idx];
            announce(char.type === 'space' ? 'Espace' : char.character);
        }, 600);
    };

    const handleGestureDetected = (gesture: string, action: string) => {
        announce(`Geste détecté: ${action}`);

        // Handle gesture actions
        if (action === 'Suivant') {
            setCurrentIndex(prev => Math.min(allChars.length - 1, prev + 1));
        } else if (action === 'Précédent') {
            setCurrentIndex(prev => Math.max(0, prev - 1));
        } else if (action === 'Confirmer') {
            handleConvert();
        }
    };

    return (
        <div
            className="w-full max-w-4xl mx-auto p-6"
            role="application"
            aria-label="Convertisseur de texte en langue des signes"
        >
            {/* Screen reader announcements - ARIA live region */}
            <div
                ref={statusRef}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            />

            {/* Header */}
            <header className="text-center mb-8">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    🤟 SignLink
                </h2>
                <p className="text-gray-400 mt-2">Convertisseur Texte → Langue des Signes</p>
            </header>

            {/* Camera Toggle */}
            <nav aria-label="Options de caméra" className="flex justify-center mb-6">
                <button
                    onClick={() => setShowCamera(!showCamera)}
                    onMouseEnter={() => onHover(showCamera ? 'Masquer la caméra' : 'Afficher la caméra')}
                    aria-pressed={showCamera}
                    aria-label={showCamera ? 'Masquer la caméra de détection de gestes' : 'Afficher la caméra de détection de gestes'}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${showCamera
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    📷 {showCamera ? 'Masquer Caméra' : 'Afficher Caméra'}
                </button>
            </nav>

            {/* Gesture Detector */}
            {showCamera && (
                <section aria-label="Détection de gestes" className="mb-6">
                    <GestureDetector onGestureDetected={handleGestureDetected} />
                </section>
            )}

            {/* Input Section */}
            <section
                aria-labelledby="input-heading"
                className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700"
            >
                <h3 id="input-heading" className="sr-only">Saisie du texte</h3>

                <label
                    htmlFor="text-input"
                    className="block text-sm font-medium text-gray-300 mb-2"
                >
                    Entrez votre texte à convertir en signes
                </label>
                <textarea
                    id="text-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Bonjour, comment allez-vous ?"
                    aria-describedby="text-help"
                    className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none resize-none"
                />
                <p id="text-help" className="sr-only">
                    Entrez le texte français que vous souhaitez convertir en Langue des Signes Française
                </p>

                {/* LLM Toggle - Accessible */}
                <div className="flex items-center gap-3 mt-4 p-3 bg-gray-900 rounded-lg border border-gray-600">
                    <input
                        type="checkbox"
                        id="useLlm"
                        checked={useLlm}
                        onChange={(e) => setUseLlm(e.target.checked)}
                        aria-describedby="llm-description"
                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900"
                    />
                    <label htmlFor="useLlm" className="flex-1 cursor-pointer" onMouseEnter={() => onHover("Résumé IA : Simplifie le texte pour une meilleure traduction")}>
                        <span className="text-white font-medium">🤖 Résumé IA (OpenAI)</span>
                        <p id="llm-description" className="text-gray-400 text-sm">
                            Simplifie le texte pour une meilleure traduction en signes
                        </p>
                    </label>
                </div>

                <button
                    onClick={handleConvert}
                    disabled={isLoading || !inputText.trim()}
                    onMouseEnter={() => onHover("Convertir en signes")}
                    aria-busy={isLoading}
                    className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                    {isLoading ? '⏳ Conversion en cours...' : '✨ Convertir en Signes'}
                </button>
            </section>

            {/* Error - Accessible alert */}
            {error && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6"
                >
                    <span className="sr-only">Erreur: </span>
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <>
                    {/* Summarized text display */}
                    {result.summarized && (
                        <section
                            aria-labelledby="summary-heading"
                            className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 mb-6"
                        >
                            <h3 id="summary-heading" className="text-sm font-semibold text-green-400 mb-2">
                                🤖 Texte simplifié par l'IA
                            </h3>
                            <p className="text-white text-lg font-mono">{result.summarized}</p>
                        </section>
                    )}

                    {/* Gloss Output */}
                    <section
                        aria-labelledby="gloss-heading"
                        className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700"
                    >
                        <h3 id="gloss-heading" className="text-lg font-semibold text-purple-400 mb-2">
                            📝 Notation Gloss LSF
                        </h3>
                        <div className="flex flex-wrap gap-2" role="list" aria-label="Mots en notation gloss">
                            {result.words.map((word, i) => (
                                <span
                                    key={i}
                                    role="listitem"
                                    className="px-3 py-1 bg-purple-900/50 border border-purple-500 rounded-full text-purple-200"
                                >
                                    {word}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Main Sign Display */}
                    <section
                        ref={mainDisplayRef}
                        aria-labelledby="spell-heading"
                        aria-describedby="spell-instructions"
                        tabIndex={0}
                        className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 mb-6 border border-pink-500/30 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    >
                        <h3 id="spell-heading" className="text-lg font-semibold text-pink-400 mb-4 text-center">
                            🤟 Épellation en Images
                        </h3>
                        <p id="spell-instructions" className="sr-only">
                            Utilisez les flèches gauche et droite pour naviguer entre les caractères. Appuyez sur espace pour lancer l'animation.
                        </p>

                        {/* Current character display */}
                        <div
                            className="flex flex-col items-center"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {allChars[currentIndex]?.type === 'space' ? (
                                // Space indicator
                                <div
                                    className="w-48 h-48 bg-gray-700 rounded-2xl flex items-center justify-center shadow-lg"
                                    role="img"
                                    aria-label="Espace entre les mots"
                                >
                                    <div className="text-center">
                                        <span className="text-6xl" aria-hidden="true">⎵</span>
                                        <p className="text-gray-400 mt-2 text-lg">ESPACE</p>
                                    </div>
                                </div>
                            ) : currentSign ? (
                                // Letter/number display
                                <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20">
                                    <img
                                        src={`/signs/${currentSign.type === 'letter' ? 'letter_' + currentSign.character.toLowerCase() : 'num_' + currentSign.character}.png`}
                                        alt={`Signe pour la lettre ${currentSign.character} en Langue des Signes Française`}
                                        className="max-w-full max-h-full object-contain p-4"
                                    />
                                </div>
                            ) : (
                                <div className="w-48 h-48 bg-gray-700 rounded-2xl flex items-center justify-center">
                                    <span className="text-gray-500">Sélectionnez une lettre</span>
                                </div>
                            )}

                            <div className="mt-4 text-center">
                                <span className="text-gray-400">Caractère: </span>
                                <span
                                    className="text-3xl font-bold text-pink-400"
                                    aria-label={`Caractère actuel: ${allChars[currentIndex]?.type === 'space' ? 'espace' : allChars[currentIndex]?.character || 'aucun'}`}
                                >
                                    {allChars[currentIndex]?.type === 'space' ? '␣' : allChars[currentIndex]?.character || '-'}
                                </span>
                                <span className="ml-4 text-gray-500 text-sm">
                                    ({currentIndex + 1} / {allChars.length})
                                </span>
                            </div>
                        </div>

                        {/* Timeline with spaces */}
                        <nav
                            aria-label="Navigation des caractères"
                            className="flex gap-2 mt-6 overflow-x-auto pb-2 justify-center flex-wrap"
                        >
                            {allChars.map((item, i) => (
                                item.type === 'space' ? (
                                    // Space indicator in timeline
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setCurrentIndex(i);
                                            announce('Espace');
                                        }}
                                        aria-label={`Espace, position ${i + 1}`}
                                        aria-current={i === currentIndex ? 'true' : undefined}
                                        className={`w-8 h-14 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 ${i === currentIndex
                                            ? 'bg-yellow-500/30 border-yellow-500 scale-110'
                                            : 'bg-gray-700/50'
                                            } rounded-lg border-2 border-dashed border-gray-500`}
                                    >
                                        <span className="text-yellow-400 text-xl" aria-hidden="true">⎵</span>
                                    </button>
                                ) : (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setCurrentIndex(i);
                                            announce(item.character);
                                        }}
                                        aria-label={`Lettre ${item.character}, position ${i + 1}`}
                                        aria-current={i === currentIndex ? 'true' : undefined}
                                        className={`w-12 h-14 flex flex-col items-center justify-center rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-pink-400 ${i === currentIndex
                                            ? 'border-pink-500 bg-pink-500/20 scale-110'
                                            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                                            }`}
                                    >
                                        <span className="text-lg">{item.character}</span>
                                    </button>
                                )
                            ))}
                        </nav>

                        {/* Legend */}
                        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-pink-500/20 border-2 border-pink-500 rounded" aria-hidden="true"></div>
                                <span>Lettre/Chiffre</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-700/50 border-2 border-dashed border-gray-500 rounded" aria-hidden="true"></div>
                                <span>Espace</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center gap-4 mt-6">
                            <button
                                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                onMouseEnter={() => onHover("Caractère précédent")}
                                aria-label="Caractère précédent"
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                ◀️ Précédent
                            </button>
                            <button
                                onClick={playAnimation}
                                disabled={isPlaying || allChars.length === 0}
                                onMouseEnter={() => onHover("Lancer l'animation")}
                                aria-label={isPlaying ? 'Animation en cours' : 'Démarrer l\'animation'}
                                className="px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:from-pink-700 hover:to-purple-700 transition-all focus:outline-none focus:ring-2 focus:ring-pink-400"
                            >
                                {isPlaying ? '⏳ Animation...' : '▶️ Animer'}
                            </button>
                            <button
                                onClick={() => setCurrentIndex(prev => Math.min(allChars.length - 1, prev + 1))}
                                disabled={currentIndex >= allChars.length - 1}
                                onMouseEnter={() => onHover("Caractère suivant")}
                                aria-label="Caractère suivant"
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                Suivant ▶️
                            </button>
                        </div>

                        {/* Keyboard instructions */}
                        <p className="text-center text-gray-500 text-xs mt-4">
                            💡 Utilisez les touches ← → pour naviguer, Espace pour animer
                        </p>
                    </section>
                </>
            )}
        </div>
    );
}
