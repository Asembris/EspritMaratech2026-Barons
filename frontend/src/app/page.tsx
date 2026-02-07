'use client';
import Link from 'next/link';
import { Wallet, ShoppingBag, ArrowRight, Activity, Bot } from 'lucide-react';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';
import { useUser } from '@/context/UserContext';

export default function Home() {
  const { onHover } = useHoverSpeech();
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 pb-24 relative overflow-hidden">

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="text-center mb-16 relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-full px-4 py-1 mb-6 animate-fade-in">
          <Activity size={16} className="text-green-400 animate-pulse" />
          <span className="text-sm text-gray-300">Système Multi-Agents Actif</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
          SignLink
        </h1>
        {user && (
          <h2 className="text-2xl text-blue-300 mb-4 animate-in fade-in slide-in-from-bottom-5">
            Bonjour, {user.full_name}
          </h2>
        )}
        <p className="text-lg text-gray-400 leading-relaxed mb-8">
          Bienvenue dans votre environnement de démonstration.
          <br />
          Explorez les interactions entre l'Agent Banquier et l'Agent Magasin.
        </p>

        <div
          className="inline-flex items-center gap-3 bg-gray-800/80 p-4 rounded-xl border border-gray-700"
          onMouseEnter={() => onHover("Cliquez sur le bouton de chat en bas à droite pour tester l'assistant intelligent")}
        >
          <Bot className="text-blue-400" />
          <span className="text-sm text-gray-300">
            Astuce : Testez l'Assistant Intelligent (en bas à droite)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
        {/* Banking Card */}
        <Link
          href="/banking"
          className="group relative bg-gray-900 border border-gray-800 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20"
          onMouseEnter={() => onHover("Accéder à l'espace Banque")}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Wallet className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3 group-hover:text-blue-400 transition-colors">Banque</h2>
            <p className="text-gray-400 mb-8">
              Consultez votre solde, vos transactions et gérez vos finances avec l'aide de l'agent bancaire.
            </p>
            <div className="flex items-center gap-2 text-blue-400 font-medium group-hover:translate-x-2 transition-transform">
              Accéder à la Banque <ArrowRight size={18} />
            </div>
          </div>
        </Link>

        {/* Store Card */}
        <Link
          href="/store"
          className="group relative bg-gray-900 border border-gray-800 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/20"
          onMouseEnter={() => onHover("Accéder au Magasin")}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBag size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3 group-hover:text-purple-400 transition-colors">Magasin</h2>
            <p className="text-gray-400 mb-8">
              Parcourez le catalogue, remplissez votre panier et testez les limites de votre budget.
            </p>
            <div className="flex items-center gap-2 text-purple-400 font-medium group-hover:translate-x-2 transition-transform">
              Accéder au Magasin <ArrowRight size={18} />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
