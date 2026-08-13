# Technical Design: Restaurant Schema

## Architecture Approach
We will use SQLAlchemy 2.0 with a declarative base approach. The models will be centralized in `backend/models.py`.

## Data Models

### Enums
- `UserRole`: ADMIN, WAITER, KITCHEN
- `OrderStatus`: PENDING, PREPARING, READY, DELIVERED, PAID

### Tables
1. **users**:
   - `id`: Integer, Primary Key
   - `username`: String, Unique, Indexed
   - `password_hash`: String
   - `role`: Enum(UserRole)
   - `is_active`: Boolean

2. **categories**:
   - `id`: Integer, Primary Key
   - `name`: String, Unique
   - `description`: String

3. **products**:
   - `id`: Integer, Primary Key
   - `name`: String
   - `category_id`: Integer, ForeignKey('categories.id')
   - `price`: Numeric(10, 2)
   - `image_url`: String
   - `is_active`: Boolean (Default: True)
   - `allergens`: String

4. **orders**:
   - `id`: Integer, Primary Key
   - `table_number`: Integer
   - `waiter_id`: Integer, ForeignKey('users.id')
   - `status`: Enum(OrderStatus) (Default: PENDING)
   - `notes`: String
   - `created_at`: DateTime (Default: UTC Now)

5. **order_items**:
   - `id`: Integer, Primary Key
   - `order_id`: Integer, ForeignKey('orders.id')
   - `product_id`: Integer, ForeignKey('products.id')
   - `quantity`: Integer
   - `unit_price`: Numeric(10, 2)
   - `notes`: String
