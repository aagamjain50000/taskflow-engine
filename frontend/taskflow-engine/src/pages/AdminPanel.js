import { useState } from "react";
import api from "../api/axiosClient";
import Navbar from "../components/Navbar";

function AdminPanel() {
  const [taskId, setTaskId] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recomputeSingle = async (e) => {
    e.preventDefault();
    if (!taskId) return;
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post("tasks/recompute-eligibility", {
        task_id: parseInt(taskId),
      });
      setMessage(res.data?.message || "Recompute job queued.");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to trigger recomputation."
      );
    } finally {
      setLoading(false);
    }
  };

  const recomputeAll = async () => {
    if (
      !window.confirm(
        "This will recompute eligibility for ALL active tasks. Continue?"
      )
    )
      return;

    setBulkLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post("tasks/recompute-eligibility", {});
      setMessage(res.data?.message || "Bulk recompute job queued.");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to trigger bulk recomputation."
      );
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <h1 className="page-title flex items-center gap-3">
            Admin Panel
            <span className="badge-admin">Admin Only</span>
          </h1>
          <p className="page-subtitle">
            System administration and eligibility management
          </p>

          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}

          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">
              Recompute Single Task
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Trigger eligibility recomputation for a specific task by ID.
            </p>

            <form
              onSubmit={recomputeSingle}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <label className="label">Task ID</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Enter task ID"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary whitespace-nowrap"
              >
                {loading ? "Processing..." : "Recompute"}
              </button>
            </form>
          </div>

          {/* Bulk Recompute */}
          <div className="card border-glow-rose/20">
            <h2 className="text-lg font-semibold text-white mb-2">
              Bulk Recompute All Tasks
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Recompute eligibility for <strong>all active tasks</strong> (Todo
              + In Progress). This is a heavy operation and runs in the
              background via Celery.
            </p>

            <button
              onClick={recomputeAll}
              disabled={bulkLoading}
              className="btn-danger"
            >
              {bulkLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Recompute All Active Tasks"
              )}
            </button>
          </div>


          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              System Info
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Backend</p>
                <p className="text-white font-medium">Django + DRF</p>
              </div>
              <div>
                <p className="text-gray-500">Database</p>
                <p className="text-white font-medium">PostgreSQL 15</p>
              </div>
              <div>
                <p className="text-gray-500">Cache & Broker</p>
                <p className="text-white font-medium">Redis 7</p>
              </div>
              <div>
                <p className="text-gray-500">Background Processing</p>
                <p className="text-white font-medium">Celery 5.6</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
