"use client";

import { RefreshCcw } from "lucide-react";
import { useData } from "@/components/app/data-context";
import { Button } from "@/components/ui/button";

type TabId = "courses" | "todo" | "calendar" | "assistant";

const TITLES: Record<TabId, string> = {
  courses: "Classes",
  todo: "To-Do",
  calendar: "Calendar",
  assistant: "AI Assistant",
};

export function Header({ activeTab }: { activeTab: TabId }) {
  const { loading, refresh, data } = useData();

  const fetchedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <header className="flex items-center justify-between border-b border-canvas-border bg-white/80 px-6 py-4 backdrop-blur md:px-10">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-canvas-muted">
          Quercus++
        </p>
        <h2 className="font-display text-2xl text-canvas-ink">
          {TITLES[activeTab]}
        </h2>
      </div>
      <div className="flex items-center gap-3 text-sm text-canvas-muted">
        {fetchedAt && <span>Updated {fetchedAt}</span>}
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCcw
            className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"}
          />
          Refresh
        </Button>
      </div>
    </header>
  );
}
