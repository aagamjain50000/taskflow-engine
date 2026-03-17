import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosClient";

function SignupPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER",
    department: "IT",
    experience_years: 1,
    location: "Delhi",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const signup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("signup/", {
        ...form,
        experience_years: parseInt(form.experience_years),
      });
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "object") {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join("\n");
        setError(messages);
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-glow-cyan/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-accent-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-glow-cyan to-accent-500 rounded-2xl shadow-lg shadow-glow-cyan/25 mb-4">
            <span className="text-white font-bold text-2xl">TF</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-gray-400 mt-2">Join TaskFlow and get started</p>
        </div>

        <div className="card">
          {error && (
            <div className="error-box whitespace-pre-line">{error}</div>
          )}

          <form onSubmit={signup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Username</label>
                <input
                  className="input"
                  name="username"
                  placeholder="Choose a username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>

              <div className="col-span-2">
                <label className="label">Email</label>
                <input
                  className="input"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="label">Password</label>
                <input
                  className="input"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  className="select"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="USER">User</option>
                  <option value="MANAGER">Manager</option>
                </select>
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

              <div>
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
