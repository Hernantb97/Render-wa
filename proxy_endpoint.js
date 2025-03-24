/**
 * ENDPOINT PARA PROXY DE MENSAJES WHATSAPP
 * 
 * Instrucciones: 
 * 1. Copia este código y agrégalo a tu archivo server.js en el Servidor Panel de Render
 * 2. No necesitas crear un nuevo servidor, solo agregar este endpoint
 */

// Endpoint para recibir solicitudes del panel local y reenviarlas a Gupshup
app.post('/send-whatsapp-message-proxy', async (req, res) => {
  console.log('📨 Solicitud recibida en proxy de WhatsApp:', req.body);
  
  const { phoneNumber, message, conversationId, type = 'text' } = req.body;
  
  if (!phoneNumber || !message) {
    return res.status(400).json({
      success: false,
      message: 'Se requieren phoneNumber y message'
    });
  }
  
  try {
    // Configurar payload para Gupshup
    const gupshupPayload = {
      channel: "whatsapp",
      source: "+5212228557784", // Tu número verificado en Gupshup
      destination: phoneNumber,
      message: {
        type: "text",
        text: message
      },
      'src.name': "Hernán Tenorio" // Nombre del negocio
    };
    
    console.log('🔄 Enviando mensaje a Gupshup:', gupshupPayload);
    
    // Enviar mensaje a Gupshup
    const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.GUPSHUP_API_KEY // Usa la variable de entorno que ya funciona
      },
      body: JSON.stringify(gupshupPayload)
    });
    
    const responseData = await response.json();
    console.log('✅ Respuesta de Gupshup:', responseData);
    
    // Devolver respuesta
    return res.json({
      success: response.ok,
      message: response.ok ? 'Mensaje enviado correctamente' : 'Error al enviar mensaje',
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error al enviar mensaje a Gupshup:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    });
  }
}); 