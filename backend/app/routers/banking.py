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

class TransferRequest(BaseModel):
    user_id: int
    amount: float
    recipient: str

@router.post("/transfer")
def transfer(request: TransferRequest, db: Session = Depends(get_db)):
    """Process a bank transfer: deduct balance and create transaction"""
    service = BankingService(db)
    
    # Check balance
    current_balance = service.get_balance(request.user_id)
    if current_balance < request.amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Solde insuffisant. Vous avez {current_balance:.3f} TND mais le virement est de {request.amount:.3f} TND"
        )
    
    # Process payment
    description = f"Virement vers {request.recipient}"
    success = service.process_payment(request.user_id, request.amount, description)
    if not success:
        raise HTTPException(status_code=500, detail="Erreur lors du virement")
    
    new_balance = service.get_balance(request.user_id)
    
    return {
        "message": f"Virement de {request.amount:.3f} TND vers {request.recipient} effectué!",
        "amount": request.amount,
        "new_balance": new_balance,
        "recipient": request.recipient
    }

