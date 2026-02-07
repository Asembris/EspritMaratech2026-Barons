'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';

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

// Landmark indices
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

export default function GestureDetector({ onGestureDetected }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string>('none');

    // Use global audio context & hover speech
    const { speak, audioEnabled, toggleAudio } = useAudio();
    const { onHover } = useHoverSpeech();

    const [gestureProgress, setGestureProgress] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);
    const [handDetected, setHandDetected] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const gestureHistoryRef = useRef<string[]>([]);
    const lastGestureTimeRef = useRef<number>(0);
    const lastConfirmedGestureRef = useRef<string>('none');

    const gesturesConfig = [
        { id: 'open_hand', emoji: '🖐️', name: 'Main Ouverte', action: 'Assistant (2s → Caméra On/Off)', spokenAction: 'Assistant', holdTime: 2 },
        { id: 'closed_fist', emoji: '✊', name: 'Poing Fermé', action: 'Annuler (2s → Audio On/Off)', spokenAction: 'Annuler', holdTime: 2 },
        { id: 'point_right', emoji: '👉', name: 'Pointer Droite', action: 'Suivant', spokenAction: 'Suivant', holdTime: 0 },
        { id: 'point_left', emoji: '👈', name: 'Pointer Gauche', action: 'Précédent', spokenAction: 'Précédent', holdTime: 0 },
        { id: 'thumbs_up', emoji: '👍', name: 'Pouce Levé', action: 'Confirmer', spokenAction: 'Confirmer', holdTime: 0 },
    ];

    const gestures: GestureInfo[] = gesturesConfig.map(g => ({
        ...g,
        detected: currentGesture === g.id,
        progress: gestureProgress[g.id] || 0,
    }));



    // Finger detection helpers
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

    // Gesture detection
    const detectGesture = useCallback((landmarks: Landmark[]): string => {
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
                if (dx > 0.05) return 'point_left';
                if (dx < -0.05) return 'point_right';
            }
        }

        return 'none';
    }, []);

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
                    // ALWAYS speak the action name immediately when gesture is detected
                    speak(gestureConfig.spokenAction);

                    // Handle hold gestures - start timer for action execution
                    if (gestureConfig.holdTime && gestureConfig.holdTime > 0) {
                        startHoldTimer(detected, gestureConfig.holdTime, gestureConfig.spokenAction);
                        // Immediate action - speak the action name
                        // speakMessage(gestureConfig.spokenAction); // Removed, speak is called above
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
    }, [speak, onGestureDetected]);

    const startHoldTimer = (gestureId: string, holdTime: number, action: string) => {
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

            // Action executed after hold time - no need to speak again
            onGestureDetected?.(gesturesConfig.find(g => g.id === gestureId)?.name || '', gesturesConfig.find(g => g.id === gestureId)?.action || '');
            setGestureProgress({ [gestureId]: 100 });

            // Execute the actual action
            if (gestureId === 'closed_fist') {
                toggleAudio(); // Use global toggleAudio
            }
        }, holdMs);
    };

    const clearHoldTimer = () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setGestureProgress({});
    };

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

            const detected = detectGesture(landmarks);
            processGesture(detected);
        } else {
            setHandDetected(false);
            processGesture('none');
        }

        ctx.restore();
    }, [detectGesture, processGesture]);

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

    const startCamera = useCallback(async () => {
        try {
            setError(null);

            // Check if MediaPipe is loaded
            if (typeof window === 'undefined' || !(window as any).Hands) {
                setError('MediaPipe non chargé. Utilisez la version HTML ou installez @mediapipe/hands');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;

                // Initialize MediaPipe Hands
                const Hands = (window as any).Hands;
                handsRef.current = new Hands({
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
                const Camera = (window as any).Camera;
                if (Camera) {
                    cameraRef.current = new Camera(videoRef.current, {
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
                speak('Caméra activée'); // Use speak directly
            }
        } catch (err) {
            setError('Impossible d\'accéder à la caméra');
            console.error(err);
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
        speak('Caméra désactivée'); // Use speak directly
    }, [speak]); // Changed dependency from speakMessage to speak

    useEffect(() => {
        return () => {
            if (isActive) {
                stopCamera();
            }
        };
    }, [isActive, stopCamera]); // Removed speakMessage dependency to avoid loops



    return (
        <div className="bg-gray-900 rounded-xl border border-purple-500/30 overflow-hidden">
            {/* MediaPipe script loader notice */}
            {!isActive && (
                <div className="p-3 bg-yellow-900/30 border-b border-yellow-500/30 text-yellow-300 text-sm text-center">
                    ⚠️ Nécessite MediaPipe. Ajoutez les scripts dans votre page ou utilisez la version HTML.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Left side - Camera */}
                <div className="p-6 border-r border-gray-700">
                    <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-600 mb-4">
                        {!isActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-gray-900/90 px-6 py-4 rounded-full border border-purple-500/50 flex items-center gap-3">
                                    <span className="text-3xl">👋</span>
                                    <span className="text-gray-300">En attente...</span>
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
                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold ${handDetected ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                                }`}>
                                {handDetected ? '✋ Main détectée' : '👀 Aucune main'}
                            </div>
                        )}

                        {isActive && currentGesture !== 'none' && (
                            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400">Geste:</span>
                                    <span className="text-xl font-bold text-purple-400">
                                        {gestures.find(g => g.detected)?.emoji} {gestures.find(g => g.detected)?.name}
                                    </span>
                                </div>
                                {gestures.find(g => g.detected && g.holdTime && g.holdTime > 0) && (
                                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-100"
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
                        onMouseEnter={() => onHover(isActive ? 'Arrêter la caméra' : 'Démarrer la caméra')}
                        aria-label={isActive ? 'Arrêter la caméra de détection de gestes' : 'Démarrer la caméra de détection de gestes'}
                        aria-pressed={isActive}
                        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${isActive
                            ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-400'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus:ring-purple-400'
                            }`}
                    >
                        <span className="text-xl" aria-hidden="true">📷</span>
                        {isActive ? 'Arrêter la Caméra' : 'Démarrer la Caméra'}
                    </button>

                    <button
                        onClick={toggleAudio}
                        onMouseEnter={() => onHover(audioEnabled ? 'Désactiver le son' : 'Activer le son')}
                        aria-label={audioEnabled ? 'Désactiver la synthèse vocale' : 'Activer la synthèse vocale'}
                        aria-pressed={audioEnabled}
                        className={`w-full mt-3 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${audioEnabled ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 focus:ring-gray-400'
                            }`}
                    >
                        <span aria-hidden="true">{audioEnabled ? '🔊' : '🔇'}</span>
                        Audio: {audioEnabled ? 'Activé' : 'Désactivé'}
                    </button>

                    {error && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mt-3 bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-center"
                        >
                            <span className="sr-only">Erreur: </span>
                            {error}
                        </div>
                    )}
                </div>

                {/* Right side - Gestures */}
                <div className="p-6">
                    <h3 className="text-xl font-bold text-purple-400 mb-4">Gestes Disponibles</h3>

                    <div className="space-y-3">
                        {gestures.map((gesture) => (
                            <div
                                key={gesture.id}
                                className={`relative p-4 rounded-xl transition-all overflow-hidden ${gesture.detected ? 'bg-purple-600/30 border-2 border-purple-500' : 'bg-gray-800 border-2 border-transparent'
                                    }`}
                            >
                                {gesture.holdTime && gesture.holdTime > 0 && gesture.detected && (
                                    <div
                                        className="absolute inset-0 bg-gradient-to-r from-purple-600/40 to-pink-600/40 transition-all"
                                        style={{ width: `${gesture.progress}%` }}
                                    />
                                )}

                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">{gesture.emoji}</span>
                                        <div>
                                            <div className="font-semibold text-white flex items-center gap-2">
                                                {gesture.name}
                                                {gesture.holdTime && gesture.holdTime > 0 && (
                                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                                                        ⏱️ {gesture.holdTime}s
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-400">{gesture.action}</div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gesture.detected
                                        ? gesture.progress >= 100 ? 'bg-green-500 border-green-500' : 'bg-purple-500 border-purple-500'
                                        : 'border-gray-500'
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

                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-sm text-gray-400">
                        <p>💡 Gestes avec <span className="text-yellow-400">⏱️</span> = maintenir la position</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
