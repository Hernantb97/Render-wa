app.post('/webhook', async (req, res) => {
  const messageData = req.body;
  console.log('Mensaje recibido:', messageData);  // Para depurar y ver la estructura

  // Asegurémonos de que estamos extrayendo el mensaje y teléfono correctamente
  const message = messageData?.sender?.payload?.text;  // Asegúrate de que el mensaje esté aquí
  const phoneNumber = messageData?.destination;

  if (!message || !phoneNumber) {
    console.log('No se recibió un mensaje válido');
    return res.status(400).send('Mensaje no válido');
  }

  // Insertar en Supabase
  try {
    const { data, error } = await supabase
      .from('conversations')  // Tabla 'conversations' en Supabase
      .insert([
        {
          user_id: phoneNumber,  // El número de teléfono del usuario
          message: message,  // El texto del mensaje
          last_message_time: new Date().toISOString(),  // Fecha y hora actual
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

