# MaraTech - Assistant IA Tunisien Inclusif & Accessible 🇹🇳

Une plateforme innovante combinant **Intelligence Artificielle**, **Accessibilité (LSF)** et **Inclusion Financière** pour le quotidien en Tunisie.

## ✨ Fonctionnalités Clés

### 1. 🗣️ Interaction Vocale & Traduction
- **Reconnaissance Vocale Universelle** : Parlez en **Tunisien (Derja)**, Français ou Anglais.
- **Auto-Correction IA** : L'assistant (GPT-4o-mini) traduit et reformule automatiquement votre demande en Français formel.
- **Synthèse Vocale (TTS)** : Réponse audio naturelle et fluide.

### 2. 🎙️ Agent Vocal Global (v2.0)
Contrôle total de l'application à la voix.
- **Navigation** : "Aller à la banque", "Ouvrir le magasin".
- **Actions** : "Quel est mon solde ?", "Ajoute du thon", "Vider le panier".
- **Intelligent** : Comprend le contexte (ex: "C'est combien ?" après avoir cherché un produit).

### 3. 🔊 Mode Mains-Libres (v3.0 - Accessibilité Totale)
Conçu pour les personnes **aveugles ou malvoyantes**. **Zéro clic requis.**

**Activation :**
1. L'app demande oralement : *"Pouvez-vous voir cet écran ?"*
2. Répondez **"Non"**.
3. Le mode s'active : Micro auto-activé, lecture automatique des pages.

**Commandes Mains-Libres :**
- **"Stop"** : Met l'assistant en pause.
- **"Écoute"** : Réactive l'assistant.
- **"Assistant"** : Ouvre le chat IA.
- **"Ferme"** : Ferme le chat IA.
- **Dictée d'emails** : "Fait un virement à alice arobase exemple point com".

### 4. 🤟 Accessibilité LSF (Langue des Signes)
- Conversion texte → Vidéo LSF via Avatar 3D.
- Dictionnaire de signes intégré pour l'inclusion bancaire.

### 5. 👨‍🍳 Assistant Chef & Shopping
- **Cuisine** : Demandez une recette (ex: Couscous), l'assistant liste les ingrédients et propose de les ajouter au panier.
- **Budget** : Vérification solde avant achat.

---

## 🏗️ Architecture Technique

Le projet suit une architecture **Micro-Services** moderne et découplée.

```mermaid
graph TD
    User((Utilisateur))
    
    subgraph Frontend [Next.js 16 - Port 3003]
        UI[Interface React]
        VoiceMgr[VoiceControlManager]
        AudioCtx[AudioContext]
        LSF[Module LSF]
    end
    
    subgraph Backend [FastAPI - Port 8000]
        API[API Rest]
        AgentService[AgentService (LangChain)]
        Whisper[Whisper (STT)]
        BankSvc[BankingService]
        StoreSvc[StoreService]
        DB[(SQLite)]
    end
    
    subgraph AI [Services IA]
        GPT[OpenAI GPT-4o-mini]
        TTS[Browser TTS]
    end

    User -- Voix/Click --> UI
    UI -- Audio Blob --> API
    API -- Audio --> Whisper
    Whisper -- Texte --> AgentService
    AgentService -- Prompt --> GPT
    AgentService -- Actions --> BankSvc & StoreSvc
    BankSvc & StoreSvc -- SQL --> DB
    AgentService -- Réponse JSON --> UI
    UI -- Texte --> TTS --> User
```

### Stack Technique
- **Frontend** : Next.js 16, TypeScript, Tailwind CSS, Lucide React.
  - *Gestion d'état* : React Context (User, Audio, Accessibility).
  - *Audio* : Web Audio API + MediaRecorder.
- **Backend** : FastAPI (Python 3.10+).
  - *IA Orchestration* : LangChain.
  - *LLM* : GPT-4o-mini.
  - *Database* : SQLite + SQLAlchemy.
- **Déploiement** : Docker ready (optionnel).

---

## 🤖 Architecture des Agents (SignLink Brain)

Le système repose sur un **Agent ReAct** (Reasoning + Acting) qui décide quelle action entreprendre.

### 🧠 Cerveau Central (`AgentService.py`)
L'agent reçoit la commande textuelle (après Whisper) et l'historique de conversation.
Il a accès à une liste d'**Outils Sécurisés** (`@tool`).

### 🛠️ Liste des Outils Agents
| Outil | Description | Trigger Exemple |
|:---|:---|:---|
| `transfer_money` | Virement bancaire sécurisé | "Virement de 50D à Alice" |
| `check_balance` | Consultation solde | "Combien j'ai ?" |
| `search_product` | Recherche floue produit | "Cherche harissa" |
| `add_to_cart` | Ajout au panier | "Ajoute 2 paquets" |
| `manage_cart` | Vider/Modifier panier | "Vide le panier" |
| `navigate` | Changement de page | "Va à l'accueil" |
| `open_chat` / `close_chat` | Contrôle assistant | "Ouvre l'assistant" |

### 🔄 Flux de Traitement Vocal
1. **Capture** : `VoiceControlManager` enregistre l'audio (auto ou manuel).
2. **Transcription** : Envoi au backend `agent_listener.py` -> Whisper.
3. **Normalisation** : Correction des emails dictés ("arobase" -> "@").
4. **Décision** : L'Agent choisit l'outil approprié via LangChain.
5. **Exécution** : L'outil modifie la DB (ex: virement).
6. **Réponse** : Génération d'une réponse naturelle ("C'est fait, j'ai viré 50D").
7. **Synthèse** : Le frontend lit la réponse (TTS).

---

## 🚀 Guide d'Installation & Exécution

### Prérequis
- Python 3.10+
- Node.js 18+
- Clé API OpenAI dans `backend/.env` (`OPENAI_API_KEY=sk-...`)

### Option 1 : Démarrage Automatique (Recommandé)
Lancez simplement le script PowerShell à la racine :
```powershell
.\start_app.ps1
```
Cela ouvrira automatiquement :
- Le Backend (Terminal 1)
- Le Frontend (Terminal 2)
- Le Navigateur (http://localhost:3003)

### Option 2 : Démarrage Manuel

**1. Backend (Port 8000)**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**2. Frontend (Port 3003)**
```bash
cd frontend
npm install
npm run dev -- -p 3003
```

---

## 👥 Équipe & Hackathon
**Projet** : MaraTech (Hackathon Esprit 2026)
**Équipe** : Les Barons
**Focus** : Accessibilité Financière & Inclusion Numérique.
