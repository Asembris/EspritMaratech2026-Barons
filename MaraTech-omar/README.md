# MaraTech - Assistant IA Tunisien Inclusif 🇹🇳

MaraTech (anciennement SignLink) est une application web innovante combinant **Accessibilité (LSF)** et **Assistance IA Contextuelle** pour le quotidien en Tunisie.

## ✨ Fonctionnalités Principales

### 1. 🤟 Traduction & Accessibilité LSF
- Conversion de texte en **Langue des Signes Française (LSF)**.
- Épellation dactylologique animée.
- Dictionnaire visuel intégré.

### 2. 👨‍🍳 Assistant Chef Tunisien
- **Suggestions de Recettes** : Demandez *"Comment faire un Couscous ?"* ou *"une Ojja"*.
- **Liste d'Ingrédients** : L'assistant liste les produits nécessaires (Semoule, Harissa Sicam, Thon El Manar...).
- **Cuisine Contextuelle** : Adapté aux produits et habitudes tunisiennes.

### 3. 🛒 Magasin & Budget (TND)
- **Produits Locaux** : Catalogue incluant des marques tunisiennes.
- **Gestion du Panier par IA** :
  - *"Ajoute 2kg de couscous"* -> L'assistant l'ajoute.
  - *"C'est trop cher, retire le thon"* -> L'assistant le retire.
- **Analyse Financière** : Vérification du solde bancaire avant achat.
- **Devise** : Tout est en Dinars Tunisiens (TND).

## 🚧 En Cours de Développement (WIP)

Ces fonctionnalités sont en cours d'intégration :
- [ ] **Discussion Vocale Temps Réel** : Conversation fluide avec l'assistant sans taper.
- [ ] **Navigation Gestuelle** : Scroller et cliquer en utilisant des gestes de la main (MediaPipe).
- [ ] **Authentification Biométrique** : Connexion via reconnaissance faciale.

## 🏗️ Architecture Technique

Le projet est divisé en deux parties :

### Frontend (`/frontend`)
- **Framework** : Next.js 16 (React 19, TypeScript).
- **Style** : Tailwind CSS.
- **Fonctionnalités** :
  - `AssistantChat` : Interface de chat avec historique et synthèse vocale.
  - `StorePage` : Magasin e-commerce avec mises à jour temps réel.
  - `SignConverter` : Moteur de traduction LSF.

### Backend (`/backend`)
- **Framework** : FastAPI (Python).
- **IA** : LangChain + OpenAI GPT-4o.
- **Base de Données** : SQLite (SQLAlchemy).
- **Services** :
  - `AgentService` : Cerveau de l'assistant (Outils : Banque, Magasin, Chef).
  - `StoreService` : Gestion catalogue et panier.
  - `BankingService` : Simulation bancaire.

## 🚀 Installation

### Prérequis
- Python 3.9+
- Node.js 18+
- Un compte OpenAI (API Key)

### 1. Backend
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# Configurer .env
echo "OPENAI_API_KEY=votre_cle" > .env
echo "DATABASE_URL=sqlite:///./bank_app.db" >> .env

# Initialiser la DB
python -m app.init_db

# Lancer
uvicorn app.main:app --reload --port 8001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Accédez à **http://localhost:3000**.

## 👥 Auteurs
- **Omar** - *Développeur Principal*
