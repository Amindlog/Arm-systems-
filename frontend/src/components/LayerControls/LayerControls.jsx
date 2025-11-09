import { useState } from 'react';
import './LayerControls.css';

const LayerControls = ({ onVisibilityChange, initialVisibility }) => {
  const [visibility, setVisibility] = useState({
    water: initialVisibility?.water !== false,
    sewer: initialVisibility?.sewer !== false,
    hydrants: initialVisibility?.hydrants === true
  });

  const handleVisibilityChange = (layerType, isVisible) => {
    const newVisibility = {
      ...visibility,
      [layerType]: isVisible
    };
    setVisibility(newVisibility);
    onVisibilityChange(newVisibility);
  };

  return (
    <div className="layer-controls">
      <div className="layer-controls__header">
        <h3 className="layer-controls__title">Слои</h3>
      </div>

      <div className="layer-controls__content">
        <label className="layer-controls__checkbox">
          <input
            type="checkbox"
            checked={visibility.water}
            onChange={(e) => handleVisibilityChange('water', e.target.checked)}
            className="layer-controls__input"
          />
          <span className="layer-controls__label">
            <span className="layer-controls__indicator layer-controls__indicator--water"></span>
            Водопровод
          </span>
        </label>

        <label className="layer-controls__checkbox">
          <input
            type="checkbox"
            checked={visibility.sewer}
            onChange={(e) => handleVisibilityChange('sewer', e.target.checked)}
            className="layer-controls__input"
          />
          <span className="layer-controls__label">
            <span className="layer-controls__indicator layer-controls__indicator--sewer"></span>
            Канализация
          </span>
        </label>

        <label className="layer-controls__checkbox">
          <input
            type="checkbox"
            checked={visibility.hydrants}
            onChange={(e) => handleVisibilityChange('hydrants', e.target.checked)}
            className="layer-controls__input"
          />
          <span className="layer-controls__label">
            <span className="layer-controls__indicator layer-controls__indicator--hydrants"></span>
            ПГ (Пожарные гидранты)
          </span>
        </label>
      </div>
    </div>
  );
};

export default LayerControls;

