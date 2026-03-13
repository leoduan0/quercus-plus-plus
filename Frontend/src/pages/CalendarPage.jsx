import { useState, useMemo, useCallback } from "react";
import { useData } from "../contexts/DataContext";
import "./CalendarPage.css";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_MS = 86400000;
const VIEWS = ["month", "week", "day"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COURSE_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#dc2626", "#db2777", "#0891b2", "#4f46e5",
];

// ---------------------------------------------------------------------------
// LLM placeholder for extracting lecture/tutorial times
// ---------------------------------------------------------------------------

/**
 * TODO: LLM FEATURE — Extract lecture/tutorial schedule from course data.
 *
 * Prompt idea: Given the course name, syllabusBody, announcements, and module
 * titles, extract a recurring weekly schedule. Look for patterns like:
 * - "Lectures: Mon/Wed 1-2pm, BA 1180"
 * - "Tutorial: Fri 10-11am"
 * - Module titles containing days/times
 *
 * Return as: [{ day: 0-6, startHour: 13, startMin: 0, endHour: 14, endMin: 0,
 *              label: "CSC111 Lecture", location: "BA 1180" }, ...]
 *
 * For now, returns empty — no class times extracted.
 */
async function extractClassSchedule(/* courses */) {
  return [];
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d) {
  const s = startOfDay(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHour(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// ---------------------------------------------------------------------------
// Build calendar events from data
// ---------------------------------------------------------------------------

function buildEvents(data, courseColorMap) {
  const events = [];

  // Assignment deadlines from all courses
  for (const course of data.courses) {
    const color = courseColorMap[course.id] || "#6b7280";
    const code = shortCode(course);

    for (const a of course.assignments) {
      if (!a.dueAt) continue;
      events.push({
        id: `asgn-${a.id}`,
        title: a.name,
        courseCode: code,
        start: new Date(a.dueAt),
        type: "deadline",
        color,
        detail: `${a.pointsPossible > 0 ? a.pointsPossible + " pts" : ""} ${a.workflowState === "graded" ? "— Graded" : a.submittedAt ? "— Submitted" : ""}`.trim(),
      });
    }
  }

  // Upcoming calendar events (office hours, etc.)
  for (const ev of data.upcoming || []) {
    if (ev.type !== "event") continue;
    const courseId = ev.context_code?.replace("course_", "");
    const color = courseColorMap[courseId] || "#6b7280";
    events.push({
      id: `event-${ev.id}`,
      title: ev.title,
      courseCode: ev.context_name?.match(/[A-Z]{3}\d{3}/)?.[0] || "",
      start: new Date(ev.start_at),
      end: ev.end_at ? new Date(ev.end_at) : null,
      type: "event",
      color,
      detail: ev.location_name || "",
    });
  }

  return events;
}

function shortCode(course) {
  const src = course.code || course.name;
  const m = src.match(/[A-Z]{3}\d{3}/);
  return m ? m[0] : src.split(/[:\-–]/)[0].trim().slice(0, 12);
}

// ---------------------------------------------------------------------------
// Event popover
// ---------------------------------------------------------------------------

function EventPopover({ event, onClose }) {
  return (
    <div className="event-popover" onClick={(e) => e.stopPropagation()}>
      <div className="popover-header" style={{ borderColor: event.color }}>
        <span className="popover-code" style={{ color: event.color }}>
          {event.courseCode}
        </span>
        <button className="popover-close" onClick={onClose}>×</button>
      </div>
      <div className="popover-title">{event.title}</div>
      <div className="popover-time">{formatTime(event.start)}</div>
      {event.detail && <div className="popover-detail">{event.detail}</div>}
      <div className="popover-type">
        {event.type === "deadline" ? "Assignment deadline" : "Calendar event"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------

function MonthView({ date, events, onSelect, selectedEvent, onEventClose }) {
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);

  // Build 6 weeks of days (42 cells)
  const days = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(gridStart, i));
  }

  const today = startOfDay(new Date());

  return (
    <div className="month-grid">
      {DAY_NAMES.map((d) => (
        <div key={d} className="month-day-header">{d}</div>
      ))}
      {days.map((day, i) => {
        const isCurrentMonth = day.getMonth() === date.getMonth();
        const isToday = isSameDay(day, today);
        const dayEvents = events.filter((e) => isSameDay(e.start, day));

        return (
          <div
            key={i}
            className={`month-cell ${isCurrentMonth ? "" : "other-month"} ${isToday ? "today" : ""}`}
          >
            <span className={`month-date ${isToday ? "today-badge" : ""}`}>
              {day.getDate()}
            </span>
            <div className="month-events">
              {dayEvents.slice(0, 3).map((ev) => (
                <button
                  key={ev.id}
                  className="month-event"
                  style={{ background: ev.color + "18", color: ev.color }}
                  onClick={() => onSelect(ev)}
                >
                  <span className="month-event-dot" style={{ background: ev.color }} />
                  <span className="month-event-label">{ev.title}</span>
                </button>
              ))}
              {dayEvents.length > 3 && (
                <span className="month-more">+{dayEvents.length - 3} more</span>
              )}
            </div>
            {selectedEvent && isSameDay(selectedEvent.start, day) && (
              <EventPopover event={selectedEvent} onClose={onEventClose} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week view
// ---------------------------------------------------------------------------

function WeekView({ date, events, onSelect, selectedEvent, onEventClose }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7am - 10pm

  return (
    <div className="week-grid">
      {/* Header row */}
      <div className="week-time-header" />
      {days.map((day, i) => (
        <div
          key={i}
          className={`week-day-header ${isSameDay(day, today) ? "today" : ""}`}
        >
          <span className="week-day-name">{DAY_NAMES[day.getDay()]}</span>
          <span className={`week-day-num ${isSameDay(day, today) ? "today-badge" : ""}`}>
            {day.getDate()}
          </span>
        </div>
      ))}

      {/* Hour rows */}
      {hours.map((h) => (
        <div key={h} className="week-row" style={{ gridRow: h - 7 + 2 }}>
          <div className="week-time-label">{formatHour(h)}</div>
          {days.map((day, di) => {
            const dayEvents = events.filter((e) => {
              if (!isSameDay(e.start, day)) return false;
              return e.start.getHours() === h;
            });

            return (
              <div key={di} className="week-cell">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    className="week-event"
                    style={{ background: ev.color + "20", borderLeftColor: ev.color }}
                    onClick={() => onSelect(ev)}
                  >
                    <span className="week-event-time" style={{ color: ev.color }}>
                      {formatTime(ev.start)}
                    </span>
                    <span className="week-event-title">{ev.title}</span>
                  </button>
                ))}
                {selectedEvent &&
                  isSameDay(selectedEvent.start, day) &&
                  selectedEvent.start.getHours() === h && (
                    <EventPopover event={selectedEvent} onClose={onEventClose} />
                  )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day view
// ---------------------------------------------------------------------------

function DayView({ date, events, onSelect, selectedEvent, onEventClose }) {
  const today = startOfDay(new Date());
  const isToday = isSameDay(date, today);
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);

  const dayEvents = events.filter((e) => isSameDay(e.start, date));

  return (
    <div className="day-grid">
      <div className={`day-header ${isToday ? "today" : ""}`}>
        <span className="day-header-name">{DAY_NAMES[date.getDay()]}</span>
        <span className={`day-header-num ${isToday ? "today-badge" : ""}`}>
          {date.getDate()}
        </span>
        <span className="day-header-month">
          {MONTH_NAMES[date.getMonth()]} {date.getFullYear()}
        </span>
      </div>
      {hours.map((h) => {
        const hourEvents = dayEvents.filter((e) => e.start.getHours() === h);
        return (
          <div key={h} className="day-row">
            <div className="day-time-label">{formatHour(h)}</div>
            <div className="day-cell">
              {hourEvents.map((ev) => (
                <button
                  key={ev.id}
                  className="day-event"
                  style={{ background: ev.color + "20", borderLeftColor: ev.color }}
                  onClick={() => onSelect(ev)}
                >
                  <span className="day-event-time" style={{ color: ev.color }}>
                    {formatTime(ev.start)}
                  </span>
                  <span className="day-event-code">{ev.courseCode}</span>
                  <span className="day-event-title">{ev.title}</span>
                  {ev.detail && <span className="day-event-detail">{ev.detail}</span>}
                </button>
              ))}
              {selectedEvent && selectedEvent.start.getHours() === h && isSameDay(selectedEvent.start, date) && (
                <EventPopover event={selectedEvent} onClose={onEventClose} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const { data } = useData();
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());
  const [showClassTimes, setShowClassTimes] = useState(false);
  const [classSchedule, setClassSchedule] = useState([]); // populated by LLM placeholder
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Build course → color map
  const courseColorMap = useMemo(() => {
    if (!data) return {};
    const map = {};
    data.courses.forEach((c, i) => {
      map[c.id] = COURSE_COLORS[i % COURSE_COLORS.length];
    });
    return map;
  }, [data]);

  // Build events
  const events = useMemo(() => {
    if (!data) return [];
    const base = buildEvents(data, courseColorMap);

    // Add class schedule events if toggled on
    if (showClassTimes && classSchedule.length > 0) {
      // Generate recurring events for the visible range
      // Each classSchedule item: { day, startHour, startMin, endHour, endMin, label, color }
      const rangeStart = view === "month" ? startOfMonth(date) : view === "week" ? startOfWeek(date) : startOfDay(date);
      const rangeDays = view === "month" ? 42 : view === "week" ? 7 : 1;

      for (let i = 0; i < rangeDays; i++) {
        const d = addDays(rangeStart, i);
        for (const cls of classSchedule) {
          if (d.getDay() === cls.day) {
            const start = new Date(d);
            start.setHours(cls.startHour, cls.startMin, 0, 0);
            base.push({
              id: `class-${cls.label}-${i}`,
              title: cls.label,
              courseCode: cls.label.split(" ")[0] || "",
              start,
              type: "class",
              color: cls.color || "#6b7280",
              detail: cls.location || "",
            });
          }
        }
      }
    }

    return base.sort((a, b) => a.start - b.start);
  }, [data, courseColorMap, showClassTimes, classSchedule, view, date]);

  // Navigation
  const navigate = useCallback(
    (dir) => {
      setSelectedEvent(null);
      setDate((d) => {
        const n = new Date(d);
        if (view === "month") n.setMonth(n.getMonth() + dir);
        else if (view === "week") n.setDate(n.getDate() + 7 * dir);
        else n.setDate(n.getDate() + dir);
        return n;
      });
    },
    [view]
  );

  const goToday = useCallback(() => {
    setSelectedEvent(null);
    setDate(new Date());
  }, []);

  // Toggle class times (triggers LLM extraction)
  const handleClassToggle = useCallback(async () => {
    if (!showClassTimes && classSchedule.length === 0 && data) {
      // Try to extract schedule via LLM placeholder
      const schedule = await extractClassSchedule(data.courses);
      setClassSchedule(schedule);
    }
    setShowClassTimes((v) => !v);
  }, [showClassTimes, classSchedule, data]);

  if (!data) return null;

  // Title string
  let title = "";
  if (view === "month") {
    title = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  } else if (view === "week") {
    const ws = startOfWeek(date);
    const we = addDays(ws, 6);
    title = `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  } else {
    title = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="page calendar-page">
      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => navigate(-1)}>‹</button>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <button className="cal-nav-btn" onClick={() => navigate(1)}>›</button>
          <h3 className="cal-title">{title}</h3>
        </div>
        <div className="cal-controls">
          <label className="cal-class-toggle">
            <input
              type="checkbox"
              checked={showClassTimes}
              onChange={handleClassToggle}
            />
            <span>Show class times</span>
          </label>
          <div className="cal-view-switcher">
            {VIEWS.map((v) => (
              <button
                key={v}
                className={`cal-view-btn ${view === v ? "active" : ""}`}
                onClick={() => { setView(v); setSelectedEvent(null); }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View */}
      {view === "month" && (
        <MonthView
          date={date}
          events={events}
          onSelect={setSelectedEvent}
          selectedEvent={selectedEvent}
          onEventClose={() => setSelectedEvent(null)}
        />
      )}
      {view === "week" && (
        <WeekView
          date={date}
          events={events}
          onSelect={setSelectedEvent}
          selectedEvent={selectedEvent}
          onEventClose={() => setSelectedEvent(null)}
        />
      )}
      {view === "day" && (
        <DayView
          date={date}
          events={events}
          onSelect={setSelectedEvent}
          selectedEvent={selectedEvent}
          onEventClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
