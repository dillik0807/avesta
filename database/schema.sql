-- Схема базы данных для системы учёта товаров
-- PostgreSQL версия

-- Удаление существующих таблиц (если есть)
DROP TABLE IF EXISTS trash CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS expense CASCADE;
DROP TABLE IF EXISTS income CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS years CASCADE;

-- Таблица годов
CREATE TABLE years (
    id SERIAL PRIMARY KEY,
    year INTEGER UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified BIGINT
);

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    warehouse_group VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Таблица фирм
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица складов
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    warehouse_group VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, warehouse_group)
);

-- Таблица товаров
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    weight_per_unit DECIMAL(10, 3) DEFAULT 0.050,
    price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица клиентов
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, phone)
);

-- Таблица коалиций
CREATE TABLE coalitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица прихода товаров
CREATE TABLE income (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL REFERENCES years(year),
    date DATE NOT NULL,
    wagon VARCHAR(100) NOT NULL,
    company_id INTEGER REFERENCES companies(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    product_id INTEGER REFERENCES products(id),
    qty_doc DECIMAL(10, 2) NOT NULL,
    qty_fact DECIMAL(10, 2) NOT NULL,
    difference DECIMAL(10, 2),
    weight_tons DECIMAL(10, 3),
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_by INTEGER REFERENCES users(id),
    edited_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

-- Таблица расхода товаров
CREATE TABLE expense (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL REFERENCES years(year),
    date DATE NOT NULL,
    coalition VARCHAR(100),
    number VARCHAR(50),
    company_id INTEGER REFERENCES companies(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    product_id INTEGER REFERENCES products(id),
    client_id INTEGER REFERENCES clients(id),
    quantity DECIMAL(10, 2) NOT NULL,
    tons DECIMAL(10, 3),
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_by INTEGER REFERENCES users(id),
    edited_at TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

-- Таблица погашений
CREATE TABLE payments (
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

-- Таблица партнеров
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

-- Таблица корзины (удаленные записи)
CREATE TABLE trash (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    data JSONB NOT NULL,
    deleted_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX idx_income_year ON income(year);
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_income_warehouse ON income(warehouse_id);
CREATE INDEX idx_income_deleted ON income(deleted);

CREATE INDEX idx_expense_year ON expense(year);
CREATE INDEX idx_expense_date ON expense(date);
CREATE INDEX idx_expense_warehouse ON expense(warehouse_id);
CREATE INDEX idx_expense_client ON expense(client_id);
CREATE INDEX idx_expense_deleted ON expense(deleted);

CREATE INDEX idx_payments_year ON payments(year);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_deleted ON payments(deleted);

CREATE INDEX idx_partners_year ON partners(year);
CREATE INDEX idx_partners_date ON partners(date);
CREATE INDEX idx_partners_client ON partners(client_id);
CREATE INDEX idx_partners_deleted ON partners(deleted);

-- Вставка начальных данных
INSERT INTO years (year, last_modified) VALUES (2025, EXTRACT(EPOCH FROM NOW()) * 1000);

-- Создание администратора (пароль: admin123)
-- Хеш будет сгенерирован при первом запуске init-db.js
-- Временный хеш для admin123:
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Комментарии к таблицам
COMMENT ON TABLE years IS 'Рабочие годы системы';
COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON TABLE companies IS 'Фирмы-поставщики';
COMMENT ON TABLE warehouses IS 'Склады с группировкой';
COMMENT ON TABLE products IS 'Товары';
COMMENT ON TABLE clients IS 'Клиенты';
COMMENT ON TABLE income IS 'Приход товаров';
COMMENT ON TABLE expense IS 'Расход товаров';
COMMENT ON TABLE payments IS 'Погашения долгов';
COMMENT ON TABLE partners IS 'Партнеры';
COMMENT ON TABLE trash IS 'Корзина удаленных записей';
