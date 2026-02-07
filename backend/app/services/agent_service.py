from sqlalchemy.orm import Session
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from app.services.banking_service import BankingService
from app.services.store_service import StoreService
from typing import List
import os

# Ensure OPENAI_API_KEY is set (should be in .env)
# os.environ["OPENAI_API_KEY"] = "sk-..."

class AgentService:
    def __init__(self, db: Session):
        self.db = db
        self.banking_service = BankingService(db)
        self.store_service = StoreService(db)
        # Use gpt-4o-mini for cost efficiency
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    def get_tools(self, current_user_id: int):
        # --- Banking Tools ---
        @tool
        def check_balance() -> str:
            """Consulter le solde actuel du compte bancaire."""
            balance = self.banking_service.get_balance(current_user_id)
            return f"{balance} TND"

        @tool
        def get_transaction_history(limit: int = 5) -> str:
            """Obtenir l'historique des dernières transactions."""
            transactions = self.banking_service.get_transactions(current_user_id, limit)
            if not transactions:
                return "Aucune transaction récente."
            return "\n".join([f"- {t.date.strftime('%Y-%m-%d')}: {t.description} ({t.amount} TND)" for t in transactions])

        # --- Store Tools ---
        @tool
        def search_product(query: str) -> str:
            """Rechercher un produit dans le magasin par nom."""
            products = self.store_service.search_products(query)
            if not products:
                return "Aucun produit trouvé."
            return "\n".join([f"- {p.name}: {p.price} TND (Stock: {p.stock})" for p in products])

        @tool
        def check_product_stock_price(product_name: str) -> str:
            """Vérifier le prix et le stock d'un produit spécifique."""
            product = self.store_service.get_product(product_name)
            if not product:
                return f"Produit '{product_name}' non trouvé."
            return f"{product.name} coûte {product.price} TND et il en reste {product.stock} en stock."

        # --- Recommendation Tool ---
        @tool
        def recommend_products_based_on_history() -> str:
            """Analyse l'historique d'achat et recommande des produits pertinents."""
            history = self.banking_service.get_transactions(current_user_id, limit=10)
            
            recommendations = []
            has_food = any(t.category in ["Groceries", "Food", "Épicerie"] for t in history)
            
            if has_food:
                recommendations.append("- Harissa Sicam : Indispensable pour cuisiner tunisien.")
                recommendations.append("- Couscous Diari : Pour le repas du dimanche.")
                recommendations.append("- Thon El Manar : Pour vos salades et fricassés.")
            else:
                recommendations.append("- Fouta Tunisienne : Idéale pour la plage ou le bain.")
                recommendations.append("- Coffret Dattes Deglet Nour : Un cadeau sain et sucré.")
            
            if not recommendations:
                return "Je vous recommande de découvrir notre rayon Artisanat avec de belles cages Sidi Bou Said."
            
            return "Basé sur vos goûts, voici ma sélection 'Tounsi' pour vous :\n" + "\n".join(recommendations)

        @tool
        def get_my_cart() -> str:
            """Récupérer le contenu du panier actuel."""
            cart = self.store_service.get_cart(current_user_id)
            if not cart:
                return "Votre panier est vide."
            
            lines = []
            for item in cart:
                lines.append(f"- {item['product_name']} (x{item['quantity']}) : {item['total']} TND")
            
            total = sum(item['total'] for item in cart)
            return "Contenu du panier :\n" + "\n".join(lines) + f"\n\nTotal : {total} TND"

        @tool
        def add_product_to_cart(product_name: str, quantity: int = 1) -> str:
            """Ajouter un produit au panier. Utiliser le nom exact du produit trouvé via search_product."""
            success = self.store_service.add_to_cart(current_user_id, product_name, quantity)
            if success:
                return f"{quantity}x {product_name} ajouté au panier."
            return f"Échec : Impossible d'ajouter {product_name}. Vérifiez le stock ou le nom."

        @tool
        def remove_product_from_cart(product_name: str) -> str:
            """Retirer un produit du panier."""
            success = self.store_service.remove_from_cart(current_user_id, product_name)
            if success:
                return f"{product_name} a été retiré du panier."
            return f"Impossible de retirer {product_name}. Est-il dans le panier ?"

        @tool
        def get_cart_total() -> str:
            """Obtenir le montant total du panier."""
            total = self.store_service.calculate_cart_total(current_user_id)
            return f"{total} TND"

        @tool
        def transfer_money(amount: float, recipient_email: str) -> str:
            """Effectuer un virement bancaire. Nécessite le montant et l'email du destinataire. 
            L'email peut être dicté comme 'alice arobase example point com'."""
            global logging
            import logging
            import re
            logging.basicConfig(filename='backend_debug.log', level=logging.INFO)
            
            def normalize_spoken_email(text: str) -> str:
                """Convert spoken email to proper format."""
                email = text.lower().strip()
                # Replace spoken @ symbols
                email = re.sub(r'\s*(arobase|arrobase|at|@|a commercial)\s*', '@', email)
                # Replace spoken dots
                email = re.sub(r'\s*(point|dot|\.)\s*', '.', email)
                # Remove extra spaces
                email = email.replace(' ', '')
                # Common domain fixes
                email = email.replace('gmail', 'gmail')
                email = email.replace('example', 'example')
                email = email.replace('exemple', 'example')
                return email
            
            try:
                # Normalize the email first
                normalized_email = normalize_spoken_email(recipient_email)
                logging.info(f"transfer_money: original='{recipient_email}' normalized='{normalized_email}'")
                
                # Known user shortcuts
                if normalized_email.lower() in ["alice", "alice."]:
                    normalized_email = "alice@example.com"
                elif normalized_email.lower() in ["omar", "omar."]:
                    normalized_email = "omar@example.com"
                elif normalized_email.lower() in ["bob", "bob."]:
                    normalized_email = "bob@example.com"
                    
                # Validate email format
                if '@' not in normalized_email or '.' not in normalized_email:
                    return f"Format d'email invalide: '{normalized_email}'. Dites par exemple 'alice arobase example point com'."
                    
                result = self.banking_service.transfer_to_user(current_user_id, normalized_email, amount)
                return result
            except Exception as e:
                logging.error(f"Tool Error transfer_money: {e}")
                return f"Erreur outil virement: {str(e)}"

        @tool
        def check_product_price(product_name: str) -> str:
            """Vérifier le prix d'un produit (et s'il est en stock)."""
            products = self.store_service.search_products(product_name)
            if not products:
                return f"Désolé, je ne trouve pas de produit correspondant à '{product_name}'."
            p = products[0]
            return f"Le {p.name} coûte {p.price} TND ({p.stock} en stock)."

        @tool
        def checkout_cart() -> str:
            """Valider le panier et procéder au paiement."""
            try:
                result = self.store_service.checkout(current_user_id, self.banking_service)
                return result
            except Exception as e:
                return f"Erreur lors du paiement : {str(e)}"

        return [check_balance, get_transaction_history, search_product, check_product_stock_price, recommend_products_based_on_history, get_my_cart, get_cart_total, add_product_to_cart, remove_product_from_cart, transfer_money, check_product_price, checkout_cart]

    def process_query(self, query: str, user_id: int = 1, history: List = []):
        tools = self.get_tools(user_id)
        
        # Convert history (pydantic objects or dicts) to LangChain messages
        from langchain_core.messages import HumanMessage, AIMessage
        chat_history = []
        for msg in history:
            # Handle both object (Pydantic) and dict access
            role = getattr(msg, 'role', None) or msg.get('role')
            content = getattr(msg, 'content', None) or msg.get('content')
            
            if role == 'user':
                chat_history.append(HumanMessage(content=content))
            elif role == 'assistant':
                chat_history.append(AIMessage(content=content))

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"Tu es un assistant intelligent expert en courses et finances. ID Utilisateur actuel: {user_id}. "
                       "Tu as accès à des outils pour gérer le panier, le solde et les virements. "
                       "Les outils sont automatiquement sécurisés pour cet utilisateur. "
                       "VIREMENTS: L'utilisateur peut dicter un email vocalement comme 'alice arobase example point com'. "
                       "Tu dois passer l'email tel que dicté au tool transfer_money, il sera normalisé automatiquement. "
                       "Tu es aussi un Chef Cuisinier : Si l'utilisateur veut cuisiner un plat (ex: Couscous), propose les ingrédients "
                       "et demande si tu dois les ajouter au panier. Utilize search_product pour trouver les ingrédients exacts. "
                       "Réponds toujours en français, avec des prix en TND."),
            ("placeholder", "{chat_history}"),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}"),
        ])

        agent = create_tool_calling_agent(self.llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        
        # Pass chat_history to invoke
        result = agent_executor.invoke({
            "input": query,
            "chat_history": chat_history
        })
        return result["output"]
