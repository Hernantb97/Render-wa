require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { supabase } = require('./lib/supabase');
const multer = require('multer');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

// Configurar bucket de Supabase Storage
const BUCKET_NAME = 'chat-attachments';

// Mapa de números de WhatsApp a IDs de negocio
const BUSINESS_NUMBERS = {
  '+15557033313': null  // Se llenará dinámicamente
};

// Función para obtener el ID del negocio por número de WhatsApp
async function getBusinessIdByNumber(whatsappNumber) {
  // Si ya tenemos el ID en caché, lo devolvemos
  if (BUSINESS_NUMBERS[whatsappNumber]) {
    return BUSINESS_NUMBERS[whatsappNumber];
  }

  // Si no, lo buscamos en la base de datos
  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('whatsapp_number', whatsappNumber)
    .single();

  if (error) {
    console.error('Error buscando negocio:', error);
    return null;
  }

  if (data) {
    // Guardamos en caché para futuras consultas
    BUSINESS_NUMBERS[whatsappNumber] = data.id;
    return data.id;
  }

  return null;
}

// Función para extraer el número de teléfono de diferentes estructuras de mensaje
const extractPhoneNumber = (messageData) => {
  // Para mensajes entrantes
  if (messageData?.payload?.source) return messageData.payload.source;
  if (messageData?.payload?.sender?.phone) return messageData.payload.sender.phone;
  // Para eventos de estado
  if (messageData?.payload?.destination) return messageData.payload.destination;
  return null;
};

// Función para extraer el texto del mensaje de diferentes estructuras
const extractMessageText = (messageData) => {
  // Estructura normal
  if (messageData?.payload?.text) return messageData.payload.text;
  // Estructura anidada
  if (messageData?.payload?.payload?.text) return messageData.payload.payload.text;
  return null;
};

// Función para determinar el tipo de evento
const getEventType = (messageData) => {
  // Primero intentamos obtener el tipo del payload
  const payloadType = messageData?.payload?.type;
  // Si no existe, intentamos obtener el tipo principal
  const mainType = messageData?.type;
  
  // Combinamos ambos para tener el tipo real
  const actualType = payloadType || mainType;
  
  if (actualType === 'message' || actualType === 'text') {
    return 'message';
  } else if (['delivered', 'sent', 'enqueued'].includes(actualType)) {
    return 'status';
  } else if (actualType === 'message-event') {
    // Para message-event, intentamos obtener el tipo específico
    const specificType = messageData?.payload?.type;
    return specificType || 'status';
  }
  return 'unknown';
};

// Función para guardar el mensaje en Supabase
const saveMessageToSupabase = async (data) => {
  try {
    console.log('Guardando en Supabase:', data);
    
    // Obtener el ID del negocio basado en el número de WhatsApp del mensaje
    const businessId = await getBusinessIdByNumber(data.phoneNumber);
    
    if (!businessId) {
      console.error('No se encontró el negocio para el número:', data.phoneNumber);
      return null;
    }

    // Primero, buscar o crear la conversación
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', data.phoneNumber)
      .eq('business_id', businessId)
      .single();

    let conversationId;
    
    if (convError && convError.code === 'PGRST116') {
      // La conversación no existe, la creamos
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([{
          user_id: data.phoneNumber,
          business_id: businessId,
          last_message: data.message,
          message_type: data.eventType || 'message',
          status: data.status || 'received',
          last_message_time: new Date().toISOString(),
          is_bot_active: true
        }])
        .select('id')
        .single();

      if (createError) {
        console.error('Error creando conversación:', createError);
        throw createError;
      }
      conversationId = newConv.id;
    } else if (convError) {
      console.error('Error buscando conversación:', convError);
      throw convError;
    } else {
      conversationId = conversation.id;
      
      // Actualizar la conversación existente
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          last_message: data.message,
          message_type: data.eventType || 'message',
          status: data.status || 'received',
          last_message_time: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error actualizando conversación:', updateError);
        throw updateError;
      }
    }

    // Guardar el mensaje en la tabla messages
    const { data: messageResult, error: messageError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        content: data.message,
        event_type: data.eventType || 'message',
        status: data.status || 'received',
        business_id: businessId,
        phone_number: data.phoneNumber,
        created_at: new Date().toISOString()
      }]);

    if (messageError) {
      console.error('Error guardando mensaje:', messageError);
      throw messageError;
    }

    return messageResult;
  } catch (error) {
    console.error('Error guardando en Supabase:', error);
    throw error;
  }
};

