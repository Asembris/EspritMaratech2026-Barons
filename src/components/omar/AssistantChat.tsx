import { useState, useRef, useEffect } from "react";
import { useSpeech } from "@/hooks/use-speech";
import { useUser } from "@/hooks/use-user";
import { chatWithAssistant, ChatMessage } from "@/lib/omarApi";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { AccessibleButton } from "@/components/AccessibleButton";

interface Message {
    id: string;
    text: string;
    sender: "user" | "assistant";
    timestamp: Date;
}

export default function AssistantChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { speak } = useSpeech();
    const { user } = useUser();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const userId = user ? user.id : 1;

            const history: ChatMessage[] = messages.map((m) => ({
                role: m.sender,
                content: m.text,
            }));

            const data = await chatWithAssistant(userMsg.text, userId, history);
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response,
                sender: "assistant",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            // Dispatch event to refresh cart in other components
            window.dispatchEvent(new Event("cartUpdated"));

            // Speak the response
            speak(data.response);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    text: "Désolé, une erreur est survenue. Vérifiez que le backend est lancé.",
                    sender: "assistant",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-80 md:w-96 mb-4 flex flex-col h-[500px] overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="text-white" />
                            <span className="font-bold text-white">Assistant IA</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white transition-colors"
                            aria-label="Fermer l'assistant"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/95">
                        {messages.length === 0 && (
                            <div className="text-gray-400 text-sm text-center py-8">
                                Posez une question à l'assistant IA.
                                <br />
                                Exemples : "Comment faire un couscous ?", "Ajoute du lait au panier"
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === "user"
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-gray-700 text-gray-200 rounded-tl-none"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                                    <span className="text-[10px] opacity-50 block mt-1 text-right">
                                        {msg.timestamp.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
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
                        <div className="flex items-center gap-2 bg-gray-900 rounded-xl p-2 border border-gray-700 focus-within:border-blue-500 transition-colors">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Posez une question..."
                                className="flex-1 bg-transparent border-none text-white focus:ring-0 text-sm px-2 focus:outline-none"
                                disabled={isLoading}
                                aria-label="Message pour l'assistant"
                            />
                            <AccessibleButton
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                aria-label="Envoyer le message"
                            >
                                <Send size={16} />
                            </AccessibleButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Float Button */}
            <AccessibleButton
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-110 ${isOpen
                        ? "bg-gray-700 text-white hover:bg-gray-600"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-purple-500/30"
                    }`}
                aria-label={isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant IA"}
            >
                {isOpen ? <X size={24} /> : <Bot size={24} />}
            </AccessibleButton>
        </div>
    );
}
