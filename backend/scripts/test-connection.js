/**
 * 🧪 ТЕСТ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ
 */

require('dotenv').config();
const { pool } = require('../db');

async function testConnection() {
    console.log('🔍 Тестирование подключения к PostgreSQL...\n');
    
    try {
        // Тест 1: Базовое подключение
        console.log('1️⃣ Проверка подключения...');
        const timeResult = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Подключение успешно!');
        console.log('   Время сервера:', timeResult.rows[0].current_time);
        console.log('');

        // Тест 2: Проверка версии PostgreSQL
        console.log('2️⃣ Проверка версии PostgreSQL...');
        const versionResult = await pool.query('SELECT version()');
        console.log('✅ Версия:', versionResult.rows[0].version.split(',')[0]);
        console.log('');

        // Тест 3: Проверка существующих таблиц
        console.log('3️⃣ Проверка таблиц...');
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        if (tablesResult.rows.length > 0) {
            console.log('✅ Найдено таблиц:', tablesResult.rows.length);
            tablesResult.rows.forEach(row => {
                console.log('   📋', row.table_name);
            });
        } else {
            console.log('⚠️  Таблицы не найдены. Запустите: npm run init-db');
        }
        console.log('');

        // Тест 4: Проверка пользователей
        console.log('4️⃣ Проверка пользователей...');
        try {
            const usersResult = await pool.query('SELECT username, role FROM users');
            if (usersResult.rows.length > 0) {
                console.log('✅ Найдено пользователей:', usersResult.rows.length);
                usersResult.rows.forEach(user => {
                    console.log(`   👤 ${user.username} (${user.role})`);
                });
            } else {
                console.log('⚠️  Пользователи не найдены');
            }
        } catch (error) {
            console.log('⚠️  Таблица users не существует. Запустите: npm run init-db');
        }
        console.log('');

        // Тест 5: Проверка конфигурации
        console.log('5️⃣ Конфигурация:');
        console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Установлен' : '❌ Не установлен');
        console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Установлен' : '❌ Не установлен');
        console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
        console.log('   PORT:', process.env.PORT || 3000);
        console.log('');

        console.log('🎉 Все тесты пройдены успешно!');
        console.log('');
        console.log('📝 Следующие шаги:');
        if (tablesResult.rows.length === 0) {
            console.log('   1. Запустите: npm run init-db');
            console.log('   2. Запустите: npm start');
        } else {
            console.log('   1. Запустите: npm start');
            console.log('   2. Откройте: http://localhost:3000');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка подключения:', error.message);
        console.log('');
        console.log('🔧 Проверьте:');
        console.log('   1. DATABASE_URL в файле .env');
        console.log('   2. Доступность базы данных Railway');
        console.log('   3. Правильность учетных данных');
        process.exit(1);
    }
}

testConnection();
