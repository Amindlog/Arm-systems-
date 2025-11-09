// Настройки городов с координатами
export const cities = [
  {
    id: 'sarapul',
    name: 'Сарапул',
    center: [56.4767, 53.8036],
    zoom: 13
  },
  {
    id: 'moscow',
    name: 'Москва',
    center: [55.7558, 37.6173],
    zoom: 13
  },
  {
    id: 'spb',
    name: 'Санкт-Петербург',
    center: [59.9343, 30.3351],
    zoom: 13
  },
  {
    id: 'ekaterinburg',
    name: 'Екатеринбург',
    center: [56.8431, 60.6454],
    zoom: 13
  },
  {
    id: 'novosibirsk',
    name: 'Новосибирск',
    center: [55.0084, 82.9357],
    zoom: 13
  },
  {
    id: 'kazan',
    name: 'Казань',
    center: [55.8304, 49.0661],
    zoom: 13
  },
  {
    id: 'nizhny-novgorod',
    name: 'Нижний Новгород',
    center: [56.2965, 43.9361],
    zoom: 13
  },
  {
    id: 'chelyabinsk',
    name: 'Челябинск',
    center: [55.1644, 61.4368],
    zoom: 13
  },
  {
    id: 'samara',
    name: 'Самара',
    center: [53.2001, 50.15],
    zoom: 13
  },
  {
    id: 'omsk',
    name: 'Омск',
    center: [54.9885, 73.3242],
    zoom: 13
  },
  {
    id: 'rostov',
    name: 'Ростов-на-Дону',
    center: [47.2357, 39.7015],
    zoom: 13
  }
];

// Получить город по умолчанию из localStorage или вернуть первый
export const getDefaultCity = () => {
  const savedCityId = localStorage.getItem('selectedCity');
  if (savedCityId) {
    const city = cities.find(c => c.id === savedCityId);
    if (city) return city;
  }
  return cities[0]; // Сарапул по умолчанию
};

// Сохранить выбранный город
export const saveSelectedCity = (cityId) => {
  localStorage.setItem('selectedCity', cityId);
};

