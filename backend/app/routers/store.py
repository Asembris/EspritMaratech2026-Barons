from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.store_service import StoreService
from app.services.vector_search_service import get_vector_search_service
from typing import List, Optional
from pydantic import BaseModel
import os

router = APIRouter(
    prefix="/api/store",
    tags=["store"],
)

# ===========================
# Response Models
# ===========================

class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    stock: int
    category: str
    description: str

    class Config:
        from_attributes = True

class VectorProductResponse(BaseModel):
    """Product from vector search (Qdrant)."""
    product_id: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[str] = None
    image_file: Optional[str] = None
    category_folder: Optional[str] = None
    score: Optional[float] = None

class CartItemResponse(BaseModel):
    product_name: str
    price: float
    quantity: int
    total: float

class CollectionInfoResponse(BaseModel):
    name: str
    vectors_count: Optional[int] = None
    points_count: Optional[int] = None
    status: Optional[str] = None
    error: Optional[str] = None

# ===========================
# Vector Search Endpoints
# ===========================

@router.get("/vector/info", response_model=CollectionInfoResponse)
def get_collection_info():
    """Get information about the Qdrant vector collection."""
    service = get_vector_search_service()
    return service.get_collection_info()

@router.get("/vector/products", response_model=List[VectorProductResponse])
def get_vector_products(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Get all products from vector database (paginated)."""
    service = get_vector_search_service()
    return service.get_all_products(limit=limit, offset=offset)

@router.get("/vector/search", response_model=List[VectorProductResponse])
def search_products_vector(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50)
):
    """Search products using semantic/AI similarity."""
    service = get_vector_search_service()
    return service.search_by_text(q, limit=limit)

@router.post("/vector/search/image", response_model=List[VectorProductResponse])
async def search_products_by_image(
    file: UploadFile = File(...),
    limit: int = Query(10, ge=1, le=50)
):
    """Search products by uploading an image."""
    contents = await file.read()
    service = get_vector_search_service()
    return service.search_by_image(contents, limit=limit)

@router.get("/vector/image/{category_folder}/{image_file}")
def get_product_image(category_folder: str, image_file: str):
    """Serve product images from data folder."""
    # Get the backend directory (where app folder resides)
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    
    # Try multiple paths - prioritize local data folder
    base_paths = [
        os.path.join(backend_dir, "data", category_folder, "images", image_file),
        os.path.join("d:/EspritMaratech2026-Barons-omar/data", category_folder, "images", image_file),
        os.path.join("d:/BaronsMarket", category_folder, "images", image_file),  # Fallback
    ]
    
    for path in base_paths:
        if os.path.exists(path):
            return FileResponse(path)
    
    raise HTTPException(status_code=404, detail=f"Image not found: {category_folder}/{image_file}")

# ===========================
# SQLite Product Endpoints (Original)
# ===========================

@router.get("/products", response_model=List[ProductResponse])
def get_products(query: str = "", db: Session = Depends(get_db)):
    """Get products from SQLite database (legacy)."""
    service = StoreService(db)
    if query:
        return service.search_products(query)
    return service.search_products("")

# ===========================
# Cart Endpoints
# ===========================

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

