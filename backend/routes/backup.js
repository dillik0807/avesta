/**
 * 💾 Резервное копирование — экспорт и импорт данных
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// GET /api/backup/export
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const [income, expense, payments, partners] = await Promise.all([
            db.query(`
                SELECT i.id, i.date, i.wagon,
                    c.name as company, w.name as warehouse, p.name as product,
                    i.qty_doc, i.qty_fact, i.difference, i.weight_tons, i.notes,
                    i.year, u.username as created_by
                FROM income i
                LEFT JOIN companies c ON i.company_id = c.id
                LEFT JOIN warehouses w ON i.warehouse_id = w.id
                LEFT JOIN products p ON i.product_id = p.id
                LEFT JOIN users u ON i.user_id = u.id
                WHERE i.year = $1 AND i.deleted = false
                ORDER BY i.date, i.id
            `, [year]),

            db.query(`
                SELECT e.id, e.date,
                    cl.name as client, w.name as warehouse, p.name as product,
                    e.quantity, e.tons, e.price, e.total, e.notes,
                    e.year, u.username as created_by
                FROM expense e
                LEFT JOIN clients cl ON e.client_id = cl.id
                LEFT JOIN warehouses w ON e.warehouse_id = w.id
                LEFT JOIN products p ON e.product_id = p.id
                LEFT JOIN users u ON e.user_id = u.id
                WHERE e.year = $1 AND e.deleted = false
                ORDER BY e.date, e.id
            `, [year]),

            db.query(`
                SELECT py.id, py.date,
                    cl.name as client,
                    py.somoni, py.rate, py.amount, py.notes,
                    py.year, u.username as created_by
                FROM payments py
                LEFT JOIN clients cl ON py.client_id = cl.id
                LEFT JOIN users u ON py.user_id = u.id
                WHERE py.year = $1 AND py.deleted = false
                ORDER BY py.date, py.id
            `, [year]),

            db.query(`
                SELECT pt.id, pt.date,
                    cl.name as client,
                    pt.somoni, pt.rate, pt.amount, pt.notes,
                    pt.year, u.username as created_by
                FROM partners pt
                LEFT JOIN clients cl ON pt.client_id = cl.id
                LEFT JOIN users u ON pt.user_id = u.id
                WHERE pt.year = $1 AND pt.deleted = false
                ORDER BY pt.date, pt.id
            `, [year]),
        ]);

        res.json({
            version: '2.0',
            year,
            exported_at: new Date().toISOString(),
            data: {
                income: income.rows,
                expense: expense.rows,
                payments: payments.rows,
                partners: partners.rows,
            }
        });
    } catch (err) {
        console.error('❌ Ошибка экспорта:', err.message, err.stack);
        res.status(500).json({ error: 'Ошибка экспорта данных', detail: err.message });
    }
});

// POST /api/backup/import
// Логика: если запись с таким id уже есть — обновляем (upsert по id),
// если нет — вставляем как новую. Дубликатов не будет.
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const { data, year } = req.body;
        if (!data) return res.status(400).json({ error: 'Нет данных для импорта' });

        const results = { income: { inserted: 0, updated: 0 }, expense: { inserted: 0, updated: 0 }, payments: { inserted: 0, updated: 0 }, partners: { inserted: 0, updated: 0 } };

        // Хелпер: получить или создать запись в справочнике
        async function getOrCreate(table, field, value) {
            if (!value) return null;
            const r = await db.query(`SELECT id FROM ${table} WHERE ${field} = $1`, [value]);
            if (r.rows.length > 0) return r.rows[0].id;
            const ins = await db.query(`INSERT INTO ${table} (${field}) VALUES ($1) RETURNING id`, [value]);
            return ins.rows[0].id;
        }

        // Импорт приходов
        for (const row of (data.income || [])) {
            const companyId = await getOrCreate('companies', 'name', row.company);
            const warehouseId = await getOrCreate('warehouses', 'name', row.warehouse);
            const productId = await getOrCreate('products', 'name', row.product);
            const rowYear = row.year || year;

            if (row.id) {
                // Проверяем существует ли запись с таким id
                const exists = await db.query('SELECT id FROM income WHERE id = $1', [row.id]);
                if (exists.rows.length > 0) {
                    // Обновляем
                    await db.query(`
                        UPDATE income SET date=$1, wagon=$2, company_id=$3, warehouse_id=$4, product_id=$5,
                            qty_doc=$6, qty_fact=$7, difference=$8, weight_tons=$9, notes=$10, year=$11
                        WHERE id=$12
                    `, [row.date, row.wagon, companyId, warehouseId, productId,
                        row.qty_doc, row.qty_fact, row.difference, row.weight_tons, row.notes, rowYear, row.id]);
                    results.income.updated++;
                } else {
                    // Вставляем с оригинальным id
                    await db.query(`
                        INSERT INTO income (id, year, date, wagon, company_id, warehouse_id, product_id,
                            qty_doc, qty_fact, difference, weight_tons, notes)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                    `, [row.id, rowYear, row.date, row.wagon, companyId, warehouseId, productId,
                        row.qty_doc, row.qty_fact, row.difference, row.weight_tons, row.notes]);
                    results.income.inserted++;
                }
            } else {
                // Нет id — просто вставляем
                await db.query(`
                    INSERT INTO income (year, date, wagon, company_id, warehouse_id, product_id,
                        qty_doc, qty_fact, difference, weight_tons, notes)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                `, [rowYear, row.date, row.wagon, companyId, warehouseId, productId,
                    row.qty_doc, row.qty_fact, row.difference, row.weight_tons, row.notes]);
                results.income.inserted++;
            }
        }

        // Импорт расходов
        for (const row of (data.expense || [])) {
            const clientId = await getOrCreate('clients', 'name', row.client);
            const warehouseId = await getOrCreate('warehouses', 'name', row.warehouse);
            const productId = await getOrCreate('products', 'name', row.product);
            const rowYear = row.year || year;

            if (row.id) {
                const exists = await db.query('SELECT id FROM expense WHERE id = $1', [row.id]);
                if (exists.rows.length > 0) {
                    await db.query(`
                        UPDATE expense SET date=$1, client_id=$2, warehouse_id=$3, product_id=$4,
                            quantity=$5, tons=$6, price=$7, total=$8, notes=$9, year=$10
                        WHERE id=$11
                    `, [row.date, clientId, warehouseId, productId,
                        row.quantity, row.tons, row.price, row.total, row.notes, rowYear, row.id]);
                    results.expense.updated++;
                } else {
                    await db.query(`
                        INSERT INTO expense (id, year, date, client_id, warehouse_id, product_id,
                            quantity, tons, price, total, notes)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    `, [row.id, rowYear, row.date, clientId, warehouseId, productId,
                        row.quantity, row.tons, row.price, row.total, row.notes]);
                    results.expense.inserted++;
                }
            } else {
                await db.query(`
                    INSERT INTO expense (year, date, client_id, warehouse_id, product_id,
                        quantity, tons, price, total, notes)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                `, [rowYear, row.date, clientId, warehouseId, productId,
                    row.quantity, row.tons, row.price, row.total, row.notes]);
                results.expense.inserted++;
            }
        }

        // Импорт погашений
        for (const row of (data.payments || [])) {
            const clientId = await getOrCreate('clients', 'name', row.client);
            const rowYear = row.year || year;

            if (row.id) {
                const exists = await db.query('SELECT id FROM payments WHERE id = $1', [row.id]);
                if (exists.rows.length > 0) {
                    await db.query(`
                        UPDATE payments SET date=$1, client_id=$2, somoni=$3, rate=$4, amount=$5, notes=$6, year=$7
                        WHERE id=$8
                    `, [row.date, clientId, row.somoni, row.rate, row.amount, row.notes, rowYear, row.id]);
                    results.payments.updated++;
                } else {
                    await db.query(`
                        INSERT INTO payments (id, year, date, client_id, somoni, rate, amount, notes)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    `, [row.id, rowYear, row.date, clientId, row.somoni, row.rate, row.amount, row.notes]);
                    results.payments.inserted++;
                }
            } else {
                await db.query(`
                    INSERT INTO payments (year, date, client_id, somoni, rate, amount, notes)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                `, [rowYear, row.date, clientId, row.somoni, row.rate, row.amount, row.notes]);
                results.payments.inserted++;
            }
        }

        // Импорт партнеров
        for (const row of (data.partners || [])) {
            const clientId = await getOrCreate('clients', 'name', row.client);
            const rowYear = row.year || year;

            if (row.id) {
                const exists = await db.query('SELECT id FROM partners WHERE id = $1', [row.id]);
                if (exists.rows.length > 0) {
                    await db.query(`
                        UPDATE partners SET date=$1, client_id=$2, somoni=$3, rate=$4, amount=$5, notes=$6, year=$7
                        WHERE id=$8
                    `, [row.date, clientId, row.somoni, row.rate, row.amount, row.notes, rowYear, row.id]);
                    results.partners.updated++;
                } else {
                    await db.query(`
                        INSERT INTO partners (id, year, date, client_id, somoni, rate, amount, notes)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    `, [row.id, rowYear, row.date, clientId, row.somoni, row.rate, row.amount, row.notes]);
                    results.partners.inserted++;
                }
            } else {
                await db.query(`
                    INSERT INTO partners (year, date, client_id, somoni, rate, amount, notes)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                `, [rowYear, row.date, clientId, row.somoni, row.rate, row.amount, row.notes]);
                results.partners.inserted++;
            }
        }

        res.json({ success: true, imported: results });
    } catch (err) {
        console.error('❌ Ошибка импорта:', err);
        res.status(500).json({ error: 'Ошибка импорта: ' + err.message });
    }
});

// POST /api/backup/clear
// Очистка таблицы с проверкой пароля пользователя
router.post('/clear', authenticateToken, async (req, res) => {
    try {
        const { table, password } = req.body;
        if (!table || !password) {
            return res.status(400).json({ error: 'Укажите таблицу и пароль' });
        }

        // Разрешённые таблицы для очистки
        const allowed = ['income', 'expense', 'payments', 'partners', 'management'];
        if (!allowed.includes(table)) {
            return res.status(400).json({ error: 'Недопустимая таблица' });
        }

        // Проверяем пароль текущего пользователя
        const bcrypt = require('bcrypt');
        const userRow = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (!userRow.rows.length) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        const valid = await bcrypt.compare(password, userRow.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }

        let deleted = 0;

        if (table === 'management') {
            // Очищаем справочники: companies, warehouses, products, clients, coalitions
            const [c1, c2, c3, c4, c5] = await Promise.all([
                db.query('DELETE FROM companies RETURNING id'),
                db.query('DELETE FROM warehouses RETURNING id'),
                db.query('DELETE FROM products RETURNING id'),
                db.query('DELETE FROM clients RETURNING id'),
                db.query('DELETE FROM coalitions RETURNING id'),
            ]);
            deleted = c1.rowCount + c2.rowCount + c3.rowCount + c4.rowCount + c5.rowCount;
        } else {
            // Жёсткое удаление всех записей из таблицы
            const result = await db.query(`DELETE FROM ${table} RETURNING id`);
            deleted = result.rowCount;
        }

        console.log(`🗑️ Очистка таблицы "${table}" пользователем ${req.user.username}: удалено ${deleted} записей`);
        res.json({ success: true, table, deleted });

    } catch (err) {
        console.error('❌ Ошибка очистки:', err.message);
        res.status(500).json({ error: 'Ошибка очистки: ' + err.message });
    }
});

// POST /api/backup/import-legacy
// Импорт из старого формата (IndexedDB/localStorage backup)
// Дедупликация по legacy_id (оригинальный timestamp-id из старого проекта)
router.post('/import-legacy', authenticateToken, async (req, res) => {
    try {
        const body = req.body;
        const root = body.data || body;

        const results = {
            companies: 0, warehouses: 0, products: 0, clients: 0, coalitions: 0,
            income: { inserted: 0, skipped: 0 },
            expense: { inserted: 0, skipped: 0 },
            payments: { inserted: 0, skipped: 0 }
        };

        // Хелпер: получить или создать запись в справочнике
        async function getOrCreate(table, field, value) {
            if (!value || String(value).trim() === '') return null;
            const val = String(value).trim();
            const r = await db.query(`SELECT id FROM ${table} WHERE ${field} = $1`, [val]);
            if (r.rows.length > 0) return r.rows[0].id;
            const ins = await db.query(`INSERT INTO ${table} (${field}) VALUES ($1) RETURNING id`, [val]);
            return ins.rows[0].id;
        }

        // 1. Справочники
        for (const name of (root.companies || [])) {
            const n = typeof name === 'string' ? name.trim() : (name.name || '').trim();
            if (!n) continue;
            const ex = await db.query('SELECT id FROM companies WHERE name=$1', [n]);
            if (!ex.rows.length) { await db.query('INSERT INTO companies (name) VALUES ($1)', [n]); results.companies++; }
        }

        for (const w of (root.warehouses || [])) {
            const name = (w.name || '').trim();
            const group = (w.group || '').trim();
            if (!name) continue;
            const ex = await db.query('SELECT id FROM warehouses WHERE name=$1', [name]);
            if (!ex.rows.length) {
                await db.query('INSERT INTO warehouses (name, warehouse_group) VALUES ($1,$2)', [name, group || null]);
                results.warehouses++;
            }
        }

        for (const name of (root.products || [])) {
            const n = typeof name === 'string' ? name.trim() : (name.name || '').trim();
            if (!n) continue;
            const ex = await db.query('SELECT id FROM products WHERE name=$1', [n]);
            if (!ex.rows.length) { await db.query('INSERT INTO products (name) VALUES ($1)', [n]); results.products++; }
        }

        for (const c of (root.clients || [])) {
            const name = (c.name || '').trim();
            if (!name || c.isDeleted) continue;
            const phone = (c.phone || '').trim() || null;
            await db.query('INSERT INTO clients (name, phone) VALUES ($1,$2) ON CONFLICT DO NOTHING', [name, phone]);
            results.clients++;
        }

        for (const name of (root.coalitions || [])) {
            const n = typeof name === 'string' ? name.trim() : (name.name || '').trim();
            if (!n) continue;
            const ex = await db.query('SELECT id FROM coalitions WHERE name=$1', [n]);
            if (!ex.rows.length) { await db.query('INSERT INTO coalitions (name) VALUES ($1)', [n]); results.coalitions++; }
        }

        // 2. Убеждаемся что год существует в таблице years
        async function ensureYear(yr) {
            const y = parseInt(yr);
            if (!y) return;
            await db.query('INSERT INTO years (year) VALUES ($1) ON CONFLICT DO NOTHING', [y]);
        }

        // 3. Данные по годам — дедупликация по legacy_id
        const yearsData = root.years || {};
        for (const [yearStr, yearObj] of Object.entries(yearsData)) {
            const year = parseInt(yearStr);
            if (!year) continue;
            await ensureYear(year);

            // ПРИХОД
            for (const row of (yearObj.income || [])) {
                if (row.isDeleted) continue;
                const legacyId = row.id ? String(row.id) : null;

                // Пропускаем если уже импортировано
                if (legacyId) {
                    const dup = await db.query('SELECT id FROM income WHERE legacy_id=$1 LIMIT 1', [legacyId]);
                    if (dup.rows.length) { results.income.skipped++; continue; }
                }

                const companyId   = await getOrCreate('companies',  'name', row.company);
                const warehouseId = await getOrCreate('warehouses', 'name', row.warehouse);
                const productId   = await getOrCreate('products',   'name', row.product);

                const qtyDoc     = parseFloat(row.qtyDoc     || row.qty_doc     || 0);
                const qtyFact    = parseFloat(row.qtyFact    || row.qty_fact    || 0);
                const diff       = parseFloat(row.difference || 0);
                const weightTons = parseFloat(row.weightTons || row.weight_tons || 0);
                const date       = row.date || new Date().toISOString().split('T')[0];
                const wagon      = row.wagon || '';
                const notes      = row.notes || null;

                await db.query(
                    `INSERT INTO income (year,date,wagon,company_id,warehouse_id,product_id,qty_doc,qty_fact,difference,weight_tons,notes,legacy_id)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                    [year, date, wagon, companyId, warehouseId, productId, qtyDoc, qtyFact, diff, weightTons, notes, legacyId]
                );
                results.income.inserted++;
            }

            // РАСХОД
            for (const row of (yearObj.expense || [])) {
                if (row.isDeleted) continue;
                const legacyId = row.id ? String(row.id) : null;

                if (legacyId) {
                    const dup = await db.query('SELECT id FROM expense WHERE legacy_id=$1 LIMIT 1', [legacyId]);
                    if (dup.rows.length) { results.expense.skipped++; continue; }
                }

                const clientId    = await getOrCreate('clients',    'name', row.client);
                const warehouseId = await getOrCreate('warehouses', 'name', row.warehouse);
                const productId   = await getOrCreate('products',   'name', row.product);
                const companyId   = await getOrCreate('companies',  'name', row.company);

                const quantity = parseFloat(row.quantity || 0);
                const tons     = parseFloat(row.tons     || 0);
                const price    = parseFloat(row.price    || 0);
                const total    = parseFloat(row.total    || 0);
                const date     = row.date || new Date().toISOString().split('T')[0];
                const notes    = row.notes || null;
                const coalition = row.coalition || null;
                const number   = row.number || null;

                await db.query(
                    `INSERT INTO expense (year,date,client_id,warehouse_id,product_id,company_id,quantity,tons,price,total,notes,coalition,number,legacy_id)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
                    [year, date, clientId, warehouseId, productId, companyId, quantity, tons, price, total, notes, coalition, number, legacyId]
                );
                results.expense.inserted++;
            }

            // ПОГАШЕНИЯ
            for (const row of (yearObj.payments || [])) {
                if (row.isDeleted) continue;
                const legacyId = row.id ? String(row.id) : null;

                if (legacyId) {
                    const dup = await db.query('SELECT id FROM payments WHERE legacy_id=$1 LIMIT 1', [legacyId]);
                    if (dup.rows.length) { results.payments.skipped++; continue; }
                }

                const clientId = await getOrCreate('clients', 'name', row.client);

                const somoni = parseFloat(row.somoni || 0);
                const rate   = parseFloat(row.rate   || 1);
                const amount = parseFloat(row.amount || 0);
                const date   = row.date || new Date().toISOString().split('T')[0];
                const notes  = row.notes || null;

                await db.query(
                    `INSERT INTO payments (year,date,client_id,somoni,rate,amount,notes,legacy_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [year, date, clientId, somoni, rate, amount, notes, legacyId]
                );
                results.payments.inserted++;
            }
        }

        console.log(`✅ Legacy import завершён:`, results);
        res.json({ success: true, imported: results });

    } catch (err) {
        console.error('❌ Ошибка legacy импорта:', err.message, err.stack);
        res.status(500).json({ error: 'Ошибка импорта: ' + err.message });
    }
});

module.exports = router;
