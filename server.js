require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { supabase } = require('./lib/supabase');
const multer = require('multer');
const fetch = require('node-fetch');
const { generateAIResponse, shouldAIRespond } = require('./lib/ai-service');

const app = express();

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // En producción, reemplaza * con tu dominio específico
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Manejar solicitudes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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

// Función para manejar eventos de tipo message-event (status updates)
const handleMessageEvent = async (messageData) => {
  try {
    // Extraer el tipo específico del evento (delivered, sent, enqueued)
    const eventType = messageData?.payload?.type || 'unknown';
    console.log(`Procesando evento de tipo: ${eventType}`);
    
    // Extraer el número de destino (para identificar la conversación)
    const destination = messageData?.payload?.destination;
    if (!destination) {
      console.log('No se pudo identificar el número de destino');
      return false;
    }
    
    // Extraer el ID del mensaje
    const messageId = messageData?.payload?.id || messageData?.payload?.gsId;
    if (!messageId) {
      console.log('No se pudo identificar el ID del mensaje');
      return false;
    }
    
    console.log(`Actualizando estado para mensaje dirigido a ${destination} con ID ${messageId} a estado ${eventType}`);
    
    // No creamos un nuevo mensaje, solo actualizamos el estado
    // Este código puede ser ampliado para buscar y actualizar mensajes específicos
    // pero por ahora solo registramos que recibimos la actualización
    
    return true;
  } catch (error) {
    console.error('Error procesando evento de mensaje:', error);
    return false;
  }
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
    
    // Verificar si es un evento de tipo message-event (actualización de estado)
    if (messageData.type === 'message-event') {
      console.log('Detectado evento de actualización de estado (message-event)');
      const handled = await handleMessageEvent(messageData);
      
      if (handled) {
        return res.status(200).send('Status update processed successfully');
      } else {
        // Continuamos con el proceso normal aunque no hayamos manejado el evento específicamente
        console.log('No se pudo manejar específicamente el evento de estado, continuando con proceso general');
      }
    }
    
    // Variables para almacenar información extraída
    let userPhoneNumber = null;
    let businessPhoneNumber = null;
    let message = null;
    let phoneNumber = null;
    let eventType = getEventType(messageData);
    
    // Para eventos de estado, intentamos extraer la información relevante
    if (eventType === 'status' && messageData.payload) {
      console.log('Procesando evento de estado:', eventType);
      phoneNumber = messageData.payload.destination;
      message = `[Estado del mensaje: ${messageData.payload.type || 'actualizado'}]`;
      
      // Para estos eventos, no creamos mensajes nuevos, solo enviamos una respuesta OK
      return res.status(200).send('Status update acknowledged');
    }
    
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
    
    // Comprobar si el bot está activo para esta conversación y debería responder
    try {
      // Obtener información de la conversación
      const { data: conversationData, error: convDataError } = await supabase
        .from('conversations')
        .select('is_bot_active, business_id')
        .eq('id', conversationId)
        .single();
        
      if (convDataError) throw convDataError;
      
      // Comprobar si el bot debería responder
      if (await shouldAIRespond(conversationId, conversationData.is_bot_active)) {
        console.log(`El bot está activo para la conversación ${conversationId}, generando respuesta...`);
        
        // Obtener datos del negocio
        const { data: businessData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', conversationData.business_id)
          .single();
          
        if (bizError) throw bizError;
        
        // Obtener los últimos mensajes para contexto
        const { data: messageHistory, error: historyError } = await supabase
          .from('messages')
          .select('content, sender_type, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (historyError) throw historyError;
        
        // Invertir para orden cronológico
        const orderedHistory = [...messageHistory].reverse();
        
        // Generar respuesta AI
        const aiResponse = await generateAIResponse(orderedHistory, businessData);
        
        console.log(`Respuesta AI generada: ${aiResponse}`);
        
        // Guardar respuesta del bot
        const { data: botMessageResult, error: botMessageError } = await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            content: aiResponse,
            sender_type: 'business',
            created_at: new Date().toISOString(),
            read: true
          }]);
          
        if (botMessageError) throw botMessageError;
        
        // Actualizar último mensaje en la conversación
        const { error: updateConvError } = await supabase
          .from('conversations')
          .update({
            last_message: aiResponse,
            last_message_time: new Date().toISOString()
          })
          .eq('id', conversationId);
          
        if (updateConvError) throw updateConvError;
        
        // NUEVO: Enviar el mensaje del bot a través de WhatsApp utilizando Gupshup
        try {
          if (businessData.gupshup_api_key) {
            const gupshupPayload = {
              channel: "whatsapp",
              source: businessData.whatsapp_number,
              destination: actualUserPhone,
              message: {
                type: "text",
                text: aiResponse
              }
            };
            
            const gupshupResponse = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': businessData.gupshup_api_key
              },
              body: JSON.stringify(gupshupPayload)
            });
            
            if (!gupshupResponse.ok) {
              console.error(`Error enviando respuesta automática a través de Gupshup: ${gupshupResponse.status} ${gupshupResponse.statusText}`);
            } else {
              console.log('Respuesta del bot enviada exitosamente a través de Gupshup');
            }
          } else {
            console.log('No se encontró clave de API Gupshup para el negocio, no se pudo enviar la respuesta automática');
          }
        } catch (gupshupError) {
          console.error('Error enviando respuesta del bot a través de Gupshup:', gupshupError);
          // No interrumpimos el flujo principal, solo registramos el error
        }
        
        console.log('Respuesta del bot guardada exitosamente');
      } else {
        console.log(`El bot está desactivado para la conversación ${conversationId}, no se generará respuesta automática.`);
      }
    } catch (aiError) {
      console.error('Error al procesar respuesta del bot:', aiError);
      // No devolvemos error al cliente, simplemente registramos el problema
    }
    
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

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/ping', (req, res) => {
  console.log('🔔 Ping recibido');
  res.status(200).json({ 
    success: true, 
    message: 'Pong! El servidor está funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba para verificar register-bot-response
app.get('/test-register-bot-response', (req, res) => {
  console.log('🔔 Prueba de register-bot-response recibida');
  res.status(200).json({ 
    success: true, 
    message: 'La ruta está configurada correctamente. Usa POST para enviar datos reales.',
    timestamp: new Date().toISOString()
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

// Endpoint para enviar mensajes a través de WhatsApp
app.post('/send-whatsapp-message', async (req, res) => {
  try {
    const { phoneNumber, message, conversationId, businessId } = req.body;
    
    if (!phoneNumber || !message || !conversationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requieren phoneNumber, message y conversationId'
      });
    }
    
    console.log(`Intentando enviar mensaje a ${phoneNumber}: ${message}`);
    
    // Obtener el negocio
    let businessData;
    if (businessId) {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
        
      if (error) throw error;
      businessData = data;
    } else {
      // Obtener el business_id de la conversación
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('business_id')
        .eq('id', conversationId)
        .single();
        
      if (convError) throw convError;
      
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', convData.business_id)
        .single();
        
      if (bizError) throw bizError;
      businessData = bizData;
    }
    
    // Enviar el mensaje a través de WhatsApp (ejemplo utilizando Gupshup)
    if (businessData.gupshup_api_key) {
      // Si usamos Gupshup
      const gupshupPayload = {
        channel: "whatsapp",
        source: businessData.whatsapp_number,
        destination: phoneNumber,
        message: {
          type: "text",
          text: message
        }
      };
      
      // Implementar llamada a Gupshup
      // Esta es una implementación de ejemplo, deberás adaptarla según la API de Gupshup
      const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': businessData.gupshup_api_key
        },
        body: JSON.stringify(gupshupPayload)
      });
      
      if (!response.ok) {
        throw new Error(`Error enviando mensaje a través de Gupshup: ${response.status} ${response.statusText}`);
      }
    } else {
      // Implementación para API oficial de WhatsApp
      console.log('No se encontró clave de API Gupshup, no se pudo enviar el mensaje');
      // Aquí podrías implementar el envío a través de la API oficial de WhatsApp
    }
    
    // Guardar el mensaje como agente en la base de datos
    const { error: messageError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        content: message,
        sender_type: 'business', // Aseguramos que sea 'business', no 'agent'
        created_at: new Date().toISOString(),
        read: true
      }]);
      
    if (messageError) throw messageError;
    
    // Actualizar la conversación
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message: message,
        last_message_time: new Date().toISOString()
      })
      .eq('id', conversationId);
      
    if (updateError) throw updateError;
    
    res.json({
      status: 'success',
      message: 'Mensaje enviado correctamente'
    });
    
  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Endpoint para obtener mensajes de una conversación específica
