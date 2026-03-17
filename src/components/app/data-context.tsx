"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetchAllCanvasDataAction } from "@/app/actions/canvas";
import type { CanvasData } from "@/lib/types";

type DataContextValue = {
  data: CanvasData | null;
  loading: boolean;
  progress: string;
  error: string | null;
  refresh: () => void;
  setSyllabusSummary: (
    courseId: number | string,
    summary: string,
    weights: any[],
  ) => void;
  getSyllabusSummaries: () => Record<
    string,
    { summary: string; weights: any[] }
  >;
};

const DataContext = createContext<DataContextValue | null>(null);

const STORAGE_KEY = "quercusData";
const STALE_MS = 15 * 60 * 1000;

export function DataProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const [data, setData] = useState<CanvasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      setProgress("Checking cache...");

      if (!force) {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as CanvasData;
            const age = Date.now() - new Date(parsed.fetchedAt).getTime();
            if (age < STALE_MS) {
              setData(parsed);
              setLoading(false);
              setProgress("");
              return;
            }
          }
        } catch {
          // ignore bad cache
        }
      }

      try {
        setProgress("Fetching Canvas data...");
        const fresh = await fetchAllCanvasDataAction(token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        setData(fresh);
      } catch (err: any) {
        setError(err.message || "Failed to load Canvas data");
      } finally {
        setLoading(false);
        setProgress("");
      }
    },
    [token],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => loadData(true), [loadData]);

  const syllabusSummariesRef = useRef<
    Record<string, { summary: string; weights: any[] }>
  >({});
  const setSyllabusSummary = useCallback(
    (courseId: number | string, summary: string, weights: any[]) => {
      syllabusSummariesRef.current[String(courseId)] = { summary, weights };
    },
    [],
  );
  const getSyllabusSummaries = useCallback(
    () => syllabusSummariesRef.current,
    [],
  );

  return (
    <DataContext.Provider
      value={{
        data,
        loading,
        progress,
        error,
        refresh,
        setSyllabusSummary,
        getSyllabusSummaries,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
