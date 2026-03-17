"use client"

import { RefreshCcw } from "lucide-react"
import { useData } from "@/components/data-context"
import { Button } from "@/components/ui/button"

type TabId = "courses" | "todo" | "calendar" | "assistant"

const TITLES: Record<TabId, string> = {
  courses: "Classes",
  todo: "To-Do",
  calendar: "Calendar",
  assistant: "AI Assistant",
}

export function Header({ activeTab }: { activeTab: TabId }) {
  const { loading, refresh, data } = useData()

  const fetchedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null

  return (
    <header className="flex items-center justify-between border-b border-border bg-background/80 py-4 backdrop-blur md:px-10">
      <div>
        <h1 className="normal">{TITLES[activeTab]}</h1>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {fetchedAt && <span>Updated {fetchedAt}</span>}
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCcw />
          Refresh
        </Button>
      </div>
    </header>
  )
}
