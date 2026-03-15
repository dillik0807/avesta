/**
 * 📥 МАРШРУТЫ ДЛЯ ПРИХОДА ТОВАРОВ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Получить все записи прихода
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { year } = req.query;
        const result = await db.query(`
            SELECT i.*, 
                TO_CHAR(i.date, 'YYYY-MM-DD') as date,
                c.name as company, 
                w.name as warehouse, 
                p.name as product,
                u.username
            FROM income i
            LEFT JOIN companies c ON i.company_id = c.id
            LEFT JOIN warehouses w ON i.warehouse_id = w.id
            LEFT JOIN products p ON i.product_id = p.id
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.year = $1 AND i.deleted = false
            ORDER BY i.date DESC, i.id DESC
        `, [year]);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Ошибка получения прихода:', error);
        res.status(500).json({ error: 'Ошибка получения данных' });
    }
});

// Добавить приход
router.post('/', authenticateToken, async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const {
            year, date, wagon_number, company, warehouse, product,
            qty_doc, qty_fact, difference, total_weight, notes, user_id
        } = req.body;

        console.log('📥 Добавление прихода:', req.body);

        // Проверка и создание года если не существует
        const yearCheck = await client.query('SELECT id FROM years WHERE year = $1', [year]);
        if (yearCheck.rows.length === 0) {
            console.log(`📅 Создание года ${year} в базе данных`);
            await client.query(
                'INSERT INTO years (year, last_modified) VALUES ($1, $2)',
                [year, Date.now()]
            );
        }

        // Получение или создание компании
        let companyId;
        const existingCompany = await client.query('SELECT id FROM companies WHERE name = $1', [company]);
        if (existingCompany.rows.length > 0) {
            companyId = existingCompany.rows[0].id;
        } else {
            const newCompany = await client.query('INSERT INTO companies (name) VALUES ($1) RETURNING id', [company]);
            companyId = newCompany.rows[0].id;
        }

        // Получение или создание склада
        let warehouseId;
        const existingWarehouse = await client.query(
            'SELECT id FROM warehouses WHERE name = $1 LIMIT 1', 
            [warehouse]
        );
        if (existingWarehouse.rows.length > 0) {
            warehouseId = existingWarehouse.rows[0].id;
        } else {
            const newWarehouse = await client.query(
                'INSERT INTO warehouses (name, warehouse_group) VALUES ($1, $2) RETURNING id',
                [warehouse, null]
            );
            warehouseId = newWarehouse.rows[0].id;
        }

        // Получение или создание товара
        let productId;
        const existingProduct = await client.query('SELECT id FROM products WHERE name = $1', [product]);
        if (existingProduct.rows.length > 0) {
            productId = existingProduct.rows[0].id;
        } else {
            const newProduct = await client.query('INSERT INTO products (name) VALUES ($1) RETURNING id', [product]);
            productId = newProduct.rows[0].id;
        }

        // Вставка записи прихода
        const result = await client.query(`
            INSERT INTO income (
                year, date, wagon, company_id, warehouse_id, product_id,
                qty_doc, qty_fact, difference, weight_tons, notes, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            year, date, wagon_number, companyId, warehouseId, productId,
            qty_doc, qty_fact, difference, total_weight, notes, user_id || req.user.id
        ]);

        await client.query('COMMIT');
        
        console.log('✅ Приход добавлен:', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка добавления прихода:', error);
        res.status(500).json({ error: 'Ошибка добавления прихода: ' + error.message });
    } finally {
        client.release();
    }
});

// Обновить приход
router.put('/:id', authenticateToken, async (req, res) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const {
            date, wagon_number, company, warehouse, product,
            qty_doc, qty_fact, difference, total_weight, notes
        } = req.body;

        // Получение или создание компании
        let companyId;
        const existingCompany = await client.query('SELECT id FROM companies WHERE name = $1', [company]);
        if (existingCompany.rows.length > 0) {
            companyId = existingCompany.rows[0].id;
        } else {
            const newCompany = await client.query('INSERT INTO companies (name) VALUES ($1) RETURNING id', [company]);
            companyId = newCompany.rows[0].id;
        }

        // Получение или создание склада
        let warehouseId;
        const existingWarehouse = await client.query(
            'SELECT id FROM warehouses WHERE name = $1 LIMIT 1', 
            [warehouse]
        );
        if (existingWarehouse.rows.length > 0) {
            warehouseId = existingWarehouse.rows[0].id;
        } else {
            const newWarehouse = await client.query(
                'INSERT INTO warehouses (name, warehouse_group) VALUES ($1, $2) RETURNING id',
                [warehouse, null]
            );
            warehouseId = newWarehouse.rows[0].id;
        }

        // Получение или создание товара
        let productId;
        const existingProduct = await client.query('SELECT id FROM products WHERE name = $1', [product]);
        if (existingProduct.rows.length > 0) {
            productId = existingProduct.rows[0].id;
        } else {
            const newProduct = await client.query('INSERT INTO products (name) VALUES ($1) RETURNING id', [product]);
            productId = newProduct.rows[0].id;
        }

        // Обновление записи
        const result = await client.query(`
            UPDATE income SET
                date = $1, wagon = $2, company_id = $3, warehouse_id = $4, product_id = $5,
                qty_doc = $6, qty_fact = $7, difference = $8, weight_tons = $9, notes = $10,
                edited_by = $11, edited_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `, [
            date, wagon_number, companyId, warehouseId, productId,
            qty_doc, qty_fact, difference, total_weight, notes,
            req.user.id, id
        ]);

        await client.query('COMMIT');
        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка обновления прихода:', error);
        res.status(500).json({ error: 'Ошибка обновления прихода: ' + error.message });
    } finally {
        client.release();
    }
});

// Удалить приход (мягкое удаление)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE income SET deleted = true WHERE id = $1',
            [id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления прихода:', error);
        res.status(500).json({ error: 'Ошибка удаления прихода' });
    }
});

module.exports = router;
