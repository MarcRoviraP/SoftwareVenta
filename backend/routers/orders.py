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
