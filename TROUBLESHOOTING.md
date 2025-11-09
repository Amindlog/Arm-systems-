# Решение проблем

## Ошибка подключения к базе данных

### Ошибка: "connect ECONNREFUSED 127.0.0.1:5432"

Эта ошибка означает, что PostgreSQL не запущен или недоступен на порту 5432.

**Решение:**

1. **Установите и запустите PostgreSQL:**
   ```bash
   ./setup-postgres.sh
   ```

   Или вручную:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Проверьте статус PostgreSQL:**
   ```bash
   sudo systemctl status postgresql
   ```

3. **Создайте базу данных:**
   ```bash
   sudo -u postgres createdb water_management
   ```

4. **Проверьте настройки в `backend/.env`:**
   Убедитесь, что файл существует и содержит правильные настройки:
   ```
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=water_management
   DB_PASSWORD=postgres
   DB_PORT=5432
   ```

5. **Проверьте подключение:**
   ```bash
   cd backend
   node config/init-db.js
   ```

## Ошибка на странице входа (http://localhost:3000/login)

### 1. Проверьте, что frontend запущен

```bash
cd frontend
npm run dev
```

Вы должны увидеть что-то вроде:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 2. Проверьте консоль браузера

Откройте DevTools (F12) и проверьте вкладку **Console**:
- Если есть ошибки JavaScript, они будут показаны там
- Обратите внимание на красные сообщения об ошибках

### 3. Проверьте вкладку Network

В DevTools откройте вкладку **Network**:
- Попробуйте войти в систему
- Проверьте, есть ли запросы к `/api/auth/login`
- Если запросы не отправляются, проверьте настройки API

### 4. Типичные ошибки на странице входа

**"Cannot read property of undefined"**
- Проблема с импортами или зависимостями
- Перезапустите frontend: `npm run dev`

**"Failed to fetch" или "Network Error"**
- Backend не запущен
- Проверьте, что backend работает на http://localhost:5000

**Белая страница**
- Проверьте консоль браузера на ошибки
- Убедитесь, что все зависимости установлены: `npm install`

**Страница не загружается**
- Проверьте, что frontend запущен на правильном порту (3000)
- Попробуйте открыть http://localhost:5173 (Vite может использовать другой порт)

## Ошибка при входе в приложение

### 1. Проверьте, что backend запущен

```bash
cd backend
npm run dev
```

Вы должны увидеть:
```
✓ Database connection successful
✓ Server is running on port 5000
```

Если видите ошибку подключения к базе данных:
- Убедитесь, что PostgreSQL запущен
- Проверьте настройки в `backend/.env`

### 2. Проверьте подключение к backend

Откройте в браузере: http://localhost:5000/api/health

Должен вернуться JSON:
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "connected"
}
```

### 3. Проверьте, что база данных инициализирована

```bash
cd backend
node config/init-db.js
```

### 4. Создайте тестовых пользователей

```bash
cd backend
node config/create-test-user.js
```

### 5. Проверьте настройки frontend

Убедитесь, что frontend запущен:
```bash
cd frontend
npm run dev
```

Проверьте, что в консоли браузера нет ошибок CORS.

### 6. Типичные ошибки

**"Не удалось подключиться к серверу"**
- Backend не запущен
- Неправильный URL API (проверьте `frontend/src/services/api.js`)

**"Неверный логин или пароль"**
- Пользователь не существует в базе данных
- Запустите скрипт создания тестовых пользователей

**"Database connection failed"**
- PostgreSQL не запущен
- Неправильные настройки в `backend/.env`
- База данных не создана

**CORS ошибки**
- Проверьте настройки CORS в `backend/server.js`
- Убедитесь, что frontend запущен на правильном порту

### 7. Проверка логов

**Backend логи:**
- Смотрите консоль, где запущен `npm run dev`
- Проверьте логи подключения к базе данных

**Frontend логи:**
- Откройте DevTools в браузере (F12)
- Смотрите вкладку Console для ошибок JavaScript
- Смотрите вкладку Network для ошибок запросов

### 8. Проверка переменных окружения

Убедитесь, что файл `backend/.env` существует и содержит:
```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=water_management
DB_PASSWORD=ваш_пароль
DB_PORT=5432
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
```

