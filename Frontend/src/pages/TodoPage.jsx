import { useMemo } from "react";
import { useData } from "../contexts/DataContext";
import "./TodoPage.css";

const DAY = 86400000;
const NOW = Date.now();

const COURSE_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#dc2626", "#db2777", "#0891b2", "#4f46e5",
];

function shortCode(course) {
  const src = course.code || course.name;
  const m = src.match(/[A-Z]{3}\d{3}/);
  return m ? m[0] : src.split(/[:\-–]/)[0].trim().slice(0, 12);
}

function relativeDate(iso) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - NOW;
  if (diff < -DAY) return `${Math.round(-diff / DAY)}d overdue`;
  if (diff < 0) return "Today";
  if (diff < DAY) return "Today";
  if (diff < 2 * DAY) return "Tomorrow";
  if (diff < 7 * DAY) return `In ${Math.round(diff / DAY)}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function absoluteDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupLabel(iso) {
  if (!iso) return "No due date";
  const diff = new Date(iso).getTime() - NOW;
  if (diff < 0) return "Overdue";
  if (diff < DAY) return "Due Today";
  if (diff < 7 * DAY) return "This Week";
  return "Later";
}

function groupOrder(label) {
  return { Overdue: 0, "Due Today": 1, "This Week": 2, Later: 3, "No due date": 4 }[label] ?? 5;
}

function urgencyClass(iso) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - NOW;
  if (diff < 0) return "overdue";
  if (diff < DAY) return "urgent";
  if (diff < 3 * DAY) return "soon";
  return "";
}

// Filter active courses (same logic as CoursesPage)
function isActiveCourse(course, todoIds) {
  const sixtyDaysAgo = NOW - 60 * DAY;
  const thirtyDaysAgo = NOW - 30 * DAY;
  return (
    course.assignments.some((a) => a.dueAt && new Date(a.dueAt).getTime() > sixtyDaysAgo) ||
    course.announcements.some((a) => a.postedAt && new Date(a.postedAt).getTime() > thirtyDaysAgo) ||
    todoIds.has(course.id)
  );
}

export default function TodoPage() {
  const { data } = useData();

  const { groups, totalCount } = useMemo(() => {
    if (!data) return { groups: [], totalCount: 0 };

    const todoIds = new Set(data.todo.map((t) => t.course_id));
    const colorMap = {};
    data.courses.forEach((c, i) => {
      colorMap[c.id] = COURSE_COLORS[i % COURSE_COLORS.length];
    });

    // Collect all items from active courses
    const items = [];
    for (const course of data.courses) {
      if (!isActiveCourse(course, todoIds)) continue;
      const code = shortCode(course);
      const color = colorMap[course.id];

      for (const a of course.assignments) {
        // Skip no-deadline, already graded, or fluff (0 pts + none submission)
        if (!a.dueAt) continue;
        if (a.workflowState === "graded") continue;

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
        });
      }
    }

    // Sort by due date
    items.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

    // Group
    const groupMap = {};
    for (const item of items) {
      if (!groupMap[item.group]) groupMap[item.group] = [];
      groupMap[item.group].push(item);
    }

    const sorted = Object.entries(groupMap).sort(
      ([a], [b]) => groupOrder(a) - groupOrder(b)
    );

    return { groups: sorted, totalCount: items.length };
  }, [data]);

  if (!data) return null;

  if (totalCount === 0) {
    return (
      <div className="page todo-page">
        <p className="todo-empty">Nothing due — you're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="page todo-page">
      {groups.map(([label, items]) => (
        <div key={label} className="todo-group">
          <div className={`todo-group-header ${label === "Overdue" ? "overdue" : ""}`}>
            <span className="todo-group-label">{label}</span>
            <span className="todo-group-count">{items.length}</span>
          </div>
          <ul className="todo-list">
            {items.map((item) => (
              <li key={item.id} className={`todo-item ${urgencyClass(item.dueAt)}`}>
                <span
                  className="todo-course-badge"
                  style={{ background: item.courseColor + "18", color: item.courseColor }}
                >
                  {item.courseCode}
                </span>
                <div className="todo-info">
                  <span className="todo-name">{item.name}</span>
                  <span className="todo-dates">
                    <span className={`todo-relative ${urgencyClass(item.dueAt)}`}>
                      {relativeDate(item.dueAt)}
                    </span>
                    <span className="todo-absolute">{absoluteDate(item.dueAt)}</span>
                  </span>
                </div>
                <span className={`todo-status ${item.submitted ? "submitted" : "pending"}`}>
                  {item.submitted ? "Submitted" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
