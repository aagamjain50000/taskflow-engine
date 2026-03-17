import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axiosClient";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [task, setTask] = useState(null);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [showEligible, setShowEligible] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const res = await api.get(`tasks/${id}/`);
      setTask(res.data);
    } catch {
      setError("Task not found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const fetchEligibleUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get(`tasks/${id}/eligible-users`);
      setEligibleUsers(res.data?.results || res.data || []);
      setShowEligible(true);
    } catch {
      setError("Failed to load eligible users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const transitionStatus = async (newStatus) => {
    setStatusLoading(true);
    setStatusMsg("");
    try {
      await api.patch(`tasks/${id}/status/`, { status: newStatus });
      setStatusMsg(`Status updated to ${newStatus}`);
      fetchTask();
    } catch (err) {
      const detail = err.response?.data?.status?.[0] || err.response?.data?.detail || "Failed to update status.";
      setStatusMsg(detail);
    } finally {
      setStatusLoading(false);
    }
  };

  const deleteTask = async () => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`tasks/${id}/`);
      navigate("/tasks");
    } catch {
      setError("Failed to delete task.");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <div className="error-box">{error}</div>
          <Link to="/tasks" className="btn-secondary">
            ← Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = (s) => {
    const map = { TODO: "badge-todo", IN_PROGRESS: "badge-in-progress", DONE: "badge-done" };
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

  const nextStatus = {
    TODO: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
  };

  const canEdit = isAdmin || task?.created_by === user?.id;

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link to="/tasks" className="hover:text-gray-300 transition-colors">
              Tasks
            </Link>
            <span>/</span>
            <span className="text-gray-300">#{task?.id}</span>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {task?.title}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={statusBadge(task?.status)}>
                    {statusLabel(task?.status)}
                  </span>
                  <span className={priorityBadge(task?.priority)}>
                    {priorityLabel(task?.priority)}
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-2 shrink-0">
                  <Link
                    to={`/tasks/${id}/edit`}
                    className="btn-secondary text-sm py-2"
                  >
                    Edit Task
                  </Link>
                  <button
                    onClick={deleteTask}
                    className="btn-danger text-sm py-2"
                  >
                    Delete Task
                  </button>
                </div>
              )}
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed">
                {task?.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-dark-700/50">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Due Date
                </p>
                <p className="text-sm text-white mt-1">
                  {task?.due_date
                    ? new Date(task.due_date).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Created
                </p>
                <p className="text-sm text-white mt-1">
                  {task?.created_at
                    ? new Date(task.created_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Updated
                </p>
                <p className="text-sm text-white mt-1">
                  {task?.updated_at
                    ? new Date(task.updated_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {nextStatus[task?.status] && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Status Transition
              </h2>
              {statusMsg && (
                <div className="text-sm text-gray-400 mb-3">{statusMsg}</div>
              )}
              <div className="flex items-center gap-3">
                <span className={statusBadge(task?.status)}>
                  {statusLabel(task?.status)}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <button
                  onClick={() => transitionStatus(nextStatus[task.status])}
                  disabled={statusLoading}
                  className="btn-primary text-sm py-2"
                >
                  {statusLoading
                    ? "Updating..."
                    : `Move to ${statusLabel(nextStatus[task.status])}`}
                </button>
              </div>
            </div>
          )}

          {task?.rule && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-glow-purple" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Assignment Rules
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Department
                  </p>
                  <p className="text-sm text-white mt-1 font-medium">
                    {task.rule.department}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Min Experience
                  </p>
                  <p className="text-sm text-white mt-1 font-medium">
                    {task.rule.min_experience} years
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Max Active Tasks
                  </p>
                  <p className="text-sm text-white mt-1 font-medium">
                    {task.rule.max_active_tasks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Location
                  </p>
                  <p className="text-sm text-white mt-1 font-medium">
                    {task.rule.location || "Any"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Eligible Users
              </h2>
              <button
                onClick={fetchEligibleUsers}
                disabled={usersLoading}
                className="btn-secondary text-sm py-2"
              >
                {usersLoading ? "Loading..." : showEligible ? "Refresh" : "Load Eligible Users"}
              </button>
            </div>

            {showEligible && eligibleUsers.length === 0 && (
              <p className="text-gray-500 text-sm">
                No eligible users match the assignment rules.
              </p>
            )}

            {showEligible && eligibleUsers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">
                        User
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">
                        Dept
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">
                        Exp
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">
                        Location
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">
                        Active
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/30">
                    {eligibleUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-dark-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-white font-medium">
                          {u.username}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {u.department}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {u.experience_years}y
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {u.location}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {u.active_tasks_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailPage;
