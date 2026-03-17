export type CanvasAssignment = {
  id: number | string;
  name: string;
  dueAt: string | null;
  pointsPossible: number | null;
  submissionTypes?: string[];
  description?: string | null;
  score?: number | null;
  grade?: string | null;
  submittedAt?: string | null;
  workflowState?: string | null;
};

export type CanvasGrade = {
  currentScore?: number | null;
  currentGrade?: string | null;
  finalScore?: number | null;
  finalGrade?: string | null;
};

export type CanvasSubmission = {
  assignmentId: number | string;
  assignmentName: string | null;
  score: number | null;
  grade: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  pointsPossible: number | null;
  late: boolean | null;
  missing: boolean | null;
  comments: {
    author: string | null;
    comment: string | null;
    createdAt: string | null;
  }[];
};

export type CanvasFile = {
  id: number | string;
  name: string;
  size?: number;
  contentType?: string | null;
  url?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CanvasModule = {
  id: number | string;
  name: string;
  position?: number;
  state?: string;
  itemCount?: number;
  items: { id: number | string; title: string; type?: string; url?: string }[];
};

export type CanvasAnnouncement = {
  id: number | string;
  title: string;
  postedAt: string | null;
  message: string | null;
};

export type CanvasCourse = {
  id: number | string;
  name: string;
  code?: string | null;
  term?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  grades?: CanvasGrade;
  assignments: CanvasAssignment[];
  submissions: CanvasSubmission[];
  syllabusBody?: string | null;
  syllabusFiles: {
    id: number | string;
    name: string;
    url?: string | null;
    contentType?: string | null;
  }[];
  modules: CanvasModule[];
  announcements: CanvasAnnouncement[];
  files: CanvasFile[];
  syllabusSummary?: string | null;
  syllabusWeights?: { category: string; weight: number }[];
};

export type CanvasUpcomingEvent = {
  id?: number | string;
  title: string;
  start_at?: string | null;
  end_at?: string | null;
  type?: string | null;
  context_code?: string | null;
  context_name?: string | null;
  location_name?: string | null;
};

export type CanvasTodoItem = {
  id?: number | string;
  course_id?: number | string;
  context_name?: string | null;
  assignment?: { name?: string | null; due_at?: string | null } | null;
};

export type CanvasData = {
  fetchedAt: string;
  courses: CanvasCourse[];
  upcoming: CanvasUpcomingEvent[];
  todo: CanvasTodoItem[];
};
