"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { MessageSquare, Search, Plus, LogOut } from "lucide-react"
import ConversationsList from "@/components/conversations-list"
import ChatView from "@/components/chat-view"
import { fetchUserConversations, fetchConversationMessages, createConversation } from "@/lib/database"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

interface ChatControlPanelProps {
  userId: string
  userEmail: string
}

export default function ChatControlPanel({ userId, userEmail }: ChatControlPanelProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [botActive, setBotActive] = useState(true)
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  // Cargar conversaciones
  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true)
      try {
        const userConversations = await fetchUserConversations(userId)

        // Formatear las conversaciones para la UI con manejo seguro de propiedades
        const formattedConversations = userConversations.map((conv) => ({
          id: conv.id,
          name: conv.title || `Conversación ${conv.id.substring(0, 4)}`,
          lastMessage: conv.last_message || "Nueva conversación",
          time: formatTimeAgo(conv.last_message_time || conv.created_at),
          unread: Boolean(conv.unread_count && conv.unread_count > 0),
          status: conv.status || "active",
        }))

        setConversations(formattedConversations)
      } catch (error) {
        console.error("Error loading conversations:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las conversaciones",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Función auxiliar para formatear fechas
    const formatTimeAgo = (dateString?: string) => {
      if (!dateString) return "Reciente"
      try {
        return formatDistanceToNow(new Date(dateString), {
          addSuffix: true,
          locale: es,
        })
      } catch (e) {
        return "Reciente"
      }
    }

    if (userId) {
      loadConversations()
    }
  }, [userId, toast])

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChat) return

      setIsLoadingMessages(true)
      try {
        const conversationMessages = await fetchConversationMessages(selectedChat, userId)

        // Formatear los mensajes para la UI
        const formattedMessages = conversationMessages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender_type,
          timestamp: formatMessageTime(msg.created_at),
        }))

        setMessages(formattedMessages)

        // Actualizar la lista de conversaciones para reflejar mensajes leídos
        setConversations((prev) => prev.map((conv) => (conv.id === selectedChat ? { ...conv, unread: false } : conv)))
      } catch (error) {
        console.error("Error loading messages:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los mensajes",
          variant: "destructive",
        })
      } finally {
        setIsLoadingMessages(false)
      }
    }

    // Función auxiliar para formatear la hora del mensaje
    const formatMessageTime = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })
      } catch (e) {
        return "Ahora"
      }
    }

    loadMessages()
  }, [selectedChat, userId, toast])

  // Filtrar conversaciones por búsqueda
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Crear nueva conversación
  const handleNewConversation = async () => {
    try {
      const title = `Conversación ${new Date().toLocaleDateString()}`
      const newConversation = await createConversation(title, userId)

      // Añadir la nueva conversación a la lista
      const formattedConv = {
        id: newConversation.id,
        name: newConversation.title || `Conversación ${newConversation.id.substring(0, 4)}`,
        lastMessage: "Nueva conversacion",
        time: "Ahora",
        unread: false,
        status: "active",
      }

      setConversations([formattedConv, ...conversations])
      setSelectedChat(newConversation.id)

      toast({
        title: "Éxito",
        description: "Nueva conversación creada",
      })
    } catch (error) {
      console.error("Error creating conversation:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden bg-white rounded-lg shadow-md">
      {/* Panel izquierdo - Lista de conversaciones */}
      <div className="w-[350px] flex flex-col border-r">
        {/* Cabecera del panel izquierdo */}
        <div className="p-3 bg-skyblue-dark text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border-2 border-white">
              <div className="flex h-full w-full items-center justify-center bg-white text-skyblue-dark font-semibold">
                {userEmail.substring(0, 2).toUpperCase()}
              </div>
            </Avatar>
            <div>
              <h2 className="text-sm font-semibold">Chat Control</h2>
              <p className="text-xs text-white/80 truncate max-w-[200px]">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-skyblue-dark/80"
              onClick={handleNewConversation}
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-skyblue-dark/80" asChild>
              <a href="/api/auth/logout">
                <LogOut className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="p-2 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar conversaciones..."
              className="pl-8 bg-white border-gray-200 focus-visible:ring-skyblue text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto bg-white">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Cargando conversaciones...</p>
            </div>
          ) : filteredConversations.length > 0 ? (
            <ConversationsList
              conversations={filteredConversations}
              onSelectChat={setSelectedChat}
              selectedChatId={selectedChat}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "No se encontraron conversaciones" : "No tienes conversaciones activas"}
              </p>
              <Button className="mt-4 bg-skyblue hover:bg-skyblue-dark text-white" onClick={handleNewConversation}>
                Iniciar nueva conversación
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Conversación seleccionada */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatView
            messages={messages}
            botActive={botActive}
            isLoading={isLoadingMessages}
            conversationId={selectedChat}
            userId={userId}
            userEmail={userEmail}
            conversation={conversations.find((c) => c.id === selectedChat)}
            onToggleBot={(active) => setBotActive(active)}
            onMessageSent={(newMessage) => {
              // Actualizar la UI con el nuevo mensaje
              setMessages((prev) => [...prev, newMessage])

              // Actualizar la conversación en la lista
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === selectedChat
                    ? {
                        ...conv,
                        lastMessage: newMessage.content,
                        time: "Ahora",
                      }
                    : conv,
                ),
              )
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <Card className="w-[400px] bg-white shadow-sm border-none">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-skyblue-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 text-skyblue-dark" />
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">Bienvenido al Chat Control</h3>
                <p className="text-gray-500 mb-6">
                  Selecciona una conversacion para comenzar a chatear o inicia una nueva.
                </p>
                <Button className="bg-skyblue hover:bg-skyblue-dark text-white px-6" onClick={handleNewConversation}>
                  Iniciar nueva conversación
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

