# MaraTech - Assistant IA Tunisien Inclusif & Accessible 🇹🇳

Une plateforme innovante combinant **Intelligence Artificielle**, **Accessibilité (LSF)** et **Inclusion Financière** pour le quotidien en Tunisie.

## ✨ Fonctionnalités Clés

### 1. 🗣️ Interaction Vocale & Traduction (Nouveau)
- **Reconnaissance Vocale Universelle** : Parlez en **Tunisien (Derja)**, Français ou Anglais.
- **Auto-Correction IA** : L'assistant (GPT-4o-mini) traduit et reformule automatiquement votre demande en Français formel.
- **Synthèse Vocale** : Réponse audio naturelle.

### 2. 🤟 Accessibilité LSF (Langue des Signes)
- Conversion de texte en vidéo LSF via Avatar.
- Dictionnaire de signes intégré.
- Support pour les malentendants.

### 3. 👨‍🍳 Assistant Chef Tunisien
- **Recettes Locales** : *"Comment faire un Couscous ?"*, *"Recette Ojja"*.
- **Gestion d'Ingrédients** : Liste intelligente des produits nécessaires.

### 4. 🛒 E-Commerce & Budget (TND)
- **Produits Locaux** : Catalogue incluant des marques tunisiennes (Sicam, El Manar, etc.).
- **Assistant Shopping** : 
  - *"Ajoute 2kg de couscous"* -> Action automatique.
  - *"Est-ce que j'ai assez d'argent ?"* -> Vérification du solde bancaire.
- **Devise** : Dinar Tunisien (TND).

### 5. 🔐 Sécurité & Multi-Utilisateurs (Renforcé)
- **Isolation Stricte des Données** : Architecture backend refondue pour empêcher tout accès croisé aux données.
- **Session Unique** : Chaque requête API est validée par l'ID utilisateur actif.
- **Protection par Défaut** : L'assistant et le panier refusent toute opération sans authentification explicite.
- **Profils** : Alice (Invité) et Omar (Admin/Démo).

---

## 📅 Hackathon Esprit MaraTech 2026
**Équipe** : Les Barons
**Repository** : [GitHub - EspritMaratech2026-Barons](https://github.com/Asembris/EspritMaratech2026-Barons.git)

## 🏗️ Architecture Technique

Le projet repose sur une architecture moderne micro-services :

### Frontend (`/frontend`) - Port 3003
- **Framework** : Next.js 16 (React 19, TypeScript).
- **UI** : Tailwind CSS, Lucide React.
- **Audio** : MediaRecorder API + Web Audio.

### Backend (`/backend`) - Port 8000
- **API** : FastAPI (Python).
- **IA** : 
  - **LangChain** : Orchestration des agents.
  - **OpenAI GPT-4o-mini** : Intelligence conversationnelle et traduction.
  - **Whisper** : Transcription vocale.
- **Database** : SQLite (SQLAlchemy) pour utilisateurs, produits et transactions.

---

## 🚀 Installation & Démarrage

### Prérequis
- Python 3.10+
- Node.js 18+
- Clé API OpenAI (dans `backend/.env`)

### Démarrage Rapide (Windows)

Le script automatisé lance tout l'environnement :

```powershell
.\start_app.ps1
```

Cela ouvrira :
1. Une fenêtre pour le **Backend** (Port 8000).
2. Une fenêtre pour le **Frontend** (Port 3003).
3. Votre navigateur par défaut sur l'application.

---

## 🛠️ Commandes Manuelles

Si vous préférez lancer manuellement :

**Backend :**
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend :**
```bash
cd frontend
npm install
npm run build
npm start -- -p 3003
```

---

## 🧪 Utilisation & Données de Test

### 1. Base de Données (SQLite)
La base de données (`backend/bank_app.db`) est pré-chargée avec des données de test.
Pour **réinitialiser** la base de données à zéro, exécutez :
```bash
cd backend
python -m app.init_db
```

### 2. Comptes Utilisateurs
L'authentification est simplifiée pour la démonstration (pas de mot de passe).

| Utilisateur | Email à saisir | Solde Compte Courant | Solde Épargne |
| :--- | :--- | :--- | :--- |
| **Omar** | `omar@example.com` | **2.500 TND** | **10.000 TND** |
| **Alice** | `alice@example.com` | **500 TND** | 0 TND |

### 3. Catalogue Produits (Exemples)
Le marché contient des produits locaux réels avec gestion de stock :
- **Alimentation** : Harissa Sicam, Thon El Manar, Couscous Diari, Huile d'Olive...
- **Frais** : Oeufs, Merguez, Pois Chiches...
- **Artisanat** : Cage Sidi Bou Said, Fouta, Service à Thé.
- **Tech** : Smartphone, TV.

### 4. Scénarios de Test (IA)
1.  **Cuisine** : *"Donne-moi la recette du Lablabi et ajoute les ingrédients au panier."*
2.  **Budget** : *"Mon solde me permet-il d'acheter la TV ?"*
3.  **Traduction** : Parlez en **Tunisien**, l'assistant vous répondra en Français.

---

### 6. 📱 Test Mobile (Réseau Local)
Un script dédié permet de tester l'application sur smartphone via le Wi-Fi local :
```powershell
.\start_mobile.ps1
```
Il configure automatiquement :
- L'IP locale.
- Les ports pare-feu (3003/8000).
- Le lien API pour le téléphone.

### 7. 📊 Observabilité (LangSmith)
Traçage complet des requêtes LLM via LangSmith.
- **Projet** : `MaraTech`
- **Métriques** : Latence, Coût, Input/Output.

---

## 👥 Auteurs
- **Omar** : Développeur Fullstack & IA.
- **MaraTech Team**.
