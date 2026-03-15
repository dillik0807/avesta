/**
 * 💰 МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ ЦЕНАМИ ТОВАРОВ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Получить все цены (с информацией о товарах)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                pp.id,
                pp.product_id,
                p.name as product_name,
                pp.price,
                pp.warehouse_group,
                pp.effective_date,
                pp.notes,
                pp.created_at,
                u.username as created_by_name
            FROM product_prices pp
            JOIN products p ON pp.product_id = p.id
            LEFT JOIN users u ON pp.created_by = u.id
            ORDER BY pp.effective_date DESC, pp.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Ошибка получения цен:', error);
        res.status(500).json({ error: 'Ошибка получения цен' });
    }
});

// Получить последнюю цену для товара
router.get('/product/:productId/latest', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        
        const result = await db.query(`
            SELECT 
                pp.*,
                p.name as product_name
            FROM product_prices pp
            JOIN products p ON pp.product_id = p.id
            WHERE pp.product_id = $1
            ORDER BY pp.effective_date DESC, pp.created_at DESC
            LIMIT 1
        `, [productId]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Цена не найдена' });
        }
    } catch (error) {
        console.error('❌ Ошибка получения цены:', error);
        res.status(500).json({ error: 'Ошибка получения цены' });
    }
});

// Добавить новую цену
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { product_id, price, warehouse_group, effective_date, notes } = req.body;
        
        const result = await db.query(`
            INSERT INTO product_prices (product_id, price, warehouse_group, effective_date, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [product_id, price, warehouse_group || 'ALL', effective_date || new Date(), notes, req.user.id]);
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка добавления цены:', error);
        res.status(500).json({ error: 'Ошибка добавления цены' });
    }
});

// Обновить цену
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { price, effective_date, notes } = req.body;
        
        const result = await db.query(`
            UPDATE product_prices
            SET price = $1, effective_date = $2, notes = $3
            WHERE id = $4
            RETURNING *
        `, [price, effective_date, notes, id]);
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка обновления цены:', error);
        res.status(500).json({ error: 'Ошибка обновления цены' });
    }
});

// Удалить цену
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query('DELETE FROM product_prices WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления цены:', error);
        res.status(500).json({ error: 'Ошибка удаления цены' });
    }
});

// Очистить старые цены
router.post('/clear-old', authenticateToken, async (req, res) => {
    try {
        const { beforeDate } = req.body;
        
        const result = await db.query(
            'DELETE FROM product_prices WHERE effective_date < $1',
            [beforeDate]
        );
        
        res.json({ success: true, deleted: result.rowCount });
    } catch (error) {
        console.error('❌ Ошибка очистки старых цен:', error);
        res.status(500).json({ error: 'Ошибка очистки старых цен' });
    }
});

module.exports = router;
