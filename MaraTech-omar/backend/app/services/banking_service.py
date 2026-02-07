from sqlalchemy.orm import Session
from app.models import Account, Transaction, User
from typing import List, Optional

class BankingService:
    def __init__(self, db: Session):
        self.db = db

    def get_account(self, user_id: int, account_type: str = "checking") -> Optional[Account]:
        return self.db.query(Account).filter(
            Account.user_id == user_id, 
            Account.account_type == account_type
        ).first()

    def get_balance(self, user_id: int, account_type: str = "checking") -> float:
        account = self.get_account(user_id, account_type)
        return account.balance if account else 0.0

    def get_transactions(self, user_id: int, limit: int = 5) -> List[Transaction]:
        account = self.get_account(user_id)
        if not account:
            return []
        
        return self.db.query(Transaction).filter(
            Transaction.account_id == account.id
        ).order_by(Transaction.date.desc()).limit(limit).all()

    def process_payment(self, user_id: int, amount: float, description: str) -> bool:
        account = self.get_account(user_id)
        if not account or account.balance < amount:
            return False
        
        # Create transaction
        transaction = Transaction(
            amount=-amount,
            description=description,
            category="Payment",
            account_id=account.id
        )
        
        # Update balance
        account.balance -= amount
        
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(account)
        return True
