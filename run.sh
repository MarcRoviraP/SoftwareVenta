#!/bin/bash

set -e

echo "🚀 Arrancando el entorno completo de SoftwareVenta..."

# Handler para limpiar procesos al salir (Ctrl+C)
cleanup() {
    echo ""
    echo "🛑 Deteniendo servidores..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Asegurar que la base de datos está corriendo
echo "🐳 Verificando base de datos PostgreSQL..."
if docker compose version &> /dev/null; then
    sudo docker compose up -d
elif command -v docker-compose &> /dev/null; then
    sudo docker-compose up -d
else
    echo "⚠️ No se detectó Docker. Si la base de datos no está arriba, podrían fallar las conexiones."
fi

echo ""
echo "⚡ Arrancando servicios en paralelo..."
echo "🌐 API Backend: http://localhost:9999 (Docs: http://localhost:9999/docs)"
echo "🖥️ Web Frontend: http://localhost:5173"
echo "Presiona Ctrl+C para detener ambos servidores."
echo "----------------------------------------------------"

# 2. Iniciar el servidor backend en segundo plano
(cd backend && ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 9999 --reload) &
BACKEND_PID=$!

# 3. Iniciar el servidor frontend en segundo plano
(cd frontendWeb && npm run dev) &
FRONTEND_PID=$!

# Esperar a que ambos procesos finalicen o el usuario cancele
wait $BACKEND_PID $FRONTEND_PID

