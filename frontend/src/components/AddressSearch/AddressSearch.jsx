import { useState, useRef } from 'react';
import './AddressSearch.css';

const AddressSearch = ({ onAddressFound, ymaps }) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleSearch = async () => {
    if (!address.trim()) {
      setError('Введите адрес');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Убеждаемся, что window.ymaps доступен
      if (!window.ymaps) {
        setError('Карта не загружена. Попробуйте обновить страницу.');
        setLoading(false);
        return;
      }

      // Ждем готовности API
      await window.ymaps.ready();

      // В Yandex Maps API 2.1 geocode доступен через window.ymaps.geocode
      // после загрузки с параметром load: "package.full"
      if (typeof window.ymaps.geocode !== 'function') {
        // Если geocode недоступен, пробуем явно загрузить модуль
        try {
          await window.ymaps.load('package.full');
        } catch (loadError) {
          console.error('Ошибка загрузки модуля geocode:', loadError);
        }
      }

      // Проверяем наличие geocode после загрузки
      if (typeof window.ymaps.geocode !== 'function') {
        setError('Ошибка: геокодирование недоступно. Попробуйте обновить страницу.');
        setLoading(false);
        return;
      }

      // Выполняем геокодирование
      const result = await window.ymaps.geocode(address);

      if (!result || result.geoObjects.getLength() === 0) {
        setError('Адрес не найден');
        setLoading(false);
        return;
      }

      const firstGeoObject = result.geoObjects.get(0);
      const coords = firstGeoObject.geometry.getCoordinates();
      const foundAddress = firstGeoObject.getAddressLine();

      // Перемещаем карту к найденному адресу
      onAddressFound({
        center: coords,
        zoom: 16,
        address: foundAddress
      });

      setAddress(foundAddress);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при поиске адреса:', err);
      setError('Ошибка при поиске адреса. Попробуйте еще раз.');
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="address-search">
      <div className="address-search__container">
        <input
          ref={inputRef}
          type="text"
          className="address-search__input"
          placeholder="Введите адрес..."
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError('');
          }}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          className="address-search__button"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Поиск...' : 'Перейти'}
        </button>
      </div>
      {error && (
        <div className="address-search__error">{error}</div>
      )}
    </div>
  );
};

export default AddressSearch;
