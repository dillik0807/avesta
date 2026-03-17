const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');
const { authenticateToken } = require('./auth');

// Только admin может управлять пользователями
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
    }
    next();
};

// Получить всех пользователей
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, warehouse_group, require_password_change, is_blocked FROM users ORDER BY id'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ error: error.message });
    }
});

// Добавить пользователя
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role, warehouse_group, require_password_change, is_blocked } = req.body;
    
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    // Сериализуем warehouse_group если это массив
    const wg = Array.isArray(warehouse_group)
        ? JSON.stringify(warehouse_group)
        : (warehouse_group || null);
    
    try {
        // Проверяем, существует ли пользователь
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        }
        
        // Хешируем пароль
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Добавляем пользователя
        const result = await pool.query(
            `INSERT INTO users (username, password_hash, role, warehouse_group, require_password_change, is_blocked) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, username, role, warehouse_group, require_password_change, is_blocked`,
            [
                username, 
                passwordHash, 
                role, 
                wg,
                require_password_change || false,
                is_blocked || false
            ]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Ошибка добавления пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить пользователя
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, password, role, warehouse_group, require_password_change, is_blocked } = req.body;
    
    if (!username || !role) {
        return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    // Сериализуем warehouse_group — если не передан, берём из БД
    let wg;
    if (warehouse_group === undefined) {
        const current = await pool.query('SELECT warehouse_group FROM users WHERE id = $1', [id]);
        wg = current.rows[0]?.warehouse_group ?? null;
    } else {
        wg = Array.isArray(warehouse_group)
            ? JSON.stringify(warehouse_group)
            : (warehouse_group || null);
    }
    
    try {
        // Проверяем, существует ли другой пользователь с таким логином
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [username, id]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        }
        
        let query, params;
        
        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            query = `UPDATE users 
                     SET username = $1, password_hash = $2, role = $3, warehouse_group = $4,
                         require_password_change = $5, is_blocked = $6
                     WHERE id = $7 
                     RETURNING id, username, role, warehouse_group, require_password_change, is_blocked`;
            params = [username, passwordHash, role, wg, require_password_change || false, is_blocked || false, id];
        } else {
            query = `UPDATE users 
                     SET username = $1, role = $2, warehouse_group = $3,
                         require_password_change = $4, is_blocked = $5
                     WHERE id = $6 
                     RETURNING id, username, role, warehouse_group, require_password_change, is_blocked`;
            params = [username, role, wg, require_password_change || false, is_blocked || false, id];
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Ошибка обновления пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить пользователя
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Проверяем, не является ли это админом
        const user = await pool.query(
            'SELECT username FROM users WHERE id = $1',
            [id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (user.rows[0].username === 'admin') {
            return res.status(400).json({ error: 'Нельзя удалить администратора' });
        }
        
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Пользователь удален' });
    } catch (error) {
        console.error('❌ Ошибка удаления пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

// Смена пароля (пользователь меняет свой пароль)
router.post('/change-password', authenticateToken, async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    
    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
    }
    
    try {
        // Получаем пользователя
        const result = await pool.query(
            'SELECT id, password_hash FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const user = result.rows[0];
        
        // Проверяем текущий пароль
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }
        
        // Хешируем новый пароль
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Обновляем пароль
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, user.id]
        );
        
        res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('❌ Ошибка смены пароля:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
