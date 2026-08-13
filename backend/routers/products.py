from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import schemas
import service
from database import get_db

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return service.create_product(db=db, product=product)

@router.get("/", response_model=List[schemas.ProductResponse])
def read_products(skip: int = 0, limit: int = 100, active_only: bool = True, db: Session = Depends(get_db)):
    return service.get_products(db, skip=skip, limit=limit, active_only=active_only)
