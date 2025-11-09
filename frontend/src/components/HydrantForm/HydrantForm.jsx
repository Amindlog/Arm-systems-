import { useState } from 'react';
import api from '../../services/api';
import './HydrantForm.css';

const HydrantForm = ({ position, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    address: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      await api.post('/map/hydrants', {
        latitude: position.lat,
        longitude: position.lng,
        address: formData.address,
        description: formData.description
      });

      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании гидранта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hydrant-form-overlay" onClick={onClose}>
      <div className="hydrant-form" onClick={(e) => e.stopPropagation()}>
        <div className="hydrant-form__header">
          <h2 className="hydrant-form__title">Создать гидрант</h2>
          <button
            className="hydrant-form__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {error && <div className="hydrant-form__error">{error}</div>}

        <form onSubmit={handleSubmit} className="hydrant-form__form">
          <div className="hydrant-form__field">
            <label htmlFor="address" className="hydrant-form__label">
              Адрес
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="hydrant-form__input"
              placeholder="Введите адрес"
            />
          </div>

          <div className="hydrant-form__field">
            <label htmlFor="description" className="hydrant-form__label">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="hydrant-form__input hydrant-form__textarea"
              placeholder="Описание гидранта"
              rows="4"
            />
          </div>

          <div className="hydrant-form__info">
            <p><strong>Координаты:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
          </div>

          <div className="hydrant-form__actions">
            <button
              type="button"
              onClick={onClose}
              className="hydrant-form__button hydrant-form__button--cancel"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="hydrant-form__button hydrant-form__button--submit"
            >
              {loading ? 'Создание...' : 'Создать гидрант'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HydrantForm;

