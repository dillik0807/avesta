/**
 * 🗄️ ПОДКЛЮЧЕНИЕ К POSTGRESQL
 * Модуль для работы с базой данных
 */

const { Pool } = require('pg');
require('dotenv').config();

// Создание пула подключений
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Увеличено до 10 секунд для Railway
});

// Обработка ошибок подключения
pool.on('error', (err) => {
    console.error('❌ Неожиданная ошибка PostgreSQL:', err);
});

// Проверка подключения
pool.on('connect', () => {
    console.log('✅ Подключение к PostgreSQL установлено');
});

/**
 * Выполнение SQL запроса
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Запрос выполнен', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Ошибка выполнения запроса:', error);
        throw error;
    }
}

/**
 * Получение клиента для транзакций
 */
async function getClient() {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);
    
    // Обертка для автоматического освобождения
    const timeout = setTimeout(() => {
        console.error('⚠️ Клиент не был освобожден вовремя');
    }, 5000);
    
    client.release = () => {
        clearTimeout(timeout);
        client.release = release;
        return release();
    };
    
    return client;
}

module.exports = {
    query,
    getClient,
    pool
};
