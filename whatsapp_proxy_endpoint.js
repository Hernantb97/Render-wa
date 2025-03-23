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