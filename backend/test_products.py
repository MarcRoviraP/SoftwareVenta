import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
import models
import auth

from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create category
    cat = models.Category(name="Bebidas")
    db.add(cat)
    
    # Create users
    admin = models.User(username="admin_user", password_hash=auth.get_password_hash("pass"), role=models.UserRole.ADMIN, is_active=True)
    gerente = models.User(username="gerente_user", password_hash=auth.get_password_hash("pass"), role=models.UserRole.GERENTE, is_active=True)
    waiter = models.User(username="waiter_user", password_hash=auth.get_password_hash("pass"), role=models.UserRole.WAITER, is_active=True)
    
    # Create product
    prod = models.Product(name="Agua", category_id=1, price=1.5, is_active=True)
    
    db.add_all([admin, gerente, waiter, prod])
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def get_token(username):
    response = client.post("/auth/login", data={"username": username, "password": "pass"})
    return response.json()["access_token"]

def test_admin_and_gerente_can_update_product():
    token_admin = get_token("admin_user")
    token_gerente = get_token("gerente_user")
    token_waiter = get_token("waiter_user")

    # Admin updates product price
    res = client.put("/products/1", json={"price": 2.0}, headers={"Authorization": f"Bearer {token_admin}"})
    assert res.status_code == 200
    assert float(res.json()["price"]) == 2.0

    # Gerente updates product name
    res = client.put("/products/1", json={"name": "Agua Mineral"}, headers={"Authorization": f"Bearer {token_gerente}"})
    assert res.status_code == 200
    assert res.json()["name"] == "Agua Mineral"

    # Waiter cannot update product
    res = client.put("/products/1", json={"price": 5.0}, headers={"Authorization": f"Bearer {token_waiter}"})
    assert res.status_code == 403

def test_read_products_access_for_all():
    res = client.get("/products/")
    assert res.status_code == 200
    assert len(res.json()) == 1
