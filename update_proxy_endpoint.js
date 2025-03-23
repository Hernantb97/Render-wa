// Endpoint mejorado para recibir solicitudes del panel local y reenviarlas a Gupshup
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
    
    // Leer la respuesta como texto para manejar mejor los errores
    const responseText = await response.text();
    console.log('📄 Respuesta de Gupshup (texto):', responseText);
    
    let responseData;
    let isJsonResponse = false;
    
    try {
      responseData = JSON.parse(responseText);
      isJsonResponse = true;
      console.log('✅ Respuesta de Gupshup (JSON):', responseData);
    } catch (e) {
      console.error('⚠️ Respuesta no JSON de Gupshup:', responseText);
      responseData = { 
        rawResponse: responseText,
        error: 'Error al parsear respuesta' 
      };
    }
    
    // Comprobar si es un error de autenticación
    if (responseText.includes("Portal User Not Found With APIKey")) {
      console.error('❌ Error de autenticación con Gupshup: API key no válida o restricción de IP');
      return res.status(401).json({
        success: false,
        message: 'Error de autenticación con Gupshup',
        error: 'Portal User Not Found With APIKey - Verifica que la API key sea válida y que no haya restricciones de IP'
      });
    }
    
    // Si la respuesta no fue exitosa y no es un error específico ya manejado
    if (!response.ok && !responseText.includes("Portal User Not Found")) {
      return res.status(response.status).json({
        success: false,
        message: 'Error al enviar mensaje a Gupshup',
        error: isJsonResponse ? responseData.error : responseText
      });
    }
    
    // Si la respuesta es exitosa
    if (response.ok) {
      return res.json({
        success: true,
        message: 'Mensaje enviado correctamente a WhatsApp',
        data: isJsonResponse ? responseData : { rawResponse: responseText }
      });
    } else {
      // Para cualquier otro tipo de error
      return res.status(500).json({
        success: false,
        message: 'Error al enviar mensaje a Gupshup',
        error: isJsonResponse ? responseData.error : responseText
      });
    }
  } catch (error) {
    console.error('❌ Error general en endpoint /send-whatsapp-message-proxy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje a WhatsApp',
      error: error.message
    });
  }
}); 