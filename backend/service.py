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

def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if product_update.name is not None:
        product.name = product_update.name
    if product_update.category_id is not None:
        product.category_id = product_update.category_id
    if product_update.price is not None:
        product.price = product_update.price
    if product_update.image_url is not None:
        product.image_url = product_update.image_url
    if product_update.is_active is not None:
        product.is_active = product_update.is_active
    if product_update.allergens is not None:
        product.allergens = product_update.allergens

    try:
        db.commit()
        db.refresh(product)
        return product
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al actualizar el producto")

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

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def update_user_password(db: Session, user_id: int, new_password: str):
    from auth import get_password_hash
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Verificar si se intenta desactivar o cambiar de rol al último administrador activo
    is_demoting_or_deactivating_admin = (
        user.role == models.UserRole.ADMIN and user.is_active and (
            (user_update.is_active is False) or 
            (user_update.role is not None and (user_update.role.value if hasattr(user_update.role, 'value') else user_update.role) != (models.UserRole.ADMIN.value if hasattr(models.UserRole.ADMIN, 'value') else models.UserRole.ADMIN))
        )
    )

    if is_demoting_or_deactivating_admin:
        active_admins_count = db.query(models.User).filter(
            models.User.role == models.UserRole.ADMIN,
            models.User.is_active == True
        ).count()
        if active_admins_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="No se puede desactivar ni cambiar el rol del único usuario Administrador activo."
            )

    if user_update.username is not None:
        user.username = user_update.username
    if user_update.role is not None:
        user.role = user_update.role.value
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.password is not None:
        from auth import get_password_hash
        user.password_hash = get_password_hash(user_update.password)

    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al actualizar usuario (posible nombre duplicado)")

def delete_user(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.role == models.UserRole.ADMIN and user.is_active:
        active_admins_count = db.query(models.User).filter(
            models.User.role == models.UserRole.ADMIN,
            models.User.is_active == True
        ).count()
        if active_admins_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar el único usuario Administrador activo en el sistema."
            )

    # Verificar si el usuario tiene actividad (pedidos/ventas) registrada
    orders_count = db.query(models.Order).filter(models.Order.waiter_id == user_id).count()
    if orders_count > 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un usuario con ventas o pedidos registrados. Puedes desactivarlo para mantener el historial."
        )

    db.delete(user)
    db.commit()
    return {"message": f"Usuario {user.username} eliminado con éxito"}

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
