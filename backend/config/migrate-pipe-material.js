const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'water_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Добавление поля pipe_material в таблицу layer_objects...');
    
    await client.query(`
      ALTER TABLE layer_objects 
      ADD COLUMN IF NOT EXISTS pipe_material VARCHAR(50);
    `);
    
    console.log('Создание индекса для pipe_material...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_objects_pipe_material 
      ON layer_objects(pipe_material);
    `);
    
    console.log('Миграция успешно завершена!');
  } catch (error) {
    console.error('Ошибка при миграции:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

