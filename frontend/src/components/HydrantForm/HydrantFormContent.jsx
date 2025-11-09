import { useState } from 'react';
import api from '../../services/api';
import './HydrantForm.css';

const HydrantFormContent = ({ position, onSubmit }) => {
  const [formData, setFormData] = useState({
    address: '',
    description: '',
    status: 'working'
  });
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('latitude', position.lat);
      formDataToSend.append('longitude', position.lng);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('status', formData.status);
      
      photos.forEach((photo) => {
        formDataToSend.append('photos', photo);
      });

      await api.post('/map/hydrants', formDataToSend);

      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании гидранта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hydrant-form-content">
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
          <label htmlFor="status" className="hydrant-form__label">
            Статус <span className="hydrant-form__required">*</span>
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="hydrant-form__input"
          >
            <option value="working">Рабочий</option>
            <option value="not_working">Не рабочий</option>
            <option value="needs_repair">Требует ремонт</option>
          </select>
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

        <div className="hydrant-form__field">
          <label htmlFor="photos" className="hydrant-form__label">
            Фото
          </label>
          <input
            type="file"
            id="photos"
            name="photos"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="hydrant-form__input hydrant-form__file-input"
          />
          {photos.length > 0 && (
            <div className="hydrant-form__photos-preview">
              <p>Выбрано фото: {photos.length}</p>
              <div className="hydrant-form__photos-list">
                {photos.map((photo, index) => (
                  <div key={index} className="hydrant-form__photo-preview">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="hydrant-form__photo-thumb"
                    />
                    <span className="hydrant-form__photo-name">{photo.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hydrant-form__info">
          <p><strong>Координаты:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
        </div>

        <div className="hydrant-form__actions">
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
  );
};

export default HydrantFormContent;

