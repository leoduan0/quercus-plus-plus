"use client"

import { useEffect, useMemo, useState } from "react"
import { summarizeSyllabusAction } from "@/app/actions/assistant"
import { useData } from "@/components/data-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CanvasCourse } from "@/lib/types"

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

const NOW = Date.now()
const DAY = 86400000

function colorFor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length]
}

function shortCode(course: CanvasCourse) {
  const src = course.code || course.name
  const m = src.match(/[A-Z]{3}\d{3}/)
  return m
    ? m[0]
    : src
        .split(/[:\-–]/)[0]
        .trim()
        .slice(0, 16)
}

function courseTitle(course: CanvasCourse) {
  const parts = course.name.split(":")
  return parts.length > 1 ? parts.slice(1).join(":").trim() : course.name
}

function relativeDate(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const diff = d.getTime() - NOW
  if (diff < -DAY) return `${Math.round(-diff / DAY)}d ago`
  if (diff < DAY) return "Today"
  if (diff < 2 * DAY) return "Tomorrow"
  if (diff < 7 * DAY) return `In ${Math.round(diff / DAY)}d`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function urgencyClass(iso?: string | null) {
  if (!iso) return "bg-transparent"
  const diff = new Date(iso).getTime() - NOW
  if (diff < 0) return "bg-red-50 text-red-700"
  if (diff < DAY) return "bg-amber-50 text-amber-700"
  if (diff < 3 * DAY) return "bg-orange-50 text-orange-700"
  return "bg-transparent"
}

function pct(score?: number | null, possible?: number | null) {
  if (score == null || !possible) return null
  return Math.round((score / possible) * 100)
}

export function CoursesPage() {
  const { data, setSyllabusSummary, getSyllabusSummaries } = useData()
  const [expandedCourseId, setExpandedCourseId] = useState<
    string | number | null
  >(null)

  const activeCourses = useMemo(() => {
    if (!data) return []
    const todoIds = new Set((data.todo || []).map((t) => t.course_id))
    const sixtyDaysAgo = NOW - 60 * DAY
    const thirtyDaysAgo = NOW - 30 * DAY

    return data.courses.filter((course) => {
      const hasRecentAssignment = course.assignments.some(
        (a) => a.dueAt && new Date(a.dueAt).getTime() > sixtyDaysAgo,
      )
      const hasRecentAnnouncement = course.announcements.some(
        (a) => a.postedAt && new Date(a.postedAt).getTime() > thirtyDaysAgo,
      )
      return (
        hasRecentAssignment || hasRecentAnnouncement || todoIds.has(course.id)
      )
    })
  }, [data])

  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      {activeCourses.map((course, index) => {
        const color = colorFor(index)
        const isExpanded = expandedCourseId === course.id
        return (
          <Card key={course.id} className="animate-fadeUp">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <span
                    className="inline-flex h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {shortCode(course)}
                </CardTitle>
                <p className="mt-2 text-sm text-canvas-muted">
                  {courseTitle(course)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setExpandedCourseId(isExpanded ? null : course.id)
                }
              >
                {isExpanded ? "Collapse" : "Details"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <UpcomingDeadlines assignments={course.assignments} />
                <ActionNeeded course={course} />
              </div>
              {isExpanded && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <GradesSection course={course} />
                  <AnnouncementsSection announcements={course.announcements} />
                  <SyllabusSection
                    course={course}
                    setSyllabusSummary={setSyllabusSummary}
                    getSyllabusSummaries={getSyllabusSummaries}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function UpcomingDeadlines({
  assignments,
}: {
  assignments: CanvasCourse["assignments"]
}) {
  const upcoming = assignments
    .filter((a) => a.dueAt && new Date(a.dueAt).getTime() > NOW)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 6)

  return (
    <div className="rounded-2xl border border-canvas-border bg-white/70 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-canvas-muted">
        Upcoming deadlines
      </h4>
      {upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-canvas-muted">No upcoming deadlines.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.map((a) => (
            <li
              key={a.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${urgencyClass(a.dueAt)}`}
            >
              <div>
                <p className="font-medium text-canvas-ink">{a.name}</p>
                <p className="text-xs text-canvas-muted">
                  {a.pointsPossible ? `${a.pointsPossible} pts` : ""}
                </p>
              </div>
              <Badge className="bg-white/70 text-canvas-ink">
                {relativeDate(a.dueAt)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActionNeeded({ course }: { course: CanvasCourse }) {
  const items: { id: string; text: string; detail: string; type: string }[] = []

  for (const a of course.assignments) {
    if (
      a.dueAt &&
      new Date(a.dueAt).getTime() > NOW &&
      a.workflowState !== "graded" &&
      !a.submittedAt
    ) {
      items.push({
        id: `unsub-${a.id}`,
        text: a.name,
        detail: `Due ${relativeDate(a.dueAt)}`,
        type: "To Do",
      })
    }
  }

  for (const s of course.submissions) {
    if (s.missing) {
      items.push({
        id: `miss-${s.assignmentId}`,
        text: s.assignmentName || "Missing assignment",
        detail: "Missing",
        type: "Missing",
      })
    }
  }

  const weekAgo = NOW - 7 * DAY
  for (const s of course.submissions) {
    if (
      s.comments.length > 0 &&
      s.gradedAt &&
      new Date(s.gradedAt).getTime() > weekAgo
    ) {
      items.push({
        id: `fb-${s.assignmentId}`,
        text: s.assignmentName || "Feedback",
        detail: `Feedback from ${s.comments[s.comments.length - 1].author}`,
        type: "Feedback",
      })
    }
  }

  return (
    <div className="rounded-2xl border border-canvas-border bg-white/70 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-canvas-muted">
        Action needed
      </h4>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-canvas-muted">All caught up!</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 6).map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-canvas-ink">{item.text}</p>
                <p className="text-xs text-canvas-muted">{item.detail}</p>
              </div>
              <Badge className="bg-canvas-accentSoft text-canvas-ink">
                {item.type}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function GradesSection({ course }: { course: CanvasCourse }) {
  const { grades, submissions } = course
  const apiScore = grades?.currentScore
  const graded = submissions.filter((s) => s.score != null && s.pointsPossible)
  graded.sort(
    (a, b) =>
      new Date(a.gradedAt || 0).getTime() - new Date(b.gradedAt || 0).getTime(),
  )

  const totalScore = graded.reduce((sum, s) => sum + (s.score || 0), 0)
  const totalPossible = graded.reduce(
    (sum, s) => sum + (s.pointsPossible || 0),
    0,
  )
  const computedAvg =
    totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : null

  const displayAvg = apiScore ?? computedAvg

  return (
    <div className="rounded-2xl border border-canvas-border bg-white/70 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-canvas-muted">
        Grades
      </h4>
      {graded.length === 0 && displayAvg == null ? (
        <p className="mt-3 text-sm text-canvas-muted">No grades yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {displayAvg != null && (
            <div className="flex items-end gap-3">
              <span className="text-3xl font-semibold text-canvas-ink">
                {displayAvg}%
              </span>
              <span className="text-xs text-canvas-muted">
                {apiScore != null
                  ? "Current grade"
                  : `Across ${graded.length} graded items`}
              </span>
            </div>
          )}
          {graded.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-xl border border-canvas-border bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-accentSoft text-canvas-ink">
                  <tr>
                    <th className="px-3 py-2">Assignment</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {graded.map((s) => (
                    <tr
                      key={s.assignmentId}
                      className="border-t border-canvas-border"
                    >
                      <td className="px-3 py-2">{s.assignmentName}</td>
                      <td className="px-3 py-2">
                        {s.score}/{s.pointsPossible}
                      </td>
                      <td className="px-3 py-2">
                        {pct(s.score, s.pointsPossible)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnnouncementsSection({
  announcements,
}: {
  announcements: CanvasCourse["announcements"]
}) {
  const recent = announcements
    .slice()
    .sort(
      (a, b) =>
        new Date(b.postedAt || 0).getTime() -
        new Date(a.postedAt || 0).getTime(),
    )
    .slice(0, 5)

  return (
    <div className="rounded-2xl border border-canvas-border bg-white/70 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-canvas-muted">
        Announcements
      </h4>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-canvas-muted">No announcements.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {recent.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-canvas-border bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-canvas-ink">
                  {a.title}
                </p>
                <span className="text-xs text-canvas-muted">
                  {a.postedAt
                    ? new Date(a.postedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </span>
              </div>
              {a.message && (
                <p className="mt-2 text-xs text-canvas-muted">
                  {a.message.slice(0, 200)}
                  {a.message.length > 200 ? "..." : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SyllabusSection({
  course,
  setSyllabusSummary,
  getSyllabusSummaries,
}: {
  course: CanvasCourse
  setSyllabusSummary: (
    courseId: number | string,
    summary: string,
    weights: any[],
  ) => void
  getSyllabusSummaries: () => Record<
    string,
    { summary: string; weights: any[] }
  >
}) {
  const [expanded, setExpanded] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [weights, setWeights] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { syllabusBody, syllabusFiles } = course
  const hasBody = syllabusBody && syllabusBody.length > 100
  const hasFiles = syllabusFiles && syllabusFiles.length > 0

  useEffect(() => {
    const cached = getSyllabusSummaries()[String(course.id)]
    if (cached) {
      setSummary(cached.summary)
      setWeights(cached.weights)
    }
  }, [course.id, getSyllabusSummaries])

  if (!hasBody && !hasFiles) {
    return (
      <div className="rounded-2xl border border-canvas-border bg-white/70 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-canvas-muted">
          Syllabus
        </h4>
        <p className="mt-3 text-sm text-canvas-muted">No syllabus available.</p>
      </div>
    )
  }

  const handleSummarize = async () => {
    if (summary !== null || loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await summarizeSyllabusAction({
        syllabusBody: syllabusBody || "",
        syllabusFiles: syllabusFiles || [],
        courseName: course.code || course.name,
      })
      const s = data.summary || "No summary available."
      const w = data.weights || []
      setSummary(s)
      setWeights(w)
      setSyllabusSummary(course.id, s, w)
    } catch {
      setError("Could not generate summary.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-canvas-border bg-white/70 p-4 md:col-span-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-canvas-muted">
          Syllabus
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSummarize}
          disabled={loading || summary !== null}
        >
          {loading
            ? "Analyzing..."
            : summary
              ? "Summary ready"
              : "Summarize with AI"}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {summary && (
        <div className="mt-3 rounded-xl border border-canvas-border bg-white p-3 text-sm">
          <p className="text-canvas-ink">{summary}</p>
          {weights && weights.length > 0 && (
            <table className="mt-3 w-full text-left text-xs">
              <thead className="text-canvas-muted">
                <tr>
                  <th className="py-1">Category</th>
                  <th className="py-1">Weight</th>
                </tr>
              </thead>
              <tbody>
                {weights.map((w, i) => (
                  <tr key={i} className="border-t border-canvas-border">
                    <td className="py-1">{w.category}</td>
                    <td className="py-1">{w.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {hasFiles && (
        <div className="mt-3 flex flex-wrap gap-2">
          {syllabusFiles.map((f) => (
            <a
              key={f.id}
              href={f.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-canvas-border bg-white px-3 py-1 text-xs text-canvas-muted hover:text-canvas-ink"
            >
              {f.name}
            </a>
          ))}
        </div>
      )}

      {hasBody && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse full syllabus" : "Show full syllabus"}
          </Button>
          {expanded && (
            <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-canvas-border bg-white p-3 text-xs text-canvas-muted">
              {syllabusBody}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
