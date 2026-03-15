/**
 * Пересоздание таблицы управления ценами
 */

const db = require('../db');

async function recreatePricesTable() {
    try {
        console.log('🚀 Пересоздание таблицы управления ценами...');
        
        // Удаляем старую таблицу
        console.log('🗑️ Удаляем старую таблицу product_prices...');
        await db.query('DROP TABLE IF EXISTS product_prices CASCADE');
        console.log('✅ Старая таблица удалена');
        
        // Создаем новую таблицу
        console.log('📝 Создаем новую таблицу...');
        await db.query(`
            CREATE TABLE product_prices (
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
        console.log('✅ Таблица создана');
        
        // Создаем индекс
        await db.query(`
            CREATE INDEX idx_product_prices_product_date 
            ON product_prices(product_id, effective_date DESC)
        `);
        console.log('✅ Индекс создан');
        
        // Переносим цены из products
        console.log('📦 Переносим цены из products...');
        const products = await db.query('SELECT id, name, price FROM products WHERE price > 0');
        
        for (const product of products.rows) {
            await db.query(`
                INSERT INTO product_prices (product_id, price, effective_date, notes)
                VALUES ($1, $2, CURRENT_DATE, 'Начальная цена')
            `, [product.id, product.price]);
            console.log(`✅ ${product.name}: ${product.price} $`);
        }
        
        console.log('\n✅ Таблица управления ценами готова!');
        console.log('📌 Перезапустите backend сервер');
        console.log('📌 Обновите страницу в браузере');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

recreatePricesTable();
