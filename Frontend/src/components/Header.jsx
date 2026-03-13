import { useData } from "../contexts/DataContext";

const TITLES = {
  courses: "Classes",
  todo: "To-Do",
  calendar: "Calendar",
  assistant: "AI Assistant",
};

export default function Header({ activeTab }) {
  const { loading, refresh, data } = useData();

  const fetchedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString()
    : null;

  return (
    <header className="app-header">
      <h2>{TITLES[activeTab]}</h2>
      <div className="header-right">
        {fetchedAt && (
          <span className="header-timestamp">Updated {fetchedAt}</span>
        )}
        <button
          className="header-refresh"
          onClick={refresh}
          disabled={loading}
          title="Refresh data"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            className={loading ? "spinning" : ""}
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </header>
  );
}
