import { useState, useEffect } from 'react';
import api from '../../services/api';
import { authService } from '../../services/auth';
import './ApplicationEditModal.css';

const ApplicationEditModal = ({ application, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    address: application?.address || '',
    description: application?.description || '',
    submitted_by: application?.submitted_by || '',
    team_id: application?.team?.id || '',
    status: application?.status || 'new',
    completed_at: application?.completed_at || ''
  });
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    loadTeams();
    if (application) {
      setFormData({
        address: application.address || '',
        description: application.description || '',
        submitted_by: application.submitted_by || '',
        team_id: application.team?.id || '',
        status: application.status || 'new',
        completed_at: application.completed_at ? new Date(application.completed_at).toISOString().slice(0, 16) : ''
      });
    }
  }, [application]);

  const loadTeams = async () => {
    try {
      const response = await api.get('/applications/teams/list');
      setTeams(response.data.teams || []);
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

    if (!formData.address) {
      setError('Адрес обязателен для заполнения');
      setLoading(false);
      return;
    }

    try {
      await api.put(`/applications/${application.id}`, {
        address: formData.address,
        description: formData.description,
        submitted_by: formData.submitted_by,
        team_id: formData.team_id ? parseInt(formData.team_id) : null,
        status: formData.status,
        completed_at: formData.status === 'completed' && formData.completed_at ? new Date(formData.completed_at).toISOString() : null
      });

      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при обновлении заявки');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTeams) {
    return (
      <div className="application-edit-modal-overlay" onClick={onClose}>
        <div className="application-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="application-edit-modal__loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="application-edit-modal-overlay" onClick={onClose}>
      <div className="application-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="application-edit-modal__header">
          <h2 className="application-edit-modal__title">Редактировать заявку #{application?.id}</h2>
          <button
            className="application-edit-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {error && <div className="application-edit-modal__error">{error}</div>}

        <form onSubmit={handleSubmit} className="application-edit-modal__form">
          <div className="application-edit-modal__field">
            <label htmlFor="address" className="application-edit-modal__label">
              Адрес <span className="application-edit-modal__required">*</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="application-edit-modal__input"
              placeholder="Введите адрес"
            />
          </div>

          <div className="application-edit-modal__field">
            <label htmlFor="submitted_by" className="application-edit-modal__label">
              Кто подал заявку
            </label>
            <input
              type="text"
              id="submitted_by"
              name="submitted_by"
              value={formData.submitted_by}
              onChange={handleChange}
              className="application-edit-modal__input"
              placeholder="ФИО заявителя"
            />
          </div>

          <div className="application-edit-modal__field">
            <label htmlFor="team_id" className="application-edit-modal__label">
              Бригада
            </label>
            <select
              id="team_id"
              name="team_id"
              value={formData.team_id}
              onChange={handleChange}
              className="application-edit-modal__input"
            >
              <option value="">Не выбрана</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="application-edit-modal__field">
            <label htmlFor="status" className="application-edit-modal__label">
              Статус <span className="application-edit-modal__required">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="application-edit-modal__input"
            >
              <option value="new">Новая</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Выполнена</option>
              <option value="cancelled">Отменена</option>
            </select>
          </div>

          {formData.status === 'completed' && (
            <div className="application-edit-modal__field">
              <label htmlFor="completed_at" className="application-edit-modal__label">
                Время выполнения
              </label>
              <input
                type="datetime-local"
                id="completed_at"
                name="completed_at"
                value={formData.completed_at}
                onChange={handleChange}
                className="application-edit-modal__input"
              />
            </div>
          )}

          <div className="application-edit-modal__field">
            <label htmlFor="description" className="application-edit-modal__label">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="application-edit-modal__input application-edit-modal__textarea"
              placeholder="Описание проблемы"
              rows="4"
            />
          </div>

          <div className="application-edit-modal__info">
            {application?.coordinates && (
              <p><strong>Координаты:</strong> {application.coordinates.lat.toFixed(6)}, {application.coordinates.lng.toFixed(6)}</p>
            )}
            <p><strong>Создана:</strong> {new Date(application?.created_at).toLocaleString('ru-RU')}</p>
            {application?.completed_at && (
              <p><strong>Выполнена:</strong> {new Date(application.completed_at).toLocaleString('ru-RU')}</p>
            )}
          </div>

          <div className="application-edit-modal__actions">
            <button
              type="button"
              onClick={onClose}
              className="application-edit-modal__button application-edit-modal__button--cancel"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="application-edit-modal__button application-edit-modal__button--submit"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationEditModal;

