// Endpoint para recibir solicitudes del panel local y reenviarlas a través del sistema de encolado
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
    
    // En lugar de enviar directamente a Gupshup, encolamos el mensaje
    console.log('🔄 Encolando mensaje para el bot del panel');
    
    // Encolar el mensaje para que el bot lo recoja
    const messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    pendingMessages.push({
      id: messageId,
      phone: phoneNumber.replace(/\+/g, ''), // Eliminar el '+' si existe
      message,
      type,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Mensaje encolado con ID:', messageId);
    console.log('📊 Total de mensajes pendientes:', pendingMessages.length);
    
    // Devolver respuesta exitosa
    return res.json({
      success: true,
      message: 'Mensaje encolado correctamente para ser enviado a WhatsApp',
      messageId
    });
  } catch (error) {
    console.error('❌ Error general en endpoint /send-whatsapp-message-proxy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al encolar mensaje para WhatsApp',
      error: error.message
    });
  }
}); 