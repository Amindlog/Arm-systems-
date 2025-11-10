const pool = require('./database');

async function migrateAddPhone() {
  try {
    console.log('Начинаем миграцию базы данных для добавления phone в applications...');

    // Добавляем поле phone, если его еще нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'applications' AND column_name = 'phone'
        ) THEN
          ALTER TABLE applications 
          ADD COLUMN phone VARCHAR(50);
        END IF;
      END $$;
    `);
    console.log('✓ Поле phone проверено/добавлено');

    console.log('\n✅ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateAddPhone();

