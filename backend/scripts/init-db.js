/**
 * 🗄️ ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function initDatabase() {
    try {
        console.log('🚀 Начало инициализации базы данных...');

        // Чтение SQL схемы
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Выполнение SQL
        await pool.query(schema);

        console.log('✅ База данных успешно инициализирована!');
        console.log('📊 Созданы таблицы:');
        console.log('   - years (годы)');
        console.log('   - users (пользователи)');
        console.log('   - companies (фирмы)');
        console.log('   - warehouses (склады)');
        console.log('   - products (товары)');
        console.log('   - clients (клиенты)');
        console.log('   - income (приход)');
        console.log('   - expense (расход)');
        console.log('   - payments (погашения)');
        console.log('   - trash (корзина)');
        console.log('');
        console.log('👤 Создан администратор:');
        console.log('   Логин: admin');
        console.log('   Пароль: admin123');
        console.log('');
        console.log('⚠️  ВАЖНО: Смените пароль администратора после первого входа!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
        process.exit(1);
    }
}

initDatabase();
