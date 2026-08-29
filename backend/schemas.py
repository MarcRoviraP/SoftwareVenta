from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int

    model_config = {"from_attributes": True}

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    category_id: int
    price: Decimal = Field(..., ge=0)
    image_url: Optional[str] = None
    is_active: bool = True
    allergens: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    category: Optional[CategoryResponse] = None

    model_config = {"from_attributes": True}

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category_id: Optional[int] = None
    price: Optional[Decimal] = Field(None, ge=0)
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    allergens: Optional[str] = None

# --- User Schemas ---
from enum import Enum

class UserRoleSchema(str, Enum):
    ADMIN = "ADMIN"
    GERENTE = "GERENTE"
    WAITER = "WAITER"
    KITCHEN = "KITCHEN"

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    role: UserRoleSchema
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    role: Optional[UserRoleSchema] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=4)

class PasswordChange(BaseModel):
    new_password: str = Field(..., min_length=4)

class UserResponse(UserBase):
    id: int
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Order Schemas ---
from datetime import datetime
from typing import List

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    id: int
    order_id: int
    unit_price: Decimal
    model_config = {"from_attributes": True}

class OrderBase(BaseModel):
    table_number: int
    status: str = "PENDING"
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class OrderResponse(OrderBase):
    id: int
    waiter_id: int
    created_at: datetime
    items: List[OrderItemResponse]
    model_config = {"from_attributes": True}
