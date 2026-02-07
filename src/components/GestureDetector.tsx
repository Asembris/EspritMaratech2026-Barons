'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSpeech } from '@/hooks/use-speech';

interface GestureInfo {
    id: string;
    emoji: string;
    name: string;
    action: string;
    detected: boolean;
}

interface Landmark {
    x: number;
    y: number;
    z: number;
}

interface Props {
    onGestureDetected?: (gesture: string, action: string) => void;
}

// Landmark indices for MediaPipe Hands
const THUMB_TIP = 4;
const THUMB_IP = 3;
const THUMB_MCP = 2;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;

// Pure helper functions outside component
const isFingerExtended = (landmarks: Landmark[], tipIdx: number, pipIdx: number): boolean => {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
};

const isThumbExtended = (landmarks: Landmark[]): boolean => {
    const tip = landmarks[THUMB_TIP];
    const ip = landmarks[THUMB_IP];
    const isRightHand = landmarks[THUMB_TIP].x < landmarks[PINKY_TIP].x;
    return isRightHand ? tip.x < ip.x : tip.x > ip.x;
};

const getFingerStates = (landmarks: Landmark[]) => ({
    thumb: isThumbExtended(landmarks),
    index: isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP),
    middle: isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP),
    ring: isFingerExtended(landmarks, RING_TIP, RING_PIP),
    pinky: isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP),
});

const detectGestureFromLandmarks = (landmarks: Landmark[]): string => {
    if (!landmarks || landmarks.length < 21) return 'none';

    const fingers = getFingerStates(landmarks);
    const extendedCount = Object.values(fingers).filter(v => v).length;
    const indexTip = landmarks[INDEX_TIP];
    const indexMcp = landmarks[INDEX_MCP];

    // Open Hand: 4+ fingers extended
    if (extendedCount >= 4 && fingers.index && fingers.middle && fingers.ring) {
        return 'open_hand';
    }

    // Thumbs Up or Closed Fist
    if (!fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        const thumbTip = landmarks[THUMB_TIP];
        const thumbMcp = landmarks[THUMB_MCP];
        const thumbIsUp = thumbTip.y < indexMcp.y;
        const thumbIsExtended = Math.abs(thumbTip.y - thumbMcp.y) > 0.05 ||
            Math.abs(thumbTip.x - thumbMcp.x) > 0.05;

        if (thumbIsUp && thumbIsExtended) return 'thumbs_up';
        return 'closed_fist';
    }

    // Pointing: only index extended
    if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        const dx = indexTip.x - indexMcp.x;
        const dy = Math.abs(indexTip.y - indexMcp.y);
        if (Math.abs(dx) > dy) {
            if (dx > 0.05) return 'point_left';
            if (dx < -0.05) return 'point_right';
        }
    }

    return 'none';
};

const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Landmark[], w: number, h: number) => {
    ctx.fillStyle = '#00ff88';
    landmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x * w, point.y * h, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
};

const drawConnections = (ctx: CanvasRenderingContext2D, landmarks: Landmark[], w: number, h: number) => {
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
    ];

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[start].x * w, landmarks[start].y * h);
        ctx.lineTo(landmarks[end].x * w, landmarks[end].y * h);
        ctx.stroke();
    });
};

declare global {
    interface Window {
        Hands: any;
        Camera: any;
    }
}

// Page navigation order
const PAGES = ['/', '/banking', '/shopping', '/translate', '/accessibility'];
const PAGE_NAMES: Record<string, string> = {
    '/': 'Accueil',
    '/banking': 'Banque',
    '/shopping': 'Shopping',
    '/translate': 'Traduction',
    '/accessibility': 'Accessibilité'
};

// Gesture config - NO holdTime, all immediate
const gesturesConfig = [
    { id: 'open_hand', emoji: '🖐️', name: 'Main Ouverte', action: 'Voix ON' },
    { id: 'closed_fist', emoji: '✊', name: 'Poing Fermé', action: 'Voix OFF' },
    { id: 'point_right', emoji: '👉', name: 'Pointer Droite', action: 'Page Suivante' },
    { id: 'point_left', emoji: '👈', name: 'Pointer Gauche', action: 'Page Précédente' },
    { id: 'thumbs_up', emoji: '👍', name: 'Pouce Levé', action: 'Confirmer' },
];

