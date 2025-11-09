import { useState, useEffect } from 'react';
import { cities, getDefaultCity, saveSelectedCity } from '../../config/cities';
import './CitySelector.css';

const CitySelector = ({ onCityChange }) => {
  const [selectedCity, setSelectedCity] = useState(getDefaultCity());

  useEffect(() => {
    // При загрузке компонента устанавливаем город по умолчанию
    if (onCityChange) {
      onCityChange(selectedCity);
    }
  }, []);

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    const city = cities.find(c => c.id === cityId);
    
    if (city) {
      setSelectedCity(city);
      saveSelectedCity(cityId);
      if (onCityChange) {
        onCityChange(city);
      }
      // Отправляем событие для обновления карты
      window.dispatchEvent(new CustomEvent('cityChange', { detail: { city } }));
    }
  };

  return (
    <div className="city-selector">
      <label htmlFor="city-select" className="city-selector__label">
        Город:
      </label>
      <select
        id="city-select"
        value={selectedCity.id}
        onChange={handleCityChange}
        className="city-selector__select"
      >
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CitySelector;

