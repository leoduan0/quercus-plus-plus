import { useData } from "../contexts/DataContext";

export default function CoursesPage() {
  const { data } = useData();
  if (!data) return null;

  // TODO: filter active courses, render course cards with expandable sections
  // Sections: Upcoming Deadlines, Grades, Announcements, Action Needed, Syllabus
  return (
    <div className="page courses-page">
      <p className="page-placeholder">Courses page — {data.courses.length} courses loaded</p>
    </div>
  );
}