app.get('/conversation-messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log(`Obteniendo mensajes para la conversación ${conversationId}`);
    
    // Primero obtenemos información de la conversación para saber si el bot está activo
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('is_bot_active')
      .eq('id', conversationId)
      .single();
      
    if (convError) throw convError;
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Añadir metadatos para identificar las respuestas automáticas
    const enhancedMessages = messages.map(msg => {
      // Mensajes del tipo 'bot' son automáticos por definición
      if (msg.sender_type === 'bot') {
        return { ...msg, is_auto_response: true };
      }
      
      // Mensajes de tipo 'business' podrían ser automáticos o no
      if (msg.sender_type === 'business' && conversation.is_bot_active) {
        // Señales de que puede ser una respuesta automática
        const botIndicators = [
          msg.content.includes('Respuesta automática:'),
          msg.content.includes('AI:'),
          msg.content.startsWith('✅ Bot activado'),
          msg.content.startsWith('❌ Bot desactivado')
        ];
        
        return { 
          ...msg, 
          is_auto_response: botIndicators.some(indicator => indicator)
        };
      }
      
      return { ...msg, is_auto_response: false };
    });
    
    console.log(`Se encontraron ${messages.length} mensajes para la conversación ${conversationId}`);
    
    return res.json({
      status: 'success',
      messages: enhancedMessages
    });
    
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Ruta para registrar respuestas del bot en Supabase (la misma implementación que está en app/api/register-bot-response/route.ts)
app.post('/register-bot-response', async (req, res) => {
  try {
    const body = req.body;
    let { conversationId, message, timestamp = new Date().toISOString() } = body;
    
    console.log('🤖 Registrando respuesta del bot para conversación', conversationId);
    
    if (!conversationId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requieren conversationId y message' 
      });
    }
    
    // Verificar si el conversationId es un número de teléfono
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(conversationId)) {
      console.log('El conversationId parece ser un número de teléfono, buscando conversación...');
      
      // Buscar la conversación por número de teléfono (user_id)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', conversationId)
        .order('last_message_time', { ascending: false })
        .maybeSingle();
        
      if (convError) {
        console.error('Error buscando conversación por número de teléfono:', convError);
        return res.status(500).json({ success: false, message: 'Error al buscar conversación', error: convError });
      }
      
      if (!conversation) {
        console.error(`No se encontró conversación para el número de teléfono ${conversationId}`);
        return res.status(404).json({ success: false, message: 'No se encontró conversación para este número' });
      }
      
      console.log(`Conversación encontrada con ID: ${conversation.id}`);
      conversationId = conversation.id;
    }

    // Insertar mensaje en Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          content: message,
          sender_type: 'bot',
          created_at: timestamp,
          read: true
        }
      ]);

    if (error) {
      console.error('Error al guardar respuesta del bot en Supabase:', error);
      return res.status(500).json({ success: false, message: 'Error al guardar en la base de datos', error });
    }

    // Actualizar la conversación con el último mensaje
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message: message,
        last_message_time: timestamp
      })
      .eq('id', conversationId);
      
    if (updateError) {
      console.error('Error al actualizar la conversación:', updateError);
      // No retornamos error para no afectar la respuesta principal
    }

    console.log(`✅ Respuesta del bot registrada correctamente`);
    return res.status(200).json({ success: true, message: 'Respuesta del bot registrada correctamente' });
  } catch (error) {
    console.error('Error en endpoint /register-bot-response:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
});

