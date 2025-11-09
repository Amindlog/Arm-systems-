-- Миграция для добавления статуса и фото к гидрантам

-- Добавляем поле status, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hydrants' AND column_name = 'status'
  ) THEN
    ALTER TABLE hydrants ADD COLUMN status VARCHAR(50) DEFAULT 'working' CHECK (status IN ('working', 'not_working', 'needs_repair'));
  END IF;
END $$;

-- Добавляем поле updated_at, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hydrants' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE hydrants ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Создаем таблицу для фото гидрантов, если её еще нет
CREATE TABLE IF NOT EXISTS hydrant_photos (
    id SERIAL PRIMARY KEY,
    hydrant_id INTEGER NOT NULL REFERENCES hydrants(id) ON DELETE CASCADE,
    photo_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индексы, если их еще нет
CREATE INDEX IF NOT EXISTS idx_hydrants_status ON hydrants(status);
CREATE INDEX IF NOT EXISTS idx_hydrant_photos_hydrant_id ON hydrant_photos(hydrant_id);

