const pool = require('./database');
const fs = require('fs');
const path = require('path');

async function migrateAddLineId() {
  try {
    console.log('Начинаем миграцию базы данных для добавления line_id в applications...');

    // Добавляем поле line_id, если его еще нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'applications' AND column_name = 'line_id'
        ) THEN
          ALTER TABLE applications 
          ADD COLUMN line_id INTEGER REFERENCES layer_objects(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('✓ Поле line_id проверено/добавлено');

    // Создаем индекс для быстрого поиска заявок по линии
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_line_id ON applications(line_id);
    `);
    console.log('✓ Индекс idx_applications_line_id проверен/создан');

    console.log('\n✅ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateAddLineId();

