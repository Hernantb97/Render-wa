// Requiere el paquete express
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

// Crea el cliente de Supabase con tu URL y clave de API
const supabase = createClient('https://wscijkxwevgxbgwhbqtm.supabase.co', 
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI');

// Endpoint para recibir los mensajes
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Recibe el cuerpo del mensaje desde Gupshup
  console.log('Mensaje recibido:', JSON.stringify(messageData, null, 2));  // Para depuración

  // Verifica si hay un campo "sender" y si contiene un "payload" con "text"
  const message = messageData?.sender?.payload?.text;  // Mensaje de texto
  const phoneNumber = messageData?.destination;  // Número de teléfono

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  // Intentamos guardar el mensaje en la base de datos
  try {
    const { data, error } = await supabase
      .from('conversations')  // Tabla donde se guardan los mensajes
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

