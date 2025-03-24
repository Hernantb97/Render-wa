import type { Metadata } from "next"
import MinimalChatInterface from "@/components/minimal-chat-interface"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "WhatsApp Business Dashboard",
  description: "Minimal WhatsApp Business Dashboard",
}

// Se convierte en un componente asíncrono para poder obtener la información del negocio
export default async function DashboardPage() {
  // Obtener el usuario autenticado y su negocio asociado
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Obtener la sesión del usuario
  const { data: { session } } = await supabase.auth.getSession()
  
  // Si no hay sesión, mostrar el componente sin businessId
  if (!session) {
    console.log("No hay sesión de usuario, mostrando panel sin businessId")
    return <MinimalChatInterface />
  }
  
  // Obtener el negocio asociado al usuario
  const { data: userBusinessData, error: userBusinessError } = await supabase
    .from('user_businesses')
    .select('business_id')
    .eq('user_id', session.user.id)
    .single()
  
  if (userBusinessError) {
    console.error("Error al obtener el negocio del usuario:", userBusinessError)
    return <MinimalChatInterface />
  }
  
  // Si el usuario tiene un negocio asociado, pasarlo al componente
  if (userBusinessData?.business_id) {
    console.log("Usuario logueado con businessId:", userBusinessData.business_id)
    return <MinimalChatInterface businessId={userBusinessData.business_id} />
  }
  
  // Si no hay un negocio asociado, mostrar el componente sin businessId
  console.log("Usuario logueado pero sin negocio asociado")
  return <MinimalChatInterface />
}

