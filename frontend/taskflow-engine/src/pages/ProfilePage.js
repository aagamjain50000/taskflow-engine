import { useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosClient";

function ProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const startEditing = () => {
    setForm({
      email: user?.email || "",
      department: user?.department || "",
      experience_years: user?.experience_years || 0,
      location: user?.location || "",
    });
    setEditing(true);
    setError("");
    setSuccess("");
  };

  const cancelEditing = () => {
    setEditing(false);
    setError("");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.put("profile/", {
        ...form,
        experience_years: parseInt(form.experience_years),
      });
      await fetchProfile();
      setSuccess("Profile updated successfully! Eligibility will be recomputed.");
      setEditing(false);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "object") {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join("\n");
        setError(messages);
      } else {
        setError("Failed to update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = {
    ADMIN: "badge-admin",
    MANAGER: "badge-manager",
    USER: "badge-user",
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            View and manage your profile information
          </p>

          {error && <div className="error-box whitespace-pre-line">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <div className="card mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-glow-cyan rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user?.username}</h2>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                <span className={`${roleBadge[user?.role]} mt-1`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {!editing ? (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Details</h2>
                <button onClick={startEditing} className="btn-secondary text-sm py-2">
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Department</p>
                  <p className="text-white font-medium">{user?.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Experience</p>
                  <p className="text-white font-medium">
                    {user?.experience_years} years
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="text-white font-medium">{user?.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Tasks</p>
                  <p className="text-white font-medium">
                    {user?.active_tasks_count}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="card">
              <h2 className="text-lg font-semibold text-white mb-6">
                Edit Details
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Email</label>
                  <input
                    className="input"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="label">Department</label>
                  <select
                    className="select"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="label">Experience (years)</label>
                  <input
                    className="input"
                    name="experience_years"
                    type="number"
                    min="0"
                    max="30"
                    value={form.experience_years}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Location</label>
                  <select
                    className="select"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                  >
                    <option value="Delhi">Delhi</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 text-xs text-gray-600 text-center">
            Changing your department, experience, or location will automatically
            trigger eligibility recomputation for your tasks.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
