"use client"

import { useState, useEffect, useRef } from "react"
import MinimalConversationsList from "@/components/minimal-conversations-list"
import MinimalChatView from "@/components/minimal-chat-view"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { mockConversations, mockMessages } from "@/lib/mock-data"
import { Home, Moon, Sun, LogOut, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from '@supabase/supabase-js'
import { fetchConversations, fetchMessages, fetchBusinessData, sendMessage, toggleBot } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

// Crear cliente de Supabase directamente
const supabaseUrl = 'https://wscijkxwevgxbgwhbqtm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to safely generate timestamp strings
const safeTimestamp = () => {
  // Only run on client side
  if (typeof window === 'undefined') {
    return "2023-01-01T00:00:00Z"; // Default timestamp for SSR
  }
  return new Date().toISOString();
};

// Definir interfaces para tipos
interface Conversation {
  id: string;
  title: string;
  name?: string;          // Para compatibilidad con componentes existentes
  phone?: string;         // Para compatibilidad con componentes existentes
  lastMessage?: string;
  time?: string;
  timestamp?: string;     // Para compatibilidad con componentes existentes
  isRead: boolean;
  unread?: number;        // Para compatibilidad con componentes existentes
  tag: string;
  colorLabel?: string;    // Para compatibilidad con componentes existentes
  botActive: boolean;
  userPhone?: string;
  businessPhone?: string;
  status?: string;        // Para compatibilidad con componentes existentes
  isBusinessAccount?: boolean; // Para compatibilidad con componentes existentes
  labels?: string[];      // Para compatibilidad con componentes existentes
  userCategory?: string;  // Para compatibilidad con MinimalChatView
}

interface Message {
  id: string;
  sender: string;
  content: string;        // Cambiado de 'message' a 'content' para compatibilidad con MinimalChatView
  timestamp: string;
  status?: string;
  type?: string;          // Necesario para MinimalChatView
  isFromUser?: boolean;
  fileName?: string;      // Para mensajes tipo archivo
  fileSize?: string;      // Para mensajes tipo archivo
  conversationId?: string; // Para compatibilidad con la API
}

interface MinimalChatInterfaceProps {
  businessId?: string;
}

// Función adaptadora para convertir mockConversations al formato Conversation
const adaptMockConversations = (): Conversation[] => {
  return mockConversations.map(mock => ({
    id: mock.id,
    title: mock.name,
    lastMessage: mock.lastMessage,
    time: new Date(mock.timestamp).toLocaleTimeString(),
    isRead: mock.unread === 0,
    tag: mock.colorLabel || "gray",
    botActive: mock.botActive,
    userPhone: mock.phone,
    businessPhone: ""
  }));
};

// Función adaptadora para convertir mockMessages al formato Message
const adaptMockMessages = (): Message[] => {
  return mockMessages.filter(msg => msg.conversationId === "conv1").map(mock => ({
    id: mock.id,
    sender: mock.sender,
    content: mock.content,
    timestamp: mock.timestamp,
    status: mock.status,
    type: mock.type || "text",
    isFromUser: mock.sender === "user"
  }));
};

export default function MinimalChatInterface({ businessId: propBusinessId }: MinimalChatInterfaceProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [businessId, setBusinessId] = useState<string | null>(propBusinessId || null);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [showAnalytics, setShowAnalytics] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestampRef = useRef<Record<string, string>>({});

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Obtener el ID del negocio del usuario autenticado
  useEffect(() => {
    const getUserBusinessId = async () => {
      try {
        // Obtener la sesión actual
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          // Buscar el business asociado al usuario
          const { data: businessData, error } = await supabase
            .from('business_users')
            .select('business_id')
            .eq('user_id', data.session.user.id)
            .single();

          if (businessData) {
            console.log('Business ID encontrado:', businessData.business_id);
            setBusinessId(businessData.business_id);
          } else {
            console.log('No se encontró business ID para el usuario:', data.session.user.id);
          }
        }
      } catch (error) {
        console.error('Error al obtener el business ID:', error);
      }
    };

    if (typeof window !== 'undefined') {
      getUserBusinessId();
    }
  }, []);

  // Cargar datos del negocio cuando cambie el businessId
  useEffect(() => {
    if (businessId) {
      const loadBusinessData = async () => {
        try {
          const businessData = await fetchBusinessData(businessId);
          if (businessData) {
            setBusinessInfo(businessData);
            console.log("Datos del negocio cargados:", businessData);
          }
        } catch (error) {
          console.error("Error al cargar datos del negocio:", error);
          toast.error("No se pudo cargar la información del negocio");
        }
      };
      
      loadBusinessData();
    }
  }, [businessId]);

  // Cargar conversaciones
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        console.log("Cargando conversaciones para businessId:", businessId);
        const realConversations = await fetchConversations(businessId || undefined);
        
        if (realConversations && realConversations.length > 0) {
          console.log(`Se encontraron ${realConversations.length} conversaciones reales`);
          
          // Nos aseguramos de que cada conversación tenga las propiedades necesarias
          const processedConversations = realConversations.map((conv: any) => ({
            id: conv.id,
            name: conv.phone || conv.userPhone || "Chat",
            title: conv.phone || conv.userPhone || "Chat",
            phone: conv.phone || conv.userPhone || "",
            lastMessage: conv.lastMessage || "",
            time: conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString() : "",
            timestamp: conv.lastMessageTime || new Date().toISOString(),
            isRead: conv.isRead !== undefined ? conv.isRead : false,
            unread: conv.isRead === false ? 1 : 0,
            tag: conv.tag || "gray",
            colorLabel: conv.tag || "gray",
            botActive: conv.isBotActive !== undefined ? conv.isBotActive : true,
            userPhone: conv.phone || conv.userPhone || "",
            businessPhone: conv.businessPhone || "",
            status: "offline",
            isBusinessAccount: false,
            labels: []
          }));
          
          setConversations(processedConversations);
        } else {
          console.log("No se encontraron conversaciones reales, usando datos de ejemplo");
          // Si no hay conversaciones reales, usamos datos de ejemplo solo si no hay un businessId específico
          if (!businessId) {
            setConversations(adaptMockConversations());
          } else {
            setConversations([]);
          }
        }
      } catch (error) {
        console.error("Error al cargar conversaciones:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las conversaciones",
          variant: "destructive",
        });
        
        // Si hay un error, usamos datos de ejemplo solo si no hay un businessId específico
        if (!businessId) {
          setConversations(adaptMockConversations());
        } else {
          setConversations([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadConversations();
    
    // Configuramos el polling para recargar conversaciones cada 10 segundos
    const intervalId = setInterval(() => {
      if (businessId) {
        loadConversations();
      }
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [businessId]);

  // Cargar mensajes al seleccionar una conversación
  useEffect(() => {
    if (selectedChat) {
      const loadMessages = async () => {
        setIsLoading(true);
        try {
          const chatMessages = await fetchMessages(selectedChat);
          if (chatMessages && chatMessages.length > 0) {
            // Adaptar los mensajes al formato que necesitamos
            const adaptedMessages: Message[] = chatMessages.map((msg: any) => ({
              id: msg.id,
              sender: msg.sender,
              content: msg.content || "",
              timestamp: msg.timestamp,
              status: msg.status,
              type: msg.type || "text",
              isFromUser: msg.sender === "user"
            }));
            setMessages(adaptedMessages);
          } else {
            // Si no hay mensajes reales para esta conversación, usar datos de prueba
            setMessages(adaptMockMessages());
          }
        } catch (error) {
          console.error("Error loading messages:", error);
          // En caso de error, usar datos de prueba
          setMessages(adaptMockMessages());
        } finally {
          setIsLoading(false);
        }
      };
      
      loadMessages();
    }
  }, [selectedChat]);

  // Filter conversations based on search query and active tab
  const filteredConversations = conversations.filter((conv) => {
    if (!conv) return false;
    
    const matchesSearch =
      conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.phone?.includes(searchQuery) ||
      conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "unread") return matchesSearch && conv.unread > 0
    return matchesSearch
  })

  // Handle sending a new message - use real API
  const handleSendMessage = async (content: string, type = "text", fileName?: string, fileSize?: string) => {
    if (!selectedChat || (!content.trim() && type === "text")) return

    // Create local representation of the message
    const newMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedChat,
      content,
      timestamp: safeTimestamp(),
      status: "sending",
      sender: "me",
      type,
      ...(fileName && { fileName }),
      ...(fileSize && { fileSize }),
    }

    // Add message to the local state immediately
    setMessages((prev) => [...prev, newMessage])

    // Update conversation preview and set botActive to false
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedChat
          ? {
              ...conv,
              lastMessage: type === "text" ? content : type === "image" ? "Image" : "File",
              timestamp: safeTimestamp(),
              botActive: false, // Desactivar bot inmediatamente en UI
            }
          : conv,
      ),
    )

    try {
      // Send message to the server
      const sentMessage = await sendMessage(selectedChat, content, type, {
        fileName,
        fileSize
      });

      // Replace the temporary message with the one from the server
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...sentMessage, status: "sent" } : msg
        )
      );
      
      // Desactivar el bot explícitamente para esta conversación
      try {
        await toggleBot(selectedChat, false);
        console.log('Bot desactivado automáticamente al enviar mensaje');
      } catch (botError) {
        console.error('Error al desactivar bot automáticamente:', botError);
      }

      // Check if the conversation has bot active (automatic replies)
      const currentConversation = conversations.find((c) => c.id === selectedChat);

      if (currentConversation && currentConversation.botActive) {
        // The backend will handle the bot reply, but we can show a temporary message while waiting
        const tempBotReply = {
          id: `temp-bot-${Date.now()}`,
          conversationId: selectedChat,
          content: "El bot está escribiendo...",
          timestamp: safeTimestamp(),
          status: "sending",
          sender: "them",
          type: "text",
        };
        
        setMessages((prev) => [...prev, tempBotReply]);
        
        // After a short delay, refresh messages to get the bot reply from the server
        setTimeout(async () => {
          const updatedMessages = await fetchMessages(selectedChat);
          if (updatedMessages && updatedMessages.length > 0) {
            setMessages(updatedMessages);
            
            // Update conversation with latest message
            const latestMessage = updatedMessages[updatedMessages.length - 1];
            if (latestMessage) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedChat
              ? {
                  ...conv,
                        lastMessage: latestMessage.content,
                        timestamp: latestMessage.timestamp,
                }
              : conv,
          ),
              );
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Update the local message to show error
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: "error" } : msg
        )
      );
    }
  }

  // Rest of your state updater functions
  const handleUpdateColorLabel = (id: string, colorLabel: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id
          ? {
              ...conv,
              colorLabel,
            }
          : conv,
      ),
    )
  }

  const handleUpdateUserCategory = (id: string, category: "default" | "important" | "urgent" | "completed") => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id
          ? {
              ...conv,
              userCategory: category,
            }
          : conv,
      ),
    )
  }

  const handleUpdateTag = (id: string, tag: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id
          ? {
              ...conv,
              tag,
            }
          : conv,
      ),
    )
  }

  const handleToggleBot = async (id: string, active: boolean) => {
    try {
      // Actualizar localmente primero para respuesta instantánea
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id
          ? {
              ...conv,
              botActive: active,
            }
          : conv,
      ),
      );
      
      // Llamar a la API para actualizar en el servidor
      const result = await toggleBot(id, active);
      
      toast({
        title: `Bot ${active ? 'activado' : 'desactivado'}`,
        description: `El bot ha sido ${active ? 'activado' : 'desactivado'} exitosamente para esta conversación.`,
        variant: active ? "default" : "destructive",
      });
      
      console.log("Bot toggle result:", result);
    } catch (error) {
      console.error("Error al cambiar estado del bot:", error);
      
      // Revertir cambio local en caso de error
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id
            ? {
                ...conv,
                botActive: !active, // Revertir al estado opuesto
              }
            : conv,
        ),
      );
      
      toast({
        title: "Error al cambiar estado del bot",
        description: "No se pudo cambiar el estado del bot. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const toggleAnalytics = () => {
    // Client-side navigation
    router.push("/dashboard/analytics");
  }

  const handleLogout = () => {
    // Client-side confirmation using useEffect
    if (typeof window !== 'undefined') {
      const confirmLogout = window.confirm("Are you sure you want to log out?");
      if (confirmLogout) {
        router.push("/login");
      }
    }
  }

  // Función para actualizar periódicamente los mensajes
  useEffect(() => {
    // Función de polling para actualizar mensajes
    const pollMessages = async () => {
      if (selectedChat) {
        try {
          const updatedMessages = await fetchMessages(selectedChat);
          if (updatedMessages && updatedMessages.length > 0) {
            // Adaptar los mensajes al formato que necesitamos
            const adaptedMessages: Message[] = updatedMessages.map((msg: any) => ({
              id: msg.id,
              sender: msg.sender,
              content: msg.content || "",
              timestamp: msg.timestamp,
              status: msg.status,
              type: msg.type || "text",
              isFromUser: msg.sender === "user"
            }));
            
            // Verificar si hay nuevos mensajes basado en la longitud o timestamp
            const lastMessage = adaptedMessages[adaptedMessages.length - 1];
            const lastKnownTimestamp = lastMessageTimestampRef.current[selectedChat] || "";
            
            // Si hay un mensaje nuevo o es la primera carga
            if (
              messages.length !== adaptedMessages.length ||
              (lastMessage && lastMessage.timestamp !== lastKnownTimestamp)
            ) {
              console.log("Nuevos mensajes detectados, actualizando la vista");
              setMessages(adaptedMessages);
              
              // Actualizar la referencia del último timestamp
              if (lastMessage) {
                lastMessageTimestampRef.current[selectedChat] = lastMessage.timestamp;
              }
              
              // Actualizar la vista previa de la conversación si es necesario
              if (lastMessage && lastMessage.sender === "them") {
                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id === selectedChat
                      ? {
                          ...conv,
                          lastMessage: lastMessage.content,
                          time: new Date(lastMessage.timestamp).toLocaleTimeString(),
                          isRead: false
                        }
                      : conv
                  )
                );
              }
            }
          }
        } catch (error) {
          console.error("Error durante el polling de mensajes:", error);
        }
      }
    };
    
    // Iniciar el polling cada 5 segundos cuando hay una conversación seleccionada
    if (selectedChat) {
      pollingIntervalRef.current = setInterval(pollMessages, 5000);
    }
    
    // Limpiar el intervalo cuando cambia la conversación o se desmonta el componente
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedChat, messages]);

  // Actualizar las conversaciones periódicamente
  useEffect(() => {
    const pollConversations = async () => {
      try {
        const updatedConversations = await fetchConversations(businessId || undefined);
        if (updatedConversations && updatedConversations.length > 0) {
          // Adaptar las conversaciones al formato que necesitamos
          const adaptedConversations: Conversation[] = updatedConversations.map((conv: any) => ({
            id: conv.id,
            name: conv.phone || conv.userPhone || "Chat",
            title: conv.phone || conv.userPhone || "Chat",
            phone: conv.phone || conv.userPhone || "",
            lastMessage: conv.lastMessage || "",
            time: conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString() : "",
            timestamp: conv.lastMessageTime || new Date().toISOString(),
            isRead: conv.isRead !== undefined ? conv.isRead : false,
            unread: conv.isRead === false ? 1 : 0,
            tag: conv.tag || "gray",
            colorLabel: conv.tag || "gray",
            botActive: conv.isBotActive !== undefined ? conv.isBotActive : true,
            userPhone: conv.phone || conv.userPhone || "",
            businessPhone: conv.businessPhone || "",
            status: "offline",
            isBusinessAccount: false,
            labels: []
          }));
          
          // Comparar con las conversaciones actuales para ver si hay cambios
          if (adaptedConversations.length !== conversations.length || 
              JSON.stringify(adaptedConversations.map(c => c.id).sort()) !== 
              JSON.stringify(conversations.map(c => c.id).sort())) {
            console.log("Nuevas conversaciones detectadas, actualizando la lista");
            setConversations(adaptedConversations);
          }
        }
      } catch (error) {
        console.error("Error durante el polling de conversaciones:", error);
      }
    };
    
    // Solo iniciar el polling si tenemos un business ID
    if (businessId) {
      const intervalId = setInterval(pollConversations, 10000); // Cada 10 segundos
      return () => clearInterval(intervalId);
    }
  }, [businessId, conversations.length]);

  // Delete confirmation handlers
  const handleDeleteConversation = () => {
    if (!selectedChat) return
    setDeleteDialogOpen(true)
  }

  const confirmDeleteConversation = () => {
    if (!selectedChat) return
    setConversations((prev) => prev.filter((conv) => conv.id !== selectedChat))
    setMessages([])
    setSelectedChat(null)
    setDeleteDialogOpen(false)
  }

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-950 p-2">
      <div className="flex w-full max-w-[98%] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800">
        {/* Main navigation bar - With even larger icons */}
        <div className="w-16 bg-[#332c40] dark:bg-[#26212f] flex flex-col items-center py-6 text-white rounded-xl">
          <div className="flex-1 flex flex-col items-center mt-8 space-y-10">
            <Button
              variant="ghost"
              className={cn(
                "w-16 h-16 p-0 hover:bg-[#26212f] dark:hover:bg-[#15121b] rounded-xl",
                !showAnalytics && "bg-[#26212f] dark:bg-[#15121b]",
              )}
              onClick={() => {
                setShowAnalytics(false)
                router.push("/dashboard")
              }}
            >
              <Home className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-16 h-16 p-0 hover:bg-[#26212f] dark:hover:bg-[#15121b] rounded-xl",
                showAnalytics && "bg-[#26212f] dark:bg-[#15121b]",
              )}
              onClick={toggleAnalytics}
            >
              <BarChart2 className="h-8 w-8" />
            </Button>
          </div>
          <div className="flex flex-col items-center space-y-10 mb-8">
            <Button
              variant="ghost"
              className="w-16 h-16 p-0 hover:bg-[#26212f] dark:hover:bg-[#15121b] rounded-xl"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-8 w-8" /> : <Moon className="h-8 w-8" />}
            </Button>
            <Button
              variant="ghost"
              className="w-16 h-16 p-0 hover:bg-[#26212f] dark:hover:bg-[#15121b] rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="h-8 w-8" />
            </Button>
          </div>
        </div>

        {/* Main area - With higher contrast */}
        <div className="flex flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-r-lg">
          {/* Conversations list */}
          <div className={cn("w-96 border-r dark:border-gray-700", selectedChat && isMobile ? "hidden" : "block")}>
            <MinimalConversationsList
              conversations={conversations}
              selectedChatId={selectedChat}
              onSelectChat={setSelectedChat}
              onSearch={setSearchQuery}
              searchQuery={searchQuery}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onUpdateColorLabel={handleUpdateColorLabel}
              onUpdateUserCategory={handleUpdateUserCategory}
              onUpdateTag={handleUpdateTag}
            />
          </div>

          {/* Chat view */}
          <div className={cn("flex-1 flex", !selectedChat && isMobile ? "hidden" : "flex")}>
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <MinimalChatView
                  conversation={conversations.find((c) => c.id === selectedChat)}
                  messages={messages}
                  isLoading={isLoading}
                  onSendMessage={handleSendMessage}
                  onBack={() => setSelectedChat(null)}
                  onToggleBot={(active) => handleToggleBot(selectedChat, active)}
                  onDeleteConversation={handleDeleteConversation}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-r-2xl">
                  <div className="text-center">
                    <div className="mb-6 flex items-center justify-center">
                      <div className="rounded-full bg-white p-4 w-32 h-32 flex items-center justify-center">
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/BEXO%20%281%29-ioN7LHMsHngPVmhgPVNy7Pns2XPtZH.png"
                          alt="BEXOR Logo"
                          className="h-20 w-auto object-contain"
                        />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Powered by BEXOR</h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      Selecciona un chat para comenzar a enviar mensajes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Agregar el diálogo de confirmación al final del componente, justo antes del cierre del div principal */}
      {/* Diálogo de confirmación para eliminar conversación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar conversación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteConversation}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

