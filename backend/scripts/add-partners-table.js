/**
 * 🗄️ МИГРАЦИЯ: ДОБАВЛЕНИЕ ТАБЛИЦЫ PARTNERS
 */

const { pool } = require('../db');

async function addPartnersTable() {
    try {
        console.log('🚀 Добавление таблицы partners...');

        // Проверяем существует ли таблица
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'partners'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('ℹ️  Таблица partners уже существует');
            process.exit(0);
        }

        // Создаем таблицу partners
        await pool.query(`
            CREATE TABLE partners (
                id SERIAL PRIMARY KEY,
                year INTEGER NOT NULL REFERENCES years(year),
                date DATE NOT NULL,
                client_id INTEGER REFERENCES clients(id),
                somoni DECIMAL(10, 2) NOT NULL,
                rate DECIMAL(10, 4) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                notes TEXT,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                edited_by INTEGER REFERENCES users(id),
                edited_at TIMESTAMP,
                deleted BOOLEAN DEFAULT FALSE
            );
        `);

        console.log('✅ Таблица partners создана');

        // Создаем индексы
        await pool.query(`
            CREATE INDEX idx_partners_year ON partners(year);
            CREATE INDEX idx_partners_date ON partners(date);
            CREATE INDEX idx_partners_client ON partners(client_id);
            CREATE INDEX idx_partners_deleted ON partners(deleted);
        `);

        console.log('✅ Индексы созданы');

        // Добавляем комментарий
        await pool.query(`
            COMMENT ON TABLE partners IS 'Партнеры';
        `);

        console.log('✅ Миграция завершена успешно!');
        console.log('');
        console.log('📊 Теперь погашения и партнеры хранятся в отдельных таблицах:');
        console.log('   - payments (погашения)');
        console.log('   - partners (партнеры)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
        process.exit(1);
    }
}

addPartnersTable();
