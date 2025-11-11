const pool = require('./database');
require('dotenv').config();

async function migrateDirectorToDevelopment() {
  try {
    console.log('Начало миграции: изменение роли director на development...\n');

    // 1. Сначала обновляем существующих пользователей с ролью director
    console.log('1. Обновление существующих пользователей...');
    const result = await pool.query(`
      UPDATE users
      SET role = 'development'
      WHERE role = 'director'
      RETURNING id, login, name;
    `);
    
    if (result.rows.length > 0) {
      console.log(`   ✓ Обновлено пользователей: ${result.rows.length}`);
      result.rows.forEach(user => {
        console.log(`     - ${user.login} (${user.name})`);
      });
    } else {
      console.log('   ✓ Пользователей с ролью director не найдено');
    }
    console.log('');

    // 2. Обновляем CHECK constraint в таблице users
    console.log('2. Обновление CHECK constraint в таблице users...');
    await pool.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    
    await pool.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('development', 'dispatcher', 'plumber'));
    `);
    console.log('   ✓ CHECK constraint обновлен\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Миграция успешно завершена!');
    console.log('   Роль director изменена на development');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateDirectorToDevelopment();

