"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Send, ArrowLeft, Check, CheckCheck, ImageIcon, Paperclip, X, Download, File, Trash } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { UserAvatar } from "./user-avatar"
import { getBotStatus } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  conversationId: string
  content: string
  timestamp: string
  status: "sent" | "delivered" | "read" | "received"
  sender: "me" | "them"
  type: "text" | "image" | "file"
  fileName?: string
  fileSize?: string
}

interface Conversation {
  id: string
  name: string
  phone: string
  lastMessage: string
  timestamp: string
  unread: number
  status: "online" | "offline" | "typing"
  isBusinessAccount: boolean
  labels: string[]
  colorLabel: string
  userCategory?: "default" | "important" | "urgent" | "completed"
  assignedTo?: string
  botActive: boolean
}

interface MinimalChatViewProps {
  conversation?: Conversation
  messages: Message[]
  isLoading: boolean
  onSendMessage: (content: string, type?: string, fileName?: string, fileSize?: string) => void
  onBack: () => void
  onToggleBot: (active: boolean) => void
  onDeleteConversation?: () => void
}

export default function MinimalChatView({
  conversation,
  messages,
  isLoading,
  onSendMessage,
  onBack,
  onToggleBot,
  onDeleteConversation,
}: MinimalChatViewProps) {
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [fileToSend, setFileToSend] = useState<{ name: string; size: string } | null>(null)
  const [isBotStatusLoading, setBotStatusLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()

  // Verificar el estado real del bot cuando se selecciona una conversación
  useEffect(() => {
    const checkBotStatus = async () => {
      if (conversation && conversation.id) {
        try {
          setBotStatusLoading(true);
          const { isActive } = await getBotStatus(conversation.id);
          
          // Solo actualizar si es diferente al estado actual
          if (isActive !== conversation.botActive) {
            console.log(`Estado del bot en el servidor (${isActive}) diferente al local (${conversation.botActive}). Actualizando...`);
            onToggleBot(isActive);
          }
        } catch (error) {
          console.error("Error al verificar el estado del bot:", error);
        } finally {
          setBotStatusLoading(false);
        }
      }
    };
    
    checkBotStatus();
  }, [conversation?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Format timestamp
  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "h:mm a")
    } catch (e) {
      return "now"
    }
  }

  // Format date for message groups
  const formatMessageDate = (timestamp: string) => {
    try {
      const today = new Date()
      const messageDate = new Date(timestamp)

      if (
        messageDate.getDate() === today.getDate() &&
        messageDate.getMonth() === today.getMonth() &&
        messageDate.getFullYear() === today.getFullYear()
      ) {
        return "Today"
      }

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (
        messageDate.getDate() === yesterday.getDate() &&
        messageDate.getMonth() === yesterday.getMonth() &&
        messageDate.getFullYear() === yesterday.getFullYear()
      ) {
        return "Yesterday"
      }

      return format(messageDate, "MMMM d, yyyy")
    } catch (e) {
      return "Recent"
    }
  }

  // Adaptamos los mensajes al formato esperado
  const adaptedMessages = messages.map((msg: any) => {
    // Si el mensaje ya tiene una propiedad 'content', lo usamos directamente
    if (msg && 'content' in msg) {
      return msg;
    }
    
    // Si el mensaje tiene una propiedad 'message', la convertimos a 'content'
    if (msg && 'message' in msg) {
      return {
        ...msg,
        content: msg.message,
        type: msg.type || 'text'
      };
    }
    
    // Caso inusual, pero creamos un objeto seguro
    return {
      id: msg?.id || `msg-${Math.random().toString(36).substring(2, 9)}`,
      sender: msg?.sender || 'unknown',
      content: 'No content available',
      timestamp: msg?.timestamp || new Date().toISOString(),
      status: msg?.status || 'unknown',
      type: 'text'
    };
  });

  // Group messages by date
  const groupedMessages = adaptedMessages.reduce((groups: { [key: string]: any[] }, message) => {
    const date = formatMessageDate(message.timestamp)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (imagePreview) {
      // Send image
      onSendMessage(imagePreview, "image", "image.jpg", "1.2 MB")
      setImagePreview(null)
      return
    }

    if (fileToSend) {
      // Send file
      onSendMessage(fileToSend.name, "file", fileToSend.name, fileToSend.size)
      setFileToSend(null)
      return
    }

    if (input.trim() && !isSending) {
      setIsSending(true)
      onSendMessage(input)
      setInput("")
      setTimeout(() => setIsSending(false), 300)
    }
  }

  // Handle textarea key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real environment, we would upload the image to a server
      // For this example, we use a placeholder
      setImagePreview("/placeholder.svg?height=300&width=400")

      // Clear the input to allow selecting the same file again
      e.target.value = ""
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real environment, we would upload the file to a server
      setFileToSend({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      })

      // Clear the input to allow selecting the same file again
      e.target.value = ""
    }
  }

  // Cancel sending image or file
  const cancelAttachment = () => {
    setImagePreview(null)
    setFileToSend(null)
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Select a conversation</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-gray-500 dark:text-gray-400">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <UserAvatar
            size="md"
            className="mr-3"
            colorCategory={conversation.userCategory || "default"}
            initials={conversation.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)}
            showUserIcon={true}
            isBotActive={conversation.botActive}
          />
          <div>
            <div className="font-medium dark:text-white">{conversation.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {conversation.status === "online" ? "online" : conversation.status === "typing" ? "typing..." : "offline"}
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Bot</span>
            <Switch
              checked={conversation?.botActive}
              onCheckedChange={(checked) => onToggleBot(checked)}
              className="data-[state=checked]:bg-[#332c40]"
            />
          </div>
          {onDeleteConversation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteConversation}
              className="ml-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Eliminar conversación"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sand-pattern">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]: [string, any]) => (
            <div key={date} className="space-y-3">
              <div className="flex justify-center">
                <span className="text-xs bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md shadow-sm">
                  {date}
                </span>
              </div>

              {msgs.map((message: Message) => (
                <div key={message.id} className={cn("flex", message.sender === "me" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] px-3 py-2 rounded-2xl shadow-sm",
                      message.sender === "me"
                        ? "message-sent bg-indigo-700 text-white"
                        : "message-received bg-white dark:bg-gray-700 text-gray-800 dark:text-white",
                    )}
                  >
                    {message.type === "text" && <p className="text-sm">{message.content}</p>}

                    {message.type === "image" && (
                      <div className="space-y-1">
                        <div className="relative">
                          <img
                            src={message.content || "/placeholder.svg"}
                            alt="Shared image"
                            className="rounded-md max-w-full max-h-[200px] object-contain"
                          />
                        </div>
                        {message.fileName && (
                          <div className="flex items-center justify-between text-xs text-gray-300 dark:text-gray-400">
                            <span>{message.fileName}</span>
                            <span>{message.fileSize}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {message.type === "file" && (
                      <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-md p-2 gap-2">
                        <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md">
                          <File className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{message.fileSize}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 dark:text-blue-400">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-end mt-1 space-x-1">
                      <span className="text-[10px] text-gray-300 dark:text-gray-500">
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {message.sender === "me" &&
                        (message.status === "read" ? (
                          <CheckCheck className="h-3 w-3 text-gray-300 dark:text-gray-500" />
                        ) : message.status === "delivered" ? (
                          <CheckCheck className="h-3 w-3 text-gray-300 dark:text-gray-500" />
                        ) : (
                          <Check className="h-3 w-3 text-gray-300 dark:text-gray-500" />
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image or file preview */}
      {(imagePreview || fileToSend) && (
        <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="h-16 w-16 object-cover rounded-md"
                  />
                </div>
              )}

              {fileToSend && (
                <div className="flex items-center bg-white dark:bg-gray-700 rounded-md p-2 gap-2 border dark:border-gray-600">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md">
                    <File className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileToSend.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fileToSend.size}</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={cancelAttachment}
              className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input area - Now thinner with centered icons */}
      <div className="p-1 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex justify-center space-x-2">
            <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 rounded-full h-8 w-8 flex items-center justify-center"
              onClick={() => imageInputRef.current?.click()}
              disabled={!!imagePreview || !!fileToSend}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>

            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 rounded-full h-8 w-8 flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!imagePreview || !!fileToSend}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message here"
              className="min-h-[32px] max-h-[80px] resize-none py-1 px-3 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              disabled={isSending || !!imagePreview || !!fileToSend}
            />
          </div>

          <Button
            type="submit"
            size="icon"
            className="bg-[#332c40] hover:bg-[#26212f] dark:bg-[#332c40] dark:hover:bg-[#26212f] rounded-full h-8 w-8 flex items-center justify-center"
            disabled={isSending || (!input.trim() && !imagePreview && !fileToSend)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

