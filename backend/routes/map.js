const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// Получить все схемы на карте
router.get('/features', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;

    let query = 'SELECT id, type, geojson, created_at FROM map_features';
    const params = [];
    
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      features: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        geojson: row.geojson,
        created_at: row.created_at
      }))
    });
  } catch (error) {
    console.error('Get map features error:', error);
    res.status(500).json({ error: 'Ошибка при получении схем карты' });
  }
});

// Получить схему по ID
router.get('/features/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, type, geojson, created_at FROM map_features WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Схема не найдена' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      type: row.type,
      geojson: row.geojson,
      created_at: row.created_at
    });
  } catch (error) {
    console.error('Get map feature error:', error);
    res.status(500).json({ error: 'Ошибка при получении схемы' });
  }
});

// Создать схему на карте
router.post('/features', authenticateToken, async (req, res) => {
  try {
    const { type, geojson } = req.body;

    if (!type || !geojson) {
      return res.status(400).json({ error: 'Тип и геоданные обязательны' });
    }

    // Проверка валидности типа
    const validTypes = ['water', 'sewer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Недопустимый тип схемы. Используйте "water" или "sewer"' });
    }

    // Проверка валидности GeoJSON
    if (typeof geojson !== 'object' || !geojson.type) {
      return res.status(400).json({ error: 'Некорректный формат GeoJSON' });
    }

    const result = await pool.query(`
      INSERT INTO map_features (type, geojson)
      VALUES ($1, $2)
      RETURNING id, type, geojson, created_at
    `, [type, JSON.stringify(geojson)]);

    const feature = result.rows[0];

    res.status(201).json({
      message: 'Схема успешно создана',
      feature: {
        id: feature.id,
        type: feature.type,
        geojson: feature.geojson,
        created_at: feature.created_at
      }
    });
  } catch (error) {
    console.error('Create map feature error:', error);
    res.status(500).json({ error: 'Ошибка при создании схемы' });
  }
});

// Обновить схему
router.put('/features/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, geojson } = req.body;

    // Проверка существования схемы
    const existingFeature = await pool.query('SELECT * FROM map_features WHERE id = $1', [id]);
    if (existingFeature.rows.length === 0) {
      return res.status(404).json({ error: 'Схема не найдена' });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (type !== undefined) {
      const validTypes = ['water', 'sewer'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Недопустимый тип схемы' });
      }
      updates.push(`type = $${paramCount++}`);
      params.push(type);
    }

    if (geojson !== undefined) {
      if (typeof geojson !== 'object' || !geojson.type) {
        return res.status(400).json({ error: 'Некорректный формат GeoJSON' });
      }
      updates.push(`geojson = $${paramCount++}`);
      params.push(JSON.stringify(geojson));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    params.push(id);

    const result = await pool.query(`
      UPDATE map_features 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, type, geojson, created_at
    `, params);

    res.json({
      message: 'Схема успешно обновлена',
      feature: {
        id: result.rows[0].id,
        type: result.rows[0].type,
        geojson: result.rows[0].geojson,
        created_at: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Update map feature error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении схемы' });
  }
});

// Удалить схему
router.delete('/features/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверка прав доступа (только разработчик может удалять)
    if (req.user.role !== 'development') {
      return res.status(403).json({ error: 'Недостаточно прав для удаления схемы' });
    }

    const result = await pool.query('DELETE FROM map_features WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Схема не найдена' });
    }

    res.json({ message: 'Схема успешно удалена' });
  } catch (error) {
    console.error('Delete map feature error:', error);
    res.status(500).json({ error: 'Ошибка при удалении схемы' });
  }
});

