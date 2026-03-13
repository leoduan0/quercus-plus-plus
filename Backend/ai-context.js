/**
 * Trims the full Canvas data dump into a compact context for the AI assistant.
 * Strips useless fields, old data, and caps text to stay under ~50KB.
 *
 * Does NOT modify the original data — returns a new object.
 */

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function ts(iso) {
  return iso ? new Date(iso).getTime() : 0;
}

function isActiveCourse(course, now) {
  const sixtyAgo = now - SIXTY_DAYS_MS;
  const thirtyAgo = now - THIRTY_DAYS_MS;

  const hasRecentAssignment = course.assignments?.some(
    (a) => a.dueAt && ts(a.dueAt) > sixtyAgo
  );
  const hasRecentAnnouncement = course.announcements?.some(
    (a) => a.postedAt && ts(a.postedAt) > thirtyAgo
  );
  return hasRecentAssignment || hasRecentAnnouncement;
}

function trimForAI(fullData) {
  const now = Date.now();
  const twelveAgo = now - TWELVE_WEEKS_MS;
  const fourAgo = now - FOUR_WEEKS_MS;

  const result = { courses: [], upcoming: [], todo: [] };

  for (const c of fullData.courses || []) {
    if (!isActiveCourse(c, now)) continue;

    const course = {
      name: c.name,
      code: c.code,
    };

    // Grades — only if Canvas actually returned them
    if (c.grades && c.grades.currentScore != null) {
      course.grades = {
        currentScore: c.grades.currentScore,
        currentGrade: c.grades.currentGrade,
      };
    }

    // Assignments — drop old ones, strip to essentials
    course.assignments = (c.assignments || [])
      .filter((a) => !a.dueAt || ts(a.dueAt) > twelveAgo)
      .map((a) => {
        const entry = {
          name: a.name,
          dueAt: a.dueAt,
          pointsPossible: a.pointsPossible,
        };
        if (a.score != null) entry.score = a.score;
        if (a.grade != null) entry.grade = a.grade;
        if (a.submittedAt) entry.submitted = true;
        if (a.description) entry.description = a.description.slice(0, 200);
        return entry;
      });

    // Submissions — only graded, minimal
    course.gradedWork = (c.submissions || [])
      .filter((s) => s.score != null)
      .map((s) => {
        const entry = {
          name: s.assignmentName,
          score: s.score,
          outOf: s.pointsPossible,
        };
        if (s.comments && s.comments.length > 0) {
          entry.feedback = s.comments[s.comments.length - 1].comment.slice(0, 150);
        }
        return entry;
      });

    // Announcements — recent only, truncated
    course.announcements = (c.announcements || [])
      .filter((a) => a.postedAt && ts(a.postedAt) > fourAgo)
      .map((a) => ({
        title: a.title,
        date: a.postedAt?.slice(0, 10),
        message: (a.message || "").slice(0, 200),
      }));

    // Syllabus — cap at 2000 chars (enough for weight breakdowns)
    if (c.syllabusBody && c.syllabusBody.length > 0) {
      course.syllabus = c.syllabusBody.slice(0, 2000);
    }

    result.courses.push(course);
  }

  // Upcoming events — minimal
  result.upcoming = (fullData.upcoming || []).map((e) => ({
    title: e.title,
    start: e.start_at,
    course: (e.context_name || "").slice(0, 30),
  }));

  // Todo — minimal
  result.todo = (fullData.todo || []).map((t) => ({
    course: (t.context_name || "").slice(0, 30),
    assignment: t.assignment?.name,
    due: t.assignment?.due_at,
  }));

  return result;
}

module.exports = { trimForAI };
