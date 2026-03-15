/**
 * 💰 МАРШРУТЫ ДЛЯ ПОГАШЕНИЙ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Добавить погашение
router.post('/', authenticateToken, async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const { year, date, client: clientName, somoni, rate, amount, notes } = req.body;

        // Проверка и создание года если не существует
        const yearCheck = await client.query('SELECT id FROM years WHERE year = $1', [year]);
        if (yearCheck.rows.length === 0) {
            console.log(`📅 Создание года ${year} в базе данных`);
            await client.query(
                'INSERT INTO years (year, last_modified) VALUES ($1, $2)',
                [year, Date.now()]
            );
        }

        // Проверяем существует ли клиент с таким именем
        let clientResult = await client.query(
            'SELECT id FROM clients WHERE name = $1 LIMIT 1',
            [clientName]
        );
        
        let clientId;
        if (clientResult.rows.length > 0) {
            // Клиент существует, используем его ID
            clientId = clientResult.rows[0].id;
        } else {
            // Клиент не существует, создаем нового
            clientResult = await client.query(
                'INSERT INTO clients (name, phone) VALUES ($1, NULL) RETURNING id',
                [clientName]
            );
            clientId = clientResult.rows[0].id;
        }

        const result = await client.query(`
            INSERT INTO payments (year, date, client_id, somoni, rate, amount, notes, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [year, date, clientId, somoni, rate, amount, notes, req.user.id]);

        await client.query('COMMIT');
        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка добавления погашения:', error);
        res.status(500).json({ error: 'Ошибка добавления погашения' });
    } finally {
        client.release();
    }
});

// Обновить погашение
router.put('/:id', authenticateToken, async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { date, client: clientName, somoni, rate, amount, notes } = req.body;

        // Проверяем существует ли клиент с таким именем
        let clientResult = await client.query(
            'SELECT id FROM clients WHERE name = $1 LIMIT 1',
            [clientName]
        );
        
        let clientId;
        if (clientResult.rows.length > 0) {
            // Клиент существует, используем его ID
            clientId = clientResult.rows[0].id;
        } else {
            // Клиент не существует, создаем нового
            clientResult = await client.query(
                'INSERT INTO clients (name, phone) VALUES ($1, NULL) RETURNING id',
                [clientName]
            );
            clientId = clientResult.rows[0].id;
        }

        const result = await client.query(`
            UPDATE payments SET
                date = $1, client_id = $2, somoni = $3, rate = $4, amount = $5, notes = $6,
                edited_by = $7, edited_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [date, clientId, somoni, rate, amount, notes, req.user.id, id]);

        await client.query('COMMIT');
        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка обновления погашения:', error);
        res.status(500).json({ error: 'Ошибка обновления погашения' });
    } finally {
        client.release();
    }
});

// Удалить погашение
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('UPDATE payments SET deleted = true WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления погашения:', error);
        res.status(500).json({ error: 'Ошибка удаления погашения' });
    }
});

module.exports = router;
