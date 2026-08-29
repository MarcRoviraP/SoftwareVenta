from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import schemas
import service
from database import get_db
import auth

from sockets import manager

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=schemas.UserResponse)
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_active_user)):
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    target_role_val = user.role.value if hasattr(user.role, 'value') else str(user.role)

    if role_val == "ADMIN":
        pass
    elif role_val == "GERENTE":
        if target_role_val not in ["WAITER", "KITCHEN"]:
            raise HTTPException(
                status_code=403,
                detail="Un gerente solo puede crear usuarios con rol Camarero (WAITER) o Cocina (KITCHEN)"
            )
    else:
        raise HTTPException(status_code=403, detail="No tiene permisos para crear usuarios")

    created = service.create_user(db=db, user=user)
    await manager.broadcast({
        "type": "USER_CREATED",
        "user_id": created.id,
        "username": created.username,
        "role": created.role
    })
    return created


@router.get("/", response_model=List[schemas.UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    return service.get_users(db=db, skip=skip, limit=limit)

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user = Depends(auth.get_current_active_user)):
    return current_user

@router.put("/me/password", response_model=schemas.UserResponse)
def update_my_password(
    body: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    return service.update_user_password(db=db, user_id=current_user.id, new_password=body.new_password)

@router.put("/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: int,
    body: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_val == "ADMIN":
        pass
    elif role_val == "GERENTE":
        target_user = service.get_user(db, user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        target_user_role = target_user.role.value if hasattr(target_user.role, 'value') else str(target_user.role)
        if target_user_role not in ["WAITER", "KITCHEN"]:
            raise HTTPException(status_code=403, detail="Un gerente solo puede modificar usuarios de tipo Camarero o Cocina")
        if body.role is not None:
            new_role = body.role.value if hasattr(body.role, 'value') else str(body.role)
            if new_role not in ["WAITER", "KITCHEN"]:
                raise HTTPException(status_code=403, detail="Un gerente solo puede asignar los roles Camarero o Cocina")
    else:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar usuarios")

    updated_user = service.update_user(db=db, user_id=user_id, user_update=body)
    
    await manager.broadcast({
        "type": "USER_UPDATED",
        "user_id": updated_user.id,
        "is_active": updated_user.is_active,
        "role": updated_user.role
    })
    
    return updated_user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_val == "ADMIN":
        pass
    elif role_val == "GERENTE":
        target_user = service.get_user(db, user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        target_user_role = target_user.role.value if hasattr(target_user.role, 'value') else str(target_user.role)
        if target_user_role not in ["WAITER", "KITCHEN"]:
            raise HTTPException(status_code=403, detail="Un gerente solo puede eliminar usuarios de tipo Camarero o Cocina")
    else:
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar usuarios")

    res = service.delete_user(db=db, user_id=user_id)
    await manager.broadcast({
        "type": "USER_DELETED",
        "user_id": user_id
    })
    return res
