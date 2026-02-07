// API configuration
// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    // Vector Search (New)
    vectorProducts: `${API_BASE_URL}/api/store/vector/products`,
    vectorSearch: `${API_BASE_URL}/api/store/vector/search`,
    vectorInfo: `${API_BASE_URL}/api/store/vector/info`,
    vectorImage: (category: string, image: string) => `${API_BASE_URL}/api/store/vector/image/${category}/${image}`,
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

export async function transcribeAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const res = await fetch(API.transcribe, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) throw new Error("Transcription failed");
    return res.json();
}

// ===========================
// Vector Product Types & API
// ===========================

export interface VectorProduct {
    product_id: string | null;
    name: string | null;
    brand: string | null;
    price: string | null;
    image_file: string | null;
    category_folder: string | null;
    score?: number | null;
}

export interface VectorCollectionInfo {
    name: string;
    vectors_count?: number;
    points_count?: number;
    status?: string;
    error?: string;
}

export async function getVectorProducts(limit: number = 50, offset: number = 0): Promise<VectorProduct[]> {
    const res = await fetch(`${API.vectorProducts}?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error("Failed to fetch vector products");
    return res.json();
}

export async function searchVectorProducts(query: string, limit: number = 10): Promise<VectorProduct[]> {
    const res = await fetch(`${API.vectorSearch}?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to search products");
    return res.json();
}

export async function getVectorCollectionInfo(): Promise<VectorCollectionInfo> {
    const res = await fetch(API.vectorInfo);
    if (!res.ok) throw new Error("Failed to fetch collection info");
    return res.json();
}

export function getVectorProductImageUrl(categoryFolder: string | null, imageFile: string | null): string | null {
    if (!categoryFolder || !imageFile) return null;
    return API.vectorImage(categoryFolder, imageFile);
}

export async function searchProductsByImage(imageFile: File, limit: number = 10): Promise<VectorProduct[]> {
    const formData = new FormData();
    formData.append("file", imageFile);

    const res = await fetch(`${API_BASE_URL}/api/store/vector/search/image?limit=${limit}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) throw new Error("Failed to search products by image");
    return res.json();
}

