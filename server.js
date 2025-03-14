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

// Webhook para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Datos recibidos desde Gupshup

  // Para depuración, imprime el mensaje completo recibido
  console.log('📩 Mensaje recibido completo:', JSON.stringify(messageData, null, 2));

  // Validación básica: Verificar que el evento tenga un payload
  if (!messageData || !messageData.payload) {
    console.log('❌ Mensaje o payload no encontrado en el evento');
    return res.status(400).send('Mensaje no válido');
  }

  const { payload } = messageData;
  const eventType = payload.type;

  // Verificación y manejo de mensajes de texto
  if (eventType === 'message' || eventType === 'text') {
    const message = payload.text;
    const phoneNumber = payload.source;

    if (!message || !phoneNumber) {
      console.log('❌ No se recibió un mensaje válido');
      return res.status(400).send('Mensaje no válido');
    }

    // Intentamos insertar el mensaje en la base de datos de Supabase
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([
          {
            user_id: phoneNumber,
            message: message,
            last_message_time: new Date().toISOString(),
          }
        ]);

      if (error) {
        console.error('❌ Error guardando el mensaje en Supabase:', error);
        return res.status(500).send('Error guardando el mensaje');
      }

      console.log('✅ Mensaje guardado correctamente:', data);
      return res.status(200).send('Mensaje recibido y guardado');
    } catch (err) {
      console.error('❌ Error procesando el webhook:', err);
      return res.status(500).send('Error procesando el webhook');
    }
  } 
  // Manejo de eventos de estado del mensaje
  else if (['delivered', 'sent', 'enqueued', 'message-event'].includes(eventType)) {
    console.log(`📬 Evento de mensaje '${eventType}' recibido:`, JSON.stringify(payload, null, 2));
    return res.status(200).send(`Evento '${eventType}' recibido`);
  } 
  // Tipo de evento no manejado
  else {
    console.log('❌ Tipo de evento no manejado:', eventType);
    return res.status(400).send('Tipo de evento no manejado');
  }
});

// Inicializamos el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('🚀 Servidor corriendo en http://localhost:3000');
});