// Función para subir archivo a Supabase Storage
async function uploadFileToStorage(file, businessId) {
    const timestamp = Date.now();
    const fileName = `${businessId}/${timestamp}-${file.originalname}`;
    
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600'
        });

    if (error) throw error;
    
    const { data: publicUrl } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

    return publicUrl.publicUrl;
}

// Endpoint para subir archivos
app.post('/upload', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
    try {
        const { businessId, conversationId } = req.body;
        const file = req.file;

        // Determinar el tipo de archivo
        let fileType;
        if (file.mimetype.startsWith('image/')) fileType = 'image';
        else if (file.mimetype.startsWith('video/')) fileType = 'video';
        else if (file.mimetype.startsWith('audio/')) fileType = 'audio';
        else fileType = 'document';

        // Subir archivo a Supabase Storage
        const fileUrl = await uploadFileToStorage(file, businessId);

        // Actualizar la conversación con la información del archivo
        const { data, error } = await supabase
            .from('conversations')
            .update({
                file_url: fileUrl,
                file_type: fileType,
                file_name: file.originalname,
                file_size: file.size
            })
            .eq('id', conversationId);

        if (error) throw error;

        res.json({
            success: true,
            fileUrl,
            fileType,
            fileName: file.originalname
        });

    } catch (error) {
        console.error('Error al subir archivo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar el archivo'
        });
    }
});

