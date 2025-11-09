import { useState, useEffect } from 'react';
import api from '../../services/api';
import { authService } from '../../services/auth';
import './ApplicationForm.css';

const ApplicationFormContent = ({ position, address, lineId, onSubmit }) => {
  const [formData, setFormData] = useState({
    address: address || '',
    description: '',
    submitted_by: '',
    team_id: ''
  });
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  // Обновляем адрес при изменении пропса
  useEffect(() => {
    if (address) {
      setFormData(prev => ({
        ...prev,
        address: address
      }));
    }
  }, [address]);

  const loadTeams = async () => {
    try {
      const response = await api.get('/applications/teams/list');
      setTeams(response.data.teams || []);
      if (response.data.teams && response.data.teams.length > 0) {
        setFormData(prev => ({
          ...prev,
          team_id: response.data.teams[0].id
        }));
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

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

    if (!formData.address || !formData.team_id) {
      setError('Адрес и бригада обязательны для заполнения');
      setLoading(false);
      return;
    }

    try {
      const user = authService.getUser();
      await api.post('/applications', {
        address: formData.address,
        description: formData.description,
        submitted_by: formData.submitted_by,
        team_id: parseInt(formData.team_id),
        latitude: position.lat,
        longitude: position.lng,
        line_id: lineId || null
      });

      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTeams) {
    return <div className="application-form-content">Загрузка...</div>;
  }

  return (
    <div className="application-form-content">
      {error && <div className="application-form__error">{error}</div>}

      <form onSubmit={handleSubmit} className="application-form__form">
        <div className="application-form__field">
          <label htmlFor="address" className="application-form__label">
            Адрес <span className="application-form__required">*</span>
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="application-form__input"
            placeholder="Введите адрес"
          />
        </div>

        <div className="application-form__field">
          <label htmlFor="submitted_by" className="application-form__label">
            Кто подал заявку
          </label>
          <input
            type="text"
            id="submitted_by"
            name="submitted_by"
            value={formData.submitted_by}
            onChange={handleChange}
            className="application-form__input"
            placeholder="ФИО заявителя"
          />
        </div>

        <div className="application-form__field">
          <label htmlFor="team_id" className="application-form__label">
            Бригада <span className="application-form__required">*</span>
          </label>
          <select
            id="team_id"
            name="team_id"
            value={formData.team_id}
            onChange={handleChange}
            required
            className="application-form__input"
          >
            <option value="">Выберите бригаду</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="application-form__field">
          <label htmlFor="description" className="application-form__label">
            Описание
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="application-form__input application-form__textarea"
            placeholder="Описание проблемы"
            rows="4"
          />
        </div>

        <div className="application-form__info">
          <p><strong>Координаты:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
          <p><strong>Принял:</strong> {authService.getUser()?.name}</p>
        </div>

        <div className="application-form__actions">
          <button
            type="submit"
            disabled={loading}
            className="application-form__button application-form__button--submit"
          >
            {loading ? 'Создание...' : 'Создать заявку'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApplicationFormContent;

