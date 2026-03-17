"use client";

import { useMemo } from "react";
import { useData } from "@/components/app/data-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CanvasCourse } from "@/lib/types";

const COURSE_COLORS = [
  "#c45a2d",
  "#1f6f8b",
  "#2f855a",
  "#d69e2e",
  "#b83280",
  "#2b6cb0",
  "#805ad5",
  "#c05621",
];

function shortCode(course: CanvasCourse) {
  const src = course.code || course.name;
  const m = src.match(/[A-Z]{3}\d{3}/);
  return m
    ? m[0]
    : src
        .split(/[:\-–]/)[0]
        .trim()
        .slice(0, 12);
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CalendarPage() {
  const { data } = useData();

  const items = useMemo(() => {
    if (!data) return [] as any[];
    const colorMap: Record<string, string> = {};
    data.courses.forEach((c, i) => {
      colorMap[String(c.id)] = COURSE_COLORS[i % COURSE_COLORS.length];
    });

    const events: any[] = [];

    for (const course of data.courses) {
      const color = colorMap[String(course.id)];
      const code = shortCode(course);

      for (const a of course.assignments) {
        if (!a.dueAt) continue;
        events.push({
          id: `asgn-${a.id}`,
          title: a.name,
          courseCode: code,
          time: a.dueAt,
          type: "deadline",
          color,
          detail: a.pointsPossible ? `${a.pointsPossible} pts` : "",
        });
      }
    }

    for (const ev of data.upcoming || []) {
      if (ev.type !== "event") continue;
      const courseId = ev.context_code?.replace("course_", "");
      const color = colorMap[String(courseId)] || "#6b7280";
      events.push({
        id: `event-${ev.id}`,
        title: ev.title,
        courseCode: ev.context_name?.match(/[A-Z]{3}\d{3}/)?.[0] || "",
        time: ev.start_at,
        type: "event",
        color,
        detail: ev.location_name || "",
      });
    }

    return events
      .filter((e) => e.time)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [data]);

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming schedule</CardTitle>
        <p className="text-sm text-canvas-muted">
          Assignments and calendar events in date order.
        </p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-canvas-muted">No upcoming events.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-canvas-border bg-white px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-canvas-ink">
                      {item.title}
                    </p>
                    <p className="text-xs text-canvas-muted">
                      {formatDate(item.time)}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </p>
                  </div>
                </div>
                <Badge
                  className="bg-white"
                  style={{ color: item.color, borderColor: item.color }}
                >
                  {item.courseCode || item.type}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