// Webhook for receiving WhatsApp messages
app.post('/webhook', async (req, res) => {
  try {
    const messageData = req.body;
    console.log('Webhook - Mensaje recibido:', JSON.stringify(messageData, null, 2));
    
    // Variables para almacenar información extraída
    let userPhoneNumber = null;
    let businessPhoneNumber = null;
    let message = null;
    let phoneNumber = null;
    
    // Estrategia 1: Formato oficial de WhatsApp API 
    if (messageData.messaging_product === 'whatsapp' && messageData.entry && messageData.entry.length > 0) {
      console.log('Detectado formato de la WhatsApp API');
      
      for (const entry of messageData.entry) {
        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            if (change.value) {
              // Obtenemos el número de teléfono del negocio
              if (change.value.metadata && change.value.metadata.display_phone_number) {
                businessPhoneNumber = change.value.metadata.display_phone_number;
                console.log('Número de teléfono del negocio detectado:', businessPhoneNumber);
              }
              
              // Obtenemos la información de contacto (número del usuario)
              if (change.value.contacts && change.value.contacts.length > 0) {
                userPhoneNumber = change.value.contacts[0].wa_id;
                console.log('Número de teléfono del usuario detectado:', userPhoneNumber);
              }
              
              // Obtenemos el mensaje
              if (change.value.messages && change.value.messages.length > 0) {
                const msgObj = change.value.messages[0];
                
                // Verificamos diferentes tipos de mensaje
                if (msgObj.text && msgObj.text.body) {
                  message = msgObj.text.body;
                  console.log('Mensaje de texto detectado:', message);
                } else if (msgObj.image) {
                  message = "[IMAGEN]";
                  console.log('Mensaje de imagen detectado');
                } else if (msgObj.audio) {
                  message = "[AUDIO]";
                  console.log('Mensaje de audio detectado');
                } else if (msgObj.video) {
                  message = "[VIDEO]";
                  console.log('Mensaje de video detectado');
                } else if (msgObj.document) {
                  message = "[DOCUMENTO]";
                  console.log('Documento detectado');
                } else {
                  message = "[MENSAJE DESCONOCIDO]";
                  console.log('Tipo de mensaje desconocido:', msgObj);
                }
              }
            }
          }
        }
      }
    } 
    // Estrategia 2: Formato simplificado
    else if (messageData.phoneNumber || messageData.phone_number || messageData.phone) {
      console.log('Detectado formato simplificado del webhook');
      phoneNumber = messageData.phoneNumber || messageData.phone_number || messageData.phone;
      message = messageData.message || messageData.body || messageData.text || messageData.content;
      
      console.log('Número de teléfono detectado:', phoneNumber);
      console.log('Mensaje detectado:', message);
      
      // Si no podemos determinar si es usuario o negocio, asumimos que es usuario
      userPhoneNumber = phoneNumber;
    }
    // Estrategia 3: Buscar en cualquier parte del objeto
    else {
      console.log('Formato no reconocido, buscando en todo el objeto...');
      
      // Función recursiva para buscar campos específicos en cualquier nivel del objeto
      function findInObject(obj, keys) {
        if (!obj || typeof obj !== 'object') return null;
        
        // Primero verificamos el nivel actual
        for (const key of keys) {
          if (obj[key] !== undefined) return obj[key];
        }
        
        // Luego buscamos en niveles más profundos
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            const found = findInObject(obj[key], keys);
            if (found) return found;
          }
        }
        
        return null;
      }
      
      // Buscar número de teléfono
      phoneNumber = findInObject(messageData, ['phoneNumber', 'phone_number', 'phone', 'wa_id', 'from']);
      // Buscar mensaje
      message = findInObject(messageData, ['message', 'body', 'text', 'content', 'msg']);
      
      if (phoneNumber) console.log('Número encontrado en objeto:', phoneNumber);
      if (message) console.log('Mensaje encontrado en objeto:', message);
      
      // Asumimos que es un número de usuario si no podemos determinarlo
      userPhoneNumber = phoneNumber;
    }
    
    // Verificaciones finales
    if (!message) {
      console.log('No se pudo extraer el mensaje, tratando de convertir todo el objeto a texto');
      message = JSON.stringify(messageData);
      if (message.length > 255) {
        message = message.substring(0, 252) + '...';
      }
    }
    
    if (!userPhoneNumber && !businessPhoneNumber && !phoneNumber) {
      console.error('No se pudo determinar ningún número de teléfono');
      return res.status(200).send('No phone number found, but acknowledging receipt');
    }
    
    // Determinar el businessId para este mensaje
    console.log('Buscando business_id para el número:', businessPhoneNumber || phoneNumber);
    
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('whatsapp_number', businessPhoneNumber || '+15557033313')
      .maybeSingle();
    
    let businessId = business?.id;
    
    if (businessError || !businessId) {
      console.log('No se encontró business por número, buscando todos los business');
      // Si no encontramos un business específico, obtenemos el primero disponible
      const { data: allBusinesses, error: allBError } = await supabase
        .from('businesses')
        .select('id')
        .limit(1);
      
      if (!allBError && allBusinesses && allBusinesses.length > 0) {
        businessId = allBusinesses[0].id;
        console.log('Usando primer business disponible:', businessId);
      }
    } else {
      console.log('Business encontrado:', businessId);
    }
    
    // Determinamos el número de usuario y de negocio para la conversación
    const actualUserPhone = userPhoneNumber || phoneNumber;
    const actualBusinessPhone = businessPhoneNumber || '+15557033313';
    
    console.log('Datos finales para procesar:');
    console.log('- Usuario:', actualUserPhone);
    console.log('- Negocio:', actualBusinessPhone);
    console.log('- Business ID:', businessId);
    console.log('- Mensaje:', message);
    
    // Estrategias para buscar una conversación existente
    const searchStrategies = [
      // 1. Por user_id y business_id
      {
        field: 'user_id',
        value: actualUserPhone,
        extraCondition: {
          field: 'business_id',
          value: businessId
        }
      },
      
      // 2. Por user_id solamente (si es un número de usuario)
      {
        field: 'user_id',
        value: actualUserPhone
      }
    ];
    
    let conversation = null;
    
    // Ejecutar cada estrategia de búsqueda
    for (const strategy of searchStrategies) {
      if (strategy.extraCondition) {
        console.log(`Buscando conversación donde ${strategy.field}=${strategy.value} y ${strategy.extraCondition.field}=${strategy.extraCondition.value}`);
        
        const { data: foundConv, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq(strategy.field, strategy.value)
          .eq(strategy.extraCondition.field, strategy.extraCondition.value)
          .order('last_message_time', { ascending: false })
          .maybeSingle();
        
        if (!convError && foundConv) {
          conversation = foundConv;
          console.log(`Conversación encontrada con estrategia combinada: ${conversation.id}`);
          break;
        }
      } else {
        console.log(`Buscando conversación donde ${strategy.field}=${strategy.value}`);
        
        const { data: foundConv, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq(strategy.field, strategy.value)
          .order('last_message_time', { ascending: false })
          .maybeSingle();
        
        if (!convError && foundConv) {
          conversation = foundConv;
          console.log(`Conversación encontrada con estrategia simple: ${conversation.id}`);
          break;
        }
      }
    }
    
    let conversationId;
    
    if (conversation) {
      conversationId = conversation.id;
      
      // Actualizar la conversación existente
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          last_message: message,
          last_message_time: new Date().toISOString(),
          business_id: businessId // Asegurarnos que esté asociada al business_id
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error actualizando conversación:', updateError);
      } else {
        console.log(`Conversación ${conversationId} actualizada correctamente`);
      }
    } else {
      // Crear nueva conversación
      console.log('Creando nueva conversación...');
      
      const newConversation = {
        user_id: actualUserPhone,
        business_id: businessId,
        last_message: message,
        last_message_time: new Date().toISOString(),
        is_bot_active: true,
        sender_name: actualUserPhone
      };
      
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([newConversation])
        .select('id')
        .single();

      if (createError) {
        console.error('Error creando conversación:', createError);
        return res.status(200).send('Error creating conversation, but acknowledging receipt');
      }
      
      conversationId = newConv.id;
      console.log(`Nueva conversación creada con ID: ${conversationId}`);
    }

    // Guardar el mensaje
    console.log(`Guardando mensaje en conversación ${conversationId}...`);
    
    const { data: messageResult, error: messageError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        content: message,
        sender_type: 'user',
        created_at: new Date().toISOString(),
        read: false
      }]);

    if (messageError) {
      console.error('Error guardando mensaje:', messageError);
      return res.status(200).send('Error saving message, but acknowledging receipt');
    }

    console.log('Mensaje guardado exitosamente');
    return res.status(200).send('Message received and saved');
  } catch (error) {
    console.error('Error en webhook:', error);
    // Siempre respondemos con 200 para que WhatsApp no reintente
    return res.status(200).send('Error processing message, but acknowledging receipt');
  }
});

