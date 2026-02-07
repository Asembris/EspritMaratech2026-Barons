from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from openai import OpenAI
import os
import json

router = APIRouter(
    prefix="/api/agent",
    tags=["agent"]
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class CommandRequest(BaseModel):
    command: str
    current_page: str = "/"

@router.post("/command")
async def process_voice_command(request: CommandRequest):
    """
    Interprets a voice command and returns a structured action.
    """
    print(f"DEBUG: Processing voice command: '{request.command}' on page '{request.current_page}'")
    
    system_prompt = """
    You are an AI Voice Assistant for an Accessibility App (SignLink).
    Your job is to translate imperfect spoken commands into structured JSON actions for the frontend.
    
    The user might speak in French, Darija, or English.
    Because of accent or microphone quality, "Banque" might sound like "Bonk", "Bank", "Bang", "Banc".
    "Magasin" might sound like "Magazine", "Maga", "Zin".
    
    ALWAYS guess the user's intent even if the word is not exact.
    
    AVAILABLE ACTIONS:
    AVAILABLE ACTIONS:
    1. NAVIGATION: Go to a specific page.
       - "Accueil", "Home", "Maison" -> "/"
       - "Banque", "Bonk", "Bank", "Banc", "Bon", "Bond", "Argent", "Solde" -> "/banking"
       - "Magasin", "Achat", "Produits", "Course", "Magazine", "Maga" -> "/store"
       - "Traducteur", "Signes", "Traduire", "Main" -> "/translate"
       - "Onboarding", "Réglages", "Configuration" -> "/onboarding"
       
    2. SCROLL: Scroll the page.
       - "Descends", "En bas", "Plus bas" -> "SCROLL_DOWN"
       - "Monte", "En haut", "Plus haut" -> "SCROLL_UP"
       
    3. GO_BACK: Go back in history.
       - "Retour", "Reviens", "Arrière" -> "GO_BACK"

    OUTPUT FORMAT (JSON ONLY):
    {
        "type": "NAVIGATE" | "SCROLL" | "GO_BACK" | "CHECK_BALANCE" | "CHECK_HISTORY" | "LOGOUT" | "OPEN_CHAT" | "CLEAR_CART" | "CONFIRM_CART" | "ADD_TO_CART" | "PAUSE_LISTEN" | "RESUME_LISTEN" | "UNKNOWN",
        "payload": "/path" | "direction" | {"product": "name", "quantity": 1} | null,
        "message": "Short confirmation message to speak aloud (in French)."
    }
    
    AVAILABLE ACTIONS:
    1. NAVIGATION:
       - "Accueil", "Home" -> "NAVIGATE" "/"
       - "Banque", "Argent" -> "NAVIGATE" "/banking"
       - "Magasin", "Courses" -> "NAVIGATE" "/store"
       - "Traducteur" -> "NAVIGATE" "/translate"
       
    2. SCROLL: "Descends", "Monte".
    
    3. CHECK_BALANCE: "Solde", "Combien argent", "Flous".
    4. CHECK_HISTORY: "Historique", "Achats".
    5. LOGOUT: "Déconnexion", "Sortir".
    6. OPEN_CHAT: "Ouvre assistant", "Aide", "Parler".
    
    7. CART ACTIONS:
       - "Vider panier" -> "CLEAR_CART"
       - "Payer", "Confirmer" -> "CONFIRM_CART"
       - "Ajouter Harissa" -> "ADD_TO_CART" {"product": "Harissa", "quantity": 1}
       - "Ajouter Thon" -> "ADD_TO_CART" {"product": "Thon", "quantity": 1}
    
    8. VOICE CONTROL:
       - "Stop", "Pause", "Arrête", "Silence" -> "PAUSE_LISTEN"
       - "Écoute", "Reprends", "Continue", "Réveille" -> "RESUME_LISTEN"
       
    EXAMPLES:
    - "Solde" -> {"type": "CHECK_BALANCE", "payload": null, "message": "Je vérifie votre solde."}
    - "Historique" -> {"type": "CHECK_HISTORY", "payload": null, "message": "Je consulte votre historique."}
    - "Historique de transactions" -> {"type": "CHECK_HISTORY", "payload": null, "message": "Voici vos transactions."}
    - "Assistant" -> {"type": "OPEN_CHAT", "payload": null, "message": "J'ouvre l'assistant."}
    - "Ouvre l'assistant" -> {"type": "OPEN_CHAT", "payload": null, "message": "J'ouvre l'assistant."}
    - "Aide" -> {"type": "OPEN_CHAT", "payload": null, "message": "Comment puis-je vous aider?"}
    - "Ajoute Harissa" -> {"type": "ADD_TO_CART", "payload": {"product": "Harissa", "quantity": 1}, "message": "J'ajoute de la Harissa."}
    - "Ajouter du thon" -> {"type": "ADD_TO_CART", "payload": {"product": "Thon", "quantity": 1}, "message": "J'ajoute du thon au panier."}
    - "Ajoute des tomates" -> {"type": "ADD_TO_CART", "payload": {"product": "Tomates", "quantity": 1}, "message": "J'ajoute des tomates."}
    - "Vider le panier" -> {"type": "CLEAR_CART", "payload": null, "message": "Je vide le panier."}
    - "Payer" -> {"type": "CONFIRM_CART", "payload": null, "message": "Je confirme votre commande."}
    - "Commander" -> {"type": "CONFIRM_CART", "payload": null, "message": "Je valide votre achat."}
    - "Déconnexion" -> {"type": "LOGOUT", "payload": null, "message": "Je vous déconnecte."}
    - "Stop" -> {"type": "PAUSE_LISTEN", "payload": null, "message": "Je me mets en pause."}
    - "Écoute" -> {"type": "RESUME_LISTEN", "payload": null, "message": "Je vous écoute."}
    """
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context: {request.current_page}. User said: {request.command}"}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        response_text = completion.choices[0].message.content
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Agent Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
