# Quercus++ Frontend Design Plan

## Architecture

```
App
├── TokenGate              — if no token in localStorage, show token entry modal
│                            validates token via /users/self/profile before proceeding
│
├── DataProvider (context)  — on mount: check localStorage for cached data
│   │                         if stale (>15min) or missing, call fetchAllCanvasData()
│   │                         stores result in localStorage + React context
│   │                         exposes: { data, loading, error, refresh }
│   │
│   ├── AppShell            — sidebar nav + header + content area
│   │   ├── Sidebar         — 4 tab icons + "Clear Token" button at bottom
│   │   ├── Header          — course name / page title + refresh button
│   │   └── <Page>          — routed content
│   │
│   ├── Pages:
│   │   ├── CoursesPage     — vertical list of active course cards
│   │   │   └── CourseCard  — expandable: deadlines, grades, announcements, actions needed
│   │   │
│   │   ├── TodoPage        — all upcoming deadlines across courses, sorted by due date
│   │   │                     urgency color coding: red <24h, yellow <3d, green >3d
│   │   │
│   │   ├── CalendarPage    — month/week view of deadlines as events
│   │   │                     optional: checkbox to add manual class schedule (localStorage)
│   │   │
│   │   └── AssistantPage   — chat UI, messages sent to backend /api/chat
│   │                         backend forwards to AWS Bedrock with canvas data as context
│   │                         30min inactivity timeout resets conversation
```

## Canvas API Proxy

Browsers block direct requests to `q.utoronto.ca` because UofT doesn't return CORS
headers. All Canvas API calls are therefore **proxied through our Express backend**.

Flow:
1. Token is stored **only in the frontend** (`localStorage.quercusToken`).
2. When the frontend needs Canvas data, it calls our backend (e.g. `POST /api/canvas`)
   and includes the token in the request body (or Authorization header).
3. The backend forwards the request to `q.utoronto.ca` server-side (no CORS issues),
   and returns the Canvas response to the frontend.
4. The backend **never persists** the token — it's used transiently per request.

In development, the Vite dev server proxies `/api/*` to the Express backend
(`localhost:3000`) so the frontend only ever talks to its own origin.

## State Management

- **No Redux / Zustand** — just React context + localStorage
- `DataContext` holds the full canvas data dump + loading/error state
- Each page reads from context and derives what it needs
- Token stored in `localStorage.quercusToken` (frontend only — never persisted on backend)
- Canvas data stored in `localStorage.quercusData` (JSON, with fetchedAt timestamp)
- Manual class schedule stored in `localStorage.quercusSchedule`
- AI conversation is ephemeral (backend manages, frontend just holds message list in component state)

## Routing

Using hash-based routing (no react-router needed — just a state variable for active tab).

4 tabs:
| Tab | Icon | Label | Path state |
|-----|------|-------|------------|
| Courses | BookOpen | Classes | `"courses"` |
| Todo | CheckSquare | To-Do | `"todo"` |
| Calendar | Calendar | Calendar | `"calendar"` |
| Assistant | MessageCircle | AI Chat | `"assistant"` |

## Active Course Filtering

A course is "active" if ANY of:
- Has an assignment with `dueAt` within the past 60 days or in the future
- Has an announcement posted within the past 30 days
- Is in the `todo` list

This filters out admin courses like "Building a Culture of Consent", "PUMP - Self Guided", etc.

## Course Card (CoursesPage) — Expanded View

When clicked, shows sections:

1. **Upcoming Deadlines** — assignments with `dueAt > now`, sorted chronologically
   - Show name, due date (relative: "in 2 days"), points, submission status
   - Highlight unsubmitted items

2. **Grades** — table of graded assignments
   - Name, score/pointsPossible, percentage
   - Running average at top (computed from scored items)
   - If `grades.currentScore` exists from API, show that instead

3. **Recent Announcements** — last 3-5, title + date + truncated message

4. **Action Needed** — combined view:
   - Unsubmitted assignments with approaching deadlines
   - Unread TA feedback (submissions with recent comments)
   - Missing items (`missing: true`)

5. **Syllabus** — two-tier display:
   - **Summary view (default)**: AI-extracted or heuristically parsed weight breakdown table showing category → weight % (e.g., "Assignments 30%, Midterm 25%, Final 45%"). Parse from `syllabusBody` by looking for patterns like "worth X%", "X% of your final grade", weight tables. If unparseable, show "Syllabus available — expand to view".
   - **Full view (on expand)**: the complete `syllabusBody` text, rendered in a scrollable container with preserved formatting.
   - If `syllabusBody` is null or just links (< 100 chars), show `syllabusFiles` download links instead.
   - The weight breakdown is critical for grade analytics — it feeds "what do I need on the final" calculations both in the Grades section and in the AI assistant.

## Todo Page

- Aggregated from all active courses
- Each item: course code badge, assignment name, due date (relative + absolute), status chip
- Sort by due date ascending
- Group: "Overdue", "Due Today", "This Week", "Later"
- Items link to Quercus submission page (`html_url` from todo items)

## Calendar Page

- Month view default, week view toggle
- Events = all assignments with `dueAt` + upcoming calendar events
- Color-coded by course (auto-assign from a palette)
- Click event → popover with details
- "Add Class Schedule" checkbox → modal to input recurring weekly times

## AI Assistant Page

- Chat bubble UI (user messages right, assistant left)
- Text input at bottom with send button
- On first message: POST to backend `/api/chat` with `{ message, canvasData }` (send full data as context on first message only)
- Subsequent messages: POST with `{ message, sessionId }`
- Loading indicator while waiting for response
- "New Conversation" button

## Visual Design

- Clean, modern, slightly academic feel
- Dark mode support (already in CSS variables)
- Sidebar: narrow (64px icons-only on desktop, bottom tab bar on mobile)
- Content area: max-width 900px, centered
- Cards: subtle border, slight shadow on hover
- Color palette for courses: 8 distinct muted colors, assigned by index
- Typography: system fonts (already set), clear hierarchy

## Component File Structure

```
src/
  main.jsx
  App.jsx                  — TokenGate + DataProvider + AppShell
  App.css                  — global app layout styles
  index.css                — reset + CSS variables (keep existing)
  services/
    canvasApi.js           — (already created)
  contexts/
    DataContext.jsx         — React context for canvas data
  components/
    TokenEntry.jsx         — token input modal
    Sidebar.jsx            — navigation sidebar
    Header.jsx             — page header with title + refresh
  pages/
    CoursesPage.jsx        — course list with expandable cards
    TodoPage.jsx           — aggregated to-do list
    CalendarPage.jsx       — calendar view
    AssistantPage.jsx      — AI chat interface
```
