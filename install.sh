#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Iniciando la instalación del entorno SoftwareVenta..."

# 1. Validar/Instalar uv (gestor ultrarrápido de paquetes de Python)
if ! command -v uv &> /dev/null; then
    echo "❌ 'uv' no está instalado. Instalando..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Intentar cargar el entorno de uv para usarlo inmediatamente
    source $HOME/.cargo/env 2>/dev/null || true
else
    echo "✅ 'uv' ya está instalado."
fi

# 2. Crear entorno virtual si no existe
echo "📦 Configurando el entorno virtual (.venv)..."
if [ ! -d ".venv" ]; then
    uv venv .venv
else
    echo "✅ Entorno virtual ya existe."
fi

# 3. Instalar dependencias
echo "📥 Instalando dependencias del backend..."
# Usamos el ejecutable de uv directamente dentro del entorno si hace falta, 
# pero 'uv pip' detecta automáticamente el .venv
uv pip install -r backend/requirements.txt

# 4. Iniciar base de datos con Docker
echo "🐳 Levantando contenedores de Docker (puede pedirte contraseña sudo)..."
if docker compose version &> /dev/null; then
    sudo docker compose up -d
elif command -v docker-compose &> /dev/null; then
    sudo docker-compose up -d
else
    echo "⚠️ Docker no está instalado. Por favor, instálalo para usar la base de datos."
fi

echo "================================================="
echo "✅ ¡INSTALACIÓN COMPLETADA CON ÉXITO!"
echo "================================================="
echo "➡️  Para arrancar el servidor backend, ejecuta:"
echo "    source .venv/bin/activate.fish"
echo "    cd backend && uvicorn main:app --port 9999 --reload"
echo "================================================="
