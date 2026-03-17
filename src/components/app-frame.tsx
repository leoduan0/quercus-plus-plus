"use client"

import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useCallback, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"

const TOKEN_KEY = "quercusToken"

type TabId = "courses" | "todo" | "calendar" | "assistant"

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const activeTab = useMemo<TabId | undefined>(() => {
    if (pathname.startsWith("/courses")) return "courses"
    if (pathname.startsWith("/todo")) return "todo"
    if (pathname.startsWith("/calendar")) return "calendar"
    if (pathname.startsWith("/assistant")) return "assistant"
    return undefined
  }, [pathname])

  const handleClearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem("quercusData")
    router.push("/")
  }, [router])

  return (
    <div className="app-surface grid h-screen grid-cols-[86px_1fr] overflow-hidden">
      <Sidebar activeTab={activeTab} onClearToken={handleClearToken} />
      <div className="flex min-w-0 flex-col overflow-y-auto">{children}</div>
    </div>
  )
}
