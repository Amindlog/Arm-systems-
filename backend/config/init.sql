-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('director', 'dispatcher', 'plumber')),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы бригад
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL CHECK (name IN ('водосеть', 'канализация'))
);

-- Вставка начальных данных для бригад
INSERT INTO teams (name) VALUES ('водосеть'), ('канализация')
ON CONFLICT (name) DO NOTHING;

-- Создание таблицы заявок
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    description TEXT,
    submitted_by VARCHAR(255),
    accepted_by INTEGER REFERENCES users(id),
    team_id INTEGER REFERENCES teams(id),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы схем на карте
CREATE TABLE IF NOT EXISTS map_features (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('water', 'sewer')),
    geojson JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы гидрантов
CREATE TABLE IF NOT EXISTS hydrants (
    id SERIAL PRIMARY KEY,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'working' CHECK (status IN ('working', 'not_working', 'needs_repair')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы фото гидрантов
CREATE TABLE IF NOT EXISTS hydrant_photos (
    id SERIAL PRIMARY KEY,
    hydrant_id INTEGER NOT NULL REFERENCES hydrants(id) ON DELETE CASCADE,
    photo_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы объектов слоев (колодцы, камеры, линии)
CREATE TABLE IF NOT EXISTS layer_objects (
    id SERIAL PRIMARY KEY,
    layer_type VARCHAR(50) NOT NULL CHECK (layer_type IN ('water', 'sewer')),
    object_type VARCHAR(50) NOT NULL CHECK (object_type IN ('well', 'chamber', 'line')),
    geojson JSONB NOT NULL,
    address TEXT,
    description TEXT,
    pipe_size VARCHAR(50),
    pipe_length DECIMAL(10, 2),
    balance_delimitation VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы задвижек для колодцев
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

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_team_id ON applications(team_id);
CREATE INDEX IF NOT EXISTS idx_applications_accepted_by ON applications(accepted_by);
CREATE INDEX IF NOT EXISTS idx_map_features_type ON map_features(type);
CREATE INDEX IF NOT EXISTS idx_hydrants_location ON hydrants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hydrants_status ON hydrants(status);
CREATE INDEX IF NOT EXISTS idx_hydrant_photos_hydrant_id ON hydrant_photos(hydrant_id);
CREATE INDEX IF NOT EXISTS idx_layer_objects_layer_type ON layer_objects(layer_type);
CREATE INDEX IF NOT EXISTS idx_layer_objects_object_type ON layer_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_layer_objects_layer_object_type ON layer_objects(layer_type, object_type);
CREATE INDEX IF NOT EXISTS idx_layer_objects_pipe_size ON layer_objects(pipe_size);
CREATE INDEX IF NOT EXISTS idx_valves_well_id ON valves(well_id);
CREATE INDEX IF NOT EXISTS idx_valves_status ON valves(status);

