/**
 * ⚙️ МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ СПРАВОЧНИКАМИ
 */

const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Получить все справочники
router.get('/dictionaries', authenticateToken, async (req, res) => {
    try {
        const [companies, warehouses, products, clients, coalitions] = await Promise.all([
            db.query('SELECT * FROM companies ORDER BY name'),
            db.query('SELECT * FROM warehouses ORDER BY name'),
            db.query('SELECT * FROM products ORDER BY name'),
            db.query('SELECT * FROM clients ORDER BY name'),
            db.query('SELECT * FROM coalitions ORDER BY name')
        ]);

        res.json({
            companies: companies.rows,
            warehouses: warehouses.rows,
            products: products.rows,
            clients: clients.rows,
            coalitions: coalitions.rows
        });
    } catch (error) {
        console.error('❌ Ошибка получения справочников:', error);
        res.status(500).json({ error: 'Ошибка получения справочников' });
    }
});

// Добавить фирму
router.post('/companies', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await db.query(
            'INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка добавления фирмы:', error);
        res.status(500).json({ error: 'Ошибка добавления фирмы' });
    }
});

// Добавить склад
router.post('/warehouses', authenticateToken, async (req, res) => {
    try {
        const { name, warehouseGroup } = req.body;
        const result = await db.query(
            'INSERT INTO warehouses (name, warehouse_group) VALUES ($1, $2) RETURNING *',
            [name, warehouseGroup]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка добавления склада:', error);
        res.status(500).json({ error: 'Ошибка добавления склада' });
    }
});

// Добавить товар
router.post('/products', authenticateToken, async (req, res) => {
    try {
        const { name, weightPerUnit, price } = req.body;
        const result = await db.query(
            'INSERT INTO products (name, weight_per_unit, price) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name, weightPerUnit || 0.050, price || 0]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка добавления товара:', error);
        res.status(500).json({ error: 'Ошибка добавления товара' });
    }
});

// Добавить клиента
router.post('/clients', authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const result = await db.query(
            'INSERT INTO clients (name, phone) VALUES ($1, $2) RETURNING *',
            [name, phone]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка добавления клиента:', error);
        res.status(500).json({ error: 'Ошибка добавления клиента' });
    }
});

// Обновить фирму
router.put('/companies/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await db.query(
            'UPDATE companies SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка обновления фирмы:', error);
        res.status(500).json({ error: 'Ошибка обновления фирмы' });
    }
});

// Удалить фирму
router.delete('/companies/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, используется ли фирма
        const checkIncome = await db.query('SELECT COUNT(*) FROM income WHERE company_id = $1', [id]);
        const checkExpense = await db.query('SELECT COUNT(*) FROM expense WHERE company_id = $1', [id]);
        
        const incomeCount = parseInt(checkIncome.rows[0].count);
        const expenseCount = parseInt(checkExpense.rows[0].count);
        
        if (incomeCount > 0 || expenseCount > 0) {
            return res.status(400).json({ 
                error: `Невозможно удалить фирму. Она используется в ${incomeCount} записях прихода и ${expenseCount} записях расхода.` 
            });
        }
        
        await db.query('DELETE FROM companies WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления фирмы:', error);
        res.status(500).json({ error: 'Ошибка удаления фирмы' });
    }
});

// Обновить склад
router.put('/warehouses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, warehouseGroup } = req.body;
        const result = await db.query(
            'UPDATE warehouses SET name = $1, warehouse_group = $2 WHERE id = $3 RETURNING *',
            [name, warehouseGroup, id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка обновления склада:', error);
        res.status(500).json({ error: 'Ошибка обновления склада' });
    }
});

// Удалить склад
router.delete('/warehouses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, используется ли склад
        const checkIncome = await db.query('SELECT COUNT(*) FROM income WHERE warehouse_id = $1', [id]);
        const checkExpense = await db.query('SELECT COUNT(*) FROM expense WHERE warehouse_id = $1', [id]);
        
        const incomeCount = parseInt(checkIncome.rows[0].count);
        const expenseCount = parseInt(checkExpense.rows[0].count);
        
        if (incomeCount > 0 || expenseCount > 0) {
            return res.status(400).json({ 
                error: `Невозможно удалить склад. Он используется в ${incomeCount} записях прихода и ${expenseCount} записях расхода.` 
            });
        }
        
        await db.query('DELETE FROM warehouses WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления склада:', error);
        res.status(500).json({ error: 'Ошибка удаления склада' });
    }
});

