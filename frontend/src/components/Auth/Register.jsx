import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    name: '',
    role: 'dispatcher'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.register(
        formData.login,
        formData.password,
        formData.role,
        formData.name
      );
      // Обновляем страницу для обновления состояния пользователя
      window.location.href = '/';
    } catch (err) {
      console.error('Registration error:', err);
      let errorMessage = 'Ошибка при регистрации';
      
      if (err.response) {
        // Сервер ответил с ошибкой
        errorMessage = err.response.data?.error || `Ошибка сервера: ${err.response.status}`;
      } else if (err.request) {
        // Запрос был отправлен, но ответа не получено
        errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что backend запущен на http://localhost:5000';
      } else {
        // Что-то пошло не так при настройке запроса
        errorMessage = err.message || 'Ошибка при регистрации';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="auth-form__title">Регистрация</h2>
        {error && <div className="auth-form__error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form__form">
          <div className="auth-form__field">
            <label htmlFor="login" className="auth-form__label">Логин</label>
            <input
              type="text"
              id="login"
              name="login"
              value={formData.login}
              onChange={handleChange}
              required
              className="auth-form__input"
            />
          </div>
          <div className="auth-form__field">
            <label htmlFor="password" className="auth-form__label">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="auth-form__input"
            />
          </div>
          <div className="auth-form__field">
            <label htmlFor="name" className="auth-form__label">Имя</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="auth-form__input"
            />
          </div>
          <div className="auth-form__field">
            <label htmlFor="role" className="auth-form__label">Роль</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="auth-form__input"
            >
              <option value="director">Директор</option>
              <option value="dispatcher">Диспетчер</option>
              <option value="plumber">Слесарь</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="auth-form__button">
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="auth-form__link">
          Уже есть аккаунт? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Войти</a>
        </p>
      </div>
    </div>
  );
};

export default Register;

