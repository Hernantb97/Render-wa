const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');  // Asegúrate de tener esta línea para importar axios

const app = express();
app.use(bodyParser.json());  // Middleware para analizar los datos JSON

// Inicializa Supabase con la URL y la API key correctas
const supabaseUrl = 'https://wscijkxwevgxbgwhbqtm.supabase.co';
const supabaseKey = 
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI';  
// Tu API Key de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Endpoint para recibir mensajes
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Datos recibidos del webhook
  console.log('Mensaje recibido completo:', JSON.stringify(messageData, null, 2));  // Para depuración

  // Validación del mensaje entrante
  if (messageData.type !== 'message') {
    console.log('Recibido un evento que no es un mensaje:', messageData);
    return res.status(400).send('Evento no válido');
  }

  // Intentamos extraer el mensaje y el número de teléfono
  let message = "";
  const phoneNumber = messageData?.destination;
  
  // Intentamos extraer el mensaje solo si es un mensaje de tipo "text"
  if (messageData?.sender?.payload?.text) {
    message = messageData.sender.payload.text;  // Extrae el texto del mensaje
  } else {
    console.log('No se encontró el campo "text" en el mensaje');
    return res.status(400).send('Mensaje no válido');
  }

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  // Intentamos insertar el mensaje en Supabase
  try {
    const { data, error } = await supabase
      .from('conversations')  // Inserta en la tabla 'conversations' de Supabase
      .insert([
        {
          user_id: phoneNumber,  // Usamos el número de teléfono como ID del usuario
          message: message,  // Insertamos el texto del mensaje
          last_message_time: new Date().toISOString(),  // Fecha y hora actual
        }
      ]);

    if (error) {
      console.error('Error guardando el mensaje en Supabase:', error);
      return res.status(500).send('Error guardando el mensaje en Supabase');
    }

    console.log('Mensaje guardado correctamente:', data);  // Confirmación de que el mensaje se guardó correctamente
    return res.status(200).send('Mensaje recibido y guardado');
  } catch (err) {
    console.error('Error procesando el webhook:', err);
    return res.status(500).send('Error procesando el webhook');
  }
});

// Inicializamos el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

