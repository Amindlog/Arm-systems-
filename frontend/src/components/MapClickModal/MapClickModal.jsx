import { useState } from 'react';
import ApplicationFormContent from '../ApplicationForm/ApplicationFormContent';
import HydrantFormContent from '../HydrantForm/HydrantFormContent';
import './MapClickModal.css';

const MapClickModal = ({ position, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState('application'); // 'application' или 'hydrant'

  const handleApplicationSubmit = async () => {
    await onSubmit();
  };

  const handleHydrantSubmit = async () => {
    await onSubmit();
  };

  return (
    <div className="map-click-modal-overlay" onClick={onClose}>
      <div className="map-click-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-click-modal__header">
          <h2 className="map-click-modal__title">Создать</h2>
          <button
            className="map-click-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Вкладки */}
        <div className="map-click-modal__tabs">
          <button
            className={`map-click-modal__tab ${
              activeTab === 'application' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('application')}
          >
            Заявка
          </button>
          <button
            className={`map-click-modal__tab ${
              activeTab === 'hydrant' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('hydrant')}
          >
            Гидрант
          </button>
        </div>

        {/* Содержимое вкладок */}
        <div className="map-click-modal__content">
          {activeTab === 'application' ? (
            <ApplicationFormContent
              position={position}
              onSubmit={handleApplicationSubmit}
            />
          ) : (
            <HydrantFormContent
              position={position}
              onSubmit={handleHydrantSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MapClickModal;

