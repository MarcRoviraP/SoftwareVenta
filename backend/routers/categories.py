from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import schemas
import service
from database import get_db

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.post("/", response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    return service.create_category(db=db, category=category)

@router.get("/", response_model=List[schemas.CategoryResponse])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return service.get_categories(db, skip=skip, limit=limit)
