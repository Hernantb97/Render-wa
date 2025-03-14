const express = require('express');  // Asegúrate de que Express esté importado
const bodyParser = require('body-parser');  // Asegúrate de que bodyParser esté importado
const { createClient } = require('@supabase/supabase-js');  // Importa Supabase para la conexión

const app = express();
app.use(bodyParser.json());  // Middleware para analizar los datos JSON

// Inicializa Supabase con la URL y la API key correctas
const supabase = createClient(
  'https://wscijkxwevgxbgwhbqtm.supabase.co',  // Tu URL de Supabase
  
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI' 
// Tu clave de API de Supabase
);

// Endpoint de Webhook
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Datos recibidos del webhook
  console.log('Mensaje recibido:', JSON.stringify(messageData, null, 2));  // Muestra el mensaje completo de forma legible en los logs

  // Extraemos el mensaje y el número de teléfono
  const message = messageData?.sender?.payload?.text;  // Extrae el texto del mensaje
  const phoneNumber = messageData?.destination;  // Extrae el número de teléfono

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');  // Si no hay mensaje o teléfono, retornar un error
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
      return res.status(500).send('Error guardando el mensaje');
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

