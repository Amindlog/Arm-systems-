const pool = require('./database');

async function migrateAddCompletedAt() {
  try {
    console.log('Начинаем миграцию базы данных для добавления completed_at в applications...');

    // Добавляем поле completed_at, если его еще нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'applications' AND column_name = 'completed_at'
        ) THEN
          ALTER TABLE applications 
          ADD COLUMN completed_at TIMESTAMP;
        END IF;
      END $$;
    `);
    console.log('✓ Поле completed_at проверено/добавлено');

    // Создаем индекс для быстрого поиска заявок по времени выполнения
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_completed_at ON applications(completed_at);
    `);
    console.log('✓ Индекс idx_applications_completed_at проверен/создан');

    console.log('\n✅ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateAddCompletedAt();

