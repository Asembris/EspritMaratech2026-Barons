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

const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Landmark[], w: number, h: number) => {
    ctx.fillStyle = '#00ff88';
    landmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x * w, point.y * h, 4, 0, 2 * Math.PI);
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

// Page order for navigation
const PAGES = ['/', '/banking', '/shopping', '/translate', '/accessibility'];
const PAGE_NAMES: Record<string, string> = {
    '/': 'Accueil',
    '/banking': 'Banque',
    '/shopping': 'Shopping',
    '/translate': 'Traduction',
    '/accessibility': 'Accessibilité'
};

export function GlobalGestureNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { speak, stop: stopTTS } = useSpeech();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string>('none');
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [handDetected, setHandDetected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const gestureHistoryRef = useRef<string[]>([]);
    const lastActionTimeRef = useRef<number>(0);

    // Debug: verify component mounts
    useEffect(() => {
        console.log('[GlobalGestureNav] Component mounted');
        return () => console.log('[GlobalGestureNav] Component unmounted');
    }, []);

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
        if (ttsEnabled) speak(`${pageName}`);
        navigate(PAGES[newIndex]);
    }, [location.pathname, navigate, speak, ttsEnabled]);

    // Handle gesture actions - NO TIMERS, immediate action
    const handleGestureAction = useCallback((gesture: string) => {
        const now = Date.now();
        // Debounce: 1.5 seconds between actions
        if (now - lastActionTimeRef.current < 1500) {
            return;
        }
        lastActionTimeRef.current = now;

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
                // Still announce this
                const offUtterance = new SpeechSynthesisUtterance('Voix désactivée');
                offUtterance.lang = 'fr-FR';
                window.speechSynthesis.speak(offUtterance);
                break;
            case 'open_hand':
                setTtsEnabled(true);
                speak('Voix activée');
                break;
            case 'thumbs_up':
                if (ttsEnabled) speak('OK');
                break;
        }
    }, [navigatePage, speak, stopTTS, ttsEnabled]);

    // Process gesture with stabilization (same as GestureDetector)
    const processGesture = useCallback((detected: string) => {
        const historySize = 5;

        gestureHistoryRef.current.push(detected);
        if (gestureHistoryRef.current.length > historySize) {
            gestureHistoryRef.current.shift();
        }

        const isStable = gestureHistoryRef.current.length >= historySize &&
            gestureHistoryRef.current.every(g => g === detected);

        if (isStable && detected !== 'none') {
            if (currentGesture !== detected) {
                setCurrentGesture(detected);
                handleGestureAction(detected);
            }
        } else if (detected === 'none' && gestureHistoryRef.current.every(g => g === 'none')) {
            setCurrentGesture('none');
        }
    }, [currentGesture, handleGestureAction]);

    // MediaPipe results callback
    const onResults = useCallback((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true);
            const landmarks = results.multiHandLandmarks[0];

            // Draw hand
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
        console.log('[GlobalGestureNav] startCamera called');
        try {
            setLoading(true);
            console.log('[GlobalGestureNav] Loading MediaPipe...');
            await loadMediaPipe();
            console.log('[GlobalGestureNav] MediaPipe loaded, Hands:', !!window.Hands, 'Camera:', !!window.Camera);

            if (!window.Hands) {
                console.error('[GlobalGestureNav] window.Hands not available');
                setLoading(false);
                return;
            }

            console.log('[GlobalGestureNav] Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            console.log('[GlobalGestureNav] Camera stream obtained:', stream.id);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                console.log('[GlobalGestureNav] Video srcObject set');

                handsRef.current = new window.Hands({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                });
                console.log('[GlobalGestureNav] Hands instance created');

                handsRef.current.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                });

                handsRef.current.onResults(onResults);
                console.log('[GlobalGestureNav] onResults callback set');

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
                    console.log('[GlobalGestureNav] Camera started');
                } else {
                    console.error('[GlobalGestureNav] window.Camera not available');
                }

                setIsActive(true);
                console.log('[GlobalGestureNav] isActive set to true');
                if (ttsEnabled) speak('Navigation par gestes activée');
            } else {
                console.error('[GlobalGestureNav] videoRef.current is null');
            }
        } catch (err) {
            console.error('[GlobalGestureNav] Camera error:', err);
            setError(err instanceof Error ? err.message : 'Erreur caméra');
        } finally {
            setLoading(false);
            console.log('[GlobalGestureNav] Loading complete');
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
        gestureHistoryRef.current = [];
        if (ttsEnabled) speak('Navigation désactivée');
    }, [speak, ttsEnabled]);

    useEffect(() => {
        return () => {
            if (isActive) stopCamera();
        };
    }, [isActive, stopCamera]);

    const gestureInfo: Record<string, { emoji: string; name: string }> = {
        'point_right': { emoji: '👉', name: 'Suivant' },
        'point_left': { emoji: '👈', name: 'Précédent' },
        'open_hand': { emoji: '🖐️', name: 'Voix ON' },
        'closed_fist': { emoji: '✊', name: 'Voix OFF' },
        'thumbs_up': { emoji: '👍', name: 'OK' },
        'none': { emoji: '👀', name: 'En attente' }
    };

    const currentPage = PAGE_NAMES[location.pathname] || location.pathname;

    return (
        <div className="fixed bottom-24 left-4 z-50">
            {/* Floating toggle button when camera is OFF */}
            {!isActive && (
                <div className="flex flex-col items-start gap-2">
                    <button
                        onClick={() => {
                            console.log('[GlobalGestureNav] Button clicked');
                            setError(null);
                            startCamera();
                        }}
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
                    {error && (
                        <div className="bg-destructive/90 text-destructive-foreground text-xs px-3 py-2 rounded-lg max-w-48">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            )}

            {/* Camera panel when active */}
            {isActive && (
                <div className="bg-card rounded-xl border-2 border-border shadow-2xl overflow-hidden w-80">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{gestureInfo[currentGesture].emoji}</span>
                            <span className="font-semibold text-sm">{gestureInfo[currentGesture].name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${ttsEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
                                {ttsEnabled ? '🔊' : '🔇'}
                            </span>
                            <button
                                onClick={stopCamera}
                                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-lg"
                                aria-label="Fermer la navigation par gestes"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Camera feed - same as GestureDetector */}
                    <div className="relative aspect-video bg-muted">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <canvas
                            ref={canvasRef}
                            width={640}
                            height={480}
                            className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
                        />

                        {/* Hand detection indicator */}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${handDetected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                            {handDetected ? '✋ Main' : '👀 Aucune'}
                        </div>

                        {/* Current gesture overlay */}
                        {currentGesture !== 'none' && (
                            <div className="absolute bottom-2 left-2 right-2 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-2xl">{gestureInfo[currentGesture].emoji}</span>
                                    <span className="font-bold text-primary">{gestureInfo[currentGesture].name}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer with current page and gesture guide */}
                    <div className="p-3 bg-muted/50 space-y-2">
                        <div className="text-center text-sm font-medium text-foreground">
                            📍 {currentPage}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                            <span>👈 Précédent</span>
                            <span className="text-right">👉 Suivant</span>
                            <span>✊ Muter</span>
                            <span className="text-right">🖐️ Son</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
