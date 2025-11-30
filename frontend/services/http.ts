import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { triggerLogout } from "./auth";

// API Base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Create axios instance with default config
const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - can be used to add auth tokens, etc.
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any request modifications here
    // For example, add auth token:
    // const token = localStorage.getItem("access_token");
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
http.interceptors.response.use(
  (response) => {
    // Return data directly if response has a data property
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          console.error("Unauthorized - token expired, logging out");
          // Trigger automatic logout when token expires
          triggerLogout();
          break;
        case 403:
          console.error("Forbidden - insufficient permissions");
          break;
        case 404:
          console.error("Resource not found");
          break;
        case 500:
          console.error("Server error - please try again later");
          break;
        default:
          console.error(`Request failed with status ${status}`);
      }

      // Return error with response data
      return Promise.reject({
        message: data?.error || error.message,
        status,
        data: data,
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error("Network error - please check your connection");
      return Promise.reject({
        message: "Network error - please check your connection",
        status: 0,
      });
    } else {
      // Something else happened
      console.error("Request error:", error.message);
      return Promise.reject({
        message: error.message,
        status: 0,
      });
    }
  }
);

export default http;
