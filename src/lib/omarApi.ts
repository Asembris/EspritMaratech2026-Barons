// API configuration for Omar's backend features
// Uses Vite proxy: /api/* -> http://localhost:8001

const API_BASE = "/api";

export const API = {
    health: `${API_BASE}/health`,
    convert: `${API_BASE}/convert`,
    summarize: `${API_BASE}/summarize`,
    signs: `${API_BASE}/signs`,
    elix: (word: string) => `${API_BASE}/elix/${word}`,
    // Banking & Store
    balance: `${API_BASE}/banking/balance`,
    transactions: `${API_BASE}/banking/transactions`,
    products: `${API_BASE}/store/products`,
    cart: `${API_BASE}/store/cart`,
    chat: `${API_BASE}/assistant/chat`,
};

// Types
export interface ConvertResponse {
    original: string;
    gloss: string;
    words: string[];
    fingerspelling?: {
        character: string;
        type: "letter" | "number" | "space";
        image_url: string | null;
    }[];
    summarized?: string;
    llm_used?: boolean;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
}

// API functions
export async function convertToGloss(
    text: string,
    useLlm: boolean = false
): Promise<ConvertResponse> {
    const response = await fetch(API.convert, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text,
            include_fingerspelling: true,
            use_llm: useLlm,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to convert text");
    }

    return response.json();
}

export async function summarizeText(
    text: string
): Promise<{ original: string; summarized: string; llm_available: boolean }> {
    const response = await fetch(API.summarize, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error("Failed to summarize text");
    }

    return response.json();
}

export async function getElixLink(word: string) {
    const response = await fetch(API.elix(word));
    return response.json();
}

// Banking & Store API
export async function getBalance() {
    const res = await fetch(API.balance);
    if (!res.ok) throw new Error("Failed to fetch balance");
    return res.json();
}

export async function getTransactions() {
    const res = await fetch(API.transactions);
    if (!res.ok) throw new Error("Failed to fetch transactions");
    return res.json();
}

export async function getProducts(query: string = "") {
    const res = await fetch(`${API.products}?query=${query}`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
}

export async function getCart(userId: number = 1) {
    const res = await fetch(`${API.cart}?user_id=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch cart");
    return res.json();
}

export async function chatWithAssistant(
    message: string,
    userId: number = 1,
    history: ChatMessage[] = []
) {
    const res = await fetch(API.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            user_id: userId,
            history,
        }),
    });
    if (!res.ok) throw new Error("Failed to chat");
    return res.json();
}

export async function loginUser(email: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
}

export async function addToCart(
    userId: number,
    productName: string,
    quantity: number = 1
) {
    const res = await fetch(`${API_BASE}/store/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, product_name: productName, quantity }),
    });
    if (!res.ok) throw new Error("Failed to add to cart");
    return res.json();
}

export async function removeFromCart(userId: number, productName: string) {
    const res = await fetch(`${API_BASE}/store/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, product_name: productName }),
    });
    if (!res.ok) throw new Error("Failed to remove from cart");
    return res.json();
}
