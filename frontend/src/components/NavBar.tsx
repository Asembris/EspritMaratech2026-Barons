'use client';
import Link from 'next/link';
import { Home, Wallet, ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';
import { useAccessibility } from '@/context/AccessibilityContext';

export default function NavBar() {
    const pathname = usePathname();
    const { user, logout } = useUser();
    const { onHover } = useHoverSpeech();
    const { isVoiceNavEnabled } = useAccessibility();

    const isActive = (path: string) => pathname === path;

    const handleHover = (text: string) => {
        if (isVoiceNavEnabled) {
            onHover(text);
        }
    };

    return (
        <nav className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-40">
            <div className="container mx-auto flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold text-xl text-white"
                    onMouseEnter={() => handleHover("SignLink, Accueil")}
                >
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">SignLink</span>
                    <span className="text-gray-400 text-sm font-normal">Multi-Agent Demo</span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className={`flex items-center gap-2 hover:text-white transition-colors ${isActive('/') ? 'text-white font-medium' : 'text-gray-400'}`}
                        onMouseEnter={() => handleHover("Aller à l'Accueil")}
                    >
                        <Home size={20} />
                        <span className="hidden sm:inline">Accueil</span>
                    </Link>
                    <Link
                        href="/banking"
                        className={`flex items-center gap-2 hover:text-blue-400 transition-colors ${isActive('/banking') ? 'text-blue-400 font-medium' : 'text-gray-400'}`}
                        onMouseEnter={() => handleHover("Aller à la Banque")}
                    >
                        <Wallet size={20} />
                        <span className="hidden sm:inline">Banque</span>
                    </Link>
                    <Link
                        href="/store"
                        className={`flex items-center gap-2 hover:text-purple-400 transition-colors ${isActive('/store') ? 'text-purple-400 font-medium' : 'text-gray-400'}`}
                        onMouseEnter={() => handleHover("Aller au Magasin")}
                    >
                        <ShoppingBag size={20} />
                        <span className="hidden sm:inline">Magasin</span>
                    </Link>
                    <Link
                        href="/translate"
                        className={`flex items-center gap-2 hover:text-green-400 transition-colors ${isActive('/translate') ? 'text-green-400 font-medium' : 'text-gray-400'}`}
                        onMouseEnter={() => handleHover("Traducteur Langue des Signes")}
                    >
                        <span className="text-xl">🤟</span>
                        <span className="hidden sm:inline">Traducteur</span>
                    </Link>
                </div>

                {user ? (
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400 hidden md:inline">
                            Bonjour, <span className="text-white font-medium">{user.username}</span>
                        </span>
                        <button
                            onClick={logout}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors border border-red-500/20"
                            onMouseEnter={() => handleHover("Se déconnecter")}
                        >
                            Déconnexion
                        </button>
                    </div>
                ) : (
                    <Link
                        href="/login"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Connexion
                    </Link>
                )}
            </div>
        </nav>
    );
}
