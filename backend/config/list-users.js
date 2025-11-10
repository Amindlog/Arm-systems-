const pool = require('./database');
require('dotenv').config();

async function listUsers() {
  try {
    console.log('Получение списка пользователей из базы данных...\n');

    const result = await pool.query(`
      SELECT 
        id,
        login,
        password_hash,
        role,
        name,
        created_at
      FROM users
      ORDER BY id
    `);

    if (result.rows.length === 0) {
      console.log('Пользователи не найдены в базе данных.');
      process.exit(0);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('СПИСОК ПОЛЬЗОВАТЕЛЕЙ В СИСТЕМЕ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    result.rows.forEach((user, index) => {
      const roleNames = {
        director: 'Разработчик',
        dispatcher: 'Диспетчер',
        plumber: 'Слесарь'
      };

      console.log(`Пользователь #${index + 1}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Логин: ${user.login}`);
      console.log(`  Имя: ${user.name}`);
      console.log(`  Роль: ${user.role} (${roleNames[user.role] || user.role})`);
      console.log(`  Дата создания: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
      console.log(`  Пароль (хеш): ${user.password_hash.substring(0, 20)}... (хеширован, восстановить невозможно)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    console.log(`Всего пользователей: ${result.rows.length}\n`);
    console.log('⚠️  ВАЖНО: Пароли хранятся в хешированном виде (bcrypt) и не могут быть восстановлены.');
    console.log('   Для сброса пароля необходимо создать нового пользователя или использовать функцию сброса пароля.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при получении списка пользователей:', error.message);
    console.error(error);
    process.exit(1);
  }
}

listUsers();

