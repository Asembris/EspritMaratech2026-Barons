# Backend API - SignLink

FastAPI backend pour l'application de langue des signes.

## Structure

```
backend/
├── app/
│   ├── main.py          # Point d'entrée
│   ├── routers/         # Routes API
│   ├── services/        # Logique métier
│   ├── models/          # Modèles Pydantic
│   └── utils/           # Utilitaires
├── requirements.txt
└── .env
```

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Lancement

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `GET /api/health` - Status du serveur
- `POST /api/convert` - Convertir texte en gloss
- `GET /api/signs` - Liste des signes disponibles
- `GET /api/elix/{word}` - Lien vidéo Dico Elix
