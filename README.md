# 🌐 ClearPath Access — Plateforme d'Assistance Cognitive & Sensorielle

**Une révolution dans l'accessibilité numérique.** ClearPath Access n'est pas simplement une application web, c'est un **écosystème d'assistance multimodal** conçu pour briser les barrières numériques. En combinant **l'Intelligence Artificielle Générative**, la **Vision par Ordinateur** en temps réel et le **Traitement du Langage Naturel**, nous offrons une expérience utilisateur sans précédent pour les personnes malvoyantes, à mobilité réduite ou âgées.

---

## 🚀 Fonctionnalités Révolutionnaires

### 🧠 Cerveau IA Contextuel (Neural Guidance)
Notre moteur d'IA ne se contente pas de lire l'écran, il le **comprend**.
- **Analyse Sémantique de Page** : L'IA scanne le DOM en temps réel pour comprendre le contexte exact (Banque, Shopping, Traduction).
- **Assistant Proactif** : "Je vois que vous êtes sur votre solde, voulez-vous faire un virement ?"
- **Cuisine & Lifestyle** : Un chef IA intégré capable de générer des recettes étape par étape avec lecture vocale.

### 👁️ Navigation Gestuelle par Vision (GestureControl™)
Oubliez la souris. Contrôlez l'interface par de simples mouvements de la main, capturés en **temps réel par notre moteur de vision embarqué**.
- **Technologie Zero-Latency** : Traitement local (Edge Computing) via MediaPipe pour une latence nulle.
- **Persistance Globale** : La caméra vous suit intelligemment à travers toute l'application.
- **Grammaire Gestuelle Intuitive** :
  - 👍 **Pouce Levé** : Activer/Couper la Voix instantanément.
  - 🖐️ **Main Ouverte** : Scroll Fluide vers le bas (lecture continue).
  - ✊ **Poing Fermé** : Scroll vers le haut (retour arrière).
  - 👉 **Pointage Directionnel** : Navigation fluide entre les modules.
  - ✌️ **Victoire** : Retour immédiat à l'Accueil (Home Jump).

### 🗣️ Interface Vocale Bidirectionnelle
- **Traitement du Langage Naturel (NLP)** : Parlez naturellement, le système comprend vos intentions ("Je veux acheter du lait" -> Ajout au panier).
- **Synthèse Vocale Neuronale** : Retours vocaux naturels et empathiques pour chaque action.
- **Commandes Universelles** : Contrôle total de l'interface par la voix.

---

## ⚡ Architecture Technique (State-of-the-Art)

ClearPath Access repose sur une stack technologique moderne, robuste et sécurisée.

| Couche | Technologies |
|--------|--------------|
| **Frontend Core** | **React 18** (Concurrent Mode), **TypeScript** (Strict Mode), **Vite** (Build optimisé) |
| **Vision Engine** | **MediaPipe Hands** (Google) accéléré par WebGL pour le tracking squelettique 3D |
| **Logic Layer** | **Ollama** (LLM Local phi3/mistral) + **FastAPI** (Python High-Performance) |
| **State Management** | **Context API** avec persistance de session et gestion d'états complexes |
| **Accessibilité** | **WCAG 2.1 AA Compliant**, Semantic HTML5, ARIA Live Regions dynamiques |
| **Styling** | **Tailwind CSS** (JIT Engine) + **Shadcn/UI** (Radix Primitives) pour une UI adaptative |

---

## 🔒 Sécurité & Confidentialité par Design

- **Traitement Local (Privacy-First)** : L'analyse vidéo et la reconnaissance vocale peuvent fonctionner en local.
- **Sanitisation Git** : Protection avancée des secrets et variables d'environnement.
- **Aucun stockage biométrique** : Les flux vidéo sont traités en mémoire volatile et jamais enregistrés.

---

## 🛠️ Guide de Déploiement

### Prérequis Système
- **Runtime** : Node.js v18+ & Python 3.10+
- **IA Engine** : Ollama (Service local)
- **Matériel** : Webcam standard (suffisant grâce à notre optimisation)

### 1. Installation du Cœur
```bash
git clone https://github.com/Asembris/MaraTech.git
cd MaraTech
npm install
```

### 2. Démarrage de l'Écosystème
```bash
# Lance le frontend, le proxy vocal et connecte l'IA
npm run dev
```

### 3. Connexion du Serveur d'IA (Optionnel pour fonctionnalités avancées)
```bash
# Dans un nouveau terminal
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

---

## 🌟 Modules Intégrés

### 🏦 Banque Accessible
Interface financière simplifiée avec gros caractères, contrastes élevés et validation vocale des transactions.

### 🛒 Shopping Assistant
Liste de courses intelligente qui mémorise vos habitudes et suggère des produits. Commandez par la voix : *"Ajoute 6 œufs"*.

### 🤟 Traducteur LSF (Langue des Signes)
Module éducatif convertissant le texte en **Langue des Signes Française** avec avatar virtuel et reconnaissance de signes via caméra.

---

## 🤝 Contribution & Communauté

Ce projet est Open Source. Nous croyons en un web ouvert et accessible à tous.
Rejoignez-nous pour construire le futur de l'accessibilité.

**Licence** : MIT
**Développé avec ❤️ par l'équipe MaraTech**
