// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// export const API_BASE_URL = 'http://192.168.1.131:8000'; // For mobile testing, set NEXT_PUBLIC_API_URL in .env.local

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

export interface LSFResponse {
    video_url?: string;
    glosses: string[];
    error?: string;
    fallback_mode?: boolean;
}

export async function convertTextToLSF(text: string): Promise<LSFResponse> {
    const response = await fetch(`${API_BASE_URL}/api/lsf/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error('Failed to convert text to LSF video');
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
    const res = await fetch(API.products.replace('/products', '/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, product_name: productName, quantity })
    });
    if (!res.ok) throw new Error("Failed to add to cart");
    return res.json();
}

export async function removeFromCart(userId: number, productName: string) {
    const res = await fetch(API.products.replace('/products', '/remove'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, product_name: productName })
    });
    if (!res.ok) throw new Error("Failed to remove from cart");
    return res.json();
}

export async function clearCart(userId: number) {
    const res = await fetch(API.products.replace('/products', '/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) throw new Error("Failed to clear cart");
    return res.json();
}

export async function checkoutCart(userId: number) {
    const res = await fetch(API.products.replace('/products', '/checkout'), {
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

    const res = await fetch(`${API_BASE_URL}/api/transcribe`, {
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

// Vector Search Types
export interface VectorProduct {
    product_id?: string;
    name?: string;
    brand?: string;
    price?: string; // String "12,500 DT"
    image_file?: string;
    category_folder?: string;
    score?: number;
}

export interface VectorCollectionInfo {
    name: string;
    vectors_count?: number;
    points_count?: number;
    status?: string;
}

// Vector Search API
export async function getVectorProducts(limit: number = 50, offset: number = 0): Promise<VectorProduct[]> {
    const res = await fetch(`${API.products.replace('/products', '/vector/products')}?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error("Failed to fetch vector products");
    return res.json();
}

export async function searchVectorProducts(query: string, limit: number = 10): Promise<VectorProduct[]> {
    const res = await fetch(`${API.products.replace('/products', '/vector/search')}?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) throw new Error("Vector search failed");
    return res.json();
}

export async function searchProductsByImage(imageFile: File, limit: number = 10): Promise<VectorProduct[]> {
    const formData = new FormData();
    formData.append('file', imageFile);

    const res = await fetch(`${API.products.replace('/products', '/vector/search/image')}?limit=${limit}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) throw new Error("Image search failed");
    return res.json();
}

export async function getVectorCollectionInfo(): Promise<VectorCollectionInfo> {
    const res = await fetch(`${API.products.replace('/products', '/vector/info')}`);
    if (!res.ok) throw new Error("Failed to fetch collection info");
    return res.json();
}

export function getVectorProductImageUrl(category: string, filename: string): string {
    return `${API.products.replace('/products', '/vector/image')}/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`;
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
