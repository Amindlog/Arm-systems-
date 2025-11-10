import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавление токена и API ключа к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Добавляем API ключ, если он установлен
    if (API_KEY) {
      config.headers['x-api-key'] = API_KEY;
    }
    
    // Не устанавливаем Content-Type для FormData, axios сделает это автоматически
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработка ошибок авторизации и API ключа
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Ошибка API ключа
    if (error.response?.status === 401 && error.response?.data?.error?.includes('API ключ')) {
      console.error('Ошибка API ключа:', error.response.data.error);
      alert('Ошибка доступа: неверный API ключ. Обратитесь к администратору.');
      return Promise.reject(error);
    }
    
    // Ошибка авторизации
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Ошибка доступа (403) - неверный API ключ
    if (error.response?.status === 403 && error.response?.data?.error?.includes('API ключ')) {
      console.error('Ошибка доступа:', error.response.data.error);
      alert('Ошибка доступа: неверный API ключ. Обратитесь к администратору.');
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export default api;

