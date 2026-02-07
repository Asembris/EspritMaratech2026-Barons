'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAccessibility } from '@/context/AccessibilityContext';
import { HandMetal, Play, X } from 'lucide-react';

// Mock video map for demo purposes
// In a real app, these would be actual LSF summary videos of the page content
const VIDEO_MAP: Record<string, string> = {
    '/': '/videos/lsf-home.mp4',
    '/banking': '/videos/lsf-banking.mp4',
    '/store': '/videos/lsf-store.mp4',
    '/translate': '/videos/lsf-translate.mp4',
    '/login': '/videos/lsf-login.mp4'
};

const SUMMARY_TEXT: Record<string, string> = {
    '/': "Page d'accueil. Ici vous pouvez voir un aperçu de vos comptes et accéder aux services.",
    '/banking': "Espace Banque. Consultez votre solde et vos transactions récentes.",
    '/store': "Espace Magasin. Achetez des produits locaux et gérez votre panier.",
    '/translate': "Traducteur. Convertissez du texte ou de la voix en Langue des Signes.",
    '/login': "Page de connexion. Entrez votre email pour accéder à votre compte."
};

export default function SignLanguageSummary() {
    const { isSignLanguageEnabled } = useAccessibility();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Auto-open on page change if enabled
    useEffect(() => {
        if (isSignLanguageEnabled) {
            setIsOpen(true);
        }
    }, [pathname, isSignLanguageEnabled]);

    if (!isSignLanguageEnabled) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full shadow-lg z-40 transition-transform hover:scale-110 flex items-center gap-2"
                aria-label="Ouvrir le résumé LSF"
            >
                <HandMetal size={24} />
                <span className="font-bold text-sm hidden sm:inline">LSF</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-6 w-80 bg-gray-900 border border-purple-500/50 rounded-2xl shadow-2xl z-40 overflow-hidden animate-fade-in-up">
            <div className="bg-purple-900/50 p-3 flex justify-between items-center border-b border-purple-500/30">
                <div className="flex items-center gap-2 text-purple-200">
                    <HandMetal size={18} />
                    <span className="font-bold text-sm">Résumé LSF</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-purple-200 hover:text-white"
                    aria-label="Fermer le résumé"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="p-4">
                {/* Mock Video Player */}
                <div className="aspect-video bg-black rounded-lg mb-3 flex items-center justify-center relative group cursor-pointer border border-gray-700">
                    <Play size={40} className="text-white/80 group-hover:text-white transition-colors" />
                    <span className="absolute bottom-2 right-2 text-xs text-gray-400 bg-black/50 px-1 rounded">Simulé</span>
                </div>

                <p className="text-sm text-gray-300">
                    {SUMMARY_TEXT[pathname] || "Description de la page en Langue des Signes Française."}
                </p>
            </div>
        </div>
    );
}
