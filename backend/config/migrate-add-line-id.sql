-- Добавление поля line_id в таблицу applications
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS line_id INTEGER REFERENCES layer_objects(id) ON DELETE SET NULL;

-- Создание индекса для быстрого поиска заявок по линии
CREATE INDEX IF NOT EXISTS idx_applications_line_id ON applications(line_id);

