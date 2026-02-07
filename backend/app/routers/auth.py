from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)

class LoginRequest(BaseModel):
    email: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str

    class Config:
        from_attributes = True

@router.post("/login", response_model=UserResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # For demo purposes, auto-create if not exists or return error. 
        # Let's return error to enforce using seeded user 'omar'
        raise HTTPException(status_code=404, detail="User not found")
    return user
