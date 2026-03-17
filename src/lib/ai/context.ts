import type { CanvasData } from "@/lib/types";

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function ts(iso?: string | null) {
  return iso ? new Date(iso).getTime() : 0;
}

function isActiveCourse(course: any, now: number) {
  const sixtyAgo = now - SIXTY_DAYS_MS;
  const thirtyAgo = now - THIRTY_DAYS_MS;

  const hasRecentAssignment = course.assignments?.some(
    (a: any) => a.dueAt && ts(a.dueAt) > sixtyAgo,
  );
  const hasRecentAnnouncement = course.announcements?.some(
    (a: any) => a.postedAt && ts(a.postedAt) > thirtyAgo,
  );
  return hasRecentAssignment || hasRecentAnnouncement;
}

export function trimForAI(fullData: CanvasData) {
  const now = Date.now();
  const twelveAgo = now - TWELVE_WEEKS_MS;
  const fourAgo = now - FOUR_WEEKS_MS;

  const result: any = { courses: [], upcoming: [], todo: [] };

  for (const c of fullData.courses || []) {
    if (!isActiveCourse(c, now)) continue;

    const course: any = {
      name: c.name,
      code: c.code,
    };

    if (c.grades && c.grades.currentScore != null) {
      course.grades = {
        currentScore: c.grades.currentScore,
        currentGrade: c.grades.currentGrade,
      };
    }

    course.assignments = (c.assignments || [])
      .filter((a: any) => !a.dueAt || ts(a.dueAt) > twelveAgo)
      .map((a: any) => {
        const entry: any = {
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

    course.gradedWork = (c.submissions || [])
      .filter((s: any) => s.score != null)
      .map((s: any) => {
        const entry: any = {
          name: s.assignmentName,
          score: s.score,
          outOf: s.pointsPossible,
        };
        if (s.comments && s.comments.length > 0) {
          entry.feedback = s.comments[s.comments.length - 1].comment.slice(
            0,
            150,
          );
        }
        return entry;
      });

    course.announcements = (c.announcements || [])
      .filter((a: any) => a.postedAt && ts(a.postedAt) > fourAgo)
      .map((a: any) => ({
        title: a.title,
        date: a.postedAt?.slice(0, 10),
        message: (a.message || "").slice(0, 200),
      }));

    if (c.syllabusBody && c.syllabusBody.length > 0) {
      course.syllabus = c.syllabusBody.slice(0, 4000);
    }

    if (c.syllabusSummary) {
      course.syllabusSummary = c.syllabusSummary;
    }
    if (c.syllabusWeights && c.syllabusWeights.length > 0) {
      course.syllabusWeights = c.syllabusWeights;
    }

    result.courses.push(course);
  }

  result.upcoming = (fullData.upcoming || []).map((e: any) => ({
    title: e.title,
    start: e.start_at,
    course: (e.context_name || "").slice(0, 30),
  }));

  result.todo = (fullData.todo || []).map((t: any) => ({
    course: (t.context_name || "").slice(0, 30),
    assignment: t.assignment?.name,
    due: t.assignment?.due_at,
  }));

  return result;
}
