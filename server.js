const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');  // Importamos el cliente de Supabase

const app = express();
app.use(bodyParser.json());

// Configura el cliente de Supabase
const supabase = createClient('https://wscijkxwevgxbgwhbqtm.supabase.co', 
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI');

app.post('/webhook', async (req, res) => {
  const messageData = req.body;
  console.log('Mensaje recibido:', messageData);  // Verifica que recibimos los datos de Gupshup

  // Extraer el mensaje y el número de teléfono
  const message = messageData?.payload?.sender?.payload?.text;  // Obtener el texto del mensaje
  const phoneNumber = messageData?.destination;  // Número de teléfono del destinatario

  if (message) {
    try {
      // Insertar el mensaje en la base de datos de Supabase
      const { data, error } = await supabase
        .from('conversations')  // Nombre de tu tabla en Supabase
        .insert([
          {
            user_id: phoneNumber,  // Número de teléfono como ID del usuario
            message: message,  // El texto del mensaje
            last_message_time: new Date().toISOString(),  // Tiempo actual
          }
        ]);

      if (error) {
        console.error('Error guardando el mensaje:', error);
        return res.status(500).send('Error guardando el mensaje');
      }

      console.log('Mensaje guardado correctamente en la base de datos:', data);
      return res.status(200).send('Mensaje recibido y guardado');
    } catch (err) {
      console.error('Error procesando el webhook:', err);
      return res.status(500).send('Error procesando el webhook');
    }
  } else {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

