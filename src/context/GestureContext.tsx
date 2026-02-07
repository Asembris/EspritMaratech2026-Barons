'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSpeech } from '@/hooks/use-speech';

interface Landmark {
    x: number;
    y: number;
    z: number;
}

interface GestureContextType {
    isActive: boolean;
    isLoading: boolean;
    error: string | null;
    currentGesture: string;
    handDetected: boolean;
    landmarks: Landmark[] | null;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    ttsEnabled: boolean;
}

const GestureContext = createContext<GestureContextType | null>(null);

// Page navigation config
const PAGES = ['/', '/banking', '/shopping', '/translate', '/accessibility'];
const PAGE_NAMES: Record<string, string> = {
    '/': 'Accueil',
    '/banking': 'Banque',
    '/shopping': 'Shopping',
    '/translate': 'Traduction',
    '/accessibility': 'Accessibilité'
};

// Start MediaPipe/Helper Logic (Moved from component)
const THUMB_TIP = 4;
const THUMB_IP = 3;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;

const isFingerExtended = (landmarks: Landmark[], tipIdx: number, pipIdx: number) =>
    landmarks[tipIdx].y < landmarks[pipIdx].y;

const detectGestureFromLandmarks = (landmarks: Landmark[]): string => {
    if (!landmarks || landmarks.length < 21) return 'none';

    const thumbExtended = landmarks[THUMB_TIP].x < landmarks[PINKY_TIP].x
        ? landmarks[THUMB_TIP].x < landmarks[THUMB_IP].x
        : landmarks[THUMB_TIP].x > landmarks[THUMB_IP].x;

    const indexExtended = isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP);
    const middleExtended = isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
    const ringExtended = isFingerExtended(landmarks, RING_TIP, RING_PIP);
    const pinkyExtended = isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP);

    const match = (i: boolean, m: boolean, r: boolean, p: boolean) =>
        indexExtended === i && middleExtended === m && ringExtended === r && pinkyExtended === p;

    // Open Hand
    if (match(true, true, true, true)) return 'open_hand';

    // Pointing
    if (match(true, false, false, false)) {
        const dx = landmarks[INDEX_TIP].x - landmarks[INDEX_MCP].x;
        if (Math.abs(dx) > 0.05) return dx > 0 ? 'point_left' : 'point_right'; // Mirrored
    }

    // Fist/Thumb
    if (match(false, false, false, false)) {
        // Roughly check thumb up
        if (landmarks[THUMB_TIP].y < landmarks[INDEX_MCP].y) return 'thumbs_up';
        return 'closed_fist';
    }

    return 'none';
};

export const GestureProvider = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { speak, stop: stopTTS } = useSpeech();

    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentGesture, setCurrentGesture] = useState('none');
    const [handDetected, setHandDetected] = useState(false);
    const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
    const [ttsEnabled, setTtsEnabled] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null); // For off-screen processing if needed
    const streamRef = useRef<MediaStream | null>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);

    const lastActionTime = useRef(0);
    const gestureHistory = useRef<string[]>([]);

    // --- Navigation Logic ---
    const navigatePage = useCallback((direction: 'next' | 'prev') => {
        const currentIndex = PAGES.indexOf(location.pathname);
        let newIndex = currentIndex;

        if (currentIndex === -1) newIndex = 0;
        else if (direction === 'next') newIndex = (currentIndex + 1) % PAGES.length;
        else newIndex = (currentIndex - 1 + PAGES.length) % PAGES.length;

        const path = PAGES[newIndex];
        const name = PAGE_NAMES[path] || 'Page';

        if (ttsEnabled) speak(name);
        navigate(path);
    }, [location.pathname, navigate, speak, ttsEnabled]);

    const handleAction = useCallback((gesture: string) => {
        const now = Date.now();
        if (now - lastActionTime.current < 1000) return; // 1s Debounce

        lastActionTime.current = now;

        switch (gesture) {
            case 'point_right': navigatePage('next'); break;
            case 'point_left': navigatePage('prev'); break;
            case 'closed_fist':
                stopTTS();
                setTtsEnabled(false);
                window.speechSynthesis.speak(new SpeechSynthesisUtterance("Voix OFF"));
                break;
            case 'open_hand':
                setTtsEnabled(true);
                speak("Voix ON");
                break;
            case 'thumbs_up':
                if (ttsEnabled) speak("OK");
                break;
        }
    }, [navigatePage, speak, stopTTS, ttsEnabled]);

    const processResults = useCallback((results: any) => {
        if (results.multiHandLandmarks?.length > 0) {
            setHandDetected(true);
            const lms = results.multiHandLandmarks[0];
            setLandmarks(lms);

            const gesture = detectGestureFromLandmarks(lms);

            // Stabilization
            gestureHistory.current.push(gesture);
            if (gestureHistory.current.length > 5) gestureHistory.current.shift();

            const isStable = gestureHistory.current.every(g => g === gesture);

            if (isStable && gesture !== 'none') {
                setCurrentGesture(gesture);
                handleAction(gesture);
            } else if (gesture === 'none') {
                setCurrentGesture('none');
            }
        } else {
            setHandDetected(false);
            setLandmarks(null);
            setCurrentGesture('none');
        }
    }, [handleAction]);

    const loadMediaPipe = async () => {
        if (window.Hands && window.Camera) return;

        const loadScript = (src: string) => new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.crossOrigin = 'anonymous';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });

        await Promise.all([
            loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
            loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
        ]);
    };

    const startCamera = async () => {
        if (isActive) return;
        try {
            setIsLoading(true);
            setError(null);
            await loadMediaPipe();

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            streamRef.current = stream;

            // We use a hidden video element for processing if the specific page UI isn't mounted?
            // Actually, we need a persistent video element in the provider to feed MediaPipe
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            handsRef.current = new window.Hands({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            handsRef.current.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            handsRef.current.onResults(processResults);

            cameraRef.current = new window.Camera(videoRef.current!, {
                onFrame: async () => {
                    if (handsRef.current && videoRef.current) {
                        await handsRef.current.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480
            });

            cameraRef.current.start();
            setIsActive(true);
            if (ttsEnabled) speak("Navigation gestuelle activée");

        } catch (err: any) {
            setError(err.message || "Erreur caméra");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        cameraRef.current?.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
        setIsActive(false);
        setHandDetected(false);
        setCurrentGesture('none');
        setLandmarks(null);
        if (ttsEnabled) speak("Caméra arrêtée");
    };

    return (
        <GestureContext.Provider value={{
            isActive, isLoading, error, currentGesture, handDetected, landmarks,
            startCamera, stopCamera, videoRef, canvasRef, ttsEnabled
        }}>
            {/* Hidden persistent video element for MediaPipe processing */}
            <div style={{ position: 'fixed', top: -1000, left: -1000, visibility: 'hidden' }}>
                <video ref={videoRef} autoPlay playsInline muted width={640} height={480} />
            </div>

            {children}
        </GestureContext.Provider>
    );
};

export const useGesture = () => {
    const context = useContext(GestureContext);
    if (!context) throw new Error("useGesture must be used within GestureProvider");
    return context;
};
