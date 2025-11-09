-- Миграция: добавление поля pipe_length в таблицу layer_objects
ALTER TABLE layer_objects 
ADD COLUMN IF NOT EXISTS pipe_length DECIMAL(10, 2);
