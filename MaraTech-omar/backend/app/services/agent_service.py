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
        # Use gpt-3.5-turbo or gpt-4o for better reasoning
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)

    def get_tools(self):
        # --- Banking Tools ---
        @tool
        def check_balance(user_id: int = 1) -> str:
            """Consulter le solde actuel du compte bancaire."""
            balance = self.banking_service.get_balance(user_id)
            return f"{balance} TND"

        @tool
        def get_transaction_history(user_id: int = 1, limit: int = 5) -> str:
            """Obtenir l'historique des dernières transactions."""
            transactions = self.banking_service.get_transactions(user_id, limit)
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

        # --- Recommendation Tool (The 'Specialist' Agent) ---
        @tool
        def recommend_products_based_on_history(user_id: int = 1) -> str:
            """Analyse l'historique d'achat et recommande des produits pertinents."""
            history = self.banking_service.get_transactions(user_id, limit=10)
            
            recommendations = []
            
            # Simple heuristic adaptations for Tunisian context
            has_food = any(t.category in ["Groceries", "Food", "Épicerie"] for t in history)
            
            if has_food:
                # Suggest complementary Tunisian items
                recommendations.append("- Harissa Sicam : Indispensable pour cuisiner tunisien.")
                recommendations.append("- Couscous Diari : Pour le repas du dimanche.")
                recommendations.append("- Thon El Manar : Pour vos salades et fricassés.")
            else:
                # General suggestion
                recommendations.append("- Fouta Tunisienne : Idéale pour la plage ou le bain.")
                recommendations.append("- Coffret Dattes Deglet Nour : Un cadeau sain et sucré.")
            
            if not recommendations:
                return "Je vous recommande de découvrir notre rayon Artisanat avec de belles cages Sidi Bou Said."
            
            return "Basé sur vos goûts, voici ma sélection 'Tounsi' pour vous :\n" + "\n".join(recommendations)

        @tool
        def get_my_cart(user_id: int = 1) -> str:
            """Récupérer le contenu du panier actuel."""
            cart = self.store_service.get_cart(user_id)
            if not cart:
                return "Votre panier est vide."
            
            lines = []
            for item in cart:
                lines.append(f"- {item['product_name']} (x{item['quantity']}) : {item['total']} TND")
            
            total = sum(item['total'] for item in cart)
            return "Contenu du panier :\n" + "\n".join(lines) + f"\n\nTotal : {total} TND"

        @tool
        def add_product_to_cart(product_name: str, quantity: int = 1, user_id: int = 1) -> str:
            """Ajouter un produit au panier. Utiliser le nom exact du produit trouvé via search_product."""
            success = self.store_service.add_to_cart(user_id, product_name, quantity)
            if success:
                return f"{quantity}x {product_name} ajouté au panier."
            return f"Échec : Impossible d'ajouter {product_name}. Vérifiez le stock ou le nom."

        @tool
        def remove_product_from_cart(product_name: str, user_id: int = 1) -> str:
            """Retirer un produit du panier."""
            success = self.store_service.remove_from_cart(user_id, product_name)
            if success:
                return f"{product_name} a été retiré du panier."
            return f"Impossible de retirer {product_name}. Est-il dans le panier ?"

        @tool
        def get_cart_total(user_id: int = 1) -> str:
            """Obtenir le montant total du panier."""
            total = self.store_service.calculate_cart_total(user_id)
            return f"{total} TND"

        return [check_balance, get_transaction_history, search_product, check_product_stock_price, recommend_products_based_on_history, get_my_cart, get_cart_total, add_product_to_cart]

    def process_query(self, query: str, user_id: int = 1, history: List = []):
        tools = self.get_tools()
        
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
            ("system", "Tu es un assistant intelligent expert en courses et finances. "
                       "Tu as accès à des outils pour gérer le panier (ajouter/retirer), vérifier le solde, et chercher des produits. "
                       "Tu es aussi un Chef Cuisinier : Si l'utilisateur veut cuisiner un plat (ex: Couscous, Ojja), propose la liste des ingrédients "
                       "et demande si tu dois les ajouter au panier. Use search_product pour trouver les ingrédients exacts (ex: 'Harissa Sicam' au lieu de juste 'Harissa'). "
                       "Avant d'ajouter, vérifie si le solde suffit en estimant le total. "
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
