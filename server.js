const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

// Actualiza con tus claves correctas de Supabase
const supabase = createClient('https://wscijkxwevgxbgwhbqtm.supabase.co', 
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI');

// Endpoint para recibir mensajes
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Recibe el cuerpo del mensaje desde Gupshup

  console.log('Mensaje recibido completo:', JSON.stringify(messageData, null, 2));  // Imprime todo el contenido del mensaje

  // Intentamos extraer el texto del mensaje de una manera más robusta
  let message = "";
  if (messageData && messageData.sender && messageData.sender.payload) {
    if (messageData.sender.payload.text) {
      message = messageData.sender.payload.text;  // Extrae el texto del mensaje
    } else {
      console.log('No se encontró el campo "text" en el mensaje');
    }
  } else {
    console.log('La estructura del mensaje es inesperada:', messageData);
  }

  const phoneNumber = messageData?.destination;  // Número de teléfono

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  // Intentamos guardar el mensaje en Supabase
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          user_id: phoneNumber,  // Guardar el número de teléfono como ID del usuario
          message: message,  // Guardar el texto del mensaje
          last_message_time: new Date().toISOString(),  // Fecha y hora del mensaje
        }
      ]);

    if (error) {
      console.error('Error guardando el mensaje en Supabase:', error);
      return res.status(500).send('Error guardando el mensaje');
    }

    console.log('Mensaje guardado correctamente:', data);
    return res.status(200).send('Mensaje recibido y guardado');
  } catch (err) {
    console.error('Error procesando el webhook:', err);
    return res.status(500).send('Error procesando el webhook');
  }
});

// Inicia el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

