import { useEffect, useState } from "react";
import api from "../api/axiosClient";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

function Dashboard() {
  const { user, isAdminOrManager } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  console.log("[Dashboard] user:", user);
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`my-eligible-tasks?page=${page}`);
      const data = res.data;
      console.log("[Dashboard] my-eligible-tasks raw data:", data);
      if (data.results) {
        console.log("[Dashboard] parsed tasks (data.results):", data.results);
        setTasks(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / 20));
      } else {
        const arr = Array.isArray(data) ? data : [];
        console.log("[Dashboard] parsed tasks (array fallback):", arr);
        setTasks(arr);
        setTotalCount(arr.length);
        setTotalPages(1);
      }
    } catch {
      setError("Failed to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page]);

  const statusBadge = (s) => {
    const map = {
      ASSIGNED: "badge-todo",
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
    const map = {
      ASSIGNED: "Assigned",
      TODO: "Todo",
      IN_PROGRESS: "In Progress",
      DONE: "Done",
    };
    return map[s] || s;
  };

  const totalTasks = totalCount;
  const highPriority = tasks.filter((t) => t.priority === 3).length;
  const inProgress = tasks.filter(
    (t) => t.status === "IN_PROGRESS"
  ).length;
  const completed = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="page-title">
            Welcome back, {user?.username}
            <span className="ml-3 inline-flex">
              <span
                className={
                  user?.role === "ADMIN"
                    ? "badge-admin"
                    : user?.role === "MANAGER"
                    ? "badge-manager"
                    : "badge-user"
                }
              >
                {user?.role}
              </span>
            </span>
          </h1>
          <p className="page-subtitle">
            Here's an overview of your assigned tasks
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <p className="text-3xl font-bold text-white">{totalTasks}</p>
            <p className="text-sm text-gray-400 mt-1">Total Tasks</p>
          </div>
          <div className="stat-card">
            <p className="text-3xl font-bold text-glow-rose">{highPriority}</p>
            <p className="text-sm text-gray-400 mt-1">High Priority</p>
          </div>
          <div className="stat-card">
            <p className="text-3xl font-bold text-glow-amber">{inProgress}</p>
            <p className="text-sm text-gray-400 mt-1">In Progress</p>
          </div>
          <div className="stat-card">
            <p className="text-3xl font-bold text-glow-emerald">{completed}</p>
            <p className="text-sm text-gray-400 mt-1">Completed</p>
          </div>
        </div>

        {isAdminOrManager && (
          <div className="flex gap-3 mb-6">
            <Link to="/create-task" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Task
            </Link>
            <Link to="/tasks" className="btn-secondary inline-flex items-center gap-2">
              Browse All Tasks
            </Link>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading your tasks...</p>
            </div>
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 3H12.75A2.25 2.25 0 0010.5 5.258m-2.25-.008c-.09.007-.18.015-.27.023m0 0A49.384 49.384 0 006 5.573m-1.5 3.677A49.384 49.384 0 006 5.573" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No tasks assigned yet
            </h3>
            <p className="text-gray-500 text-sm">
              Tasks will appear here once they are assigned to you based on eligibility rules.
            </p>
          </div>
        )}

        {!loading && !error && tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task, idx) => (
              <Link
                key={task.task_id}
                to={`/tasks/${task.task_id}`}
                className="card card-hover cursor-pointer animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white text-lg leading-tight pr-2">
                    {task.title}
                  </h3>
                  <span className={priorityBadge(task.priority)}>
                    {priorityLabel(task.priority)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={statusBadge(task.status)}>
                    {statusLabel(task.status)}
                  </span>
                </div>

                {task.due_date && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </div>
                )}

                {task.assigned_at && (
                  <p className="text-xs text-gray-600 mt-2">
                    Assigned: {new Date(task.assigned_at).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-sm py-2 px-4"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary text-sm py-2 px-4"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;