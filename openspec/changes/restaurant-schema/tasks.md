# Tasks: Restaurant Schema

## Phase 1: Database Models Implementation
- [x] 1.1 Create `backend/models.py` and implement all Enums (`UserRole`, `OrderStatus`).
- [x] 1.2 Implement the `User`, `Category`, and `Product` SQLAlchemy models.
- [x] 1.3 Implement the `Order` and `OrderItem` SQLAlchemy models.
- [x] 1.4 Setup the table creation logic in `backend/database.py` (e.g. `Base.metadata.create_all`) or prepare for Alembic if migrations are needed.

## Phase 2: Testing & Validation
- [x] 2.1 Add a test in `backend/test_models.py` or modify `test_main.py` to assert that all tables are correctly mapped and created in the PostgreSQL instance.
