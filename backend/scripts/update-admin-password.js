/**
 * 🔐 ОБНОВЛЕНИЕ ПАРОЛЯ АДМИНИСТРАТОРА
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../db');

async function updateAdminPassword() {
    try {
        console.log('🔐 Обновление пароля администратора...\n');

        // Генерируем новый хеш для пароля "admin123"
        const password = 'admin123';
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        console.log('Новый хеш:', hash);
        console.log('');

        // Обновляем пароль в базе данных
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username, role',
            [hash, 'admin']
        );

        if (result.rows.length > 0) {
            console.log('✅ Пароль администратора обновлен!');
            console.log('');
            console.log('Учетные данные:');
            console.log('  Логин:  admin');
            console.log('  Пароль: admin123');
            console.log('');
            console.log('Попробуйте войти снова!');
        } else {
            console.log('❌ Пользователь admin не найден');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

updateAdminPassword();
