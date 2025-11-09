import { useState } from 'react';
import MapToolsPanel from '../MapToolsPanel/MapToolsPanel';
import LayerControls from '../LayerControls/LayerControls';
import './SidePanel.css';

const SidePanel = ({ onAddModeChange, addMode, onLayerVisibilityChange, layerVisibility, onLineBuildingModeChange, lineBuildingMode, onHouseReleaseModeChange, houseReleaseMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tools');

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Кнопка для открытия/закрытия панели */}
      <button
        className={`side-panel__toggle ${isOpen ? 'side-panel__toggle--open' : ''}`}
        onClick={togglePanel}
        aria-label={isOpen ? 'Закрыть панель' : 'Открыть панель'}
        title={isOpen ? 'Закрыть панель' : 'Открыть панель'}
      >
        {isOpen ? '▶' : '◀'}
      </button>

      {/* Панель */}
      <div className={`side-panel ${isOpen ? 'side-panel--open' : ''}`}>
        <div className="side-panel__header">
          <h3 className="side-panel__title">Панель управления</h3>
        </div>

        {/* Вкладки */}
        <div className="side-panel__tabs">
          <button
            className={`side-panel__tab ${activeTab === 'tools' ? 'side-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            Инструменты
          </button>
          <button
            className={`side-panel__tab ${activeTab === 'layers' ? 'side-panel__tab--active' : ''}`}
            onClick={() => setActiveTab('layers')}
          >
            Слои
          </button>
        </div>

        {/* Содержимое вкладок */}
        <div className="side-panel__content">
          {activeTab === 'tools' && (
            <div className="side-panel__tab-content">
              <MapToolsPanel
                onAddModeChange={onAddModeChange}
                activeMode={addMode}
                onLineBuildingModeChange={onLineBuildingModeChange}
                lineBuildingMode={lineBuildingMode}
                onHouseReleaseModeChange={onHouseReleaseModeChange}
                houseReleaseMode={houseReleaseMode}
              />
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="side-panel__tab-content">
              <LayerControls
                onVisibilityChange={onLayerVisibilityChange}
                initialVisibility={layerVisibility}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SidePanel;

