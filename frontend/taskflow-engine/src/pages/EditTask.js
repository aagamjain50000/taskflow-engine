import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import Navbar from "../components/Navbar";

function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: 2,
    due_date: "",
    departments: ["Finance"],
    min_experience: 1,
    max_experience: "",
    max_active_tasks: 5,
    locations_allow: [],
    locations_deny: [],
  });

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTask = useCallback(async () => {
    try {
      const res = await api.get(`tasks/${id}/`);
      const task = res.data;
      const rule = task.rule || {};
      const departments =
        Array.isArray(rule.departments) && rule.departments.length > 0
          ? rule.departments
          : rule.department
          ? [rule.department]
          : ["Finance"];
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || 2,
        due_date: task.due_date ? task.due_date.split("T")[0] : "",
        departments,
        min_experience: rule.min_experience ?? 1,
        max_experience: rule.max_experience ?? "",
        max_active_tasks: rule.max_active_tasks ?? 5,
        locations_allow: Array.isArray(rule.locations_allow)
          ? rule.locations_allow
          : rule.location
          ? [rule.location]
          : [],
        locations_deny: Array.isArray(rule.locations_deny) ? rule.locations_deny : [],
      });
    } catch {
      setError("Task not found or access denied.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const DEPARTMENTS = ["Finance", "HR", "IT", "Operations"];
  const LOCATIONS = ["Delhi", "Mumbai", "Bangalore", "Remote"];

  const toggleInList = (key, value) => {
    setForm((prev) => {
      const curr = Array.isArray(prev[key]) ? prev[key] : [];
      const next = curr.includes(value)
        ? curr.filter((v) => v !== value)
        : [...curr, value];
      return { ...prev, [key]: next };
    });
  };

  const updateTask = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitLoading(true);

    try {
      const departments =
        Array.isArray(form.departments) && form.departments.length > 0
          ? form.departments
          : ["Finance"];
      await api.put(`tasks/${id}/`, {
        title: form.title,
        description: form.description,
        priority: parseInt(form.priority),
        due_date: form.due_date,
        rule: {
          department: departments[0],
          departments,
          min_experience: parseInt(form.min_experience),
          max_experience:
            form.max_experience === "" ? null : parseInt(form.max_experience),
          max_active_tasks: parseInt(form.max_active_tasks),
          location: null,
          locations_allow:
            Array.isArray(form.locations_allow) && form.locations_allow.length > 0
              ? form.locations_allow
              : null,
          locations_deny:
            Array.isArray(form.locations_deny) && form.locations_deny.length > 0
              ? form.locations_deny
              : null,
        },
      });

      setSuccess("Task updated successfully! Assignment rules are being re-evaluated.");
      setTimeout(() => navigate(`/tasks/${id}`), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "object") {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join("\n");
        setError(messages);
      } else {
        setError("Failed to update task. Please try again.");
      }
    } finally {
      setSubmitLoading(false);
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

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <h1 className="page-title">Edit Task</h1>
          <p className="page-subtitle">Update task details and assignment rules.</p>

          {error && <div className="error-box whitespace-pre-line">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <form onSubmit={updateTask} className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Task Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    className="input"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input min-h-[100px] resize-y"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Priority</label>
                    <select className="select" name="priority" value={form.priority} onChange={handleChange}>
                      <option value={1}>Low</option>
                      <option value={2}>Medium</option>
                      <option value={3}>High</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Due Date</label>
                    <input className="input" name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-accent-500/20">
              <h2 className="text-lg font-semibold text-white mb-4">Assignment Rules</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Departments (one or more)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEPARTMENTS.map((d) => (
                      <label
                        key={d}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={form.departments.includes(d)}
                          onChange={() => toggleInList("departments", d)}
                        />
                        {d}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    The first selected department is used for backwards compatibility.
                  </p>
                </div>
                <div>
                  <label className="label">Min Experience (years)</label>
                  <input className="input" name="min_experience" type="number" min="0" max="30" value={form.min_experience} onChange={handleChange} required />
                </div>
                <div>
                  <label className="label">Max Experience (optional)</label>
                  <input
                    className="input"
                    name="max_experience"
                    type="number"
                    min="0"
                    max="60"
                    value={form.max_experience}
                    onChange={handleChange}
                    placeholder="No maximum"
                  />
                </div>
                <div>
                  <label className="label">Max Active Tasks</label>
                  <input className="input" name="max_active_tasks" type="number" min="1" max="50" value={form.max_active_tasks} onChange={handleChange} required />
                </div>
                <div className="col-span-2">
                  <label className="label">Location allow-list (optional)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LOCATIONS.map((loc) => (
                      <label
                        key={loc}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={form.locations_allow.includes(loc)}
                          onChange={() => toggleInList("locations_allow", loc)}
                        />
                        {loc}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="label">Location deny-list (optional)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LOCATIONS.map((loc) => (
                      <label
                        key={loc}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={form.locations_deny.includes(loc)}
                          onChange={() => toggleInList("locations_deny", loc)}
                        />
                        {loc}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitLoading} className="btn-primary w-full">
              {submitLoading ? "Updating..." : "Update Task"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditTask;
