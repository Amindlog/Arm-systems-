import { useState } from 'react';
import './MapToolsPanel.css';

const MapToolsPanel = ({ onAddModeChange, activeMode }) => {
  const [layerType, setLayerType] = useState('water');
  const [objectType, setObjectType] = useState('well');
  const [isAdding, setIsAdding] = useState(false);

  const handleLayerChange = (e) => {
    const newLayerType = e.target.value;
    setLayerType(newLayerType);
    if (isAdding) {
      onAddModeChange({ layerType: newLayerType, objectType, isActive: true });
    }
  };

  const handleObjectTypeChange = (e) => {
    const newObjectType = e.target.value;
    setObjectType(newObjectType);
    if (isAdding) {
      onAddModeChange({ layerType, objectType: newObjectType, isActive: true });
    }
  };

  const handleAddToggle = () => {
    const newIsAdding = !isAdding;
    setIsAdding(newIsAdding);
    if (newIsAdding) {
      onAddModeChange({ layerType, objectType, isActive: true });
    } else {
      onAddModeChange({ layerType: null, objectType: null, isActive: false });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    onAddModeChange({ layerType: null, objectType: null, isActive: false });
  };

  return (
    <div className="map-tools-panel">
      <div className="map-tools-panel__content">
        <div className="map-tools-panel__field">
          <label htmlFor="layer-type" className="map-tools-panel__label">
            Слой
          </label>
          <select
            id="layer-type"
            value={layerType}
            onChange={handleLayerChange}
            className="map-tools-panel__select"
            disabled={isAdding}
          >
            <option value="water">Водопровод</option>
            <option value="sewer">Канализация</option>
          </select>
        </div>

        <div className="map-tools-panel__field">
          <label htmlFor="object-type" className="map-tools-panel__label">
            Тип объекта
          </label>
          <select
            id="object-type"
            value={objectType}
            onChange={handleObjectTypeChange}
            className="map-tools-panel__select"
            disabled={isAdding}
          >
            <option value="well">Колодец</option>
            <option value="chamber">Камера</option>
            <option value="line">Линия</option>
          </select>
        </div>

        <div className="map-tools-panel__actions">
          {!isAdding ? (
            <button
              onClick={handleAddToggle}
              className="map-tools-panel__button map-tools-panel__button--add"
            >
              Добавить
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="map-tools-panel__button map-tools-panel__button--cancel"
              >
                Отмена
              </button>
              <div className="map-tools-panel__active-indicator">
                Режим добавления активен
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapToolsPanel;

