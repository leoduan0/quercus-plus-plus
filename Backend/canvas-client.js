// it's CANVA_API_KEY, not CANVAS_API_KEY!
const API_KEY = process.env.CANVA_API_KEY;
const BASE = process.env.CANVAS_BASE_URL || "https://q.utoronto.ca/api/v1";

if (!API_KEY) {
  console.error("Set CANVA_API_KEY in your environment first!");
  process.exit(1);
}

// --- Core fetch with pagination support ---

async function canvasFetch(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Canvas API ${res.status}: ${endpoint} - ${await res.text()}`);
  }
  return res.json();
}

/** Fetch all pages for a paginated Canvas endpoint. */
async function canvasFetchAll(endpoint) {
  let url = `${BASE}${endpoint}`;
  const allResults = [];

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) {
      throw new Error(`Canvas API ${res.status}: ${url} - ${await res.text()}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      allResults.push(...data);
    } else {
      return data; // single object, no pagination
    }

    // Parse Link header for next page
    const link = res.headers.get("link");
    url = null;
    if (link) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) url = match[1];
    }
  }
  return allResults;
}

// --- Data fetchers ---

async function getCourses() {
  return canvasFetchAll("/courses?enrollment_state=active&per_page=100");
}

async function getAssignments(courseId) {
  return canvasFetchAll(
    `/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`
  );
}

async function getGrades(courseId) {
  return canvasFetchAll(
    `/courses/${courseId}/enrollments?type[]=StudentEnrollment&user_id=self`
  );
}

async function getSubmissions(courseId) {
  return canvasFetchAll(
    `/courses/${courseId}/students/submissions?student_ids[]=self&per_page=100&include[]=assignment&include[]=submission_comments`
  );
}

async function getUpcoming() {
  return canvasFetchAll("/users/self/upcoming_events?per_page=50");
}

async function getCourseFiles(courseId) {
  try {
    return await canvasFetchAll(`/courses/${courseId}/files?per_page=100`);
  } catch {
    return []; // files tab may be hidden
  }
}

async function getModules(courseId) {
  try {
    return await canvasFetchAll(
      `/courses/${courseId}/modules?include[]=items&per_page=100`
    );
  } catch {
    return [];
  }
}

async function getAnnouncements(courseId) {
  try {
    return await canvasFetchAll(
      `/courses/${courseId}/discussion_topics?only_announcements=true&per_page=50`
    );
  } catch {
    return [];
  }
}

async function getSyllabus(courseId) {
  try {
    return await canvasFetch(`/courses/${courseId}?include[]=syllabus_body`);
  } catch {
    return null;
  }
}

async function getTodoItems() {
  return canvasFetchAll("/users/self/todo?per_page=50");
}

// --- Giant data dump ---

