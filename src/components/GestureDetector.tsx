'use client';

import { useRef, useEffect, useState } from 'react';
import { useGesture } from '@/context/GestureContext';

interface GestureInfo {
    id: string;
    emoji: string;
    name: string;
    action: string;
}

const gesturesConfig = [
    { id: 'thumbs_up', emoji: '👍', name: 'Pouce Levé', action: 'Voix ON/OFF' },
    { id: 'open_hand', emoji: '🖐️', name: 'Main Ouverte', action: 'Défiler Bas' },
    { id: 'closed_fist', emoji: '✊', name: 'Poing Fermé', action: 'Défiler Haut' },
    { id: 'point_right', emoji: '👉', name: 'Pointer Droite', action: 'Page Suivante' },
    { id: 'point_left', emoji: '👈', name: 'Pointer Gauche', action: 'Page Précédente' },
    { id: 'victory', emoji: '✌️', name: 'V de la Victoire', action: 'Accueil' },
];

export function GestureDetector() {
    const {
        isActive,
        isLoading,
        error,
        currentGesture,
        handDetected,
        landmarks,
        startCamera,
        stopCamera,
        videoRef: globalVideoRef,
        ttsEnabled
    } = useGesture();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Sync local video with global stream
    useEffect(() => {
        if (isActive && globalVideoRef.current?.srcObject && localVideoRef.current) {
            localVideoRef.current.srcObject = globalVideoRef.current.srcObject;
        }
    }, [isActive, globalVideoRef]);

    // Draw landmarks on local canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !landmarks || !isActive) {
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        // Draw connections
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
            const s = landmarks[start];
            const e = landmarks[end];
            ctx.beginPath();
            ctx.moveTo(s.x * canvas.width, s.y * canvas.height);
            ctx.lineTo(e.x * canvas.width, e.y * canvas.height);
            ctx.stroke();
        });

        // Draw points
        ctx.fillStyle = '#00ff88';
        landmarks.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, 2 * Math.PI);
            ctx.fill();
        });

        ctx.restore();
    }, [landmarks, isActive]);

    const gestures = gesturesConfig.map(g => ({
        ...g,
        detected: currentGesture === g.id,
    }));

    return (
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Camera View */}
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
                            ref={localVideoRef}
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

                        {/* Status overlays */}
                        {isActive && (
                            <>
                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold ${handDetected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {handDetected ? '✋ Main détectée' : '👀 Aucune main'}
                                </div>
                                <div className={`absolute top-4 left-4 px-2 py-1 rounded text-xs ${ttsEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {ttsEnabled ? '🔊 Voix ON' : '🔇 Voix OFF'}
                                </div>
                            </>
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
                        disabled={isLoading}
                        className={[
                            "w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3",
                            "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring",
                            "min-h-target",
                            isLoading ? "opacity-50 cursor-wait" : "",
                            isActive
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        ].join(" ")}
                    >
                        <span className="text-xl">📷</span>
                        {isLoading ? 'Chargement...' : isActive ? 'Arrêter la Caméra' : 'Démarrer la Caméra'}
                    </button>

                    {error && (
                        <div className="mt-3 bg-destructive/10 border-2 border-destructive text-destructive p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="p-6">
                    <h3 className="text-xl font-bold text-primary mb-4">Navigation par Gestes</h3>
                    <div className="space-y-3">
                        {gestures.map((gesture) => (
                            <div
                                key={gesture.id}
                                className={`relative p-4 rounded-xl transition-all overflow-hidden ${gesture.detected ? 'bg-primary/20 border-2 border-primary' : 'bg-muted border-2 border-transparent'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">{gesture.emoji}</span>
                                    <div>
                                        <div className="font-semibold text-foreground">{gesture.name}</div>
                                        <div className="text-sm text-muted-foreground">{gesture.action}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
