from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)

    accounts = relationship("Account", back_populates="owner")
    cart_items = relationship("ShoppingList", back_populates="user")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, default=0.0)
    account_type = Column(String)  # checking, savings
    user_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    description = Column(String)
    category = Column(String)
    date = Column(DateTime, default=datetime.utcnow)
    account_id = Column(Integer, ForeignKey("accounts.id"))

    account = relationship("Account", back_populates="transactions")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    price = Column(Float)
    stock = Column(Integer)
    category = Column(String)
    description = Column(String)

class ShoppingList(Base):
    __tablename__ = "shopping_list"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)
    total = Column(Float) # Optional, can comprise from product price

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product")
