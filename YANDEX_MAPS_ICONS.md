# Доступные иконки (пресеты) для Яндекс Карт

## Основные группы пресетов

### 1. Islands (Острова) - Основная группа иконок

#### Геометрические фигуры:
- `islands#circleIcon` - Круг (используется сейчас для заявок и гидрантов)
- `islands#circleDotIcon` - Круг с точкой
- `islands#circleDotIconWithCaption` - Круг с точкой и подписью
- `islands#dotIcon` - Точка
- `islands#redCircleIcon` - Красный круг
- `islands#blueCircleIcon` - Синий круг
- `islands#greenCircleIcon` - Зеленый круг
- `islands#yellowCircleIcon` - Желтый круг
- `islands#grayCircleIcon` - Серый круг
- `islands#blackCircleIcon` - Черный круг

#### Специальные иконки:
- `islands#redCrossIcon` - Красный крест (хорошо для гидрантов)
- `islands#blueCrossIcon` - Синий крест
- `islands#greenCrossIcon` - Зеленый крест
- `islands#yellowCrossIcon` - Желтый крест
- `islands#grayCrossIcon` - Серый крест
- `islands#blackCrossIcon` - Черный крест

#### Иконки с подписью:
- `islands#icon` - Базовая иконка
- `islands#iconWithCaption` - Иконка с подписью
- `islands#blueIcon` - Синяя иконка
- `islands#blueIconWithCaption` - Синяя иконка с подписью
- `islands#redIcon` - Красная иконка
- `islands#redIconWithCaption` - Красная иконка с подписью
- `islands#greenIcon` - Зеленая иконка
- `islands#greenIconWithCaption` - Зеленая иконка с подписью
- `islands#yellowIcon` - Желтая иконка
- `islands#yellowIconWithCaption` - Желтая иконка с подписью
- `islands#grayIcon` - Серая иконка
- `islands#grayIconWithCaption` - Серая иконка с подписью
- `islands#blackIcon` - Черная иконка
- `islands#blackIconWithCaption` - Черная иконка с подписью

#### Иконки для метро:
- `islands#metroIcon` - Иконка метро
- `islands#metroIconWithCaption` - Иконка метро с подписью

#### Иконки для транспорта:
- `islands#transportIcon` - Иконка транспорта
- `islands#transportIconWithCaption` - Иконка транспорта с подписью

### 2. Twirl (Вращающиеся иконки)

- `twirl#circleIcon` - Вращающийся круг
- `twirl#redCircleIcon` - Вращающийся красный круг
- `twirl#blueCircleIcon` - Вращающийся синий круг
- `twirl#greenCircleIcon` - Вращающийся зеленый круг
- `twirl#yellowCircleIcon` - Вращающийся желтый круг
- `twirl#grayCircleIcon` - Вращающийся серый круг
- `twirl#blackCircleIcon` - Вращающийся черный круг

### 3. Stretchy (Растягивающиеся иконки)

- `stretchy#icon` - Растягивающаяся иконка
- `stretchy#blueIcon` - Растягивающаяся синяя иконка
- `stretchy#redIcon` - Растягивающаяся красная иконка
- `stretchy#greenIcon` - Растягивающаяся зеленая иконка
- `stretchy#yellowIcon` - Растягивающаяся желтая иконка
- `stretchy#grayIcon` - Растягивающаяся серая иконка
- `stretchy#blackIcon` - Растягивающаяся черная иконка

## Примеры использования в коде

### Для заявок:
```javascript
<Placemark
  geometry={[lat, lng]}
  options={{
    preset: "islands#circleIcon",
    iconColor: "#0066cc" // Синий для водосети
  }}
/>
```

### Для гидрантов:
```javascript
<Placemark
  geometry={[lat, lng]}
  options={{
    preset: "islands#redCrossIcon", // Красный крест для гидранта
    iconColor: "#dc2626" // Можно изменить цвет
  }}
/>
```

### Для разных статусов:
```javascript
// Рабочий гидрант - зеленый крест
preset: "islands#greenCrossIcon"

// Не рабочий - красный крест
preset: "islands#redCrossIcon"

// Требует ремонт - желтый крест
preset: "islands#yellowCrossIcon"
```

## Рекомендации для вашего проекта

### Заявки:
- **Водосеть (синие)**: `islands#circleIcon` с `iconColor: "#0066cc"`
- **Канализация (желтые)**: `islands#circleIcon` с `iconColor: "#fbbf24"`
- **Новые без бригады (красные)**: `islands#circleIcon` с `iconColor: "#dc2626"`

### Гидранты:
- **Рабочий**: `islands#greenCrossIcon` или `islands#circleIcon` с `iconColor: "#10b981"`
- **Не рабочий**: `islands#redCrossIcon` или `islands#circleIcon` с `iconColor: "#dc2626"`
- **Требует ремонт**: `islands#yellowCrossIcon` или `islands#circleIcon` с `iconColor: "#f59e0b"`

## Кастомизация цвета

Для большинства пресетов можно изменить цвет через параметр `iconColor`:
```javascript
options={{
  preset: "islands#circleIcon",
  iconColor: "#0066cc" // Любой HEX цвет
}}
```

## Дополнительные параметры

```javascript
options={{
  preset: "islands#circleIcon",
  iconColor: "#0066cc",
  iconSize: [30, 30], // Размер иконки [ширина, высота]
  iconOffset: [0, 0], // Смещение иконки [x, y]
  iconLayout: "default#image", // Тип макета
  iconImageHref: "url/to/image.png", // Своя картинка
  iconImageSize: [30, 30],
  iconImageOffset: [0, 0]
}}
```

