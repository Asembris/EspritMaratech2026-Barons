# MaraTech - Assistant IA Tunisien Inclusif & Accessible 🇹🇳

Une plateforme innovante combinant **Intelligence Artificielle**, **Accessibilité (LSF)** et **Inclusion Financière** pour le quotidien en Tunisie.

## ✨ Fonctionnalités Clés

### 1. 🗣️ Interaction Vocale & Traduction (Nouveau)
- **Reconnaissance Vocale Universelle** : Parlez en **Tunisien (Derja)**, Français ou Anglais.
- **Auto-Correction IA** : L'assistant (GPT-4o-mini) traduit et reformule automatiquement votre demande en Français formel.
- **Synthèse Vocale** : Réponse audio naturelle.

### 2. 🎙️ Agent Vocal Global (Nouveau - v2.0)
L'application dispose maintenant d'un **Agent de Navigation Vocale** permettant de contrôler entièrement l'application à la voix, sans utiliser la souris.

#### Commandes Vocales Supportées :
| Commande | Action | Exemple |
|:---|:---|:---|
| **Navigation** | Aller à une page | *"Banque"*, *"Magasin"*, *"Accueil"* |
| **Solde** | Consulter le solde | *"Quel est mon solde ?"*, *"Combien j'ai ?"* |
| **Historique** | Voir les transactions | *"Historique"*, *"Derniers achats"* |
| **Panier** | Ajouter des produits | *"Ajoute Harissa"*, *"Ajouter du Thon"* |
| **Vider Panier** | Supprimer tout le panier | *"Vider le panier"*, *"Supprimer tout"* |
| **Payer** | Confirmer la commande | *"Payer"*, *"Commander"*, *"Confirmer"* |
| **Assistant** | Ouvrir le chat IA | *"Assistant"*, *"Aide"*, *"Ouvre l'aide"* |
| **Déconnexion** | Se déconnecter | *"Déconnexion"*, *"Sortir"* |
| **Scroll** | Défiler la page | *"Descends"*, *"Monte"* |

#### Fonctionnalités Avancées :
- **Auto-Résumé** : Quand vous naviguez vers une page, l'agent annonce automatiquement où vous êtes et ce que vous pouvez faire.
- **Reconnaissance Phonétique** : "Bonk" → "Banque", "Salah" → "Panier" (Correction automatique IA).
- **Multi-langue** : Compréhension du Darija, Français et Anglais.

### 3. 🤟 Accessibilité LSF (Langue des Signes)
- Conversion de texte en vidéo LSF via Avatar.
- Dictionnaire de signes intégré.
- Support pour les malentendants.

### 4. 👨‍🍳 Assistant Chef Tunisien
- **Recettes Locales** : *"Comment faire un Couscous ?"*, *"Recette Ojja"*.
- **Gestion d'Ingrédients** : Liste intelligente des produits nécessaires.

### 5. 🛒 E-Commerce & Budget (TND)
- **Produits Locaux** : Catalogue incluant des marques tunisiennes (Sicam, El Manar, etc.).
- **Assistant Shopping** : 
  - *"Ajoute 2kg de couscous"* -> Action automatique.
  - *"Est-ce que j'ai assez d'argent ?"* -> Vérification du solde bancaire.
- **Devise** : Dinar Tunisien (TND).

### 6. 🔐 Sécurité & Multi-Utilisateurs (Renforcé)
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

## 🤖 Architecture Multi-Agents (SignLink Brain)
Le cœur du système repose sur un **Orchestrateur Intelligent** (LangChain + GPT-4o-mini) qui sélectionne dynamiquement les outils nécessaires selon la demande de l'utilisateur.

### 🧠 Cerveau Central (`AgentService`)
- **Modèle** : GPT-4o-mini (Optimisé pour la latence et le coût).
- **Mémoire** : Maintient le contexte de la conversation (ex: "Combien ça coûte ?" -> Sait de quel produit on parle).
- **Sécurité** : Injection automatique du `user_id` dans chaque outil (Closure Pattern).

### 🛠️ Agents & Outils Spécialisés

1. **🎙️ Agent Vocal (`VoiceControlManager` + `agent_listener.py`)**
   - **Frontend** : Écoute les commandes via Spacebar PTT ou bouton micro.
   - **Backend** : Interprète les commandes avec GPT-4o-mini.
   - **Intents Supportés** :
     - `NAVIGATE` : Navigation entre pages.
     - `CHECK_BALANCE`, `CHECK_HISTORY` : Actions bancaires.
     - `ADD_TO_CART`, `CLEAR_CART`, `CONFIRM_CART` : Gestion panier.
     - `OPEN_CHAT`, `LOGOUT`, `SCROLL` : Contrôle UI.
   - **Pipeline** : Audio → Whisper → Correction IA → Agent → Action Frontend.

2.  **Agent Bancaire (`BankingService`)**
    - `check_balance` : Consultation solde sécurisée.
    - `get_transaction_history` : Analyse des dépenses.
    - `transfer_money` : Virements internes (Omar <-> Alice).

3.  **Agent Commercial (`StoreService`)**
    - `search_product` : Recherche floue (ex: "Harrissa" -> "Harissa Sicam").
    - `check_product_stock_price` : Vérification temps réel.
    - `manage_cart` : Ajout/Suppression, Calcul total.
    - `checkout_cart` : Validation et paiement.
    - `clear_cart` : Vider le panier (Nouveau).

4.  **Agent de Recommandation**
    - `recommend_products` : Analyse l'historique d'achat pour suggérer des produits pertinents (ex: Si achat de pâtes -> Suggère Tomate/Fromage).

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
