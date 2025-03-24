# Instrucciones para completar la configuración de mensajes bidireccionales

## 1. Agregar Endpoint al Servidor de Render

Necesitas agregar un nuevo endpoint a tu servidor Panel en Render (el que conecta con Gupshup y Supabase). Sigue estos pasos:

1. Abre el código de tu servidor en Render (el archivo principal, probablemente `server.js`)
2. Agrega el código que está en el archivo `render_server_endpoint.js` al final de tu archivo
3. Guarda los cambios
4. Despliega los cambios a Render (puedes hacerlo mediante git push a GitHub)

## 2. Verificar variables de entorno en Render

Asegúrate de que tu servidor en Render tenga configuradas estas variables de entorno:

- `GUPSHUP_API_KEY`: Tu clave API de Gupshup (la que ya está funcionando)
- `WHATSAPP_SOURCE_NUMBER` (opcional): Tu número de teléfono verificado en Gupshup
- `BUSINESS_NAME` (opcional): El nombre de tu negocio

## 3. Verificar configuración local

En tu proyecto local, asegúrate de que:

1. El archivo `.env` tenga `SIMULATE_WHATSAPP=false`
2. La URL correcta esté configurada en tu archivo `server.js`:
   ```javascript
   const renderServerUrl = 'https://panel-control-whatsapp.onrender.com/send-whatsapp-message-proxy';
   ```
   (Reemplaza con la URL real de tu servidor en Render)

## 4. Probar

1. Envía un mensaje desde el dashboard
2. Verifica los logs de tu servidor en Render para asegurarte de que está recibiendo la solicitud
3. Verifica que el mensaje aparezca en WhatsApp

## Solución de problemas

Si los mensajes no llegan a WhatsApp:

1. Verifica los logs en tu servidor de Render para ver si hay errores
2. Confirma que la API key de Gupshup sea válida
3. Asegúrate de que el número de origen esté registrado y verificado en Gupshup
4. Intenta enviar un mensaje de prueba directamente usando la API de Gupshup 