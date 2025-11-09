import { useState, useEffect } from 'react';
import api from '../services/api';
import { authService } from '../services/auth';
import './ApplicationsPage.css';

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    team_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.team_id) params.append('team_id', filters.team_id);

      const [applicationsResponse, teamsResponse] = await Promise.all([
        api.get(`/applications?${params.toString()}`),
        api.get('/applications/teams/list')
      ]);

      setApplications(applicationsResponse.data.applications || []);
      setTeams(teamsResponse.data.teams || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при загрузке данных');
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await api.put(`/applications/${applicationId}`, { status: newStatus });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при обновлении статуса');
    }
  };

  const getStatusName = (status) => {
    const statuses = {
      new: 'Новая',
      in_progress: 'В работе',
      completed: 'Выполнена',
      cancelled: 'Отменена'
    };
    return statuses[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      new: 'applications-page__status--new',
      in_progress: 'applications-page__status--in-progress',
      completed: 'applications-page__status--completed',
      cancelled: 'applications-page__status--cancelled'
    };
    return classes[status] || '';
  };

  const getTeamClass = (teamName, status) => {
    // Если заявка новая и бригада не выбрана - красный цвет
    if (status === 'new' && !teamName) {
      return 'applications-page__item--no-team';
    }
    
    if (!teamName) return '';
    const baseClass = teamName === 'водосеть' 
      ? 'applications-page__item--water' 
      : 'applications-page__item--sewer';
    
    // Добавляем класс для статуса "в работе"
    if (status === 'in_progress') {
      return `${baseClass} applications-page__item--in-progress`;
    }
    
    return baseClass;
  };

  const user = authService.getUser();
  const canEdit = user && (user.role === 'director' || user.role === 'dispatcher');

  if (loading) {
    return <div className="applications-page__loading">Загрузка заявок...</div>;
  }

  return (
    <div className="applications-page">
      <div className="applications-page__header">
        <h2 className="applications-page__title">Список заявок</h2>
        {error && <div className="applications-page__error">{error}</div>}
      </div>

      <div className="applications-page__filters">
        <div className="applications-page__filter">
          <label htmlFor="status-filter" className="applications-page__filter-label">
            Статус:
          </label>
          <select
            id="status-filter"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="applications-page__filter-select"
          >
            <option value="">Все статусы</option>
            <option value="new">Новая</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Выполнена</option>
            <option value="cancelled">Отменена</option>
          </select>
        </div>

        <div className="applications-page__filter">
          <label htmlFor="team-filter" className="applications-page__filter-label">
            Бригада:
          </label>
          <select
            id="team-filter"
            name="team_id"
            value={filters.team_id}
            onChange={handleFilterChange}
            className="applications-page__filter-select"
          >
            <option value="">Все бригады</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="applications-page__list">
        {applications.length === 0 ? (
          <div className="applications-page__empty">Заявки не найдены</div>
        ) : (
          applications.map((app) => (
            <div 
              key={app.id} 
              className={`applications-page__item ${getTeamClass(app.team?.name, app.status)}`}
            >
              <div className="applications-page__item-header">
                <h3 className="applications-page__item-title">
                  Заявка #{app.id}
                </h3>
                <span className={`applications-page__status ${getStatusClass(app.status)}`}>
                  {getStatusName(app.status)}
                </span>
              </div>

              <div className="applications-page__item-content">
                <div className="applications-page__item-field">
                  <strong>Дата получения:</strong> {new Date(app.created_at).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>

                <div className="applications-page__item-field">
                  <strong>Адрес:</strong> {app.address}
                </div>

                {app.description && (
                  <div className="applications-page__item-field">
                    <strong>Описание:</strong> {app.description}
                  </div>
                )}

                {app.submitted_by && (
                  <div className="applications-page__item-field">
                    <strong>Подал:</strong> {app.submitted_by}
                  </div>
                )}

                {app.accepted_by && (
                  <div className="applications-page__item-field">
                    <strong>Принял:</strong> {app.accepted_by.name}
                  </div>
                )}

                {app.team && (
                  <div className="applications-page__item-field">
                    <strong>Бригада:</strong> {app.team.name}
                  </div>
                )}

                <div className="applications-page__item-field">
                  <strong>Координаты:</strong> {app.coordinates.lat.toFixed(6)}, {app.coordinates.lng.toFixed(6)}
                </div>
              </div>

              {canEdit && (
                <div className="applications-page__item-actions">
                  <label className="applications-page__action-label">
                    Изменить статус:
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="applications-page__status-select"
                    >
                      <option value="new">Новая</option>
                      <option value="in_progress">В работе</option>
                      <option value="completed">Выполнена</option>
                      <option value="cancelled">Отменена</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;

