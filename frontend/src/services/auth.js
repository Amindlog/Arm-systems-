import api from './api';

export const authService = {
  async login(login, password) {
    const response = await api.post('/auth/login', { login, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(login, password, role, name) {
    const response = await api.post('/auth/register', { login, password, role, name });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  hasRole(role) {
    const user = this.getUser();
    return user?.role === role;
  },

  hasAnyRole(...roles) {
    const user = this.getUser();
    return user && roles.includes(user.role);
  }
};

