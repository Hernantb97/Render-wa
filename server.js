const express = require('express');  // Asegúrate de que Express esté importado
const bodyParser = require('body-parser');  // Asegúrate de que bodyParser esté importado
const { createClient } = require('@supabase/supabase-js');  // Importa Supabase para la conexión

const app = express();
app.use(bodyParser.json());  // Middleware para analizar los datos JSON

// Inicializa Supabase con la URL y la API key correctas
const supabase = createClient('https://your-supabase-url.supabase.co', 'your-supabase-key');

// Endpoint de Webhook
app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Datos recibidos del webhook
  console.log('Mensaje recibido:', messageData);  // Para depuración y asegurarnos de que los datos se reciben bien

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

