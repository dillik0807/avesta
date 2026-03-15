/**
 * 📤 МАРШРУТЫ ДЛЯ РАСХОДА ТОВАРОВ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Добавить расход
router.post('/', authenticateToken, async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const {
            year, date, coalition, number, company, warehouse, product, client: clientName,
            quantity, tons, price, total, notes
        } = req.body;

        // Проверка и создание года если не существует
        const yearCheck = await client.query('SELECT id FROM years WHERE year = $1', [year]);
        if (yearCheck.rows.length === 0) {
            console.log(`📅 Создание года ${year} в базе данных`);
            await client.query(
                'INSERT INTO years (year, last_modified) VALUES ($1, $2)',
                [year, Date.now()]
            );
        }

        // Получение ID связанных записей
        const companyId = (await client.query(
            'INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
            [company]
        )).rows[0].id;

        const warehouseId = (await client.query(
            'SELECT id FROM warehouses WHERE name = $1',
            [warehouse]
        )).rows[0].id;

        const productId = (await client.query(
            'INSERT INTO products (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
            [product]
        )).rows[0].id;

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

        // Вставка расхода
        const result = await client.query(`
            INSERT INTO expense (
                year, date, coalition, number, company_id, warehouse_id, product_id, client_id,
                quantity, tons, price, total, notes, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [
            year, date, coalition, number, companyId, warehouseId, productId, clientId,
            quantity, tons, price, total, notes, req.user.id
        ]);

        await client.query('COMMIT');
        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка добавления расхода:', error);
        res.status(500).json({ error: 'Ошибка добавления расхода' });
    } finally {
        client.release();
    }
});

// Обновить расход
router.put('/:id', authenticateToken, async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const {
            date, coalition, number, company, warehouse, product, client: clientName,
            quantity, tons, price, total, notes
        } = req.body;

        const companyId = (await client.query(
            'INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
            [company]
        )).rows[0].id;

        const warehouseId = (await client.query(
            'SELECT id FROM warehouses WHERE name = $1',
            [warehouse]
        )).rows[0].id;

        const productId = (await client.query(
            'INSERT INTO products (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
            [product]
        )).rows[0].id;

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
            UPDATE expense SET
                date = $1, coalition = $2, number = $3, company_id = $4, warehouse_id = $5,
                product_id = $6, client_id = $7, quantity = $8, tons = $9, price = $10,
                total = $11, notes = $12, edited_by = $13, edited_at = CURRENT_TIMESTAMP
            WHERE id = $14
            RETURNING *
        `, [
            date, coalition, number, companyId, warehouseId, productId, clientId,
            quantity, tons, price, total, notes, req.user.id, id
        ]);

        await client.query('COMMIT');
        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка обновления расхода:', error);
        res.status(500).json({ error: 'Ошибка обновления расхода' });
    } finally {
        client.release();
    }
});

// Удалить расход
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('UPDATE expense SET deleted = true WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления расхода:', error);
        res.status(500).json({ error: 'Ошибка удаления расхода' });
    }
});

module.exports = router;
