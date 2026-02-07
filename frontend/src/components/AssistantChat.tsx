'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useAudio } from '@/contexts/AudioContext';
import { chatWithAssistant, transcribeAudio } from '@/lib/api';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { MessageCircle, X, Send, Mic, Sparkles, Bot, Minimize2, Maximize2, Loader2, StopCircle } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
}

export default function AssistantChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { speak, stop, isSpeaking, audioEnabled } = useAudio();
    const { user } = useUser();

    // Audio Recorder Integration (Whisper Fallback)
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();

    const toggleRecording = async () => {
        if (isRecording) {
            const blob = await stopRecording();
            setIsTranscribing(true);
            try {
                const result = await transcribeAudio(blob);
                if (result.text) {
                    setInput(prev => (prev + " " + result.text).trim());
                }
            } catch (error) {
                console.error("Transcription failed", error);
            } finally {
                setIsTranscribing(false);
            }
        } else {
            try {
                await startRecording();
            } catch (error) {
                console.error("Failed to start recording", error);
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        // Keep original message structure for compatibility with existing rendering logic
        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        if (!user) {
            setMessages(prev => [...prev, userMsg, {
                id: Date.now().toString(),
                text: "Veuillez vous connecter pour utiliser l'assistant.",
                sender: 'assistant',
                timestamp: new Date()
            }]);
            return;
        }

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const userId = user.id;

            // Format history
            const history = messages.map(m => ({
                role: m.sender,
                content: m.text
            }));

            const data = await chatWithAssistant(userMsg.text, userId, history);
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(), // Ensure unique ID
                text: data.response,
                sender: 'assistant',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);

            // Dispatch event to refresh cart
            window.dispatchEvent(new Event('cartUpdated'));

            if (audioEnabled) {
                speak(data.response);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: "Désolé, une erreur est survenue. Veuillez réessayer.",
                sender: 'assistant',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-80 md:w-96 mb-4 flex flex-col h-[500px] overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="text-white" />
                            <div className="flex flex-col">
                                <span className="font-bold text-white leading-none">Assistant IA</span>
                                <span className="text-[10px] text-blue-200">
                                    Connexion : {user ? user.full_name : 'Invité'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/95">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-gray-700 text-gray-200 rounded-tl-none'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                                    <span className="text-[10px] opacity-50 block mt-1 text-right">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-700 text-gray-200 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                    <Sparkles size={16} className="animate-spin text-purple-400" />
                                    <span className="text-sm">Analyse...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-gray-800 border-t border-gray-700">
                        {/* Status Preview */}
                        {(isRecording || isTranscribing) && (
                            <div className="text-xs text-purple-300 mb-2 italic animate-pulse flex items-center gap-2">
                                {isRecording && <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div> Enregistrement...</span>}
                                {isTranscribing && <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Transcription...</span>}
                            </div>
                        )}

                        <div className={`flex items-center gap-2 bg-gray-900 rounded-xl p-2 border transition-colors ${isRecording ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700 focus-within:border-blue-500'}`}>
                            <button
                                onClick={toggleRecording}
                                disabled={isTranscribing}
                                className={`p-2 rounded-lg transition-all ${isRecording
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                                title={isRecording ? "Arrêter l'enregistrement" : "Activer le micro"}
                            >
                                {isRecording ? <StopCircle size={18} /> : (isTranscribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />)}
                            </button>

                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={isRecording ? "Enregistrement en cours..." : "Posez une question..."}
                                className="flex-1 bg-transparent border-none text-white focus:ring-0 text-sm px-2"
                                disabled={isLoading || isTranscribing}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading || isRecording}
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Float Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 ${isOpen
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-purple-500/30'
                    }`}
                aria-label="Ouvrir l'assistant"
            >
                {isOpen ? <X size={24} /> : <Bot size={24} />}
            </button>
        </div>
    );
}
