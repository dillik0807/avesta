/**
 * 🔧 МИГРАЦИЯ: Добавление таблицы настроек пользователя
 * Для хранения года по умолчанию и других настроек
 */

const { pool } = require('../db');

async function addUserSettingsTable() {
    try {
        console.log('🚀 Добавление таблицы user_settings...');

        // Создание таблицы настроек пользователя
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                default_year INTEGER,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Таблица user_settings создана');

        // Создание индекса
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
        `);

        console.log('✅ Индекс создан');

        // Добавление комментария
        await pool.query(`
            COMMENT ON TABLE user_settings IS 'Настройки пользователей (год по умолчанию и др.)';
        `);

        console.log('✅ Комментарий добавлен');

        console.log('');
        console.log('✅ Миграция успешно выполнена!');
        console.log('📊 Таблица user_settings готова к использованию');

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка выполнения миграции:', error);
        process.exit(1);
    }
}

addUserSettingsTable();
