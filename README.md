# WhatsApp Business API Backend

Este proyecto es un backend para gestionar conversaciones de WhatsApp Business a través de Gupshup y la API oficial de WhatsApp.

## Configuración

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_de_supabase
GUPSHUP_API_KEY=tu_clave_de_gupshup
```

### Configuración de Gupshup

1. Accede a tu panel de Gupshup
2. Configura el webhook para recibir mensajes:
   - URL del webhook: `https://render-wa.onrender.com/webhook`
   - Método: POST
   - Tipo de contenido: application/json

## Endpoints API

### Webhook principal
- **URL**: `/webhook`
- **Método**: POST
- **Descripción**: Recibe mensajes de WhatsApp en diferentes formatos y los procesa.

### Webhook específico para Gupshup
- **URL**: `/gupshup`
- **Método**: POST
- **Descripción**: Endpoint optimizado para el formato de Gupshup.

### Actualizar color de chat
- **URL**: `/update-chat-color`
- **Método**: POST
- **Cuerpo**: `{ "conversationId": "uuid", "color": "#hexcode" }`

### Activar/desactivar bot
- **URL**: `/toggle-bot`
- **Método**: POST
- **Cuerpo**: `{ "conversationId": "uuid", "isActive": boolean }`

### Verificar número
- **URL**: `/check-phone/:phone`
- **Método**: GET
- **Descripción**: Verifica si un número existe en la base de datos.

## Estructura de la base de datos

### Tablas principales
- `businesses`: Información de los negocios
- `conversations`: Conversaciones entre usuarios y negocios
- `messages`: Mensajes individuales dentro de las conversaciones

## Despliegue

El proyecto está configurado para desplegarse automáticamente en Render cuando se suben cambios al repositorio de GitHub.

# WhatsApp Bot para CUPRA

Este proyecto contiene el bot de WhatsApp para CUPRA, diseñado para interactuar con clientes a través de WhatsApp.

## Configuración del Bot de WhatsApp

### Conexión con el Panel de Control

Para que el bot de WhatsApp pueda registrar las conversaciones en el panel de control, debes configurar la URL del panel correctamente:

1. En el código del bot de WhatsApp, busca la variable de entorno `CONTROL_PANEL_URL` o la definición equivalente.

2. Establece la URL completa del panel de control incluyendo la ruta `/register-bot-response`:

```js
// Ejemplo en el archivo .env del bot
CONTROL_PANEL_URL=https://tu-panel-control.onrender.com/register-bot-response
```

### Verificación de la Conexión

Para verificar que la comunicación entre el bot y el panel de control funciona correctamente:

1. Puedes realizar una prueba enviando una solicitud a la ruta `/test-bot`:

```bash
curl -X POST https://tu-panel-control.onrender.com/test-bot \
  -H "Content-Type: application/json" \
  -d '{"test": "mensaje de prueba"}'
```

2. Verifica los logs del servidor para confirmar que la solicitud fue recibida.

### Solución de Problemas

Si encuentras errores 404 al registrar mensajes:

1. Verifica que la URL del panel de control sea correcta y esté accesible.
2. Asegúrate de que el endpoint `/register-bot-response` esté definido correctamente.
3. Revisa los logs del servidor para identificar posibles errores.
4. Confirma que el middleware está redirigiendo correctamente las solicitudes.

## Verificación de la conexión

Para verificar que la conexión funciona correctamente, puedes:

1. Revisar los logs del bot para confirmar que las respuestas se registran correctamente en el panel de control.
2. Verificar en el panel de control que los mensajes aparecen en las conversaciones.

## Información técnica

El panel de control ahora utiliza el archivo `server.js` directamente como punto de entrada, eliminando la capa adicional de complejidad que antes causaba problemas con Next.js.

## Contacto

Si tienes algún problema o consulta, puedes contactar al equipo de desarrollo. 