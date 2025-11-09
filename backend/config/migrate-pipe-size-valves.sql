-- Миграция для добавления размера трубы к линиям и задвижек к колодцам

-- Добавляем поле pipe_size для линий, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'layer_objects' AND column_name = 'pipe_size'
  ) THEN
    ALTER TABLE layer_objects ADD COLUMN pipe_size VARCHAR(50);
  END IF;
END $$;

-- Создаем таблицу для задвижек, если её еще нет
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

-- Создаем индексы, если их еще нет
CREATE INDEX IF NOT EXISTS idx_layer_objects_pipe_size ON layer_objects(pipe_size);
CREATE INDEX IF NOT EXISTS idx_valves_well_id ON valves(well_id);
CREATE INDEX IF NOT EXISTS idx_valves_status ON valves(status);

