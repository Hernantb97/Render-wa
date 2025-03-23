# WhatsApp Business API Backend

Este proyecto es un backend para gestionar conversaciones de WhatsApp Business a través de Gupshup y la API oficial de WhatsApp.

## Configuración

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_de_supabase
GUPSHUP_API_KEY=tu_clave_de_gupshup
WHATSAPP_SOURCE_NUMBER=+5212228557784
BUSINESS_NAME="Hernán Tenorio"
```

### Configuración de Gupshup

1. Accede a tu panel de Gupshup
2. Configura el webhook para recibir mensajes:
   - URL del webhook: `https://render-wa.onrender.com/webhook`

### Comunicación con Entornos Locales

Este servidor ahora incluye un endpoint proxy que permite a las aplicaciones locales enviar mensajes a WhatsApp a través de Gupshup:

```
POST /send-whatsapp-message-proxy
```

Parámetros:
- `phoneNumber`: Número de teléfono del destinatario (con código de país)
- `message`: Contenido del mensaje a enviar
- `conversationId`: ID de la conversación (opcional)
- `type`: Tipo de mensaje (por defecto: 'text')

Este endpoint es especialmente útil cuando las aplicaciones locales no pueden usar directamente la API de Gupshup debido a restricciones de IP.

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
CONTROL_PANEL_URL=https://render-wa.onrender.com/register-bot-response
```

> **IMPORTANTE**: En los logs actuales del bot vemos que está usando `https://render-wa.onrender.com/register-bot-response`. Asegúrate de que esta URL coincida con el dominio real de tu panel de control en Render.

### Verificación de la Conexión

Para verificar que la comunicación entre el bot y el panel de control funciona correctamente:

1. Puedes realizar una prueba usando el script de verificación incluido:

```bash
# Ejecutar el script de verificación de rutas
node verify-routes.js
```

2. También puedes probar manualmente con curl:

```bash
curl -X POST https://render-wa.onrender.com/test-bot \
  -H "Content-Type: application/json" \
  -d '{"test": "mensaje de prueba"}'
```

3. Verifica los logs del servidor para confirmar que la solicitud fue recibida.

### Solución de Problemas

Si encuentras errores 404 al registrar mensajes:

1. Verifica que el dominio correcto está configurado tanto en el bot como en el panel de control.
2. Ejecuta `node verify-routes.js` para diagnosticar posibles problemas.
3. Asegúrate de que los cambios están desplegados correctamente en Render.
4. Revisa la configuración del archivo `render.yaml` para confirmar las rutas.
5. Confirma que el middleware está redirigiendo correctamente las solicitudes.

## Verificación de la conexión

Para verificar que la conexión funciona correctamente, puedes:

1. Revisar los logs del bot para confirmar que las respuestas se registran correctamente en el panel de control.
2. Verificar en el panel de control que los mensajes aparecen en las conversaciones.

## Información técnica

El panel de control ahora utiliza el archivo `server.js` directamente como punto de entrada, eliminando la capa adicional de complejidad que antes causaba problemas con Next.js.

## Contacto

Si tienes algún problema o consulta, puedes contactar al equipo de desarrollo.

## Configuración de Gupshup para WhatsApp

Para que los mensajes enviados desde el panel lleguen a WhatsApp, cada negocio en la plataforma debe tener su propia cuenta de Gupshup configurada:

1. **Requisitos previos**:
   - Cada negocio debe tener una cuenta en [Gupshup](https://www.gupshup.io/)
   - Cada negocio debe tener su número de WhatsApp verificado
   - Obtener la API key de Gupshup específica para WhatsApp

2. **Actualizar la configuración del negocio**:
   - Modifica el archivo `update_gupshup_key.js` con la clave API correspondiente
   - Ejecuta el script: `node update_gupshup_key.js`
   - Confirma que la clave se haya actualizado correctamente

3. **Probar la integración**:
   - Envía un mensaje desde el panel
   - Verifica que:
     a) El mensaje se guarde en la base de datos
     b) El mensaje llegue al número de WhatsApp del cliente
     c) El bot se desactive automáticamente

Nota: Si no configuras la API key de Gupshup, los mensajes se guardarán en la base de datos pero no se enviarán a WhatsApp. 