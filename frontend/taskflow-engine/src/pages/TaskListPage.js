import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosClient";
import Navbar from "../components/Navbar";

function TaskListPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);

  const fetchTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", page);
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);

      const res = await api.get(`tasks/?${params.toString()}`);
      const data = res.data;

      if (data.results) {
        setTasks(data.results);
        setCount(data.count);
        setTotalPages(Math.ceil(data.count / 20));
      } else {
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch {
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const statusBadge = (s) => {
    const map = {
      TODO: "badge-todo",
      IN_PROGRESS: "badge-in-progress",
      DONE: "badge-done",
    };
    return map[s] || "badge-todo";
  };

  const priorityBadge = (p) => {
    const map = { 1: "badge-low", 2: "badge-medium", 3: "badge-high" };
    return map[p] || "badge-medium";
  };

  const priorityLabel = (p) => {
    const map = { 1: "Low", 2: "Medium", 3: "High" };
    return map[p] || p;
  };

  const statusLabel = (s) => {
    const map = { TODO: "Todo", IN_PROGRESS: "In Progress", DONE: "Done" };
    return map[s] || s;
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="page-title">All Tasks</h1>
            <p className="text-gray-400">
              {count > 0 ? `${count} tasks total` : "Browse all tasks"}
            </p>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-400">Filters:</span>

            <select
              className="select w-auto min-w-[140px]"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>

            <select
              className="select w-auto min-w-[140px]"
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="1">Low</option>
              <option value="2">Medium</option>
              <option value="3">High</option>
            </select>

            {(filters.status || filters.priority) && (
              <button
                onClick={() => {
                  setFilters({ status: "", priority: "" });
                  setPage(1);
                }}
                className="btn-ghost text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading tasks...</p>
            </div>
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="card text-center py-16">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No tasks found
            </h3>
            <p className="text-gray-500 text-sm">
              Try adjusting your filters or create a new task.
            </p>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <>
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      Task
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Priority
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/30">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-dark-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="text-white font-medium hover:text-accent-400 transition-colors"
                        >
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          <span className={statusBadge(task.status)}>
                            {statusLabel(task.status)}
                          </span>
                          <span className={priorityBadge(task.priority)}>
                            {priorityLabel(task.priority)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className={statusBadge(task.status)}>
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className={priorityBadge(task.priority)}>
                          {priorityLabel(task.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-400">
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TaskListPage;
