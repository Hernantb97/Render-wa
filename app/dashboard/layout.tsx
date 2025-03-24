"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class">
      <div className="flex h-screen overflow-hidden">
        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Page content */}
          <div className="flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </ThemeProvider>
  )
}

