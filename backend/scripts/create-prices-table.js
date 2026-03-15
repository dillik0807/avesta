/**
 * Скрипт для создания таблицы управления ценами
 */

const db = require('../db');

async function createPricesTable() {
    try {
        console.log('🚀 Создание таблицы управления ценами...');
        
        // Создаем таблицу product_prices
        await db.query(`
            CREATE TABLE IF NOT EXISTS product_prices (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                price DECIMAL(10, 2) NOT NULL,
                effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
                notes TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT positive_price CHECK (price >= 0)
            )
        `);
        console.log('✅ Таблица product_prices создана');
        
        // Создаем индекс
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_product_prices_product_date 
            ON product_prices(product_id, effective_date DESC)
        `);
        console.log('✅ Индекс создан');
        
        // Переносим текущие цены из products в product_prices
        console.log('📦 Переносим существующие цены...');
        
        // Сначала проверим структуру таблицы
        const columns = await db.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'product_prices'
        `);
        console.log('Колонки таблицы:', columns.rows.map(r => r.column_name));
        
        // Получаем товары с ценами
        const products = await db.query('SELECT id, name, price FROM products WHERE price > 0');
        console.log(`Найдено товаров с ценами: ${products.rows.length}`);
        
        // Вставляем цены по одной
        for (const product of products.rows) {
            try {
                await db.query(`
                    INSERT INTO product_prices (product_id, price, effective_date, notes)
                    VALUES ($1, $2, CURRENT_DATE, 'Начальная цена')
                `, [product.id, product.price]);
                console.log(`✅ Цена для "${product.name}": ${product.price}`);
            } catch (err) {
                console.log(`⚠️ Ошибка для "${product.name}":`, err.message);
            }
        }
        
        console.log('\n✅ Таблица управления ценами готова!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

createPricesTable();
