require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
  .then(r => {
    console.log('Таблицы в БД:', r.rows.map(x => x.table_name));
    pool.end();
  })
  .catch(e => {
    console.log('Ошибка:', e.message);
    pool.end();
  });
