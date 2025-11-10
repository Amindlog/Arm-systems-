import { useState, useEffect } from 'react';
import api from '../services/api';
import { authService } from '../services/auth';
import ApplicationEditModal from '../components/ApplicationEditModal/ApplicationEditModal';
import './ApplicationsPage.css';

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [teams, setTeams] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    new: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    team_id: '',
    date_from: '',
    date_to: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedApplications, setExpandedApplications] = useState(new Set());
  const [editingApplication, setEditingApplication] = useState(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState(null);
  const [editingCompletedAt, setEditingCompletedAt] = useState(null);

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
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      // Параметры для статистики - всегда все заявки без фильтров
      const [applicationsResponse, teamsResponse, statsResponse] = await Promise.all([
        api.get(`/applications?${params.toString()}`),
        api.get('/applications/teams/list'),
        api.get('/applications')
      ]);

      setApplications(applicationsResponse.data.applications || []);
      setTeams(teamsResponse.data.teams || []);

      // Подсчет статистики из всех заявок (без фильтра по статусу)
      const allApps = statsResponse.data.applications || [];
      const counts = {
        new: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      };
      
      allApps.forEach(app => {
        if (counts.hasOwnProperty(app.status)) {
          counts[app.status]++;
        }
      });
      
      setStatusCounts(counts);
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

  const handleCompletedAtChange = async (applicationId, newCompletedAt) => {
    try {
      await api.put(`/applications/${applicationId}`, { 
        completed_at: newCompletedAt ? new Date(newCompletedAt).toISOString() : null 
      });
      setEditingCompletedAt(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при обновлении времени закрытия');
      setEditingCompletedAt(null);
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
      cancelled: 'Ложная'
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

  const formatCompletedAt = (completedAt) => {
    if (!completedAt) return '';
    return new Date(completedAt).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
  const canEditCompletedAt = user && user.role === 'director';


  if (loading) {
    return <div className="applications-page__loading">Загрузка заявок...</div>;
  }

  return (
    <div className="applications-page">
      <div className="applications-page__header">
        <h2 className="applications-page__title">Список заявок</h2>
        {error && <div className="applications-page__error">{error}</div>}
      </div>

      <div className="applications-page__stats">
        <div 
          className={`applications-page__stat-item applications-page__stat-item--new ${filters.status === 'new' ? 'applications-page__stat-item--active' : ''}`}
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'new' ? '' : 'new'
            }));
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="applications-page__stat-label">Новых:</span>
          <span className="applications-page__stat-value">{statusCounts.new}</span>
        </div>
        <div 
          className={`applications-page__stat-item applications-page__stat-item--in-progress ${filters.status === 'in_progress' ? 'applications-page__stat-item--active' : ''}`}
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'in_progress' ? '' : 'in_progress'
            }));
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="applications-page__stat-label">В работе:</span>
          <span className="applications-page__stat-value">{statusCounts.in_progress}</span>
        </div>
        <div 
          className={`applications-page__stat-item applications-page__stat-item--completed ${filters.status === 'completed' ? 'applications-page__stat-item--active' : ''}`}
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'completed' ? '' : 'completed'
            }));
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="applications-page__stat-label">Выполненных:</span>
          <span className="applications-page__stat-value">{statusCounts.completed}</span>
        </div>
        <div 
          className={`applications-page__stat-item applications-page__stat-item--cancelled ${filters.status === 'cancelled' ? 'applications-page__stat-item--active' : ''}`}
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              status: prev.status === 'cancelled' ? '' : 'cancelled'
            }));
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="applications-page__stat-label">Ложных:</span>
          <span className="applications-page__stat-value">{statusCounts.cancelled}</span>
        </div>
      </div>

      <div className="applications-page__filters">
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

        <div className="applications-page__filter">
          <label htmlFor="date-from" className="applications-page__filter-label">
            От:
          </label>
          <input
            type="date"
            id="date-from"
            name="date_from"
            value={filters.date_from}
            onChange={handleFilterChange}
            className="applications-page__filter-select"
          />
        </div>

        <div className="applications-page__filter">
          <label htmlFor="date-to" className="applications-page__filter-label">
            До:
          </label>
          <input
            type="date"
            id="date-to"
            name="date_to"
            value={filters.date_to}
            onChange={handleFilterChange}
            className="applications-page__filter-select"
          />
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
                      {app.phone && (
                        <span className="applications-page__item-subtitle">
                          Телефон: {app.phone}
                        </span>
                      )}
                      {!expanded && app.status === 'completed' && app.completed_at && (
                        <span className="applications-page__item-subtitle applications-page__item-subtitle--completed">
                          {editingCompletedAt === app.id ? (
                            <input
                              type="datetime-local"
                              defaultValue={formatDateForInput(app.completed_at)}
                              onBlur={(e) => {
                                if (e.target.value) {
                                  handleCompletedAtChange(app.id, e.target.value);
                                } else {
                                  setEditingCompletedAt(null);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (e.target.value) {
                                    handleCompletedAtChange(app.id, e.target.value);
                                  } else {
                                    setEditingCompletedAt(null);
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingCompletedAt(null);
                                }
                              }}
                              autoFocus
                              className="applications-page__completed-at-input"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span 
                              onClick={(e) => {
                                if (canEditCompletedAt) {
                                  e.stopPropagation();
                                  setEditingCompletedAt(app.id);
                                }
                              }}
                              className={canEditCompletedAt ? 'applications-page__completed-at--editable' : ''}
                            >
                              Закрыта: {formatCompletedAt(app.completed_at)}
                            </span>
                          )}
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
                        <option value="cancelled">Ложная</option>
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

                    {app.phone && (
                      <div className="applications-page__item-field">
                        <strong>Телефон:</strong> {app.phone}
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

                    {app.completed_at && (
                      <div className="applications-page__item-field">
                        <strong>Время выполнения:</strong> {formatCompletedAt(app.completed_at)}
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

