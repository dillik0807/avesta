require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
    try {
        // Проверяем пользователей
        const users = await pool.query('SELECT id, username, role, password_hash FROM users');
        console.log('Пользователи:', users.rows.map(u => ({ id: u.id, username: u.username, role: u.role, hash: u.password_hash?.substring(0,20)+'...' })));

        if (users.rows.length > 0) {
            const user = users.rows[0];
            const valid = await bcrypt.compare('admin123', user.password_hash);
            console.log('Пароль admin123 верный:', valid);
        }
    } catch(e) {
        console.log('Ошибка:', e.message);
    } finally {
        pool.end();
    }
}

test();
