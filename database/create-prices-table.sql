-- Создание таблицы для управления ценами товаров
-- История цен с возможностью отслеживания изменений

CREATE TABLE IF NOT EXISTS product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_price CHECK (price >= 0)
);

-- Индекс для быстрого поиска последней цены товара
CREATE INDEX IF NOT EXISTS idx_product_prices_product_date 
ON product_prices(product_id, effective_date DESC);

-- Комментарии
COMMENT ON TABLE product_prices IS 'История цен товаров';
COMMENT ON COLUMN product_prices.product_id IS 'ID товара';
COMMENT ON COLUMN product_prices.price IS 'Цена за тонну';
COMMENT ON COLUMN product_prices.effective_date IS 'Дата начала действия цены';
COMMENT ON COLUMN product_prices.notes IS 'Примечания к изменению цены';
COMMENT ON COLUMN product_prices.created_by IS 'Кто установил цену';
