# Инструкции по настройке пароля PostgreSQL

## Проблема
PostgreSQL запущен, но пароль для пользователя `postgres` не установлен или неверный.

## Решение

Выполните в терминале следующие команды (потребуется ввести пароль sudo):

### Шаг 1: Установите пароль для пользователя postgres

```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

### Шаг 2: Убедитесь, что база данных создана

```bash
sudo -u postgres createdb water_management
```

### Шаг 3: После установки пароля выполните инициализацию БД

```bash
cd backend
node config/init-db.js
```

### Шаг 4: Создайте тестовых пользователей

```bash
cd backend
node config/create-test-user.js
```

### Шаг 5: Перезапустите backend

```bash
cd backend
npm run dev
```

## Альтернатива: Используйте скрипт

Выполните скрипт для установки пароля:

```bash
./set-password.sh
```

После этого выполните шаги 3-5 выше.

## Проверка

После выполнения всех шагов:

1. Проверьте health check: http://localhost:5000/api/health
   - Должно вернуться: `"database": "connected"`

2. Попробуйте войти в систему:
   - Логин: `admin`
   - Пароль: `admin123`

