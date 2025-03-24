# Actualización del Sistema de Mensajes WhatsApp

## Problema
Actualmente, el sistema tiene un problema en el entorno local: no puede enviar mensajes a WhatsApp directamente usando la API de Gupshup debido a restricciones de IP (el error "Portal User Not Found With APIKey" indica que la API key solo funciona desde las IPs de los servidores en Render).

## Solución
Implementaremos un enfoque proxy:
1. El servidor local guarda los mensajes en Supabase 
2. Luego envía los mensajes a WhatsApp a través de un nuevo endpoint en el servidor de Render
3. El servidor de Render usa la API key de Gupshup para enviar los mensajes

## Instrucciones de implementación

### 1. Servidor de Render (Panel)

Debes agregar un nuevo endpoint a tu servidor en Render:

1. Abre tu repositorio de GitHub (Hernantb97/Render-wa)
2. Añade el código del archivo `add_proxy_endpoint_to_render.js` al final de tu `server.js` en el servidor
3. Haz commit y push a GitHub
4. Render detectará los cambios y actualizará automáticamente tu servidor

### 2. Verificación

1. Asegúrate de que tu servidor en Render tiene estas variables de entorno:
   - `GUPSHUP_API_KEY` = sk_8def1775845143bc8da6fbcfedb285c2
   - `WHATSAPP_SOURCE_NUMBER` = +5212228557784 (opcional)
   - `BUSINESS_NAME` = "Hernán Tenorio" (opcional)

2. Asegúrate de que en tu entorno local:
   - El archivo `.env` tenga `SIMULATE_WHATSAPP=false` (ya está configurado correctamente)
   - La URL correcta en `server.js` sea `https://panel-control-whatsapp.onrender.com/send-whatsapp-message-proxy` (ya está configurada correctamente)

### 3. Prueba

1. Inicia tu servidor local: `node server.js`
2. Envía un mensaje desde el dashboard
3. Verifica los logs de tu servidor local y del servidor en Render
4. Confirma que el mensaje aparece en WhatsApp

## Diagrama de flujo

```
📱 Dashboard Local → 💾 Supabase → 🖥️ Servidor Render → 📲 WhatsApp
```

## Solución de problemas

Si los mensajes no llegan a WhatsApp:
1. Verifica los logs en el servidor de Render
2. Confirma que la estructura del endpoint `/send-whatsapp-message-proxy` es correcta
3. Verifica que el formato de los números de teléfono sea el correcto (con código de país)
4. Verifica que las variables de entorno estén correctamente configuradas en Render 