async function dumpAllData() {
  console.log("=== CANVAS GIANT DATA DUMP ===\n");

  const courses = await getCourses();
  console.log(`Found ${courses.length} active courses.\n`);

  const dump = {
    fetchedAt: new Date().toISOString(),
    courses: [],
    upcoming: [],
    todo: [],
  };

  // Upcoming events & todo
  const [upcoming, todo] = await Promise.all([
    getUpcoming().catch(() => []),
    getTodoItems().catch(() => []),
  ]);
  dump.upcoming = upcoming;
  dump.todo = todo;

  for (const course of courses) {
    console.log(`--- Processing: ${course.name} (${course.id}) ---`);

    const courseData = {
      id: course.id,
      name: course.name,
      code: course.course_code,
      term: course.enrollment_term_id,
      startAt: course.start_at,
      endAt: course.end_at,
      grades: null,
      assignments: [],
      submissions: [],
      syllabusBody: null,
      syllabusFiles: [],
      modules: [],
      announcements: [],
      files: [],
    };

    // Fetch everything for this course in parallel
    const [grades, assignments, submissions, syllabusInfo, files, modules, announcements] =
      await Promise.all([
        getGrades(course.id).catch(() => []),
        getAssignments(course.id).catch(() => []),
        getSubmissions(course.id).catch(() => []),
        getSyllabus(course.id).catch(() => null),
        getCourseFiles(course.id).catch(() => []),
        getModules(course.id).catch(() => []),
        getAnnouncements(course.id).catch(() => []),
      ]);

    // Grades
    if (grades.length > 0 && grades[0].grades) {
      const g = grades[0].grades;
      courseData.grades = {
        currentScore: g.current_score,
        currentGrade: g.current_grade,
        finalScore: g.final_score,
        finalGrade: g.final_grade,
      };
      console.log(
        `  Grade: ${g.current_score ?? "N/A"}% (${g.current_grade ?? "N/A"})`
      );
    }

    // Assignments with submission info
    courseData.assignments = assignments.map((a) => ({
      id: a.id,
      name: a.name,
      dueAt: a.due_at,
      pointsPossible: a.points_possible,
      submissionTypes: a.submission_types,
      description: a.description
        ? a.description.replace(/<[^>]*>/g, "").slice(0, 500)
        : null,
      score: a.submission?.score ?? null,
      grade: a.submission?.grade ?? null,
      submittedAt: a.submission?.submitted_at ?? null,
      workflowState: a.submission?.workflow_state ?? null,
    }));
    console.log(`  Assignments: ${assignments.length}`);

    // Submissions
    courseData.submissions = submissions.map((s) => ({
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
    console.log(`  Submissions: ${submissions.length}`);

    // Syllabus body (from course endpoint)
    if (syllabusInfo?.syllabus_body) {
      courseData.syllabusBody = syllabusInfo.syllabus_body
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      console.log(`  Syllabus body: found (${courseData.syllabusBody.length} chars)`);
    }

    // Files — find anything named "syllabus"
    courseData.files = files.map((f) => ({
      id: f.id,
      name: f.display_name || f.filename,
      size: f.size,
      contentType: f.content_type || f["content-type"],
      url: f.url,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    const syllabusFiles = files.filter((f) => {
      const name = (f.display_name || f.filename || "").toLowerCase();
      return name.includes("syllabus");
    });
    courseData.syllabusFiles = syllabusFiles.map((f) => ({
      id: f.id,
      name: f.display_name || f.filename,
      url: f.url,
      contentType: f.content_type || f["content-type"],
    }));
    if (syllabusFiles.length > 0) {
      console.log(`  Syllabus files found: ${syllabusFiles.map((f) => f.display_name || f.filename).join(", ")}`);
    }
    console.log(`  Total files: ${files.length}`);

    // Modules
    courseData.modules = modules.map((m) => ({
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
    console.log(`  Modules: ${modules.length}`);

    // Announcements
    courseData.announcements = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      postedAt: a.posted_at,
      message: a.message
        ? a.message.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)
        : null,
    }));
    console.log(`  Announcements: ${announcements.length}\n`);

    dump.courses.push(courseData);
  }

  return dump;
}

// Run standalone: `node canvas-client.js`
async function main() {
  const dump = await dumpAllData();

  // Write full dump to JSON file
  const fs = require("fs");
  const outPath = __dirname + "/canvas-dump.json";
  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2));
  console.log(`\n=== Full dump written to ${outPath} ===`);

  // Print grade summary
  console.log("\n=== GRADE SUMMARY ===");
  for (const c of dump.courses) {
    if (c.grades) {
      console.log(
        `  ${c.name}: ${c.grades.currentScore ?? "N/A"}% (${c.grades.currentGrade ?? "N/A"})`
      );
    } else {
      console.log(`  ${c.name}: no grade data`);
    }
  }

  // Print syllabus file summary
  console.log("\n=== SYLLABUS FILES FOUND ===");
  for (const c of dump.courses) {
    if (c.syllabusFiles.length > 0) {
      for (const f of c.syllabusFiles) {
        console.log(`  ${c.name}: ${f.name} (${f.url})`);
      }
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = {
  canvasFetch,
  canvasFetchAll,
  getCourses,
  getAssignments,
  getGrades,
  getSubmissions,
  getUpcoming,
  getCourseFiles,
  getModules,
  getAnnouncements,
  getSyllabus,
  getTodoItems,
  dumpAllData,
};
