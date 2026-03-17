import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/",
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const res = await axios.post("http://localhost:8000/api/token/refresh/", {
            refresh: refreshToken,
          });

          localStorage.setItem("access_token", res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;

          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.dispatchEvent(new Event("auth:logout"));
          window.location.href = "/";
        }
      } else {
        window.dispatchEvent(new Event("auth:logout"));
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;