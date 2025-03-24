import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Chat Control Panel",
  description: "Panel de control para gestionar conversaciones de chat",
}

export default async function HomePage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  // Si el usuario está autenticado, redirigir al dashboard
  redirect("/dashboard")
}

