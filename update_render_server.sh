#!/bin/bash

# Script para actualizar el servidor de Render con el endpoint de proxy

echo "🚀 Creando commit para actualizar el servidor de Render..."

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ]; then
  echo "❌ Error: No se encontró el archivo server.js. Asegúrate de estar en el directorio correcto."
  exit 1
fi

# Verificar si tenemos cambios sin commitar
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Hay cambios sin commitar en tu repositorio."
  echo "Es recomendable hacer commit de estos cambios primero o usar 'git stash' para guardarlos temporalmente."
  read -p "¿Deseas continuar de todos modos? (s/n): " respuesta
  if [ "$respuesta" != "s" ]; then
    echo "🛑 Operación cancelada."
    exit 0
  fi
fi

# Crear una rama temporal para no afectar la rama principal
BRANCH_NAME="feature/add-whatsapp-proxy-endpoint"
git checkout -b $BRANCH_NAME

# Copiar el código del endpoint al archivo principal del servidor de Render
echo "📋 Preparando código para el servidor de Render..."
cp add_proxy_endpoint_to_render.js add_proxy_endpoint.js
echo "✅ Código preparado."

echo "🔍 Verificando estado de Git..."
git status

echo ""
echo "📝 INSTRUCCIONES PARA COMPLETAR LA ACTUALIZACIÓN:"
echo ""
echo "1. Sube el archivo 'add_proxy_endpoint.js' a tu repositorio de GitHub."
echo "2. Abre el repositorio en GitHub e integra el código de ese archivo al final de tu server.js"
echo "3. Render detectará los cambios y actualizará automáticamente tu servidor."
echo ""
echo "🧪 Después de la actualización, prueba el envío de mensajes desde tu panel local."
echo "📕 Consulta el archivo README_ACTUALIZACION.md para más detalles sobre la solución."
echo ""

read -p "¿Quieres abrir GitHub ahora? (s/n): " abrir_github
if [ "$abrir_github" = "s" ]; then
  git remote -v | grep origin | grep push | awk '{print $2}' | xargs -I {} open {}
fi

echo "✨ ¡Listo! Sigue las instrucciones anteriores para completar la actualización." 