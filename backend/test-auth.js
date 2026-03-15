require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

async function testLogin(username, password) {
    try {
        console.log('1. Ищем пользователя:', username);
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        console.log('2. Найдено строк:', result.rows.length);
        
        if (result.rows.length === 0) {
            console.log('❌ Пользователь не найден');
            return;
        }

        const user = result.rows[0];
        console.log('3. Пользователь:', { id: user.id, username: user.username, role: user.role });
        console.log('4. Колонки:', Object.keys(user));

        console.log('5. Проверяем пароль...');
        const valid = await bcrypt.compare(password, user.password_hash);
        console.log('6. Пароль верный:', valid);

        console.log('7. Обновляем last_login...');
        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        console.log('8. last_login обновлён');

        console.log('9. Генерируем токен...');
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        console.log('✅ Всё работает! Токен:', token.substring(0, 30) + '...');
    } catch(e) {
        console.log('❌ ОШИБКА на шаге:', e.message);
        console.log(e.stack);
    } finally {
        db.pool.end();
    }
}

testLogin('admin', 'admin123');
