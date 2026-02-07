from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.agent_service import AgentService
from pydantic import BaseModel
import logging

router = APIRouter(
    prefix="/api/assistant",
    tags=["assistant"],
    responses={404: {"description": "Not found"}},
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    user_id: int = 1

@router.post("/chat")
async def chat_with_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        agent = AgentService(db)
        # Convert history format if needed, but AgentService can handle list of dicts or objects
        # We will pass the history to process_query
        response = agent.process_query(request.message, user_id=request.user_id, history=request.history)
        return {"response": response}
    except Exception as e:
        logging.error(f"Error in chat_with_assistant: {e}")
        raise HTTPException(status_code=500, detail=str(e))
