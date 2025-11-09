import { useState, useEffect } from 'react';
import api from '../services/api';
import { authService } from '../services/auth';
import './HydrantsPage.css';

const HydrantsPage = () => {
  const [hydrants, setHydrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    address: '',
    description: '',
    latitude: '',
    longitude: '',
    status: 'working'
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadHydrants();
  }, []);

  const loadHydrants = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/map/hydrants');
      setHydrants(response.data.hydrants || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при загрузке гидрантов');
      console.error('Error loading hydrants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (hydrant) => {
    setEditingId(hydrant.id);
    setFormData({
      address: hydrant.address || '',
      description: hydrant.description || '',
      latitude: hydrant.coordinates.lat.toString(),
      longitude: hydrant.coordinates.lng.toString(),
      status: hydrant.status || 'working'
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      address: '',
      description: '',
      latitude: '',
      longitude: '',
      status: 'working'
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.latitude || !formData.longitude) {
      setError('Координаты обязательны');
      return;
    }

    try {
      if (editingId) {
        // Обновление существующего гидранта
        await api.put(`/map/hydrants/${editingId}`, {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          description: formData.description,
          address: formData.address,
          status: formData.status
        });
      } else {
        // Создание нового гидранта
        const formDataToSend = new FormData();
        formDataToSend.append('latitude', formData.latitude);
        formDataToSend.append('longitude', formData.longitude);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('address', formData.address);
        formDataToSend.append('status', formData.status);
        
        await api.post('/map/hydrants', formDataToSend);
      }
      await loadHydrants();
      handleCancel();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при сохранении гидранта');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот гидрант?')) {
      return;
    }

    try {
      await api.delete(`/map/hydrants/${id}`);
      await loadHydrants();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при удалении гидранта');
    }
  };

  const user = authService.getUser();
  const canEdit = user && (user.role === 'director' || user.role === 'dispatcher');
  const canDelete = user && user.role === 'director';

  if (loading) {
    return <div className="hydrants-page__loading">Загрузка гидрантов...</div>;
  }

  return (
    <div className="hydrants-page">
      <div className="hydrants-page__header">
        <div className="hydrants-page__header-top">
          <h2 className="hydrants-page__title">Гидранты</h2>
          {canEdit && (
            <button 
              onClick={() => setShowAddForm(true)} 
              className="hydrants-page__add-button"
            >
              + Добавить гидрант
            </button>
          )}
        </div>
        {error && <div className="hydrants-page__error">{error}</div>}
      </div>

      {showAddForm && (
        <div className="hydrants-page__form-container">
          <form onSubmit={handleSubmit} className="hydrants-page__form">
            <h3 className="hydrants-page__form-title">Добавить гидрант</h3>
            <div className="hydrants-page__form-field">
              <label htmlFor="address" className="hydrants-page__form-label">
                Адрес <span className="hydrants-page__required">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="hydrants-page__form-input"
                placeholder="Введите адрес"
              />
            </div>
            <div className="hydrants-page__form-field">
              <label htmlFor="latitude" className="hydrants-page__form-label">
                Широта <span className="hydrants-page__required">*</span>
              </label>
              <input
                type="number"
                step="any"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                required
                className="hydrants-page__form-input"
                placeholder="56.4767"
              />
            </div>
            <div className="hydrants-page__form-field">
              <label htmlFor="longitude" className="hydrants-page__form-label">
                Долгота <span className="hydrants-page__required">*</span>
              </label>
              <input
                type="number"
                step="any"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                required
                className="hydrants-page__form-input"
                placeholder="53.8036"
              />
            </div>
            <div className="hydrants-page__form-field">
              <label htmlFor="status" className="hydrants-page__form-label">
                Статус <span className="hydrants-page__required">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="hydrants-page__form-input"
              >
                <option value="working">Рабочий</option>
                <option value="not_working">Не рабочий</option>
                <option value="needs_repair">Требует ремонт</option>
              </select>
            </div>
            <div className="hydrants-page__form-field">
              <label htmlFor="description" className="hydrants-page__form-label">
                Описание
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="hydrants-page__form-input hydrants-page__form-textarea"
                placeholder="Описание гидранта"
                rows="3"
              />
            </div>
            <div className="hydrants-page__form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="hydrants-page__button hydrants-page__button--cancel"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="hydrants-page__button hydrants-page__button--submit"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="hydrants-page__list">
        {hydrants.length === 0 ? (
          <div className="hydrants-page__empty">Гидранты не найдены</div>
        ) : (
          hydrants.map((hydrant) => (
            <div key={hydrant.id} className="hydrants-page__item">
              {editingId === hydrant.id ? (
                <form onSubmit={handleSubmit} className="hydrants-page__form">
                  <h3 className="hydrants-page__form-title">Редактировать гидрант #{hydrant.id}</h3>
                  <div className="hydrants-page__form-field">
                    <label htmlFor="edit-address" className="hydrants-page__form-label">
                      Адрес <span className="hydrants-page__required">*</span>
                    </label>
                    <input
                      type="text"
                      id="edit-address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="hydrants-page__form-input"
                    />
                  </div>
                  <div className="hydrants-page__form-field">
                    <label htmlFor="edit-latitude" className="hydrants-page__form-label">
                      Широта <span className="hydrants-page__required">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="edit-latitude"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      required
                      className="hydrants-page__form-input"
                    />
                  </div>
                  <div className="hydrants-page__form-field">
                    <label htmlFor="edit-longitude" className="hydrants-page__form-label">
                      Долгота <span className="hydrants-page__required">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="edit-longitude"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      required
                      className="hydrants-page__form-input"
                    />
                  </div>
                  <div className="hydrants-page__form-field">
                    <label htmlFor="edit-status" className="hydrants-page__form-label">
                      Статус <span className="hydrants-page__required">*</span>
                    </label>
                    <select
                      id="edit-status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      required
                      className="hydrants-page__form-input"
                    >
                      <option value="working">Рабочий</option>
                      <option value="not_working">Не рабочий</option>
                      <option value="needs_repair">Требует ремонт</option>
                    </select>
                  </div>
                  <div className="hydrants-page__form-field">
                    <label htmlFor="edit-description" className="hydrants-page__form-label">
                      Описание
                    </label>
                    <textarea
                      id="edit-description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="hydrants-page__form-input hydrants-page__form-textarea"
                      rows="3"
                    />
                  </div>
                  <div className="hydrants-page__form-actions">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="hydrants-page__button hydrants-page__button--cancel"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="hydrants-page__button hydrants-page__button--submit"
                    >
                      Сохранить
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="hydrants-page__item-header">
                    <h3 className="hydrants-page__item-title">Гидрант #{hydrant.id}</h3>
                    <div className="hydrants-page__item-actions">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(hydrant)}
                          className="hydrants-page__action-button hydrants-page__action-button--edit"
                        >
                          Редактировать
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(hydrant.id)}
                          className="hydrants-page__action-button hydrants-page__action-button--delete"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="hydrants-page__item-content">
                    {hydrant.address && (
                      <div className="hydrants-page__item-field">
                        <strong>Адрес:</strong> {hydrant.address}
                      </div>
                    )}
                    {hydrant.status && (
                      <div className="hydrants-page__item-field">
                        <strong>Статус:</strong> 
                        {canEdit ? (
                          <select
                            value={hydrant.status}
                            onChange={async (e) => {
                              try {
                                await api.put(`/map/hydrants/${hydrant.id}`, {
                                  status: e.target.value
                                });
                                await loadHydrants();
                              } catch (err) {
                                setError(err.response?.data?.error || 'Ошибка при изменении статуса');
                              }
                            }}
                            className="hydrants-page__status-select"
                          >
                            <option value="working">Рабочий</option>
                            <option value="not_working">Не рабочий</option>
                            <option value="needs_repair">Требует ремонт</option>
                          </select>
                        ) : (
                          <span className={`hydrants-page__status hydrants-page__status--${hydrant.status}`}>
                            {hydrant.status === 'working' ? 'Рабочий' : 
                             hydrant.status === 'not_working' ? 'Не рабочий' : 
                             hydrant.status === 'needs_repair' ? 'Требует ремонт' : hydrant.status}
                          </span>
                        )}
                      </div>
                    )}
                    {hydrant.description && (
                      <div className="hydrants-page__item-field">
                        <strong>Описание:</strong> {hydrant.description}
                      </div>
                    )}
                    <div className="hydrants-page__item-field">
                      <strong>Координаты:</strong> {hydrant.coordinates.lat.toFixed(6)}, {hydrant.coordinates.lng.toFixed(6)}
                    </div>
                    {hydrant.photos && hydrant.photos.length > 0 && (
                      <div className="hydrants-page__item-field">
                        <strong>Фото:</strong>
                        <div className="hydrants-page__photos">
                          {hydrant.photos.map((photo) => (
                            <div key={photo.id} className="hydrants-page__photo-item">
                              <img
                                src={`http://localhost:5000${photo.path}`}
                                alt={`Гидрант #${hydrant.id}`}
                                className="hydrants-page__photo-thumb"
                                onClick={() => window.open(`http://localhost:5000${photo.path}`, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="hydrants-page__item-field">
                      <strong>Создан:</strong> {new Date(hydrant.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HydrantsPage;

