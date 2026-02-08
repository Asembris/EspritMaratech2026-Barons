from sqlalchemy.orm import Session
from app.models import Product, ShoppingList
from typing import List, Optional
from app.services.vector_search_service import get_vector_search_service

class StoreService:
    def __init__(self, db: Session):
        self.db = db
        self.vector_service = get_vector_search_service()

    def _sync_vector_product(self, vector_product: dict) -> Product:
        """Sync a vector product to SQLite if it doesn't exist."""
        name = vector_product.get("name")
        if not name:
            return None
            
        # Check if exists
        existing = self.db.query(Product).filter(Product.name == name).first()
        if existing:
            return existing
            
        # Parse price string "12,500 DT" -> 12.5
        price_str = vector_product.get("price", "0")
        try:
            price = float(price_str.replace("DT", "").replace("TND", "").replace(",", ".").replace("Â", "").strip())
        except:
            price = 0.0

        new_product = Product(
            name=name,
            price=price,
            stock=100,  # Default stock
            category=vector_product.get("category_folder", "General"),
            description=f"Marque: {vector_product.get('brand', 'Inconnu')}"
        )
        self.db.add(new_product)
        self.db.commit()
        self.db.refresh(new_product)
        return new_product

    def get_product(self, product_name: str) -> Optional[Product]:
        # Try SQL first
        product = self.db.query(Product).filter(Product.name.ilike(f"%{product_name}%")).first()
        if product:
            return product
            
        # Try Vector Search exact/close match
        results = self.vector_service.search_by_text(product_name, limit=1)
        if results and results[0]['score'] > 0.6: # Confidence threshold
            return self._sync_vector_product(results[0])
            
        return None

    def search_products(self, query: str) -> List[Product]:
        # 1. SQL Search
        sql_products = self.db.query(Product).filter(Product.name.ilike(f"%{query}%")).all()
        
        # 2. Vector Search
        vector_results = self.vector_service.search_by_text(query, limit=5)
        
        # 3. Merge and Sync
        for res in vector_results:
            # Sync product to DB so it has an ID
            db_prod = self._sync_vector_product(res)
            if db_prod and db_prod.id not in [p.id for p in sql_products]:
                sql_products.append(db_prod)
                
        return sql_products

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

    def checkout(self, user_id: int, banking_service) -> str:
        # 1. Calculate Total
        total_amount = self.calculate_cart_total(user_id)
        if total_amount <= 0:
            return "Votre panier est vide."

        # 2. Process Payment
        cart_items = self.get_cart(user_id)
        item_count = sum(item['quantity'] for item in cart_items)
        description = f"Achat magasin ({item_count} articles)"
        
        success = banking_service.process_payment(user_id, total_amount, description)
        
        if not success:
            return f"Paiement refusé. Solde insuffisant ({total_amount} TND requis)."

        # 3. Clear Cart
        self.db.query(ShoppingList).filter(ShoppingList.user_id == user_id).delete()
        self.db.commit()
        
        return f"Paiement de {total_amount} TND accepté. Merci pour votre achat !"
