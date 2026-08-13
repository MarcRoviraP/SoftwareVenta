from sqlalchemy.orm import Session
from fastapi import HTTPException
import models
import schemas

# --- Categories ---
def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    try:
        db.commit()
        db.refresh(db_category)
        return db_category
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Category already exists or invalid data")

def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Category).offset(skip).limit(limit).all()

# --- Products ---
def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid product data or category not found")

def get_products(db: Session, skip: int = 0, limit: int = 100, active_only: bool = True):
    query = db.query(models.Product)
    if active_only:
        query = query.filter(models.Product.is_active == True)
    return query.offset(skip).limit(limit).all()

# --- Users ---
def create_user(db: Session, user: schemas.UserCreate):
    from auth import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role.value,
        is_active=user.is_active
    )
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already registered")

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

# --- Orders ---
def create_order(db: Session, order: schemas.OrderCreate, waiter_id: int):
    db_order = models.Order(
        waiter_id=waiter_id,
        table_number=order.table_number,
        status=order.status,
        notes=order.notes
    )
    db.add(db_order)
    db.flush() # Get order ID without committing yet

    for item in order.items:
        # Fetch current product price
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=product.price
        )
        db.add(db_item)
    
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not create order")

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).offset(skip).limit(limit).all()
