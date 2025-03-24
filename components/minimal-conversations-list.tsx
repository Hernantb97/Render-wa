"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Search } from "lucide-react"
import { useState, useEffect } from "react"
import { UserAvatar } from "./user-avatar"
import { ChatTagButton } from "./chat-tag-button"

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
  tag?: string // Nueva propiedad para la etiqueta
}

interface MinimalConversationsListProps {
  conversations: Conversation[]
  selectedChatId: string | null
  onSelectChat: (id: string) => void
  onSearch: (query: string) => void
  searchQuery: string
  activeTab: string
  setActiveTab: (tab: string) => void
  onUpdateColorLabel: (id: string, colorLabel: string) => void
  onUpdateUserCategory: (id: string, category: "default" | "important" | "urgent" | "completed") => void
  onUpdateTag?: (id: string, tag: string) => void // Nueva función para actualizar etiquetas
}

export default function MinimalConversationsList({
  conversations,
  selectedChatId,
  onSelectChat,
  onSearch,
  searchQuery,
  activeTab,
  setActiveTab,
  onUpdateColorLabel,
  onUpdateUserCategory,
  onUpdateTag,
}: MinimalConversationsListProps) {
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>("all")
  const [formattedTimes, setFormattedTimes] = useState<Record<string, string>>({})

  // Format timestamps on the client side only to avoid hydration mismatches
  useEffect(() => {
    const newFormattedTimes: Record<string, string> = {}
    
    conversations.forEach(conv => {
      try {
        newFormattedTimes[conv.id] = formatDistanceToNow(new Date(conv.timestamp), { addSuffix: true })
      } catch (e) {
        newFormattedTimes[conv.id] = "recently"
      }
    })
    
    setFormattedTimes(newFormattedTimes)
  }, [conversations])

  // Asegurarse de que todas las conversaciones tengan las propiedades necesarias para evitar errores
  const safeConversations = conversations.map(conv => ({
    ...conv,
    name: conv.name || "",
    phone: conv.phone || "",
    lastMessage: conv.lastMessage || "",
    unread: typeof conv.unread === 'number' ? conv.unread : 0,
    colorLabel: conv.colorLabel || ""
  }));

  // Filter conversations by color
  const filteredByColor =
    selectedColorFilter === "all"
      ? safeConversations
      : safeConversations.filter((conv) => conv.colorLabel === selectedColorFilter)

  // Filter conversations by search and active tab
  const filteredConversations = filteredByColor.filter((conv) => {
    // Verificar que las propiedades existen antes de llamar a toLowerCase
    const name = conv.name || "";
    const phone = conv.phone || "";
    const lastMessage = conv.lastMessage || "";
    
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      lastMessage.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "unread") return matchesSearch && (conv.unread || 0) > 0
    return matchesSearch
  })

  // Handle tag update
  const handleTagUpdate = (id: string, tag: string) => {
    if (onUpdateTag) {
      onUpdateTag(id, tag)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center bg-white rounded-full p-3 h-20 w-20">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/BEXO%20%281%29-ioN7LHMsHngPVmhgPVNy7Pns2XPtZH.png"
              alt="BEXOR Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold dark:text-white text-lg">Chat Control</h2>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Looking for..."
            className="pl-9 bg-white dark:bg-gray-800 border-none rounded-xl shadow-sm"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700 bg-white dark:bg-gray-800 p-1 gap-1">
        <button
          className={cn(
            "flex-1 py-3 text-sm font-medium rounded-lg transition-colors",
            activeTab === "all"
              ? "text-white bg-[#332c40] dark:bg-[#26212f]"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
          )}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          className={cn(
            "flex-1 py-3 text-sm font-medium rounded-lg transition-colors",
            activeTab === "unread"
              ? "text-white bg-[#332c40] dark:bg-[#26212f]"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
          )}
          onClick={() => setActiveTab("unread")}
        >
          Unread
        </button>
      </div>

      {/* Chats */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Chats</h3>
          <div className="space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchQuery || selectedColorFilter !== "all" ? "No conversations found" : "No conversations yet"}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onSelectChat(conversation.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors relative",
                    selectedChatId === conversation.id
                      ? "bg-primary-50 dark:bg-primary-900/30"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800",
                  )}
                >
                  <UserAvatar
                    size="lg"
                    colorCategory={conversation.userCategory || "default"}
                    initials={conversation.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)}
                    showUserIcon={true}
                    isBotActive={conversation.botActive}
                  />

                  {/* Tag button - Positioned absolutely */}
                  <div className="absolute top-3 right-3">
                    <ChatTagButton
                      currentTag={conversation.tag}
                      onTagChange={(tag) => handleTagUpdate(conversation.id, tag)}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate dark:text-white">{conversation.name}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formattedTimes[conversation.id] || "recently"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {conversation.status === "typing" ? (
                          <span className="italic text-primary-600 dark:text-primary-400">typing...</span>
                        ) : (
                          conversation.lastMessage
                        )}
                      </p>
                      {conversation.unread > 0 && (
                        <span className="flex-shrink-0 h-5 w-5 flex items-center justify-center bg-primary-600 text-white rounded-full text-xs">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

