from database import init_db, engine
from sqlalchemy import inspect

def test_tables_created():
    # Initialize DB logic which will create tables
    init_db()
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    # Assert all tables exist in the db
    assert "users" in tables
    assert "categories" in tables
    assert "products" in tables
    assert "orders" in tables
    assert "order_items" in tables
