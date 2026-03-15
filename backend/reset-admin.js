require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reset() {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
        console.log('✅ Пароль admin сброшен на: admin123');
    } catch(e) {
        console.log('Ошибка:', e.message);
    } finally {
        pool.end();
    }
}

reset();
