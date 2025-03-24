require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { supabase } = require('./lib/supabase');
const fetch = require('node-fetch');

const app = express();

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(bodyParser.json());

// Endpoint para enviar mensajes a WhatsApp
app.post('/send-whatsapp-message', async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    
    if (!conversationId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requieren conversationId y message'
      });
    }

    // Obtener información de la conversación
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id, business_id')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('Error obteniendo conversación:', convError);
      return res.status(500).json({
        status: 'error',
        message: 'Error al obtener información de la conversación'
      });
    }

    // Obtener información del negocio
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('whatsapp_number, name')
      .eq('id', conversation.business_id)
      .single();

    if (businessError) {
      console.error('Error obteniendo negocio:', businessError);
      return res.status(500).json({
        status: 'error',
        message: 'Error al obtener información del negocio'
      });
    }

    // Configurar payload para Gupshup
    const gupshupPayload = {
      channel: "whatsapp",
      source: business.whatsapp_number,
      destination: conversation.user_id,
      message: {
        type: "text",
        text: message
      },
      'src.name': business.name
    };

    // Enviar mensaje a Gupshup
    const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.GUPSHUP_API_KEY
      },
      body: JSON.stringify(gupshupPayload)
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }

    if (!response.ok) {
      console.error('Error al enviar mensaje a Gupshup:', responseData);
      return res.status(500).json({
        status: 'error',
        message: 'Error al enviar mensaje a WhatsApp',
        details: responseData
      });
    }

    // Guardar el mensaje en la base de datos
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        content: message,
        sender_type: 'business',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (messageError) {
      console.error('Error guardando mensaje:', messageError);
      return res.status(500).json({
        status: 'error',
        message: 'Error al guardar el mensaje en la base de datos'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Mensaje enviado correctamente',
      data: messageData
    });

  } catch (error) {
    console.error('Error en endpoint /send-whatsapp-message:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Webhook para recibir mensajes de Gupshup
app.post('/webhook', async (req, res) => {
  try {
    const messageData = req.body;
    console.log('Webhook - Mensaje recibido:', messageData);

    // Procesar el mensaje según su tipo
    const eventType = messageData?.type;
    if (eventType === 'message-event') {
      console.log('Detectado evento de actualización de estado (message-event)');
      const status = messageData?.payload?.type;
      const destination = messageData?.payload?.destination;
      const messageId = messageData?.payload?.id;

      if (status && destination && messageId) {
        console.log(`Actualizando estado para mensaje dirigido a ${destination} con ID ${messageId} a estado ${status}`);
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    return res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
}); 