# ClearPath Access

**ClearPath Access** is a comprehensive accessible web platform designed to eliminate digital barriers for users with visual, motor, or cognitive impairments. It integrates multimodal interaction paradigms—Voice, Gesture, and AI—into a unified React application.

---

## 🏗️ System Architecture

The project is built on a modern stack focusing on performance, accessibility (a11y), and local processing privacy.

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React 18, TypeScript, Vite | Core application logic with concurrent rendering. |
| **UI System** | Tailwind CSS, Shadcn/UI | Responsive, accessible components (Radix Primitives). |
| **State** | React Context API | Global state management for Auth, Cart, Voice, and Gestures. |
| **Computer Vision** | MediaPipe Hands | Client-side real-time hand tracking and gesture recognition. |
| **Voice Engine** | Web Speech API | Native browser Speech-to-Text (STT) and Text-to-Speech (TTS). |
| **AI Assistant** | Ollama (Phi-3/Mistral) | Local LLM for contextual guidance and task assistance. |
| **Backend** | FastAPI (Python) | optional backend for banking simulation and advanced processing. |

---

## 📦 Core Modules & Features

### 1. Global Gesture Navigation (Computer Vision)
Implemented via a persistent `GestureContext` that maintains a MediaPipe video stream across all routes. The system processes video frames locally to detect specific hand signs for navigation.

- **Status**: Global & Persistent (Works on all pages).
- **Latency**: Real-time (<50ms processing).
- **Gesture Map**:
  - `✌️ Victory` : **Navigate to Home** (Global shortcut).
  - `👉 Point Right` : **Next Page** (Cyclic navigation).
  - `👈 Point Left` : **Previous Page** (Cyclic navigation).
  - `👍 Thumbs Up` : **Toggle Voice Feedback** (On/Off).
  - `🖐️ Open Hand` : **Scroll Down** (Page interaction).
  - `✊ Closed Fist` : **Scroll Up** (Page interaction).

### 2. Intelligent Voice Guidance
A dual-layer voice system providing both deterministic control and AI-driven assistance.

- **Navigation Commands**: "Aller à la banque", "Ouvrir courses", "Retour accueil".
- **Contextual Awareness**: The AI analyzes the current DOM state to answer questions like "Where am I?" or "What can I do here?".
- **Feedback**: All user actions (clicks, navigation, errors) generate spoken feedback via `window.speechSynthesis`.

### 3. AI Assistant (Omar)
A floating chat interface powered by a local Ollama instance (Phi-3 Instruct).
- **Role**: Assists with complex tasks (e.g., generating recipes, summarizing transaction history).
- **Context Injection**: The current page state (e.g., cart contents, bank balance) is injected into the prompt context for relevant answers.

### 4. Functional Modules

#### 🏦 Banking (Simulated)
- **Features**: View Balance, Transaction History, Make Transfers.
- **Accessibility**: High-contrast numbers, voice confirmation of transactions.

#### 🛒 Shopping & Cart
- **Features**: Product catalog, dynamic cart management.
- **Voice Integration**: "Ajoute du lait au panier", "Vide le panier".

#### 🤟 Sign Language Translator (Translate)
- **Input**: Text-to-Gloss conversion logic.
- **Output**: Visualizes French Sign Language (LSF) via fingerspelling images.
- **Interaction**: Keyboard navigation (Arrows) / Gesture navigation integration.

---

## 🔒 Security Implementation

- **Environment Isolation**: `.env` files are strictly excluded from version control (`.gitignore`).
- **Data Privacy**:
  - **Camera**: Stream is processed in volatile memory (Client-side) and never transmitted to a server.
  - **Voice**: STT processed by browser vendor (Web Speech API) or locally depending on browser config.

---

## � Setup & Installation

### Prerequisites
- Node.js v18+
- Python 3.10+ (for Backend)
- Ollama (for AI features) running locally on port `11434`.

### Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/Asembris/MaraTech.git
   cd MaraTech
   ```

2. **Frontend Setup**
   ```bash
   npm install
   npm run dev
   # Accessible at http://localhost:5173
   ```

3. **Backend Setup (Optional)**
   ```bash
   cd backend
   # Create virtual env recommended
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload
   # Accessible at http://localhost:8000
   ```

4. **AI Configuration**
   Ensure Ollama is running with CORS allowed:
   ```bash
   # Windows Env Var
   set OLLAMA_ORIGINS="*"
   set OLLAMA_HOST="0.0.0.0:11434"
   ollama serve
   ```

---

## � Contributing

Strict adherence to WCAG 2.1 AA guidelines is required for all UI contributions.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**License**: MIT
