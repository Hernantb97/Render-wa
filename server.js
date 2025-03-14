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
  // Para mensajes entrantes
  if (messageData?.payload?.source) return messageData.payload.source;
  if (messageData?.payload?.sender?.phone) return messageData.payload.sender.phone;
  // Para eventos de estado
  if (messageData?.payload?.destination) return messageData.payload.destination;
  return null;
};

// Función para extraer el texto del mensaje de diferentes estructuras
const extractMessageText = (messageData) => {
  // Estructura normal
  if (messageData?.payload?.text) return messageData.payload.text;
  // Estructura anidada
  if (messageData?.payload?.payload?.text) return messageData.payload.payload.text;
  return null;
};

// Función para determinar el tipo de evento
const getEventType = (messageData) => {
  // Primero intentamos obtener el tipo del payload
  const payloadType = messageData?.payload?.type;
  // Si no existe, intentamos obtener el tipo principal
  const mainType = messageData?.type;
  
  // Combinamos ambos para tener el tipo real
  const actualType = payloadType || mainType;
  
  if (actualType === 'message' || actualType === 'text') {
    return 'message';
  } else if (['delivered', 'sent', 'enqueued'].includes(actualType)) {
    return 'status';
  } else if (actualType === 'message-event') {
    // Para message-event, intentamos obtener el tipo específico
    const specificType = messageData?.payload?.type;
    return specificType || 'status';
  }
  return 'unknown';
};

// Función para guardar el mensaje en Supabase
const saveMessageToSupabase = async (data) => {
  try {
    console.log('Guardando en Supabase:', data);
    const { data: result, error } = await supabase
      .from('conversations')
      .insert([{
        user_id: data.phoneNumber,
        message: data.message,
        last_message_time: new Date().toISOString(),
        // Comentamos temporalmente los nuevos campos hasta actualizar la base de datos
        // message_type: data.eventType,
        // status: data.status,
      }]);

    if (error) {
      console.error('Error de Supabase:', error);
      throw error;
    }
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
    if (!messageData) {
      console.log('❌ No hay datos en el mensaje');
      return res.status(400).json({
        status: 'error',
        message: 'No hay datos en el mensaje'
      });
    }

    const eventType = getEventType(messageData);
    const phoneNumber = extractPhoneNumber(messageData);
    const messageText = extractMessageText(messageData);

    console.log('Datos procesados:', {
      eventType,
      phoneNumber,
      messageText
    });

    // Procesar según el tipo de evento
    switch (eventType) {
      case 'message':
      case 'text':
        if (!phoneNumber) {
          console.log('⚠️ Mensaje sin número de teléfono:', messageData);
          return res.status(200).json({
            status: 'warning',
            message: 'Mensaje sin número de teléfono'
          });
        }

        await saveMessageToSupabase({
          phoneNumber,
          message: messageText || 'Sin texto',
          eventType: 'message',
          status: 'received'
        });

        console.log('✅ Mensaje de texto guardado:', { phoneNumber, messageText });
        break;

      case 'delivered':
      case 'sent':
      case 'enqueued':
        if (!phoneNumber) {
          console.log('⚠️ Evento de estado sin número de teléfono');
          return res.status(200).json({
            status: 'warning',
            message: 'Evento de estado sin número de teléfono'
          });
        }

        await saveMessageToSupabase({
          phoneNumber,
          message: `Status update: ${eventType}`,
          eventType: 'status',
          status: eventType
        });

        console.log('📬 Evento de estado procesado:', { phoneNumber, eventType });
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
