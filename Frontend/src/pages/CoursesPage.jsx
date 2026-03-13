import { useState, useMemo } from "react";
import { useData } from "../contexts/DataContext";
import "./CoursesPage.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COURSE_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#dc2626", "#db2777", "#0891b2", "#4f46e5",
];

function colorFor(index) {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

/** Extract a short code like "CSC111" from the verbose Canvas course name/code. */
function shortCode(course) {
  const src = course.code || course.name;
  const m = src.match(/[A-Z]{3}\d{3}/);
  return m ? m[0] : src.split(/[:\-–]/)[0].trim().slice(0, 16);
}

/** Friendly course title (part after the colon, or the name). */
function courseTitle(course) {
  const parts = course.name.split(":");
  return parts.length > 1 ? parts.slice(1).join(":").trim() : course.name;
}

const NOW = Date.now();
const DAY = 86400000;

function relativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = d.getTime() - NOW;
  if (diff < -DAY) {
    const days = Math.round(-diff / DAY);
    return `${days}d ago`;
  }
  if (diff < 0) return "Today";
  if (diff < DAY) return "Today";
  if (diff < 2 * DAY) return "Tomorrow";
  if (diff < 7 * DAY) return `In ${Math.round(diff / DAY)}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function urgencyClass(iso) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - NOW;
  if (diff < 0) return "overdue";
  if (diff < DAY) return "urgent";
  if (diff < 3 * DAY) return "soon";
  return "";
}

function pct(score, possible) {
  if (score == null || !possible) return null;
  return Math.round((score / possible) * 100);
}

// ---------------------------------------------------------------------------
// Active course filter
// ---------------------------------------------------------------------------

function isActiveCourse(course, todoIds) {
  const sixtyDaysAgo = NOW - 60 * DAY;
  const thirtyDaysAgo = NOW - 30 * DAY;

  const hasRecentAssignment = course.assignments.some(
    (a) => a.dueAt && new Date(a.dueAt).getTime() > sixtyDaysAgo
  );
  const hasRecentAnnouncement = course.announcements.some(
    (a) => a.postedAt && new Date(a.postedAt).getTime() > thirtyDaysAgo
  );
  const inTodo = todoIds.has(course.id);

  return hasRecentAssignment || hasRecentAnnouncement || inTodo;
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function UpcomingDeadlines({ assignments }) {
  const upcoming = assignments
    .filter((a) => a.dueAt && new Date(a.dueAt).getTime() > NOW)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  if (upcoming.length === 0) return <p className="section-empty">No upcoming deadlines.</p>;

  return (
    <ul className="deadline-list">
      {upcoming.map((a) => (
        <li key={a.id} className={`deadline-item ${urgencyClass(a.dueAt)}`}>
          <div className="deadline-info">
            <span className="deadline-name">{a.name}</span>
            {a.pointsPossible > 0 && (
              <span className="deadline-pts">{a.pointsPossible} pts</span>
            )}
          </div>
          <div className="deadline-meta">
            <span className={`deadline-due ${urgencyClass(a.dueAt)}`}>
              {relativeDate(a.dueAt)}
            </span>
            <span className={`status-chip ${a.workflowState}`}>
              {a.workflowState === "graded"
                ? "Submitted"
                : a.submittedAt
                  ? "Submitted"
                  : "Not submitted"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function GradesSection({ course }) {
  const { grades, submissions } = course;

  // Use API grade if available
  const apiScore = grades?.currentScore;

  // Compute from submissions
  const graded = submissions.filter(
    (s) => s.score != null && s.pointsPossible > 0
  );
  graded.sort((a, b) => new Date(a.gradedAt || 0) - new Date(b.gradedAt || 0));

  const totalScore = graded.reduce((sum, s) => sum + s.score, 0);
  const totalPossible = graded.reduce((sum, s) => sum + s.pointsPossible, 0);
  const computedAvg = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : null;

  const displayAvg = apiScore ?? computedAvg;

  if (graded.length === 0 && displayAvg == null) {
    return <p className="section-empty">No grades yet.</p>;
  }

  return (
    <div className="grades-section">
      {displayAvg != null && (
        <div className="grade-avg">
          <span className="grade-avg-number">{displayAvg}%</span>
          <span className="grade-avg-label">
            {apiScore != null ? "Current grade" : `Across ${graded.length} graded items`}
          </span>
        </div>
      )}
      {graded.length > 0 && (
        <table className="grades-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Score</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {graded.map((s) => (
              <tr key={s.assignmentId}>
                <td>{s.assignmentName}</td>
                <td>
                  {s.score}/{s.pointsPossible}
                </td>
                <td>{pct(s.score, s.pointsPossible)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AnnouncementsSection({ announcements }) {
  const recent = announcements
    .slice()
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
    .slice(0, 5);

  if (recent.length === 0) return <p className="section-empty">No announcements.</p>;

  return (
    <ul className="announcement-list">
      {recent.map((a) => (
        <li key={a.id} className="announcement-item">
          <div className="announcement-header">
            <span className="announcement-title">{a.title}</span>
            <span className="announcement-date">
              {new Date(a.postedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {a.message && (
            <p className="announcement-body">{a.message.slice(0, 200)}{a.message.length > 200 ? "…" : ""}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function ActionNeeded({ course }) {
  const items = [];

  // Unsubmitted assignments with approaching deadlines
  for (const a of course.assignments) {
    if (
      a.dueAt &&
      new Date(a.dueAt).getTime() > NOW &&
      a.workflowState !== "graded" &&
      !a.submittedAt
    ) {
      items.push({
        id: `unsub-${a.id}`,
        type: "unsubmitted",
        text: a.name,
        detail: `Due ${relativeDate(a.dueAt)}`,
        urgency: urgencyClass(a.dueAt),
      });
    }
  }

  // Missing items
  for (const s of course.submissions) {
    if (s.missing) {
      items.push({
        id: `miss-${s.assignmentId}`,
        type: "missing",
        text: s.assignmentName,
        detail: "Missing",
        urgency: "overdue",
      });
    }
  }

  // Recent TA feedback (graded in last 7 days with comments)
  const weekAgo = NOW - 7 * DAY;
  for (const s of course.submissions) {
    if (
      s.comments.length > 0 &&
      s.gradedAt &&
      new Date(s.gradedAt).getTime() > weekAgo
    ) {
      items.push({
        id: `fb-${s.assignmentId}`,
        type: "feedback",
        text: s.assignmentName,
        detail: `Feedback from ${s.comments[s.comments.length - 1].author}`,
        urgency: "",
      });
    }
  }

  if (items.length === 0) return <p className="section-empty">All caught up!</p>;

  return (
    <ul className="action-list">
      {items.map((item) => (
        <li key={item.id} className={`action-item ${item.urgency}`}>
          <span className={`action-badge ${item.type}`}>
            {item.type === "unsubmitted"
              ? "To Do"
              : item.type === "missing"
                ? "Missing"
                : "Feedback"}
          </span>
          <span className="action-text">{item.text}</span>
          <span className="action-detail">{item.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function SyllabusSection({ course }) {
  const [expanded, setExpanded] = useState(false);
  const { syllabusBody, syllabusFiles } = course;

  const hasBody = syllabusBody && syllabusBody.length > 100;
  const hasFiles = syllabusFiles && syllabusFiles.length > 0;

  if (!hasBody && !hasFiles) {
    return <p className="section-empty">No syllabus available.</p>;
  }

  return (
    <div className="syllabus-section">
      {/* --- Weight summary placeholder (LLM-extracted) --- */}
      <div className="syllabus-summary-placeholder">
        {/*
          TODO: LLM FEATURE — Syllabus weight extraction

          Prompt idea: Given the syllabusBody text, extract a structured weight
          breakdown table. Look for patterns like:
          - "Assignments: 30%", "worth 25% of your final grade"
          - Tabular weight data (category | weight)
          - "Final exam: 40%"

          Return as: [{ category: "Assignments", weight: 30 }, ...]

          Display as a simple table: Category | Weight %
          This data also feeds the "what do I need on the final" calculator
          in the Grades section and the AI assistant.

          For now, show a placeholder indicating the syllabus is available.
        */}
        <p className="syllabus-hint">
          Syllabus available — expand to view full text.
          {/* Replace with weight breakdown table when LLM extraction is wired. */}
        </p>
      </div>

      {/* --- Syllabus files (for link-only syllabi) --- */}
      {hasFiles && (
        <div className="syllabus-files">
          {syllabusFiles.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="syllabus-file-link"
            >
              {f.name}
            </a>
          ))}
        </div>
      )}

      {/* --- Full syllabus body (expandable) --- */}
      {hasBody && (
        <>
          <button
            className="syllabus-toggle"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse full syllabus" : "Show full syllabus"}
          </button>
          {expanded && (
            <div className="syllabus-full">{syllabusBody}</div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Course card
// ---------------------------------------------------------------------------

function CourseCard({ course, index }) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("deadlines");
  const color = colorFor(index);

  const sections = [
    { id: "deadlines", label: "Deadlines" },
    { id: "grades", label: "Grades" },
    { id: "announcements", label: "Announcements" },
    { id: "actions", label: "Action Needed" },
    { id: "syllabus", label: "Syllabus" },
  ];

  // Count action items for badge
  const actionCount = useMemo(() => {
    let count = 0;
    for (const a of course.assignments) {
      if (a.dueAt && new Date(a.dueAt).getTime() > NOW && !a.submittedAt && a.workflowState !== "graded") count++;
    }
    for (const s of course.submissions) {
      if (s.missing) count++;
    }
    return count;
  }, [course]);

  const upcomingCount = course.assignments.filter(
    (a) => a.dueAt && new Date(a.dueAt).getTime() > NOW
  ).length;

  const gradedCount = course.submissions.filter(
    (s) => s.score != null && s.pointsPossible > 0
  ).length;

  return (
    <div className="course-card" style={{ "--course-color": color }}>
      <button className="course-card-header" onClick={() => setOpen((o) => !o)}>
        <div className="course-card-color" />
        <div className="course-card-info">
          <span className="course-code">{shortCode(course)}</span>
          <span className="course-title">{courseTitle(course)}</span>
        </div>
        <div className="course-card-badges">
          {upcomingCount > 0 && (
            <span className="badge badge-upcoming">{upcomingCount} due</span>
          )}
          {actionCount > 0 && (
            <span className="badge badge-action">{actionCount} action</span>
          )}
          {gradedCount > 0 && (
            <span className="badge badge-graded">{gradedCount} graded</span>
          )}
        </div>
        <span className={`course-card-arrow ${open ? "open" : ""}`}>&#9662;</span>
      </button>

      {open && (
        <div className="course-card-body">
          <div className="section-tabs">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`section-tab ${activeSection === s.id ? "active" : ""}`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="section-content">
            {activeSection === "deadlines" && (
              <UpcomingDeadlines assignments={course.assignments} />
            )}
            {activeSection === "grades" && <GradesSection course={course} />}
            {activeSection === "announcements" && (
              <AnnouncementsSection announcements={course.announcements} />
            )}
            {activeSection === "actions" && <ActionNeeded course={course} />}
            {activeSection === "syllabus" && <SyllabusSection course={course} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CoursesPage() {
  const { data } = useData();
  if (!data) return null;

  const todoIds = useMemo(
    () => new Set(data.todo.map((t) => t.course_id)),
    [data.todo]
  );

  const active = useMemo(
    () => data.courses.filter((c) => isActiveCourse(c, todoIds)),
    [data.courses, todoIds]
  );

  return (
    <div className="page courses-page">
      {active.length === 0 ? (
        <p className="section-empty">No active courses found.</p>
      ) : (
        active.map((course, i) => (
          <CourseCard key={course.id} course={course} index={i} />
        ))
      )}
    </div>
  );
}
