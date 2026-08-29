import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import User, UserRole
import service
import schemas

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


import auth

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    # Seed single admin
    admin = User(username="admin", password_hash=auth.get_password_hash("admin"), role=UserRole.ADMIN, is_active=True)
    session.add(admin)
    session.commit()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


from fastapi import HTTPException

def test_cannot_deactivate_last_admin(db):
    admin = db.query(User).filter(User.username == "admin").first()
    with pytest.raises(HTTPException) as exc_info:
        service.update_user(db, admin.id, schemas.UserUpdate(is_active=False))
    assert "administrador activo" in str(exc_info.value.detail).lower()


def test_cannot_demote_last_admin(db):
    admin = db.query(User).filter(User.username == "admin").first()
    with pytest.raises(HTTPException) as exc_info:
        service.update_user(db, admin.id, schemas.UserUpdate(role=UserRole.WAITER))
    assert "administrador activo" in str(exc_info.value.detail).lower()


def test_cannot_delete_last_admin(db):
    admin = db.query(User).filter(User.username == "admin").first()
    with pytest.raises(HTTPException) as exc_info:
        service.delete_user(db, admin.id)
    assert "administrador activo" in str(exc_info.value.detail).lower()


def test_can_deactivate_admin_if_another_exists(db):
    # Create second admin
    admin2 = service.create_user(
        db, schemas.UserCreate(username="admin2", password="password123", role=UserRole.ADMIN)
    )
    admin1 = db.query(User).filter(User.username == "admin").first()
    
    # Deactivating admin1 should succeed now
    updated = service.update_user(db, admin1.id, schemas.UserUpdate(is_active=False))
    assert updated.is_active is False


def test_gerente_can_create_gerente_and_staff(db):
    gerente = service.create_user(
        db, schemas.UserCreate(username="gerente1", password="password123", role=UserRole.GERENTE)
    )
    assert gerente.role == UserRole.GERENTE.value

    waiter = service.create_user(
        db, schemas.UserCreate(username="waiter_by_gerente", password="password123", role=UserRole.WAITER)
    )
    assert waiter.role == UserRole.WAITER.value

