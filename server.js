const express = require('express');  // Importa Express
const bodyParser = require('body-parser');  // Importa BodyParser
const { createClient } = require('@supabase/supabase-js');  // Para conectar con Supabase

const app = express();  // Inicializa Express
app.use(bodyParser.json());  // Usa BodyParser para manejar solicitudes JSON

const supabase = createClient('https://your-supabase-url.supabase.co', 'your-supabase-key');  // Conexión a Supabase

app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Obtiene los datos del mensaje

  console.log('Mensaje recibido:', messageData);  // Para depurar y verificar los datos

  const message = messageData?.sender?.payload?.text;  // Extrae el mensaje
  const phoneNumber = messageData?.destination;  // Extrae el número de teléfono

  if (message) {
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
        console.error('Error guardando el mensaje en Supabase:', error);
        return res.status(500).send('Error guardando el mensaje');
      }

      console.log('Mensaje guardado correctamente:', data);
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

