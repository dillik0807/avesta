/**
 * 🔐 МАРШРУТЫ АУТЕНТИФИКАЦИИ
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Вход в систему
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Логин и пароль обязательны' });
        }

        // Поиск пользователя
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];

        // Проверка блокировки
        if (user.is_blocked) {
            return res.status(403).json({ error: 'Ваш аккаунт заблокирован. Обратитесь к администратору.' });
        }

        // Проверка пароля
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Обновление времени последнего входа
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Генерация JWT токена
        let warehouseGroup = user.warehouse_group;
        if (typeof warehouseGroup === 'string') {
            try { warehouseGroup = JSON.parse(warehouseGroup); } catch(e) {}
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                warehouseGroup: warehouseGroup
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                warehouseGroup: warehouseGroup,
                require_password_change: user.require_password_change || false,
                is_blocked: user.is_blocked || false
            }
        });

    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Middleware для проверки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
}

// Проверка токена
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
