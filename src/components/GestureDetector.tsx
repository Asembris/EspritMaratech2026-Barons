'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSpeech } from '@/hooks/use-speech';

interface GestureInfo {
    id: string;
    emoji: string;
    name: string;
    action: string;
    holdTime?: number;
    detected: boolean;
    progress: number;
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
const WRIST = 0;
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

// Move helper functions OUTSIDE component to avoid stale closures
const isFingerExtended = (landmarks: Landmark[], tipIdx: number, pipIdx: number): boolean => {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    return tip.y < pip.y;
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

// Gesture detection function - pure function, no React dependencies
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

    // Thumbs Up or Closed Fist: no fingers extended except maybe thumb
    if (!fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        const thumbTip = landmarks[THUMB_TIP];
        const thumbMcp = landmarks[THUMB_MCP];
        const thumbIsUp = thumbTip.y < indexMcp.y;
        const thumbIsExtended = Math.abs(thumbTip.y - thumbMcp.y) > 0.05 ||
            Math.abs(thumbTip.x - thumbMcp.x) > 0.05;

        if (thumbIsUp && thumbIsExtended) {
            return 'thumbs_up';
        }
        return 'closed_fist';
    }

    // Pointing: only index extended
    if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        const dx = indexTip.x - indexMcp.x;
        const dy = Math.abs(indexTip.y - indexMcp.y);
        const isHorizontal = Math.abs(dx) > dy;

        if (isHorizontal) {
            // Note: Video is mirrored, so directions are swapped
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

const gesturesConfig = [
    { id: 'open_hand', emoji: '🖐️', name: 'Main Ouverte', action: 'Assistant', spokenAction: 'Assistant', holdTime: 2 },
    { id: 'closed_fist', emoji: '✊', name: 'Poing Fermé', action: 'Annuler', spokenAction: 'Annuler', holdTime: 2 },
    { id: 'point_right', emoji: '👉', name: 'Pointer Droite', action: 'Suivant', spokenAction: 'Suivant', holdTime: 0 },
    { id: 'point_left', emoji: '👈', name: 'Pointer Gauche', action: 'Précédent', spokenAction: 'Précédent', holdTime: 0 },
    { id: 'thumbs_up', emoji: '👍', name: 'Pouce Levé', action: 'Confirmer', spokenAction: 'Confirmer', holdTime: 0 },
];

export function GestureDetector({ onGestureDetected }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string>('none');
    const { speak } = useSpeech();
    const [gestureProgress, setGestureProgress] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);
    const [handDetected, setHandDetected] = useState(false);
    const [loading, setLoading] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const gestureHistoryRef = useRef<string[]>([]);
    const lastConfirmedGestureRef = useRef<string>('none');
    const lastGestureTimeRef = useRef<number>(0);

    const gestures: GestureInfo[] = gesturesConfig.map(g => ({
        ...g,
        detected: currentGesture === g.id,
        progress: gestureProgress[g.id] || 0,
    }));

    const clearHoldTimer = useCallback(() => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setGestureProgress({});
    }, []);

    const startHoldTimer = useCallback((gestureId: string, holdTime: number) => {
        clearHoldTimer();
        const holdMs = holdTime * 1000;
        const startTime = Date.now();

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / holdMs) * 100, 100);
            setGestureProgress({ [gestureId]: progress });
        }, 50);

        holdTimerRef.current = setTimeout(() => {
            clearInterval(progressIntervalRef.current!);
            const config = gesturesConfig.find(g => g.id === gestureId);
            if (config) {
                onGestureDetected?.(config.name, config.action);
            }
            setGestureProgress({ [gestureId]: 100 });
        }, holdMs);
    }, [clearHoldTimer, onGestureDetected]);

    // Process gesture with history and debouncing
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
                lastGestureTimeRef.current = now;

                const gestureConfig = gesturesConfig.find(g => g.id === detected);
                if (gestureConfig) {
                    // Speak the action name immediately
                    speak(gestureConfig.spokenAction);

                    // Handle hold gestures
                    if (gestureConfig.holdTime && gestureConfig.holdTime > 0) {
                        startHoldTimer(detected, gestureConfig.holdTime);
                        onGestureDetected?.(gestureConfig.name, gestureConfig.action);
                    } else {
                        // Immediate action
                        onGestureDetected?.(gestureConfig.name, gestureConfig.action);
                    }
                }
            }
        } else if (detected === 'none' && gestureHistoryRef.current.every(g => g === 'none')) {
            setCurrentGesture('none');
            clearHoldTimer();
            if (lastConfirmedGestureRef.current !== 'none') {
                lastConfirmedGestureRef.current = 'none';
            }
        }
    }, [speak, onGestureDetected, startHoldTimer, clearHoldTimer]);

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

            // Draw hand landmarks
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

            // Load hands.js
            const handsScript = document.createElement('script');
            handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
            handsScript.crossOrigin = 'anonymous';

            // Load camera_utils.js
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

            // Load MediaPipe scripts
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

                // Initialize MediaPipe Hands
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

                // Start camera loop
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
        clearHoldTimer();
        speak('Caméra désactivée');
    }, [speak, clearHoldTimer]);

    useEffect(() => {
        return () => {
            if (isActive) {
                stopCamera();
            }
        };
    }, [isActive, stopCamera]);

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

                        {isActive && currentGesture !== 'none' && (
                            <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-muted-foreground">Geste:</span>
                                    <span className="text-xl font-bold text-primary">
                                        {gestures.find(g => g.detected)?.emoji} {gestures.find(g => g.detected)?.name}
                                    </span>
                                </div>
                                {gestures.find(g => g.detected && g.holdTime && g.holdTime > 0) && (
                                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-full transition-all duration-100"
                                            style={{ width: `${gestureProgress[currentGesture] || 0}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hand tracking status for screen readers */}
                        <div role="status" aria-live="polite" className="sr-only">
                            {isActive ? (handDetected ? 'Main détectée' : 'Aucune main détectée') : ''}
                        </div>
                    </div>

                    <button
                        onClick={isActive ? stopCamera : startCamera}
                        disabled={loading}
                        aria-label={isActive ? 'Arrêter la caméra de détection de gestes' : 'Démarrer la caméra de détection de gestes'}
                        aria-pressed={isActive}
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
                        <span className="text-xl" aria-hidden="true">📷</span>
                        {loading ? 'Chargement...' : isActive ? 'Arrêter la Caméra' : 'Démarrer la Caméra'}
                    </button>

                    {error && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mt-3 bg-destructive/10 border-2 border-destructive text-destructive p-3 rounded-lg text-center"
                        >
                            <span className="sr-only">Erreur: </span>
                            {error}
                        </div>
                    )}
                </div>

                {/* Right side - Gestures */}
                <div className="p-6">
                    <h3 className="text-xl font-bold text-primary mb-4">Gestes Disponibles</h3>

                    <div className="space-y-3">
                        {gestures.map((gesture) => (
                            <div
                                key={gesture.id}
                                className={`relative p-4 rounded-xl transition-all overflow-hidden ${gesture.detected ? 'bg-primary/20 border-2 border-primary' : 'bg-muted border-2 border-transparent'
                                    }`}
                            >
                                {gesture.holdTime && gesture.holdTime > 0 && gesture.detected && (
                                    <div
                                        className="absolute inset-0 bg-primary/20 transition-all"
                                        style={{ width: `${gesture.progress}%` }}
                                    />
                                )}

                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">{gesture.emoji}</span>
                                        <div>
                                            <div className="font-semibold text-foreground flex items-center gap-2">
                                                {gesture.name}
                                                {gesture.holdTime && gesture.holdTime > 0 && (
                                                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                                                        ⏱️ {gesture.holdTime}s
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{gesture.action}</div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gesture.detected
                                        ? gesture.progress >= 100 ? 'bg-green-500 border-green-500' : 'bg-primary border-primary'
                                        : 'border-muted-foreground'
                                        }`}>
                                        {gesture.detected && gesture.progress >= 100 && <span className="text-white text-xs">✓</span>}
                                        {gesture.detected && gesture.progress < 100 && gesture.holdTime && (
                                            <span className="text-white text-xs animate-pulse">●</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        <p>💡 Gestes avec <span className="text-accent-foreground">⏱️</span> = maintenir la position</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
