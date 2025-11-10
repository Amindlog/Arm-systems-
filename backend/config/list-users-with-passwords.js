const pool = require('./database');
require('dotenv').config();

// Известные пароли для тестовых пользователей (из create-test-user.js)
const knownPasswords = {
  'admin': 'admin123',
  'dispatcher': 'dispatcher123',
  'plumber': 'plumber123'
};

async function listUsersWithPasswords() {
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
    console.log('СПИСОК ПОЛЬЗОВАТЕЛЕЙ В СИСТЕМЕ С ПАРОЛЯМИ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    result.rows.forEach((user, index) => {
      const roleNames = {
        director: 'Разработчик',
        dispatcher: 'Диспетчер',
        plumber: 'Слесарь'
      };

      const knownPassword = knownPasswords[user.login];
      const passwordDisplay = knownPassword 
        ? `Пароль: ${knownPassword} ✓ (известен)`
        : `Пароль: [неизвестен - хеширован] ⚠️`;

      console.log(`Пользователь #${index + 1}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Логин: ${user.login}`);
      console.log(`  Имя: ${user.name}`);
      console.log(`  Роль: ${user.role} (${roleNames[user.role] || user.role})`);
      console.log(`  ${passwordDisplay}`);
      console.log(`  Дата создания: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
      console.log(`  Хеш пароля: ${user.password_hash.substring(0, 30)}...`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    console.log(`Всего пользователей: ${result.rows.length}\n`);
    
    const usersWithKnownPasswords = result.rows.filter(u => knownPasswords[u.login]).length;
    const usersWithUnknownPasswords = result.rows.length - usersWithKnownPasswords;
    
    if (usersWithUnknownPasswords > 0) {
      console.log(`⚠️  ВНИМАНИЕ: Для ${usersWithUnknownPasswords} пользователя(ей) пароли неизвестны.`);
      console.log('   Пароли хранятся в хешированном виде (bcrypt) и не могут быть восстановлены.\n');
    }

    console.log('📋 Сводка по пользователям:');
    result.rows.forEach(user => {
      const password = knownPasswords[user.login] || '[неизвестен]';
      console.log(`   • ${user.login} / ${password} (${user.name})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при получении списка пользователей:', error.message);
    console.error(error);
    process.exit(1);
  }
}

listUsersWithPasswords();

