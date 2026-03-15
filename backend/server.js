/**
 * 🚀 СЕРВЕР СИСТЕМЫ УЧЁТА ТОВАРОВ
 * Node.js + Express + PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const incomeRoutes = require('./routes/income');
const expenseRoutes = require('./routes/expense');
const paymentsRoutes = require('./routes/payments');
const partnersRoutes = require('./routes/partners');
const managementRoutes = require('./routes/management');
const usersRoutes = require('./routes/users');
const pricesRoutes = require('./routes/prices');
const settingsRoutes = require('./routes/settings');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
// Разрешаем все CORS запросы для разработки
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Слишком много запросов, попробуйте позже'
});
app.use('/api/', limiter);

// Статические файлы
app.use(express.static('../frontend'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);

// ─── Управление годами (inline) ───────────────────────────────────────────
const { authenticateToken: authYears } = require('./routes/auth');
const yearsRouter = require('express').Router();

yearsRouter.get('/', authYears, async (req, res) => {
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
        res.status(500).json({ error: 'Ошибка получения годов' });
    }
});

yearsRouter.post('/copy', authYears, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для администратора' });
    const { from_year, to_year, tables } = req.body;
    if (!from_year || !to_year || from_year === to_year) return res.status(400).json({ error: 'Неверные параметры' });
    const allowed = ['income', 'expense', 'payments', 'partners'];
    const target = (tables || allowed).filter(t => allowed.includes(t));
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const results = {};
        for (const table of target) {
            const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name NOT IN ('id','created_at','edited_at') ORDER BY ordinal_position`, [table]);
            const colNames = cols.rows.map(r => r.column_name);
            const selectCols = colNames.map(c => c === 'year' ? `${to_year} as year` : c).join(', ');
            const r = await client.query(`INSERT INTO ${table} (${colNames.join(', ')}) SELECT ${selectCols} FROM ${table} WHERE year=$1 AND deleted=false`, [from_year]);
            results[table] = r.rowCount;
        }
        await client.query('COMMIT');
        res.json({ success: true, copied: results });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

yearsRouter.post('/move', authYears, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для администратора' });
    const { from_year, to_year, tables } = req.body;
    if (!from_year || !to_year || from_year === to_year) return res.status(400).json({ error: 'Неверные параметры' });
    const allowed = ['income', 'expense', 'payments', 'partners'];
    const target = (tables || allowed).filter(t => allowed.includes(t));
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const results = {};
        for (const table of target) {
            const r = await client.query(`UPDATE ${table} SET year=$1 WHERE year=$2 AND deleted=false`, [to_year, from_year]);
            results[table] = r.rowCount;
        }
        await client.query('COMMIT');
        res.json({ success: true, moved: results });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

app.use('/api/years', yearsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Режим: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM получен, завершение работы...');
    db.pool.end(() => {
        console.log('✅ Пул подключений закрыт');
        process.exit(0);
    });
});
