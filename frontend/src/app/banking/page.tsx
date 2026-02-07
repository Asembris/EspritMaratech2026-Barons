'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { getBalance, getTransactions } from '@/lib/api';
import { Wallet, CreditCard, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';

interface Transaction {
    id: number;
    amount: number;
    description: string;
    date: string;
    category: string;
}

export default function BankingPage() {
    const { user } = useUser();
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { onHover } = useHoverSpeech();

    useEffect(() => {
        async function fetchData() {
            if (!user) {
                console.log("BankingPage: No user logged in");
                return;
            }
            console.log("BankingPage: Fetching data for user ID:", user.id);
            try {
                const [balData, txData] = await Promise.all([
                    getBalance(user.id),
                    getTransactions(user.id)
                ]);
                console.log("BankingPage: Data received:", balData, txData);
                setBalance(balData.balance);
                setTransactions(txData);
            } catch (error) {
                console.error("Error fetching banking data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();

        // Listen for balance updates from Assistant/Voice Agent
        window.addEventListener('balanceUpdated', fetchData);
        return () => window.removeEventListener('balanceUpdated', fetchData);
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pb-24">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-blue-400 mb-2">Espace Banque</h1>
                <p className="text-gray-400">Gérez vos comptes et consultez vos transactions.</p>
                {user && (
                    <div className="mt-2 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 font-mono text-xs">
                        DEBUG INFO: User ID = {user.id} | Name = {user.full_name}
                    </div>
                )}
            </header>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Balance Card */}
                <div
                    className="bg-gradient-to-br from-blue-600 to-blue-900 rounded-2xl p-8 shadow-2xl transform transition hover:scale-[1.01] focus-visible-ring"
                    onMouseEnter={() => onHover(`Votre solde actuel est de ${balance} dinars`)}
                    tabIndex={0}
                    role="region"
                    aria-label={`Solde actuel : ${balance.toFixed(3)} dinars`}
                >
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-blue-200 font-medium mb-1">Solde Total</p>
                            <h2 className="text-5xl font-bold text-white">{balance.toFixed(3)} TND</h2>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Wallet className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-blue-200">
                        <div className="flex items-center gap-2">
                            <CreditCard size={20} />
                            <span>FR76 3000 4000 ...</span>
                        </div>
                        <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">Actif</span>
                    </div>
                </div>

                {/* Transactions */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-blue-400" />
                        Historique
                    </h3>

                    <div className="space-y-4">
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="bg-gray-700/30 p-4 rounded-xl flex items-center justify-between hover:bg-gray-700 transition-colors group focus-visible-ring"
                                onMouseEnter={() => onHover(`Transaction : ${tx.description}, ${tx.amount} euros`)}
                                tabIndex={0}
                                role="article"
                                aria-label={`Transaction : ${tx.description}, montant ${tx.amount} dinars, le ${new Date(tx.date).toLocaleDateString()}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${tx.amount > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {tx.amount > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{tx.description}</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <span>{new Date(tx.date).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{tx.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xl font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(3)} TND
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-gray-500 ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
