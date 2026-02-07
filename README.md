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

## 🚀 Installation Complète (Premier Lancement)

> ⚠️ **SUIVEZ CES ÉTAPES DANS L'ORDRE** pour éviter les problèmes de configuration.

### Prérequis
- **Node.js** v18+ (`node -v`)
- **npm** v9+ (`npm -v`)
- **Git** (`git --version`)
- **Ollama** installé ([ollama.ai](https://ollama.ai))

---

### Étape 1 : Configurer Ollama (IMPORTANT !)

**Avant de lancer l'app**, configurez Ollama pour accepter les connexions réseau :

#### Windows (Variables d'environnement système)

1. `Win + R` → taper `sysdm.cpl` → **Entrée**
2. Onglet **Avancé** → **Variables d'environnement**
3. Dans **Variables système**, cliquer **Nouveau** et ajouter :

| Nom de la variable | Valeur |
|-------------------|--------|
| `OLLAMA_HOST` | `0.0.0.0:11434` |
| `OLLAMA_ORIGINS` | `*` |

4. **OK** pour tout fermer
5. **Redémarrer Ollama** (quitter depuis la barre système, puis relancer)

#### Vérifier que Ollama fonctionne

```bash
# Télécharger le modèle (une seule fois)
ollama pull phi3:instruct

# Vérifier que le serveur répond
curl http://localhost:11434/api/tags
# Doit afficher du JSON avec "phi3:instruct"
```

---

### Étape 2 : Cloner et Installer

```bash
git clone https://github.com/Asembris/MaraTech.git
cd MaraTech
git checkout yassine
git pull origin yassine
npm install
```

---

### Étape 3 : Lancer le Serveur

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:8080` (ou le port affiché).

---

### Étape 4 : Tester le Guide Vocal

1. Ouvrir l'app dans Chrome/Edge
2. Taper dans la zone de texte : `où suis-je`
3. Cliquer **"Tester"**
4. Le guide devrait répondre avec une description de la page

---

## 📱 Test sur Mobile

### Option A : Même WiFi (Simple)

Si votre téléphone et PC sont sur le **même réseau WiFi** :

1. Trouver l'IP du PC :
```bash
ipconfig | findstr "IPv4"
# Exemple: 192.168.1.73
```

2. Ouvrir sur le téléphone : `http://192.168.1.73:8080`

3. **Si ça ne charge pas**, ouvrir le pare-feu (PowerShell Admin) :
```powershell
netsh advfirewall firewall add rule name="Vite Dev" dir=in action=allow protocol=tcp localport=8080
netsh advfirewall firewall add rule name="Ollama" dir=in action=allow protocol=tcp localport=11434
```

### Option B : Hotspot Mobile (Si WiFi bloque)

Certains réseaux WiFi (campus, entreprise) bloquent la communication entre appareils.

1. **Activer le Hotspot Mobile** sur le PC :
   - `Win + I` → Réseau → Point d'accès mobile → **Activer**

2. **Connecter le téléphone** au hotspot du PC

3. **Trouver l'IP du hotspot** (généralement `192.168.137.1`) :
```bash
ipconfig | findstr "192.168.137"
```

4. Ouvrir sur le téléphone : `http://192.168.137.1:8080`

### Option C : ngrok (HTTPS pour micro)

Le micro sur mobile **nécessite HTTPS**. Pour tester la reconnaissance vocale :

```bash
npm install -g ngrok
ngrok config add-authtoken VOTRE_TOKEN  # Créer compte sur ngrok.com
ngrok http 8080
```

Utiliser l'URL `https://` fournie par ngrok.

> ⚠️ Avec ngrok, le guide Ollama ne fonctionnera pas (HTTPS → HTTP bloqué). Utilisez l'option A ou B pour tester Ollama.

---

## 🔧 Dépannage

### "Ollama failed" dans l'app

1. **Vérifier qu'Ollama tourne** : `curl http://localhost:11434/api/tags`
2. **Vérifier les variables d'environnement** : `OLLAMA_HOST=0.0.0.0:11434` et `OLLAMA_ORIGINS=*`
3. **Redémarrer Ollama** après avoir changé les variables

### "403 Forbidden" sur Ollama

→ `OLLAMA_ORIGINS` n'est pas configuré. Voir Étape 1.

### Téléphone ne peut pas accéder au PC

→ Pare-feu Windows bloque. Ouvrir les ports 8080 et 11434 (voir section Mobile).

### Timeout sur le guide

→ Le modèle phi3 peut être lent au premier appel. Attendre jusqu'à 30 secondes.

### Micro ne fonctionne pas sur mobile

→ Le micro **nécessite HTTPS**. Utiliser ngrok ou tester sur PC.

---

## 📂 Structure du Projet

```
src/
├── components/         # Composants UI réutilisables
│   ├── VoiceCommandButton.tsx  # Bouton vocal + panneau debug
│   └── ui/                     # shadcn/ui components
├── hooks/              # Hooks React
│   ├── use-speech-recognition.ts  # Web Speech STT
│   └── use-speech.ts              # Web Speech TTS
├── pages/              # Pages de l'application
└── voice/              # Système vocal
    ├── detectIntent.ts     # Détection d'intention
    ├── voiceController.ts  # Exécution des commandes
    ├── ollamaGuide.ts      # Appel API Ollama (via proxy)
    └── pageContexts.ts     # Contexte par page
```

---

## 👥 Contribution

```bash
# Voir les fichiers modifiés
git status

# Ajouter et committer
git add .
git commit -m "feat: description"

# Pusher
git push origin yassine
```

---

## 📄 Licence

MIT
