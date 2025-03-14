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

// Función para validar la estructura del mensaje
const validateMessageStructure = (messageData) => {
  if (!messageData || typeof messageData !== 'object') {
    throw new Error('Mensaje inválido: estructura base no encontrada');
  }

  if (!messageData.payload || typeof messageData.payload !== 'object') {
    throw new Error('Mensaje inválido: payload no encontrado o inválido');
  }

  const { payload } = messageData;
  
  if (!payload.type) {
    throw new Error('Mensaje inválido: tipo de evento no especificado');
  }

  return {
    isValid: true,
    payload
  };
};

// Función para normalizar el mensaje antes de guardarlo
const normalizeMessage = (payload) => {
  const phoneNumber = payload.source || payload.sender || payload.from;
  let message = payload.text;
  
  // Si no hay texto pero hay un mensaje en payload.payload (casos especiales)
  if (!message && payload.payload && payload.payload.text) {
    message = payload.payload.text;
  }

  // Limpieza básica del mensaje
  if (message) {
    message = message.trim();
  }

  return {
    phoneNumber,
    message,
    timestamp: new Date().toISOString()
  };
};

// Función para guardar el mensaje en Supabase
const saveMessageToSupabase = async (normalizedData) => {
  const { phoneNumber, message, timestamp } = normalizedData;

  if (!phoneNumber || !message) {
    throw new Error('Datos insuficientes para guardar el mensaje');
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert([
      {
        user_id: phoneNumber,
        message: message,
        last_message_time: timestamp,
      }
    ]);

  if (error) {
    throw new Error(`Error al guardar en Supabase: ${error.message}`);
  }

  return data;
};

// Webhook para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    console.log('📩 Mensaje recibido:', JSON.stringify(req.body, null, 2));

    // Validar estructura del mensaje
    const { payload } = validateMessageStructure(req.body);
    const eventType = payload.type.toLowerCase();

    // Manejar diferentes tipos de eventos
    if (['message', 'text'].includes(eventType)) {
      // Normalizar datos del mensaje
      const normalizedData = normalizeMessage(payload);
      
      if (!normalizedData.message) {
        console.log('⚠️ Mensaje sin contenido de texto:', JSON.stringify(payload, null, 2));
        return res.status(200).send('Mensaje recibido sin contenido de texto');
      }

      // Guardar mensaje en Supabase
      const savedData = await saveMessageToSupabase(normalizedData);
      console.log('✅ Mensaje guardado exitosamente:', savedData);
      
      return res.status(200).json({
        status: 'success',
        message: 'Mensaje procesado y guardado correctamente'
      });
    } 
    // Manejar eventos de estado
    else if (['delivered', 'sent', 'enqueued', 'message-event'].includes(eventType)) {
      console.log(`📬 Evento de estado recibido (${eventType}):`, JSON.stringify(payload, null, 2));
      return res.status(200).json({
        status: 'success',
        message: `Evento de estado ${eventType} procesado`
      });
    } 
    else {
      console.log('⚠️ Tipo de evento no manejado:', eventType);
      return res.status(200).json({
        status: 'warning',
        message: `Tipo de evento ${eventType} no requiere procesamiento`
      });
    }
  } catch (error) {
    console.error('❌ Error en el webhook:', error.message);
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
