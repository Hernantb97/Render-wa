const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
app.use(bodyParser.json()); // Middleware para analizar los datos JSON

// Variables de entorno
const SUPABASE_URL = 'https://wscijkxwevgxbgwhbqtm.supabase.co'; // URL de tu Supabase
const SUPABASE_KEY = process.env.SUPABASE_KEY || 
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI'; 
// Clave de API de Supabase (debe estar en variables de entorno)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY); // Cliente Supabase

// Ruta raíz
app.get('/', (req, res) => {
  res.send('Bot de WhatsApp funcionando');
});

// Webhook para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    console.log('📩 Mensaje recibido en bruto:', JSON.stringify(req.body, null, 2));

    // Validación del mensaje entrante
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) {
      console.log('❌ No se encontró el mensaje.');
      return res.status(400).send('No se encontró el mensaje');
    }

    const sender = message.from; // Número del remitente
    const mensaje = message.text.body; // Texto del mensaje

    console.log(`👤 Mensaje recibido de ${sender}: ${mensaje}`);

    // Verificar si el usuario ya tiene un thread_id asignado (Si estamos utilizando OpenAI para el chat, por ejemplo)
    let threadId;
    // Si no tienes un manejo de threads, puedes omitir esta parte o crear un sistema simple de tracking

    // Insertar el mensaje en la base de datos Supabase
    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          user_id: sender, // Guardar el número de teléfono como ID del usuario
          message: mensaje, // Guardar el mensaje
          last_message_time: new Date().toISOString(), // Guardar la fecha y hora actual
        }
      ])
      .select();

    if (error) {
      console.error('Error insertando mensaje:', error);
      return res.status(500).send('Error al guardar mensaje en Supabase');
    }

    console.log('✅ Mensaje guardado correctamente:', data);

    // Responder a WhatsApp usando Gupshup (si es necesario)
    await axios.post('https://api.gupshup.io/sm/api/v1/msg', {
      recipient: sender,
      message: 'Mensaje recibido correctamente.'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GUPSHUP_API_KEY}`
      }
    });

    return res.status(200).send('Mensaje recibido y guardado correctamente');
  } catch (err) {
    console.error('Error procesando el webhook:', err);
    return res.status(500).send('Error al procesar el webhook');
  }
});

// Inicializa el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

