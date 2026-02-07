'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSpeech } from '@/hooks/use-speech';

interface Landmark {
    x: number;
    y: number;
    z: number;
}

// Landmark indices
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

// Pure helper functions
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

const detectGesture = (landmarks: Landmark[]): string => {
    if (!landmarks || landmarks.length < 21) return 'none';

    const fingers = getFingerStates(landmarks);
    const extendedCount = Object.values(fingers).filter(v => v).length;
    const indexTip = landmarks[INDEX_TIP];
    const indexMcp = landmarks[INDEX_MCP];

    if (extendedCount >= 4 && fingers.index && fingers.middle && fingers.ring) {
        return 'open_hand';
    }

    if (!fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        const thumbTip = landmarks[THUMB_TIP];
        const thumbMcp = landmarks[THUMB_MCP];
        const thumbIsUp = thumbTip.y < indexMcp.y;
        const thumbIsExtended = Math.abs(thumbTip.y - thumbMcp.y) > 0.05 ||
            Math.abs(thumbTip.x - thumbMcp.x) > 0.05;

        if (thumbIsUp && thumbIsExtended) return 'thumbs_up';
        return 'closed_fist';
    }

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

const drawHand = (ctx: CanvasRenderingContext2D, landmarks: Landmark[], w: number, h: number) => {
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

    ctx.fillStyle = '#00ff88';
    landmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x * w, point.y * h, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
};

declare global {
    interface Window {
        Hands: any;
        Camera: any;
    }
}

// Pages for navigation
const PAGES = ['/', '/banking', '/shopping', '/translate', '/accessibility'];
const PAGE_NAMES: Record<string, string> = {
    '/': 'Accueil',
    '/banking': 'Banque',
    '/shopping': 'Shopping',
    '/translate': 'Traduction',
    '/accessibility': 'Accessibilité'
};

const gestureInfo: Record<string, { emoji: string; action: string }> = {
    'point_right': { emoji: '👉', action: 'Suivant' },
    'point_left': { emoji: '👈', action: 'Précédent' },
    'open_hand': { emoji: '🖐️', action: 'Voix ON' },
    'closed_fist': { emoji: '✊', action: 'Voix OFF' },
    'thumbs_up': { emoji: '👍', action: 'OK' },
    'none': { emoji: '👀', action: 'Attente' }
};

export function FloatingGestureCamera() {
    const navigate = useNavigate();
    const location = useLocation();
    const { speak, stop: stopTTS } = useSpeech();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string>('none');
    const [handDetected, setHandDetected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const gestureHistoryRef = useRef<string[]>([]);
    const lastGestureRef = useRef<string>('none');
    const lastActionTimeRef = useRef<number>(0);

    // Navigate pages
    const navigatePage = useCallback((direction: 'next' | 'prev') => {
        const currentIndex = PAGES.indexOf(location.pathname);
        let newIndex = currentIndex === -1 ? 0 : direction === 'next'
            ? (currentIndex + 1) % PAGES.length
            : (currentIndex - 1 + PAGES.length) % PAGES.length;

        if (ttsEnabled) speak(PAGE_NAMES[PAGES[newIndex]] || 'Page');
        navigate(PAGES[newIndex]);
    }, [location.pathname, navigate, speak, ttsEnabled]);

    // Handle gesture action
    const handleAction = useCallback((gesture: string) => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 1200) return;
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
                const u = new SpeechSynthesisUtterance('Voix OFF');
                u.lang = 'fr-FR';
                window.speechSynthesis.speak(u);
                break;
            case 'open_hand':
                setTtsEnabled(true);
                speak('Voix ON');
                break;
            case 'thumbs_up':
                if (ttsEnabled) speak('OK');
                break;
        }
    }, [navigatePage, speak, stopTTS, ttsEnabled]);

    // Process gesture with stabilization
    const processGesture = useCallback((detected: string) => {
        gestureHistoryRef.current.push(detected);
        if (gestureHistoryRef.current.length > 5) gestureHistoryRef.current.shift();

        const isStable = gestureHistoryRef.current.length >= 5 &&
            gestureHistoryRef.current.every(g => g === detected);

        if (isStable && detected !== 'none') {
            if (detected !== lastGestureRef.current) {
                setCurrentGesture(detected);
                lastGestureRef.current = detected;
                handleAction(detected);
            }
        } else if (detected === 'none' && gestureHistoryRef.current.every(g => g === 'none')) {
            setCurrentGesture('none');
            lastGestureRef.current = 'none';
        }
    }, [handleAction]);

    // MediaPipe callback
    const onResults = useCallback((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks?.length > 0) {
            setHandDetected(true);
            const landmarks = results.multiHandLandmarks[0];
            drawHand(ctx, landmarks, canvas.width, canvas.height);
            processGesture(detectGesture(landmarks));
        } else {
            setHandDetected(false);
            processGesture('none');
        }
    }, [processGesture]);

    const loadMediaPipe = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (window.Hands && window.Camera) { resolve(); return; }

            const scripts = [
                'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
            ];

            let loaded = 0;
            scripts.forEach(src => {
                const s = document.createElement('script');
                s.src = src;
                s.crossOrigin = 'anonymous';
                s.onload = () => { if (++loaded === 2) resolve(); };
                s.onerror = reject;
                document.head.appendChild(s);
            });
        });
    };

    const startCamera = useCallback(async () => {
        try {
            setLoading(true);
            await loadMediaPipe();

            if (!window.Hands) { setLoading(false); return; }

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
                    modelComplexity: 0,
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
                if (ttsEnabled) speak('Navigation gestes activée');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [onResults, speak, ttsEnabled]);

    const stopCamera = useCallback(() => {
        cameraRef.current?.stop();
        cameraRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsActive(false);
        setCurrentGesture('none');
        setHandDetected(false);
        gestureHistoryRef.current = [];
        if (ttsEnabled) speak('Navigation désactivée');
    }, [speak, ttsEnabled]);

    useEffect(() => {
        return () => { if (isActive) stopCamera(); };
    }, [isActive, stopCamera]);

    const currentPage = PAGE_NAMES[location.pathname] || location.pathname;

    return (
        <div className="fixed bottom-24 left-4 z-50">
            {/* Toggle button */}
            {!isActive && (
                <button
                    onClick={startCamera}
                    disabled={loading}
                    className={[
                        "w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl",
                        "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
                        "hover:scale-110 transition-transform",
                        loading ? "opacity-50 animate-pulse" : ""
                    ].join(" ")}
                    title="Navigation par gestes"
                >
                    {loading ? '⏳' : '🖐️'}
                </button>
            )}

            {/* Camera panel */}
            {isActive && (
                <div className={`bg-card rounded-xl border-2 border-border shadow-2xl overflow-hidden transition-all ${isMinimized ? 'w-16' : 'w-72'}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <div className="flex items-center gap-1.5">
                            <span className="text-lg">{gestureInfo[currentGesture]?.emoji}</span>
                            {!isMinimized && (
                                <span className="text-xs font-medium">{currentPage}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {!isMinimized && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${ttsEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {ttsEnabled ? '🔊' : '🔇'}
                                </span>
                            )}
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center text-sm"
                            >
                                {isMinimized ? '↗️' : '↙️'}
                            </button>
                            <button
                                onClick={stopCamera}
                                className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Camera feed */}
                    {!isMinimized && (
                        <>
                            <div className="relative aspect-video bg-black">
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

                                {/* Status */}
                                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${handDetected ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}`}>
                                    {handDetected ? '✋' : '👀'}
                                </div>

                                {/* Current gesture */}
                                {currentGesture !== 'none' && (
                                    <div className="absolute bottom-1 left-1 right-1 bg-black/70 rounded px-2 py-1 flex items-center justify-center gap-2">
                                        <span className="text-xl">{gestureInfo[currentGesture]?.emoji}</span>
                                        <span className="text-white text-sm font-bold">{gestureInfo[currentGesture]?.action}</span>
                                    </div>
                                )}
                            </div>

                            {/* Quick guide */}
                            <div className="grid grid-cols-2 gap-0.5 p-1.5 text-[10px] text-muted-foreground bg-muted/50">
                                <span>👈 Préc</span>
                                <span className="text-right">👉 Suiv</span>
                                <span>✊ OFF</span>
                                <span className="text-right">🖐️ ON</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
