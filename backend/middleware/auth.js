const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const API_KEY = process.env.API_KEY || '';

// Middleware для проверки API ключа
const validateApiKey = (req, res, next) => {
  // Если API_KEY не установлен, пропускаем проверку (для разработки)
  if (!API_KEY) {
    console.warn('⚠️  API_KEY не установлен в переменных окружения. Защита отключена.');
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API ключ отсутствует' });
  }

  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Неверный API ключ' });
  }

  next();
};

// Middleware для проверки JWT токена
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, login, role, name FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};

// Middleware для проверки роли
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется аутентификация' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав доступа' });
    }

    next();
  };
};

module.exports = {
  validateApiKey,
  authenticateToken,
  requireRole,
  JWT_SECRET
};

