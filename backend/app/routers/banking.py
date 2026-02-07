from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.banking_service import BankingService
from typing import List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(
    prefix="/api/banking",
    tags=["banking"],
)

class TransactionResponse(BaseModel):
    id: int
    amount: float
    description: str
    date: datetime
    category: str

    class Config:
        from_attributes = True

@router.get("/balance")
def get_balance(user_id: int = 1, db: Session = Depends(get_db)):
    service = BankingService(db)
    return {"balance": service.get_balance(user_id)}

@router.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(user_id: int = 1, limit: int = 5, db: Session = Depends(get_db)):
    service = BankingService(db)
    return service.get_transactions(user_id, limit)
