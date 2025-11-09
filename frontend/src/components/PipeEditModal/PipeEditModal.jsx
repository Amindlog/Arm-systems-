import { useState, useEffect } from 'react';
import api from '../../services/api';
import './PipeEditModal.css';

const PipeEditModal = ({ pipe, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    pipe_size: '',
    pipe_length: '',
    balance_delimitation: '',
    pipe_material: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pipe) {
      setFormData({
        pipe_size: pipe.pipe_size || '',
        pipe_length: pipe.pipe_length || '',
        balance_delimitation: pipe.balance_delimitation || '',
        pipe_material: pipe.pipe_material || ''
      });
    }
  }, [pipe]);

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
      const updateData = {
        pipe_size: formData.pipe_size || null,
        balance_delimitation: formData.balance_delimitation || null,
        pipe_material: formData.pipe_material || null
      };

      // Обрабатываем pipe_length отдельно, чтобы избежать NaN
      if (formData.pipe_length && formData.pipe_length.trim() !== '') {
        const parsedLength = parseFloat(formData.pipe_length);
        if (!isNaN(parsedLength)) {
          updateData.pipe_length = parsedLength;
        } else {
          updateData.pipe_length = null;
        }
      } else {
        updateData.pipe_length = null;
      }

      console.log('Отправка данных для обновления трубы:', JSON.stringify(updateData, null, 2));
      const response = await api.put(`/map/layers/objects/${pipe.id}`, updateData);
      console.log('Ответ сервера:', response.data);

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Ошибка при обновлении трубы:', err);
      console.error('Детали ошибки:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.details || 'Ошибка при обновлении трубы');
    } finally {
      setLoading(false);
    }
  };

  if (!pipe) return null;

  return (
    <div className="pipe-edit-modal-overlay" onClick={onClose}>
      <div className="pipe-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pipe-edit-modal__header">
          <h2 className="pipe-edit-modal__title">Редактирование трубы #{pipe.id}</h2>
          <button
            className="pipe-edit-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {error && <div className="pipe-edit-modal__error">{error}</div>}

        <form onSubmit={handleSubmit} className="pipe-edit-modal__form">
          <div className="pipe-edit-modal__field">
            <label htmlFor="pipe_size" className="pipe-edit-modal__label">
              Диаметр трубы
            </label>
            <input
              type="text"
              id="pipe_size"
              name="pipe_size"
              value={formData.pipe_size}
              onChange={handleChange}
              className="pipe-edit-modal__input"
              placeholder="Например: DN100, 150мм"
            />
          </div>

          <div className="pipe-edit-modal__field">
            <label htmlFor="pipe_length" className="pipe-edit-modal__label">
              Длина трубы (м)
            </label>
            <input
              type="number"
              id="pipe_length"
              name="pipe_length"
              value={formData.pipe_length}
              onChange={handleChange}
              className="pipe-edit-modal__input"
              placeholder="Длина в метрах"
              step="0.01"
              min="0"
            />
          </div>

          <div className="pipe-edit-modal__field">
            <label htmlFor="pipe_material" className="pipe-edit-modal__label">
              Материал трубы
            </label>
            <select
              id="pipe_material"
              name="pipe_material"
              value={formData.pipe_material}
              onChange={handleChange}
              className="pipe-edit-modal__input"
            >
              <option value="">Выберите материал</option>
              <option value="plastic">Пластик</option>
              <option value="cast_iron">Чугун</option>
              <option value="steel">Сталь</option>
              <option value="asbestos_cement">Асбестоцемент</option>
              <option value="concrete">Бетон</option>
              <option value="other">Другое</option>
            </select>
          </div>

          <div className="pipe-edit-modal__field">
            <label htmlFor="balance_delimitation" className="pipe-edit-modal__label">
              Балансовое разграничение
            </label>
            <input
              type="text"
              id="balance_delimitation"
              name="balance_delimitation"
              value={formData.balance_delimitation}
              onChange={handleChange}
              className="pipe-edit-modal__input"
              placeholder="Фамилия или название компании"
            />
          </div>

          <div className="pipe-edit-modal__actions">
            <button
              type="button"
              onClick={onClose}
              className="pipe-edit-modal__button pipe-edit-modal__button--cancel"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="pipe-edit-modal__button pipe-edit-modal__button--submit"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PipeEditModal;

