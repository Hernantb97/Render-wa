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

## Configuración de la URL del Panel de Control

Para que el bot pueda registrar correctamente las respuestas en el panel de control, **actualiza la URL en el código del bot** de la siguiente manera:

1. Busca en el código del bot donde se define la URL para registrar respuestas (archivo que contiene la llamada a `/register-bot-response`).

2. Reemplaza la URL actual:
   ```js
   // Reemplazar esto:
   const controlPanelUrl = 'https://tu-app-real.onrender.com/register-bot-response';
   
   // Por esto:
   const controlPanelUrl = 'https://tu-app-real.onrender.com/register-bot-response';
   ```

   La URL debe seguir siendo la misma, pero asegúrate de que apunte al servidor Express que está funcionando correctamente.

## Verificación de la conexión

Para verificar que la conexión funciona correctamente, puedes:

1. Revisar los logs del bot para confirmar que las respuestas se registran correctamente en el panel de control.
2. Verificar en el panel de control que los mensajes aparecen en las conversaciones.

## Solución de problemas

Si sigues teniendo problemas con el error 404:

1. Verifica que el servidor del panel de control esté corriendo correctamente
2. Confirma que la ruta `/register-bot-response` está definida y accesible
3. Asegúrate de que no haya problemas de CORS que impidan la comunicación entre el bot y el panel

## Información técnica

El panel de control ahora utiliza el archivo `server.js` directamente como punto de entrada, eliminando la capa adicional de complejidad que antes causaba problemas con Next.js.

## Contacto

Si tienes algún problema o consulta, puedes contactar al equipo de desarrollo. 