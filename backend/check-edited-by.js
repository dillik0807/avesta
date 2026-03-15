require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
    SELECT table_name, column_name FROM information_schema.columns 
    WHERE column_name = 'edited_by' 
    AND table_name IN ('income','expense','payments','partners') 
    ORDER BY table_name
`).then(r => {
    console.log('edited_by columns:', r.rows);
    // Добавляем если нет
    const tables = r.rows.map(x => x.table_name);
    const missing = ['income','expense','payments','partners'].filter(t => !tables.includes(t));
    console.log('Missing edited_by in:', missing);
    pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
