# Быстрое решение проблемы входа

## Проблема: "Ошибка при входе"

Эта ошибка возникает, когда backend не может подключиться к базе данных PostgreSQL.

## Решение (выберите один вариант):

### Вариант 1: Автоматическая настройка (рекомендуется)

```bash
# Запустите скрипт настройки PostgreSQL
./setup-postgres.sh
```

### Вариант 2: Ручная настройка

**Шаг 1: Установите и запустите PostgreSQL**

```bash
# Установка PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Запуск PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка статуса
sudo systemctl status postgresql
```

**Шаг 2: Создайте базу данных**

```bash
# Создание базы данных
sudo -u postgres createdb water_management

# Установка пароля для пользователя postgres
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

**Шаг 3: Создайте файл .env (если его нет)**

```bash
cp backend/env.example backend/.env
```

Проверьте, что файл `backend/.env` содержит:
```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=water_management
DB_PASSWORD=postgres
DB_PORT=5432
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

**Шаг 4: Инициализируйте базу данных**

```bash
cd backend
node config/init-db.js
```

**Шаг 5: Создайте тестовых пользователей**

```bash
cd backend
node config/create-test-user.js
```

**Шаг 6: Перезапустите backend**

```bash
cd backend
npm run dev
```

Теперь проверьте http://localhost:5000/api/health - должно вернуться:
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "connected"
}
```

**Шаг 7: Попробуйте войти снова**

Используйте тестовые учетные данные:
- Логин: `admin`
- Пароль: `admin123`

## Проверка

После выполнения всех шагов:

1. Backend должен показывать: `✓ Database connection successful`
2. Health check должен возвращать: `"database": "connected"`
3. Вход в систему должен работать