// Получить все гидранты
router.get('/hydrants', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        h.id, 
        h.address, 
        h.latitude, 
        h.longitude, 
        h.description, 
        h.status,
        h.created_at,
        h.updated_at
      FROM hydrants h
      ORDER BY h.created_at DESC
    `);

    // Получаем фото для каждого гидранта
    const hydrantsWithPhotos = await Promise.all(
      result.rows.map(async (row) => {
        const photosResult = await pool.query(
          'SELECT id, photo_path, created_at FROM hydrant_photos WHERE hydrant_id = $1 ORDER BY created_at DESC',
          [row.id]
        );

        const lat = row.latitude != null ? parseFloat(row.latitude) : null;
        const lng = row.longitude != null ? parseFloat(row.longitude) : null;
        
        return {
          id: row.id,
          address: row.address || null,
          coordinates: (lat != null && !isNaN(lat) && lng != null && !isNaN(lng)) ? {
            lat: lat,
            lng: lng
          } : null,
          description: row.description || null,
          status: row.status || 'working',
          photos: photosResult.rows.map(photo => ({
            id: photo.id,
            path: `/api/uploads/hydrants/${path.basename(photo.photo_path)}`,
            created_at: photo.created_at
          })),
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      })
    );

    res.json({
      hydrants: hydrantsWithPhotos
    });
  } catch (error) {
    console.error('Get hydrants error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Ошибка при получении гидрантов', details: error.message });
  }
});

// Создать гидрант
router.post('/hydrants', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const { latitude, longitude, description, address, status } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Координаты обязательны' });
    }

    // Парсим координаты в числа (FormData передает строки)
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Некорректные координаты' });
    }

    // Валидация статуса
    const validStatuses = ['working', 'not_working', 'needs_repair'];
    const hydrantStatus = status && validStatuses.includes(status) ? status : 'working';

    let result;
    try {
      result = await pool.query(`
        INSERT INTO hydrants (latitude, longitude, description, address, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, address, latitude, longitude, description, status, created_at
      `, [lat, lng, description || null, address || null, hydrantStatus]);
    } catch (dbError) {
      // Проверяем, не связана ли ошибка с отсутствием поля status
      if (dbError.message && dbError.message.includes('column "status"')) {
        console.error('Database schema error: status column missing. Please run migration script.');
        return res.status(500).json({ 
          error: 'База данных не обновлена. Пожалуйста, выполните миграцию: psql -U postgres -d water_management -f backend/config/migrate-hydrants.sql',
          details: dbError.message 
        });
      }
      throw dbError;
    }

    const hydrant = result.rows[0];

    // Сохраняем фото, если они есть
    const photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const photoResult = await pool.query(`
          INSERT INTO hydrant_photos (hydrant_id, photo_path)
          VALUES ($1, $2)
          RETURNING id, photo_path, created_at
        `, [hydrant.id, file.filename]);
        
        photos.push({
          id: photoResult.rows[0].id,
          path: `/api/uploads/hydrants/${file.filename}`,
          created_at: photoResult.rows[0].created_at
        });
      }
    }

    res.status(201).json({
      message: 'Гидрант успешно создан',
      hydrant: {
        id: hydrant.id,
        address: hydrant.address,
        coordinates: {
          lat: parseFloat(hydrant.latitude),
          lng: parseFloat(hydrant.longitude)
        },
        description: hydrant.description,
        status: hydrant.status,
        photos: photos,
        created_at: hydrant.created_at
      }
    });
  } catch (error) {
    console.error('Create hydrant error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Ошибка при создании гидранта',
      details: error.message 
    });
  }
});

// Обновить гидрант
router.put('/hydrants/:id', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, description, address, status } = req.body;

    // Проверка существования гидранта
    const existingHydrant = await pool.query('SELECT * FROM hydrants WHERE id = $1', [id]);
    if (existingHydrant.rows.length === 0) {
      return res.status(404).json({ error: 'Гидрант не найден' });
    }

    // Проверка прав доступа
    if (req.user.role !== 'development' && req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Недостаточно прав для обновления гидранта' });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (latitude !== undefined) {
      const lat = parseFloat(latitude);
      if (isNaN(lat)) {
        return res.status(400).json({ error: 'Некорректная широта' });
      }
      updates.push(`latitude = $${paramCount++}`);
      params.push(lat);
    }

    if (longitude !== undefined) {
      const lng = parseFloat(longitude);
      if (isNaN(lng)) {
        return res.status(400).json({ error: 'Некорректная долгота' });
      }
      updates.push(`longitude = $${paramCount++}`);
      params.push(lng);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      params.push(address);
    }

    if (status !== undefined) {
      const validStatuses = ['working', 'not_working', 'needs_repair'];
      if (validStatuses.includes(status)) {
        updates.push(`status = $${paramCount++}`);
        params.push(status);
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      await pool.query(`
        UPDATE hydrants 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
      `, params);
    }

    // Сохраняем новые фото, если они есть
    const newPhotos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const photoResult = await pool.query(`
          INSERT INTO hydrant_photos (hydrant_id, photo_path)
          VALUES ($1, $2)
          RETURNING id, photo_path, created_at
        `, [id, file.filename]);
        
        newPhotos.push({
          id: photoResult.rows[0].id,
          path: `/api/uploads/hydrants/${file.filename}`,
          created_at: photoResult.rows[0].created_at
        });
      }
    }

    // Получаем обновленный гидрант с фото
    const result = await pool.query(`
      SELECT id, address, latitude, longitude, description, status, created_at, updated_at
      FROM hydrants WHERE id = $1
    `, [id]);

    const hydrant = result.rows[0];
    const photosResult = await pool.query(
      'SELECT id, photo_path, created_at FROM hydrant_photos WHERE hydrant_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      message: 'Гидрант успешно обновлен',
      hydrant: {
        id: hydrant.id,
        address: hydrant.address,
        coordinates: {
          lat: parseFloat(hydrant.latitude),
          lng: parseFloat(hydrant.longitude)
        },
        description: hydrant.description,
        status: hydrant.status,
        photos: photosResult.rows.map(photo => ({
          id: photo.id,
          path: `/api/uploads/hydrants/${path.basename(photo.photo_path)}`,
          created_at: photo.created_at
        })),
        created_at: hydrant.created_at,
        updated_at: hydrant.updated_at
      }
    });
  } catch (error) {
    console.error('Update hydrant error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении гидранта' });
  }
});

// Удалить гидрант
router.delete('/hydrants/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверка прав доступа (только разработчик может удалять)
    if (req.user.role !== 'development') {
      return res.status(403).json({ error: 'Недостаточно прав для удаления гидранта' });
    }

    const result = await pool.query('DELETE FROM hydrants WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Гидрант не найден' });
    }

    res.json({ message: 'Гидрант успешно удален' });
  } catch (error) {
    console.error('Delete hydrant error:', error);
    res.status(500).json({ error: 'Ошибка при удалении гидранта' });
  }
});

// Удалить фото гидранта
router.delete('/hydrants/:id/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const { id, photoId } = req.params;

    // Проверка прав доступа
    if (req.user.role !== 'development' && req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Недостаточно прав для удаления фото' });
    }

    // Получаем путь к фото
    const photoResult = await pool.query(
      'SELECT photo_path FROM hydrant_photos WHERE id = $1 AND hydrant_id = $2',
      [photoId, id]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Фото не найдено' });
    }

    // Удаляем запись из БД
    await pool.query('DELETE FROM hydrant_photos WHERE id = $1', [photoId]);

    // Удаляем файл (опционально, можно оставить для истории)
    const fs = require('fs');
    const photoPath = path.join(__dirname, '../uploads/hydrants', path.basename(photoResult.rows[0].photo_path));
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    res.json({ message: 'Фото успешно удалено' });
  } catch (error) {
    console.error('Delete hydrant photo error:', error);
    res.status(500).json({ error: 'Ошибка при удалении фото' });
  }
});

// ========== МАРШРУТЫ ДЛЯ ОБЪЕКТОВ СЛОЕВ ==========

// Получить все объекты слоев
router.get('/layers/objects', authenticateToken, async (req, res) => {
  try {
    const { layer_type, object_type } = req.query;

    // Проверяем наличие поля pipe_length в таблице
    let query = 'SELECT id, layer_type, object_type, geojson, address, description, pipe_size';
    try {
      // Пробуем выбрать pipe_length, если поле существует
      const testQuery = await pool.query('SELECT pipe_length FROM layer_objects LIMIT 1');
      query += ', pipe_length';
    } catch (e) {
      // Поле не существует, не добавляем его в запрос
      console.log('Поле pipe_length не найдено в таблице layer_objects');
    }
    try {
      // Пробуем выбрать balance_delimitation, если поле существует
      const testQuery = await pool.query('SELECT balance_delimitation FROM layer_objects LIMIT 1');
      query += ', balance_delimitation';
    } catch (e) {
      // Поле не существует, не добавляем его в запрос
      console.log('Поле balance_delimitation не найдено в таблице layer_objects');
    }
    try {
      // Пробуем выбрать pipe_material, если поле существует
      const testQuery = await pool.query('SELECT pipe_material FROM layer_objects LIMIT 1');
      query += ', pipe_material';
    } catch (e) {
      // Поле не существует, не добавляем его в запрос
      console.log('Поле pipe_material не найдено в таблице layer_objects');
    }
    query += ', created_at, updated_at FROM layer_objects';
    const params = [];
    const conditions = [];
    let paramCount = 1;

    if (layer_type) {
      conditions.push(`layer_type = $${paramCount++}`);
      params.push(layer_type);
    }

    if (object_type) {
      conditions.push(`object_type = $${paramCount++}`);
      params.push(object_type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const objects = result.rows.map(row => {
      const obj = {
        id: row.id,
        layer_type: row.layer_type,
        object_type: row.object_type,
        geojson: row.geojson,
        address: row.address || null,
        description: row.description || null,
        pipe_size: row.pipe_size || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      // Добавляем pipe_length только если поле существует
      if (row.hasOwnProperty('pipe_length')) {
        obj.pipe_length = row.pipe_length ? parseFloat(row.pipe_length) : null;
      }
      
      // Добавляем balance_delimitation только если поле существует
      if (row.hasOwnProperty('balance_delimitation')) {
        obj.balance_delimitation = row.balance_delimitation || null;
      } else {
        obj.balance_delimitation = null;
      }
      
      // Добавляем pipe_material только если поле существует
      if (row.hasOwnProperty('pipe_material')) {
        obj.pipe_material = row.pipe_material || null;
      } else {
        obj.pipe_material = null;
      }
      
      return obj;
    });

    // Для колодцев загружаем задвижки
    for (const obj of objects) {
      if (obj.object_type === 'well') {
        try {
          const valvesResult = await pool.query(
            'SELECT id, valve_type, valve_number, status, description, created_at, updated_at FROM valves WHERE well_id = $1 ORDER BY created_at',
            [obj.id]
          );
          obj.valves = valvesResult.rows.map(v => ({
            id: v.id,
            valve_type: v.valve_type || null,
            valve_number: v.valve_number || null,
            status: v.status,
            description: v.description || null,
            created_at: v.created_at,
            updated_at: v.updated_at
          }));
        } catch (valveError) {
          // Если таблица valves еще не создана, просто не добавляем задвижки
          console.warn('Таблица valves не найдена или ошибка при загрузке задвижек:', valveError.message);
          obj.valves = [];
        }
      }
    }

    res.json({ objects });
  } catch (error) {
    console.error('Get layer objects error:', error);
    res.status(500).json({ error: 'Ошибка при получении объектов слоев' });
  }
});

// Создать объект слоя
router.post('/layers/objects', authenticateToken, async (req, res) => {
  try {
    const { layer_type, object_type, geojson, address, description, pipe_size, pipe_length, pipe_material, balance_delimitation } = req.body;

    if (!layer_type || !object_type || !geojson) {
      return res.status(400).json({ error: 'Тип слоя, тип объекта и геоданные обязательны' });
    }

    // Проверка валидности типа слоя
    const validLayerTypes = ['water', 'sewer'];
    if (!validLayerTypes.includes(layer_type)) {
      return res.status(400).json({ error: 'Недопустимый тип слоя. Используйте "water" или "sewer"' });
    }

    // Проверка валидности типа объекта
    const validObjectTypes = ['well', 'chamber', 'line'];
    if (!validObjectTypes.includes(object_type)) {
      return res.status(400).json({ error: 'Недопустимый тип объекта. Используйте "well", "chamber" или "line"' });
    }

    // Проверка валидности GeoJSON
    if (typeof geojson !== 'object' || !geojson.type) {
      return res.status(400).json({ error: 'Некорректный формат GeoJSON' });
    }

    // Проверяем наличие полей pipe_length, balance_delimitation и pipe_material
    let hasPipeLength = false;
    let hasBalanceDelimitation = false;
    let hasPipeMaterial = false;
    try {
      const testResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'layer_objects' AND column_name IN ('pipe_length', 'balance_delimitation', 'pipe_material')
      `);
      hasPipeLength = testResult.rows.some(r => r.column_name === 'pipe_length');
      hasBalanceDelimitation = testResult.rows.some(r => r.column_name === 'balance_delimitation');
      hasPipeMaterial = testResult.rows.some(r => r.column_name === 'pipe_material');
    } catch (e) {
      console.log('Ошибка при проверке полей:', e.message);
    }

    let insertFields = 'layer_type, object_type, geojson, address, description, pipe_size';
    let insertValues = '$1, $2, $3, $4, $5, $6';
    let insertParams = [layer_type, object_type, JSON.stringify(geojson), address || null, description || null, pipe_size || null];
    let paramCount = 7;

    if (hasPipeLength) {
      insertFields += ', pipe_length';
      insertValues += `, $${paramCount++}`;
      // Преобразуем pipe_length в число или null
      const pipeLengthValue = pipe_length !== undefined && pipe_length !== null && pipe_length !== '' 
        ? (typeof pipe_length === 'number' ? pipe_length : parseFloat(pipe_length)) 
        : null;
      insertParams.push(isNaN(pipeLengthValue) ? null : pipeLengthValue);
    }

    if (hasBalanceDelimitation) {
      insertFields += ', balance_delimitation';
      insertValues += `, $${paramCount++}`;
      insertParams.push(balance_delimitation || null);
    }

    if (hasPipeMaterial) {
      insertFields += ', pipe_material';
      insertValues += `, $${paramCount++}`;
      insertParams.push(pipe_material || null);
    }

    let returningFields = 'id, layer_type, object_type, geojson, address, description, pipe_size';
    if (hasPipeLength) {
      returningFields += ', pipe_length';
    }
    if (hasBalanceDelimitation) {
      returningFields += ', balance_delimitation';
    }
    if (hasPipeMaterial) {
      returningFields += ', pipe_material';
    }
    returningFields += ', created_at, updated_at';

    const result = await pool.query(`
      INSERT INTO layer_objects (${insertFields})
      VALUES (${insertValues})
      RETURNING ${returningFields}
    `, insertParams);

    const object = result.rows[0];

    res.status(201).json({
      message: 'Объект слоя успешно создан',
      object: {
        id: object.id,
        layer_type: object.layer_type,
        object_type: object.object_type,
        geojson: object.geojson,
        address: object.address,
        description: object.description,
        pipe_size: object.pipe_size,
        pipe_length: object.pipe_length ? parseFloat(object.pipe_length) : null,
        balance_delimitation: object.balance_delimitation || null,
        pipe_material: object.pipe_material || null,
        created_at: object.created_at,
        updated_at: object.updated_at
      }
    });
  } catch (error) {
    console.error('========================================');
    console.error('ОШИБКА при создании объекта слоя:', error);
    console.error('Детали ошибки:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('req.body:', req.body);
    console.error('========================================');
    res.status(500).json({ 
      error: 'Ошибка при создании объекта слоя', 
      details: error.message 
    });
  }
});

