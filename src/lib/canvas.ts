import type { CanvasCourse, CanvasData } from "@/lib/types"

const CANVAS_BASE =
  process.env.CANVAS_BASE_URL || "https://q.utoronto.ca/api/v1"

async function canvasFetch(endpoint: string, token: string) {
  const res: Response = await fetch(`${CANVAS_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Canvas API ${res.status}: ${endpoint} ${text}`.trim())
  }

  return res.json()
}

async function canvasFetchAll(endpoint: string, token: string) {
  let url: string | null = `${CANVAS_BASE}${endpoint}`
  const all: unknown[] = []

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Canvas API ${res.status}: ${url} ${text}`.trim())
    }

    const data = await res.json()
    if (!Array.isArray(data)) return data
    all.push(...data)

    const link = res.headers.get("link")
    url = null
    if (link) {
      const m = link.match(/<([^>]+)>;\s*rel="next"/)
      if (m) url = m[1]
    }
  }

  return all
}

async function canvasFetchAllSafe(endpoint: string, token: string) {
  try {
    return await canvasFetchAll(endpoint, token)
  } catch {
    return []
  }
}

function stripHtml(html: string | null | undefined) {
  if (!html) return null
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchCourses(token: string) {
  return canvasFetchAll("/courses?enrollment_state=active&per_page=100", token)
}

async function fetchAssignments(courseId: number | string, token: string) {
  const raw = await canvasFetchAll(
    `/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`,
    token,
  )
  return raw.map((a: any) => ({
    id: a.id,
    name: a.name,
    dueAt: a.due_at,
    pointsPossible: a.points_possible,
    submissionTypes: a.submission_types,
    description: stripHtml(a.description)?.slice(0, 500) ?? null,
    score: a.submission?.score ?? null,
    grade: a.submission?.grade ?? null,
    submittedAt: a.submission?.submitted_at ?? null,
    workflowState: a.submission?.workflow_state ?? null,
  }))
}

async function fetchGrades(courseId: number | string, token: string) {
  const raw = await canvasFetchAll(
    `/courses/${courseId}/enrollments?type[]=StudentEnrollment&user_id=self`,
    token,
  )

  if (raw.length > 0 && raw[0].grades) {
    const g = raw[0].grades
    return {
      currentScore: g.current_score,
      currentGrade: g.current_grade,
      finalScore: g.final_score,
      finalGrade: g.final_grade,
    }
  }
  return {}
}

async function fetchSubmissions(courseId: number | string, token: string) {
  const raw = await canvasFetchAll(
    `/courses/${courseId}/students/submissions?student_ids[]=self&per_page=100&include[]=assignment&include[]=submission_comments`,
    token,
  )

  return raw.map((s: any) => ({
    assignmentId: s.assignment_id,
    assignmentName: s.assignment?.name ?? null,
    score: s.score,
    grade: s.grade,
    submittedAt: s.submitted_at,
    gradedAt: s.graded_at,
    pointsPossible: s.assignment?.points_possible,
    late: s.late,
    missing: s.missing,
    comments: (s.submission_comments || []).map((c: any) => ({
      author: c.author_name,
      comment: c.comment,
      createdAt: c.created_at,
    })),
  }))
}

async function fetchUpcoming(token: string) {
  return canvasFetchAll("/users/self/upcoming_events?per_page=50", token)
}

async function fetchTodo(token: string) {
  return canvasFetchAll("/users/self/todo?per_page=50", token)
}

async function fetchModules(courseId: number | string, token: string) {
  const raw = await canvasFetchAllSafe(
    `/courses/${courseId}/modules?include[]=items&per_page=100`,
    token,
  )

  return raw.map((m: any) => ({
    id: m.id,
    name: m.name,
    position: m.position,
    state: m.state,
    itemCount: m.items_count,
    items: (m.items || []).map((i: any) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      url: i.html_url,
    })),
  }))
}

async function fetchAnnouncements(courseId: number | string, token: string) {
  const raw = await canvasFetchAllSafe(
    `/courses/${courseId}/discussion_topics?only_announcements=true&per_page=50`,
    token,
  )

  return raw.map((a: any) => ({
    id: a.id,
    title: a.title,
    postedAt: a.posted_at,
    message: stripHtml(a.message)?.slice(0, 500) ?? null,
  }))
}

async function fetchSyllabus(courseId: number | string, token: string) {
  try {
    const raw = await canvasFetch(
      `/courses/${courseId}?include[]=syllabus_body`,
      token,
    )
    if (!raw.syllabus_body) return null
    return stripHtml(raw.syllabus_body)
  } catch {
    return null
  }
}

async function fetchFiles(courseId: number | string, token: string) {
  const raw = await canvasFetchAllSafe(
    `/courses/${courseId}/files?per_page=100`,
    token,
  )

  return raw.map((f: any) => ({
    id: f.id,
    name: f.display_name || f.filename,
    size: f.size,
    contentType: f.content_type || f["content-type"],
    url: f.url,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }))
}

export async function fetchAllCanvasData(token: string): Promise<CanvasData> {
  const rawCourses = await fetchCourses(token)
  const [upcoming, todo] = await Promise.all([
    fetchUpcoming(token).catch(() => []),
    fetchTodo(token).catch(() => []),
  ])

  const courses: CanvasCourse[] = []

  const coursePromises = rawCourses.map(async (course: any) => {
    const [
      grades,
      assignments,
      submissions,
      syllabusBody,
      files,
      modules,
      announcements,
    ] = await Promise.all([
      fetchGrades(course.id, token).catch(() => ({})),
      fetchAssignments(course.id, token).catch(() => []),
      fetchSubmissions(course.id, token).catch(() => []),
      fetchSyllabus(course.id, token).catch(() => null),
      fetchFiles(course.id, token).catch(() => []),
      fetchModules(course.id, token).catch(() => []),
      fetchAnnouncements(course.id, token).catch(() => []),
    ])

    const syllabusFiles = files.filter((f: any) =>
      (f.name || "").toLowerCase().includes("syllabus"),
    )

    return {
      id: course.id,
      name: course.name,
      code: course.course_code,
      term: course.enrollment_term_id,
      startAt: course.start_at,
      endAt: course.end_at,
      grades,
      assignments,
      submissions,
      syllabusBody,
      syllabusFiles: syllabusFiles.map((f: any) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        contentType: f.contentType,
      })),
      modules,
      announcements,
      files,
    } satisfies CanvasCourse
  })

  const settled = await Promise.all(coursePromises)
  courses.push(...settled)

  return {
    fetchedAt: new Date().toISOString(),
    courses,
    upcoming: upcoming,
    todo: todo,
  }
}

export async function validateCanvasToken(token: string) {
  return canvasFetch("/users/self/profile", token)
}
