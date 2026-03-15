require('dotenv').config();
const { pool } = require('./db');

pool.query(`
    ALTER TABLE product_prices 
    ADD COLUMN IF NOT EXISTS warehouse_group VARCHAR(100) DEFAULT 'ALL'
`)
.then(() => {
    console.log('✅ Колонка warehouse_group добавлена в product_prices');
    pool.end();
})
.catch(e => {
    console.log('Ошибка:', e.message);
    pool.end();
});
