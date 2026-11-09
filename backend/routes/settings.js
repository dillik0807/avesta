/**
 * ⚙️ API ДЛЯ НАСТРОЕК
 *
 * default_year — ГЛОБАЛЬНЫЙ год по умолчанию (один на всех пользователей).
 *   Задаёт администратор галочкой в разделе «Управление годами».
 *   При входе этот год автоматически применяется ко всем пользователям.
 *
 * settings — персональные настройки пользователя (JSONB, остаются индивидуальными).
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('./auth');

// Middleware — только для админа
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ только для администратора' });
    }
    next();
}

/**
 * Получить настройки
 * GET /api/settings
 * Возвращает { default_year, settings }:
 *   - default_year — глобальный (из app_settings), один на всех
 *   - settings — персональные (из user_settings), индивидуальные
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Глобальный год по умолчанию (задаёт админ — действует на всех)
        let default_year = null;
        try {
            const globalResult = await db.query(
                'SELECT default_year FROM app_settings WHERE id = 1'
            );
            if (globalResult.rows.length > 0) {
                default_year = globalResult.rows[0].default_year;
            }
        } catch (e) {
            // Таблицы app_settings может не быть до запуска миграции — не критично,
            // просто возвращаем null (фронтенд использует текущий календарный год)
            console.warn('⚠️ Не удалось получить глобальный год (app_settings):', e.message);
        }

        // Персональные настройки (JSONB)
        const result = await db.query(
            'SELECT settings FROM user_settings WHERE user_id = $1',
            [userId]
        );

        const settings = result.rows.length === 0 ? {} : (result.rows[0].settings || {});

        res.json({ default_year, settings });
    } catch (error) {
        console.error('❌ Ошибка получения настроек:', error);
        res.status(500).json({ error: 'Ошибка получения настроек' });
    }
});

/**
 * Установить глобальный год по умолчанию (только админ)
 * POST /api/settings/default-year
 * После этого все пользователи при входе будут видеть указанный год.
 */
router.post('/default-year', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { year } = req.body;

        if (!year || isNaN(year)) {
            return res.status(400).json({ error: 'Неверный формат года' });
        }

        // upsert единственной строки (id = 1)
        await db.query(`
            INSERT INTO app_settings (id, default_year, updated_at)
            VALUES (1, $1, NOW())
            ON CONFLICT (id) DO UPDATE
            SET default_year = EXCLUDED.default_year, updated_at = NOW()
        `, [year]);

        console.log(`✅ Глобальный год по умолчанию установлен: ${year} (админ: ${req.user.username})`);

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
 * Удалить глобальный год по умолчанию (только админ)
 * DELETE /api/settings/default-year
 */
router.delete('/default-year', authenticateToken, adminOnly, async (req, res) => {
    try {
        await db.query(
            'UPDATE app_settings SET default_year = NULL, updated_at = NOW() WHERE id = 1'
        );

        console.log(`✅ Глобальный год по умолчанию удалён (админ: ${req.user.username})`);

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
 * Обновить персональные настройки пользователя
 * PUT /api/settings
 * (settings JSONB остаются индивидуальными для каждого пользователя)
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
