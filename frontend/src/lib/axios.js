import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor: inject Authorization Bearer token dynamically
apiClient.interceptors.request.use(
  (config) => {
    // Guard against SSR — localStorage is only available in the browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: capture JWT token on login & handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => {
    // Auto-capture JWT token from login / auth responses if present
    if (typeof window !== 'undefined' && response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Prevent redirect loop if already on /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