// Обновить товар
router.put('/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, weightPerUnit, price } = req.body;
        const result = await db.query(
            'UPDATE products SET name = $1, weight_per_unit = $2, price = $3 WHERE id = $4 RETURNING *',
            [name, weightPerUnit, price || 0, id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка обновления товара:', error);
        res.status(500).json({ error: 'Ошибка обновления товара' });
    }
});

// Удалить товар
router.delete('/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, используется ли товар
        const checkIncome = await db.query('SELECT COUNT(*) FROM income WHERE product_id = $1', [id]);
        const checkExpense = await db.query('SELECT COUNT(*) FROM expense WHERE product_id = $1', [id]);
        
        const incomeCount = parseInt(checkIncome.rows[0].count);
        const expenseCount = parseInt(checkExpense.rows[0].count);
        
        if (incomeCount > 0 || expenseCount > 0) {
            return res.status(400).json({ 
                error: `Невозможно удалить товар. Он используется в ${incomeCount} записях прихода и ${expenseCount} записях расхода.` 
            });
        }
        
        await db.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления товара:', error);
        res.status(500).json({ error: 'Ошибка удаления товара' });
    }
});

// Обновить клиента
router.put('/clients/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;
        const result = await db.query(
            'UPDATE clients SET name = $1, phone = $2 WHERE id = $3 RETURNING *',
            [name, phone, id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка обновления клиента:', error);
        res.status(500).json({ error: 'Ошибка обновления клиента' });
    }
});

// Удалить клиента
router.delete('/clients/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, используется ли клиент
        const checkExpense = await db.query('SELECT COUNT(*) FROM expense WHERE client_id = $1', [id]);
        const checkPayments = await db.query('SELECT COUNT(*) FROM payments WHERE client_id = $1', [id]);
        
        const expenseCount = parseInt(checkExpense.rows[0].count);
        const paymentsCount = parseInt(checkPayments.rows[0].count);
        
        if (expenseCount > 0 || paymentsCount > 0) {
            return res.status(400).json({ 
                error: `Невозможно удалить клиента. Он используется в ${expenseCount} записях расхода и ${paymentsCount} погашениях.` 
            });
        }
        
        await db.query('DELETE FROM clients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления клиента:', error);
        res.status(500).json({ error: 'Ошибка удаления клиента' });
    }
});

// Добавить коалицию
router.post('/coalitions', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await db.query(
            'INSERT INTO coalitions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка добавления коалиции:', error);
        res.status(500).json({ error: 'Ошибка добавления коалиции' });
    }
});

// Обновить коалицию
router.put('/coalitions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await db.query(
            'UPDATE coalitions SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка обновления коалиции:', error);
        res.status(500).json({ error: 'Ошибка обновления коалиции' });
    }
});

// Удалить коалицию
router.delete('/coalitions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM coalitions WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления коалиции:', error);
        res.status(500).json({ error: 'Ошибка удаления коалиции' });
    }
});

// Получить все цены
router.get('/prices', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT pp.*, p.name as product_name, u.username
            FROM product_prices pp
            LEFT JOIN products p ON pp.product_id = p.id
            LEFT JOIN users u ON pp.user_id = u.id
            ORDER BY pp.effective_date DESC, pp.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Ошибка получения цен:', error);
        res.status(500).json({ error: 'Ошибка получения цен' });
    }
});

// Добавить цену
router.post('/prices', authenticateToken, async (req, res) => {
    try {
        const { productId, warehouseGroup, pricePerTon, effectiveDate } = req.body;
        const result = await db.query(`
            INSERT INTO product_prices (product_id, warehouse_group, price_per_ton, effective_date, user_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [productId, warehouseGroup, pricePerTon, effectiveDate, req.user.id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка добавления цены:', error);
        res.status(500).json({ error: 'Ошибка добавления цены' });
    }
});

// Удалить цену
router.delete('/prices/:id', authenticateToken, async (req, res) => {
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
router.post('/prices/clear-old', authenticateToken, async (req, res) => {
    try {
        const { beforeDate } = req.body;
        const result = await db.query(
            'DELETE FROM product_prices WHERE effective_date < $1',
            [beforeDate]
        );
        res.json({ success: true, deleted: result.rowCount });
    } catch (error) {
        console.error('❌ Ошибка очистки цен:', error);
        res.status(500).json({ error: 'Ошибка очистки цен' });
    }
});

module.exports = router;
