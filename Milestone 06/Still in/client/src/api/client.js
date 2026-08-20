import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Request interceptor to add Authorization header.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 is the definitive signal that the current session is no longer valid.
// Keep this handling centralized so every protected request follows the same
// cleanup path instead of relying on individual components to remember it.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export default client;
