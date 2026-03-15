/**
 * Скрипт для добавления колонки price в таблицу products
 */

const db = require('../db');

async function addPriceColumn() {
    try {
        console.log('🚀 Начинаем миграцию...');
        
        // Добавляем колонку price
        console.log('📝 Добавляем колонку price в таблицу products...');
        await db.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0
        `);
        console.log('✅ Колонка price добавлена!');
        
        // Проверяем что колонка добавлена
        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'price'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Проверка: колонка price существует');
            console.log('   Тип данных:', result.rows[0].data_type);
        } else {
            console.log('⚠️ Предупреждение: колонка price не найдена');
        }
        
        // Устанавливаем цену для существующих товаров
        console.log('💰 Устанавливаем цену 150 для товара "Навои Карбамид"...');
        const updateResult = await db.query(`
            UPDATE products 
            SET price = 150 
            WHERE name = 'Навои Карбамид'
            RETURNING *
        `);
        
        if (updateResult.rows.length > 0) {
            console.log('✅ Цена установлена для товара:', updateResult.rows[0].name);
            console.log('   Цена:', updateResult.rows[0].price);
        } else {
            console.log('ℹ️ Товар "Навои Карбамид" не найден в базе');
        }
        
        // Показываем все товары с ценами
        console.log('\n📦 Список всех товаров с ценами:');
        const products = await db.query('SELECT id, name, price FROM products ORDER BY name');
        products.rows.forEach(p => {
            console.log(`   ${p.id}. ${p.name} - ${p.price || 0} $`);
        });
        
        console.log('\n✅ Миграция завершена успешно!');
        console.log('📌 Теперь обновите страницу в браузере (Ctrl+F5)');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Ошибка при выполнении миграции:', error);
        console.error('Детали:', error.message);
        process.exit(1);
    }
}

// Запускаем миграцию
addPriceColumn();
