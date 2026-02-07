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

class UserIdRequest(BaseModel):
    user_id: int

@router.post("/clear")
def clear_cart(request: UserIdRequest, db: Session = Depends(get_db)):
    """Clear all items from user's cart"""
    service = StoreService(db)
    service.clear_cart(request.user_id)
    return {"message": "Cart cleared"}

@router.post("/checkout")
def checkout_cart(request: UserIdRequest, db: Session = Depends(get_db)):
    """Checkout and pay for cart items"""
    service = StoreService(db)
    result = service.checkout(request.user_id)
    if not result:
        raise HTTPException(status_code=400, detail="Checkout failed - cart empty or insufficient balance")
    return {"message": "Checkout successful", "total": result.get("total", 0)}

