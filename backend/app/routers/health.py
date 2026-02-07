"""
Health check endpoint
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """Vérifier que l'API fonctionne"""
    return {
        "status": "healthy",
        "service": "SignLink API",
        "version": "1.0.0"
    }