// Endpoint para actualizar el color de un chat
app.post('/update-chat-color', async (req, res) => {
    try {
        const { conversationId, color } = req.body;

        // Validar formato de color (hex)
        if (!color.match(/^#[0-9A-Fa-f]{6}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de color inválido'
            });
        }

        const { data, error } = await supabase
            .from('conversations')
            .update({ chat_color: color })
            .eq('id', conversationId);

        if (error) throw error;

        res.json({
            success: true,
            color
        });

    } catch (error) {
        console.error('Error al actualizar color:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el color'
        });
    }
});

// Endpoint para controlar el bot por conversación
app.post('/toggle-bot', async (req, res) => {
    try {
        const { conversationId, isActive } = req.body;

        const { data, error } = await supabase
            .from('conversations')
            .update({ is_bot_active: isActive })
            .eq('id', conversationId)
            .select('user_id, is_bot_active');

        if (error) throw error;

        console.log(`Bot ${isActive ? 'activado' : 'desactivado'} para la conversación ${conversationId}`);

        res.json({
            success: true,
            conversationId,
            isActive,
            phoneNumber: data[0]?.user_id
        });

    } catch (error) {
        console.error('Error al cambiar estado del bot:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cambiar el estado del bot'
        });
    }
});

// Endpoint de prueba para obtener mensajes
app.get('/test-messages', async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('conversations')
      .select(`
        *,
        businesses (
          name,
          whatsapp_number
        )
      `)
      .order('last_message_time', { ascending: false });

    if (error) {
      console.error('Error obteniendo mensajes:', error);
      return res.status(500).json({
        status: 'error',
        error: error.message
      });
    }

    console.log('Mensajes encontrados:', messages);
    
    return res.json({
      status: 'success',
      messages
    });

  } catch (error) {
    console.error('Error en endpoint de prueba:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.json({
    status: 'success',
    message: 'Dashboard API endpoint',
    serverTime: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WhatsApp API server is running'
  });
});

