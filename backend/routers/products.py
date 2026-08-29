from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import schemas
import service
from database import get_db
import auth
from sockets import manager

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=schemas.ProductResponse)
async def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_active_user)):
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_val not in ["ADMIN", "GERENTE"]:
        raise HTTPException(status_code=403, detail="Solo Administradores y Gerentes pueden crear productos")
    new_product = service.create_product(db=db, product=product)
    await manager.broadcast({
        "type": "PRODUCT_UPDATED",
        "action": "CREATE",
        "product_id": new_product.id
    })
    return new_product

@router.put("/{product_id}", response_model=schemas.ProductResponse)
async def update_product(product_id: int, product_update: schemas.ProductUpdate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_active_user)):
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_val not in ["ADMIN", "GERENTE"]:
        raise HTTPException(status_code=403, detail="Solo Administradores y Gerentes pueden editar productos")
    updated = service.update_product(db=db, product_id=product_id, product_update=product_update)
    await manager.broadcast({
        "type": "PRODUCT_UPDATED",
        "action": "UPDATE",
        "product_id": updated.id
    })
    return updated

@router.get("/", response_model=List[schemas.ProductResponse])
def read_products(skip: int = 0, limit: int = 100, active_only: bool = True, db: Session = Depends(get_db)):
    return service.get_products(db, skip=skip, limit=limit, active_only=active_only)

@router.delete("/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db), current_user = Depends(auth.get_current_active_user)):
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_val not in ["ADMIN", "GERENTE"]:
        raise HTTPException(status_code=403, detail="Solo Administradores y Gerentes pueden eliminar productos")
    res = service.delete_product(db=db, product_id=product_id)
    await manager.broadcast({
        "type": "PRODUCT_UPDATED",
        "action": "DELETE",
        "product_id": product_id
    })
    return res


