const db = require('./db');
async function main() {
    await db.query('ALTER TABLE income ADD COLUMN IF NOT EXISTS legacy_id BIGINT');
    await db.query('CREATE INDEX IF NOT EXISTS idx_income_legacy_id ON income(legacy_id)');
    await db.query('ALTER TABLE expense ADD COLUMN IF NOT EXISTS legacy_id BIGINT');
    await db.query('CREATE INDEX IF NOT EXISTS idx_expense_legacy_id ON expense(legacy_id)');
    await db.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS legacy_id BIGINT');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_legacy_id ON payments(legacy_id)');
    console.log('✅ legacy_id columns added');
    process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
