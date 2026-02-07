"""
Router pour les signes - liste et informations
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict
import os

router = APIRouter()

# Mapping des signes disponibles
SIGNS_DATA = {
    "letters": list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    "numbers": ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
}

@router.get("/signs")
async def list_signs() -> Dict:
    """Liste tous les signes disponibles"""
    return {
        "letters": SIGNS_DATA["letters"],
        "numbers": SIGNS_DATA["numbers"],
        "total": len(SIGNS_DATA["letters"]) + len(SIGNS_DATA["numbers"])
    }

@router.get("/signs/{character}")
async def get_sign(character: str) -> Dict:
    """Récupérer les informations d'un signe spécifique"""
    char = character.upper()
    
    if char in SIGNS_DATA["letters"]:
        return {
            "character": char,
            "type": "letter",
            "image_url": f"/static/signs/letter_{char.lower()}.png",
            "available": True
        }
    elif char in SIGNS_DATA["numbers"]:
        return {
            "character": char,
            "type": "number",
            "image_url": f"/static/signs/num_{char}.png",
            "available": True
        }
    else:
        raise HTTPException(status_code=404, detail=f"Sign '{character}' not found")

@router.get("/signs/spell/{text}")
async def spell_text(text: str) -> List[Dict]:
    """Épeler un texte lettre par lettre avec les images"""
    result = []
    for char in text.upper():
        if char == " ":
            result.append({"character": " ", "type": "space", "image_url": None})
        elif char in SIGNS_DATA["letters"]:
            result.append({
                "character": char,
                "type": "letter",
                "image_url": f"/static/signs/letter_{char.lower()}.png"
            })
        elif char in SIGNS_DATA["numbers"]:
            result.append({
                "character": char,
                "type": "number",
                "image_url": f"/static/signs/num_{char}.png"
            })
    return result
