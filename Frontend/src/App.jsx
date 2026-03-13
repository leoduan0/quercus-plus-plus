import { useState, useCallback } from "react";
import { DataProvider, useData } from "./contexts/DataContext";
import TokenEntry from "./components/TokenEntry";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import CoursesPage from "./pages/CoursesPage";
import TodoPage from "./pages/TodoPage";
import CalendarPage from "./pages/CalendarPage";
import AssistantPage from "./pages/AssistantPage";
import "./App.css";

const TOKEN_KEY = "quercusToken";

function LoadingScreen() {
  const { progress, error } = useData();
  return (
    <div className="loading-screen">
      <h1>Quercus++</h1>
      {error ? (
        <p className="loading-error">{error}</p>
      ) : (
        <>
          <div className="loading-spinner" />
          <p className="loading-msg">{progress || "Loading…"}</p>
        </>
      )}
    </div>
  );
}

function AppShell({ onClearToken }) {
  const [activeTab, setActiveTab] = useState("courses");
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
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClearToken={onClearToken}
      />
      <div className="app-main">
        <Header activeTab={activeTab} />
        <div className="app-content">{page}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const handleToken = useCallback((t) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
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
