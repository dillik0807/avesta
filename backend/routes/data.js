/**
 * 📊 МАРШРУТЫ ДЛЯ РАБОТЫ С ДАННЫМИ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Получение списка всех доступных годов
router.get('/years/list', authenticateToken, async (req, res) => {
    try {
        const yearsQuery = await db.query(`
            SELECT DISTINCT year FROM (
                SELECT year FROM income WHERE deleted = false
                UNION
                SELECT year FROM expense WHERE deleted = false
                UNION
                SELECT year FROM payments WHERE deleted = false
                UNION
                SELECT year FROM partners WHERE deleted = false
            ) AS all_years
            ORDER BY year DESC
        `);
        res.json({ years: yearsQuery.rows.map(row => row.year) });
    } catch (error) {
        console.error('❌ Ошибка получения списка годов:', error);
        res.status(500).json({ error: 'Ошибка получения списка годов' });
    }
});

// Получение данных для отчёта по долгам (без фильтра по складам — для всех ролей)
router.get('/:year/debts', authenticateToken, async (req, res) => {
    try {
        const { year } = req.params;

        const [expense, payments] = await Promise.all([
            db.query(`
                SELECT e.id, e.date, cl.name as client, e.total, e.notes, e.year
                FROM expense e
                LEFT JOIN clients cl ON e.client_id = cl.id
                WHERE e.year = $1 AND e.deleted = false
                ORDER BY e.date DESC
            `, [year]),
            db.query(`
                SELECT p.id, p.date, cl.name as client, p.amount, p.notes, p.year
                FROM payments p
                LEFT JOIN clients cl ON p.client_id = cl.id
                WHERE p.year = $1 AND p.deleted = false
                ORDER BY p.date DESC
            `, [year]),
        ]);

        res.json({ expense: expense.rows, payments: payments.rows });
    } catch (error) {
        console.error('❌ Ошибка получения данных долгов:', error);
        res.status(500).json({ error: 'Ошибка получения данных' });
    }
});

// Получение всех данных для года
router.get('/:year', authenticateToken, async (req, res) => {
    try {
        const { year } = req.params;
        const userRole = req.user.role;
        const warehouseGroup = req.user.warehouseGroup;

        // Фильтрация по складам для роли "warehouse"
        // Для admin и других ролей — фильтр не применяется, видят всё
        let warehouseFilter = '';
        let extraParams = [];

        let allowedGroups = null; // null = все группы (для admin)

        const showAll = req.query.all === 'true'; // параметр для отключения фильтра

        if (userRole === 'warehouse' && warehouseGroup && !showAll) {
            let groups = warehouseGroup;
            if (typeof groups === 'string') {
                try { groups = JSON.parse(groups); } catch(e) { groups = [groups]; }
            }
            if (!Array.isArray(groups)) groups = [groups];
            allowedGroups = groups;

            const wResult = await db.query(
                'SELECT id FROM warehouses WHERE warehouse_group = ANY($1)',
                [groups]
            );
            const ids = wResult.rows.map(w => w.id);
            if (ids.length > 0) {
                warehouseFilter = 'AND warehouse_id = ANY($2)';
                extraParams = [ids];
            }
        }

        const [income, expense, payments, partners, companies, warehouses, products, clients, coalitions] = await Promise.all([
            db.query(`
                SELECT i.*, TO_CHAR(i.date, 'YYYY-MM-DD') as date, c.name as company, w.name as warehouse, p.name as product, u.username as user
                FROM income i
                LEFT JOIN companies c ON i.company_id = c.id
                LEFT JOIN warehouses w ON i.warehouse_id = w.id
                LEFT JOIN products p ON i.product_id = p.id
                LEFT JOIN users u ON i.user_id = u.id
                WHERE i.year = $1 AND i.deleted = false ${warehouseFilter}
                ORDER BY i.date DESC, i.id DESC
            `, [year, ...extraParams]),

            db.query(`
                SELECT e.*, TO_CHAR(e.date, 'YYYY-MM-DD') as date, c.name as company, w.name as warehouse, p.name as product, cl.name as client, u.username as user
                FROM expense e
                LEFT JOIN companies c ON e.company_id = c.id
                LEFT JOIN warehouses w ON e.warehouse_id = w.id
                LEFT JOIN products p ON e.product_id = p.id
                LEFT JOIN clients cl ON e.client_id = cl.id
                LEFT JOIN users u ON e.user_id = u.id
                WHERE e.year = $1 AND e.deleted = false ${warehouseFilter}
                ORDER BY e.date DESC, e.id DESC
            `, [year, ...extraParams]),

            db.query(`
                SELECT p.*, TO_CHAR(p.date, 'YYYY-MM-DD') as date, cl.name as client, u.username as user
                FROM payments p
                LEFT JOIN clients cl ON p.client_id = cl.id
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.year = $1 AND p.deleted = false
                ORDER BY p.date DESC, p.id DESC
            `, [year]),

            db.query(`
                SELECT p.*, TO_CHAR(p.date, 'YYYY-MM-DD') as date, cl.name as client, u.username as user
                FROM partners p
                LEFT JOIN clients cl ON p.client_id = cl.id
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.year = $1 AND p.deleted = false
                ORDER BY p.date DESC, p.id DESC
            `, [year]),

            db.query('SELECT * FROM companies ORDER BY name'),
            allowedGroups
                ? db.query('SELECT * FROM warehouses WHERE warehouse_group = ANY($1) ORDER BY name', [allowedGroups])
                : db.query('SELECT * FROM warehouses ORDER BY name'),
            db.query(`
                SELECT p.*,
                    (SELECT price FROM product_prices
                     WHERE product_id = p.id
                     ORDER BY effective_date DESC, created_at DESC
                     LIMIT 1) as price
                FROM products p ORDER BY p.name
            `),
            db.query('SELECT * FROM clients ORDER BY name'),
            db.query('SELECT * FROM coalitions ORDER BY name')
        ]);

        res.json({
            year: parseInt(year),
            income: income.rows,
            expense: expense.rows,
            payments: payments.rows,
            partners: partners.rows,
            companies: companies.rows,
            warehouses: warehouses.rows,
            products: products.rows,
            clients: clients.rows,
            coalitions: coalitions.rows,
            lastModified: Date.now()
        });

    } catch (error) {
        console.error('❌ Ошибка получения данных:', error);
        res.status(500).json({ error: 'Ошибка получения данных' });
    }
});

// Синхронизация данных
router.post('/sync', authenticateToken, async (req, res) => {
    try {
        const { year, lastSyncTime } = req.body;
        const modifiedData = await db.query(`
            SELECT 'income' as table_name, id, created_at, edited_at FROM income
            WHERE year = $1 AND (EXTRACT(EPOCH FROM created_at)*1000 > $2 OR EXTRACT(EPOCH FROM edited_at)*1000 > $2)
            UNION ALL
            SELECT 'expense' as table_name, id, created_at, edited_at FROM expense
            WHERE year = $1 AND (EXTRACT(EPOCH FROM created_at)*1000 > $2 OR EXTRACT(EPOCH FROM edited_at)*1000 > $2)
            UNION ALL
            SELECT 'payments' as table_name, id, created_at, edited_at FROM payments
            WHERE year = $1 AND (EXTRACT(EPOCH FROM created_at)*1000 > $2 OR EXTRACT(EPOCH FROM edited_at)*1000 > $2)
        `, [year, lastSyncTime || 0]);

        res.json({
            hasChanges: modifiedData.rows.length > 0,
            changes: modifiedData.rows,
            serverTime: Date.now()
        });
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        res.status(500).json({ error: 'Ошибка синхронизации' });
    }
});

module.exports = router;
