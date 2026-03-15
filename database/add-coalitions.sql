-- Добавление таблицы коалиций
CREATE TABLE IF NOT EXISTS coalitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавление нескольких примеров коалиций (опционально)
INSERT INTO coalitions (name) VALUES 
    ('Коалиция 1'),
    ('Коалиция 2'),
    ('Коалиция 3')
ON CONFLICT (name) DO NOTHING;
