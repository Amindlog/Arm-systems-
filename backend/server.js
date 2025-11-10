const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const { validateApiKey } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const applicationsRoutes = require('./routes/applications');
const mapRoutes = require('./routes/map');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Vite может использовать порт 5173
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы для загруженных фото
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Логирование запросов для отладки
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Применяем проверку API ключа ко всем API маршрутам (кроме health check)
app.use('/api', (req, res, next) => {
  // Пропускаем health check без проверки API ключа
  if (req.path === '/health') {
    return next();
  }
  validateApiKey(req, res, next);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/map', mapRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Проверка подключения к базе данных
    await pool.query('SELECT 1');
    res.json({ status: 'OK', message: 'Server is running', database: 'connected' });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Server is running but database connection failed',
      error: error.message 
    });
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Проверка подключения к базе данных при старте
async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.error('  Убедитесь, что PostgreSQL запущен и настройки в .env правильные');
  }

  app.listen(PORT, () => {
    console.log(`✓ Server is running on port ${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();

