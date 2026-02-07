'use client';

import { useState } from 'react';
import { loginUser } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { LogIn, User } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('omar@example.com'); // Default for demo
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useUser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await loginUser(email);
            login(user); // Context handles redirect
        } catch (err) {
            setError('Utilisateur non trouvé. Essayez "omar@example.com"');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
                        <User className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Connexion</h1>
                    <p className="text-gray-400">Accédez à votre assistant personnel</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2"> Email </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-800 border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="votre@email.com"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Connexion...' : (
                            <>
                                <LogIn size={20} />
                                Se connecter
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-4">
                        Pour la démo, utilisez : <code>omar@example.com</code>
                    </p>
                </form>
            </div>
        </div>
    );
}
