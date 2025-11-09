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
      console.log('Поиск адреса:', address);
      console.log('ymaps из пропсов:', ymaps);
      console.log('window.ymaps:', window.ymaps);
      
      // Используем ymaps.ready() для ожидания загрузки API
      let ymapsInstance = null;
      
      // Сначала проверяем window.ymaps
      if (window.ymaps && typeof window.ymaps.ready === 'function') {
        // Используем ymaps.ready() для гарантии загрузки API
        await window.ymaps.ready();
        // После ready() проверяем, есть ли geocode
        if (window.ymaps && typeof window.ymaps.geocode === 'function') {
          ymapsInstance = window.ymaps;
          console.log('Используем window.ymaps через ready() - geocode доступен');
        } else {
          // Если geocode не доступен напрямую, возможно нужно использовать другой способ
          console.log('window.ymaps после ready(), но geocode недоступен:', window.ymaps);
          // Пробуем использовать window.ymaps напрямую
          ymapsInstance = window.ymaps;
        }
      } else if (ymaps && typeof ymaps.ready === 'function') {
        // Используем переданный ymaps через ready()
        await ymaps.ready();
        // После ready() проверяем window.ymaps
        if (window.ymaps && typeof window.ymaps.geocode === 'function') {
          ymapsInstance = window.ymaps;
          console.log('Используем window.ymaps после ready() из пропсов');
        } else {
          ymapsInstance = ymaps;
          console.log('Используем ymaps из пропсов через ready()');
        }
      } else if (ymaps && typeof ymaps.geocode === 'function') {
        // Если ymaps уже готов и имеет geocode
        ymapsInstance = ymaps;
        console.log('Используем ymaps из пропсов напрямую');
      } else {
        // Ждем загрузки window.ymaps
        console.log('Ожидание загрузки window.ymaps...');
        await new Promise((resolve) => {
          let attempts = 0;
          const maxAttempts = 100; // 10 секунд максимум
          
          const checkInterval = setInterval(() => {
            attempts++;
            if (window.ymaps && typeof window.ymaps.ready === 'function') {
              console.log('window.ymaps загружен!');
              clearInterval(checkInterval);
              window.ymaps.ready().then(() => {
                ymapsInstance = window.ymaps;
                resolve();
              });
            } else if (attempts >= maxAttempts) {
              console.log('Таймаут ожидания window.ymaps');
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
      
      console.log('Используемый ymapsInstance:', ymapsInstance);
      console.log('ymapsInstance.geocode:', ymapsInstance?.geocode);
      
      if (!ymapsInstance) {
        setError('Карта не загружена. Попробуйте обновить страницу.');
        setLoading(false);
        return;
      }

      // Используем ymaps.geocode напрямую после ready()
      // В Yandex Maps API geocode доступен через window.ymaps.geocode после ready()
      console.log('Выполняем геокодирование...');
      
      // Используем window.ymaps.geocode напрямую
      if (!window.ymaps) {
        setError('Карта не загружена. Попробуйте обновить страницу.');
        setLoading(false);
        return;
      }

      // Убеждаемся, что API готов
      if (typeof window.ymaps.ready === 'function') {
        await window.ymaps.ready();
      }

      // В Yandex Maps API 2.1 geocode доступен через window.ymaps.geocode
      // После загрузки с параметром load: "package.full" geocode должен быть доступен
      console.log('Проверяем структуру window.ymaps:', Object.keys(window.ymaps || {}));
      console.log('window.ymaps.geocode:', window.ymaps?.geocode);
      
      // Пробуем использовать window.ymaps.geocode напрямую
      let result = null;
      
      try {
        // Проверяем наличие geocode
        if (typeof window.ymaps.geocode === 'function') {
          console.log('Используем window.ymaps.geocode напрямую');
          result = await window.ymaps.geocode(address);
        } else {
          console.error('geocode не найден в window.ymaps');
          console.log('Проверяем все методы window.ymaps:', Object.getOwnPropertyNames(window.ymaps || {}));
          setError('Ошибка: геокодирование недоступно. Попробуйте обновить страницу.');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Ошибка при геокодировании:', error);
        setError('Ошибка при поиске адреса. Попробуйте еще раз.');
        setLoading(false);
        return;
      }

      if (!result) {
        setError('Ошибка: геокодирование недоступно. Попробуйте обновить страницу.');
        setLoading(false);
        return;
      }

      console.log('Результат геокодирования:', result);

      if (result.geoObjects.getLength() === 0) {
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
      setError('Ошибка при поиске адреса');
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
