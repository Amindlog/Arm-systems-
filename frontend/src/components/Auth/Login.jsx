import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    login: '',
    password: ''
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
      const response = await authService.login(formData.login, formData.password);
      // Обновляем страницу для обновления состояния пользователя
      window.location.href = '/';
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Ошибка при входе';
      
      if (err.response) {
        // Сервер ответил с ошибкой
        errorMessage = err.response.data?.error || `Ошибка сервера: ${err.response.status}`;
      } else if (err.request) {
        // Запрос был отправлен, но ответа не получено
        errorMessage = 'Не удалось подключиться к серверу. Убедитесь, что backend запущен на http://localhost:5000';
      } else {
        // Что-то пошло не так при настройке запроса
        errorMessage = err.message || 'Ошибка при входе';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="auth-form__title">Вход в систему</h2>
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
          <button type="submit" disabled={loading} className="auth-form__button">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p className="auth-form__link">
          Нет аккаунта? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Зарегистрироваться</a>
        </p>
      </div>
    </div>
  );
};

export default Login;

