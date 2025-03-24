"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Search, Plus, Filter, MoreVertical, CheckCheck, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  assignedTo?: string
  botActive: boolean
}

interface ConversationsListProps {
  conversations: Conversation[]
  selectedChatId: string | null
  onSelectChat: (id: string) => void
  onSearch: (query: string) => void
  searchQuery: string
}

export default function ConversationsList({
  conversations,
  selectedChatId,
  onSelectChat,
  onSearch,
  searchQuery,
}: ConversationsListProps) {
  const [activeTab, setActiveTab] = useState("all")

  // Format timestamp to relative time
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: false })
    } catch (e) {
      return "recently"
    }
  }

  // Filter conversations based on active tab
  const filteredByTab = conversations.filter((conv) => {
    if (activeTab === "unread") return conv.unread > 0
    if (activeTab === "business") return conv.isBusinessAccount
    if (activeTab === "personal") return !conv.isBusinessAccount
    return true // "all" tab
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Filter className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Plus className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>New group</DropdownMenuItem>
                <DropdownMenuItem>New broadcast</DropdownMenuItem>
                <DropdownMenuItem>Labels</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sort by</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search or start new chat"
            className="pl-9 bg-dashboard-hover border-none"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="px-3 pt-2">
          <TabsList className="w-full bg-muted grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filteredByTab.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          filteredByTab.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "flex items-center p-3 border-b cursor-pointer hover:bg-dashboard-hover",
                selectedChatId === conversation.id && "bg-dashboard-active",
              )}
              onClick={() => onSelectChat(conversation.id)}
            >
              <div className="relative mr-3">
                <Avatar className="h-12 w-12">
                  {conversation.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </Avatar>
                {conversation.status === "online" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                )}
                {conversation.status === "typing" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white animate-pulse" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">
                    {conversation.name}
                    {conversation.isBusinessAccount && <span className="ml-1 text-xs text-whatsapp">⚫</span>}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {formatTime(conversation.timestamp)}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="text-sm text-gray-500 truncate max-w-[180px] flex items-center">
                    {conversation.botActive && (
                      <span className="mr-1 text-xs bg-whatsapp/10 text-whatsapp rounded px-1">Bot</span>
                    )}
                    {conversation.status === "typing" ? (
                      <span className="italic text-whatsapp">typing...</span>
                    ) : (
                      <>
                        {conversation.lastMessage}
                        {conversation.id === selectedChatId && (
                          <span className="ml-1">
                            {conversation.status === "online" ? (
                              <CheckCheck className="h-3 w-3 text-whatsapp inline" />
                            ) : (
                              <Check className="h-3 w-3 text-gray-400 inline" />
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {conversation.unread > 0 && (
                    <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-whatsapp text-white border-none text-xs">
                      {conversation.unread}
                    </Badge>
                  )}
                </div>

                {conversation.labels.length > 0 && (
                  <div className="flex mt-1 space-x-1">
                    {conversation.labels.map((label, index) => (
                      <span
                        key={index}
                        className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 truncate max-w-[80px]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

