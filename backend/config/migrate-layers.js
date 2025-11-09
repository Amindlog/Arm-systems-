const pool = require('../config/database');

async function migrateLayers() {
  try {
    console.log('Начинаем миграцию базы данных для слоев...');

    // Создаем таблицу для объектов слоев, если её еще нет
    await pool.query(`
      CREATE TABLE IF NOT EXISTS layer_objects (
        id SERIAL PRIMARY KEY,
        layer_type VARCHAR(50) NOT NULL CHECK (layer_type IN ('water', 'sewer')),
        object_type VARCHAR(50) NOT NULL CHECK (object_type IN ('well', 'chamber', 'line')),
        geojson JSONB NOT NULL,
        address TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Таблица layer_objects проверена/создана');

    // Создаем индексы, если их еще нет
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_objects_layer_type ON layer_objects(layer_type);
    `);
    console.log('✓ Индекс idx_layer_objects_layer_type проверен/создан');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_objects_object_type ON layer_objects(object_type);
    `);
    console.log('✓ Индекс idx_layer_objects_object_type проверен/создан');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_objects_layer_object_type ON layer_objects(layer_type, object_type);
    `);
    console.log('✓ Индекс idx_layer_objects_layer_object_type проверен/создан');

    console.log('\n✅ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateLayers();

