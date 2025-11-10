# Система управления водоотведением

Веб-приложение для управления заявками на утечки в системе водоотведения.

## Технологии

- **Frontend**: React, Yandex Maps, Vite
- **Backend**: Node.js, Express, PostgreSQL
- **Аутентификация**: JWT
- **Защита API**: API Key

## Установка

### Требования

- Node.js (v16+)
- PostgreSQL (v12+)

### Установка PostgreSQL (если не установлен)

**Ручная установка (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Проверка установки:**
```bash
sudo systemctl status postgresql
```

### Настройка базы данных

1. **Создайте пользователя и базу данных PostgreSQL:**

```bash
# Переключитесь на пользователя postgres
sudo -u postgres psql

# В консоли PostgreSQL выполните:
CREATE USER postgres WITH PASSWORD 'postgres';
ALTER USER postgres CREATEDB;
CREATE DATABASE water_management OWNER postgres;
\q
```

Или одной командой:
```bash
sudo -u postgres createdb water_management
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

2. **Настройте переменные окружения:**

**Backend (`backend/.env`):**
```bash
cp backend/env.example backend/.env
# Отредактируйте backend/.env с вашими настройками БД
```

**Frontend (`frontend/.env`):**
```bash
# Создайте файл frontend/.env (если его нет)
# Добавьте переменные:
VITE_API_KEY=your-api-key-change-this-in-production
VITE_API_URL=http://localhost:5000/api
```

**Важно:** 
- Если вы изменили пароль пользователя postgres, обновите его в `backend/.env`
- `API_KEY` в backend и `VITE_API_KEY` в frontend должны совпадать
- Если `API_KEY` не установлен, защита API будет отключена (только для разработки)

3. Инициализируйте схему базы данных:
```bash
cd backend
node config/init-db.js
```

4. Выполните миграции (если необходимо):
```bash
cd backend
node config/migrate-add-phone.js
```

5. Создайте тестовых пользователей (опционально):
```bash
cd backend
node config/create-test-user.js
```

Это создаст трех тестовых пользователей:
- **admin** / **admin123** (Директор)
- **dispatcher** / **dispatcher123** (Диспетчер)
- **plumber** / **plumber123** (Слесарь)

### Установка зависимостей

```bash
# Установка всех зависимостей
npm run install-all

# Или отдельно:
cd backend && npm install
cd frontend && npm install
```

## Запуск

### Backend

```bash
cd backend
npm run dev
```

Backend будет доступен на http://localhost:5000

### Frontend

```bash
cd frontend
npm run dev
```

Frontend будет доступен на http://localhost:3000

## Роли пользователей

- **director** (Директор) - полный доступ ко всем функциям системы
  - Может создавать заявки
  - Может просматривать все заявки
  - Может изменять статусы заявок
  - Может удалять заявки и схемы на карте

- **dispatcher** (Диспетчер) - принимает и управляет заявками
  - Может создавать заявки (при клике на карте)
  - Может просматривать все заявки
  - Может изменять статусы заявок
  - Может редактировать свои заявки

- **plumber** (Слесарь) - просматривает заявки
  - Может просматривать все заявки
  - Может изменять статусы заявок, которые ему назначены

## Бригады

- **водосеть** - бригада водосети
- **канализация** - бригада канализации

## Функции системы

1. **Карта**
   - Отображение Yandex Maps
   - Визуализация схем канализации (оранжевые линии) и водопровода (синие линии)
   - Клик на карте открывает форму создания заявки (для диспетчера и директора)
   - Отображение существующих заявок в виде маркеров
   - Поиск адресов с предустановленным значением "Сарапул, ул. "

2. **Заявки**
   - Создание заявки с указанием адреса, описания, номера телефона, бригады
   - Просмотр списка заявок с фильтрацией по статусу, бригаде и дате (от/до)
   - Статистика заявок: количество новых, в работе, выполненных и ложных
   - Фильтрация заявок по клику на статистику
   - Изменение статусов заявок
   - Отслеживание координат заявки
   - Редактирование времени выполнения заявок (только для директора)

3. **Схемы на карте**
   - Сохранение схем канализации и водопровода в формате GeoJSON
   - Отображение схем на карте разными цветами

## Утилиты

### Просмотр пользователей

**Список пользователей с паролями:**
```bash
cd backend
node config/list-users-with-passwords.js
```

**Список пользователей с хешами паролей:**
```bash
cd backend
node config/list-users.js
```

## Тестовые пользователи

После создания тестовых пользователей (см. шаг 5 в установке), вы можете войти с любым из них:

| Логин | Пароль | Роль |
|-------|--------|------|
| admin | admin123 | Директор |
| dispatcher | dispatcher123 | Диспетчер |
| plumber | plumber123 | Слесарь |

**Примечание:** Вы также можете зарегистрировать нового пользователя через форму регистрации на странице `/register`.

