require('dotenv').config();
const { pool } = require('./db');

async function run() {
    try {
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false
        `);
        console.log('✅ Колонки require_password_change и is_blocked добавлены в users');
    } catch(e) {
        console.log('Ошибка:', e.message);
    } finally {
        pool.end();
    }
}

run();
