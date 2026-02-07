from app.database import engine, SessionLocal, Base
from app.models import User, Account, Transaction, Product, ShoppingList
from datetime import datetime, timedelta

# Initialize database schema
Base.metadata.create_all(bind=engine)

def init_db():
    # Drop all tables to reset
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    
    # Create User Omar
    user = User(username="omar", email="omar@example.com", full_name="Omar")
    db.add(user)
    
    # Create User Alice (for testing new user)
    alice = User(username="alice", email="alice@example.com", full_name="Alice")
    db.add(alice)

    db.commit()
    db.refresh(user)
    db.refresh(alice)

    # Create Account (Checking)
    account = Account(balance=2500.0, user_id=user.id, account_type="checking")
    db.add(account)
    
    # Create Savings Account
    savings = Account(balance=10000.0, user_id=user.id, account_type="savings")
    db.add(savings)
    
    db.commit()
    db.refresh(account)

    # Create Account for Alice
    alice_account = Account(balance=500.0, user_id=alice.id, account_type="checking")
    db.add(alice_account)
    db.commit()

    # Create Transactions (in TND)
    transactions = [
        Transaction(amount=1200.0, description="Salaire", category="Income", account_id=account.id, date=datetime.now() - timedelta(days=5)),
        Transaction(amount=-450.0, description="Loyer", category="Housing", account_id=account.id, date=datetime.now() - timedelta(days=4)),
        Transaction(amount=-85.500, description="Carrefour Market", category="Groceries", account_id=account.id, date=datetime.now() - timedelta(days=2)),
        Transaction(amount=-25.000, description="Taxi Bolt", category="Transport", account_id=account.id, date=datetime.now() - timedelta(days=1)),
        Transaction(amount=-60.000, description="STEG Facture", category="Utilities", account_id=account.id, date=datetime.now() - timedelta(days=10)),
    ]
    db.add_all(transactions)

    # Create Tunisian Products & Ingredients
    products = [
        # Épicerie & Alimentation
        Product(name="Harissa Sicam (400g)", price=3.800, stock=100, category="Épicerie", description="La vraie harissa tunisienne"),
        Product(name="Thon El Manar (160g)", price=5.200, stock=80, category="Épicerie", description="Thon entier à l'huile d'olive"),
        Product(name="Couscous Diari (1kg)", price=2.500, stock=100, category="Épicerie", description="Couscous fin de qualité supérieure"),
        Product(name="Huile d'Olive Vierge (1L)", price=22.000, stock=50, category="Épicerie", description="Huile d'olive extra vierge du Sahel"),
        Product(name="Dattes Deglet Nour (1kg)", price=12.000, stock=40, category="Fruits", description="Dattes de Tozeur, miel naturel"),
        Product(name="Pâtes Fellah (500g)", price=1.200, stock=150, category="Épicerie", description="Pâtes n°2 pour sauce rouge"),
        Product(name="Lait Délice (1L)", price=1.350, stock=200, category="Produits Laitiers", description="Lait demi-écrémé"),
        Product(name="Yaourt Natilait", price=0.600, stock=100, category="Produits Laitiers", description="Yaourt aromatisé fraise"),
        Product(name="Fromage Président (16p)", price=6.500, stock=60, category="Produits Laitiers", description="Fromage fondu portions"),
        Product(name="Baguette Traditionnelle", price=0.250, stock=50, category="Boulangerie", description="Pain chaud et croustillant"),
        
        # Ingrédients Cuisine (Ojja, Lablabi, etc.)
        Product(name="Tomates Concentrées Sicam", price=4.500, stock=80, category="Épicerie", description="Double concentré de tomates"),
        Product(name="Oeufs (Plateau 30)", price=14.500, stock=30, category="Frais", description="Oeufs frais locaux"),
        Product(name="Merguez Frais (1kg)", price=28.000, stock=20, category="Boucherie", description="Merguez épicées"),
        Product(name="Pois Chiches (1kg)", price=4.000, stock=60, category="Épicerie", description="Pois chiches secs pour Lablabi"),
        Product(name="Cumin (100g)", price=3.000, stock=100, category="Épices", description="Cumin moulu de qualité"),
        Product(name="Tabel & Karouia (100g)", price=3.500, stock=100, category="Épices", description="Mélange d'épices tunisien"),
        Product(name="Ail (500g)", price=5.000, stock=40, category="Légumes", description="Ail rouge local"),
        Product(name="Piment Fort (1kg)", price=4.500, stock=30, category="Légumes", description="Piment vert piquant"),

        # Boissons
        Product(name="Boga Cidre (1.5L)", price=2.800, stock=100, category="Boissons", description="La boisson gazeuse nationale"),
        Product(name="Eau Minérale Safia (1.5L)", price=0.900, stock=120, category="Boissons", description="Eau minérale naturelle"),
        Product(name="Café Bondin (250g)", price=8.400, stock=60, category="Épicerie", description="Café moulu pur arabica"),
        Product(name="Thé Vert (200g)", price=3.500, stock=80, category="Épicerie", description="Thé vert pour infusion à la menthe"),

        # Artisanat & Maison
        Product(name="Service à Thé Artisanal", price=45.000, stock=15, category="Artisanat", description="Plateau + 6 verres peints main"),
        Product(name="Fouta Tunisienne", price=25.000, stock=30, category="Artisanat", description="Serviette 100% coton tissage plat"),
        Product(name="Cage Sidi Bou Said", price=65.000, stock=10, category="Artisanat", description="Cage décorative blanche et bleue"),
        Product(name="Tapis Margoum (1.5m)", price=120.000, stock=5, category="Artisanat", description="Tapis berbère traditionnel"),
        Product(name="Savon Noir Naturel", price=8.500, stock=40, category="Beauté", description="Exfoliant naturel pour hammam"),

        # Tech & Électronique
        Product(name="Smartphone Samsung A54", price=1499.000, stock=10, category="Électronique", description="5G, 128Go, Caméra 50MP"),
        Product(name="Smart TV 43 pouces", price=899.000, stock=8, category="Électronique", description="TV LED 4K UHD Smart"),
        Product(name="Écouteurs Bluetooth", price=89.000, stock=25, category="Électronique", description="Sans fil, autonomie 20h"),
        Product(name="Machine à Café Expresso", price=350.000, stock=12, category="Électroménager", description="Compatible capsules"),
        
        # Vêtements
        Product(name="Chéchia Rouge", price=15.000, stock=50, category="Vêtements", description="Chéchia traditionnelle en laine"),
        Product(name="Jebba Homme", price=180.000, stock=5, category="Vêtements", description="Tenue traditionnelle en lin"),
    ]
    db.add_all(products)
    
    db.commit()
    print("Database data updated to Tunisian Context (TND currency & Local Products).")
    db.close()

if __name__ == "__main__":
    init_db()
