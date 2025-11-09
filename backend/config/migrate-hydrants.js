const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrateHydrants() {
  try {
    console.log('Начинаем миграцию базы данных для гидрантов...');

    // Добавляем поле status, если его еще нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'hydrants' AND column_name = 'status'
        ) THEN
          ALTER TABLE hydrants ADD COLUMN status VARCHAR(50) DEFAULT 'working' CHECK (status IN ('working', 'not_working', 'needs_repair'));
        END IF;
      END $$;
    `);
    console.log('✓ Поле status проверено/добавлено');

    // Добавляем поле updated_at, если его еще нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'hydrants' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE hydrants ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);
    console.log('✓ Поле updated_at проверено/добавлено');

    // Создаем таблицу для фото гидрантов, если её еще нет
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hydrant_photos (
        id SERIAL PRIMARY KEY,
        hydrant_id INTEGER NOT NULL REFERENCES hydrants(id) ON DELETE CASCADE,
        photo_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Таблица hydrant_photos проверена/создана');

    // Создаем индексы, если их еще нет
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hydrants_status ON hydrants(status);
    `);
    console.log('✓ Индекс idx_hydrants_status проверен/создан');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hydrant_photos_hydrant_id ON hydrant_photos(hydrant_id);
    `);
    console.log('✓ Индекс idx_hydrant_photos_hydrant_id проверен/создан');

    console.log('\n✅ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateHydrants();

