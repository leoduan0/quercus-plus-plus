import { useData } from "../contexts/DataContext";

export default function TodoPage() {
  const { data } = useData();
  if (!data) return null;

  // TODO: aggregate assignments with dueAt > now across all active courses
  // Group by: Overdue, Due Today, This Week, Later
  // Sort by due date ascending within each group
  return (
    <div className="page todo-page">
      <p className="page-placeholder">To-Do page — {data.todo.length} Canvas todo items</p>
    </div>
  );
}
