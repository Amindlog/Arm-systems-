-- Миграция: добавление поля pipe_material в таблицу layer_objects
ALTER TABLE layer_objects 
ADD COLUMN IF NOT EXISTS pipe_material VARCHAR(50);

-- Создание индекса для pipe_material
CREATE INDEX IF NOT EXISTS idx_layer_objects_pipe_material ON layer_objects(pipe_material);

