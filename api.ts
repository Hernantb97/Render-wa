import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Tipos
export interface Message {
  id: string
  user_id: string
  message: string
  message_type: string
  status: 'sent' | 'received'
  last_message_time: string
  business_id: string | null
  is_bot_active: boolean
}

export interface Business {
  id: string
  name: string
  whatsapp_number: string
  plan_type: 'basic' | 'premium' | 'enterprise'
  max_concurrent_chats: number | null
  created_at: string
  updated_at: string
}

// API principal
export const api = {
  // Autenticación
  auth: {
    login: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return data
    },

    logout: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },

    getSession: async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    }
  },

  // Mensajes y Conversaciones
  messages: {
    getConversations: async () => {
      // Primero obtenemos el negocio
      const business = await api.businesses.getByPhoneNumber('+15557033313');
      
      if (!business) {
        throw new Error('No se encontró el negocio');
      }

      // Luego obtenemos todas las conversaciones de ese negocio
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          businesses (
            name,
            whatsapp_number
          )
        `)
        .eq('business_id', business.id)
        .order('last_message_time', { ascending: false });

      if (error) throw error;
      return data;
    },

    // Nueva función para obtener los mensajes de una conversación
    getConversationMessages: async (conversationId: string) => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const response = await fetch(`${API_URL}/conversation-messages/${conversationId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener mensajes');
      }
      
      const data = await response.json();
      return data.messages;
    },

    sendMessage: async (phoneNumber: string, message: string, conversationId: string) => {
      // Implementar la lógica para enviar mensajes a través del backend
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const response = await fetch(`${API_URL}/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber,
          message,
          conversationId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar mensaje');
      }
      
      return await response.json();
    },

    toggleBot: async (conversationId: string, isActive: boolean) => {
      // Implementar la lógica para activar/desactivar el bot
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const response = await fetch(`${API_URL}/toggle-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          isActive
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar estado del bot');
      }
      
      const data = await response.json();
      return { id: conversationId, is_bot_active: isActive };
    }
  },

  // Negocios
  businesses: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('name')

      if (error) throw error
      return data
    },

    getByPhoneNumber: async (phoneNumber: string) => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single()

      if (error) throw error
      return data
    }
  }
} 