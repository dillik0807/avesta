# 📦 Руководство по миграции с Firebase на PostgreSQL

## Обзор

Это руководство поможет вам перенести данные из Firebase Realtime Database в PostgreSQL на Railway.

## Подготовка

### 1. Экспорт данных из Firebase

1. Откройте Firebase Console
2. Перейдите в Realtime Database
3. Нажмите на три точки → "Export JSON"
4. Сохраните файл как `firebase-export.json`

### 2. Структура данных Firebase

Ваши данные в Firebase имеют структуру:
```json
{
  "retailAppData": {
    "years": {
      "2025": {
        "income": [...],
        "expense": [...],
        "payments": [...]
      }
    },
    "companies": [...],
    "warehouses": [...],
    "products": [...],
    "clients": [...]
  }
}
```

## Автоматическая миграция

### Скрипт миграции

Создайте файл `backend/scripts/migrate-from-firebase.js`:

```javascript
const fs = require('fs');
const { pool } = require('../db');

async function migrate() {
    try {
        console.log('🔄 Начало миграции из Firebase...');

        // Чтение экспорта Firebase
        const firebaseData = JSON.parse(
            fs.readFileSync('firebase-export.json', 'utf8')
        );

        const data = firebaseData.retailAppData;

        // Миграция справочников
        await migrateCompanies(data.companies);
        await migrateWarehouses(data.warehouses);
        await migrateProducts(data.products);
        await migrateClients(data.clients);

        // Миграция данных по годам
        for (const [year, yearData] of Object.entries(data.years)) {
            await migrateYear(year, yearData);
        }

        console.log('✅ Миграция завершена успешно!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
        process.exit(1);
    }
}

async function migrateCompanies(companies) {
    console.log('📦 Миграция фирм...');
    for (const company of companies) {
        await pool.query(
            'INSERT INTO companies (name) VALUES ($1) ON CONFLICT DO NOTHING',
            [company.name || company]
        );
    }
}

async function migrateWarehouses(warehouses) {
    console.log('🏪 Миграция складов...');
    for (const warehouse of warehouses) {
        await pool.query(
            'INSERT INTO warehouses (name, warehouse_group) VALUES ($1, $2)',
            [warehouse.name, warehouse.group]
        );
    }
}

async function migrateProducts(products) {
    console.log('📦 Миграция товаров...');
    for (const product of products) {
        await pool.query(
            'INSERT INTO products (name, weight_per_unit) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [product.name || product, product.weightPerUnit || 0.050]
        );
    }
}

async function migrateClients(clients) {
    console.log('👥 Миграция клиентов...');
    for (const client of clients) {
        await pool.query(
            'INSERT INTO clients (name, phone) VALUES ($1, $2)',
            [client.name || client, client.phone || null]
        );
    }
}

async function migrateYear(year, yearData) {
    console.log(`📅 Миграция данных за ${year}...`);

    // Создание года
    await pool.query(
        'INSERT INTO years (year) VALUES ($1) ON CONFLICT DO NOTHING',
        [parseInt(year)]
    );

    // Миграция прихода
    if (yearData.income) {
        for (const item of yearData.income) {
            await migrateIncomeItem(year, item);
        }
    }

    // Миграция расхода
    if (yearData.expense) {
        for (const item of yearData.expense) {
            await migrateExpenseItem(year, item);
        }
    }

    // Миграция погашений
    if (yearData.payments) {
        for (const item of yearData.payments) {
            await migratePaymentItem(year, item);
        }
    }
}

async function migrateIncomeItem(year, item) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Получение ID связанных записей
        const companyId = (await client.query(
            'SELECT id FROM companies WHERE name = $1',
            [item.company]
        )).rows[0]?.id;

        const warehouseId = (await client.query(
            'SELECT id FROM warehouses WHERE name = $1',
            [item.warehouse]
        )).rows[0]?.id;

        const productId = (await client.query(
            'SELECT id FROM products WHERE name = $1',
            [item.product]
        )).rows[0]?.id;

        // Вставка записи
        await client.query(`
            INSERT INTO income (
                year, date, wagon, company_id, warehouse_id, product_id,
                qty_doc, qty_fact, difference, weight_tons, notes, deleted
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
            year, item.date, item.wagon, companyId, warehouseId, productId,
            item.qtyDoc, item.qtyFact, item.difference, item.weightTons,
            item.notes, item.deleted || false
        ]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка миграции прихода:', error);
    } finally {
        client.release();
    }
}

