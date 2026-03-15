/**
 * 🤝 МАРШРУТЫ ДЛЯ РАБОТЫ С ПАРТНЕРАМИ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Получение всех партнеров
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { year } = req.query;
        
        const result = await db.query(`
            SELECT p.*, 
                cl.name as client,
                u.username as user
            FROM partners p
            LEFT JOIN clients cl ON p.client_id = cl.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.year = $1 AND p.deleted = false
            ORDER BY p.date DESC, p.id DESC
        `, [year || 2025]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Ошибка получения партнеров:', error);
        res.status(500).json({ error: 'Ошибка получения партнеров' });
    }
});

// Добавление партнера
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { date, client, somoni, rate, amount, notes, year } = req.body;
        const userId = req.user.id;

        // Проверяем/создаем клиента
        let clientId = null;
        if (client) {
            const clientCheck = await db.query(
                'SELECT id FROM clients WHERE name = $1',
                [client]
            );
            
            if (clientCheck.rows.length > 0) {
                clientId = clientCheck.rows[0].id;
            } else {
                const clientInsert = await db.query(
                    'INSERT INTO clients (name) VALUES ($1) RETURNING id',
                    [client]
                );
                clientId = clientInsert.rows[0].id;
            }
        }
        
        // Добавляем партнера
        const result = await db.query(`
            INSERT INTO partners (year, date, client_id, somoni, rate, amount, notes, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [year || 2025, date, clientId, somoni, rate, amount, notes, userId]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Ошибка добавления партнера:', error);
        res.status(500).json({ error: 'Ошибка добавления партнера' });
    }
});

// Обновление партнера
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, client, somoni, rate, amount, notes } = req.body;
        const userId = req.user.id;
        
        // Проверяем/создаем клиента
        let clientId = null;
        if (client) {
            const clientCheck = await db.query(
                'SELECT id FROM clients WHERE name = $1',
                [client]
            );
            
            if (clientCheck.rows.length > 0) {
                clientId = clientCheck.rows[0].id;
            } else {
                const clientInsert = await db.query(
                    'INSERT INTO clients (name) VALUES ($1) RETURNING id',
                    [client]
                );
                clientId = clientInsert.rows[0].id;
            }
        }
        
        const result = await db.query(`
            UPDATE partners 
            SET date = $1, client_id = $2, somoni = $3, rate = $4, 
                amount = $5, notes = $6, edited_by = $7, edited_at = NOW()
            WHERE id = $8 AND deleted = false
            RETURNING *
        `, [date, clientId, somoni, rate, amount, notes, userId, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Партнер не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Ошибка обновления партнера:', error);
        res.status(500).json({ error: 'Ошибка обновления партнера' });
    }
});

// Удаление партнера (мягкое удаление)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const result = await db.query(`
            UPDATE partners 
            SET deleted = true, edited_by = $1, edited_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [userId, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Партнер не найден' });
        }
        
        res.json({ message: 'Партнер удален', id });
    } catch (error) {
        console.error('❌ Ошибка удаления партнера:', error);
        res.status(500).json({ error: 'Ошибка удаления партнера' });
    }
});

module.exports = router;