// Endpoint específico para Gupshup
app.post('/gupshup-webhook', async (req, res) => {
  try {
    const messageData = req.body;
    
    // Guardar una copia del payload completo para debugging
    console.log('=== GUPSHUP WEBHOOK RECIBIDO ===');
    console.log('Payload completo:', JSON.stringify(messageData, null, 2));
    
    // Variables para almacenar información extraída
    let userPhoneNumber = null;
    let businessPhoneNumber = null;
    let message = null;
    
    // Formato específico de Gupshup
    if (messageData.type === 'message' && messageData.payload) {
      console.log('Detectado formato de Gupshup');
      
      // Extraer números de teléfono
      if (messageData.payload.source) {
        userPhoneNumber = messageData.payload.source;
        console.log('Número de usuario:', userPhoneNumber);
      }
      
      if (messageData.payload.destination) {
        businessPhoneNumber = messageData.payload.destination;
        console.log('Número de negocio:', businessPhoneNumber);
      }
      
      // Extraer mensaje
      if (messageData.payload.payload && messageData.payload.payload.text) {
        message = messageData.payload.payload.text;
        console.log('Mensaje:', message);
      } else if (messageData.payload.text) {
        message = messageData.payload.text;
        console.log('Mensaje alternativo:', message);
      }
    }
    
    // Si no se pudieron extraer los datos, intentar con formato genérico
    if (!userPhoneNumber && messageData.sender?.phone) {
      userPhoneNumber = messageData.sender.phone;
      console.log('Número de usuario alternativo:', userPhoneNumber);
    }
    
    if (!message && messageData.text) {
      message = messageData.text;
      console.log('Mensaje alternativo 2:', message);
    }
    
    // Verificar que tenemos lo mínimo para procesar
    if (!message) {
      console.error('No se pudo extraer el mensaje del payload de Gupshup');
      return res.status(200).send('No message found, but acknowledging receipt');
    }
    
    if (!userPhoneNumber && !businessPhoneNumber) {
      console.error('No se pudo extraer ningún número de teléfono del payload de Gupshup');
      return res.status(200).send('No phone number found, but acknowledging receipt');
    }
    
    // Reenviar al webhook general usando el formato esperado
    const processedData = {
      phoneNumber: userPhoneNumber,
      destination: businessPhoneNumber || '+15557033313', // Número de negocio por defecto
      message: message,
      type: 'message',
      source: userPhoneNumber,
      gupshup_original: true
    };
    
    console.log('Reenviando al webhook principal:', JSON.stringify(processedData, null, 2));
    
    // Reenviar al webhook principal
    const response = await fetch('http://localhost:4000/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(processedData)
    });
    
    if (!response.ok) {
      throw new Error(`Error al reenviar al webhook: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log('Respuesta del webhook principal:', responseText);
    
    return res.status(200).send('Gupshup message processed and forwarded');
    
  } catch (error) {
    console.error('Error en Gupshup webhook:', error);
    return res.status(200).send('Error processing Gupshup message, but acknowledging receipt');
  }
});

// Endpoint para verificar manualmente si un número está en Supabase
app.get('/check-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    console.log(`Verificando número: ${phone}`);
    
    // Buscar conversaciones para este número
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', phone)
      .order('last_message_time', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Buscar negocios con este número
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('whatsapp_number', phone);
    
    if (bizError) {
      throw bizError;
    }
    
    return res.json({
      status: 'success',
      phone,
      conversations: conversations || [],
      businesses: businesses || []
    });
    
  } catch (error) {
    console.error('Error verificando número:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 4000;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ El puerto ${PORT} está en uso. Intentando con otro puerto...`);
    server.close();
    // Try next port
    app.listen(PORT + 1, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT + 1}`);
    });
  } else {
    console.error('Error al iniciar el servidor:', err);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado.');
    process.exit(0);
  });
});
