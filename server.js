const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { v5: uuidv5 } = require('uuid');  // Importar la librería uuid

const app = express();
app.use(bodyParser.json());  // Middleware para analizar los datos JSON

// Inicializa Supabase con la URL y la API key correctas
const supabase = createClient(
  'https://wscijkxwevgxbgwhbqtm.supabase.co',
  
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI'
);

// Webhook para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Datos recibidos desde Gupshup

  // Para depuración, imprime el mensaje completo recibido
  console.log('Mensaje recibido completo:', JSON.stringify(messageData, null, 2));

  // Validación básica: Verificar que sea un mensaje de tipo "text"
  if (!messageData || !messageData.sender || !messageData.sender.payload || !messageData.sender.payload.text) {
    console.log('No se encontró el campo "text" en el mensaje');
    return res.status(400).send('Mensaje no válido');
  }

  const phoneNumber = messageData?.destination;  // Número de teléfono del destinatario
  const message = messageData?.sender?.payload?.text;  // Texto del mensaje recibido

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  // Convertir el número de teléfono a un UUID compatible con Supabase
  const userUuid = uuidv5(phoneNumber, uuidv5.DNS);  // Usamos UUID v5 basado en el número de teléfono

  // Intentamos insertar el mensaje en la base de datos de Supabase
  try {
    const { data, error } = await supabase
      .from('conversations')  // Inserta en la tabla 'conversations' de Supabase
      .insert([
        {
          user_id: userUuid,  // Ahora insertamos el UUID generado
          message: message,  // Insertamos el texto del mensaje
          last_message_time: new Date().toISOString(),  // Fecha y hora del mensaje
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

