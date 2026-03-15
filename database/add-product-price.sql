-- Добавление поля цены в таблицу товаров
-- Выполните этот скрипт для обновления существующей базы данных

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;

-- Комментарий к полю
COMMENT ON COLUMN products.price IS 'Цена товара за тонну (по умолчанию)';
