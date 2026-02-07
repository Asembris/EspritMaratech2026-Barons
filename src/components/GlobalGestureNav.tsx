'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSpeech } from '@/hooks/use-speech';

interface Landmark {
    x: number;
    y: number;
    z: number;
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

declare global {
    interface Window {
        Hands: any;
        Camera: any;
    }
}

// Page order for navigation
const PAGES = ['/', '/banking', '/shopping', '/translate', '/accessibility'];

export function GlobalGestureNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { speak, stop: stopTTS } = useSpeech();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [currentGesture, setCurrentGesture] = useState<string>('none');
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [handDetected, setHandDetected] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const gestureHistoryRef = useRef<string[]>([]);
    const lastGestureRef = useRef<string>('none');
    const lastGestureTimeRef = useRef<number>(0);

    // Navigate to next/previous page
    const navigatePage = useCallback((direction: 'next' | 'prev') => {
        const currentIndex = PAGES.indexOf(location.pathname);
        if (currentIndex === -1) return;

        let newIndex: number;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % PAGES.length;
        } else {
            newIndex = (currentIndex - 1 + PAGES.length) % PAGES.length;
        }

        const pageName = PAGES[newIndex].replace('/', '') || 'Accueil';
        if (ttsEnabled) speak(`Navigation vers ${pageName}`);
        navigate(PAGES[newIndex]);
    }, [location.pathname, navigate, speak, ttsEnabled]);

    // Handle gesture actions
    const handleGestureAction = useCallback((gesture: string) => {
        const now = Date.now();
        if (gesture === lastGestureRef.current && now - lastGestureTimeRef.current < 1500) {
            return; // Debounce same gesture
        }
        lastGestureRef.current = gesture;
        lastGestureTimeRef.current = now;

        switch (gesture) {
            case 'point_right':
                navigatePage('next');
                break;
            case 'point_left':
                navigatePage('prev');
                break;
            case 'closed_fist':
                stopTTS();
                setTtsEnabled(false);
                // Still speak this one so user knows
                window.speechSynthesis.cancel();
                const offUtterance = new SpeechSynthesisUtterance('Synthèse vocale désactivée');
                offUtterance.lang = 'fr-FR';
                window.speechSynthesis.speak(offUtterance);
                break;
            case 'open_hand':
                setTtsEnabled(true);
                speak('Synthèse vocale activée');
                break;
            case 'thumbs_up':
                if (ttsEnabled) speak('Confirmé');
                break;
        }
    }, [navigatePage, speak, stopTTS, ttsEnabled]);

    // Process gesture with stabilization
    const processGesture = useCallback((detected: string) => {
        gestureHistoryRef.current.push(detected);
        if (gestureHistoryRef.current.length > 5) {
            gestureHistoryRef.current.shift();
        }

        const isStable = gestureHistoryRef.current.length >= 5 &&
            gestureHistoryRef.current.every(g => g === detected);

        if (isStable && detected !== 'none') {
            setCurrentGesture(detected);
            handleGestureAction(detected);
        } else if (detected === 'none' && gestureHistoryRef.current.every(g => g === 'none')) {
            setCurrentGesture('none');
        }
    }, [handleGestureAction]);

    // MediaPipe results callback
    const onResults = useCallback((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true);
            const landmarks = results.multiHandLandmarks[0];

            // Draw landmarks
            ctx.fillStyle = '#00ff88';
            landmarks.forEach((point: Landmark) => {
                ctx.beginPath();
                ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
                ctx.fill();
            });

            const detected = detectGestureFromLandmarks(landmarks);
            processGesture(detected);
        } else {
            setHandDetected(false);
            processGesture('none');
        }
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
            setLoading(true);
            await loadMediaPipe();

            if (!window.Hands) {
                setLoading(false);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 320, height: 240 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;

                handsRef.current = new window.Hands({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                });

                handsRef.current.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 0, // Faster
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
                        width: 320,
                        height: 240
                    });
                    cameraRef.current.start();
                }

                setIsActive(true);
                setIsMinimized(false);
                if (ttsEnabled) speak('Navigation par gestes activée');
            }
        } catch (err) {
            console.error('Camera error:', err);
        } finally {
            setLoading(false);
        }
    }, [onResults, speak, ttsEnabled]);

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
        if (ttsEnabled) speak('Navigation par gestes désactivée');
    }, [speak, ttsEnabled]);

    useEffect(() => {
        return () => {
            if (isActive) stopCamera();
        };
    }, [isActive, stopCamera]);

    const gestureEmoji: Record<string, string> = {
        'point_right': '👉',
        'point_left': '👈',
        'open_hand': '🖐️',
        'closed_fist': '✊',
        'thumbs_up': '👍',
        'none': '👀'
    };

    return (
        <div className="fixed bottom-24 left-4 z-50">
            {/* Floating toggle button */}
            {!isActive && (
                <button
                    onClick={startCamera}
                    disabled={loading}
                    className={[
                        "w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl",
                        "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
                        "hover:scale-110 transition-transform",
                        "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring",
                        loading ? "opacity-50 animate-pulse" : ""
                    ].join(" ")}
                    aria-label="Activer navigation par gestes"
                    title="Navigation par gestes"
                >
                    {loading ? '⏳' : '🖐️'}
                </button>
            )}

            {/* Camera panel */}
            {isActive && (
                <div className={[
                    "bg-card rounded-xl border-2 border-border shadow-2xl overflow-hidden transition-all",
                    isMinimized ? "w-20 h-20" : "w-72"
                ].join(" ")}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{gestureEmoji[currentGesture]}</span>
                            {!isMinimized && (
                                <span className="text-sm font-semibold">
                                    {ttsEnabled ? '🔊' : '🔇'} Gestes
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center"
                                aria-label={isMinimized ? "Agrandir" : "Réduire"}
                            >
                                {isMinimized ? '⬆️' : '⬇️'}
                            </button>
                            <button
                                onClick={stopCamera}
                                className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center"
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Camera feed */}
                    {!isMinimized && (
                        <div className="relative">
                            <div className="aspect-video bg-muted">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                                <canvas
                                    ref={canvasRef}
                                    width={320}
                                    height={240}
                                    className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
                                />
                            </div>

                            {/* Status bar */}
                            <div className="p-2 bg-muted/50 text-xs flex items-center justify-between">
                                <span className={handDetected ? 'text-green-500' : 'text-muted-foreground'}>
                                    {handDetected ? '✋ Main' : '👀 Aucune'}
                                </span>
                                <span className="text-muted-foreground">
                                    {location.pathname === '/' ? 'Accueil' : location.pathname.slice(1)}
                                </span>
                            </div>

                            {/* Gesture guide */}
                            <div className="p-2 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span>👈 Précédent</span>
                                    <span>👉 Suivant</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>✊ Muter</span>
                                    <span>🖐️ Son</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
