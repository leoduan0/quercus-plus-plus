"use client";

import {
  BookOpen,
  Calendar,
  CheckCircle2,
  LogOut,
  MessagesSquare,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabId = "courses" | "todo" | "calendar" | "assistant";

type SidebarProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onClearToken: () => void;
};

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "courses", label: "Classes", icon: <BookOpen className="h-5 w-5" /> },
  { id: "todo", label: "To-Do", icon: <CheckCircle2 className="h-5 w-5" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" /> },
  {
    id: "assistant",
    label: "AI Chat",
    icon: <MessagesSquare className="h-5 w-5" />,
  },
];

export function Sidebar({
  activeTab,
  onTabChange,
  onClearToken,
}: SidebarProps) {
  return (
    <aside className="flex h-full flex-col items-center gap-4 border-r border-canvas-border bg-white/80 py-6 shadow-sm">
      <div className="rounded-2xl border border-canvas-border bg-canvas-panel px-3 py-2 font-display text-lg text-canvas-accent">
        Q++
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "group flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold transition",
              activeTab === tab.id
                ? "bg-canvas-accentSoft text-canvas-accent"
                : "text-canvas-muted hover:bg-canvas-accentSoft/60 hover:text-canvas-ink",
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        className="h-12 w-12 rounded-2xl border border-transparent text-canvas-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        onClick={onClearToken}
        title="Disconnect"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </aside>
  );
}
