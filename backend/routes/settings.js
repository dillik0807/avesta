/**
 * ⚙️ API ДЛЯ НАСТРОЕК ПОЛЬЗОВАТЕЛЯ
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

/**
 * Получить настройки пользователя
 * GET /api/settings
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            'SELECT default_year, settings FROM user_settings WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Если настроек нет, возвращаем пустой объект
            return res.json({
                default_year: null,
                settings: {}
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Ошибка получения настроек:', error);
        res.status(500).json({ error: 'Ошибка получения настроек' });
    }
});

/**
 * Установить год по умолчанию
 * POST /api/settings/default-year
 */
router.post('/default-year', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year } = req.body;

        if (!year || isNaN(year)) {
            return res.status(400).json({ error: 'Неверный формат года' });
        }

        // Проверяем, существуют ли настройки для пользователя
        const existing = await db.query(
            'SELECT id FROM user_settings WHERE user_id = $1',
            [userId]
        );

        if (existing.rows.length === 0) {
            // Создаем новую запись
            await db.query(
                'INSERT INTO user_settings (user_id, default_year, updated_at) VALUES ($1, $2, NOW())',
                [userId, year]
            );
        } else {
            // Обновляем существующую запись
            await db.query(
                'UPDATE user_settings SET default_year = $1, updated_at = NOW() WHERE user_id = $2',
                [year, userId]
            );
        }

        console.log(`✅ Год по умолчанию установлен: ${year} для пользователя ${userId}`);

        res.json({
            success: true,
            default_year: year
        });
    } catch (error) {
        console.error('❌ Ошибка установки года по умолчанию:', error);
        res.status(500).json({ error: 'Ошибка установки года по умолчанию' });
    }
});

/**
 * Удалить год по умолчанию
 * DELETE /api/settings/default-year
 */
router.delete('/default-year', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await db.query(
            'UPDATE user_settings SET default_year = NULL, updated_at = NOW() WHERE user_id = $1',
            [userId]
        );

        console.log(`✅ Год по умолчанию удален для пользователя ${userId}`);

        res.json({
            success: true,
            default_year: null
        });
    } catch (error) {
        console.error('❌ Ошибка удаления года по умолчанию:', error);
        res.status(500).json({ error: 'Ошибка удаления года по умолчанию' });
    }
});

/**
 * Обновить настройки пользователя
 * PUT /api/settings
 */
router.put('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Неверный формат настроек' });
        }

        // Проверяем, существуют ли настройки для пользователя
        const existing = await db.query(
            'SELECT id FROM user_settings WHERE user_id = $1',
            [userId]
        );

        if (existing.rows.length === 0) {
            // Создаем новую запись
            await db.query(
                'INSERT INTO user_settings (user_id, settings, updated_at) VALUES ($1, $2, NOW())',
                [userId, JSON.stringify(settings)]
            );
        } else {
            // Обновляем существующую запись
            await db.query(
                'UPDATE user_settings SET settings = $1, updated_at = NOW() WHERE user_id = $2',
                [JSON.stringify(settings), userId]
            );
        }

        console.log(`✅ Настройки обновлены для пользователя ${userId}`);

        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('❌ Ошибка обновления настроек:', error);
        res.status(500).json({ error: 'Ошибка обновления настроек' });
    }
});

module.exports = router;
