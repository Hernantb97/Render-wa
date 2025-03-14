app.post('/webhook', async (req, res) => {
  const messageData = req.body;
  console.log('Mensaje recibido:', messageData);  // Para depurar y ver la estructura

  // Extraer mensaje y número
  const message = messageData?.sender?.payload?.text;  // Asegúrate de que el mensaje se extrae correctamente
  const phoneNumber = messageData?.destination;

  if (message) {
    try {
      // Guardar mensaje en Supabase
      const { data, error } = await supabase
        .from('conversations')  // Tabla 'conversations' en Supabase
        .insert([
          {
            user_id: phoneNumber,  // Número de teléfono como ID de usuario
            message: message,  // El texto del mensaje
            last_message_time: new Date().toISOString(),  // Tiempo actual
          }
        ]);

      if (error) {
        console.error('Error guardando el mensaje en Supabase:', error);
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