async function migrateExpenseItem(year, item) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const companyId = (await client.query(
            'SELECT id FROM companies WHERE name = $1',
            [item.company]
        )).rows[0]?.id;

        const warehouseId = (await client.query(
            'SELECT id FROM warehouses WHERE name = $1',
            [item.warehouse]
        )).rows[0]?.id;

        const productId = (await client.query(
            'SELECT id FROM products WHERE name = $1',
            [item.product]
        )).rows[0]?.id;

        const clientId = (await client.query(
            'SELECT id FROM clients WHERE name = $1',
            [item.client]
        )).rows[0]?.id;

        await client.query(`
            INSERT INTO expense (
                year, date, coalition, number, company_id, warehouse_id,
                product_id, client_id, quantity, tons, price, total, notes, deleted
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
            year, item.date, item.coalition, item.number, companyId, warehouseId,
            productId, clientId, item.quantity, item.tons, item.price,
            item.total || item.totalAmount, item.notes, item.deleted || false
        ]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка миграции расхода:', error);
    } finally {
        client.release();
    }
}

async function migratePaymentItem(year, item) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const clientId = (await client.query(
            'SELECT id FROM clients WHERE name = $1',
            [item.client]
        )).rows[0]?.id;

        await client.query(`
            INSERT INTO payments (
                year, date, client_id, somoni, rate, amount, notes, deleted
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            year, item.date, clientId, item.somoni, item.rate,
            item.amount, item.notes, item.deleted || false
        ]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка миграции погашения:', error);
    } finally {
        client.release();
    }
}

migrate();
```

### Запуск миграции

```bash
# 1. Поместите firebase-export.json в корень проекта
# 2. Запустите миграцию
cd backend
node scripts/migrate-from-firebase.js
```

## Ручная миграция

Если автоматическая миграция не подходит, можно мигрировать данные вручную:

### 1. Экспорт в Excel

В старой системе используйте функцию экспорта в Excel для каждого раздела.

### 2. Импорт через SQL

Создайте SQL скрипты для импорта данных:

```sql
-- Пример импорта фирм
INSERT INTO companies (name) VALUES
('Фирма 1'),
('Фирма 2'),
('Фирма 3');

-- Пример импорта складов
INSERT INTO warehouses (name, warehouse_group) VALUES
('Склад А', 'Группа 1'),
('Склад Б', 'Группа 1'),
('Склад В', 'Группа 2');
```

## Проверка миграции

После миграции проверьте:

1. Количество записей:
```sql
SELECT 
    (SELECT COUNT(*) FROM income) as income_count,
    (SELECT COUNT(*) FROM expense) as expense_count,
    (SELECT COUNT(*) FROM payments) as payments_count,
    (SELECT COUNT(*) FROM companies) as companies_count,
    (SELECT COUNT(*) FROM warehouses) as warehouses_count,
    (SELECT COUNT(*) FROM products) as products_count,
    (SELECT COUNT(*) FROM clients) as clients_count;
```

2. Целостность данных:
```sql
-- Проверка связей
SELECT COUNT(*) FROM income WHERE company_id IS NULL;
SELECT COUNT(*) FROM expense WHERE client_id IS NULL;
```

3. Итоговые суммы:
```sql
-- Сравните с Firebase
SELECT 
    SUM(qty_fact) as total_income_qty,
    SUM(weight_tons) as total_income_tons
FROM income WHERE year = 2025;

SELECT 
    SUM(quantity) as total_expense_qty,
    SUM(total) as total_expense_amount
FROM expense WHERE year = 2025;
```

## Откат миграции

Если что-то пошло не так:

```sql
-- Очистка всех данных (ОСТОРОЖНО!)
TRUNCATE TABLE income, expense, payments, trash CASCADE;
TRUNCATE TABLE companies, warehouses, products, clients CASCADE;
TRUNCATE TABLE years CASCADE;
```

## Параллельная работа

Во время миграции можно работать с обеими системами:

1. Продолжайте использовать Firebase версию
2. Мигрируйте данные в PostgreSQL
3. Тестируйте PostgreSQL версию
4. После проверки переключитесь на PostgreSQL

## Поддержка

Если возникли проблемы:
1. Проверьте логи миграции
2. Убедитесь, что все зависимости установлены
3. Проверьте формат данных в firebase-export.json
4. Создайте issue в репозитории проекта
