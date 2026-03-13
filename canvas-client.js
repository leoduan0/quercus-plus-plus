// it's CANVA_API_KEY, not CANVAS_API_KEY!
const API_KEY = process.env.CANVA_API_KEY;
const BASE = process.env.CANVAS_BASE_URL || "https://q.utoronto.ca/api/v1";

if (!API_KEY) {
  console.error("Set CANVA_API_KEY in your environment first!");
  process.exit(1);
}

async function canvasFetch(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Canvas API ${res.status}: ${endpoint} - ${await res.text()}`);
  }
  return res.json();
}

async function getCourses() {
  return canvasFetch("/courses?enrollment_state=active&per_page=50");
}

async function getAssignments(courseId) {
  return canvasFetch(`/courses/${courseId}/assignments?per_page=50&order_by=due_at`);
}

async function getGrades(courseId) {
  return canvasFetch(`/courses/${courseId}/enrollments?type[]=StudentEnrollment&user_id=self`);
}

async function getUpcoming() {
  return canvasFetch("/users/self/upcoming_events?per_page=20");
}

// Run standalone: `node canvas-client.js`
async function main() {
  console.log("Fetching your Canvas data...\n");

  const courses = await getCourses();
  console.log(`Found ${courses.length} active courses:`);
  courses.forEach((c) => console.log(`  - [${c.id}] ${c.name}`));

  for (const course of courses.slice(0, 3)) {
    console.log(`\n--- ${course.name} ---`);

    const assignments = await getAssignments(course.id);
    console.log(`  Assignments (${assignments.length}):`);
    assignments.slice(0, 5).forEach((a) => {
      console.log(`    ${a.name} | due: ${a.due_at || "no due date"} | pts: ${a.points_possible}`);
    });

    const grades = await getGrades(course.id);
    if (grades.length > 0 && grades[0].grades) {
      const g = grades[0].grades;
      console.log(`  Current grade: ${g.current_score ?? "N/A"}% (${g.current_grade ?? "N/A"})`);
    }
  }

  console.log("\nUpcoming events:");
  const events = await getUpcoming();
  events.slice(0, 10).forEach((e) => {
    console.log(`  ${e.title} | ${e.start_at || "no date"}`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = { canvasFetch, getCourses, getAssignments, getGrades, getUpcoming };
