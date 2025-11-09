-- Миграция для добавления таблицы объектов слоев

-- Создаем таблицу для объектов слоев, если её еще нет
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

-- Создаем индексы, если их еще нет
CREATE INDEX IF NOT EXISTS idx_layer_objects_layer_type ON layer_objects(layer_type);
CREATE INDEX IF NOT EXISTS idx_layer_objects_object_type ON layer_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_layer_objects_layer_object_type ON layer_objects(layer_type, object_type);

