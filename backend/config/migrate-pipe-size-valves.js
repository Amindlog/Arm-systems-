const pool = require('../config/database');

async function migratePipeSizeValves() {
  try {
    console.log('Начинаем миграцию базы данных для pipe_size и valves...');

    // Добавляем поле pipe_size для линий, если его еще нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'layer_objects' AND column_name = 'pipe_size'
        ) THEN
          ALTER TABLE layer_objects ADD COLUMN pipe_size VARCHAR(50);
        END IF;
      END $$;
    `);
    console.log('✓ Поле pipe_size проверено/добавлено');

    // Создаем таблицу для задвижек, если её еще нет
    await pool.query(`
      CREATE TABLE IF NOT EXISTS valves (
        id SERIAL PRIMARY KEY,
        well_id INTEGER NOT NULL REFERENCES layer_objects(id) ON DELETE CASCADE,
        valve_type VARCHAR(50),
        valve_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'working' CHECK (status IN ('working', 'not_working', 'needs_repair')),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Таблица valves проверена/создана');

    // Создаем индексы, если их еще нет
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_objects_pipe_size ON layer_objects(pipe_size);
    `);
    console.log('✓ Индекс idx_layer_objects_pipe_size проверен/создан');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_valves_well_id ON valves(well_id);
    `);
    console.log('✓ Индекс idx_valves_well_id проверен/создан');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_valves_status ON valves(status);
    `);
    console.log('✓ Индекс idx_valves_status проверен/создан');

    console.log('\n✅ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migratePipeSizeValves();

