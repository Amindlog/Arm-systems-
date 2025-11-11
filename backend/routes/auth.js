const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Регистрация пользователя
router.post('/register', async (req, res) => {
  try {
    const { login, password, role, name } = req.body;

    if (!login || !password || !role || !name) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    // Проверка валидности роли
    const validRoles = ['development', 'dispatcher', 'plumber'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    // Проверка существования пользователя
    const existingUser = await pool.query('SELECT id FROM users WHERE login = $1', [login]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // Создание пользователя
    const result = await pool.query(
      'INSERT INTO users (login, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id, login, role, name',
      [login, passwordHash, role, name]
    );

    const user = result.rows[0];

    // Генерация JWT токена
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
  }
});

// Вход пользователя
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    // Поиск пользователя
    const result = await pool.query(
      'SELECT id, login, password_hash, role, name FROM users WHERE login = $1',
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Генерация JWT токена
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Успешный вход',
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// Получение информации о текущем пользователе
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      login: req.user.login,
      role: req.user.role,
      name: req.user.name
    }
  });
});

module.exports = router;

