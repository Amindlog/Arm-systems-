const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Получить все заявки
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, team_id, date_from, date_to } = req.query;
    
    let query = `
      SELECT 
        a.id,
        a.address,
        a.description,
        a.submitted_by,
        a.phone,
        a.status,
        a.latitude,
        a.longitude,
        a.line_id,
        a.created_at,
        a.updated_at,
        a.completed_at,
        t.id as team_id,
        t.name as team_name,
        u.id as accepted_by_id,
        u.name as accepted_by_name
      FROM applications a
      LEFT JOIN teams t ON a.team_id = t.id
      LEFT JOIN users u ON a.accepted_by = u.id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`a.status = $${paramCount++}`);
      params.push(status);
    }

    if (team_id) {
      conditions.push(`a.team_id = $${paramCount++}`);
      params.push(team_id);
    }

    // Фильтр по дате (от)
    if (date_from) {
      const fromDate = new Date(date_from);
      fromDate.setHours(0, 0, 0, 0);
      conditions.push(`a.created_at >= $${paramCount++}`);
      params.push(fromDate.toISOString());
    }

    // Фильтр по дате (до)
    if (date_to) {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(`a.created_at <= $${paramCount++}`);
      params.push(toDate.toISOString());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      applications: result.rows.map(row => {
        const lat = row.latitude != null ? parseFloat(row.latitude) : null;
        const lng = row.longitude != null ? parseFloat(row.longitude) : null;
        
        return {
          id: row.id,
          address: row.address,
          description: row.description,
          submitted_by: row.submitted_by,
          phone: row.phone || null,
          status: row.status,
          coordinates: (lat != null && !isNaN(lat) && lng != null && !isNaN(lng)) ? {
            lat: lat,
            lng: lng
          } : null,
          line_id: row.line_id || null,
          team: row.team_id ? {
            id: row.team_id,
            name: row.team_name
          } : null,
          accepted_by: row.accepted_by_id ? {
            id: row.accepted_by_id,
            name: row.accepted_by_name
          } : null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          completed_at: row.completed_at || null
        };
      })
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Ошибка при получении заявок' });
  }
});

// Получить заявку по ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        a.id,
        a.address,
        a.description,
        a.submitted_by,
        a.phone,
        a.status,
        a.latitude,
        a.longitude,
        a.line_id,
        a.created_at,
        a.updated_at,
        a.completed_at,
        t.id as team_id,
        t.name as team_name,
        u.id as accepted_by_id,
        u.name as accepted_by_name
      FROM applications a
      LEFT JOIN teams t ON a.team_id = t.id
      LEFT JOIN users u ON a.accepted_by = u.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      address: row.address,
      description: row.description,
      submitted_by: row.submitted_by,
      phone: row.phone || null,
      status: row.status,
      coordinates: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      },
      line_id: row.line_id || null,
      team: row.team_id ? {
        id: row.team_id,
        name: row.team_name
      } : null,
        accepted_by: row.accepted_by_id ? {
          id: row.accepted_by_id,
          name: row.accepted_by_name
        } : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        completed_at: row.completed_at || null
      });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Ошибка при получении заявки' });
  }
});

// Создать заявку (только диспетчер)
router.post('/', authenticateToken, requireRole('dispatcher', 'development'), async (req, res) => {
  try {
    const { address, description, submitted_by, phone, team_id, latitude, longitude, line_id } = req.body;

    if (!address || !team_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Адрес, бригада и координаты обязательны' });
    }

    // Проверка существования бригады
    const teamCheck = await pool.query('SELECT id FROM teams WHERE id = $1', [team_id]);
    if (teamCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Бригада не найдена' });
    }

    // Проверка существования линии, если указана
    if (line_id) {
      const lineCheck = await pool.query('SELECT id FROM layer_objects WHERE id = $1 AND object_type = $2', [line_id, 'line']);
      if (lineCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Линия не найдена' });
      }
    }

    const result = await pool.query(`
      INSERT INTO applications (address, description, submitted_by, phone, accepted_by, team_id, latitude, longitude, line_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new')
      RETURNING id, address, description, submitted_by, phone, status, latitude, longitude, team_id, line_id, created_at
    `, [address, description || null, submitted_by || null, phone || null, req.user.id, team_id, latitude, longitude, line_id || null]);

    const application = result.rows[0];

    // Получаем информацию о бригаде
    const teamResult = await pool.query('SELECT id, name FROM teams WHERE id = $1', [team_id]);
    const team = teamResult.rows[0];

    res.status(201).json({
      message: 'Заявка успешно создана',
      application: {
        id: application.id,
        address: application.address,
        description: application.description,
        submitted_by: application.submitted_by,
        phone: application.phone || null,
        status: application.status,
        coordinates: {
          lat: parseFloat(application.latitude),
          lng: parseFloat(application.longitude)
        },
        line_id: application.line_id || null,
        team: {
          id: team.id,
          name: team.name
        },
        accepted_by: {
          id: req.user.id,
          name: req.user.name
        },
        created_at: application.created_at
      }
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

// Обновить заявку
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { address, description, submitted_by, phone, status, team_id, completed_at } = req.body;

    // Проверка существования заявки
    const existingApp = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (existingApp.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Проверка прав доступа
    const isDirector = req.user.role === 'development';
    const isDispatcher = req.user.role === 'dispatcher';
    const isOwner = existingApp.rows[0].accepted_by === req.user.id;

    if (!isDirector && !isDispatcher && !isOwner) {
      return res.status(403).json({ error: 'Недостаточно прав для обновления заявки' });
    }

    // Обновление полей
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      params.push(address);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }

    if (submitted_by !== undefined) {
      updates.push(`submitted_by = $${paramCount++}`);
      params.push(submitted_by);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      params.push(phone);
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
      
      // Если статус меняется на completed и completed_at не указан, устанавливаем текущее время
      if (status === 'completed' && completed_at === undefined) {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      }
      // Если статус меняется с completed на другой, очищаем completed_at
      if (status !== 'completed' && existingApp.rows[0].status === 'completed') {
        updates.push(`completed_at = NULL`);
      }
    }

    if (completed_at !== undefined) {
      // Если completed_at указан явно, используем его
      if (completed_at === null) {
        updates.push(`completed_at = NULL`);
      } else {
        updates.push(`completed_at = $${paramCount++}`);
        params.push(completed_at);
      }
    }

    if (team_id !== undefined) {
      // Проверка существования бригады
      const teamCheck = await pool.query('SELECT id FROM teams WHERE id = $1', [team_id]);
      if (teamCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Бригада не найдена' });
      }
      updates.push(`team_id = $${paramCount++}`);
      params.push(team_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(`
      UPDATE applications 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params);

    const updatedApp = result.rows[0];

    // Получаем связанные данные
    const teamResult = await pool.query('SELECT id, name FROM teams WHERE id = $1', [updatedApp.team_id]);
    const team = teamResult.rows[0] || null;

    const userResult = await pool.query('SELECT id, name FROM users WHERE id = $1', [updatedApp.accepted_by]);
    const acceptedBy = userResult.rows[0] || null;

    res.json({
      message: 'Заявка успешно обновлена',
      application: {
        id: updatedApp.id,
        address: updatedApp.address,
        description: updatedApp.description,
        submitted_by: updatedApp.submitted_by,
        phone: updatedApp.phone || null,
        status: updatedApp.status,
        coordinates: {
          lat: parseFloat(updatedApp.latitude),
          lng: parseFloat(updatedApp.longitude)
        },
        team: team ? {
          id: team.id,
          name: team.name
        } : null,
        accepted_by: acceptedBy ? {
          id: acceptedBy.id,
          name: acceptedBy.name
        } : null,
        created_at: updatedApp.created_at,
        updated_at: updatedApp.updated_at,
        completed_at: updatedApp.completed_at || null
      }
    });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении заявки' });
  }
});

// Удалить заявку (только разработчик)
router.delete('/:id', authenticateToken, requireRole('development'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM applications WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    res.json({ message: 'Заявка успешно удалена' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Ошибка при удалении заявки' });
  }
});

// Получить список бригад
router.get('/teams/list', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM teams ORDER BY id');
    res.json({ teams: result.rows });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Ошибка при получении списка бригад' });
  }
});

module.exports = router;

