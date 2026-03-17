import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import Navbar from "../components/Navbar";

function CreateTask() {
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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const createTask = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const departments =
        Array.isArray(form.departments) && form.departments.length > 0
          ? form.departments
          : ["Finance"];
      await api.post("tasks/", {
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

      setSuccess(
        "Task created successfully! Assignment is being computed in the background."
      );
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "object") {
        const messages = Object.entries(data)
          .map(
            ([key, val]) =>
              `${key}: ${Array.isArray(val) ? val.join(", ") : val}`
          )
          .join("\n");
        setError(messages);
      } else {
        setError("Failed to create task. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <h1 className="page-title">Create New Task</h1>
          <p className="page-subtitle">
            Define task details and assignment rules. The system will
            automatically find and assign the best eligible user.
          </p>

          {error && (
            <div className="error-box whitespace-pre-line">{error}</div>
          )}
          {success && <div className="success-box">{success}</div>}

          <form onSubmit={createTask} className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Task Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    className="input"
                    name="title"
                    placeholder="Enter task title"
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
                    placeholder="Describe the task in detail..."
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Priority</label>
                    <select
                      className="select"
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                    >
                      <option value={1}>Low</option>
                      <option value={2}>Medium</option>
                      <option value={3}>High</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Due Date</label>
                    <input
                      className="input"
                      name="due_date"
                      type="date"
                      value={form.due_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-accent-500/20">
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-glow-purple" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Assignment Rules
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Define criteria for automatic user assignment
              </p>

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
                  <input
                    className="input"
                    name="min_experience"
                    type="number"
                    min="0"
                    max="30"
                    value={form.min_experience}
                    onChange={handleChange}
                    required
                  />
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
                  <input
                    className="input"
                    name="max_active_tasks"
                    type="number"
                    min="1"
                    max="50"
                    value={form.max_active_tasks}
                    onChange={handleChange}
                    required
                  />
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

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating task...
                </span>
              ) : (
                "Create Task & Auto-Assign"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateTask;