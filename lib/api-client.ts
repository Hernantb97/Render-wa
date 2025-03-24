import { getConversation } from './database';
import { Message } from '../models/message';

// Cliente API para interactuar con el servidor

// URL base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

/**
 * Función para obtener todas las conversaciones
 * @param businessId ID opcional del negocio para filtrar las conversaciones
 */
export async function fetchConversations(businessId?: string) {
  let retries = 3;
  while (retries > 0) {
    try {
      // Construimos la URL según si hay businessId o no
      let url = `${API_BASE_URL}/api/conversations`;
      
      // Si se proporciona un businessId, usamos el nuevo endpoint específico
      if (businessId) {
        url = `${API_BASE_URL}/api/conversations/business/${businessId}`;
      }
      
      console.log("Fetching conversations from:", url);
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Importante para errores de CORS
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        console.log(`Error ${response.status}: ${response.statusText}`);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // El formato de respuesta es diferente entre los endpoints
      if (businessId) {
        // El nuevo endpoint devuelve directamente el array de conversaciones
        const conversations = await response.json();
        return conversations || [];
      } else {
        // El endpoint original devuelve { success: true, conversations: [...] }
        const data = await response.json();
        if (!data.success) {
          console.error('Error en respuesta del servidor:', data.error);
          throw new Error(data.error || 'Error desconocido del servidor');
        }
        return data.conversations || [];
      }
      
    } catch (error) {
      console.error('Error fetching conversations (intento ' + (4 - retries) + '/3):', error);
      retries--;
      
      if (retries === 0) {
        console.error('Se agotaron los reintentos para obtener conversaciones');
        return []; // Devolver un array vacío en caso de error
      }
      
      // Esperar un poco antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return []; // Por seguridad, nunca deberíamos llegar aquí
}

/**
 * Función para obtener los mensajes de una conversación
 * @param conversationId ID de la conversación
 */
export async function fetchMessages(conversationId: string) {
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`Fetching messages for conversation ${conversationId} from ${API_BASE_URL}/api/messages/${conversationId}`);
      const response = await fetch(`${API_BASE_URL}/api/messages/${conversationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        console.log(`Error ${response.status}: ${response.statusText}`);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        console.error('Error en respuesta del servidor:', data.error);
        throw new Error(data.error || 'Error desconocido del servidor');
      }
      
      return data.messages || [];
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId} (intento ${4 - retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        console.error('Se agotaron los reintentos para obtener mensajes');
        return []; // Devolver un array vacío en caso de error
      }
      
      // Esperar un poco antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return []; // Por seguridad, nunca deberíamos llegar aquí
}

/**
 * Función para enviar un mensaje
 * @param conversationId ID de la conversación
 * @param content Contenido del mensaje
 * @param type Tipo de mensaje (texto, imagen, etc.)
 * @param metadata Metadatos adicionales del mensaje
 */
export async function sendMessage(conversationId: string, content: string, type = 'text', metadata = {}) {
    try {
        // Obtener el número de teléfono del usuario de la conversación
        const conversation = await getConversation(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        // Enviar mensaje directamente a GupShup
        const response = await fetch('/api/send-whatsapp-message-direct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: conversation.user_id,
                message: content
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const result = await response.json();
        
        // Crear el mensaje en la base de datos local
        const newMessage = await Message.create({
            conversationId,
            content,
            type,
            metadata,
            status: 'sent',
            sentAt: new Date(),
            source: 'dashboard'
        });

        return newMessage;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

/**
 * Función para activar o desactivar el bot para una conversación
 * @param conversationId ID de la conversación
 * @param isActive Indica si el bot debe estar activo (true) o inactivo (false)
 * @returns 
 */
export async function toggleBot(conversationId: string, isActive: boolean) {
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`Configuring bot status to ${isActive ? 'active' : 'inactive'} for conversation ${conversationId}`);
      const response = await fetch(`${API_BASE_URL}/toggle-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify({
          conversationId,
          isActive
        }),
      });
      
      if (!response.ok) {
        console.log(`Error ${response.status}: ${response.statusText}`);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        console.error('Error en respuesta del servidor:', data.error || data.message);
        throw new Error(data.error || data.message || 'Error desconocido del servidor');
      }
      
      console.log(`Bot successfully ${isActive ? 'activated' : 'deactivated'} for conversation ${conversationId}`);
      return data;
    } catch (error) {
      console.error(`Error toggling bot (intento ${4 - retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        console.error('Se agotaron los reintentos para cambiar estado del bot');
        throw error;
      }
      
      // Esperar un poco antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Error inesperado al cambiar estado del bot');
}

/**
 * Función para obtener el estado actual del bot para una conversación
 * @param conversationId ID de la conversación
 * @returns Objeto con el estado del bot
 */
export async function getBotStatus(conversationId: string) {
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`Fetching bot status for conversation ${conversationId}`);
      const response = await fetch(`${API_BASE_URL}/bot-status/${conversationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        console.log(`Error ${response.status}: ${response.statusText}`);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        console.error('Error en respuesta del servidor:', data.error || data.message);
        throw new Error(data.error || data.message || 'Error desconocido del servidor');
      }
      
      return { isActive: data.isActive };
    } catch (error) {
      console.error(`Error fetching bot status (intento ${4 - retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        console.error('Se agotaron los reintentos para obtener estado del bot');
        return { isActive: true }; // Estado por defecto si no podemos obtenerlo
      }
      
      // Esperar un poco antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return { isActive: true }; // Por seguridad, nunca deberíamos llegar aquí
}

/**
 * Función para obtener los datos de un negocio por su ID
 * @param businessId ID del negocio
 */
export async function fetchBusinessData(businessId: string) {
  let retries = 3;
  while (retries > 0) {
    try {
      const url = `${API_BASE_URL}/api/business/${businessId}`;
      console.log("Fetching business data from:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        console.log(`Error ${response.status}: ${response.statusText}`);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const businessData = await response.json();
      return businessData;
    } catch (error) {
      console.error(`Error fetching business data (intento ${4 - retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        console.error('Se agotaron los reintentos para obtener datos del negocio');
        return null; // Devolver null en caso de error
      }
      
      // Esperar un poco antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null; // Por seguridad, nunca deberíamos llegar aquí
} 