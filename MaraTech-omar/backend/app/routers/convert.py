"""
Router pour la conversion de texte en gloss LSF
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional
import re

from app.services.llm_service import llm_service

router = APIRouter()

# Règles de conversion français → gloss LSF
GLOSS_RULES = {
    # Articles - souvent omis en LSF
    r'\b(le|la|les|l\'|un|une|des)\b': '',
    
    # Verbes être - structure différente
    r'\b(suis|es|est|sommes|êtes|sont)\b': 'ÊTRE',
    r'\b(étais|était|étions|étiez|étaient)\b': 'ÊTRE PASSÉ',
    
    # Pronoms
    r'\bje\b': 'MOI',
    r'\btu\b': 'TOI',
    r'\bil\b': 'LUI',
    r'\belle\b': 'ELLE',
    r'\bnous\b': 'NOUS',
    r'\bvous\b': 'VOUS',
    r'\bils\b': 'EUX',
    r'\belles\b': 'ELLES',
    
    # Négation
    r'\bne\s+\w+\s+pas\b': 'NON',
    r'\bpas\b': 'NON',
    
    # Mots courants
    r'\bbonjour\b': 'BONJOUR',
    r'\bmerci\b': 'MERCI',
    r'\bs\'il vous plaît\b': 'SVP',
    r'\bau revoir\b': 'AU-REVOIR',
    r'\bcomment\b': 'COMMENT',
    r'\bpourquoi\b': 'POURQUOI',
    r'\bquand\b': 'QUAND',
    r'\boù\b': 'OÙ',
    r'\bqui\b': 'QUI',
    r'\bquoi\b': 'QUOI',
}

class ConvertRequest(BaseModel):
    text: str
    include_fingerspelling: Optional[bool] = True
    use_llm: Optional[bool] = False  # New: use LLM for summarization

class ConvertResponse(BaseModel):
    original: str
    gloss: str
    words: List[str]
    fingerspelling: Optional[List[Dict]] = None
    summarized: Optional[str] = None  # New: LLM-summarized text
    llm_used: Optional[bool] = False

@router.post("/convert", response_model=ConvertResponse)
async def convert_to_gloss(request: ConvertRequest) -> ConvertResponse:
    """Convertir du texte français en notation gloss LSF"""
    
    original_text = request.text
    text_to_convert = request.text.lower().strip()
    summarized = None
    llm_used = False
    
    # Use LLM to summarize if requested
    if request.use_llm and llm_service.is_available():
        summarized = await llm_service.summarize_for_signs(request.text)
        text_to_convert = summarized.lower()
        llm_used = True
    elif request.use_llm:
        # Fallback to basic simplification
        summarized = llm_service._basic_simplify(request.text)
        text_to_convert = summarized.lower()
    
    gloss = text_to_convert
    
    # Appliquer les règles de conversion
    for pattern, replacement in GLOSS_RULES.items():
        gloss = re.sub(pattern, replacement, gloss, flags=re.IGNORECASE)
    
    # Nettoyer et formater
    gloss = re.sub(r'\s+', ' ', gloss).strip().upper()
    words = [w for w in gloss.split() if w]
    
    # Générer le fingerspelling - use summarized text if available
    fingerspelling = None
    fingerspelling_text = summarized if summarized else original_text
    
    if request.include_fingerspelling:
        fingerspelling = []
        for char in fingerspelling_text.upper():
            if char.isalpha():
                fingerspelling.append({
                    "character": char,
                    "type": "letter",
                    "image_url": f"/static/signs/letter_{char.lower()}.png"
                })
            elif char.isdigit():
                fingerspelling.append({
                    "character": char,
                    "type": "number",
                    "image_url": f"/static/signs/num_{char}.png"
                })
            elif char == " ":
                fingerspelling.append({
                    "character": " ",
                    "type": "space",
                    "image_url": None
                })
    
    return ConvertResponse(
        original=original_text,
        gloss=gloss,
        words=words,
        fingerspelling=fingerspelling,
        summarized=summarized,
        llm_used=llm_used
    )

@router.post("/summarize")
async def summarize_text(request: ConvertRequest) -> Dict:
    """Résumer le texte avec l'IA pour la traduction en signes"""
    
    if not llm_service.is_available():
        # Use basic fallback
        simplified = llm_service._basic_simplify(request.text)
        return {
            "original": request.text,
            "summarized": simplified,
            "llm_available": False,
            "method": "basic"
        }
    
    summarized = await llm_service.summarize_for_signs(request.text)
    
    return {
        "original": request.text,
        "summarized": summarized,
        "llm_available": True,
        "method": "openai"
    }

@router.get("/elix/{word}")
async def get_elix_link(word: str) -> Dict:
    """Récupérer le lien Dico Elix pour un mot"""
    base_url = "https://dico.elix-lsf.fr/dictionnaire"
    return {
        "word": word,
        "elix_url": f"{base_url}/{word.lower()}",
        "search_url": f"{base_url}?search={word.lower()}"
    }
