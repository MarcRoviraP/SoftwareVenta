from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sockets import manager

router = APIRouter(prefix="/ws", tags=["WebSockets"])

@router.websocket("/central")
async def websocket_endpoint(websocket: WebSocket):
    # En producción aquí se debería verificar un token
    await manager.connect(websocket)
    try:
        while True:
            # Mantener la conexión viva y escuchar a clientes si hace falta
            data = await websocket.receive_text()
            # Podríamos reenviar mensajes si fuese necesario
    except WebSocketDisconnect:
        manager.disconnect(websocket)
