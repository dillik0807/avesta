/**
 * Добавление поля warehouse_group в таблицу product_prices
 */

const db = require('../db');

async function addWarehouseGroupColumn() {
    try {
        console.log('🚀 Добавление поля warehouse_group в product_prices...');
        
        // Добавляем колонку
        await db.query(`
            ALTER TABLE product_prices 
            ADD COLUMN IF NOT EXISTS warehouse_group VARCHAR(50) DEFAULT 'ALL'
        `);
        console.log('✅ Колонка warehouse_group добавлена');
        
        // Создаем индекс для быстрого поиска
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_product_prices_warehouse_group 
            ON product_prices(product_id, warehouse_group, effective_date DESC)
        `);
        console.log('✅ Индекс создан');
        
        console.log('\n✅ Миграция завершена!');
        console.log('📌 Перезапустите backend сервер');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

addWarehouseGroupColumn();
