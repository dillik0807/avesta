const db = require('./db');
async function main() {
    const tables = ['income', 'expense', 'payments'];
    for (const t of tables) {
        const r = await db.query(
            'SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2',
            [t, 'legacy_id']
        );
        console.log(t, 'legacy_id exists:', r.rows.length > 0);
    }
    process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
