// Cliente API para interactuar con el servidor
import fetch from 'node-fetch';

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
      let url = `${API_BASE_URL}/conversations`;
      
      // Si se proporciona un businessId, usamos el nuevo endpoint específico
      if (businessId) {
        url = `${API_BASE_URL}/conversations/business/${businessId}`;
      }
      
      console.log("Fetching conversations from:", url);
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
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
      console.error('Error fetching conversations:', error);
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo antes de reintentar
    }
  }
  throw new Error('Failed to fetch conversations after retries');
}

/**
 * Función para obtener los mensajes de una conversación
 * @param conversationId ID de la conversación
 */
export async function fetchMessages(conversationId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${conversationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Función para enviar un mensaje
 * @param conversationId ID de la conversación
 * @param message Contenido del mensaje
 */
export async function sendMessage(conversationId: string, message: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/send-whatsapp-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        conversationId,
        message
      })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Función para activar/desactivar el bot en una conversación
 * @param conversationId ID de la conversación
 * @param isActive Estado del bot (true/false)
 */
export async function toggleBot(conversationId: string, isActive: boolean) {
  try {
    const response = await fetch(`${API_BASE_URL}/toggle-bot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        conversationId,
        isActive
      })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error toggling bot:', error);
    throw error;
  }
}

/**
 * Función para obtener el estado del bot en una conversación
 * @param conversationId ID de la conversación
 */
export async function getBotStatus(conversationId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/bot-status/${conversationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.isActive;
  } catch (error) {
    console.error('Error getting bot status:', error);
    throw error;
  }
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
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
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