/**
 * Миграция: Добавление полей статуса пользователя
 * - require_password_change: требуется смена пароля
 * - is_blocked: пользователь заблокирован
 */

const { Pool } = require('pg');
require('dotenv').config();

// Используем DATABASE_URL если есть, иначе отдельные параметры
const pool = process.env.DATABASE_URL 
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'warehouse_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
    });

async function migrate() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Начало миграции: добавление полей статуса пользователя...');
        
        // Добавляем поля require_password_change и is_blocked
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
        `);
        
        console.log('✅ Поля добавлены успешно');
        
        // Проверяем структуру таблицы
        const result = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);
        
        console.log('\n📋 Структура таблицы users:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
        });
        
        console.log('\n✅ Миграция завершена успешно!');
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
});
