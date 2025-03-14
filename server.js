app.post('/webhook', async (req, res) => {
  const messageData = req.body;  // Datos del mensaje recibidos
  console.log('Mensaje recibido:', JSON.stringify(messageData, null, 2)); // Imprimir el mensaje completo para depuración

  // Asegurarnos de que el mensaje y el número de teléfono están presentes
  const message = messageData?.sender?.payload?.text;  // Extrae el texto
  const phoneNumber = messageData?.destination;  // Extrae el número de teléfono

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  try {
    // Insertar mensaje en la base de datos de Supabase
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
});

