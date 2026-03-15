require('dotenv').config();
const { pool } = require('./db');

async function run() {
    try {
        await pool.query(`
            ALTER TABLE income ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
            ALTER TABLE expense ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
            ALTER TABLE payments ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
            ALTER TABLE partners ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
            ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
        `);
        console.log('✅ Колонка legacy_id добавлена во все таблицы');
    } catch(e) {
        console.log('Ошибка:', e.message);
    } finally {
        pool.end();
    }
}

run();
