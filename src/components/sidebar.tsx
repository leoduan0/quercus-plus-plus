"use client"

import {
  BookOpen,
  Calendar,
  CheckCircle2,
  LogOut,
  MessagesSquare,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TabId = "courses" | "todo" | "calendar" | "assistant"

type SidebarProps = {
  activeTab?: TabId
  onClearToken: () => void
}

const TABS: {
  id: TabId
  label: string
  href: string
  icon: React.ReactNode
}[] = [
  {
    id: "courses",
    label: "Classes",
    href: "/courses",
    icon: <BookOpen className="size-6" />,
  },
  {
    id: "todo",
    label: "To-Do",
    href: "/todo",
    icon: <CheckCircle2 className="size-6" />,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: <Calendar className="size-6" />,
  },
  {
    id: "assistant",
    label: "AI Chat",
    href: "/assistant",
    icon: <MessagesSquare className="size-6" />,
  },
]

export function Sidebar({ activeTab, onClearToken }: SidebarProps) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col items-center gap-4 border-r border-border bg-background/80 shadow-sm py-4">
      <div className="rounded-2xl border border-border bg-card px-3 py-2 text-lg text-primary">
        Q++
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "group flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold transition",
              activeTab === tab.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="size-12 rounded-2xl border-border hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        onClick={onClearToken}
        title="Disconnect"
      >
        <LogOut className="size-6" />
      </Button>
    </aside>
  )
}
