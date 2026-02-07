from sqlalchemy.orm import Session
from app.models import Product, ShoppingList, User
from typing import List, Optional

class StoreService:
    def __init__(self, db: Session):
        self.db = db

    def get_product(self, product_name: str) -> Optional[Product]:
        return self.db.query(Product).filter(Product.name.ilike(f"%{product_name}%")).first()

    def search_products(self, query: str) -> List[Product]:
        return self.db.query(Product).filter(Product.name.ilike(f"%{query}%")).all()

    def add_to_cart(self, user_id: int, product_name: str, quantity: int = 1) -> bool:
        product = self.get_product(product_name)
        if not product:
            return False
        
        # Check if item already in cart
        existing_item = self.db.query(ShoppingList).filter(
            ShoppingList.user_id == user_id,
            ShoppingList.product_id == product.id
        ).first()

        if existing_item:
            existing_item.quantity += quantity
            # Update total if we store it, or just rely on dynamic calc
            # existing_item.total = existing_item.quantity * product.price 
        else:
            new_item = ShoppingList(user_id=user_id, product_id=product.id, quantity=quantity)
            self.db.add(new_item)
        
        self.db.commit()
        return True

    def remove_from_cart(self, user_id: int, product_name: str) -> bool:
        product = self.get_product(product_name)
        if not product:
            return False
            
        item = self.db.query(ShoppingList).filter(
            ShoppingList.user_id == user_id,
            ShoppingList.product_id == product.id
        ).first()

        if item:
            self.db.delete(item)
            self.db.commit()
            return True
        return False

    def get_cart(self, user_id: int) -> List[dict]:
        items = self.db.query(ShoppingList).filter(ShoppingList.user_id == user_id).all()
        result = []
        for item in items:
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                result.append({
                    "product_name": product.name,
                    "price": product.price,
                    "quantity": item.quantity,
                    "total": product.price * item.quantity
                })
        return result

    def calculate_cart_total(self, user_id: int) -> float:
        cart = self.get_cart(user_id)
        return sum(item["total"] for item in cart)

    def checkout(self, user_id: int, banking_service=None) -> dict:
        """
        Checkout cart. If banking_service provided, process payment.
        Otherwise just clear cart (for voice demo).
        """
        # 1. Calculate Total
        total_amount = self.calculate_cart_total(user_id)
        if total_amount <= 0:
            return None  # Empty cart

        cart_items = self.get_cart(user_id)
        item_count = sum(item['quantity'] for item in cart_items)
        
        # 2. Process Payment (if banking service available)
        if banking_service:
            description = f"Achat magasin ({item_count} articles)"
            success = banking_service.process_payment(user_id, total_amount, description)
            if not success:
                return None

        # 3. Clear Cart
        self.clear_cart(user_id)
        
        return {"total": total_amount, "items": item_count}

    def clear_cart(self, user_id: int):
        """Remove all items from user's cart"""
        self.db.query(ShoppingList).filter(ShoppingList.user_id == user_id).delete()
        self.db.commit()

