import { mockConversations, mockMessages } from "./mock-data"

// Types for compatibility
export interface Conversation {
  id: string
  created_at: string
  title: string
  user_id: string
  last_message?: string
  last_message_time?: string
  status: "active" | "pending" | "resolved"
  unread_count: number
}

export interface Message {
  id: string
  conversation_id: string
  content: string
  created_at: string
  sender_type: "user" | "bot" | "agent"
  user_id: string
  read: boolean
}

export interface Profile {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

// Function to get user conversations
export async function fetchUserConversations(userId: string): Promise<any[]> {
  console.log("Getting simulated conversations for:", userId)

  // Convert mock data to expected format
  return mockConversations.map((conv) => ({
    id: conv.id,
    title: conv.name,
    last_message: conv.lastMessage,
    last_message_time: conv.timestamp,
    status: "active",
    unread_count: conv.unread,
    created_at: conv.timestamp,
    user_id: userId,
  }))
}

// Function to get conversation messages
export async function fetchConversationMessages(conversationId: string, userId: string): Promise<any[]> {
  console.log("Getting simulated messages for conversation:", conversationId)

  // Filter mock messages by conversationId
  const messages = mockMessages.filter((msg) => msg.conversationId === conversationId)

  // Convert mock data to expected format
  return messages.map((msg) => ({
    id: msg.id,
    conversation_id: msg.conversationId,
    content: msg.content,
    created_at: msg.timestamp,
    sender_type: msg.sender === "me" ? "user" : "bot",
    user_id: userId,
    read: msg.status === "read",
  }))
}

// Function to send a new message
export async function sendMessage(
  conversationId: string,
  content: string,
  userId: string,
  senderType: "user" | "bot" | "agent" = "user",
): Promise<Message | null> {
  console.log("Sending simulated message:", content)

  // Simulate a new message
  const newMessage = {
    id: `msg-${Date.now()}`,
    conversation_id: conversationId,
    content,
    created_at: new Date().toISOString(),
    sender_type: senderType,
    user_id: userId,
    read: senderType === "user",
  }

  return newMessage
}

// Function to create a new conversation
export async function createConversation(
  title: string,
  userId: string,
  initialMessage?: string,
): Promise<Conversation> {
  console.log("Creating simulated conversation:", title)

  // Simulate a new conversation
  const newConversation = {
    id: `conv-${Date.now()}`,
    created_at: new Date().toISOString(),
    title,
    user_id: userId,
    last_message: initialMessage || "New conversation",
    last_message_time: new Date().toISOString(),
    status: "active" as const,
    unread_count: 0,
  }

  return newConversation
}

// Function to get user profile
export async function getUserProfile(userId: string) {
  console.log("Getting simulated profile for:", userId)

  // Simulate a user profile
  return {
    id: userId,
    email: "demo@example.com",
    name: "Demo User",
    avatar_url: null,
  }
}

// Function to get a specific conversation
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  console.log("Getting conversation:", conversationId);
  
  // Buscar la conversación en los datos simulados
  const conversation = mockConversations.find(conv => conv.id === conversationId);
  
  if (!conversation) {
    return null;
  }

  // Convertir a formato esperado
  return {
    id: conversation.id,
    title: conversation.name,
    last_message: conversation.lastMessage,
    last_message_time: conversation.timestamp,
    status: "active",
    unread_count: conversation.unread,
    created_at: conversation.timestamp,
    user_id: conversation.phone
  };
}

