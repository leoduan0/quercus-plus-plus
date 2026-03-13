import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchAllCanvasData } from "../services/canvasApi";

const DataContext = createContext(null);

const STORAGE_KEY = "quercusData";
const STALE_MS = 15 * 60 * 1000; // 15 minutes

export function DataProvider({ token, children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);

  const loadData = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      setProgress("Checking cache…");

      // Try localStorage cache first
      if (!force) {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            const age = Date.now() - new Date(parsed.fetchedAt).getTime();
            if (age < STALE_MS) {
              setData(parsed);
              setLoading(false);
              setProgress("");
              return;
            }
          }
        } catch {
          // corrupt cache, ignore
        }
      }

      // Fetch fresh
      try {
        const fresh = await fetchAllCanvasData(token, setProgress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        setData(fresh);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setProgress("");
      }
    },
    [token]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => loadData(true), [loadData]);

  // Syllabus summaries cache: courseId -> { summary, weights }
  const syllabusSummariesRef = useRef({});
  const setSyllabusSummary = useCallback((courseId, summary, weights) => {
    syllabusSummariesRef.current[courseId] = { summary, weights };
  }, []);
  const getSyllabusSummaries = useCallback(() => syllabusSummariesRef.current, []);

  return (
    <DataContext.Provider value={{ data, loading, progress, error, refresh, setSyllabusSummary, getSyllabusSummaries }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}
