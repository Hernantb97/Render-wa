const { v5: uuidv5 } = require('uuid');  // Importa la función de UUIDv5
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

// Inicializa la aplicación Express
const app = express();
app.use(bodyParser.json());  // Middleware para analizar los datos JSON

// Conexión con Supabase (USA LAS CLAVES QUE ME PROPORCIONASTE)
const supabase = createClient(
  'https://wscijkxwevgxbgwhbqtm.supabase.co',  // Tu URL de Supabase
  
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI'  
// Tu API Key de Supabase
);

// Definir un namespace único para generar UUID (puede ser cualquier valor único)
const NAMESPACE = 'com.myapp';  // Namespace único para la generación del UUID

// Endpoint del webhook de Gupshup
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Datos recibidos desde Gupshup
  console.log('Mensaje recibido:', messageData);  // Para depuración

  const message = messageData?.sender?.payload?.text;  // Extraer el texto del mensaje
  const phoneNumber = messageData?.destination;  // Extraer el número de teléfono

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  // Convertir el número de teléfono a UUID usando uuidv5
  const userId = uuidv5(phoneNumber, NAMESPACE);  // Generar UUID basado en el número de teléfono

  // Insertar el mensaje en la base de datos de Supabase
  try {
    const { data, error } = await supabase
      .from('conversations')  // Insertar en la tabla 'conversations' en Supabase
      .insert([
        {
          user_id: userId,  // Usar el UUID generado a partir del número de teléfono
          message: message,  // Insertar el texto del mensaje
          last_message_time: new Date().toISOString(),  // Fecha y hora actual
        }
      ]);

    if (error) {
      console.error('Error guardando el mensaje en Supabase:', error);
      return res.status(500).send('Error guardando el mensaje');
    }

    console.log('Mensaje guardado correctamente:', data);  // Confirmación de que el mensaje fue guardado
    return res.status(200).send('Mensaje recibido y guardado');
  } catch (err) {
    console.error('Error procesando el webhook:', err);
    return res.status(500).send('Error procesando el webhook');
  }
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

