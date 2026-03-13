# Canvas Data Schema — Quercus++

This documents the shape of data we fetch from the Canvas LMS REST API (UofT's Quercus).
All data is fetched client-side using the user's personal API token.

Base URL: `https://q.utoronto.ca/api/v1`

---

## Top-Level Structure

```json
{
  "fetchedAt": "ISO8601 timestamp",
  "courses": [ Course, ... ],
  "upcoming": [ UpcomingEvent, ... ],
  "todo": [ TodoItem, ... ]
}
```

---

## Course

Fetched from `GET /courses?enrollment_state=active&per_page=100`

```json
{
  "id": 418277,                          // number — unique course ID, used in all sub-requests
  "name": "CSC111H1S 20261 (All Sections): Foundations of Computer Science II",  // string
  "code": "CSC111H1S_20261",             // string — short course code
  "term": 282,                           // number — enrollment_term_id (not very useful)
  "startAt": "ISO8601" | null,           // usually null for UofT courses
  "endAt": "ISO8601" | null,             // usually null for UofT courses
  "grades": Grades | {},                 // see Grades below — often empty {}
  "assignments": [ Assignment, ... ],
  "submissions": [ Submission, ... ],
  "syllabusBody": "string" | null,       // plain text (HTML stripped), can be very long (27k+ chars)
  "syllabusFiles": [ SyllabusFile, ... ],// files with "syllabus" in the name
  "modules": [ Module, ... ],
  "announcements": [ Announcement, ... ],
  "files": [ File, ... ]
}
```

### Filtering Active Courses

Many courses are admin/orientation pages (e.g., "Building a Culture of Consent", "PUMP - Self Guided"). To identify **real, current courses**, use:
- Has assignments with `dueAt` in the last ~60 days or upcoming
- OR has announcements posted in the last ~30 days
- AND is not a known non-course pattern (no assignments with due dates at all + name doesn't match typical course codes like `XXX###`)

---

## Grades

Fetched from `GET /courses/:id/enrollments?type[]=StudentEnrollment&user_id=self`

```json
{
  "currentScore": 85.5 | null,   // number — weighted current grade (only graded items)
  "currentGrade": "A" | null,    // string — letter grade equivalent
  "finalScore": 72.0 | null,     // number — treats ungraded items as 0
  "finalGrade": "B" | null       // string
}
```

**Important**: Often `{}` or all-null for UofT courses — professors frequently hide grades from the API. When empty, we must **compute grades manually** from individual assignment scores + syllabus weight info.

---

## Assignment

Fetched from `GET /courses/:id/assignments?per_page=100&order_by=due_at&include[]=submission`

```json
{
  "id": 1650680,                          // number
  "name": "W1 Tutorial Activity",         // string
  "dueAt": "2026-01-09T20:00:00Z" | null, // ISO8601 | null — null means no deadline
  "pointsPossible": 7,                    // number — 0 for ungraded/checklist items
  "submissionTypes": ["online_upload"],    // string[] — see values below
  "description": "plain text..." | null,  // string — HTML-stripped, truncated to 500 chars
  "score": 6.75 | null,                   // number | null — student's score (from submission include)
  "grade": "6.75" | null,                 // string | null — could be letter or number
  "submittedAt": "ISO8601" | null,        // when student submitted
  "workflowState": "graded" | "unsubmitted" // string — submission workflow state
}
```

### `submissionTypes` values
| Value | Meaning | Is "real" work? |
|-------|---------|-----------------|
| `"online_upload"` | File upload | Yes |
| `"online_text_entry"` | Text box submission | Yes |
| `"online_url"` | URL submission | Yes |
| `"online_quiz"` | Old Canvas quiz | Yes |
| `"external_tool"` | LTI tool (e.g., new quizzes, Crowdmark) | Yes |
| `"on_paper"` | Physical submission | Yes (but no digital tracking) |
| `"none"` | No submission expected | **Often fluff** — but check `pointsPossible` |

### Filtering Real vs Fluff Assignments
- **Fluff**: `pointsPossible === 0` AND `submissionTypes === ["none"]` — these are info-only items (e.g., "Quiz Checklist", problem sets graded externally on MarkUs)
- **Real but external**: `pointsPossible === 0` AND `submissionTypes === ["none"]` but description mentions MarkUs/external — still a real deadline, just graded elsewhere
- **Real**: `pointsPossible > 0` OR `submissionTypes` includes any value other than `"none"`
- Best approach: include everything with a `dueAt` in the to-do/calendar, but deprioritize 0-point `"none"` items visually

### `workflowState` values
| Value | Meaning |
|-------|---------|
| `"unsubmitted"` | Not yet submitted |
| `"graded"` | Submitted and graded |
| (also possible) `"submitted"` | Submitted, awaiting grade |
| (also possible) `"pending_review"` | Submitted, in peer/manual review |

---

## Submission

Fetched from `GET /courses/:id/students/submissions?student_ids[]=self&per_page=100&include[]=assignment&include[]=submission_comments`

This is a **separate, more detailed view** of each submission. Use this for grade details and TA feedback.

```json
{
  "assignmentId": 1650680,                // number — links to Assignment.id
  "assignmentName": "W1 Tutorial Activity", // string — denormalized from assignment
  "score": 6.75 | null,                   // number | null
  "grade": "6.75" | null,                 // string | null
  "submittedAt": "ISO8601" | null,
  "gradedAt": "2026-01-19T09:41:11Z" | null,  // when the TA graded it
  "pointsPossible": 7,                    // number — from the assignment
  "late": false,                          // boolean
  "missing": false,                       // boolean — true if past due + not submitted
  "comments": [                           // TA/instructor feedback
    {
      "author": "Aditya Khan",            // string
      "comment": "Next time, please don't submit as HEIC.",  // string
      "createdAt": "2026-01-19T09:27:28Z"
    }
  ]
}
```

---

## UpcomingEvent

Fetched from `GET /users/self/upcoming_events?per_page=50`

Contains both **calendar events** (office hours, lectures) and **assignment deadlines**.

```json
// type: "event" — calendar event
{
  "id": 1228992,                          // number
  "title": "CSC111 Instructor Office Hours",
  "type": "event",
  "start_at": "2026-03-13T19:00:00Z",
  "end_at": "2026-03-13T20:00:00Z",
  "all_day": false,
  "all_day_date": null,                   // "YYYY-MM-DD" if all_day is true
  "location_name": "BA 4290" | null,
  "location_address": null,
  "description": "string" | null,
  "context_code": "course_418277",        // "course_{id}" — links to course
  "context_name": "CSC111H1S 20261...",
  "workflow_state": "active",
  "rrule": "FREQ=WEEKLY;BYDAY=FR;..." | null,  // recurrence rule (iCal format)
  "series_uuid": "uuid" | null,
  "html_url": "https://q.utoronto.ca/calendar?event_id=..."
}

// type: "assignment" — upcoming deadline
{
  "id": "assignment_1717799",             // string — prefixed with "assignment_"
  "title": "W9 Tutorial Activity",
  "type": "assignment",
  "start_at": "2026-03-13T19:00:00Z",    // this is the due date
  "all_day": false,
  "all_day_date": "2026-03-13" | null,
  "description": "HTML string",           // NOTE: not stripped here, raw HTML
  "context_code": "course_428644",
  "context_name": "STA130H1S...",
  "workflow_state": "published",
  "submission_types": "none",             // string (not array here, comma-separated)
  "html_url": "https://q.utoronto.ca/courses/.../assignments/..."
}
```

---

## TodoItem

Fetched from `GET /users/self/todo?per_page=50`

Canvas's own "needs action" items — things the student hasn't submitted yet that are due soon.

```json
{
  "context_type": "Course",
  "course_id": 428644,                     // number
  "context_name": "STA130H1S...",          // string — full course name
  "type": "submitting",                    // string — always "submitting" in practice
  "ignore": "https://...?permanent=0",     // URL to dismiss this todo
  "ignore_permanently": "https://...?permanent=1",
  "html_url": "https://q.utoronto.ca/courses/.../assignments/...#submit",
  "assignment": {                          // full raw Canvas assignment object (not our trimmed version)
    "id": 1717799,
    "name": "W9 Tutorial Activity",
    "due_at": "2026-03-13T19:00:00Z",
    "points_possible": 10,
    "submission_types": ["online_upload"],  // array here (unlike upcoming)
    "description": "<p>HTML...</p>",
    "course_id": 428644,
    "workflow_state": "published",
    "html_url": "...",
    "unlock_at": "ISO8601" | null,
    "lock_at": "ISO8601" | null
    // ... many more fields from raw Canvas API
  }
}
```

---

## Syllabus

Fetched from `GET /courses/:id?include[]=syllabus_body`

The `syllabusBody` field on Course is extracted from this. It's raw HTML from the prof, stripped to plain text. Can be:
- **Rich text** (CSC111: 27k chars with full course policies, weight breakdowns, schedules)
- **Just links** (PHL246: "syllabus PHL 246 2026.pdf" — 59 chars, pointing to a file)
- **null** — no syllabus page set up

For link-only syllabi, the actual PDF must be fetched from `syllabusFiles` or parsed from the body.

---

## Module

Fetched from `GET /courses/:id/modules?include[]=items&per_page=100`

```json
{
  "id": 1277584,
  "name": "Crowdmark",                    // string — module/section name
  "position": 1,                          // number — display order
  "state": "completed" | "started" | "locked" | null,
  "itemCount": 1,                         // number
  "items": [
    {
      "id": 7349526,
      "title": "Crowdmark LTI",
      "type": "ExternalTool" | "Assignment" | "Page" | "File" | "SubHeader",
      "url": "https://q.utoronto.ca/courses/.../modules/items/..."
    }
  ]
}
```

---

## Announcement

Fetched from `GET /courses/:id/discussion_topics?only_announcements=true&per_page=50`

```json
{
  "id": 3425579,
  "title": "Reminder: Special Project Office Hours tomorrow",
  "postedAt": "2026-03-09T21:30:02Z",     // ISO8601
  "message": "plain text..."               // HTML-stripped, truncated to 500 chars
}
```

---

## File

Fetched from `GET /courses/:id/files?per_page=100`

```json
{
  "id": 39964191,
  "name": "Carnap_logical_foundations_probability.pdf",  // display_name
  "size": 977322,                          // bytes
  "contentType": "application/pdf",
  "url": "https://q.utoronto.ca/files/.../download?...",  // authenticated download URL (temporary)
  "createdAt": "2025-10-20T03:48:31Z",
  "updatedAt": "2025-10-20T03:48:43Z"
}
```

**Note**: The `url` field contains a temporary `verifier` token. These URLs expire. For syllabus PDFs, fetch immediately when needed.

---

## SyllabusFile

A filtered subset of File where the filename contains "syllabus".

```json
{
  "id": 39964191,
  "name": "MAT247 Syllabus.pdf",
  "url": "https://q.utoronto.ca/files/.../download?...",
  "contentType": "application/pdf"
}
```

---

## Data Quirks & Gotchas

1. **Grades almost always empty** — UofT profs hide final grades from the API. Compute from individual assignment scores.
2. **Problem sets graded on MarkUs** — STA130 problem sets have `pointsPossible: 0, submissionTypes: ["none"]` but are real assignments with deadlines. The description mentions "submit on MarkUs". These still belong on the to-do list.
3. **Duplicate assignment ↔ submission data** — Assignments include submission info via `include[]=submission`, AND there's a separate submissions endpoint. The submissions endpoint has `comments` and `gradedAt` that the assignment endpoint lacks.
4. **Course names are verbose** — e.g., `"CSC111H1S 20261 (All Sections): Foundations of Computer Science II"`. Parse the course code from the `code` field or extract with regex.
5. **`upcoming_events` mixes types** — Both calendar events and assignment deadlines, with slightly different shapes. Check `type` field.
6. **`submission_types` inconsistency** — Array in assignments/todo, comma-separated string in upcoming events.
7. **File URLs are temporary** — The `verifier` query param expires. Don't cache URLs long-term.
8. **Announcements can be huge** — We truncate to 500 chars in the fetch. Full text available from the raw API if needed.
9. **Some endpoints 403** — Files and modules may be hidden by the professor. Always catch errors and return `[]`.
