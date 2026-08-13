from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import check_connection, init_db
from routers import categories, products, users, auth, orders, ws

# Inicializar Base de Datos al arrancar
init_db()

app = FastAPI(title="SoftwareVenta API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(ws.router)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/db-check")
def db_check():
    if check_connection():
        return {"status": "connected"}
    return {"status": "failed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9999, reload=True)
