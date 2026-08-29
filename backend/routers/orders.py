from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import schemas
import service
import auth
from database import get_db
from sockets import manager

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=schemas.OrderResponse)
async def create_order(
    order: schemas.OrderCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    new_order = service.create_order(db=db, order=order, waiter_id=current_user.id)
    
    # Broadcast to central via WebSocket
    # We serialize it to dict using Pydantic
    order_data = schemas.OrderResponse.model_validate(new_order).model_dump(mode="json")
    await manager.broadcast({
        "type": "NEW_ORDER",
        "data": order_data
    })
    
    return new_order

@router.get("/", response_model=List[schemas.OrderResponse])
def get_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return service.get_orders(db, skip=skip, limit=limit)

@router.put("/{order_id}/status", response_model=schemas.OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    updated_order = service.update_order_status(db=db, order_id=order_id, status=status_update.status)
    order_data = schemas.OrderResponse.model_validate(updated_order).model_dump(mode="json")
    await manager.broadcast({
        "type": "ORDER_UPDATED",
        "data": order_data
    })
    return updated_order

@router.put("/{order_id}", response_model=schemas.OrderResponse)
async def update_order(
    order_id: int,
    order_update: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    updated_order = service.update_order(db=db, order_id=order_id, order_update=order_update)
    order_data = schemas.OrderResponse.model_validate(updated_order).model_dump(mode="json")
    await manager.broadcast({
        "type": "ORDER_UPDATED",
        "data": order_data
    })
    return updated_order

@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_active_user)
):
    res = service.delete_order(db=db, order_id=order_id)
    await manager.broadcast({
        "type": "ORDER_DELETED",
        "data": {"id": order_id}
    })
    return res


