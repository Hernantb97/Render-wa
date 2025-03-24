# Instrucciones para Actualizar el Servidor de Render Directamente

Para solucionar el problema de envío de mensajes a WhatsApp, debes agregar un nuevo endpoint al servidor de Render. Puedes hacerlo directamente desde el panel de control de Render, sin necesidad de usar GitHub.

## Pasos para Actualizar el Servidor de Render

1. Inicia sesión en tu cuenta de [Render](https://dashboard.render.com/)
2. Navega a tu servicio "panel-control-whatsapp"
3. En la parte superior, ve a la pestaña "Shell"
4. Usa el editor de Render para modificar el archivo server.js:
   ```
   nano server.js
   ```
5. Navega hasta el final del archivo (usa Ctrl+End o las flechas para moverte hasta el final)
6. **ANTES** de la línea donde defines el puerto o inicias el servidor (`const PORT = ...` o `app.listen(...)`), pega el siguiente código:

```javascript
// Endpoint para recibir solicitudes del panel local y reenviarlas a Gupshup
app.post('/send-whatsapp-message-proxy', async (req, res) => {
  try {
    console.log('📨 Solicitud recibida en proxy de WhatsApp:', req.body);
    
    const { phoneNumber, message, conversationId, type = 'text' } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren phoneNumber y message'
      });
    }
    
    // Configurar payload para Gupshup
    const gupshupPayload = {
      channel: "whatsapp",
      source: process.env.WHATSAPP_SOURCE_NUMBER || "+5212228557784", // Tu número verificado en Gupshup
      destination: phoneNumber,
      message: {
        type: "text",
        text: message
      },
      'src.name': process.env.BUSINESS_NAME || "Hernán Tenorio" // Nombre del negocio
    };
    
    console.log('🔄 Enviando mensaje a Gupshup:', gupshupPayload);
    
    // Verificar que tengamos la API key
    if (!process.env.GUPSHUP_API_KEY) {
      console.error('❌ Error: GUPSHUP_API_KEY no está configurado en las variables de entorno');
      return res.status(500).json({
        success: false,
        message: 'API key de Gupshup no configurada'
      });
    }
    
    // Enviar mensaje a Gupshup
    const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.GUPSHUP_API_KEY // Usa la variable de entorno
      },
      body: JSON.stringify(gupshupPayload)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Error al parsear respuesta de Gupshup:', responseText);
      responseData = { error: 'Error al parsear respuesta' };
    }
    
    console.log('✅ Respuesta de Gupshup:', responseData);
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: 'Error al enviar mensaje a Gupshup',
        error: responseData.error || responseText
      });
    }
    
    // Devolver respuesta exitosa
    return res.json({
      success: true,
      message: 'Mensaje enviado correctamente a WhatsApp',
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error general en endpoint /send-whatsapp-message-proxy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje a WhatsApp',
      error: error.message
    });
  }
});
```

7. Guarda el archivo en el editor nano:
   - Presiona `Ctrl+O` para guardar
   - Presiona `Enter` para confirmar
   - Presiona `Ctrl+X` para salir

8. Reinicia el servidor:
   ```
   kill $(lsof -t -i:10000)
   ```
   (Reemplaza 10000 por el puerto que use tu servidor si es diferente)

9. Verifica que el servidor se haya reiniciado correctamente.

## Verifica las Variables de Entorno

Asegúrate de que tu servidor en Render tenga configuradas estas variables de entorno:

1. Ve a la pestaña "Environment" en el panel de Render
2. Verifica que existan estas variables:
   - `GUPSHUP_API_KEY` = sk_8def1775845143bc8da6fbcfedb285c2
   - `WHATSAPP_SOURCE_NUMBER` = +5212228557784 (opcional)
   - `BUSINESS_NAME` = "Hernán Tenorio" (opcional)
3. Si no existen, agrégalas y haz clic en "Save Changes"

## Prueba el Funcionamiento

Una vez realizados estos cambios, prueba enviar un mensaje desde tu panel local:

1. Asegúrate de que tu aplicación local esté utilizando la URL correcta:
   ```javascript
   const renderServerUrl = 'https://panel-control-whatsapp.onrender.com/send-whatsapp-message-proxy';
   ```

2. Envía un mensaje desde el dashboard local
3. Verifica los logs en Render para confirmar que el mensaje está siendo recibido y procesado correctamente 