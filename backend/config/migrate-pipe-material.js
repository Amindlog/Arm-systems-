const pool = require('./database');

async function migratePipeMaterial() {
  try {
    console.log('Начинаем миграцию базы данных для добавления pipe_material в layer_objects...');

    // Добавляем поле pipe_material, если его еще нет
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'layer_objects' AND column_name = 'pipe_material'
        ) THEN
          ALTER TABLE layer_objects 
          ADD COLUMN pipe_material VARCHAR(50);
        END IF;
      END $$;
    `);
    console.log('✓ Поле pipe_material проверено/добавлено');

    // Создаем индекс для быстрого поиска
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_objects_pipe_material 
      ON layer_objects(pipe_material);
    `);
    console.log('✓ Индекс idx_layer_objects_pipe_material проверен/создан');

    console.log('\n✅ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migratePipeMaterial();

