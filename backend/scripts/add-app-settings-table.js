/**
 * 🔧 МИГРАЦИЯ: Глобальные настройки приложения
 *
 * Добавляет таблицу app_settings с единственной строкой (id = 1),
 * где хранится ГЛОБАЛЬНЫЙ год по умолчанию (один на всех пользователей).
 *
 * Теперь, когда админ ставит галочку на нужный год, этот год применяется
 * ко всем пользователям при входе — а не только к самому админу.
 *
 * Запуск:
 *   node scripts/add-app-settings-table.js
 *
 * Миграция идемпотентна — безопасно запускать повторно.
 */

const { pool } = require('../db');

async function addAppSettingsTable() {
    try {
        console.log('🚀 Добавление таблицы app_settings (глобальные настройки)...');

        // Создание таблицы глобальных настроек (всегда одна строка, id = 1)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                default_year INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT app_settings_single_row CHECK (id = 1)
            );
        `);
        console.log('✅ Таблица app_settings создана');

        // Гарантируем наличие единственной строки
        await pool.query(`
            INSERT INTO app_settings (id, default_year)
            VALUES (1, NULL)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Строка глобальных настроек готова (id = 1)');

        // Комментарий
        await pool.query(`
            COMMENT ON TABLE app_settings IS 'Глобальные настройки приложения (год по умолчанию для всех пользователей)';
        `);

        console.log('');
        console.log('✅ Миграция успешно выполнена!');
        console.log('📊 Глобальный год по умолчанию теперь хранится в app_settings.default_year (один на всех).');
        console.log('📅 После перезапуска сервера админ может поставить галочку на нужный год —');
        console.log('   этот год будет применяться ко всем пользователям при входе.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка выполнения миграции:', error);
        process.exit(1);
    }
}

addAppSettingsTable();
