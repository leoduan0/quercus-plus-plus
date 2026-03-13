import { useData } from "../contexts/DataContext";

export default function CalendarPage() {
  const { data } = useData();
  if (!data) return null;

  // TODO: month/week calendar view
  // Events from assignments with dueAt + upcoming calendar events
  // Color-coded by course, click for details
  return (
    <div className="page calendar-page">
      <p className="page-placeholder">Calendar page — {data.upcoming.length} upcoming events</p>
    </div>
  );
}