export function GestureDetector({ onGestureDetected }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string>('none');
    const { speak, stop: stopTTS } = useSpeech();
    const [error, setError] = useState<string | null>(null);
    const [handDetected, setHandDetected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);

    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const gestureHistoryRef = useRef<string[]>([]);
    const lastConfirmedGestureRef = useRef<string>('none');
    const lastGestureTimeRef = useRef<number>(0);

    const gestures: GestureInfo[] = gesturesConfig.map(g => ({
        ...g,
        detected: currentGesture === g.id,
    }));

    // Navigate to next/previous page
    const navigatePage = useCallback((direction: 'next' | 'prev') => {
        const currentIndex = PAGES.indexOf(location.pathname);
        let newIndex: number;

        if (currentIndex === -1) {
            newIndex = 0;
        } else if (direction === 'next') {
            newIndex = (currentIndex + 1) % PAGES.length;
        } else {
            newIndex = (currentIndex - 1 + PAGES.length) % PAGES.length;
        }

        const pageName = PAGE_NAMES[PAGES[newIndex]] || PAGES[newIndex];
        if (ttsEnabled) speak(pageName);
        navigate(PAGES[newIndex]);
    }, [location.pathname, navigate, speak, ttsEnabled]);

    // Handle gesture actions - ALL IMMEDIATE, no delays
    const handleGestureAction = useCallback((gesture: string) => {
        const now = Date.now();
        // Debounce: 1 second between actions
        if (now - lastGestureTimeRef.current < 1000) {
            return;
        }
        lastGestureTimeRef.current = now;

        switch (gesture) {
            case 'point_right':
                navigatePage('next');
                onGestureDetected?.('Pointer Droite', 'Page Suivante');
                break;
            case 'point_left':
                navigatePage('prev');
                onGestureDetected?.('Pointer Gauche', 'Page Précédente');
                break;
            case 'closed_fist':
                stopTTS();
                setTtsEnabled(false);
                // Still speak this once
                const offUtterance = new SpeechSynthesisUtterance('Voix désactivée');
                offUtterance.lang = 'fr-FR';
                window.speechSynthesis.speak(offUtterance);
                onGestureDetected?.('Poing Fermé', 'Voix OFF');
                break;
            case 'open_hand':
                setTtsEnabled(true);
                speak('Voix activée');
                onGestureDetected?.('Main Ouverte', 'Voix ON');
                break;
            case 'thumbs_up':
                if (ttsEnabled) speak('OK');
                onGestureDetected?.('Pouce Levé', 'Confirmer');
                break;
        }
    }, [navigatePage, speak, stopTTS, ttsEnabled, onGestureDetected]);

    // Process gesture with stabilization
    const processGesture = useCallback((detected: string) => {
        const historySize = 5;
        const debounceMs = 500;

        gestureHistoryRef.current.push(detected);
        if (gestureHistoryRef.current.length > historySize) {
            gestureHistoryRef.current.shift();
        }

        const isStable = gestureHistoryRef.current.length >= historySize &&
            gestureHistoryRef.current.every(g => g === detected);

        if (isStable && detected !== 'none') {
            const now = Date.now();

            if (detected !== lastConfirmedGestureRef.current ||
                (now - lastGestureTimeRef.current) > debounceMs * 2) {

                setCurrentGesture(detected);
                lastConfirmedGestureRef.current = detected;
                handleGestureAction(detected);
            }
        } else if (detected === 'none' && gestureHistoryRef.current.every(g => g === 'none')) {
            setCurrentGesture('none');
            if (lastConfirmedGestureRef.current !== 'none') {
                lastConfirmedGestureRef.current = 'none';
            }
        }
    }, [handleGestureAction]);

    // MediaPipe results handler
    const onResults = useCallback((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true);
            const landmarks = results.multiHandLandmarks[0];

            drawConnections(ctx, landmarks, canvas.width, canvas.height);
            drawLandmarks(ctx, landmarks, canvas.width, canvas.height);

            const detected = detectGestureFromLandmarks(landmarks);
            processGesture(detected);
        } else {
            setHandDetected(false);
            processGesture('none');
        }

        ctx.restore();
    }, [processGesture]);

    const loadMediaPipe = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (window.Hands && window.Camera) {
                resolve();
                return;
            }

            const handsScript = document.createElement('script');
            handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
            handsScript.crossOrigin = 'anonymous';

            const cameraScript = document.createElement('script');
            cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
            cameraScript.crossOrigin = 'anonymous';

            let loaded = 0;
            const onLoad = () => {
                loaded++;
                if (loaded === 2) resolve();
            };

            handsScript.onload = onLoad;
            cameraScript.onload = onLoad;
            handsScript.onerror = reject;
            cameraScript.onerror = reject;

            document.head.appendChild(handsScript);
            document.head.appendChild(cameraScript);
        });
    };

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);

            await loadMediaPipe();

            if (!window.Hands) {
                setError('MediaPipe non chargé. Réessayez.');
                setLoading(false);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;

                handsRef.current = new window.Hands({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                });

                handsRef.current.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                });

                handsRef.current.onResults(onResults);

                if (window.Camera) {
                    cameraRef.current = new window.Camera(videoRef.current, {
                        onFrame: async () => {
                            if (handsRef.current && videoRef.current) {
                                await handsRef.current.send({ image: videoRef.current });
                            }
                        },
                        width: 640,
                        height: 480
                    });
                    cameraRef.current.start();
                }

                setIsActive(true);
                speak('Caméra activée');
            }
        } catch (err) {
            setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [onResults, speak]);

    const stopCamera = useCallback(() => {
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsActive(false);
        setCurrentGesture('none');
        setHandDetected(false);
        speak('Caméra désactivée');
    }, [speak]);

    useEffect(() => {
        return () => {
            if (isActive) {
                stopCamera();
            }
        };
    }, [isActive, stopCamera]);

    const currentPage = PAGE_NAMES[location.pathname] || location.pathname;

    return (
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Left side - Camera */}
                <div className="p-6 border-b lg:border-b-0 lg:border-r border-border">
                    <div className="relative aspect-video bg-muted rounded-xl overflow-hidden border-2 border-border mb-4">
                        {!isActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-card px-6 py-4 rounded-full border-2 border-primary/50 flex items-center gap-3">
                                    <span className="text-3xl">👋</span>
                                    <span className="text-muted-foreground">En attente...</span>
                                </div>
                            </div>
                        )}

                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover transform scale-x-[-1] ${isActive ? 'block' : 'hidden'}`}
                        />

                        <canvas
                            ref={canvasRef}
                            width={640}
                            height={480}
                            className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
                        />

                        {/* Hand detection indicator */}
                        {isActive && (
                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold ${handDetected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                {handDetected ? '✋ Main détectée' : '👀 Aucune main'}
                            </div>
                        )}

                        {/* Current page indicator */}
                        {isActive && (
                            <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
                                📍 {currentPage}
                            </div>
                        )}

                        {/* TTS status */}
                        {isActive && (
                            <div className={`absolute top-12 left-4 px-2 py-1 rounded text-xs ${ttsEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {ttsEnabled ? '🔊 Voix ON' : '🔇 Voix OFF'}
                            </div>
                        )}

                        {isActive && currentGesture !== 'none' && (
                            <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-3xl">{gestures.find(g => g.detected)?.emoji}</span>
                                    <span className="text-xl font-bold text-primary">
                                        {gestures.find(g => g.detected)?.action}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={isActive ? stopCamera : startCamera}
                        disabled={loading}
                        className={[
                            "w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3",
                            "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring",
                            "min-h-target",
                            loading ? "opacity-50 cursor-wait" : "",
                            isActive
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        ].join(" ")}
                    >
                        <span className="text-xl">📷</span>
                        {loading ? 'Chargement...' : isActive ? 'Arrêter la Caméra' : 'Démarrer la Caméra'}
                    </button>

                    {error && (
                        <div className="mt-3 bg-destructive/10 border-2 border-destructive text-destructive p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}
                </div>

                {/* Right side - Gestures */}
                <div className="p-6">
                    <h3 className="text-xl font-bold text-primary mb-4">Navigation par Gestes</h3>

                    <div className="space-y-3">
                        {gestures.map((gesture) => (
                            <div
                                key={gesture.id}
                                className={`relative p-4 rounded-xl transition-all overflow-hidden ${gesture.detected ? 'bg-primary/20 border-2 border-primary' : 'bg-muted border-2 border-transparent'
                                    }`}
                            >
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">{gesture.emoji}</span>
                                        <div>
                                            <div className="font-semibold text-foreground">{gesture.name}</div>
                                            <div className="text-sm text-muted-foreground">{gesture.action}</div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gesture.detected
                                        ? 'bg-primary border-primary'
                                        : 'border-muted-foreground'
                                        }`}>
                                        {gesture.detected && <span className="text-white text-xs">✓</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        <p>💡 Tous les gestes sont immédiats - pas besoin de maintenir!</p>
                        <p className="mt-1">🔄 Navigation: Accueil → Banque → Shopping → Traduction → Accessibilité</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
