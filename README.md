# ClearPath Access

**🎯 Une plateforme web accessible avec guidage vocal intelligent**

Application React conçue pour l'accessibilité universelle — utilisable par les personnes malvoyantes, à mobilité réduite et les seniors. Chaque fonctionnalité est accessible au clavier, compatible lecteur d'écran, et enrichie par des retours vocaux en français.

---

## ✨ Fonctionnalités

### 🎙️ Commandes Vocales (Français)
- **Navigation vocale** : "accueil", "banque", "courses", "accessibilité"
- **Lecture de page** : "lis la page", "décris"
- **Guide intelligent** : "où suis-je ?", "que puis-je faire ici ?", "explique cette page"
- **Aide** : "aide", "commandes"

### 📱 Pages
| Page | Description |
|------|-------------|
| **Accueil** | Présentation de la plateforme et navigation principale |
| **Banque** | Consultation du solde et simulation de virements |
| **Courses** | Gestion de liste de courses |
| **Accessibilité** | Réglages taille du texte et contraste élevé |

### ♿ Accessibilité WCAG 2.1 AA
- Skip-to-content
- Focus visible sur tous les éléments interactifs
- Annonces vocales des changements de page
- Labels ARIA complets
- Alternatives clavier pour toutes les actions

---

## 🛠️ Stack Technique

- **Frontend** : React 18 + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui (Radix primitives)
- **Routing** : React Router DOM
- **Voice** : Web Speech API (STT/TTS)
- **AI Guide** : Ollama (phi3:instruct) pour le guidage contextuel

---

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/Asembris/MaraTech.git
cd MaraTech
git checkout yassine

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera disponible sur `http://localhost:8080`

---

## 📱 Test sur Mobile

Pour tester sur mobile avec les commandes vocales (nécessite HTTPS) :

```bash
# Installer ngrok
npm install -g ngrok

# Configurer (une seule fois)
ngrok config add-authtoken VOTRE_TOKEN

# Lancer le tunnel
ngrok http 8080
```

Utilisez l'URL `https://` fournie par ngrok sur votre mobile.

---

## 🤖 Configuration Ollama (Guide Intelligent)

Le guide vocal utilise Ollama pour répondre aux questions contextuelles.

### Installation
1. Installer [Ollama](https://ollama.ai)
2. Télécharger le modèle : `ollama pull phi3:instruct`
3. Créer un fichier `.env` :

```env
VITE_OLLAMA_URL=http://localhost:11434
```

### Pour accès depuis mobile
```env
VITE_OLLAMA_URL=http://VOTRE_IP_PC:11434
```

Et lancer Ollama avec :
```powershell
$env:OLLAMA_HOST="0.0.0.0:11434"; ollama serve
```

---

## 📋 Travaux en Cours

### 🔴 En Progression
- [ ] **Intégration Ollama complète** — Le modèle phi3:instruct fonctionne localement, mais l'accès réseau (depuis mobile) nécessite configuration manuelle de `OLLAMA_HOST`
- [ ] **Tests mobiles** — Les commandes vocales requièrent HTTPS (via ngrok)
- [ ] **Persistence des données** — Liste de courses et paramètres stockés en localStorage (pas de backend)

### ✅ Terminé
- [x] Navigation vocale complète (français)
- [x] Détection d'intentions par mots-clés
- [x] Lecture de page à voix haute
- [x] Guide contextuel avec prompts structurés
- [x] Panneau de debug pour diagnostic STT/TTS
- [x] Paramètres d'accessibilité (taille texte, contraste)
- [x] UI accessible WCAG 2.1 AA

### 🔜 À Venir
- [ ] Support multilingue
- [ ] Intégration API bancaire réelle
- [ ] Mode hors-ligne (Service Worker)
- [ ] Tests automatisés complets

---

## 📂 Structure du Projet

```
src/
├── components/         # Composants UI réutilisables
│   ├── VoiceCommandButton.tsx  # Bouton vocal + panneau debug
│   ├── AccessibleButton.tsx    # Bouton accessible
│   └── ui/                     # shadcn/ui components
├── hooks/              # Hooks React
│   ├── use-speech-recognition.ts  # Web Speech STT
│   ├── use-speech.ts              # Web Speech TTS
│   └── use-accessibility.tsx      # Contexte accessibilité
├── pages/              # Pages de l'application
│   ├── Index.tsx       # Accueil
│   ├── Banking.tsx     # Banque
│   ├── Shopping.tsx    # Courses
│   └── Accessibility.tsx  # Paramètres
└── voice/              # Système vocal
    ├── detectIntent.ts     # Détection d'intention
    ├── voiceController.ts  # Exécution des commandes
    ├── ollamaGuide.ts      # Appel API Ollama
    ├── pageContexts.ts     # Contexte par page
    └── guideSystemPrompt.ts  # Prompt système LLM
```

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch
```

---

## 👥 Équipe

Projet développé dans le cadre d'un hackathon accessibilité.

---

## 📄 Licence

MIT
