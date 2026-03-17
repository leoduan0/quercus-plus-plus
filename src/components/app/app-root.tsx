"use client";

import { useCallback, useState } from "react";
import { DataProvider, useData } from "@/components/app/data-context";
import { Header } from "@/components/app/header";
import { AssistantPage } from "@/components/app/pages/assistant";
import { CalendarPage } from "@/components/app/pages/calendar";
import { CoursesPage } from "@/components/app/pages/courses";
import { TodoPage } from "@/components/app/pages/todo";
import { Sidebar } from "@/components/app/sidebar";
import { TokenEntry } from "@/components/app/token-entry";

const TOKEN_KEY = "quercusToken";

type TabId = "courses" | "todo" | "calendar" | "assistant";

function LoadingScreen() {
  const { progress, error } = useData();

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-canvas-ink">Quercus++</h1>
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-canvas-border border-t-canvas-accent" />
            <p className="text-sm text-canvas-muted">
              {progress || "Loading..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AppShell({ onClearToken }: { onClearToken: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("courses");
  const { data, loading, error } = useData();

  if (loading || error || !data) {
    return <LoadingScreen />;
  }

  const page = {
    courses: <CoursesPage />,
    todo: <TodoPage />,
    calendar: <CalendarPage />,
    assistant: <AssistantPage />,
  }[activeTab];

  return (
    <div className="app-bg">
      <div className="app-surface grid min-h-screen grid-cols-[86px_1fr]">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClearToken={onClearToken}
        />
        <div className="flex min-w-0 flex-col">
          <Header activeTab={activeTab} />
          <main className="px-6 pb-10 pt-6 md:px-10">{page}</main>
        </div>
      </div>
    </div>
  );
}

export function AppRoot() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY),
  );

  const handleToken = useCallback((nextToken: string) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  }, []);

  const handleClear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("quercusData");
    setToken(null);
  }, []);

  if (!token) {
    return <TokenEntry onToken={handleToken} />;
  }

  return (
    <DataProvider token={token}>
      <AppShell onClearToken={handleClear} />
    </DataProvider>
  );
}
