-- Миграция: добавление поля balance_delimitation в таблицу layer_objects
ALTER TABLE layer_objects 
ADD COLUMN IF NOT EXISTS balance_delimitation VARCHAR(255);
