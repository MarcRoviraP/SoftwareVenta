import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://devuser:devpassword@localhost:5432/softwareventa")

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

def init_db():
    import models
    from auth import get_password_hash
    Base.metadata.create_all(bind=engine)

    # Seed de datos iniciales: solo se crea el usuario administrador por defecto
    db = SessionLocal()
    try:
        if db.query(models.User).filter_by(username="admin").first() is None:
            admin_user = models.User(
                username="admin",
                password_hash=get_password_hash("admin"),
                role=models.UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()

        if db.query(models.Category).count() == 0:
            cat_hamb = models.Category(name="Hamburguesas")
            cat_pizza = models.Category(name="Pizzas")
            cat_beb = models.Category(name="Bebidas")
            db.add_all([cat_hamb, cat_pizza, cat_beb])
            db.commit()

            p1 = models.Product(name="Hamburguesa Doble Queso", category_id=cat_hamb.id, price=9.50, is_active=True)
            p2 = models.Product(name="Pizza Pepperoni XL", category_id=cat_pizza.id, price=14.00, is_active=True)
            p3 = models.Product(name="Cerveza Artesanal 500ml", category_id=cat_beb.id, price=4.00, is_active=True)
            db.add_all([p1, p2, p3])
            db.commit()
    except Exception as e:
        print(f"Error seeding DB: {e}")
        db.rollback()
    finally:
        db.close()