// Обновить объект слоя
router.put('/layers/objects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { layer_type, object_type, geojson, address, description, pipe_size, pipe_length, pipe_material, balance_delimitation } = req.body;

    // Проверка существования объекта
    const existingObject = await pool.query('SELECT * FROM layer_objects WHERE id = $1', [id]);
    if (existingObject.rows.length === 0) {
      return res.status(404).json({ error: 'Объект слоя не найден' });
    }

    // Проверка прав доступа
    if (req.user.role !== 'development' && req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Недостаточно прав для обновления объекта слоя' });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (layer_type !== undefined) {
      const validLayerTypes = ['water', 'sewer'];
      if (!validLayerTypes.includes(layer_type)) {
        return res.status(400).json({ error: 'Недопустимый тип слоя' });
      }
      updates.push(`layer_type = $${paramCount++}`);
      params.push(layer_type);
    }

    if (object_type !== undefined) {
      const validObjectTypes = ['well', 'chamber', 'line'];
      if (!validObjectTypes.includes(object_type)) {
        return res.status(400).json({ error: 'Недопустимый тип объекта' });
      }
      updates.push(`object_type = $${paramCount++}`);
      params.push(object_type);
    }

    if (geojson !== undefined) {
      if (typeof geojson !== 'object' || !geojson.type) {
        return res.status(400).json({ error: 'Некорректный формат GeoJSON' });
      }
      updates.push(`geojson = $${paramCount++}`);
      params.push(JSON.stringify(geojson));
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      params.push(address);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }

    if (pipe_size !== undefined) {
      updates.push(`pipe_size = $${paramCount++}`);
      params.push(pipe_size);
    }

    if (pipe_length !== undefined) {
      // Проверяем, что pipe_length - это число или null
      if (pipe_length === null || (typeof pipe_length === 'number' && !isNaN(pipe_length))) {
        updates.push(`pipe_length = $${paramCount++}`);
        params.push(pipe_length);
      } else {
        // Если pipe_length не является числом, устанавливаем null
        updates.push(`pipe_length = $${paramCount++}`);
        params.push(null);
      }
    }

    if (pipe_material !== undefined) {
      updates.push(`pipe_material = $${paramCount++}`);
      params.push(pipe_material);
    }

    if (balance_delimitation !== undefined) {
      updates.push(`balance_delimitation = $${paramCount++}`);
      params.push(balance_delimitation);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    // Добавляем updated_at (не требует параметра)
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Добавляем id в params для WHERE-условия
    // paramCount уже указывает на следующий доступный индекс параметра
    params.push(id);
    const idParamIndex = paramCount;

    // Проверяем наличие полей для RETURNING
    let returningFields = 'id, layer_type, object_type, geojson, address, description, pipe_size';
    try {
      const testResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'layer_objects' AND column_name IN ('pipe_length', 'balance_delimitation', 'pipe_material')
      `);
      if (testResult.rows.some(r => r.column_name === 'pipe_length')) {
        returningFields += ', pipe_length';
      }
      if (testResult.rows.some(r => r.column_name === 'balance_delimitation')) {
        returningFields += ', balance_delimitation';
      }
      if (testResult.rows.some(r => r.column_name === 'pipe_material')) {
        returningFields += ', pipe_material';
      }
    } catch (e) {
      console.log('Ошибка при проверке полей для RETURNING:', e.message);
    }
    returningFields += ', created_at, updated_at';

    // Логирование для отладки
    console.log('Update query:', {
      updates: updates.join(', '),
      idParamIndex,
      paramsLength: params.length,
      params: params.map((p, i) => `${i + 1}: ${typeof p === 'object' ? JSON.stringify(p) : p}`)
    });

    const query = `
      UPDATE layer_objects 
      SET ${updates.join(', ')}
      WHERE id = $${idParamIndex}
      RETURNING ${returningFields}
    `;
    
    console.log('Executing query:', query);
    console.log('With params:', params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Объект не найден после обновления' });
    }

    const row = result.rows[0];
    res.json({
      message: 'Объект слоя успешно обновлен',
      object: {
        id: row.id,
        layer_type: row.layer_type,
        object_type: row.object_type,
        geojson: row.geojson,
        address: row.address || null,
        description: row.description || null,
        pipe_size: row.pipe_size || null,
        pipe_length: row.pipe_length ? parseFloat(row.pipe_length) : null,
        balance_delimitation: row.balance_delimitation || null,
        pipe_material: row.pipe_material || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (error) {
    console.error('Update layer object error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Ошибка при обновлении объекта слоя',
      details: error.message 
    });
  }
});

// Удалить объект слоя
router.delete('/layers/objects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверка прав доступа (только разработчик может удалять)
    if (req.user.role !== 'development') {
      return res.status(403).json({ error: 'Недостаточно прав для удаления объекта слоя' });
    }

    const result = await pool.query('DELETE FROM layer_objects WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Объект слоя не найден' });
    }

    res.json({ message: 'Объект слоя успешно удален' });
  } catch (error) {
    console.error('Delete layer object error:', error);
    res.status(500).json({ error: 'Ошибка при удалении объекта слоя' });
  }
});

// ========== МАРШРУТЫ ДЛЯ ЗАДВИЖЕК ==========

// Получить задвижки колодца
router.get('/layers/objects/:wellId/valves', authenticateToken, async (req, res) => {
  try {
    const { wellId } = req.params;

    // Проверяем, что объект существует и является колодцем
    const wellCheck = await pool.query(
      'SELECT id, object_type FROM layer_objects WHERE id = $1',
      [wellId]
    );

    if (wellCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Колодец не найден' });
    }

    if (wellCheck.rows[0].object_type !== 'well') {
      return res.status(400).json({ error: 'Объект не является колодцем' });
    }

    const result = await pool.query(
      'SELECT id, valve_type, valve_number, status, description, created_at, updated_at FROM valves WHERE well_id = $1 ORDER BY created_at',
      [wellId]
    );

    res.json({
      valves: result.rows.map(row => ({
        id: row.id,
        valve_type: row.valve_type || null,
        valve_number: row.valve_number || null,
        status: row.status,
        description: row.description || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))
    });
  } catch (error) {
    console.error('Get valves error:', error);
    res.status(500).json({ error: 'Ошибка при получении задвижек' });
  }
});

// Создать задвижку для колодца
router.post('/layers/objects/:wellId/valves', authenticateToken, async (req, res) => {
  try {
    const { wellId } = req.params;
    const { valve_type, valve_number, status, description } = req.body;

    // Проверяем, что объект существует и является колодцем
    const wellCheck = await pool.query(
      'SELECT id, object_type FROM layer_objects WHERE id = $1',
      [wellId]
    );

    if (wellCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Колодец не найден' });
    }

    if (wellCheck.rows[0].object_type !== 'well') {
      return res.status(400).json({ error: 'Объект не является колодцем' });
    }

    // Проверка прав доступа
    if (req.user.role !== 'development' && req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Недостаточно прав для создания задвижки' });
    }

    const validStatuses = ['working', 'not_working', 'needs_repair'];
    const valveStatus = status && validStatuses.includes(status) ? status : 'working';

    const result = await pool.query(`
      INSERT INTO valves (well_id, valve_type, valve_number, status, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, valve_type, valve_number, status, description, created_at, updated_at
    `, [wellId, valve_type || null, valve_number || null, valveStatus, description || null]);

    res.status(201).json({
      message: 'Задвижка успешно создана',
      valve: {
        id: result.rows[0].id,
        valve_type: result.rows[0].valve_type,
        valve_number: result.rows[0].valve_number,
        status: result.rows[0].status,
        description: result.rows[0].description,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Create valve error:', error);
    res.status(500).json({ error: 'Ошибка при создании задвижки' });
  }
});

// Обновить задвижку
router.put('/layers/objects/:wellId/valves/:valveId', authenticateToken, async (req, res) => {
  try {
    const { wellId, valveId } = req.params;
    const { valve_type, valve_number, status, description } = req.body;

    // Проверка прав доступа
    if (req.user.role !== 'development' && req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Недостаточно прав для обновления задвижки' });
    }

    const existingValve = await pool.query(
      'SELECT * FROM valves WHERE id = $1 AND well_id = $2',
      [valveId, wellId]
    );

    if (existingValve.rows.length === 0) {
      return res.status(404).json({ error: 'Задвижка не найдена' });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (valve_type !== undefined) {
      updates.push(`valve_type = $${paramCount++}`);
      params.push(valve_type);
    }

    if (valve_number !== undefined) {
      updates.push(`valve_number = $${paramCount++}`);
      params.push(valve_number);
    }

    if (status !== undefined) {
      const validStatuses = ['working', 'not_working', 'needs_repair'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Недопустимый статус' });
      }
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(valveId, wellId);

    const result = await pool.query(`
      UPDATE valves 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND well_id = $${paramCount + 1}
      RETURNING id, valve_type, valve_number, status, description, created_at, updated_at
    `, params);

    res.json({
      message: 'Задвижка успешно обновлена',
      valve: {
        id: result.rows[0].id,
        valve_type: result.rows[0].valve_type,
        valve_number: result.rows[0].valve_number,
        status: result.rows[0].status,
        description: result.rows[0].description,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update valve error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении задвижки' });
  }
});

// Удалить задвижку
router.delete('/layers/objects/:wellId/valves/:valveId', authenticateToken, async (req, res) => {
  try {
    const { wellId, valveId } = req.params;

    // Проверка прав доступа (только разработчик может удалять)
    if (req.user.role !== 'development') {
      return res.status(403).json({ error: 'Недостаточно прав для удаления задвижки' });
    }

    const result = await pool.query(
      'DELETE FROM valves WHERE id = $1 AND well_id = $2 RETURNING id',
      [valveId, wellId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задвижка не найдена' });
    }

    res.json({ message: 'Задвижка успешно удалена' });
  } catch (error) {
    console.error('Delete valve error:', error);
    res.status(500).json({ error: 'Ошибка при удалении задвижки' });
  }
});

module.exports = router;

