#!/bin/bash

set -e

echo "🚀 Arrancando el entorno de SoftwareVenta..."

# 1. Asegurar que la base de datos está corriendo
echo "🐳 Verificando base de datos PostgreSQL..."
if docker compose version &> /dev/null; then
    sudo docker compose up -d
elif command -v docker-compose &> /dev/null; then
    sudo docker-compose up -d
else
    echo "⚠️ No se detectó Docker. Si la base de datos no está arriba, podrían fallar las conexiones."
fi

# 2. Iniciar el servidor backend
echo "⚡ Arrancando el backend con FastAPI..."
echo "🌐 API disponible en: http://localhost:9999"
echo "📚 Documentación Swagger en: http://localhost:9999/docs"
echo ""

# Usamos el ejecutable del entorno virtual directamente
cd backend && ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 9999 --reload
