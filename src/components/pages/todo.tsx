"use client"

import { useMemo } from "react"
import { useData } from "@/components/data-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CanvasCourse } from "@/lib/types"

const DAY = 86400000
const NOW = Date.now()

const COURSE_COLORS = [
  "#c45a2d",
  "#1f6f8b",
  "#2f855a",
  "#d69e2e",
  "#b83280",
  "#2b6cb0",
  "#805ad5",
  "#c05621",
]

function shortCode(course: CanvasCourse) {
  const src = course.code || course.name
  const m = src.match(/[A-Z]{3}\d{3}/)
  return m
    ? m[0]
    : src
        .split(/[:\-–]/)[0]
        .trim()
        .slice(0, 12)
}

function relativeDate(iso?: string | null) {
  if (!iso) return ""
  const diff = new Date(iso).getTime() - NOW
  if (diff < -DAY) return `${Math.round(-diff / DAY)}d overdue`
  if (diff < DAY) return "Today"
  if (diff < 2 * DAY) return "Tomorrow"
  if (diff < 7 * DAY) return `In ${Math.round(diff / DAY)}d`
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function absoluteDate(iso?: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function groupLabel(iso?: string | null) {
  if (!iso) return "No due date"
  const diff = new Date(iso).getTime() - NOW
  if (diff < 0) return "Overdue"
  if (diff < DAY) return "Due Today"
  if (diff < 7 * DAY) return "This Week"
  return "Later"
}

function groupOrder(label: string) {
  return (
    { Overdue: 0, "Due Today": 1, "This Week": 2, Later: 3, "No due date": 4 }[
      label
    ] ?? 5
  )
}

function urgencyClass(iso?: string | null) {
  if (!iso) return "bg-transparent"
  const diff = new Date(iso).getTime() - NOW
  if (diff < 0) return "border-red-200 bg-red-50"
  if (diff < DAY) return "border-amber-200 bg-amber-50"
  if (diff < 3 * DAY) return "border-orange-200 bg-orange-50"
  return "bg-white"
}

function isActiveCourse(course: CanvasCourse, todoIds: Set<string | number>) {
  const sixtyDaysAgo = NOW - 60 * DAY
  const thirtyDaysAgo = NOW - 30 * DAY
  return (
    course.assignments.some(
      (a) => a.dueAt && new Date(a.dueAt).getTime() > sixtyDaysAgo,
    ) ||
    course.announcements.some(
      (a) => a.postedAt && new Date(a.postedAt).getTime() > thirtyDaysAgo,
    ) ||
    todoIds.has(course.id)
  )
}

export function TodoPage() {
  const { data } = useData()

  const { groups, totalCount } = useMemo(() => {
    if (!data) return { groups: [], totalCount: 0 }

    const todoIds = new Set((data.todo || []).map((t) => t.course_id))
    const colorMap: Record<string, string> = {}
    data.courses.forEach((c, i) => {
      colorMap[String(c.id)] = COURSE_COLORS[i % COURSE_COLORS.length]
    })

    const items: any[] = []
    for (const course of data.courses) {
      if (!isActiveCourse(course, todoIds)) continue
      const code = shortCode(course)
      const color = colorMap[String(course.id)]

      for (const a of course.assignments) {
        if (!a.dueAt) continue
        if (a.workflowState === "graded") continue

        items.push({
          id: `${course.id}-${a.id}`,
          courseCode: code,
          courseColor: color,
          name: a.name,
          dueAt: a.dueAt,
          pointsPossible: a.pointsPossible,
          submitted: !!a.submittedAt,
          workflowState: a.workflowState,
          group: groupLabel(a.dueAt),
        })
      }
    }

    items.sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )

    const groupMap: Record<string, any[]> = {}
    for (const item of items) {
      if (!groupMap[item.group]) groupMap[item.group] = []
      groupMap[item.group].push(item)
    }

    const sorted = Object.entries(groupMap).sort(
      ([a], [b]) => groupOrder(a) - groupOrder(b),
    )

    return { groups: sorted, totalCount: items.length }
  }, [data])

  if (!data) return null

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All caught up</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-canvas-muted">
            Nothing due — enjoy the breathing room.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map(([label, items]) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{label}</CardTitle>
            <Badge>{items.length}</Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {items.map((item: any) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${urgencyClass(item.dueAt)}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                      style={{
                        background: `${item.courseColor}20`,
                        color: item.courseColor,
                      }}
                    >
                      {item.courseCode}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-canvas-ink">
                        {item.name}
                      </p>
                      <p className="text-xs text-canvas-muted">
                        {relativeDate(item.dueAt)} · {absoluteDate(item.dueAt)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      item.submitted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-canvas-accentSoft text-canvas-ink"
                    }
                  >
                    {item.submitted ? "Submitted" : "Pending"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
