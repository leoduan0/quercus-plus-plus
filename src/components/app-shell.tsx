"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { DataProvider, useData } from "@/components/data-context"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

const TOKEN_KEY = "quercusToken"

type TabId = "courses" | "todo" | "calendar" | "assistant"

function LoadingShell() {
  return (
    <div className="app-surface grid h-screen grid-cols-[86px_1fr] overflow-hidden">
      <aside className="sticky top-0 flex h-screen flex-col items-center gap-4 border-r border-border bg-background/80 shadow-sm">
        <div className="rounded-2xl border border-border bg-card px-3 py-2 text-lg text-primary">
          Q++
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-16 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="size-12 rounded-2xl" />
      </aside>
      <div className="flex min-w-0 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur md:px-10">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </header>
        <main className="px-6 pb-10 pt-6 md:px-10">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </main>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl text-foreground">Quercus++</h1>
        <p className="mt-3 text-sm text-red-600">{message}</p>
      </div>
    </div>
  )
}

function AppShell({
  activeTab,
  onClearToken,
  children,
}: {
  activeTab: TabId
  onClearToken: () => void
  children: ReactNode
}) {
  const { data, loading, error } = useData()

  if (error) {
    return <ErrorScreen message={error} />
  }

  if (loading || !data) {
    return <LoadingShell />
  }

  return (
    <div className="app-surface grid h-screen grid-cols-[86px_1fr] overflow-hidden">
      <Sidebar activeTab={activeTab} onClearToken={onClearToken} />
      <div className="flex min-w-0 flex-col overflow-y-auto">
        <Header activeTab={activeTab} />
        <main className="px-6 pb-10 pt-6 md:px-10">{children}</main>
      </div>
    </div>
  )
}

export function AuthenticatedLayout({
  activeTab,
  children,
}: {
  activeTab: TabId
  children: ReactNode
}) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) {
      router.replace("/")
      setReady(true)
      return
    }
    setToken(stored)
    setReady(true)
  }, [router])

  const handleClear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem("quercusData")
    setToken(null)
    router.replace("/")
  }, [router])

  if (!ready || !token) return null

  return (
    <DataProvider token={token}>
      <AppShell activeTab={activeTab} onClearToken={handleClear}>
        {children}
      </AppShell>
    </DataProvider>
  )
}
