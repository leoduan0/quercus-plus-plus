/**
 * Canvas LMS API client — runs in-browser.
 *
 * All Canvas requests go through our Express backend proxy (/api/canvas/...)
 * to avoid CORS issues. The token is sent in the Authorization header per
 * request and is never stored on the backend.
 *
 * Expects the caller to pass the API token. This module never reads
 * localStorage or manages keys — that's the caller's job.
 *
 * All functions return our trimmed schema shapes (see CANVAS_DATA_SCHEMA.md).
 */

const BASE = "/api/canvas/api/v1";

// ---------------------------------------------------------------------------
// Core fetch helpers
// ---------------------------------------------------------------------------

/** Single-page Canvas fetch. Returns parsed JSON. */
async function canvasFetch(endpoint, token) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Canvas API ${res.status}: ${endpoint}`);
  }
  return res.json();
}

/** Paginated Canvas fetch. Follows Link: <…>; rel="next" headers. */
async function canvasFetchAll(endpoint, token) {
  let url = `${BASE}${endpoint}`;
  const all = [];

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Canvas API ${res.status}: ${url}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return data; // single object, no pagination

    all.push(...data);

    const link = res.headers.get("link");
    url = null;
    if (link) {
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      if (m) url = m[1];
    }
  }
  return all;
}

/** Paginated fetch that swallows errors (for endpoints profs may disable). */
async function canvasFetchAllSafe(endpoint, token) {
  try {
    return await canvasFetchAll(endpoint, token);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Strip HTML to plain text
// ---------------------------------------------------------------------------

function stripHtml(html) {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Individual endpoint fetchers (return trimmed shapes)
// ---------------------------------------------------------------------------

async function fetchCourses(token) {
  return canvasFetchAll("/courses?enrollment_state=active&per_page=100", token);
}

async function fetchAssignments(courseId, token) {
  const raw = await canvasFetchAll(
    `/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`,
    token
  );
  return raw.map((a) => ({
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
  }));
}

async function fetchGrades(courseId, token) {
  const raw = await canvasFetchAll(
    `/courses/${courseId}/enrollments?type[]=StudentEnrollment&user_id=self`,
    token
  );
  if (raw.length > 0 && raw[0].grades) {
    const g = raw[0].grades;
    return {
      currentScore: g.current_score,
      currentGrade: g.current_grade,
      finalScore: g.final_score,
      finalGrade: g.final_grade,
    };
  }
  return {};
}

async function fetchSubmissions(courseId, token) {
  const raw = await canvasFetchAll(
    `/courses/${courseId}/students/submissions?student_ids[]=self&per_page=100&include[]=assignment&include[]=submission_comments`,
    token
  );
  return raw.map((s) => ({
    assignmentId: s.assignment_id,
    assignmentName: s.assignment?.name,
    score: s.score,
    grade: s.grade,
    submittedAt: s.submitted_at,
    gradedAt: s.graded_at,
    pointsPossible: s.assignment?.points_possible,
    late: s.late,
    missing: s.missing,
    comments: (s.submission_comments || []).map((c) => ({
      author: c.author_name,
      comment: c.comment,
      createdAt: c.created_at,
    })),
  }));
}

async function fetchUpcoming(token) {
  return canvasFetchAll("/users/self/upcoming_events?per_page=50", token);
}

async function fetchTodo(token) {
  return canvasFetchAll("/users/self/todo?per_page=50", token);
}

async function fetchModules(courseId, token) {
  const raw = await canvasFetchAllSafe(
    `/courses/${courseId}/modules?include[]=items&per_page=100`,
    token
  );
  return raw.map((m) => ({
    id: m.id,
    name: m.name,
    position: m.position,
    state: m.state,
    itemCount: m.items_count,
    items: (m.items || []).map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      url: i.html_url,
    })),
  }));
}

async function fetchAnnouncements(courseId, token) {
  const raw = await canvasFetchAllSafe(
    `/courses/${courseId}/discussion_topics?only_announcements=true&per_page=50`,
    token
  );
  return raw.map((a) => ({
    id: a.id,
    title: a.title,
    postedAt: a.posted_at,
    message: stripHtml(a.message)?.slice(0, 500) ?? null,
  }));
}

async function fetchSyllabus(courseId, token) {
  try {
    const raw = await canvasFetch(
      `/courses/${courseId}?include[]=syllabus_body`,
      token
    );
    if (!raw.syllabus_body) return null;
    return stripHtml(raw.syllabus_body);
  } catch {
    return null;
  }
}

async function fetchFiles(courseId, token) {
  const raw = await canvasFetchAllSafe(
    `/courses/${courseId}/files?per_page=100`,
    token
  );
  return raw.map((f) => ({
    id: f.id,
    name: f.display_name || f.filename,
    size: f.size,
    contentType: f.content_type || f["content-type"],
    url: f.url,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Full data fetch — mirrors canvas-client.js dumpAllData()
// ---------------------------------------------------------------------------

/**
 * Fetch all Canvas data for the user. Returns the full schema object.
 *
 * @param {string} token - Canvas API token
 * @param {(msg: string) => void} [onProgress] - optional progress callback
 * @returns {Promise<object>} - full data dump matching CANVAS_DATA_SCHEMA.md
 */
export async function fetchAllCanvasData(token, onProgress) {
  const progress = onProgress || (() => {});

  progress("Fetching course list…");
  const rawCourses = await fetchCourses(token);

  progress(`Found ${rawCourses.length} courses. Fetching details…`);

  const [upcoming, todo] = await Promise.all([
    fetchUpcoming(token).catch(() => []),
    fetchTodo(token).catch(() => []),
  ]);

  const courses = [];

  // Fetch per-course data — do all courses in parallel
  const coursePromises = rawCourses.map(async (course) => {
    progress(`Loading ${course.course_code || course.name}…`);

    const [grades, assignments, submissions, syllabusBody, files, modules, announcements] =
      await Promise.all([
        fetchGrades(course.id, token).catch(() => ({})),
        fetchAssignments(course.id, token).catch(() => []),
        fetchSubmissions(course.id, token).catch(() => []),
        fetchSyllabus(course.id, token).catch(() => null),
        fetchFiles(course.id, token).catch(() => []),
        fetchModules(course.id, token).catch(() => []),
        fetchAnnouncements(course.id, token).catch(() => []),
      ]);

    const syllabusFiles = files.filter((f) =>
      f.name.toLowerCase().includes("syllabus")
    );

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
      syllabusFiles: syllabusFiles.map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        contentType: f.contentType,
      })),
      modules,
      announcements,
      files,
    };
  });

  const settled = await Promise.all(coursePromises);
  courses.push(...settled);

  progress("Done!");

  return {
    fetchedAt: new Date().toISOString(),
    courses,
    upcoming,
    todo,
  };
}

/**
 * Quick token validation — tries to fetch the user's profile.
 * Returns the user object on success, throws on failure.
 */
export async function validateToken(token) {
  return canvasFetch("/users/self/profile", token);
}
