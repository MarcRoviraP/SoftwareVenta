from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import schemas
import service
import models
import auth
from database import get_db
from sockets import manager

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.post("/", response_model=schemas.CategoryResponse)
async def create_category(
    category: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.GERENTE]:
        raise HTTPException(status_code=403, detail="No tiene permisos para crear categorías")
    new_cat = service.create_category(db=db, category=category)
    await manager.broadcast({
        "type": "CATEGORIES_UPDATED",
        "category_id": new_cat.id
    })
    return new_cat

@router.get("/", response_model=List[schemas.CategoryResponse])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return service.get_categories(db, skip=skip, limit=limit)

