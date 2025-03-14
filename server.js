require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());  // Middleware para analizar los datos JSON

// Inicializa Supabase con la URL y la API key correctas
const supabase = createClient(
  'https://wscijkxwevgxbgwhbqtm.supabase.co',
  
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI'
);

// Función para extraer el número de teléfono de diferentes estructuras de mensaje
const extractPhoneNumber = (messageData) => {
  if (messageData?.payload?.source) return messageData.payload.source;
  if (messageData?.payload?.sender?.phone) return messageData.payload.sender.phone;
  if (messageData?.payload?.destination) return messageData.payload.destination;
  return null;
};

// Función para extraer el texto del mensaje de diferentes estructuras
const extractMessageText = (messageData) => {
  if (messageData?.payload?.payload?.text) return messageData.payload.payload.text;
  if (messageData?.payload?.text) return messageData.payload.text;
  return null;
};

// Función para determinar el tipo de evento
const getEventType = (messageData) => {
  const mainType = messageData?.payload?.type || messageData?.type;
  const isStatusEvent = ['delivered', 'sent', 'enqueued'].includes(mainType);
  
  if (mainType === 'message' || mainType === 'text') {
    return 'message';
  } else if (isStatusEvent || mainType === 'message-event') {
    return 'status';
  }
  return 'unknown';
};

// Función para guardar el mensaje en Supabase
const saveMessageToSupabase = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('conversations')
      .insert([{
        user_id: data.phoneNumber,
        message: data.message,
        message_type: data.eventType,
        status: data.status,
        last_message_time: new Date().toISOString(),
      }]);

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error guardando en Supabase:', error);
    throw error;
  }
};

// Webhook para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    const messageData = req.body;
    console.log('📩 Mensaje recibido completo:', JSON.stringify(messageData, null, 2));

    // Validación básica
    if (!messageData || !messageData.payload) {
      console.log('❌ Estructura de mensaje inválida');
      return res.status(400).json({
        status: 'error',
        message: 'Estructura de mensaje inválida'
      });
    }

    const eventType = getEventType(messageData);
    const phoneNumber = extractPhoneNumber(messageData);
    const messageText = extractMessageText(messageData);

    // Procesar según el tipo de evento
    switch (eventType) {
      case 'message':
        if (!phoneNumber || !messageText) {
          console.log('⚠️ Mensaje incompleto:', { phoneNumber, messageText });
          return res.status(200).json({
            status: 'warning',
            message: 'Mensaje recibido incompleto'
          });
        }

        await saveMessageToSupabase({
          phoneNumber,
          message: messageText,
          eventType: 'message',
          status: 'received'
        });

        console.log('✅ Mensaje de texto guardado:', { phoneNumber, messageText });
        break;

      case 'status':
        if (!phoneNumber) {
          console.log('⚠️ Evento de estado sin número de teléfono');
          return res.status(200).json({
            status: 'warning',
            message: 'Evento de estado sin número de teléfono'
          });
        }

        const status = messageData.payload.type;
        await saveMessageToSupabase({
          phoneNumber,
          message: `Status update: ${status}`,
          eventType: 'status',
          status: status
        });

        console.log('📬 Evento de estado procesado:', { phoneNumber, status });
        break;

      default:
        console.log('ℹ️ Tipo de evento no manejado:', eventType);
        return res.status(200).json({
          status: 'info',
          message: `Tipo de evento no requiere procesamiento: ${eventType}`
        });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Mensaje procesado correctamente'
    });

  } catch (error) {
    console.error('❌ Error en el webhook:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Inicializamos el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('🚀 Servidor corriendo en http://localhost:3000');
});