// Ruta de prueba para test-bot
app.post('/test-bot', (req, res) => {
  console.log('🧪 POST a /test-bot recibido', JSON.stringify(req.body, null, 2));
  res.status(200).json({
    success: true,
    message: 'Datos recibidos correctamente por el servidor Express',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Nueva ruta para pruebas de comunicación del bot
app.post('/test-bot-connection', (req, res) => {
  console.log('🔄 Prueba de conexión del bot recibida:', req.body);
  res.status(200).json({ 
    success: true, 
    message: 'Conexión con el servidor exitosa',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para obtener todas las conversaciones
app.get('/api/conversations', async (req, res) => {
  try {
    const { businessId } = req.query;
    
    console.log(`Obteniendo conversaciones${businessId ? ` para el negocio ${businessId}` : ''} desde Supabase`);
    
    // Construimos la consulta base
    let query = supabase
      .from('conversations')
      .select('*');
    
    // Filtramos por ID de negocio si se proporciona
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    
    // Ordenamos por fecha del último mensaje
    const { data: conversations, error } = await query.order('last_message_time', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo conversaciones:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    // Formatear las conversaciones para el cliente
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      name: conv.user_id || 'Usuario',  // Usar el número de teléfono o ID como nombre por defecto
      phone: conv.user_id,
      lastMessage: conv.last_message || '',
      timestamp: conv.last_message_time || conv.created_at,
      unread: conv.unread_count || 0,
      status: 'offline',
      isBusinessAccount: false,
      labels: [],
      colorLabel: '',
      botActive: conv.is_bot_active || true,
      tag: conv.tag || 'gray'
    }));
    
    console.log(`Se encontraron ${formattedConversations.length} conversaciones`);
    
    return res.json({
      success: true,
      conversations: formattedConversations
    });
    
  } catch (error) {
    console.error('Error en API de conversaciones:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para obtener mensajes de una conversación específica
app.get('/api/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log(`Obteniendo mensajes para la conversación ${conversationId} desde Supabase`);
    
    // Verificar si el ID parece ser un UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(conversationId)) {
      console.log(`El ID ${conversationId} no parece ser un UUID válido. Devolviendo lista vacía.`);
      return res.json({
        success: true,
        messages: []
      });
    }
    
    // Obtener todos los mensajes de la conversación
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error obteniendo mensajes:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    // Formatear los mensajes para el cliente
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      content: msg.content,
      timestamp: msg.created_at,
      status: 'delivered',
      sender: msg.sender_type === 'user' ? 'them' : 'me',
      type: msg.message_type || 'text'
    }));
    
    console.log(`Se encontraron ${formattedMessages.length} mensajes para la conversación ${conversationId}`);
    
    return res.json({
      success: true,
      messages: formattedMessages
    });
    
  } catch (error) {
    console.error('Error en API de mensajes:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

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
  console.error(`⚠️ Error al iniciar el servidor en puerto ${PORT}:`, err.message);
  process.exit(1);
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
