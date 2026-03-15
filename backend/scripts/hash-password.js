/**
 * 🔐 ГЕНЕРАТОР ХЕША ПАРОЛЯ
 * Используйте этот скрипт для создания хеша пароля администратора
 */

const bcrypt = require('bcrypt');

async function hashPassword(password) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('🔐 Хеш пароля:', hash);
    return hash;
}

// Генерация хеша для пароля "admin123"
hashPassword('admin123').then(() => {
    console.log('✅ Используйте этот хеш в schema.sql для создания администратора');
    process.exit(0);
});
