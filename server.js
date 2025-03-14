const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

const supabase = createClient(
  'https://wscijkxwevgxbgwhbqtm.supabase.co',  // URL de tu Supabase
  
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI' 
// Tu clave de API
);

app.post('/webhook', async (req, res) => {
  const messageData = req.body;
  console.log('Mensaje recibido:', JSON.stringify(messageData, null, 2));

  // Asegurarnos de que recibimos el texto del mensaje
  const message = messageData?.sender?.payload?.text;  // Asegúrate de que estás extrayendo el mensaje correctamente
  const phoneNumber = messageData?.destination;  // Asegúrate de que el número de teléfono esté correctamente extraído

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  try {
    // Guardar mensaje en la base de datos de Supabase
    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          user_id: phoneNumber,  // Usa el número de teléfono como el ID del usuario
          message: message,  // El texto del mensaje
          last_message_time: new Date().toISOString(),  // Hora del mensaje
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

// Inicializar servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

