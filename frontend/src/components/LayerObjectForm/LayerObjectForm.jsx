import { useState, useEffect } from 'react';
import api from '../../services/api';
import './LayerObjectForm.css';

const LayerObjectForm = ({ position, address, layerType, objectType, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    address: address || '',
    description: '',
    pipe_size: '',
    pipe_material: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Обновляем адрес при изменении пропса
  useEffect(() => {
    if (address) {
      setFormData(prev => ({
        ...prev,
        address: address
      }));
    }
  }, [address]);

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
      // Создаем GeoJSON в зависимости от типа объекта
      let geojson;
      if (objectType === 'line') {
        // Для линии нужны 2 точки
        if (position.startPoint && position.endPoint) {
          // Две точки - создаем линию между ними
          geojson = {
            type: 'LineString',
            coordinates: [
              [position.startPoint.lng, position.startPoint.lat],
              [position.endPoint.lng, position.endPoint.lat]
            ]
          };
        } else {
          // Если только одна точка - используем ее для обеих координат (временное решение)
          geojson = {
            type: 'LineString',
            coordinates: [[position.lng, position.lat], [position.lng, position.lat]]
          };
        }
      } else {
        // Для колодца и камеры - точка
        geojson = {
          type: 'Point',
          coordinates: [position.lng, position.lat]
        };
      }

      await api.post('/map/layers/objects', {
        layer_type: layerType,
        object_type: objectType,
        geojson: geojson,
        address: formData.address,
        description: formData.description,
        pipe_size: objectType === 'line' ? formData.pipe_size : null,
        pipe_material: objectType === 'line' ? formData.pipe_material : null
      });

      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании объекта');
    } finally {
      setLoading(false);
    }
  };

  const getObjectTypeName = () => {
    const names = {
      well: 'Колодец',
      chamber: 'Камера',
      line: 'Линия'
    };
    return names[objectType] || objectType;
  };

  const getLayerTypeName = () => {
    return layerType === 'water' ? 'Водопровод' : 'Канализация';
  };

  return (
    <div className="layer-object-form-overlay" onClick={onClose}>
      <div className="layer-object-form" onClick={(e) => e.stopPropagation()}>
        <div className="layer-object-form__header">
          <h2 className="layer-object-form__title">
            Добавить {getObjectTypeName()} ({getLayerTypeName()})
          </h2>
          <button
            className="layer-object-form__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {error && <div className="layer-object-form__error">{error}</div>}

        <form onSubmit={handleSubmit} className="layer-object-form__form">
          <div className="layer-object-form__field">
            <label htmlFor="address" className="layer-object-form__label">
              Адрес
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="layer-object-form__input"
              placeholder="Введите адрес"
            />
          </div>

          {(objectType === 'well' || objectType === 'chamber') && (
            <div className="layer-object-form__field">
              <label htmlFor="description" className="layer-object-form__label">
                Описание
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="layer-object-form__input layer-object-form__textarea"
                placeholder="Описание объекта"
                rows="4"
              />
            </div>
          )}

          {objectType === 'line' && (
            <>
              <div className="layer-object-form__field">
                <label htmlFor="pipe_size" className="layer-object-form__label">
                  Размер трубы
                </label>
                <input
                  type="text"
                  id="pipe_size"
                  name="pipe_size"
                  value={formData.pipe_size}
                  onChange={handleChange}
                  className="layer-object-form__input"
                  placeholder="Например: DN100, 150мм"
                />
              </div>
              <div className="layer-object-form__field">
                <label htmlFor="pipe_material" className="layer-object-form__label">
                  Материал трубы
                </label>
                <select
                  id="pipe_material"
                  name="pipe_material"
                  value={formData.pipe_material}
                  onChange={handleChange}
                  className="layer-object-form__input"
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
              <div className="layer-object-form__field">
                <label htmlFor="description" className="layer-object-form__label">
                  Описание
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="layer-object-form__input layer-object-form__textarea"
                  placeholder="Описание линии"
                  rows="4"
                />
              </div>
            </>
          )}

          <div className="layer-object-form__info">
            <p><strong>Тип:</strong> {getObjectTypeName()}</p>
            <p><strong>Слой:</strong> {getLayerTypeName()}</p>
            {objectType === 'line' && position.startPoint && position.endPoint ? (
              <>
                <p><strong>Начальная точка:</strong> {position.startPoint.lat.toFixed(6)}, {position.startPoint.lng.toFixed(6)}</p>
                <p><strong>Конечная точка:</strong> {position.endPoint.lat.toFixed(6)}, {position.endPoint.lng.toFixed(6)}</p>
              </>
            ) : (
              <p><strong>Координаты:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
            )}
            {objectType === 'line' && (!position.startPoint || !position.endPoint) && (
              <p className="layer-object-form__note">
                Примечание: Для линии нужно выбрать две точки на карте.
              </p>
            )}
          </div>

          <div className="layer-object-form__actions">
            <button
              type="button"
              onClick={onClose}
              className="layer-object-form__button layer-object-form__button--cancel"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="layer-object-form__button layer-object-form__button--submit"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LayerObjectForm;

