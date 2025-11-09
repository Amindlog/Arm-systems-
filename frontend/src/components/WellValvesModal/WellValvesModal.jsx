import { useState, useEffect } from 'react';
import api from '../../services/api';
import { authService } from '../../services/auth';
import './WellValvesModal.css';

const WellValvesModal = ({ wellId, wellInfo, onClose, onUpdate }) => {
  const [valves, setValves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingValve, setEditingValve] = useState(null);
  const [formData, setFormData] = useState({
    valve_type: '',
    valve_number: '',
    status: 'working',
    description: ''
  });

  useEffect(() => {
    loadValves();
  }, [wellId]);

  const loadValves = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/map/layers/objects/${wellId}/valves`);
      setValves(response.data.valves || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при загрузке задвижек');
    } finally {
      setLoading(false);
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

    try {
      if (editingValve) {
        await api.put(`/map/layers/objects/${wellId}/valves/${editingValve.id}`, formData);
      } else {
        await api.post(`/map/layers/objects/${wellId}/valves`, formData);
      }
      await loadValves();
      setShowForm(false);
      setEditingValve(null);
      setFormData({
        valve_type: '',
        valve_number: '',
        status: 'working',
        description: ''
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при сохранении задвижки');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (valve) => {
    setEditingValve(valve);
    setFormData({
      valve_type: valve.valve_type || '',
      valve_number: valve.valve_number || '',
      status: valve.status || 'working',
      description: valve.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (valveId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задвижку?')) {
      return;
    }

    try {
      await api.delete(`/map/layers/objects/${wellId}/valves/${valveId}`);
      await loadValves();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при удалении задвижки');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingValve(null);
    setFormData({
      valve_type: '',
      valve_number: '',
      status: 'working',
      description: ''
    });
  };

  const user = authService.getUser();
  const canEdit = user && (user.role === 'director' || user.role === 'dispatcher');

  return (
    <div className="well-valves-modal-overlay" onClick={onClose}>
      <div className="well-valves-modal" onClick={(e) => e.stopPropagation()}>
        <div className="well-valves-modal__header">
          <h2 className="well-valves-modal__title">
            Задвижки колодца #{wellId}
          </h2>
          <button
            className="well-valves-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {wellInfo && (
          <div className="well-valves-modal__info">
            {wellInfo.address && (
              <p><strong>Адрес:</strong> {wellInfo.address}</p>
            )}
            {wellInfo.description && (
              <p><strong>Описание:</strong> {wellInfo.description}</p>
            )}
          </div>
        )}

        {error && <div className="well-valves-modal__error">{error}</div>}

        {canEdit && !showForm && (
          <div className="well-valves-modal__actions">
            <button
              className="well-valves-modal__button well-valves-modal__button--add"
              onClick={() => setShowForm(true)}
            >
              Добавить задвижку
            </button>
          </div>
        )}

        {showForm && canEdit && (
          <form onSubmit={handleSubmit} className="well-valves-modal__form">
            <div className="well-valves-modal__field">
              <label htmlFor="valve_number" className="well-valves-modal__label">
                Номер задвижки
              </label>
              <input
                type="text"
                id="valve_number"
                name="valve_number"
                value={formData.valve_number}
                onChange={handleChange}
                className="well-valves-modal__input"
                placeholder="Например: 1, 2, 3"
              />
            </div>

            <div className="well-valves-modal__field">
              <label htmlFor="valve_type" className="well-valves-modal__label">
                Тип задвижки
              </label>
              <input
                type="text"
                id="valve_type"
                name="valve_type"
                value={formData.valve_type}
                onChange={handleChange}
                className="well-valves-modal__input"
                placeholder="Например: шаровый, клиновый"
              />
            </div>

            <div className="well-valves-modal__field">
              <label htmlFor="status" className="well-valves-modal__label">
                Статус <span className="well-valves-modal__required">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="well-valves-modal__input"
              >
                <option value="working">Рабочая</option>
                <option value="not_working">Не рабочая</option>
                <option value="needs_repair">Требует ремонт</option>
              </select>
            </div>

            <div className="well-valves-modal__field">
              <label htmlFor="description" className="well-valves-modal__label">
                Описание
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="well-valves-modal__input well-valves-modal__textarea"
                placeholder="Описание задвижки"
                rows="3"
              />
            </div>

            <div className="well-valves-modal__form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="well-valves-modal__button well-valves-modal__button--cancel"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="well-valves-modal__button well-valves-modal__button--submit"
              >
                {loading ? 'Сохранение...' : editingValve ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </form>
        )}

        {loading && !showForm ? (
          <div className="well-valves-modal__loading">Загрузка...</div>
        ) : (
          <div className="well-valves-modal__list">
            {valves.length === 0 ? (
              <div className="well-valves-modal__empty">
                Задвижки не добавлены
              </div>
            ) : (
              valves.map((valve) => (
                <div key={valve.id} className="well-valves-modal__item">
                  <div className="well-valves-modal__item-header">
                    <div className="well-valves-modal__item-title">
                      {valve.valve_number ? `Задвижка №${valve.valve_number}` : 'Задвижка'}
                      {valve.valve_type && ` (${valve.valve_type})`}
                    </div>
                    <span className={`well-valves-modal__status well-valves-modal__status--${valve.status}`}>
                      {valve.status === 'working' ? 'Рабочая' : 
                       valve.status === 'not_working' ? 'Не рабочая' : 
                       'Требует ремонт'}
                    </span>
                  </div>
                  {valve.description && (
                    <div className="well-valves-modal__item-description">
                      {valve.description}
                    </div>
                  )}
                  {canEdit && (
                    <div className="well-valves-modal__item-actions">
                      <button
                        onClick={() => handleEdit(valve)}
                        className="well-valves-modal__button well-valves-modal__button--edit"
                      >
                        Редактировать
                      </button>
                      {user.role === 'director' && (
                        <button
                          onClick={() => handleDelete(valve.id)}
                          className="well-valves-modal__button well-valves-modal__button--delete"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WellValvesModal;

