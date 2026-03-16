/**
 * 🤖 Telegram бот для системы учёта товаров Avesta
 * PostgreSQL версия — работает через REST API бэкенда
 */

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');
const fs = require('fs');
const ExcelJS = require('exceljs');

const { Pool } = require('pg');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const DEFAULT_YEAR = process.env.DEFAULT_YEAR || '2026';

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN не указан!');
    process.exit(1);
}

// ─── PostgreSQL для сессий ────────────────────────────────────────────────────
const pool = process.env.DATABASE_URL ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
}) : null;

// Создаём таблицу сессий если нет
async function initSessionsTable() {
    if (!pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_sessions (
                user_id BIGINT PRIMARY KEY,
                data JSONB NOT NULL DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Таблица bot_sessions готова');
    } catch (e) {
        console.error('❌ Ошибка создания таблицы сессий:', e.message);
    }
}

// ─── Сессии (в памяти + PostgreSQL) ──────────────────────────────────────────
let sessions = {};

// Загрузка всех сессий из БД при старте
async function loadSessionsFromDB() {
    if (!pool) return;
    try {
        const res = await pool.query('SELECT user_id, data FROM bot_sessions');
        res.rows.forEach(row => { sessions[row.user_id] = row.data; });
        console.log(`✅ Загружено ${res.rows.length} сессий из БД`);
    } catch (e) {
        console.error('❌ Ошибка загрузки сессий:', e.message);
    }
}

// Сохранение одной сессии в БД
const saveSessions = (userId) => {
    if (!pool) return;
    if (userId) {
        const data = sessions[userId] || {};
        pool.query(
            `INSERT INTO bot_sessions (user_id, data, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
            [userId, JSON.stringify(data)]
        ).catch(e => console.error('❌ Ошибка сохранения сессии:', e.message));
    } else {
        // Сохраняем все сессии (для обратной совместимости)
        Object.keys(sessions).forEach(uid => {
            pool.query(
                `INSERT INTO bot_sessions (user_id, data, updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
                [uid, JSON.stringify(sessions[uid])]
            ).catch(e => console.error('❌ Ошибка сохранения сессии:', e.message));
        });
    }
};

const isAuthorized = (userId) => sessions[userId]?.authorized && sessions[userId]?.token;
const getSession   = (userId) => sessions[userId] || {};
const getUserYear  = (userId) => getSession(userId).year || DEFAULT_YEAR;
const isAdmin      = (userId) => getSession(userId).role === 'admin';
const setUserYear  = (userId, year) => { if (sessions[userId]) { sessions[userId].year = year; saveSessions(); } };

