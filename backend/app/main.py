"""
SignLink API - Backend FastAPI
Application de traduction en Langue des Signes
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routers import signs, convert, health, assistant, banking, store, auth

# Créer l'application FastAPI
app = FastAPI(
    title="SignLink API",
    description="API pour la conversion de texte en Langue des Signes Française",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuration CORS pour le frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir les images de signes statiquement
signs_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "signs")
if os.path.exists(signs_path):
    app.mount("/static/signs", StaticFiles(directory=signs_path), name="signs")

# Inclure les routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(signs.router, prefix="/api", tags=["Signs"])
app.include_router(convert.router, prefix="/api", tags=["Convert"])
app.include_router(assistant.router)
app.include_router(banking.router)
app.include_router(store.router)
app.include_router(auth.router)

@app.get("/")
async def root():
    return {
        "message": "SignLink API",
        "version": "1.0.0",
        "docs": "/docs"
    }
