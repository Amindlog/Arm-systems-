const pool = require('./database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  try {
    // Проверяем, существует ли уже пользователь
    const existingUser = await pool.query('SELECT id FROM users WHERE login = $1', ['admin']);
    
    if (existingUser.rows.length > 0) {
      console.log('Пользователь admin уже существует');
      process.exit(0);
    }

    // Создаем тестовых пользователей
    const users = [
      {
        login: 'admin',
        password: 'admin123',
        role: 'director',
        name: 'Администратор'
      },
      {
        login: 'dispatcher',
        password: 'dispatcher123',
        role: 'dispatcher',
        name: 'Диспетчер'
      },
      {
        login: 'plumber',
        password: 'plumber123',
        role: 'plumber',
        name: 'Слесарь'
      }
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await pool.query(
        'INSERT INTO users (login, password_hash, role, name) VALUES ($1, $2, $3, $4)',
        [user.login, passwordHash, user.role, user.name]
      );
      console.log(`✓ Создан пользователь: ${user.login} (${user.name}) - роль: ${user.role}`);
    }

    console.log('\nТестовые пользователи созданы:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach(user => {
      console.log(`Логин: ${user.login}`);
      console.log(`Пароль: ${user.password}`);
      console.log(`Роль: ${user.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    process.exit(0);
  } catch (error) {
    console.error('Ошибка при создании пользователей:', error);
    process.exit(1);
  }
}

createTestUser();

