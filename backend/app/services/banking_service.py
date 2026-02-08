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

    def transfer_to_user(self, sender_id: int, recipient_email: str, amount: float) -> str:
        import logging
        logging.basicConfig(filename='backend_debug.log', level=logging.INFO)
        logging.info(f"Attempting transfer: Sender={sender_id}, Recipient={recipient_email}, Amount={amount}")

        # 1. Get Sender Account
        sender_account = self.get_account(sender_id)
        if not sender_account:
            logging.error(f"Sender account not found for user_id={sender_id}")
            return "Compte expéditeur introuvable."
        if sender_account.balance < amount:
            logging.error(f"Insufficient funds: Balance={sender_account.balance}, Amount={amount}")
            return f"Solde insuffisant ({sender_account.balance} TND) pour envoyer {amount} TND."
            
        # 2. Get Recipient
        recipient_user = self.db.query(User).filter(User.email == recipient_email).first()
        if not recipient_user:
            logging.error(f"Recipient not found: {recipient_email}")
            return f"Destinataire avec l'email '{recipient_email}' introuvable."
            
        if recipient_user.id == sender_id:
            return "Vous ne pouvez pas vous envoyer de l'argent à vous-même."
            
        # 3. Get Recipient Account
        recipient_account = self.get_account(recipient_user.id)
        if not recipient_account:
            # Auto-create checking account if not exists (edge case)
            recipient_account = Account(user_id=recipient_user.id, balance=0.0, account_type="checking")
            self.db.add(recipient_account)
            self.db.commit()
            self.db.refresh(recipient_account)
            
        # 4. Perform Transfer (Atomic)
        try:
            sender_account.balance -= amount
            recipient_account.balance += amount
            
            # Record for sender
            t_sender = Transaction(
                amount=-amount, 
                description=f"Virement vers {recipient_user.full_name}", 
                category="Transfer", 
                account_id=sender_account.id
            )
            
            # Record for recipient
            t_recipient = Transaction(
                amount=amount, 
                description=f"Virement reçu de {sender_account.owner.full_name}", 
                category="Transfer", 
                account_id=recipient_account.id
            )
            
            self.db.add(t_sender)
            self.db.add(t_recipient)
            self.db.commit()
            
            logging.info("Transfer successful")
            return f"Succès : {amount} TND envoyés à {recipient_user.full_name}."
            
        except Exception as e:
            self.db.rollback()
            logging.error(f"DB Error during transfer: {e}")
            return f"Erreur technique lors du virement : {str(e)}"
