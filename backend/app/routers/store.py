from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.store_service import StoreService
from typing import List
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/store",
    tags=["store"],
)

class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    stock: int
    category: str
    description: str

    class Config:
        from_attributes = True

class CartItemResponse(BaseModel):
    product_name: str
    price: float
    quantity: int
    total: float

@router.get("/products", response_model=List[ProductResponse])
def get_products(query: str = "", db: Session = Depends(get_db)):
    service = StoreService(db)
    if query:
        return service.search_products(query)
    return service.search_products("") # Return all or some default

@router.get("/cart", response_model=List[CartItemResponse])
def get_cart(user_id: int = 1, db: Session = Depends(get_db)):
    service = StoreService(db)
    return service.get_cart(user_id)

class AddToCartRequest(BaseModel):
    user_id: int
    product_name: str
    quantity: int = 1

@router.post("/add")
def add_to_cart(request: AddToCartRequest, db: Session = Depends(get_db)):
    service = StoreService(db)
    success = service.add_to_cart(request.user_id, request.product_name, request.quantity)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Added to cart"}

class RemoveFromCartRequest(BaseModel):
    user_id: int
    product_name: str

@router.post("/remove")
def remove_from_cart(request: RemoveFromCartRequest, db: Session = Depends(get_db)):
    service = StoreService(db)
    success = service.remove_from_cart(request.user_id, request.product_name)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    return {"message": "Removed from cart"}

class CheckoutRequest(BaseModel):
    user_id: int

@router.post("/checkout")
def checkout(request: CheckoutRequest, db: Session = Depends(get_db)):
    """Process payment: deduct balance and clear cart"""
    from app.services.banking_service import BankingService
    
    store_service = StoreService(db)
    banking_service = BankingService(db)
    
    # Get cart total
    cart = store_service.get_cart(request.user_id)
    if not cart:
        raise HTTPException(status_code=400, detail="Votre panier est vide")
    
    total = store_service.calculate_cart_total(request.user_id)
    
    # Check balance
    balance = banking_service.get_balance(request.user_id)
    if balance < total:
        raise HTTPException(status_code=400, detail=f"Solde insuffisant. Vous avez {balance:.3f} TND mais le total est {total:.3f} TND")
    
    # Process payment
    success = banking_service.process_payment(request.user_id, total, "Achat en magasin")
    if not success:
        raise HTTPException(status_code=500, detail="Erreur lors du paiement")
    
    # Clear cart
    store_service.clear_cart(request.user_id)
    
    new_balance = banking_service.get_balance(request.user_id)
    
    return {
        "message": f"Commande de {total:.3f} TND effectuée avec succès!",
        "total_paid": total,
        "new_balance": new_balance,
        "items_count": len(cart)
    }

