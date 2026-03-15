/**
 * 📅 МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ ГОДАМИ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Middleware — только для админа
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ только для администратора' });
    }
    next();
}

// Получить список годов с количеством записей
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT year,
                COUNT(DISTINCT i.id) as income_count,
                COUNT(DISTINCT e.id) as expense_count,
                COUNT(DISTINCT p.id) as payments_count
            FROM (
                SELECT year FROM income WHERE deleted = false
                UNION SELECT year FROM expense WHERE deleted = false
                UNION SELECT year FROM payments WHERE deleted = false
                UNION SELECT year FROM partners WHERE deleted = false
            ) y
            LEFT JOIN income i ON i.year = y.year AND i.deleted = false
            LEFT JOIN expense e ON e.year = y.year AND e.deleted = false
            LEFT JOIN payments p ON p.year = y.year AND p.deleted = false
            GROUP BY year ORDER BY year DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Ошибка получения годов:', error);
        res.status(500).json({ error: 'Ошибка получения годов' });
    }
});

// Копировать данные из одного года в другой
router.post('/copy', authenticateToken, adminOnly, async (req, res) => {
    const { from_year, to_year, tables } = req.body;

    if (!from_year || !to_year) {
        return res.status(400).json({ error: 'Укажите исходный и целевой год' });
    }
    if (from_year === to_year) {
        return res.status(400).json({ error: 'Исходный и целевой год не могут совпадать' });
    }

    const allowedTables = ['income', 'expense', 'payments', 'partners'];
    const targetTables = tables && tables.length > 0
        ? tables.filter(t => allowedTables.includes(t))
        : allowedTables;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const results = {};

        for (const table of targetTables) {
            const cols = await client.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = $1 AND column_name NOT IN ('id', 'created_at', 'edited_at')
                ORDER BY ordinal_position
            `, [table]);

            const colNames = cols.rows.map(r => r.column_name);
            const selectCols = colNames.map(c => c === 'year' ? `${to_year} as year` : c).join(', ');
            const insertCols = colNames.join(', ');

            const result = await client.query(`
                INSERT INTO ${table} (${insertCols})
                SELECT ${selectCols} FROM ${table}
                WHERE year = $1 AND deleted = false
            `, [from_year]);

            results[table] = result.rowCount;
        }

        await client.query('COMMIT');
        console.log(`✅ Данные скопированы из ${from_year} в ${to_year}:`, results);
        res.json({ success: true, copied: results });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка копирования:', error);
        res.status(500).json({ error: 'Ошибка копирования данных: ' + error.message });
    } finally {
        client.release();
    }
});

// Переместить данные из одного года в другой (копировать + удалить из источника)
router.post('/move', authenticateToken, adminOnly, async (req, res) => {
    const { from_year, to_year, tables } = req.body;

    if (!from_year || !to_year) {
        return res.status(400).json({ error: 'Укажите исходный и целевой год' });
    }
    if (from_year === to_year) {
        return res.status(400).json({ error: 'Исходный и целевой год не могут совпадать' });
    }

    const allowedTables = ['income', 'expense', 'payments', 'partners'];
    const targetTables = tables && tables.length > 0
        ? tables.filter(t => allowedTables.includes(t))
        : allowedTables;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const results = {};

        for (const table of targetTables) {
            // Обновляем год у записей
            const result = await client.query(`
                UPDATE ${table} SET year = $1 WHERE year = $2 AND deleted = false
            `, [to_year, from_year]);

            results[table] = result.rowCount;
        }

        await client.query('COMMIT');
        console.log(`✅ Данные перемещены из ${from_year} в ${to_year}:`, results);
        res.json({ success: true, moved: results });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка перемещения:', error);
        res.status(500).json({ error: 'Ошибка перемещения данных: ' + error.message });
    } finally {
        client.release();
    }
});

module.exports = router;
