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
