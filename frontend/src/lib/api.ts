// API configuration
// API configuration
export const API_BASE_URL = 'http://192.168.1.131:8000'; // Hardcoded for Mobile Testing

// API endpoints
export const API = {
    health: `${API_BASE_URL}/api/health`,
    convert: `${API_BASE_URL}/api/convert`,
    summarize: `${API_BASE_URL}/api/summarize`,
    signs: `${API_BASE_URL}/api/signs`,
    elix: (word: string) => `${API_BASE_URL}/api/elix/${word}`,
    // Banking & Store
    balance: `${API_BASE_URL}/api/banking/balance`,
    transactions: `${API_BASE_URL}/api/banking/transactions`,
    products: `${API_BASE_URL}/api/store/products`,
    cart: `${API_BASE_URL}/api/store/cart`,
    chat: `${API_BASE_URL}/api/assistant/chat`,
    transcribe: `${API_BASE_URL}/api/transcribe`,
    agentCommand: `${API_BASE_URL}/api/agent/command`,
};

// Types
export interface ConvertResponse {
    original: string;
    gloss: string;
    words: string[];
    fingerspelling?: {
        character: string;
        type: 'letter' | 'number' | 'space';
        image_url: string | null;
    }[];
    summarized?: string;  // LLM-summarized text
    llm_used?: boolean;
}

export interface ConvertRequest {
    text: string;
    include_fingerspelling?: boolean;
    use_llm?: boolean;  // Use LLM for summarization
}

// API functions
export async function convertToGloss(text: string, useLlm: boolean = false): Promise<ConvertResponse> {
    const response = await fetch(API.convert, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text,
            include_fingerspelling: true,
            use_llm: useLlm
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to convert text');
    }

    return response.json();
}

export async function summarizeText(text: string): Promise<{ original: string; summarized: string; llm_available: boolean }> {
    const response = await fetch(API.summarize, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error('Failed to summarize text');
    }

    return response.json();
}

export async function getElixLink(word: string) {
    const response = await fetch(API.elix(word));
    return response.json();
}

// Banking & Store API
export async function getBalance(userId: number) {
    if (!userId) throw new Error("User ID is required");
    const res = await fetch(`${API.balance}?user_id=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch balance");
    return res.json();
}

export async function getTransactions(userId: number) {
    if (!userId) throw new Error("User ID is required");
    const res = await fetch(`${API.transactions}?user_id=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch transactions");
    return res.json();
}

export async function getProducts(query: string = "") {
    const res = await fetch(`${API.products}?query=${query}`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
}

export async function getCart(userId: number) {
    if (!userId) throw new Error("User ID is required");
    const res = await fetch(`${API.cart}?user_id=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch cart");
    return res.json();
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function chatWithAssistant(message: string, userId: number, history: ChatMessage[] = []) {
    if (!userId) throw new Error("User ID is required");
    const res = await fetch(API.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            user_id: userId,
            history
        })
    });
    if (!res.ok) throw new Error("Failed to chat");
    return res.json();
}

export async function loginUser(email: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
}

export async function addToCart(userId: number, productName: string, quantity: number = 1) {
    const res = await fetch(`${API_BASE_URL}/api/store/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, product_name: productName, quantity })
    });
    if (!res.ok) throw new Error("Failed to add to cart");
    return res.json();
}

export async function removeFromCart(userId: number, productName: string) {
    const res = await fetch(`${API_BASE_URL}/api/store/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, product_name: productName })
    });
    if (!res.ok) throw new Error("Failed to remove from cart");
    return res.json();
}

export async function clearCart(userId: number) {
    const res = await fetch(`${API_BASE_URL}/api/store/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) throw new Error("Failed to clear cart");
    return res.json();
}

export async function checkoutCart(userId: number) {
    const res = await fetch(`${API_BASE_URL}/api/store/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) throw new Error("Failed to checkout");
    return res.json();
}

export async function transcribeAudio(audioBlob: Blob, mode: 'general' | 'command' = 'general') {
    const formData = new FormData();
    // Use .webm extension but ensure backend handles it. 
    // OpenAI Whisper supports webm.
    formData.append("file", audioBlob, "recording.webm");
    formData.append("mode", mode);

    const res = await fetch(API.transcribe, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: res.statusText }));
        console.error("Transcription API Error:", errorData);
        throw new Error(errorData.detail || "Transcription failed");
    }
    return res.json();
}

export async function sendVoiceCommand(command: string, currentPage: string = "/") {
    const res = await fetch(API.agentCommand, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, current_page: currentPage })
    });

    if (!res.ok) throw new Error("Agent command failed");
    return res.json();
}
