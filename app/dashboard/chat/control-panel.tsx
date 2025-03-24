'use client'

import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Send, 
  Paperclip, 
  MoreVertical, 
  Search, 
  Plus, 
  Bot, 
  BotOff,
  Trash2,
  Settings,
  Star,
  StarOff,
  Phone,
  Mail,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface ChatControlPanelProps {
  userId: string
  userEmail: string
}

// Interfaz para los mensajes
interface Message {
  id: string
  conversation_id: string
  content: string
  sender_type: 'user' | 'business' | 'bot'
  created_at: string
  read: boolean
  is_auto_response?: boolean  // Campo adicional que viene del servidor
}

// Interfaz para las conversaciones
interface Conversation {
  id: string
  user_id: string
  business_id: string
  last_message: string
  last_message_time: string
  is_bot_active: boolean
  sender_name?: string
  businesses?: {
    name: string
    whatsapp_number: string
  }
}

export default function ChatControlPanel({ userId, userEmail }: ChatControlPanelProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [botActive, setBotActive] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Temporizador para actualizar automáticamente los mensajes
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadConversations()
    
    // Limpieza al desmontar
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat)
      scrollToBottom()
      
      // Actualizar mensajes periódicamente (cada 3 segundos)
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }
      
      updateTimerRef.current = setInterval(() => {
        loadMessages(selectedChat)
      }, 3000)
    }
    
    // Obtener estado de activación del bot para la conversación seleccionada
    if (selectedChat) {
      const selectedConversation = conversations.find(conv => conv.id === selectedChat)
      if (selectedConversation) {
        setBotActive(selectedConversation.is_bot_active)
      }
    }
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const data = await api.messages.getConversations()
      setConversations(data)
      
      // Seleccionar automáticamente la primera conversación si no hay ninguna seleccionada
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(data[0].id)
        setBotActive(data[0].is_bot_active)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      // Usar la nueva función para obtener todos los mensajes
      const messages = await api.messages.getConversationMessages(conversationId)
      setMessages(messages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return

    try {
      const selectedConversation = conversations.find(conv => conv.id === selectedChat)
      if (!selectedConversation) return
      
      await api.messages.sendMessage(selectedConversation.user_id, newMessage, selectedChat)
      setNewMessage('')
      
      // Recargar mensajes después de enviar
      loadMessages(selectedChat)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const toggleBot = async () => {
    if (!selectedChat) return

    try {
      // Cambiar el estado de activación del bot
      await api.messages.toggleBot(selectedChat, !botActive)
      setBotActive(!botActive)
      
      // Mostrar un mensaje en la interfaz para indicar el cambio
      const statusMessage = !botActive 
        ? "✅ Bot activado. Las respuestas automáticas están habilitadas."
        : "❌ Bot desactivado. Solo se enviarán mensajes escritos manualmente.";
        
      setMessages(prev => [...prev, {
        id: `status-${Date.now()}`,
        conversation_id: selectedChat,
        content: statusMessage,
        sender_type: 'business',
        created_at: new Date().toISOString(),
        read: true
      }])
    } catch (error) {
      console.error('Error toggling bot:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es })
    } catch (error) {
      return 'Fecha desconocida'
    }
  }

  const filteredConversations = conversations.filter(conv => 
    conv.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.last_message && conv.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Función para determinar si un mensaje fue generado por el bot
  const isAutoMessage = (message: Message) => {
    // Para testing: forzar mostrar todos los mensajes de business como mensajes del bot
    if (message.sender_type === 'business') {
      return true;
    }
    
    // Si tenemos el campo is_auto_response del servidor, lo usamos directamente
    if (message.is_auto_response !== undefined) {
      return message.is_auto_response;
    }
    
    // Si no tenemos el campo, usamos la lógica de detección anterior
    if (message.sender_type === 'bot') return true;
    
    return false;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Conversaciones</h2>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
              <AlertCircle className="w-12 h-12 mb-2" />
              <p>No se encontraron conversaciones</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedChat === conv.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedChat(conv.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conv.sender_name || conv.user_id}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatDate(conv.last_message_time)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                <div className="flex items-center mt-1">
                  {conv.is_bot_active ? (
                    <Bot className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <BotOff className="w-3 h-3 text-gray-400 mr-1" />
                  )}
                  <span className="text-xs text-gray-500">
                    {conv.is_bot_active ? 'Bot activo' : 'Bot inactivo'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center">
                <div className="ml-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {conversations.find(c => c.id === selectedChat)?.sender_name || 
                     conversations.find(c => c.id === selectedChat)?.user_id || 'Chat'}
                  </h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="w-3 h-3 mr-1" />
                    <span>
                      {conversations.find(c => c.id === selectedChat)?.user_id || 'Sin número'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleBot}
                  className={`p-2 rounded-full ${
                    botActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  } hover:opacity-80`}
                  title={botActive ? 'Desactivar bot' : 'Activar bot'}
                >
                  {botActive ? <Bot className="w-5 h-5" /> : <BotOff className="w-5 h-5" />}
                </button>
                <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                  <Settings className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Mail className="w-12 h-12 mb-2" />
                  <p>No hay mensajes aún</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-4 max-w-[80%] ${
                      msg.sender_type === 'user'
                        ? 'ml-auto bg-blue-500 text-white rounded-tl-lg rounded-bl-lg rounded-tr-lg'
                        : isAutoMessage(msg)
                          ? 'mr-auto bg-green-50 text-gray-800 rounded-tr-lg rounded-br-lg rounded-tl-lg border border-green-200'
                          : 'mr-auto bg-white text-gray-800 rounded-tr-lg rounded-br-lg rounded-tl-lg border border-gray-200'
                    } p-3 shadow-sm`}
                  >
                    {isAutoMessage(msg) ? (
                      <div className="flex items-center mb-1 text-xs text-green-600">
                        <Bot className="w-3 h-3 mr-1" />
                        <span>Respuesta automática</span>
                      </div>
                    ) : null}
                    <p>{msg.content}</p>
                    <div
                      className={`flex items-center justify-end mt-1 text-xs ${
                        msg.sender_type === 'user' 
                          ? 'text-blue-100' 
                          : isAutoMessage(msg) 
                            ? 'text-green-600' 
                            : 'text-gray-500'
                      }`}
                    >
                      <span>{formatDate(msg.created_at)}</span>
                      {msg.sender_type !== 'user' && msg.read && (
                        <CheckCheck className="w-3 h-3 ml-1" />
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center">
                <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 mx-2">
                  <textarea
                    placeholder="Escribe un mensaje..."
                    className="w-full p-3 bg-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 rounded-full bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Mail className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-medium mb-2">Selecciona una conversación</h2>
            <p className="text-center max-w-md px-4">
              Elige una conversación de la lista para ver y responder mensajes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 