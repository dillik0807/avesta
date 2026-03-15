-- Добавление таблицы цен на товары
CREATE TABLE IF NOT EXISTS product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    warehouse_group VARCHAR(100),
    price_per_ton DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска актуальных цен
CREATE INDEX IF NOT EXISTS idx_product_prices_lookup 
ON product_prices(product_id, warehouse_group, effective_date DESC);
