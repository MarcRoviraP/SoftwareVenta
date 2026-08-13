from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import schemas
import service
from database import get_db
import auth

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return service.create_user(db=db, user=user)

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user = Depends(auth.get_current_active_user)):
    return current_user
