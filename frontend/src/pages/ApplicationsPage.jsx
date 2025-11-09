import { useState, useEffect } from 'react';
import api from '../services/api';
import { authService } from '../services/auth';
import ApplicationEditModal from '../components/ApplicationEditModal/ApplicationEditModal';
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
  const [expandedApplications, setExpandedApplications] = useState(new Set());
  const [editingApplication, setEditingApplication] = useState(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState(null);

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

  const handleEdit = (application) => {
    setEditingApplication(application);
  };

  const handleEditClose = () => {
    setEditingApplication(null);
  };

  const handleEditSubmit = async () => {
    await loadData();
    setEditingApplication(null);
  };

  const handleDelete = async (applicationId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту заявку?')) {
      return;
    }

    try {
      setDeletingApplicationId(applicationId);
      await api.delete(`/applications/${applicationId}`);
      await loadData();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при удалении заявки');
    } finally {
      setDeletingApplicationId(null);
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

  const getTeamBorderClass = (teamName) => {
    // Цвет левой полосы зависит от бригады
    if (!teamName) {
      return 'applications-page__item--no-team';
    }
    
    const normalizedName = teamName.toLowerCase().trim();
    
    if (normalizedName === 'водосеть') {
      return 'applications-page__item--water';
    } else if (normalizedName === 'канализация') {
      return 'applications-page__item--sewer';
    }
    
    return 'applications-page__item--no-team';
  };

  const toggleApplication = (applicationId) => {
    setExpandedApplications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId);
      } else {
        newSet.add(applicationId);
      }
      return newSet;
    });
  };

  const isExpanded = (applicationId) => {
    return expandedApplications.has(applicationId);
  };

  const user = authService.getUser();
  const canEdit = user && (user.role === 'director' || user.role === 'dispatcher');
  const canDelete = user && user.role === 'director';

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
          applications.map((app) => {
            const expanded = isExpanded(app.id);
            return (
              <div 
                key={app.id} 
                className={`applications-page__item ${getTeamBorderClass(app.team?.name)}`}
              >
                <div className="applications-page__item-header">
                  <div 
                    onClick={() => toggleApplication(app.id)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}
                  >
                    <span className={`applications-page__arrow ${expanded ? 'applications-page__arrow--expanded' : ''}`}>
                      ▶
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <h3 className="applications-page__item-title">
                        {new Date(app.created_at).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </h3>
                      {app.address && (
                        <span className="applications-page__item-subtitle">
                          {app.address}
                        </span>
                      )}
                      {app.submitted_by && (
                        <span className="applications-page__item-subtitle">
                          Подал: {app.submitted_by}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {canEdit && (
                      <select
                        value={app.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(app.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`applications-page__status-select applications-page__status-select--header applications-page__status-select--${app.status === 'in_progress' ? 'in-progress' : app.status}`}
                      >
                        <option value="new">Новая</option>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Выполнена</option>
                        <option value="cancelled">Отменена</option>
                      </select>
                    )}
                    {!canEdit && (
                      <span className={`applications-page__status ${getStatusClass(app.status)}`}>
                        {getStatusName(app.status)}
                      </span>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(app);
                        }}
                        className="applications-page__icon-button applications-page__icon-button--edit"
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(app.id);
                        }}
                        disabled={deletingApplicationId === app.id}
                        className="applications-page__icon-button applications-page__icon-button--delete"
                        title="Удалить"
                      >
                        {deletingApplicationId === app.id ? '⏳' : '🗑️'}
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="applications-page__item-content" style={{ marginTop: '12px' }}>
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
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Модальное окно редактирования заявки */}
      {editingApplication && (
        <ApplicationEditModal
          application={editingApplication}
          onClose={handleEditClose}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
};

export default ApplicationsPage;