// ─── API ─────────────────────────────────────────────────────────────────────
const apiGet = async (path, token) => {
    const res = await fetch(`${API_URL}${path}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
};

const apiPost = async (path, body, token) => {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
};

const loginApi = async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка входа');
    return data;
};

const getData = async (userId) => {
    const { token, year } = getSession(userId);
    return apiGet(`/api/data/${year || DEFAULT_YEAR}`, token);
};

const getDataAll = async (userId) => {
    const { token, year } = getSession(userId);
    return apiGet(`/api/data/${year || DEFAULT_YEAR}?all=true`, token);
};

// ─── Форматирование ───────────────────────────────────────────────────────────
const formatNumber = (num) => {
    const n = parseFloat(num) || 0;
    // Форматируем с разделителем тысяч
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const escMd = (text) => {
    if (!text) return '';
    return text.toString()
        .replace(/\\/g,'\\\\').replace(/\*/g,'\\*').replace(/_/g,'\\_')
        .replace(/\[/g,'\\[').replace(/\]/g,'\\]').replace(/\(/g,'\\(')
        .replace(/\)/g,'\\)').replace(/~/g,'\\~').replace(/`/g,'\\`')
        .replace(/>/g,'\\>').replace(/#/g,'\\#').replace(/\+/g,'\\+')
        .replace(/-/g,'\\-').replace(/=/g,'\\=').replace(/\|/g,'\\|')
        .replace(/\{/g,'\\{').replace(/\}/g,'\\}').replace(/\./g,'\\.')
        .replace(/!/g,'\\!');
};

const sendMd = async (ctx, text, extra = {}) => {
    try {
        await ctx.reply(text, { parse_mode: 'Markdown', ...extra });
    } catch {
        await ctx.reply(text.replace(/[*_`[\]()~>#+=|{}.!\\-]/g, ''), extra);
    }
};

const sendLong = async (ctx, msg, extra = {}) => {
    if (msg.length <= 4000) return sendMd(ctx, msg, extra);
    const parts = msg.match(/[\s\S]{1,4000}/g) || [];
    for (let i = 0; i < parts.length; i++) {
        await sendMd(ctx, parts[i], i === parts.length - 1 ? extra : {});
    }
};

const getRoleText = (role) => ({
    admin: '👑 Администратор', warehouse: '🏪 Завсклад',
    cashier: '💵 Кассир', manager: '📊 Менеджер'
}[role] || role);

// ─── Клавиатуры ──────────────────────────────────────────────────────────────
const loginKeyboard = Markup.keyboard([['🔐 Войти']]).resize();

const mainKeyboard = Markup.keyboard([
    ['📦 Остатки складов', '🏭 Фактический остаток'],
    ['💰 Долги клиентов', '📊 Сводка'],
    ['📅 Отчёт за день', '📤 Расход за день'],
    ['📋 Отчёты', '📆 Сменить год'],
    ['🚪 Выйти']
]).resize();

const adminKeyboard = Markup.keyboard([
    ['📦 Остатки складов', '🏭 Фактический остаток'],
    ['💰 Долги клиентов', '📊 Сводка'],
    ['📅 Отчёт за день', '📤 Расход за день'],
    ['📋 Отчёты', '⚙️ Управление'],
    ['📆 Сменить год', '🚪 Выйти']
]).resize();

const reportsKeyboard = Markup.keyboard([
    ['📈 Приход за период', '📉 Расход за период'],
    ['💵 Погашения за период', '👥 Топ должников'],
    ['🚂 Итоги вагонов', '👤 Карточка клиента'],
    ['📊 Отчёт по товарам', '🔔 Уведомления о долгах'],
    ['🔙 Назад']
]).resize();

const managementKeyboard = Markup.keyboard([
    ['👥 Пользователи', '📦 Товары'],
    ['🏢 Фирмы', '🏪 Склады'],
    ['👤 Клиенты', '💰 Цены'],
    ['📅 Годы', '🔙 Назад в меню']
]).resize();

const getMainKeyboard = (userId) => isAdmin(userId) ? adminKeyboard : mainKeyboard;

const periodButtons = (prefix) => Markup.inlineKeyboard([
    [Markup.button.callback('📅 Сегодня', `${prefix}_today`), Markup.button.callback('📅 Вчера', `${prefix}_yesterday`)],
    [Markup.button.callback('📅 Неделя', `${prefix}_week`), Markup.button.callback('📅 Месяц', `${prefix}_month`)],
    [Markup.button.callback('📅 Весь год', `${prefix}_year`)]
]);

const periodName = (t) => ({ today:'Сегодня', yesterday:'Вчера', week:'За неделю', month:'За месяц', year:'За весь год' }[t] || t);

const filterByPeriod = (items, dateField, pType) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const d = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return x.toISOString().split('T')[0]; };
    const m = (n) => { const x = new Date(today); x.setMonth(x.getMonth() - n); return x.toISOString().split('T')[0]; };
    return items.filter(item => {
        const v = item[dateField];
        if (!v) return false;
        if (pType === 'today')     return v === todayStr;
        if (pType === 'yesterday') return v === d(1);
        if (pType === 'week')      return v >= d(7);
        if (pType === 'month')     return v >= m(1);
        return true;
    });
};

// ─── Фильтрация по группам складов пользователя ──────────────────────────────
const filterByWarehouseGroup = (data, userId) => {
    const s = getSession(userId);
    if (s.role === 'admin') return data;
    const userGroups = s.warehouseGroup || [];
    // Если группы не заданы — пользователь видит всё (как в старом боте)
    if (!userGroups.length || !userGroups[0]) return data;

    console.log(`🔍 Фильтр складов для ${s.username}: ${JSON.stringify(userGroups)}`);

    const whToGroup = {};
    (data.warehouses||[]).forEach(w => { if (w.name) whToGroup[w.name] = w.warehouse_group || ''; });

    const hasAccess = (wh) => {
        const g = whToGroup[wh];
        if (!g) return true;
        return userGroups.includes(g);
    };

    return {
        ...data,
        income:   (data.income||[]).filter(i => hasAccess(i.warehouse)),
        expense:  (data.expense||[]).filter(e => hasAccess(e.warehouse)),
        payments: data.payments||[],
        warehouses: (data.warehouses||[]).filter(w => !w.warehouse_group || userGroups.includes(w.warehouse_group))
    };
};
const calcStock = (data) => {
    const b = {};
    (data.income||[]).forEach(i => {
        const k = `${i.warehouse}|${i.company}|${i.product}`;
        if (!b[k]) b[k] = { warehouse:i.warehouse, company:i.company, product:i.product, income:0, expense:0 };
        b[k].income += parseFloat(i.qty_fact)||0;
    });
    (data.expense||[]).forEach(e => {
        const k = `${e.warehouse}|${e.company}|${e.product}`;
        if (!b[k]) b[k] = { warehouse:e.warehouse, company:e.company, product:e.product, income:0, expense:0 };
        b[k].expense += parseFloat(e.quantity)||0;
    });
    const byWh = {};
    Object.values(b).forEach(item => {
        const bal = item.income - item.expense;
        if (bal !== 0) {
            if (!byWh[item.warehouse]) byWh[item.warehouse] = [];
            byWh[item.warehouse].push({ company:item.company, product:item.product, tons: bal/20 });
        }
    });
    return byWh;
};

const calcFactBalance = (data) => {
    const s = {};
    (data.income||[]).forEach(i => {
        const k = `${i.warehouse}-${i.company}-${i.product}`;
        if (!s[k]) s[k] = { warehouse:i.warehouse, company:i.company, product:i.product, income:0, expense:0 };
        s[k].income += parseFloat(i.qty_fact)||0;
    });
    (data.expense||[]).forEach(e => {
        const k = `${e.warehouse}-${e.company}-${e.product}`;
        if (!s[k]) s[k] = { warehouse:e.warehouse, company:e.company, product:e.product, income:0, expense:0 };
        s[k].expense += parseFloat(e.quantity)||0;
    });
    const warehouses = {}, productTotals = {};
    Object.values(s).forEach(item => {
        const tons = (item.income - item.expense) / 20;
        if (tons !== 0) {
            if (!warehouses[item.warehouse]) warehouses[item.warehouse] = {};
            warehouses[item.warehouse][item.product] = (warehouses[item.warehouse][item.product]||0) + tons;
            productTotals[item.product] = (productTotals[item.product]||0) + tons;
        }
    });
    return { warehouses, productTotals };
};

const calcDebts = (data) => {
    const d = {};
    (data.expense||[]).forEach(e => {
        if (!e.client) return;
        if (!d[e.client]) d[e.client] = { total:0, paid:0 };
        d[e.client].total += parseFloat(e.total)||0;
    });
    (data.payments||[]).forEach(p => {
        if (!p.client) return;
        if (!d[p.client]) d[p.client] = { total:0, paid:0 };
        d[p.client].paid += parseFloat(p.amount)||0;
    });
    const r = {};
    Object.entries(d).forEach(([c, v]) => {
        const debt = v.total - v.paid;
        if (debt > 0.01) r[c] = { total:v.total, paid:v.paid, debt };
    });
    return r;
};

const calcClientCard = (data, clientName) => {
    const purchases = (data.expense||[])
        .filter(e => e.client === clientName)
        .map(e => ({
            date: e.date||'', warehouse: e.warehouse||'', product: e.product||'',
            qty: parseFloat(e.quantity)||0, tons: parseFloat(e.tons)||0,
            price: parseFloat(e.price)||0, total: parseFloat(e.total)||0
        }))
        .sort((a,b) => b.date.localeCompare(a.date));
    const payments = (data.payments||[])
        .filter(p => p.client === clientName)
        .map(p => ({ date: p.date||'', amount: parseFloat(p.amount)||0, note: p.notes||'' }))
        .sort((a,b) => b.date.localeCompare(a.date));
    const totalTons = purchases.reduce((s,p) => s + p.tons, 0);
    const totalSum  = purchases.reduce((s,p) => s + p.total, 0);
    const totalPaid = payments.reduce((s,p) => s + p.amount, 0);
    return { purchases, payments, totalTons, totalSum, totalPaid, debt: Math.max(0, totalSum - totalPaid) };
};

const calcWagonTotals = (data) => {
    const t = {};
    (data.income||[]).forEach(i => {
        const k = `${i.product}-${i.company}-${i.warehouse}`;
        if (!t[k]) t[k] = { product:i.product, company:i.company, warehouse:i.warehouse, wagons:0, qtyDoc:0, qtyFact:0 };
        t[k].wagons++; t[k].qtyDoc += parseFloat(i.qty_doc)||0; t[k].qtyFact += parseFloat(i.qty_fact)||0;
    });
    const items = Object.values(t);
    const grand = items.reduce((s,i) => ({ wagons:s.wagons+i.wagons, qtyDoc:s.qtyDoc+i.qtyDoc, qtyFact:s.qtyFact+i.qtyFact }), {wagons:0,qtyDoc:0,qtyFact:0});
    return { items, totals: { ...grand, difference: grand.qtyFact-grand.qtyDoc, weightTons: grand.qtyFact/20 } };
};

// ─── Бот ─────────────────────────────────────────────────────────────────────
const bot = new Telegraf(BOT_TOKEN);

bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const text = ctx.message?.text || '';
    const pub = ['/start','🔐 Войти','/login'];
    const s = getSession(userId);
    if (pub.some(c => text.startsWith(c))) return next();
    if (s.waitingForUsername || s.waitingForPassword || s.waitingForPrice ||
        s.waitingForNewProduct || s.waitingForNewCompany || s.waitingForNewClient) return next();
    if (!isAuthorized(userId)) return ctx.reply('⛔ Требуется авторизация!\n\nНажмите "🔐 Войти" или /start', loginKeyboard);
    return next();
});

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    if (isAuthorized(userId)) {
        const s = getSession(userId);
        return sendMd(ctx, `🏭 *Avesta - Система учёта*\n\n👤 Вы вошли как: *${escMd(s.username)}*\n📅 Год: *${s.year||DEFAULT_YEAR}*\n\nВыберите действие:`, getMainKeyboard(userId));
    }
    ctx.reply('🏭 *Avesta - Система учёта товаров*\n\nДля доступа необходимо войти.\nИспользуйте логин и пароль из приложения.', { parse_mode:'Markdown', ...loginKeyboard });
});

bot.hears(/🔐|\/login|войти/i, async (ctx) => {
    const userId = ctx.from.id;
    if (isAuthorized(userId)) return ctx.reply('✅ Вы уже авторизованы!', getMainKeyboard(userId));
    sessions[userId] = { waitingForUsername: true };
    saveSessions();
    ctx.reply('👤 Введите ваш логин:', Markup.removeKeyboard());
});

bot.hears(/🚪|\/logout|выйти/i, async (ctx) => {
    sessions[ctx.from.id] = {};
    saveSessions();
    ctx.reply('👋 Вы вышли из системы.', loginKeyboard);
});

// Смена года
bot.hears(/📆|\/year|сменить год/i, async (ctx) => {
    const userId = ctx.from.id;
    const cur = getUserYear(userId);
    await ctx.reply('⏳ Загрузка списка годов...');
    try {
        const { token } = getSession(userId);
        const result = await apiGet('/api/data/years/list', token);
        const years = result.years || ['2024','2025','2026'];
        const buttons = years.map(y => [Markup.button.callback(`📅 ${y}${y==cur?' ✓':''}`, `year_${y}`)]);
        ctx.reply(`📅 *Выберите год*\n\nТекущий год: *${cur}*`, { parse_mode:'Markdown', ...Markup.inlineKeyboard(buttons) });
    } catch {
        const years = ['2024','2025','2026','2027'];
        ctx.reply('📅 *Выберите год*', { parse_mode:'Markdown', ...Markup.inlineKeyboard(years.map(y => [Markup.button.callback(`📅 ${y}${y==cur?' ✓':''}`, `year_${y}`)])) });
    }
});

bot.action(/^year_(\d{4})$/, async (ctx) => {
    const userId = ctx.from.id;
    const year = ctx.match[1];
    setUserYear(userId, year);
    await ctx.answerCbQuery(`✅ Год изменён на ${year}`);
    await ctx.editMessageText(`✅ Год успешно изменён на *${year}*`, { parse_mode:'Markdown' });
    ctx.reply(`📅 Теперь данные отображаются за *${year}* год`, { parse_mode:'Markdown', ...getMainKeyboard(userId) });
});

// Меню отчётов
bot.hears(/📋|\/reports|отчёты|отчеты/i, async (ctx) => {
    const userId = ctx.from.id;
    ctx.reply(`📋 *МЕНЮ ОТЧЁТОВ*\n📅 Год: *${getUserYear(userId)}*\n\nВыберите тип отчёта:`, { parse_mode:'Markdown', ...reportsKeyboard });
});

bot.hears(/🔙 Назад в меню|назад в меню/i, async (ctx) => ctx.reply('🏠 Главное меню', getMainKeyboard(ctx.from.id)));
bot.hears(/^🔙 Назад$/, async (ctx) => ctx.reply('🏠 Главное меню', getMainKeyboard(ctx.from.id)));

// ─── Авторизация (text handler #1) ───────────────────────────────────────────
bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const s = getSession(userId);

    if (s.waitingForUsername) {
        sessions[userId] = { waitingForPassword:true, username:text };
        saveSessions();
        return ctx.reply('🔑 Введите пароль:');
    }
    if (s.waitingForPassword) {
        try { await ctx.deleteMessage(); } catch {}
        try {
            const result = await loginApi(s.username, text);
            sessions[userId] = {
                authorized:true, token:result.token,
                username:result.user.username, role:result.user.role,
                warehouseGroup:result.user.warehouseGroup||[], year:DEFAULT_YEAR
            };
            saveSessions();
            await sendMd(ctx, `✅ Добро пожаловать, *${escMd(result.user.username)}*!\n\n👤 Роль: ${getRoleText(result.user.role)}\n📅 Год: *${DEFAULT_YEAR}*\n\nВыберите действие:`);
            return ctx.reply('Меню:', getMainKeyboard(userId));
        } catch (err) {
            sessions[userId] = {};
            saveSessions();
            return ctx.reply(`❌ ${err.message}`, loginKeyboard);
        }
    }
    return next();
});

// ─── Главные разделы ──────────────────────────────────────────────────────────
bot.hears('📦 Остатки складов', async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    await ctx.reply('⏳ Загрузка...');
    try {
        const rawData = await getData(userId);
        const data = filterByWarehouseGroup(rawData, userId);
        const stock = calcStock(data);
        if (!Object.keys(stock).length) return ctx.reply(`📦 Нет данных об остатках за ${year} год`);

        let msg = `📦 *ОСТАТКИ СКЛАДОВ*\n📅 ${year}\n${'─'.repeat(20)}\n\n`;
        let total = 0;

        Object.entries(stock).sort().forEach(([wh, items]) => {
            msg += `🏪 *${escMd(wh)}*\n`;
            let whTotal = 0;
            items.forEach(i => {
                msg += `  ${escMd(i.company)} ${escMd(i.product)}: ${formatNumber(i.tons)} т\n`;
                whTotal += i.tons;
            });
            msg += `  _Итого: ${formatNumber(whTotal)} т_\n\n`;
            total += whTotal;
        });

        msg += `${'─'.repeat(20)}\n📊 *ИТОГО: ${formatNumber(total)} тонн*`;
        await sendLong(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.hears('🏭 Фактический остаток', async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    await ctx.reply('⏳ Загрузка фактических остатков...');
    try {
        const rawData = await getData(userId);
        const data = filterByWarehouseGroup(rawData, userId);
        const { warehouses, productTotals } = calcFactBalance(data);
        if (!Object.keys(warehouses).length) return ctx.reply(`🏭 Нет данных о фактических остатках за ${year} год`);

        // Группируем склады по warehouse_group
        const warehouseGroups = {};
        (data.warehouses||[]).forEach(w => { if (w.name) warehouseGroups[w.name] = w.warehouse_group || 'Без группы'; });

        const groups = {};
        Object.entries(warehouses).forEach(([whName, products]) => {
            const groupName = warehouseGroups[whName] || 'Без группы';
            if (!groups[groupName]) groups[groupName] = {};
            groups[groupName][whName] = products;
        });

        let msg = `🏭 *ФАКТИЧЕСКИЙ ОСТАТОК*\n📅 ${year}\n${'═'.repeat(25)}\n\n`;
        let grandTotal = 0;

        Object.entries(groups).sort().forEach(([groupName, whs]) => {
            msg += `📁 *${escMd(groupName)}*\n${'─'.repeat(20)}\n`;
            let groupTotal = 0;
            Object.entries(whs).sort().forEach(([whName, products]) => {
                msg += `🏪 *${escMd(whName)}*\n`;
                let whTotal = 0;
                Object.entries(products).sort().forEach(([product, tons]) => {
                    if (tons !== 0) { msg += `  • ${escMd(product)}: ${formatNumber(tons)} т\n`; whTotal += tons; }
                });
                if (whTotal !== 0) msg += `  _Итого: ${formatNumber(whTotal)} т_\n`;
                msg += '\n';
                groupTotal += whTotal;
            });
            msg += `📊 *Итого ${escMd(groupName)}: ${formatNumber(groupTotal)} т*\n\n`;
            grandTotal += groupTotal;
        });

        msg += `${'═'.repeat(25)}\n🏭 *ОБЩИЙ ИТОГ: ${formatNumber(grandTotal)} тонн*\n\n`;

        if (Object.keys(productTotals).length) {
            msg += `📦 *ИТОГО ПО ТОВАРАМ:*\n`;
            Object.entries(productTotals).sort().forEach(([p, t]) => { if (t !== 0) msg += `  • ${escMd(p)}: ${formatNumber(t)} т\n`; });
        }

        await sendLong(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.hears('💰 Долги клиентов', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const debts = calcDebts(data);
        if (!Object.keys(debts).length) return ctx.reply('✅ Долгов нет!');
        const sorted = Object.entries(debts).sort((a,b) => b[1].debt - a[1].debt);
        let msg = `💰 *ДОЛГИ КЛИЕНТОВ*\n📅 ${getUserYear(userId)}\n${'─'.repeat(20)}\n\n`;
        let total = 0;
        const show = sorted.slice(0, 30);
        show.forEach(([c, d], i) => {
            msg += `${i+1}. *${escMd(c)}*\n   Сумма: ${formatNumber(d.total)} $\n   Оплачено: ${formatNumber(d.paid)} $\n   💳 Долг: *${formatNumber(d.debt)} $*\n\n`;
            total += d.debt;
        });
        if (sorted.length > 30) {
            let rest = 0;
            sorted.slice(30).forEach(([_,d]) => { total += d.debt; rest += d.debt; });
            msg += `_...и ещё ${sorted.length-30} клиентов на ${formatNumber(rest)} $_\n\n`;
        }
        msg += `${'─'.repeat(20)}\n👥 Должников: ${sorted.length}\n💰 *ИТОГО ДОЛГ: ${formatNumber(total)} $*`;
        sessions[userId].lastDebtsReport = {
            items: sorted.map(([client, d]) => ({ client, total: d.total, paid: d.paid, debt: d.debt })),
            year: getUserYear(userId), totalDebt: total
        };
        saveSessions();
        const exportBtn = Markup.inlineKeyboard([[Markup.button.callback('📊 Экспорт в Excel', 'exdebts')]]);
        await sendLong(ctx, msg, exportBtn);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('exdebts', async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    if (!s.lastDebtsReport) return ctx.answerCbQuery('❌ Сначала сформируйте отчёт');
    await ctx.answerCbQuery('📊 Создание Excel...');
    const { items, year, totalDebt } = s.lastDebtsReport;
    try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Долги клиентов');
        ws.columns = [
            {header:'№',key:'num',width:5},{header:'Клиент',key:'client',width:30},
            {header:'Сумма покупок ($)',key:'total',width:18},{header:'Оплачено ($)',key:'paid',width:15},
            {header:'Долг ($)',key:'debt',width:15}
        ];
        ws.getRow(1).font = { bold:true };
        let sumTotal=0, sumPaid=0, sumDebt=0;
        items.forEach((item,i) => {
            ws.addRow({ num:i+1, client:item.client, total:item.total, paid:item.paid, debt:item.debt });
            sumTotal+=item.total; sumPaid+=item.paid; sumDebt+=item.debt;
        });
        const tr = ws.addRow({ num:'', client:'ИТОГО:', total:sumTotal, paid:sumPaid, debt:sumDebt });
        tr.font = { bold:true };
        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `Dolgi_${year}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.hears('📊 Сводка', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const year = getUserYear(userId);
        const tInc  = (data.income||[]).reduce((s,i) => s + (parseFloat(i.qty_fact)||0)/20, 0);
        const tExp  = (data.expense||[]).reduce((s,e) => s + (parseFloat(e.tons)||0), 0);
        const tSale = (data.expense||[]).reduce((s,e) => s + (parseFloat(e.total)||0), 0);
        const tPaid = (data.payments||[]).reduce((s,p) => s + (parseFloat(p.amount)||0), 0);
        const msg =
            `📊 *СВОДКА ЗА ${year}*\n${'═'.repeat(25)}\n\n` +
            `📥 Приход: *${formatNumber(tInc)} т*\n` +
            `📤 Расход: *${formatNumber(tExp)} т*\n` +
            `📦 Остаток: *${formatNumber(tInc-tExp)} т*\n\n` +
            `💵 Продажи: *${formatNumber(tSale)} $*\n` +
            `✅ Оплачено: *${formatNumber(tPaid)} $*\n` +
            `❗ Долги: *${formatNumber(Math.max(0,tSale-tPaid))} $*\n\n` +
            `${'─'.repeat(20)}\n` +
            `📋 Приход: ${(data.income||[]).length} записей\n` +
            `📋 Расход: ${(data.expense||[]).length} записей\n` +
            `📋 Погашения: ${(data.payments||[]).length} записей`;
        await sendMd(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Отчёт за день / Расход за день ──────────────────────────────────────────
bot.hears('📅 Отчёт за день', async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    ctx.reply(`📅 *ОТЧЁТ ЗА ДЕНЬ*\n📆 Год: *${getUserYear(ctx.from.id)}*\n\nВыберите дату:`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('📅 Сегодня', 'daily_today')],
            [Markup.button.callback('📅 Вчера', 'daily_yesterday')],
            [Markup.button.callback('📅 Позавчера', 'daily_2days')]
        ])
    });
    sessions[ctx.from.id] = { ...getSession(ctx.from.id), waitingForDailyDate:true };
    saveSessions();
});

bot.action(/^daily_(today|yesterday|2days)$/, async (ctx) => {
    const userId = ctx.from.id;
    const dateType = ctx.match[1];
    sessions[userId] = { ...getSession(userId), waitingForDailyDate:false };
    saveSessions();
    await ctx.answerCbQuery();
    const today = new Date();
    let date, dateName;
    if (dateType === 'today') { date = today.toISOString().split('T')[0]; dateName = 'Сегодня'; }
    else if (dateType === 'yesterday') { const d = new Date(today); d.setDate(d.getDate()-1); date = d.toISOString().split('T')[0]; dateName = 'Вчера'; }
    else { const d = new Date(today); d.setDate(d.getDate()-2); date = d.toISOString().split('T')[0]; dateName = 'Позавчера'; }
    await showDailyReport(ctx, userId, date, dateName);
});

const showDailyReport = async (ctx, userId, date, dateName = '') => {
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const income  = (data.income||[]).filter(i => i.date === date);
        const expense = (data.expense||[]).filter(e => e.date === date);
        const expSum  = expense.reduce((s,e) => s + (parseFloat(e.total)||0), 0);
        const formattedDate = new Date(date).toLocaleDateString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric'});
        let msg = `📅 *ОТЧЁТ ЗА ${formattedDate}*\n`;
        if (dateName) msg += `(${dateName})\n`;
        msg += `${'═'.repeat(25)}\n\n`;

        msg += `📦 *ПРИХОД ТОВАРОВ*\n${'─'.repeat(20)}\n`;
        if (income.length) {
            let incTons = 0;
            income.forEach(i => {
                const tons = (parseFloat(i.qty_fact)||0)/20;
                msg += `🚂 ${escMd(i.wagon||'—')} | ${escMd(i.product)} | ${escMd(i.warehouse)}\n`;
                msg += `   ${escMd(i.company||'—')} | Факт: ${formatNumber(tons)} т\n\n`;
                incTons += tons;
            });
            msg += `📊 *Итого приход:* ${income.length} операций | ⚖️ *${formatNumber(incTons)} т*\n\n`;
        } else { msg += `_Операций прихода не было_\n\n`; }

        msg += `📤 *РАСХОД ТОВАРОВ*\n${'─'.repeat(20)}\n`;
        if (expense.length) {
            let expTons = 0;
            expense.forEach(e => {
                msg += `👤 ${escMd(e.client||'—')}\n   ${escMd(e.product)} | ${escMd(e.warehouse)}\n   ${formatNumber(e.tons)} т × ${formatNumber(e.price)} $ = *${formatNumber(e.total)} $*\n\n`;
                expTons += parseFloat(e.tons)||0;
            });
            msg += `📊 *Итого расход:* ${expense.length} операций | ⚖️ ${formatNumber(expTons)} т\n   💰 Сумма: *${formatNumber(expSum)} $*\n\n`;
        } else { msg += `_Операций расхода не было_\n\n`; }

        msg += `${'═'.repeat(25)}\n📊 *СВОДКА ЗА ДЕНЬ:*\n   📦 Приход: ${income.length} операций\n   📤 Расход: ${expense.length} операций\n   💰 Сумма продаж: *${formatNumber(expSum)} $*`;

        sessions[userId].lastDailyReport = { income, expense, date, formattedDate };
        saveSessions();

        const exportBtn = Markup.inlineKeyboard([[Markup.button.callback('📊 Экспорт в Excel', `exdaily_${date}`)]]);
        await sendLong(ctx, msg, exportBtn);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
};

bot.action(/^exdaily_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    if (!s.lastDailyReport) return ctx.answerCbQuery('❌ Сначала сформируйте отчёт');
    await ctx.answerCbQuery('📊 Создание Excel...');
    const { income, expense, date, formattedDate } = s.lastDailyReport;
    try {
        const wb = new ExcelJS.Workbook();
        // Приход
        const ws1 = wb.addWorksheet('Приход');
        ws1.columns = [{header:'Дата',key:'date',width:12},{header:'Вагон',key:'wagon',width:15},{header:'Товар',key:'product',width:20},{header:'Склад',key:'warehouse',width:15},{header:'Фирма',key:'company',width:15},{header:'Тонны',key:'tons',width:10}];
        ws1.getRow(1).font = {bold:true};
        income.forEach(i => ws1.addRow({date:i.date,wagon:i.wagon||'',product:i.product||'',warehouse:i.warehouse||'',company:i.company||'',tons:formatNumber((parseFloat(i.qty_fact)||0)/20)}));
        // Расход
        const ws2 = wb.addWorksheet('Расход');
        ws2.columns = [{header:'Дата',key:'date',width:12},{header:'Клиент',key:'client',width:20},{header:'Товар',key:'product',width:20},{header:'Склад',key:'warehouse',width:15},{header:'Тонны',key:'tons',width:10},{header:'Цена',key:'price',width:10},{header:'Сумма ($)',key:'total',width:12}];
        ws2.getRow(1).font = {bold:true};
        expense.forEach(e => ws2.addRow({date:e.date,client:e.client||'',product:e.product||'',warehouse:e.warehouse||'',tons:parseFloat(e.tons)||0,price:parseFloat(e.price)||0,total:parseFloat(e.total)||0}));
        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `otchet_${date}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.hears('📤 Расход за день', async (ctx) => {
    const userId = ctx.from.id;
    await showExpenseDay(ctx, userId, 0);
});

const showExpenseDay = async (ctx, userId, daysAgo) => {
    await ctx.reply('⏳ Загрузка расхода за день...');
    try {
        const data = await getDataAll(userId);
        const year = getUserYear(userId);
        const targetDt = new Date();
        targetDt.setDate(targetDt.getDate() - daysAgo);
        const targetDate = targetDt.toISOString().split('T')[0];
        const formattedDate = targetDt.toLocaleDateString('ru-RU');
        const dayLabel = daysAgo === 0 ? 'Сегодня' : daysAgo === 1 ? 'Вчера' : 'Позавчера';

        const expense = (data.expense||[]).filter(e => e.date === targetDate);

        if (!expense.length) {
            const kb = Markup.inlineKeyboard([
                [Markup.button.callback('📅 Вчера', 'expday2_1'), Markup.button.callback('📅 Позавчера', 'expday2_2')]
            ]);
            return ctx.reply(`📤 ${dayLabel} расходов не было\n📅 ${formattedDate}`, kb);
        }

        // Группируем по группам складов
        const warehouseGroups = {};
        (data.warehouses||[]).forEach(w => { if (w.name) warehouseGroups[w.name] = w.warehouse_group || 'Без группы'; });

        const groupedExpense = {};
        const expenseByProduct = {};
        expense.forEach(e => {
            const wh = e.warehouse || 'Без склада';
            const prod = e.product || 'Без товара';
            const tons = parseFloat(e.tons) || (parseFloat(e.quantity)||0)/20;
            const group = warehouseGroups[wh] || 'Без группы';
            if (!groupedExpense[group]) groupedExpense[group] = {};
            groupedExpense[group][prod] = (groupedExpense[group][prod]||0) + tons;
            expenseByProduct[prod] = (expenseByProduct[prod]||0) + tons;
        });

        let msg = `📤 *РАСХОД ТОВАРОВ*\n📅 ${formattedDate}\n${'═'.repeat(25)}\n\n`;
        let grandTotal = 0;

        Object.entries(groupedExpense).sort().forEach(([group, products]) => {
            msg += `📁 *${escMd(group)}*\n${'─'.repeat(20)}\n`;
            Object.entries(products).sort().forEach(([prod, tons]) => {
                if (tons > 0.01) { msg += `${escMd(prod)}\t${formatNumber(tons)} т/н\n`; grandTotal += tons; }
            });
            msg += '\n';
        });

        msg += `${'═'.repeat(25)}\n💰 *Всего: ${formatNumber(grandTotal)} т*\n\n`;

        if (Object.keys(expenseByProduct).length) {
            msg += `📦 *ИТОГО ПО ТОВАРАМ:*\n${'─'.repeat(20)}\n`;
            Object.entries(expenseByProduct).sort().forEach(([prod, tons]) => {
                if (tons > 0.01) msg += `${escMd(prod)}\t${formatNumber(tons)} т/н\n`;
            });
            msg += '\n';
        }

        msg += `${'═'.repeat(25)}\n📊 Выберите отчет:`;

        sessions[userId].todayExpenseData = { groupedExpense, expenseByProduct, formattedDate, daysAgo };
        saveSessions();

        const kb = Markup.inlineKeyboard([
            [Markup.button.callback('📊 Общий отчет', 'expense_total')],
            [Markup.button.callback('📅 Вчера', 'expday2_1'), Markup.button.callback('📅 Позавчера', 'expday2_2')],
            [Markup.button.callback('🔄 Обновить', 'expense_refresh')]
        ]);
        await sendLong(ctx, msg, kb);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
};

bot.action(/^expday2_(\d)$/, async (ctx) => {
    const userId = ctx.from.id;
    const days = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    await showExpenseDay(ctx, userId, days);
});

bot.action('expense_total', async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    if (!s.todayExpenseData) return ctx.answerCbQuery('❌ Данные устарели, обновите отчет');
    await ctx.answerCbQuery('📊 Общий отчет');
    const { expenseByProduct, formattedDate } = s.todayExpenseData;
    let msg = `📤 *РАСХОД ТОВАРОВ*\n📅 ${formattedDate}\n📊 *ОБЩИЙ ОТЧЕТ*\n${'═'.repeat(25)}\n\n`;
    let grandTotal = 0;
    Object.entries(expenseByProduct).sort().forEach(([prod, tons]) => {
        if (tons > 0.01) { msg += `${escMd(prod)}\t${formatNumber(tons)} т/н\n`; grandTotal += tons; }
    });
    msg += `\n${'═'.repeat(25)}\n💰 *Всего: ${formatNumber(grandTotal)} т*`;
    await sendLong(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'expense_back')]]));
});

bot.action('expense_back', async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    await ctx.answerCbQuery('🔄');
    await showExpenseDay(ctx, userId, s.todayExpenseData?.daysAgo || 0);
});

bot.action('expense_refresh', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCbQuery('🔄 Обновление...');
    await showExpenseDay(ctx, userId, 0);
});

// ─── Обработка ввода даты ─────────────────────────────────────────────────────
bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const s = getSession(userId);
    if (s.waitingForDailyDate) {
        sessions[userId] = { ...s, waitingForDailyDate:false };
        saveSessions();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return ctx.reply('❌ Неверный формат. Используйте ГГГГ-ММ-ДД');
        return showDailyReport(ctx, userId, text);
    }
    return next();
});

// ─── Приход за период ─────────────────────────────────────────────────────────
bot.hears(/📈|приход за период/i, async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const income = data.income||[];
        const byMonth = {};
        income.forEach(i => {
            const m = (i.date||'').substring(0,7);
            if (!byMonth[m]) byMonth[m] = { count:0, tons:0 };
            byMonth[m].count++; byMonth[m].tons += (parseFloat(i.qty_fact)||0)/20;
        });
        let msg = `📈 *ПРИХОД ЗА ${year}*\n${'─'.repeat(20)}\n\n`;
        let tTons=0, tCount=0;
        Object.entries(byMonth).sort().forEach(([m,d]) => {
            msg += `📅 *${m}*: ${d.count} записей, ${formatNumber(d.tons)} т\n`;
            tTons += d.tons; tCount += d.count;
        });
        msg += `\n${'─'.repeat(20)}\n📊 Всего: *${tCount}* записей\n📦 Итого: *${formatNumber(tTons)} тонн*`;
        await sendLong(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback('📋 Детальный за период', 'income_detail_menu')]]));
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('income_detail_menu', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply('📋 *Детальный приход — выберите период:*', { parse_mode:'Markdown', ...periodButtons('incdet') });
});

bot.action(/^incdet_(today|yesterday|week|month|year)$/, async (ctx) => {
    const userId = ctx.from.id;
    const pType = ctx.match[1];
    await ctx.answerCbQuery('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const filtered = filterByPeriod(data.income||[], 'date', pType);
        if (!filtered.length) return ctx.reply(`📈 Прихода за период "${periodName(pType)}" нет.`);
        const tTons = filtered.reduce((s,i) => s + (parseFloat(i.qty_fact)||0)/20, 0);
        let msg = `📈 *ПРИХОД — ${periodName(pType)}*\n${'─'.repeat(20)}\n\n`;
        filtered.forEach(i => {
            msg += `📅 ${i.date} | 🚂 ${escMd(i.wagon||'—')}\n   ${escMd(i.product)} | ${escMd(i.warehouse)}\n   Факт: ${formatNumber((parseFloat(i.qty_fact)||0)/20)} т\n\n`;
        });
        msg += `${'─'.repeat(20)}\n📊 Записей: *${filtered.length}*\n📦 Итого: *${formatNumber(tTons)} т*`;
        const exportBtn = Markup.inlineKeyboard([[Markup.button.callback('📊 Экспорт в Excel', `exincdet_${pType}`)]]);
        await sendLong(ctx, msg, exportBtn);
        sessions[userId].lastIncomeData = { pType, items: filtered };
        saveSessions();
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action(/^exincdet_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    await ctx.answerCbQuery('📊 Создание Excel...');
    const items = s.lastIncomeData?.items || [];
    if (!items.length) return ctx.reply('❌ Нет данных для экспорта');
    try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Приход');
        ws.columns = [
            {header:'Дата',key:'date',width:12},{header:'Вагон',key:'wagon',width:15},
            {header:'Товар',key:'product',width:20},{header:'Склад',key:'warehouse',width:15},
            {header:'Фирма',key:'company',width:15},{header:'Кол-во (мешки)',key:'qty_fact',width:15},
            {header:'Тонны',key:'tons',width:10}
        ];
        ws.getRow(1).font = { bold:true };
        items.forEach(i => ws.addRow({ date:i.date, wagon:i.wagon||'', product:i.product||'', warehouse:i.warehouse||'', company:i.company||'', qty_fact:parseFloat(i.qty_fact)||0, tons:formatNumber((parseFloat(i.qty_fact)||0)/20) }));
        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `prikhod_${s.lastIncomeData?.pType||'export'}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Расход за период ─────────────────────────────────────────────────────────
bot.hears(/📉|расход за период/i, async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const expense = data.expense||[];
        const byMonth = {};
        expense.forEach(e => {
            const m = (e.date||'').substring(0,7);
            if (!byMonth[m]) byMonth[m] = { count:0, tons:0, sum:0 };
            byMonth[m].count++; byMonth[m].tons += parseFloat(e.tons)||0; byMonth[m].sum += parseFloat(e.total)||0;
        });
        let msg = `📉 *РАСХОД ЗА ${year}*\n${'─'.repeat(20)}\n\n`;
        let tTons=0, tSum=0, tCount=0;
        Object.entries(byMonth).sort().forEach(([m,d]) => {
            msg += `📅 *${m}*: ${d.count} зап., ${formatNumber(d.tons)} т, ${formatNumber(d.sum)} $\n`;
            tTons += d.tons; tSum += d.sum; tCount += d.count;
        });
        msg += `\n${'─'.repeat(20)}\n📊 Всего: *${tCount}* записей\n📦 Тоннаж: *${formatNumber(tTons)} т*\n💵 Сумма: *${formatNumber(tSum)} $*`;
        await sendLong(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback('📋 Детальный за период', 'expense_detail_menu')]]));
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('expense_detail_menu', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply('📋 *Детальный расход — выберите период:*', { parse_mode:'Markdown', ...periodButtons('expdet') });
});

bot.action(/^expdet_(today|yesterday|week|month|year)$/, async (ctx) => {
    const userId = ctx.from.id;
    const pType = ctx.match[1];
    await ctx.answerCbQuery('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const filtered = filterByPeriod(data.expense||[], 'date', pType);
        if (!filtered.length) return ctx.reply(`📉 Расходов за период "${periodName(pType)}" нет.`);
        const tTons = filtered.reduce((s,e) => s + (parseFloat(e.tons)||0), 0);
        const tSum  = filtered.reduce((s,e) => s + (parseFloat(e.total)||0), 0);
        let msg = `📉 *РАСХОД — ${periodName(pType)}*\n${'─'.repeat(20)}\n\n`;
        filtered.forEach(e => {
            msg += `📅 ${e.date} | 👤 *${escMd(e.client||'—')}*\n   ${escMd(e.product)} | ${escMd(e.warehouse)}\n   ${formatNumber(e.tons)} т × ${formatNumber(e.price)} $ = *${formatNumber(e.total)} $*\n\n`;
        });
        msg += `${'─'.repeat(20)}\n📊 Записей: *${filtered.length}*\n📦 Тоннаж: *${formatNumber(tTons)} т*\n💵 *Сумма: ${formatNumber(tSum)} $*`;
        const exportBtn = Markup.inlineKeyboard([[Markup.button.callback('📊 Экспорт в Excel', `exexpdet_${pType}`)]]);
        await sendLong(ctx, msg, exportBtn);
        sessions[userId].lastExpenseData = { pType, items: filtered };
        saveSessions();
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action(/^exexpdet_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    await ctx.answerCbQuery('📊 Создание Excel...');
    const items = s.lastExpenseData?.items || [];
    if (!items.length) return ctx.reply('❌ Нет данных для экспорта');
    try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Расход');
        ws.columns = [
            {header:'Дата',key:'date',width:12},{header:'Клиент',key:'client',width:20},
            {header:'Товар',key:'product',width:20},{header:'Склад',key:'warehouse',width:15},
            {header:'Тонны',key:'tons',width:10},{header:'Цена',key:'price',width:10},{header:'Сумма ($)',key:'total',width:12}
        ];
        ws.getRow(1).font = { bold:true };
        items.forEach(e => ws.addRow({ date:e.date, client:e.client||'', product:e.product||'', warehouse:e.warehouse||'', tons:parseFloat(e.tons)||0, price:parseFloat(e.price)||0, total:parseFloat(e.total)||0 }));
        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `rashod_${s.lastExpenseData?.pType||'export'}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Погашения за период ──────────────────────────────────────────────────────
bot.hears(/💵|погашения за период/i, async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const payments = data.payments||[];
        const byMonth = {};
        payments.forEach(p => {
            const m = (p.date||'').substring(0,7);
            if (!byMonth[m]) byMonth[m] = { count:0, sum:0 };
            byMonth[m].count++; byMonth[m].sum += parseFloat(p.amount)||0;
        });
        let msg = `💵 *ПОГАШЕНИЯ ЗА ${year}*\n${'─'.repeat(20)}\n\n`;
        let tSum=0, tCount=0;
        Object.entries(byMonth).sort().forEach(([m,d]) => {
            msg += `📅 *${m}*: ${d.count} записей, ${formatNumber(d.sum)} $\n`;
            tSum += d.sum; tCount += d.count;
        });
        msg += `\n${'─'.repeat(20)}\n📊 Всего: *${tCount}* записей\n💵 Итого: *${formatNumber(tSum)} $*`;
        await sendLong(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback('📋 Детальные за период', 'payments_detail_menu')]]));
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('payments_detail_menu', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply('📋 *Детальные погашения — выберите период:*', { parse_mode:'Markdown', ...periodButtons('paydet') });
});

bot.action(/^paydet_(today|yesterday|week|month|year)$/, async (ctx) => {
    const userId = ctx.from.id;
    const pType = ctx.match[1];
    await ctx.answerCbQuery('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const filtered = filterByPeriod(data.payments||[], 'date', pType);
        if (!filtered.length) return ctx.reply(`💵 Погашений за период "${periodName(pType)}" нет.`);
        const tSum = filtered.reduce((s,p) => s + (parseFloat(p.amount)||0), 0);
        let msg = `💵 *ПОГАШЕНИЯ — ${periodName(pType)}*\n${'─'.repeat(20)}\n\n`;
        filtered.forEach(p => {
            msg += `📅 ${p.date} | 👤 *${escMd(p.client||'—')}*\n   Сумма: *${formatNumber(p.amount)} $*\n\n`;
        });
        msg += `${'─'.repeat(20)}\n📊 Записей: *${filtered.length}*\n💵 *Итого: ${formatNumber(tSum)} $*`;
        const exportBtn = Markup.inlineKeyboard([[Markup.button.callback('📊 Экспорт в Excel', `expaydet_${pType}`)]]);
        await sendLong(ctx, msg, exportBtn);
        sessions[userId].lastPaymentsData = { pType, items: filtered };
        saveSessions();
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action(/^expaydet_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    await ctx.answerCbQuery('📊 Создание Excel...');
    const items = s.lastPaymentsData?.items || [];
    if (!items.length) return ctx.reply('❌ Нет данных для экспорта');
    try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Погашения');
        ws.columns = [
            {header:'Дата',key:'date',width:12},{header:'Клиент',key:'client',width:25},
            {header:'Сумма ($)',key:'amount',width:15},{header:'Примечание',key:'notes',width:30}
        ];
        ws.getRow(1).font = { bold:true };
        items.forEach(p => ws.addRow({ date:p.date, client:p.client||'', amount:parseFloat(p.amount)||0, notes:p.notes||'' }));
        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `pogasheniya_${s.lastPaymentsData?.pType||'export'}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Уведомления о долгах ────────────────────────────────────────────────────
bot.hears(/🔔|уведомления о долгах/i, async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    ctx.reply(
        `🔔 *УВЕДОМЛЕНИЯ О ДОЛГАХ*\n📅 Год: *${year}*\n\nВыберите период:\n_Показать клиентов с долгами, которые покупали:_`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
            [Markup.button.callback('📅 7 дней назад', 'notify_7')],
            [Markup.button.callback('📅 14 дней назад', 'notify_14')],
            [Markup.button.callback('📅 30 дней назад', 'notify_30')]
        ])}
    );
});

bot.action(/^notify_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    const daysAgo = parseInt(ctx.match[1]);
    await ctx.answerCbQuery('⏳ Поиск должников...');
    try {
        const data = await getData(userId);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);
        const targetDateStr = targetDate.toISOString().split('T')[0];
        const formattedDate = targetDate.toLocaleDateString('ru-RU');

        // Долги
        const debts = calcDebts(data);

        // Клиенты, которые покупали в тот день и имеют долг
        const debtorsWithPurchases = [];
        Object.entries(debts).forEach(([client, d]) => {
            const purchases = (data.expense||[]).filter(e => e.client === client && e.date === targetDateStr);
            if (purchases.length > 0) {
                const totalPurchaseAmount = purchases.reduce((s,p) => s + (parseFloat(p.total)||0), 0);
                debtorsWithPurchases.push({ client, debt: d.debt, purchases, totalPurchaseAmount });
            }
        });

        if (!debtorsWithPurchases.length) return ctx.reply(`✅ Нет должников, которые покупали ${daysAgo} дней назад`);

        let msg = `🔔 *УВЕДОМЛЕНИЯ О ДОЛГАХ*\n`;
        msg += `📅 Клиенты, которые покупали ${formattedDate} (${daysAgo} дней назад)\n`;
        msg += `${'═'.repeat(30)}\n\n`;
        let totalDebt = 0, totalNotificationAmount = 0;
        debtorsWithPurchases.forEach((debtor, i) => {
            msg += `${i+1}. 👤 *${escMd(debtor.client)}*\n`;
            msg += `   💳 Общий долг: *${formatNumber(debtor.debt)} $*\n`;
            msg += `   📦 Покупки ${formattedDate}:\n`;
            debtor.purchases.forEach(p => {
                msg += `      • ${escMd(p.product||'—')} - ${formatNumber(p.tons)} т (${formatNumber(p.total)} $)\n`;
            });
            msg += `   💰 Сумма покупок в тот день: *${formatNumber(debtor.totalPurchaseAmount)} $*\n\n`;
            totalDebt += debtor.debt;
            totalNotificationAmount += debtor.totalPurchaseAmount;
        });
        msg += `${'═'.repeat(30)}\n📊 *ИТОГО:*\n`;
        msg += `   👥 Должников: *${debtorsWithPurchases.length}*\n`;
        msg += `   💳 Общий долг: *${formatNumber(totalDebt)} $*\n`;
        msg += `   💰 Сумма покупок ${formattedDate}: *${formatNumber(totalNotificationAmount)} $*\n\n`;
        msg += `⚠️ _Рекомендуется связаться с этими клиентами для напоминания о долге_`;

        sessions[userId].lastDebtNotifications = { debtorsWithPurchases, daysAgo, formattedDate, year, totalDebt, totalNotificationAmount };
        saveSessions();

        const exportBtn = Markup.inlineKeyboard([[Markup.button.callback('📊 Экспорт в Excel', `exnotify_${daysAgo}`)]]);
        await sendLong(ctx, msg, exportBtn);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action(/^exnotify_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    if (!s.lastDebtNotifications) return ctx.answerCbQuery('❌ Сначала сформируйте отчёт');
    await ctx.answerCbQuery('📊 Создание Excel...');
    const { debtorsWithPurchases, daysAgo, formattedDate, year, totalDebt, totalNotificationAmount } = s.lastDebtNotifications;
    try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Уведомления о долгах');
        ws.columns = [
            {header:'№',key:'num',width:5},{header:'Клиент',key:'client',width:25},
            {header:'Общий долг ($)',key:'totalDebt',width:15},{header:'Покупки в тот день ($)',key:'dayPurchases',width:20},
            {header:'Товары',key:'products',width:30},{header:'Склады',key:'warehouses',width:20}
        ];
        ws.getRow(1).font = { bold:true };
        debtorsWithPurchases.forEach((debtor, i) => {
            ws.addRow({
                num: i+1, client: debtor.client, totalDebt: debtor.debt,
                dayPurchases: debtor.totalPurchaseAmount,
                products: debtor.purchases.map(p => `${p.product||''} (${formatNumber(p.tons)} т)`).join(', '),
                warehouses: [...new Set(debtor.purchases.map(p => p.warehouse||''))].join(', ')
            });
        });
        ws.addRow({ num:'', client:'ИТОГО:', totalDebt, dayPurchases: totalNotificationAmount, products:'', warehouses:'' }).font = {bold:true};
        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `dolgi_${daysAgo}d_${year}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Топ должников ────────────────────────────────────────────────────────────
bot.hears(/👥|топ должников/i, async (ctx) => {
    const userId = ctx.from.id;
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const debts = calcDebts(data);
        const top = Object.entries(debts).sort((a,b) => b[1].debt - a[1].debt).slice(0,10);
        if (!top.length) return ctx.reply('✅ Должников нет!');
        let msg = `👥 *ТОП-10 ДОЛЖНИКОВ*\n📅 Год: *${getUserYear(userId)}*\n${'═'.repeat(25)}\n\n`;
        top.forEach(([c,d],i) => { msg += `${i+1}. *${escMd(c)}*\n   Долг: *${formatNumber(d.debt)} $*\n\n`; });
        await sendMd(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Итоги вагонов ────────────────────────────────────────────────────────────
bot.hears(/🚂|итоги вагонов/i, async (ctx) => {
    const userId = ctx.from.id;
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const { items, totals } = calcWagonTotals(data);
        if (!items.length) return ctx.reply('🚂 Данных нет.');
        let msg = `🚂 *ИТОГИ ВАГОНОВ*\n📅 Год: *${getUserYear(userId)}*\n${'═'.repeat(25)}\n\n`;
        items.forEach(i => {
            msg += `📦 *${escMd(i.product)}* | ${escMd(i.company)} | ${escMd(i.warehouse)}\n`;
            msg += `   Вагонов: ${i.wagons} | Факт: ${formatNumber(i.qtyFact/20)} т\n\n`;
        });
        msg += `${'═'.repeat(25)}\n📊 *Итого:*\n   Вагонов: *${totals.wagons}*\n   По документу: *${formatNumber(totals.qtyDoc/20)} т*\n   Фактически: *${formatNumber(totals.qtyFact/20)} т*\n   Разница: *${formatNumber(totals.difference/20)} т*`;
        await sendLong(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Отчёт по товарам (тонны / сумма / средняя цена) ─────────────────────────
bot.hears(/📊 Отчёт по товарам/i, async (ctx) => {
    const userId = ctx.from.id;
    await ctx.reply('⏳ Загрузка товаров...');
    try {
        const data = await getDataAll(userId);
        // Собираем уникальные товары из расхода
        const productSet = new Set();
        (data.expense||[]).forEach(e => { if (e.product) productSet.add(e.product); });
        const products = [...productSet].sort();
        if (!products.length) return ctx.reply('❌ Нет данных о товарах');

        sessions[userId].productReportList = products;
        sessions[userId].productReportSelected = []; // выбранные товары
        saveSessions();

        await showProductSelectMenu(ctx, userId);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

const showProductSelectMenu = async (ctx, userId, edit = false) => {
    const s = getSession(userId);
    const products = s.productReportList || [];
    const selected = s.productReportSelected || [];

    const buttons = products.map((p, i) => {
        const isSelected = selected.includes(i);
        const label = `${isSelected ? '✅' : '☐'} ${p.length > 22 ? p.substring(0,20)+'…' : p}`;
        return [Markup.button.callback(label, `prsel_${i}`)];
    });

    // Кнопки управления
    const ctrl = [];
    if (selected.length > 0) ctrl.push(Markup.button.callback(`📊 Показать (${selected.length})`, 'prsel_show'));
    ctrl.push(Markup.button.callback('✅ Все товары', 'prsel_all'));
    if (selected.length > 0) ctrl.push(Markup.button.callback('🗑 Сбросить', 'prsel_clear'));
    buttons.push(ctrl);

    const text = `📊 *ОТЧЁТ ПО ТОВАРАМ*\n📅 Год: *${getUserYear(userId)}*\n\nВыберите товары (отмечено: ${selected.length}):`;
    const opts = { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) };
    if (edit) await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
    else await ctx.reply(text, opts);
};

bot.action(/^prsel_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const idx = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    const s = getSession(userId);
    const selected = s.productReportSelected || [];
    const pos = selected.indexOf(idx);
    if (pos === -1) selected.push(idx);
    else selected.splice(pos, 1);
    sessions[userId].productReportSelected = selected;
    saveSessions();
    await showProductSelectMenu(ctx, userId, true);
});

bot.action('prsel_all', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCbQuery();
    const s = getSession(userId);
    const all = (s.productReportList||[]).map((_,i) => i);
    sessions[userId].productReportSelected = all;
    saveSessions();
    await showProductReportResult(ctx, userId);
});

bot.action('prsel_clear', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCbQuery('Сброшено');
    sessions[userId].productReportSelected = [];
    saveSessions();
    await showProductSelectMenu(ctx, userId, true);
});

bot.action('prsel_show', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCbQuery('⏳ Формирование...');
    await showProductReportResult(ctx, userId);
});

const showProductReportResult = async (ctx, userId) => {
    const s = getSession(userId);
    const products = s.productReportList || [];
    const selected = s.productReportSelected || [];
    const year = getUserYear(userId);

    const chosenProducts = selected.length > 0
        ? selected.map(i => products[i]).filter(Boolean)
        : products;

    if (!chosenProducts.length) return ctx.reply('❌ Не выбрано ни одного товара');

    try {
        const data = await getDataAll(userId);
        const expense = data.expense || [];

        // Считаем по каждому товару
        const stats = {};
        chosenProducts.forEach(p => { stats[p] = { tons: 0, sum: 0 }; });

        expense.forEach(e => {
            if (!chosenProducts.includes(e.product)) return;
            stats[e.product].tons += parseFloat(e.tons) || 0;
            stats[e.product].sum  += parseFloat(e.total) || 0;
        });

        let msg = `📊 *ОТЧЁТ ПО ТОВАРАМ*\n📅 Год: *${year}*\n${'═'.repeat(30)}\n\n`;
        msg += `*Товар*\n${'─'.repeat(30)}\n`;

        let grandTons = 0, grandSum = 0;

        chosenProducts.forEach(p => {
            const d = stats[p];
            const avgPrice = d.tons > 0 ? d.sum / d.tons : 0;
            msg += `📦 *${escMd(p)}*\n`;
            msg += `   Тонны: *${formatNumber(d.tons)}*\n`;
            msg += `   Сумма: *${formatNumber(d.sum)} $*\n`;
            msg += `   Ср. цена: *${formatNumber(avgPrice)} $*\n\n`;
            grandTons += d.tons;
            grandSum  += d.sum;
        });

        const grandAvg = grandTons > 0 ? grandSum / grandTons : 0;
        msg += `${'═'.repeat(30)}\n📊 *ИТОГО:*\n`;
        msg += `   Тонны: *${formatNumber(grandTons)}*\n`;
        msg += `   Сумма: *${formatNumber(grandSum)} $*\n`;
        msg += `   Ср. цена: *${formatNumber(grandAvg)} $*`;

        // Сохраняем для Excel
        sessions[userId].lastProductReport = { chosenProducts, stats, grandTons, grandSum, grandAvg, year };
        saveSessions();

        const kb = Markup.inlineKeyboard([
            [Markup.button.callback('📊 Экспорт в Excel', 'exprod_excel')],
            [Markup.button.callback('🔙 Изменить выбор', 'exprod_back')]
        ]);
        await sendLong(ctx, msg, kb);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
};

bot.action('exprod_back', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCbQuery();
    await showProductSelectMenu(ctx, userId);
});

bot.action('exprod_excel', async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    if (!s.lastProductReport) return ctx.answerCbQuery('❌ Сначала сформируйте отчёт');
    await ctx.answerCbQuery('📊 Создание Excel...');
    const { chosenProducts, stats, grandTons, grandSum, grandAvg, year } = s.lastProductReport;
    try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Отчёт по товарам');
        ws.columns = [
            { header: 'Товар',       key: 'product',   width: 30 },
            { header: 'Тонны',       key: 'tons',      width: 15 },
            { header: 'Сумма ($)',   key: 'sum',       width: 18 },
            { header: 'Средняя цена ($)', key: 'avg',  width: 20 }
        ];
        ws.getRow(1).font = { bold: true };

        chosenProducts.forEach(p => {
            const d = stats[p];
            const avg = d.tons > 0 ? d.sum / d.tons : 0;
            ws.addRow({ product: p, tons: d.tons, sum: d.sum, avg });
        });

        // Итоговая строка
        const tr = ws.addRow({ product: 'ИТОГО', tons: grandTons, sum: grandSum, avg: grandAvg });
        tr.font = { bold: true };

        // Форматирование числовых колонок
        ['tons','sum','avg'].forEach(key => {
            ws.getColumn(key).numFmt = '#,##0.00';
        });

        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `tovary_${year}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Карточка клиента (выбор из списка как в старом боте) ─────────────────────
const CL_PAGE_SIZE = 50;

const sendClientPage = async (ctx, userId, page, edit = false) => {
    const s = getSession(userId);
    const clientNames = s.clientsList || [];
    const year = getUserYear(userId);
    const total = clientNames.length;
    const totalPages = Math.ceil(total / CL_PAGE_SIZE);
    const start = page * CL_PAGE_SIZE;
    const chunk = clientNames.slice(start, start + CL_PAGE_SIZE);

    const buttons = chunk.map((c, i) => {
        const short = c.length > 25 ? c.substring(0,22)+'...' : c;
        return [Markup.button.callback(`👤 ${short}`, `cl_${start + i}`)];
    });

    if (totalPages > 1) {
        const nav = [];
        if (page > 0) nav.push(Markup.button.callback(`◀️ ${page}/${totalPages}`, `cl_page_${page-1}`));
        if (page < totalPages - 1) nav.push(Markup.button.callback(`${page+2}/${totalPages} ▶️`, `cl_page_${page+1}`));
        if (nav.length) buttons.push(nav);
    }

    const text = `👤 *КАРТОЧКА КЛИЕНТА*\n📅 Год: *${year}*\n\nВыберите клиента (${start+1}–${Math.min(start+CL_PAGE_SIZE, total)} из ${total}):`;
    const opts = { parse_mode:'Markdown', ...Markup.inlineKeyboard(buttons) };
    if (edit) await ctx.editMessageText(text, opts);
    else await ctx.reply(text, opts);
};

bot.hears(/👤|карточка клиента/i, async (ctx) => {
    const userId = ctx.from.id;
    await ctx.reply('⏳ Загрузка списка клиентов...');
    try {
        const data = await getData(userId);

        let clientNames = (data.clients||[])
            .filter(c => c && !c.is_deleted)
            .map(c => typeof c === 'string' ? c : c.name)
            .filter(Boolean);

        (data.expense||[]).forEach(e => {
            if (e.client && !clientNames.includes(e.client)) clientNames.push(e.client);
        });

        clientNames = [...new Set(clientNames)].sort();
        if (!clientNames.length) return ctx.reply('👤 Нет клиентов в базе');

        sessions[userId].clientsList = clientNames;
        saveSessions();
        await sendClientPage(ctx, userId, 0);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action(/^cl_page_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    await sendClientPage(ctx, userId, page, true);
});

bot.action(/^cl_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const year = getUserYear(userId);
    const idx = parseInt(ctx.match[1]);
    const s = getSession(userId);
    const clientName = s.clientsList?.[idx];
    if (!clientName) return ctx.answerCbQuery('❌ Клиент не найден');
    await ctx.answerCbQuery('⏳ Загрузка карточки...');
    try {
        const data = await getData(userId);
        const card = calcClientCard(data, clientName);

        let msg = `👤 *КАРТОЧКА КЛИЕНТА*\n`;
        msg += `📋 *${escMd(clientName)}*\n`;
        msg += `📅 Год: *${year}*\n`;
        msg += `${'─'.repeat(25)}\n\n`;
        msg += `📊 *СВОДКА:*\n`;
        msg += `📦 Куплено: *${formatNumber(card.totalTons)} т*\n`;
        msg += `💵 Сумма покупок: *${formatNumber(card.totalSum)} $*\n`;
        msg += `✅ Оплачено: *${formatNumber(card.totalPaid)} $*\n`;
        msg += `💳 Остаток долга: *${formatNumber(card.debt)} $*\n\n`;

        if (card.purchases.length) {
            msg += `${'─'.repeat(25)}\n📉 *ПОСЛЕДНИЕ ПОКУПКИ (до 10):*\n\n`;
            card.purchases.slice(0,10).forEach((p,i) => {
                msg += `${i+1}. ${p.date}\n   ${escMd(p.product)} - ${formatNumber(p.tons)} т\n   💵 ${formatNumber(p.total)} $\n\n`;
            });
        }
        if (card.payments.length) {
            msg += `${'─'.repeat(25)}\n💵 *ПОСЛЕДНИЕ ПЛАТЕЖИ (до 10):*\n\n`;
            card.payments.slice(0,10).forEach((p,i) => { msg += `${i+1}. ${p.date} - *${formatNumber(p.amount)} $*\n`; });
        }

        sessions[userId].lastClientCard = { clientName, card, year };
        saveSessions();
        const exportBtn = Markup.inlineKeyboard([[Markup.button.callback('📊 Экспорт в Excel', `excl_${idx}`)]]);
        await sendLong(ctx, msg, exportBtn);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action(/^excl_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    if (!s.lastClientCard) return ctx.answerCbQuery('❌ Сначала выберите клиента');
    await ctx.answerCbQuery('📊 Создание Excel файла...');
    const { clientName, card, year } = s.lastClientCard;
    try {
        const wb = new ExcelJS.Workbook();
        // Лист 1: Сводка
        const ws1 = wb.addWorksheet('Сводка');
        ws1.columns = [{header:'Параметр',key:'param',width:25},{header:'Значение',key:'value',width:20}];
        ws1.addRow({param:'КАРТОЧКА КЛИЕНТА',value:''});
        ws1.addRow({param:'Клиент',value:clientName});
        ws1.addRow({param:'Год',value:year});
        ws1.addRow({param:'',value:''});
        ws1.addRow({param:'Куплено (тонн)',value:card.totalTons});
        ws1.addRow({param:'Сумма покупок ($)',value:card.totalSum});
        ws1.addRow({param:'Оплачено ($)',value:card.totalPaid});
        ws1.addRow({param:'Остаток долга ($)',value:card.debt});
        ws1.getRow(1).font = {bold:true,size:14};
        // Лист 2: Покупки
        const ws2 = wb.addWorksheet('Покупки');
        ws2.columns = [
            {header:'№',key:'num',width:5},{header:'Дата',key:'date',width:12},
            {header:'Склад',key:'warehouse',width:15},{header:'Товар',key:'product',width:20},
            {header:'Тонны',key:'tons',width:10},{header:'Цена',key:'price',width:10},{header:'Сумма ($)',key:'total',width:12}
        ];
        ws2.getRow(1).font = {bold:true};
        card.purchases.forEach((p,i) => ws2.addRow({num:i+1,date:p.date,warehouse:p.warehouse,product:p.product,tons:p.tons,price:p.price,total:p.total}));
        // Лист 3: Платежи
        const ws3 = wb.addWorksheet('Платежи');
        ws3.columns = [
            {header:'№',key:'num',width:5},{header:'Дата',key:'date',width:12},
            {header:'Сумма ($)',key:'amount',width:15},{header:'Примечание',key:'note',width:30}
        ];
        ws3.getRow(1).font = {bold:true};
        card.payments.forEach((p,i) => ws3.addRow({num:i+1,date:p.date,amount:p.amount,note:p.note||''}));
        const buf = await wb.xlsx.writeBuffer();
        await ctx.replyWithDocument({ source: Buffer.from(buf), filename: `klient_${clientName.replace(/[^a-zA-Zа-яА-Я0-9]/g,'_')}.xlsx` });
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Управление (только admin) ────────────────────────────────────────────────
bot.hears(/⚙️|управление/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён! Только для администраторов.');
    ctx.reply('⚙️ *УПРАВЛЕНИЕ*\n\nВыберите раздел:', { parse_mode:'Markdown', ...managementKeyboard });
});

bot.hears(/👥 Пользователи/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён!');
    await ctx.reply('⏳ Загрузка...');
    try {
        const { token } = getSession(userId);
        const users = await apiGet('/api/users', token);
        let msg = `👥 *ПОЛЬЗОВАТЕЛИ*\n${'═'.repeat(25)}\n\n`;
        users.forEach((u,i) => {
            const status = u.is_blocked ? '🔒' : '✅';
            msg += `${i+1}. ${status} *${escMd(u.username)}*\n   ${getRoleText(u.role)}\n`;
            let wg = u.warehouse_group;
            if (typeof wg === 'string') { try { wg = JSON.parse(wg); } catch {} }
            if (Array.isArray(wg) && wg.length && wg[0]) msg += `   🏪 Группы: ${wg.join(', ')}\n`;
            msg += '\n';
        });
        msg += `${'═'.repeat(25)}\n📊 Всего: *${users.length}* пользователей`;
        await sendLong(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.hears(/📦 Товары/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён!');
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const products = data.products||[];
        let msg = `📦 *ТОВАРЫ*\n${'═'.repeat(25)}\n\n`;
        if (!products.length) msg += '_Список пуст_\n';
        else products.forEach((p,i) => { msg += `${i+1}. ${escMd(p.name)}\n`; });
        msg += `\n${'═'.repeat(25)}\n📊 Всего: *${products.length}* товаров`;
        await sendLong(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback('➕ Добавить товар','add_product')]]));
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('add_product', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.answerCbQuery('⛔ Доступ запрещён!');
    await ctx.answerCbQuery();
    sessions[userId].waitingForNewProduct = true; saveSessions();
    ctx.reply('📦 Введите название нового товара:', Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена','cancel_add')]]));
});

bot.hears(/🏢 Фирмы/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён!');
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const companies = data.companies||[];
        let msg = `🏢 *ФИРМЫ*\n${'═'.repeat(25)}\n\n`;
        if (!companies.length) msg += '_Список пуст_\n';
        else companies.forEach((c,i) => { msg += `${i+1}. ${escMd(c.name)}\n`; });
        msg += `\n${'═'.repeat(25)}\n📊 Всего: *${companies.length}* фирм`;
        await sendLong(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback('➕ Добавить фирму','add_company')]]));
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('add_company', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.answerCbQuery('⛔ Доступ запрещён!');
    await ctx.answerCbQuery();
    sessions[userId].waitingForNewCompany = true; saveSessions();
    ctx.reply('🏢 Введите название новой фирмы:', Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена','cancel_add')]]));
});

bot.hears(/🏪 Склады/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён!');
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const warehouses = data.warehouses||[];
        if (!warehouses.length) return ctx.reply('🏪 Список складов пуст');
        let msg = `🏪 *СКЛАДЫ*\n${'═'.repeat(25)}\n\n`;
        const byGroup = {};
        warehouses.forEach(w => { const g = w.warehouse_group||'Без группы'; if (!byGroup[g]) byGroup[g]=[]; byGroup[g].push(w.name); });
        Object.entries(byGroup).forEach(([g,whs]) => {
            msg += `📁 *${escMd(g)}*\n`;
            whs.forEach((w,i) => { msg += `   ${i+1}. ${escMd(w)}\n`; });
            msg += '\n';
        });
        msg += `${'═'.repeat(25)}\n📊 Всего: *${warehouses.length}* складов`;
        await sendLong(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.hears(/👤 Клиенты/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён!');
    await ctx.reply('⏳ Загрузка...');
    try {
        const data = await getData(userId);
        const clients = data.clients||[];
        let msg = `👤 *КЛИЕНТЫ*\n${'═'.repeat(25)}\n\n`;
        if (!clients.length) msg += '_Список пуст_\n';
        else clients.forEach((c,i) => { msg += `${i+1}. ${escMd(c.name)}${c.phone?` — ${escMd(c.phone)}`:''}\n`; });
        msg += `\n${'═'.repeat(25)}\n📊 Всего: *${clients.length}* клиентов`;
        await sendLong(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback('➕ Добавить клиента','add_client')]]));
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('add_client', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.answerCbQuery('⛔ Доступ запрещён!');
    await ctx.answerCbQuery();
    sessions[userId].waitingForNewClient = true; saveSessions();
    ctx.reply('👤 Введите имя нового клиента:', Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена','cancel_add')]]));
});

bot.action('cancel_add', async (ctx) => {
    const userId = ctx.from.id;
    sessions[userId].waitingForNewProduct = false;
    sessions[userId].waitingForNewCompany = false;
    sessions[userId].waitingForNewClient = false;
    saveSessions();
    await ctx.answerCbQuery('Отменено');
    ctx.reply('❌ Отменено', managementKeyboard);
});

bot.hears(/📅 Годы/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён!');
    await ctx.reply('⏳ Загрузка...');
    try {
        const { token } = getSession(userId);
        const result = await apiGet('/api/data/years/list', token);
        const years = result.years||[];
        if (!years.length) return ctx.reply('📅 Нет данных по годам');
        let msg = `📅 *ГОДЫ*\n${'═'.repeat(25)}\n\n`;
        years.forEach(y => { msg += `📅 *${y}*\n`; });
        msg += `\n${'═'.repeat(25)}\n📊 Всего: *${years.length}* годов`;
        await sendMd(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// Цены
bot.hears(/💰 Цены/i, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return ctx.reply('⛔ Доступ запрещён!');
    await ctx.reply('⏳ Загрузка...');
    try {
        const { token } = getSession(userId);
        const prices = await apiGet('/api/prices', token);
        const data = await getData(userId);
        sessions[userId].priceProducts = data.products||[];
        sessions[userId].priceWarehouses = data.warehouses||[];
        saveSessions();
        let msg = `💰 *УПРАВЛЕНИЕ ЦЕНАМИ*\n${'═'.repeat(25)}\n\n📅 *Актуальные цены:*\n${'─'.repeat(20)}\n\n`;
        const seen = new Set();
        prices.forEach(p => {
            if (seen.has(p.product_name)) return;
            seen.add(p.product_name);
            const g = p.warehouse_group==='ALL' ? '🌍 Все склады' : `🏪 ${p.warehouse_group}`;
            msg += `📦 *${escMd(p.product_name)}*\n   ${g}: *${formatNumber(p.price)} $* за тонну\n\n`;
        });
        if (!prices.length) msg += '_Цены не установлены_\n\n';
        msg += `${'═'.repeat(25)}\n💡 Для установки цены нажмите кнопку ниже`;
        await sendLong(ctx, msg, Markup.inlineKeyboard([
            [Markup.button.callback('➕ Установить цену','price_add')],
            [Markup.button.callback('📋 История цен','price_history')]
        ]));
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

bot.action('price_add', async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    await ctx.answerCbQuery();
    const products = s.priceProducts||[];
    if (!products.length) return ctx.reply('❌ Список товаров пуст');
    const buttons = products.slice(0,10).map((p,i) => [Markup.button.callback(`📦 ${p.name}`, `prprod_${i}`)]);
    buttons.push([Markup.button.callback('❌ Отмена','price_cancel')]);
    ctx.reply('📦 *Выберите товар:*', { parse_mode:'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action(/^prprod_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    const idx = parseInt(ctx.match[1]);
    await ctx.answerCbQuery('⏳ Загрузка...');
    const product = (s.priceProducts||[])[idx];
    if (!product) return ctx.reply('❌ Товар не найден');
    sessions[userId].selectedPriceProductId = product.id;
    sessions[userId].selectedPriceProduct = product.name;
    saveSessions();

    try {
        // Загружаем склады напрямую через API чтобы получить актуальные группы
        const { token } = getSession(userId);
        const dictData = await apiGet('/api/management/dictionaries', token);
        const warehouses = dictData.warehouses || [];
        const groups = [...new Set(warehouses.map(w => w.warehouse_group).filter(g => g))].sort();
        sessions[userId].priceGroups = groups;
        saveSessions();

        console.log(`💰 Группы складов для цен: ${JSON.stringify(groups)}`);

        const buttons = [[Markup.button.callback('🌍 Все склады (глобальная)', 'prgrp_ALL')]];
        groups.slice(0,8).forEach((g, i) => buttons.push([Markup.button.callback(`🏪 ${g}`, `prgrp_${i}`)]));
        buttons.push([Markup.button.callback('❌ Отмена','price_cancel')]);

        ctx.reply(`📦 Товар: *${escMd(product.name)}*\n\n🏪 *Выберите группу складов:*`,
            { parse_mode:'Markdown', ...Markup.inlineKeyboard(buttons) }
        );
    } catch (e) {
        // Fallback: берём из сохранённых складов
        const warehouses = s.priceWarehouses || [];
        const groups = [...new Set(warehouses.map(w => w.warehouse_group).filter(g => g))].sort();
        sessions[userId].priceGroups = groups;
        saveSessions();

        const buttons = [[Markup.button.callback('🌍 Все склады (глобальная)', 'prgrp_ALL')]];
        groups.slice(0,8).forEach((g, i) => buttons.push([Markup.button.callback(`🏪 ${g}`, `prgrp_${i}`)]));
        buttons.push([Markup.button.callback('❌ Отмена','price_cancel')]);

        ctx.reply(`📦 Товар: *${escMd(product.name)}*\n\n🏪 *Выберите группу складов:*`,
            { parse_mode:'Markdown', ...Markup.inlineKeyboard(buttons) }
        );
    }
});

bot.action(/^prgrp_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const s = getSession(userId);
    const param = ctx.match[1];
    await ctx.answerCbQuery();

    let group;
    if (param === 'ALL') {
        group = 'ALL';
    } else {
        const idx = parseInt(param);
        group = (s.priceGroups||[])[idx];
    }
    if (!group) return ctx.reply('❌ Группа не найдена');

    sessions[userId].selectedPriceGroup = group;
    sessions[userId].waitingForPrice = true;
    saveSessions();
    const gName = group === 'ALL' ? 'Все склады' : group;
    ctx.reply(`📦 Товар: *${escMd(s.selectedPriceProduct)}*\n🏪 Группа: *${escMd(gName)}*\n\n💰 *Введите цену за тонну (в $):*`,
        { parse_mode:'Markdown', ...Markup.removeKeyboard() }
    );
});

bot.action('price_cancel', async (ctx) => {
    const userId = ctx.from.id;
    sessions[userId].waitingForPrice = false;
    sessions[userId].selectedPriceProductId = null;
    sessions[userId].selectedPriceProduct = null;
    sessions[userId].selectedPriceGroup = null;
    saveSessions();
    await ctx.answerCbQuery('Отменено');
    ctx.reply('❌ Установка цены отменена', managementKeyboard);
});

bot.action('price_history', async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCbQuery('⏳ Загрузка...');
    try {
        const { token } = getSession(userId);
        const prices = await apiGet('/api/prices', token);
        if (!prices.length) return ctx.reply('📋 История цен пуста');
        let msg = `📋 *ИСТОРИЯ ЦЕН*\n${'═'.repeat(25)}\n\n`;
        prices.slice(0,20).forEach((p,i) => {
            msg += `${i+1}. *${(p.effective_date||'').substring(0,10)}*\n`;
            msg += `   📦 ${escMd(p.product_name)}\n`;
            msg += `   🏪 ${p.warehouse_group==='ALL'?'Все склады':escMd(p.warehouse_group)}\n`;
            msg += `   💰 *${formatNumber(p.price)} $* за тонну\n\n`;
        });
        if (prices.length > 20) msg += `_...и ещё ${prices.length-20} записей_`;
        await sendLong(ctx, msg);
    } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`); }
});

// ─── Text handler для управления ─────────────────────────────────────────────
bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const s = getSession(userId);

    if (s.waitingForNewProduct) {
        sessions[userId].waitingForNewProduct = false; saveSessions();
        if (text.startsWith('/') || text.startsWith('🔙')) return ctx.reply('❌ Отменено', managementKeyboard);
        try {
            const { token } = getSession(userId);
            await apiPost('/api/management/products', { name:text }, token);
            ctx.reply(`✅ Товар *${escMd(text)}* добавлен!`, { parse_mode:'Markdown', ...managementKeyboard });
        } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`, managementKeyboard); }
        return;
    }
    if (s.waitingForNewCompany) {
        sessions[userId].waitingForNewCompany = false; saveSessions();
        if (text.startsWith('/') || text.startsWith('🔙')) return ctx.reply('❌ Отменено', managementKeyboard);
        try {
            const { token } = getSession(userId);
            await apiPost('/api/management/companies', { name:text }, token);
            ctx.reply(`✅ Фирма *${escMd(text)}* добавлена!`, { parse_mode:'Markdown', ...managementKeyboard });
        } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`, managementKeyboard); }
        return;
    }
    if (s.waitingForNewClient) {
        sessions[userId].waitingForNewClient = false; saveSessions();
        if (text.startsWith('/') || text.startsWith('🔙')) return ctx.reply('❌ Отменено', managementKeyboard);
        try {
            const { token } = getSession(userId);
            await apiPost('/api/management/clients', { name:text, phone:null }, token);
            ctx.reply(`✅ Клиент *${escMd(text)}* добавлен!`, { parse_mode:'Markdown', ...managementKeyboard });
        } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`, managementKeyboard); }
        return;
    }
    if (s.waitingForPrice) {
        const price = parseFloat(text.replace(',','.'));
        if (isNaN(price) || price <= 0) return ctx.reply('❌ Введите корректную цену (число больше 0)');
        sessions[userId].waitingForPrice = false;
        const { selectedPriceProductId, selectedPriceProduct, selectedPriceGroup, token } = getSession(userId);
        sessions[userId].selectedPriceProductId = null;
        sessions[userId].selectedPriceProduct = null;
        sessions[userId].selectedPriceGroup = null;
        saveSessions();
        await ctx.reply('⏳ Сохранение цены...');
        try {
            await apiPost('/api/prices', {
                product_id: selectedPriceProductId,
                price: price,
                warehouse_group: selectedPriceGroup||'ALL',
                effective_date: new Date().toISOString().split('T')[0]
            }, token);
            const gName = selectedPriceGroup==='ALL' ? 'Все склады' : selectedPriceGroup;
            sendMd(ctx, `✅ *Цена установлена!*\n\n📦 Товар: *${escMd(selectedPriceProduct)}*\n🏪 Группа: *${escMd(gName)}*\n💰 Цена: *${formatNumber(price)} $* за тонну`, managementKeyboard);
        } catch (e) { ctx.reply(`❌ Ошибка: ${e.message}`, managementKeyboard); }
        return;
    }
    return next();
});

// ─── Запуск ───────────────────────────────────────────────────────────────────
console.log('🔄 Подключение к Telegram API...');

(async () => {
    try {
        // Инициализируем таблицу сессий и загружаем сессии из БД
        await initSessionsTable();
        await loadSessionsFromDB();

        const botInfo = await bot.telegram.getMe();
        console.log(`✅ Бот подключен: @${botInfo.username}`);
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        bot.launch().catch(err => console.error('❌ Ошибка polling:', err.message));
        console.log('✅ Бот запущен!');
        console.log(`📱 Найдите @${botInfo.username} в Telegram`);
    } catch (err) {
        console.error('❌ Ошибка:', err.message);
        process.exit(1);
    }
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
