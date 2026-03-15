/**
 * 🎯 ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ
 * Управление интерфейсом и навигацией
 */

// Глобальные переменные
let currentSection = 'dashboard';

// Возвращает сегодняшнюю дату в формате YYYY-MM-DD по локальному времени ПК
function localDateStr(d) {
    const dt = d || new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Обрезает дату из БД (может быть "2026-03-15T00:00:00.000Z") до "2026-03-15"
function toDateOnly(val) {
    if (!val) return '';
    return String(val).substring(0, 10);
}

// Форматирует дату в DD/MM/YYYY для отображения в HTML
function fmtDate(val) {
    if (!val) return '';
    const s = String(val).substring(0, 10); // "YYYY-MM-DD"
    if (s.length < 10) return s;
    return s.substring(8, 10) + '/' + s.substring(5, 7) + '/' + s.substring(0, 4);
}

// Конвертирует "YYYY-MM-DD" в Excel serial number
function dateToExcelSerial(isoStr) {
    if (!isoStr) return null;
    const s = String(isoStr).substring(0, 10);
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    const jsDate = new Date(y, m - 1, d);
    const excelEpoch = new Date(1899, 11, 30);
    return Math.round((jsDate - excelEpoch) / 86400000);
}

// Создаёт XLSX worksheet, колонка "Дата" как настоящая дата Excel с форматом DD/MM/YYYY
function jsonToSheetWithTextDate(dataArr) {
    if (!dataArr || dataArr.length === 0) return XLSX.utils.json_to_sheet([]);
    const keys = Object.keys(dataArr[0]);
    const rows = dataArr.map(obj => keys.map(k => obj[k]));
    const ws = XLSX.utils.aoa_to_sheet([keys, ...rows]);

    const dateColIdx = keys.indexOf('Дата');
    if (dateColIdx >= 0) {
        const colLetter = XLSX.utils.encode_col(dateColIdx);
        for (let r = 0; r < rows.length; r++) {
            const cellAddr = colLetter + (r + 2);
            // dataArr[r]['Дата'] is "DD/MM/YYYY" — parse back to ISO
            const raw = String(dataArr[r]['Дата'] || '');
            const parts = raw.split('/');
            if (parts.length === 3) {
                const serial = dateToExcelSerial(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (serial && ws[cellAddr]) {
                    ws[cellAddr] = { t: 'n', v: serial, z: 'DD/MM/YYYY' };
                }
            }
        }
    }
    return ws;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация приложения...');
    
    // Проверяем авторизацию
    if (!window.api.token) {
        showLoginScreen();
        return;
    }

    // Загружаем данные пользователя из токена
    try {
        const verify = await window.api.request('/auth/verify');
        if (verify && verify.user) {
            window.currentUser = verify.user;
        }
    } catch (e) {
        showLoginScreen();
        return;
    }
    
    // Проверяем статус сервера
    await checkServerStatus();
    
    // Инициализируем интерфейс
    initializeInterface();
    
    // Загружаем данные
    await loadInitialData();
    
    // Показываем главный интерфейс
    showMainInterface();

    // Проверяем новые цены (при автовходе по токену)
    setTimeout(() => checkAndShowPriceNotifications(), 1500);
});

// Проверка статуса сервера
async function checkServerStatus() {
    const statusText = document.getElementById('serverStatusText');
    const serverStatus = document.getElementById('serverStatus');
    
    try {
        const response = await fetch(`${window.api.baseURL}/health`);
        if (response.ok) {
            if (statusText) statusText.textContent = '✅ Онлайн';
            if (serverStatus) serverStatus.classList.remove('bg-gray-100');
            if (serverStatus) serverStatus.classList.add('bg-green-100');
            return true;
        }
    } catch (error) {
        if (statusText) statusText.textContent = '❌ Офлайн';
        if (serverStatus) serverStatus.classList.add('bg-red-100');
    }
    return false;
}

// Показать экран входа
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainInterface').classList.add('hidden');
    
    // Обработчик формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// Показать главный интерфейс
function showMainInterface() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainInterface').classList.remove('hidden');
}

// Обработчик входа
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        console.log('🔐 Попытка входа...');
        
        const response = await window.api.login(username, password);
        
        if (response.token) {
            console.log('✅ Вход выполнен успешно');
            
            // Проверяем, заблокирован ли пользователь
            if (response.user.is_blocked) {
                if (errorDiv) {
                    errorDiv.textContent = '🔒 Ваш аккаунт заблокирован. Обратитесь к администратору.';
                    errorDiv.classList.remove('hidden');
                }
                return;
            }
            
            // Сохраняем данные пользователя
            window.currentUser = response.user;
            
            // Проверяем, требуется ли смена пароля
            if (response.user.require_password_change) {
                showPasswordChangeDialog();
                return;
            }
            
            // Загружаем год по умолчанию из базы данных
            try {
                const settings = await window.api.getUserSettings();
                if (settings && settings.default_year) {
                    const yearNum = parseInt(settings.default_year);
                    if (!isNaN(yearNum) && yearNum >= 2020 && yearNum <= 2050) {
                        window.currentYear = yearNum;
                        console.log('📅 Загружен год по умолчанию из БД:', yearNum);
                        console.log('📅 window.currentYear установлен:', window.currentYear);
                    }
                } else {
                    console.log('📅 Год по умолчанию не установлен, используем текущий:', window.currentYear);
                }
            } catch (error) {
                console.warn('⚠️ Не удалось загрузить год по умолчанию:', error);
            }
            
            // Обновляем отображение пользователя
            const userDisplays = document.querySelectorAll('#currentUserDisplay, #currentUser');
            userDisplays.forEach(el => {
                if (el) el.textContent = response.user.username;
            });
            
            const roleDisplays = document.querySelectorAll('#currentRoleDisplay, #currentRole');
            roleDisplays.forEach(el => {
                if (el) el.textContent = response.user.role === 'admin' ? 'Администратор' : 'Пользователь';
            });
            
            // Инициализируем интерфейс
            initializeInterface();
            
            // Загружаем данные
            await loadInitialData();
            
            // Показываем главный интерфейс
            showMainInterface();

            // Проверяем новые цены и показываем уведомление
            setTimeout(() => checkAndShowPriceNotifications(), 1000);
        }
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        if (errorDiv) {
            errorDiv.textContent = `Ошибка входа: ${error.message}`;
            errorDiv.classList.remove('hidden');
        }
    }
}

// Показать диалог смены пароля
function showPasswordChangeDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 class="text-2xl font-bold mb-4 text-orange-600">🔑 Требуется смена пароля</h2>
            <p class="mb-4 text-gray-700">Администратор требует, чтобы вы сменили пароль перед продолжением работы.</p>
            <form id="forcePasswordChangeForm">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Новый пароль:</label>
                    <input type="password" id="newPasswordForce" class="w-full p-2 border rounded" required minlength="4">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Подтвердите пароль:</label>
                    <input type="password" id="confirmPasswordForce" class="w-full p-2 border rounded" required minlength="4">
                </div>
                <div id="passwordChangeError" class="text-red-600 text-sm mb-4 hidden"></div>
                <div class="flex gap-2">
                    <button type="submit" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Сменить пароль
                    </button>
                    <button type="button" id="cancelPasswordChange" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                        Выйти
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Обработчик формы смены пароля
    const form = dialog.querySelector('#forcePasswordChangeForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPasswordForce').value;
        const confirmPassword = document.getElementById('confirmPasswordForce').value;
        const errorDiv = document.getElementById('passwordChangeError');
        
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Пароли не совпадают';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        try {
            // Меняем пароль через API
            await window.api.updateUser(window.currentUser.id, {
                username: window.currentUser.username,
                password: newPassword,
                role: window.currentUser.role,
                warehouse_group: window.currentUser.warehouse_group,
                require_password_change: false,  // Сбрасываем флаг
                is_blocked: window.currentUser.is_blocked
            });
            
            alert('✅ Пароль успешно изменен!');
            
            // Удаляем диалог
            dialog.remove();
            
            // Обновляем данные пользователя
            window.currentUser.require_password_change = false;
            
            // Продолжаем вход
            continueLogin();
            
        } catch (error) {
            errorDiv.textContent = `Ошибка: ${error.message}`;
            errorDiv.classList.remove('hidden');
        }
    });
    
    // Кнопка отмены
    dialog.querySelector('#cancelPasswordChange').addEventListener('click', () => {
        dialog.remove();
        location.reload();
    });
}

// Продолжить вход после смены пароля
async function continueLogin() {
    // Загружаем год по умолчанию из базы данных
    try {
        const settings = await window.api.getUserSettings();
        if (settings && settings.default_year) {
            const yearNum = parseInt(settings.default_year);
            if (!isNaN(yearNum) && yearNum >= 2020 && yearNum <= 2050) {
                window.currentYear = yearNum;
                console.log('📅 Загружен год по умолчанию из БД:', yearNum);
            }
        }
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить год по умолчанию:', error);
    }
    
    // Обновляем отображение пользователя
    const userDisplays = document.querySelectorAll('#currentUserDisplay, #currentUser');
    userDisplays.forEach(el => {
        if (el) el.textContent = window.currentUser.username;
    });
    
    const roleDisplays = document.querySelectorAll('#currentRoleDisplay, #currentRole');
    roleDisplays.forEach(el => {
        if (el) el.textContent = window.currentUser.role === 'admin' ? 'Администратор' : 'Пользователь';
    });
    
    // Инициализируем интерфейс
    initializeInterface();
    
    // Загружаем данные
    await loadInitialData();
    
    // Показываем главный интерфейс
    showMainInterface();
}

// Инициализация интерфейса
function initializeInterface() {
    console.log('🎨 Инициализация интерфейса...');
    
    // Навигация по меню
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Кнопка выхода
    const logoutBtns = document.querySelectorAll('#logoutBtn, #logoutBtnMobile');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });
    
    // Селектор года
    const yearSelector = document.getElementById('yearSelector');
    if (yearSelector) {
        yearSelector.addEventListener('change', async (e) => {
            await switchYear(parseInt(e.target.value));
        });
    }
    
    // Инициализируем селектор года
    updateYearSelector();

    // Применяем права доступа по роли
    applyRolePermissions();
    
    console.log('✅ Интерфейс инициализирован');
}

// Скрываем/показываем пункты меню по роли пользователя
function applyRolePermissions() {
    const role = window.currentUser?.role;
    if (!role) return;

    // Разделы, скрытые для завсклада
    const warehouseHidden = ['payments', 'partners', 'users', 'backup', 'stock-balance'];
    // Разделы, скрытые для кассира
    const cashierHidden = ['income', 'expense', 'users', 'backup', 'stock-balance', 'wagon-summary', 'balance-summary', 'wagon-totals'];

    document.querySelectorAll('.menu-item[data-section]').forEach(btn => {
        const section = btn.dataset.section;
        let hidden = false;
        if (role === 'warehouse' && warehouseHidden.includes(section)) hidden = true;
        if (role === 'cashier' && cashierHidden.includes(section)) hidden = true;
        btn.style.display = hidden ? 'none' : '';
    });

    // Скрываем блок управления ценами и кнопку "Управление" в дашборде для завсклада
    if (role === 'warehouse') {
        const priceBlock = document.getElementById('priceManagementBlock');
        if (priceBlock) priceBlock.style.display = 'none';

        // Скрываем кнопку "Управление" в блоке текущих цен на дашборде
        document.querySelectorAll('button[onclick*="priceManagementBlock"]').forEach(btn => {
            btn.style.display = 'none';
        });
    }

    // Скрываем блоки управления для кассира
    if (role === 'cashier') {
        ['priceManagementBlock', 'mgmt-companies', 'mgmt-warehouses', 'mgmt-products', 'mgmt-coalitions'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
}

// Загрузка начальных данных
async function loadInitialData() {
    console.log('📥 Загрузка данных...');
    
    try {
        // Загружаем список доступных годов из базы
        try {
            const yearsResponse = await window.api.getAvailableYears();
            if (yearsResponse && yearsResponse.years) {
                console.log('📅 Доступные года в базе:', yearsResponse.years);
                
                // Инициализируем структуру для всех годов
                yearsResponse.years.forEach(year => {
                    if (!window.appData.years[year]) {
                        window.appData.years[year] = {
                            income: [],
                            expense: [],
                            payments: [],
                            partners: []
                        };
                    }
                });
                
                // Обновляем селектор годов
                if (typeof window.updateYearSelector === 'function') {
                    window.updateYearSelector();
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить список годов:', error);
        }
        
        // Загружаем данные через адаптер
        await window.loadData();
        
        // Обновляем селектор года еще раз после загрузки данных
        if (typeof window.updateYearSelector === 'function') {
            window.updateYearSelector();
            console.log('📅 Селектор года обновлен после загрузки данных');
        }
        
        // Обновляем отображение текущего года
        const currentYearDisplays = document.querySelectorAll('#currentYearDisplay, #mobileCurrentYearDisplay');
        currentYearDisplays.forEach(el => {
            if (el) el.textContent = window.currentYear;
        });
        console.log('📅 Отображение текущего года обновлено:', window.currentYear);
        
        // Обновляем дашборд
        updateDashboard();
        
        // Обновляем цены на дашборде
        updateDashboardPricesNew();
        
        console.log('✅ Данные загружены');
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
    }
}

// Навигация между разделами
function navigateToSection(sectionName) {
    console.log('📍 Переход к разделу:', sectionName);

    // Проверка прав доступа для завсклада
    const warehouseHidden = ['payments', 'partners', 'users', 'backup', 'stock-balance'];
    const cashierHidden = ['income', 'expense', 'users', 'backup', 'stock-balance', 'wagon-summary', 'balance-summary', 'wagon-totals'];
    if (window.currentUser?.role === 'warehouse' && warehouseHidden.includes(sectionName)) {
        console.warn('⛔ Доступ запрещён к разделу:', sectionName);
        return;
    }
    if (window.currentUser?.role === 'cashier' && cashierHidden.includes(sectionName)) {
        console.warn('⛔ Доступ запрещён к разделу:', sectionName);
        return;
    }
    
    // Скрываем все разделы
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранный раздел
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
    }

    // Скрываем блок управления ценами для завсклада и кассира
    if (sectionName === 'management') {
        const priceBlock = document.getElementById('priceManagementBlock');
        if (priceBlock) {
            priceBlock.style.display = (window.currentUser?.role === 'warehouse' || window.currentUser?.role === 'cashier') ? 'none' : '';
        }
        if (window.currentUser?.role === 'cashier') {
            ['mgmt-companies', 'mgmt-warehouses', 'mgmt-products', 'mgmt-coalitions'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }
    }
    
    // Обновляем активный пункт меню
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.dataset.section === sectionName) {
            item.classList.add('bg-blue-700');
        } else {
            item.classList.remove('bg-blue-700');
        }
    });
    
    // Загружаем данные для раздела
    if (sectionName === 'income' && typeof window.updateIncomeTable === 'function') {
        if (typeof window.loadIncomeDictionaries === 'function') {
            window.loadIncomeDictionaries();
        }
        window.updateIncomeTable();
    }
    if (sectionName === 'expense' && typeof window.updateExpenseTable === 'function') {
        window.updateExpenseTable();
    }
    if (sectionName === 'payments' && typeof window.updatePaymentsTable === 'function') {
        window.updatePaymentsTable();
    }
    if (sectionName === 'partners' && typeof window.updatePartnersTable === 'function') {
        if (typeof window.loadPartnerDictionaries === 'function') {
            window.loadPartnerDictionaries();
        }
        window.updatePartnersTable();
    }
    if (sectionName === 'wagon-summary' && typeof window.updateWagonSummary === 'function') {
        if (typeof window.loadWagonSummaryFilters === 'function') {
            window.loadWagonSummaryFilters();
        }
        window.updateWagonSummary();
    }
    if (sectionName === 'balance-summary' && typeof window.updateBalanceSummary === 'function') {
        if (typeof window.loadBalanceFilters === 'function') {
            window.loadBalanceFilters();
        }
        window.updateBalanceSummary();
    }
    if (sectionName === 'debt-report' && typeof window.updateDebtReport === 'function') {
        window.updateDebtReport();
    }
    if (sectionName === 'wagon-totals' && typeof window.updateWagonTotals === 'function') {
        if (typeof window.loadTotalsFilters === 'function') {
            window.loadTotalsFilters();
        }
        window.updateWagonTotals();
    }
    if (sectionName === 'stock-balance' && typeof window.initializeStockBalance === 'function') {
        window.initializeStockBalance();
    }
    if (sectionName === 'reports' && typeof window.initReportButtons === 'function') {
        window.initReportButtons();
    }
    if (sectionName === 'management' && typeof window.updateManagementTables === 'function') {
        window.updateManagementTables();
    }
    if (sectionName === 'users' && typeof window.initUsersSection === 'function') {
        window.initUsersSection();
    }
}

// Обновление дашборда
function updateDashboard() {
    console.log('📊 Обновление дашборда...');
    
    const yearData = window.getCurrentYearData();
    
    // Подсчет прихода (qty_fact - фактическое количество)
    let totalIncomeQty = 0;
    let totalIncomeTons = 0;
    
    if (yearData.income && Array.isArray(yearData.income)) {
        yearData.income.forEach(item => {
            if (!item.deleted) {
                totalIncomeQty += parseFloat(item.qty_fact || 0);
                totalIncomeTons += parseFloat(item.weight_tons || 0);
            }
        });
    }
    
    // Подсчет расхода
    let totalExpenseQty = 0; // Общее количество товара в расходе
    let totalExpenseTons = 0;
    
    if (yearData.expense && Array.isArray(yearData.expense)) {
        yearData.expense.forEach(item => {
            if (!item.deleted) {
                totalExpenseQty += parseFloat(item.quantity || 0); // Суммируем количество товара
                totalExpenseTons += parseFloat(item.tons || 0);
            }
        });
    }
    
    // Подсчет погашений по клиентам
    const paymentsByClient = {};
    if (yearData.payments && Array.isArray(yearData.payments)) {
        yearData.payments.forEach(payment => {
            if (!payment.deleted && payment.client_id) {
                if (!paymentsByClient[payment.client_id]) {
                    paymentsByClient[payment.client_id] = 0;
                }
                paymentsByClient[payment.client_id] += parseFloat(payment.amount || 0);
            }
        });
    }
    
    // Подсчет расходов по клиентам
    const expensesByClient = {};
    if (yearData.expense && Array.isArray(yearData.expense)) {
        yearData.expense.forEach(expense => {
            if (!expense.deleted && expense.client_id) {
                if (!expensesByClient[expense.client_id]) {
                    expensesByClient[expense.client_id] = 0;
                }
                expensesByClient[expense.client_id] += parseFloat(expense.total || 0);
            }
        });
    }
    
    // Подсчет долгов: погашения - расход = долг (отрицательное значение = долг)
    let totalDebt = 0;
    const allClientIds = new Set([...Object.keys(paymentsByClient), ...Object.keys(expensesByClient)]);
    
    allClientIds.forEach(clientId => {
        const payments = paymentsByClient[clientId] || 0;
        const expenses = expensesByClient[clientId] || 0;
        const balance = payments - expenses; // погашения - расход
        
        // Если баланс отрицательный, это долг
        if (balance < 0) {
            totalDebt += Math.abs(balance);
        }
    });
    
    // Обновляем отображение
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalIncomeTonsEl = document.getElementById('totalIncomeTons');
    const totalExpenseEl = document.getElementById('totalExpense');
    const totalExpenseTonsEl = document.getElementById('totalExpenseTons');
    const totalBalanceEl = document.getElementById('totalBalance');
    const totalBalanceTonsEl = document.getElementById('totalBalanceTons');
    const totalDebtEl = document.getElementById('totalDebt');
    
    // Для прихода показываем количество мешков
    if (totalIncomeEl) totalIncomeEl.textContent = totalIncomeQty.toLocaleString('ru-RU');
    if (totalIncomeTonsEl) totalIncomeTonsEl.textContent = `${totalIncomeTons.toFixed(2)} тонн`;
    
    // Для расхода показываем общее количество товара
    if (totalExpenseEl) totalExpenseEl.textContent = totalExpenseQty.toLocaleString('ru-RU');
    if (totalExpenseTonsEl) totalExpenseTonsEl.textContent = `${totalExpenseTons.toFixed(2)} тонн`;
    
    // Баланс: количество мешков и тоннаж
    const balanceQty = totalIncomeQty - totalExpenseQty;
    const balanceTons = totalIncomeTons - totalExpenseTons;
    
    if (totalBalanceEl) totalBalanceEl.textContent = balanceQty.toLocaleString('ru-RU');
    if (totalBalanceTonsEl) totalBalanceTonsEl.textContent = `${balanceTons.toFixed(2)} тонн`;
    
    if (totalDebtEl) totalDebtEl.textContent = totalDebt.toLocaleString('ru-RU');
    
    console.log('✅ Дашборд обновлен:', {
        totalIncomeQty: totalIncomeQty.toFixed(0),
        totalIncomeTons: totalIncomeTons.toFixed(2),
        totalExpenseQty: totalExpenseQty.toFixed(0),
        totalExpenseTons: totalExpenseTons.toFixed(2),
        balanceQty: balanceQty.toFixed(0),
        balanceTons: balanceTons.toFixed(2),
        totalDebt: totalDebt.toFixed(2)
    });
}

// Переключение года
async function switchYear(year) {
    console.log('📅 Переключение на год:', year);
    
    window.currentYear = year;
    
    // Загружаем данные для нового года
    await window.loadData();
    
    // Обновляем интерфейс
    updateDashboard();
    
    // Обновляем отображение текущего года
    const displays = document.querySelectorAll('#currentYearDisplay, #mobileCurrentYearDisplay');
    displays.forEach(el => {
        if (el) el.textContent = year;
    });
}

// Обновление селектора года
function updateYearSelector() {
    const yearSelector = document.getElementById('yearSelector');
    if (!yearSelector) return;
    
    // Очищаем селектор
    yearSelector.innerHTML = '';
    
    // Получаем доступные годы
    const years = Object.keys(window.appData.years || {}).map(y => parseInt(y));
    
    // Если нет годов, добавляем текущий
    if (years.length === 0) {
        years.push(window.currentYear || 2025);
    }
    
    // Сортируем годы
    years.sort((a, b) => b - a);
    
    // Добавляем опции
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === window.currentYear) {
            option.selected = true;
        }
        yearSelector.appendChild(option);
    });
}

// Выход из системы
function handleLogout() {
    console.log('👋 Выход из системы...');
    
    // Очищаем токен
    window.api.clearToken();
    
    // Очищаем данные
    window.currentUser = null;
    window.appData = {
        years: {},
        companies: [],
        warehouses: [],
        products: [],
        clients: [],
        users: []
    };
    
    // Показываем экран входа
    showLoginScreen();
}

// Экспортируем функции для использования в других модулях
window.navigateToSection = navigateToSection;
window.updateDashboard = updateDashboard;
window.switchYear = switchYear;
window.updateYearSelector = updateYearSelector;

console.log('✅ main.js загружен');


// ===== БЫСТРЫЕ ОТЧЕТЫ И ЦЕНЫ НА ДАШБОРДЕ =====

// Генерация отчета фактических остатков
function generateQuickStockReportNew() {
    const yearData = window.getCurrentYearData();
    const year = window.currentYear;

    if (!yearData) return 'Нет данных для формирования отчета';

    // Считаем остатки по складам: приход - расход
    const summary = {}; // key: warehouse-product

    (yearData.income || []).forEach(item => {
        if (item.deleted) return;
        const key = `${item.warehouse}||${item.product}`;
        if (!summary[key]) summary[key] = { warehouse: item.warehouse, product: item.product, income: 0, expense: 0 };
        summary[key].income += parseFloat(item.qty_fact || 0);
    });

    (yearData.expense || []).forEach(item => {
        if (item.deleted) return;
        const key = `${item.warehouse}||${item.product}`;
        if (!summary[key]) summary[key] = { warehouse: item.warehouse, product: item.product, income: 0, expense: 0 };
        summary[key].expense += parseFloat(item.quantity || 0);
    });

    // Группируем по группам складов
    const warehouseGroups = {};
    const warehouses = window.appData.warehouses || [];

    Object.values(summary).forEach(item => {
        const balance = item.income - item.expense;
        if (Math.abs(balance) < 0.01) return;

        const wh = warehouses.find(w => w.name === item.warehouse);
        const group = wh ? (wh.warehouse_group || 'Без группы') : 'Без группы';

        if (!warehouseGroups[group]) warehouseGroups[group] = {};
        if (!warehouseGroups[group][item.product]) warehouseGroups[group][item.product] = 0;
        warehouseGroups[group][item.product] += balance;
    });

    let report = `Фактический Остаток\n\n`;
    const totalBalances = {};
    let groupIndex = 1;

    Object.keys(warehouseGroups).sort().forEach(group => {
        const products = warehouseGroups[group];
        let groupReport = `${groupIndex}) ${group}\n`;

        Object.keys(products).sort().forEach(product => {
            const qty = products[product];
            const tons = qty / 20;
            groupReport += `${product}\t${tons.toFixed(2)} т/н (${year})\n`;
            if (!totalBalances[product]) totalBalances[product] = 0;
            totalBalances[product] += qty;
        });

        report += groupReport + '\n';
        groupIndex++;
    });

    report += `Итого:\n`;
    let grandTotalQty = 0;
    Object.keys(totalBalances).sort().forEach(product => {
        const qty = totalBalances[product];
        const tons = qty / 20;
        report += `${product}\t${tons.toFixed(2)} т/н (${year})\n`;
        grandTotalQty += qty;
    });
    report += `\nВсего: ${(grandTotalQty / 20).toFixed(2)} т/н (${year})`;

    return report;
}

function generateQuickStockReportAndShow() {
    const report = generateQuickStockReportNew();
    const container = document.getElementById('quickStockReportContainer');
    const text = document.getElementById('quickStockReportText');
    if (text) text.textContent = report;
    if (container) container.classList.remove('hidden');
}

function sendStockToWhatsAppNew() {
    const report = generateQuickStockReportNew();
    const encoded = encodeURIComponent(report);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
        window.location.href = `whatsapp://send?text=${encoded}`;
    } else {
        window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
    }
}

function copyStockToClipboardNew() {
    const report = generateQuickStockReportNew();
    if (navigator.clipboard) {
        navigator.clipboard.writeText(report).then(() => alert('✅ Отчет скопирован в буфер обмена!'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = report;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('✅ Отчет скопирован в буфер обмена!');
    }
}

// Обновление блока текущих цен на дашборде
async function updateDashboardPricesNew() {
    const container = document.getElementById('dashboardPricesListNew');
    const noMsg = document.getElementById('noPricesMessageNew');
    const lastUpdate = document.getElementById('pricesLastUpdateNew');

    if (!container) return;

    try {
        const prices = await window.api.getPrices();

        if (lastUpdate) lastUpdate.textContent = new Date().toLocaleString('ru-RU');

        if (!prices || prices.length === 0) {
            container.classList.add('hidden');
            if (noMsg) noMsg.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        if (noMsg) noMsg.classList.add('hidden');

        // Группируем по группе склада
        const grouped = {};
        const today = localDateStr();

        prices.forEach(p => {
            const group = p.warehouse_group || 'Все склады';
            if (!grouped[group]) grouped[group] = {};
            const productName = p.product_name || p.product || `Товар #${p.product_id}`;
            // Берем самую свежую цену для каждого товара в группе
            if (!grouped[group][productName] || p.effective_date > grouped[group][productName].effective_date) {
                grouped[group][productName] = p;
            }
        });

        // Вспомогательная функция: форматирует дату ISO в YYYY-MM-DD
        const fmtDate = (val) => {
            if (!val) return '';
            return String(val).substring(0, 10); // берем первые 10 символов
        };

        // Вспомогательная функция: извлекает время из created_at
        const fmtTime = (val) => {
            if (!val) return '';
            const d = new Date(val);
            return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        };

        const sortedGroups = Object.keys(grouped).sort((a, b) => {
            if (a === 'Все склады') return -1;
            if (b === 'Все склады') return 1;
            return a.localeCompare(b, 'ru');
        });

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

        sortedGroups.forEach(group => {
            const products = grouped[group];
            html += `<div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 class="font-bold text-gray-800 mb-3 text-base border-b border-gray-200 pb-2">${group}</h3>
                <div class="space-y-0">`;

            Object.keys(products).sort().forEach((productName, idx) => {
                const p = products[productName];
                // Зелёная если добавлена менее 24 часов назад
                const addedAt = p.created_at ? new Date(p.created_at).getTime() : 0;
                const isNew = addedAt > 0 && (Date.now() - addedAt) < 24 * 60 * 60 * 1000;
                const priceClass = isNew ? 'text-green-700 font-semibold' : 'text-gray-700';
                const dateClass = isNew ? 'text-green-600' : 'text-gray-500';
                const dateLabel = fmtDate(p.effective_date) === today ? 'Сегодня' : fmtDate(p.effective_date);
                const timeLabel = fmtTime(p.created_at);
                // Название: только товар + время
                const displayName = `${productName}${timeLabel ? ' ' + timeLabel : ''}`;

                html += `<div class="flex justify-between items-center py-1 text-sm ${idx > 0 ? 'border-t border-gray-100' : ''}">
                    <span class="font-medium text-gray-800 truncate flex-1" title="${displayName}">${displayName}</span>
                    <div class="text-right ml-2">
                        <div class="${priceClass}">${parseFloat(p.price || 0).toFixed(2)}</div>
                        <div class="text-xs ${dateClass}">${dateLabel}</div>
                    </div>
                </div>`;
            });

            html += `</div></div>`;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('❌ Ошибка загрузки цен:', error);
        container.innerHTML = '<div class="text-center text-red-500 text-sm py-4">Ошибка загрузки цен</div>';
    }
}


// ===== УВЕДОМЛЕНИЯ О НОВЫХ ЦЕНАХ ПРИ ВХОДЕ =====

async function checkAndShowPriceNotifications() {
    try {
        const user = window.currentUser;
        if (!user) return;

        const storageKey = `lastLoginTime_${user.username}`;
        const lastLoginTime = parseInt(localStorage.getItem(storageKey) || '0');
        const currentTime = Date.now();

        console.log('🔔 Проверка новых цен. Последний вход:', lastLoginTime ? new Date(lastLoginTime).toLocaleString('ru-RU') : 'первый вход');

        // Сохраняем новое время входа СРАЗУ (до загрузки цен)
        localStorage.setItem(storageKey, currentTime);

        // Первый вход — не показываем
        if (lastLoginTime === 0) {
            console.log('🔔 Первый вход — уведомления не показываются');
            return;
        }

        // Загружаем все цены
        const prices = await window.api.getPrices();
        if (!prices || prices.length === 0) return;

        console.log('🔔 Всего цен в базе:', prices.length);
        console.log('🔔 Пример created_at:', prices[0]?.created_at);

        // Фильтруем цены добавленные после последнего входа
        const newPrices = prices.filter(p => {
            if (!p.created_at) return false;
            const addedAt = new Date(p.created_at).getTime();
            console.log(`🔔 Цена "${p.product_name}": addedAt=${new Date(addedAt).toLocaleString('ru-RU')}, lastLogin=${new Date(lastLoginTime).toLocaleString('ru-RU')}, новая=${addedAt > lastLoginTime}`);
            return addedAt > lastLoginTime;
        });

        console.log('🔔 Найдено новых цен:', newPrices.length);

        if (newPrices.length === 0) return;

        showPriceNotificationsModal(newPrices);

    } catch (error) {
        console.warn('⚠️ Ошибка проверки новых цен:', error);
    }
}

function showPriceNotificationsModal(newPrices) {
    // Убираем старый модал если есть
    const existing = document.getElementById('priceNotificationsModal');
    if (existing) existing.remove();

    const today = localDateStr();
    const todayPrices = newPrices.filter(p => String(p.effective_date).substring(0, 10) === today);
    const olderPrices = newPrices.filter(p => String(p.effective_date).substring(0, 10) !== today);

    const createItem = (p) => {
        const group = p.warehouse_group || 'Все склады';
        const groupDisplay = group === 'ALL' || group === 'Все склады'
            ? '<span class="text-blue-600 text-xs">🌍 Все склады</span>'
            : `<span class="text-purple-600 text-xs">📍 ${group}</span>`;
        const dateStr = String(p.effective_date).substring(0, 10);
        const dateLabel = dateStr === today ? 'Сегодня' : dateStr;
        const timeLabel = p.created_at ? new Date(p.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
        const addedBy = p.created_by_name || '';

        return `<div class="bg-gray-50 rounded-lg p-3 border-l-4 border-green-500">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${p.product_name || ''}</div>
                    <div class="text-lg font-bold text-green-600">${parseFloat(p.price || 0).toFixed(2)} за тонну</div>
                    <div class="text-xs text-gray-600">${groupDisplay}</div>
                </div>
                <div class="text-right text-xs text-gray-500">
                    <div>${dateLabel}</div>
                    ${timeLabel ? `<div>${timeLabel}</div>` : ''}
                    ${addedBy ? `<div>от ${addedBy}</div>` : ''}
                </div>
            </div>
        </div>`;
    };

    const modal = document.createElement('div');
    modal.id = 'priceNotificationsModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-hidden flex flex-col">
            <div class="bg-blue-600 text-white p-4 flex justify-between items-center">
                <h3 class="text-lg font-bold">💰 Новые цены на товары</h3>
                <button onclick="closePriceNotificationsModal()" class="text-white hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <div class="p-4 overflow-y-auto flex-1">
                <p class="text-gray-600 mb-4">С вашего последнего входа были установлены новые цены:</p>
                ${todayPrices.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="font-medium text-green-700 mb-2">📅 Цены на сегодня:</h4>
                        <div class="space-y-2">${todayPrices.map(createItem).join('')}</div>
                    </div>` : ''}
                ${olderPrices.length > 0 ? `
                    <div>
                        <h4 class="font-medium text-blue-700 mb-2">📋 Предыдущие дни:</h4>
                        <div class="space-y-2">${olderPrices.slice(0, 10).map(createItem).join('')}</div>
                        ${olderPrices.length > 10 ? `<p class="text-xs text-gray-500 mt-2">... и ещё ${olderPrices.length - 10} изменений</p>` : ''}
                    </div>` : ''}
            </div>
            <div class="bg-gray-50 p-4 flex justify-end gap-2">
                ${window.currentUser && window.currentUser.role === 'admin' ? `
                    <button onclick="closePriceNotificationsModal(); navigateToSection('management'); setTimeout(()=>{ const el=document.getElementById('priceManagementBlock'); if(el) el.scrollIntoView({behavior:'smooth'}); },150);"
                        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Управление ценами
                    </button>` : ''}
                <button onclick="closePriceNotificationsModal()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                    Закрыть
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Закрываем через 15 секунд автоматически
    setTimeout(() => closePriceNotificationsModal(), 15000);
}

function closePriceNotificationsModal() {
    const modal = document.getElementById('priceNotificationsModal');
    if (modal) modal.remove();
}


// ===== ОТЧЕТ ЗА ДЕНЬ НА ДАШБОРДЕ =====

function generateDailyReportOnDashboard(selectedDate) {
    if (!selectedDate) {
        selectedDate = localDateStr();
    }

    const datePicker = document.getElementById('dailyReportDatePickerNew');
    if (datePicker) datePicker.value = selectedDate;

    const yearData = window.getCurrentYearData();
    // Фильтруем по дате (поле date может быть "2025-03-11" или "2025-03-11T...")
    const incomeItems = (yearData.income || []).filter(i => !i.deleted && String(i.date).substring(0, 10) === selectedDate);
    const expenseItems = (yearData.expense || []).filter(i => !i.deleted && String(i.date).substring(0, 10) === selectedDate);

    let html = `<div class="daily-report">
        <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Отчет за ${fmtDate(selectedDate)}</h2>
            <p class="text-gray-600">Приход и расход товаров</p>
        </div>`;

    // ПРИХОД
    html += `<div class="mb-8">
        <h3 class="text-xl font-semibold mb-4 text-green-700 border-b-2 border-green-200 pb-2">📦 ПРИХОД ТОВАРОВ</h3>`;

    if (incomeItems.length > 0) {
        let tDoc = 0, tFact = 0, tDiff = 0, tWeight = 0;
        let rows = '';
        incomeItems.forEach(item => {
            const doc = parseFloat(item.qty_doc || 0);
            const fact = parseFloat(item.qty_fact || 0);
            const diff = parseFloat(item.difference || 0);
            const wt = parseFloat(item.weight_tons || 0);
            tDoc += doc; tFact += fact; tDiff += diff; tWeight += wt;
            rows += `<tr class="hover:bg-gray-50">
                <td class="border border-gray-300 p-2">${fmtDate(item.date)}</td>
                <td class="border border-gray-300 p-2">${item.wagon || '-'}</td>
                <td class="border border-gray-300 p-2">${item.company || '-'}</td>
                <td class="border border-gray-300 p-2">${item.warehouse || '-'}</td>
                <td class="border border-gray-300 p-2">${item.product || '-'}</td>
                <td class="border border-gray-300 p-2 text-center">${doc}</td>
                <td class="border border-gray-300 p-2 text-center">${fact}</td>
                <td class="border border-gray-300 p-2 text-center ${diff >= 0 ? 'text-green-600' : 'text-red-600'}">${diff}</td>
                <td class="border border-gray-300 p-2 text-center">${wt.toFixed(2)}</td>
            </tr>`;
        });
        html += `<div class="overflow-x-auto"><table class="w-full border-collapse border border-gray-300">
            <thead class="bg-green-50"><tr>
                <th class="border border-gray-300 p-2 text-left">Дата</th>
                <th class="border border-gray-300 p-2 text-left">Вагон</th>
                <th class="border border-gray-300 p-2 text-left">Фирма</th>
                <th class="border border-gray-300 p-2 text-left">Склад</th>
                <th class="border border-gray-300 p-2 text-left">Товар</th>
                <th class="border border-gray-300 p-2 text-center">По документу</th>
                <th class="border border-gray-300 p-2 text-center">По факту</th>
                <th class="border border-gray-300 p-2 text-center">Разница</th>
                <th class="border border-gray-300 p-2 text-center">Вес (тонн)</th>
            </tr></thead>
            <tbody>${rows}
                <tr class="bg-green-100 font-bold">
                    <td colspan="5" class="border border-gray-300 p-2 text-right">ИТОГО ПРИХОД:</td>
                    <td class="border border-gray-300 p-2 text-center">${tDoc}</td>
                    <td class="border border-gray-300 p-2 text-center">${tFact}</td>
                    <td class="border border-gray-300 p-2 text-center ${tDiff >= 0 ? 'text-green-600' : 'text-red-600'}">${tDiff}</td>
                    <td class="border border-gray-300 p-2 text-center">${tWeight.toFixed(2)}</td>
                </tr>
            </tbody></table></div>`;
    } else {
        html += '<p class="text-gray-500 italic">За этот день операций прихода не было</p>';
    }
    html += '</div>';

    // РАСХОД
    html += `<div class="mb-8">
        <h3 class="text-xl font-semibold mb-4 text-red-700 border-b-2 border-red-200 pb-2">📤 РАСХОД ТОВАРОВ</h3>`;

    if (expenseItems.length > 0) {
        let tQty = 0, tTons = 0, tSum = 0;
        let rows = '';
        expenseItems.forEach(item => {
            const qty = parseFloat(item.quantity || 0);
            const tons = parseFloat(item.tons || 0);
            const price = parseFloat(item.price || 0);
            const total = parseFloat(item.total || 0);
            tQty += qty; tTons += tons; tSum += total;
            rows += `<tr class="hover:bg-gray-50">
                <td class="border border-gray-300 p-2">${fmtDate(item.date)}</td>
                <td class="border border-gray-300 p-2">${item.company || '-'}</td>
                <td class="border border-gray-300 p-2">${item.warehouse || '-'}</td>
                <td class="border border-gray-300 p-2">${item.client || '-'}</td>
                <td class="border border-gray-300 p-2">${item.product || '-'}</td>
                <td class="border border-gray-300 p-2 text-center">${qty}</td>
                <td class="border border-gray-300 p-2 text-center">${tons.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center">${price.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center">${total.toFixed(2)}</td>
            </tr>`;
        });
        html += `<div class="overflow-x-auto"><table class="w-full border-collapse border border-gray-300">
            <thead class="bg-red-50"><tr>
                <th class="border border-gray-300 p-2 text-left">Дата</th>
                <th class="border border-gray-300 p-2 text-left">Фирма</th>
                <th class="border border-gray-300 p-2 text-left">Склад</th>
                <th class="border border-gray-300 p-2 text-left">Клиент</th>
                <th class="border border-gray-300 p-2 text-left">Товар</th>
                <th class="border border-gray-300 p-2 text-center">Количество</th>
                <th class="border border-gray-300 p-2 text-center">Тонн</th>
                <th class="border border-gray-300 p-2 text-center">Цена</th>
                <th class="border border-gray-300 p-2 text-center">Сумма</th>
            </tr></thead>
            <tbody>${rows}
                <tr class="bg-red-100 font-bold">
                    <td colspan="5" class="border border-gray-300 p-2 text-right">ИТОГО РАСХОД:</td>
                    <td class="border border-gray-300 p-2 text-center">${tQty}</td>
                    <td class="border border-gray-300 p-2 text-center">${tTons.toFixed(2)}</td>
                    <td class="border border-gray-300 p-2 text-center">—</td>
                    <td class="border border-gray-300 p-2 text-center">${tSum.toFixed(2)}</td>
                </tr>
            </tbody></table></div>`;
    } else {
        html += '<p class="text-gray-500 italic">За этот день операций расхода не было</p>';
    }
    html += '</div>';

    // СВОДКА
    const totalIncomeWeight = incomeItems.reduce((s, i) => s + parseFloat(i.weight_tons || 0), 0);
    const totalExpenseSum = expenseItems.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    html += `<div class="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <h3 class="text-lg font-bold text-blue-800 mb-2">📊 СВОДКА ЗА ДЕНЬ</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p><strong>Операций прихода:</strong> ${incomeItems.length}</p>
                <p><strong>Операций расхода:</strong> ${expenseItems.length}</p>
            </div>
            <div>
                <p><strong>Общий вес прихода:</strong> ${totalIncomeWeight.toFixed(2)} тонн</p>
                <p><strong>Общая сумма расхода:</strong> ${totalExpenseSum.toFixed(2)} $</p>
            </div>
        </div>
    </div></div>`;

    document.getElementById('dailyReportContentNew').innerHTML = html;
    const container = document.getElementById('dailyReportContainerNew');
    container.classList.remove('hidden');
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function printDailyReportNew() {
    const content = document.getElementById('dailyReportContentNew').innerHTML;
    const date = document.getElementById('dailyReportDatePickerNew').value || localDateStr();
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Отчет за день ${date}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
            th, td { border: 1px solid #999; padding: 6px; text-align: left; }
            th { background: #f0f0f0; }
            @media print { body { margin: 10px; } }
        </style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
}

function exportDailyReportNewExcel() {
    const selectedDate = document.getElementById('dailyReportDatePickerNew').value || localDateStr();
    const yearData = window.getCurrentYearData();

    const incomeItems = (yearData.income || []).filter(i => !i.deleted && String(i.date).substring(0, 10) === selectedDate);
    const expenseItems = (yearData.expense || []).filter(i => !i.deleted && String(i.date).substring(0, 10) === selectedDate);


    // Лист Приход
    const incomeRows = [['Дата','Вагон','Фирма','Склад','Товар','По документу','По факту','Разница','Вес (тонн)','Примечания','Пользователь']];
    let tDoc=0, tFact=0, tDiff=0, tWeight=0;
    incomeItems.forEach(i => {
        const doc=parseFloat(i.qty_doc||0), fact=parseFloat(i.qty_fact||0), diff=parseFloat(i.difference||0), wt=parseFloat(i.weight_tons||0);
        tDoc+=doc; tFact+=fact; tDiff+=diff; tWeight+=wt;
        incomeRows.push([fmtDate(i.date), i.wagon||'', i.company||'', i.warehouse||'', i.product||'', doc, fact, diff, wt.toFixed(2), i.notes||'', i.user||'']);
    });
    incomeRows.push(['ИТОГО:','','','','', tDoc, tFact, tDiff, tWeight.toFixed(2),'','']);

    // Лист Расход
    const expenseRows = [['Дата','Фирма','Склад','Клиент','Товар','Количество','Тонн','Цена','Сумма','Примечания','Пользователь']];
    let tQty=0, tTons=0, tSum=0;
    expenseItems.forEach(i => {
        const qty=parseFloat(i.quantity||0), tons=parseFloat(i.tons||0), price=parseFloat(i.price||0), total=parseFloat(i.total||0);
        tQty+=qty; tTons+=tons; tSum+=total;
        expenseRows.push([fmtDate(i.date), i.company||'', i.warehouse||'', i.client||'', i.product||'', qty, tons.toFixed(2), price.toFixed(2), total.toFixed(2), i.notes||'', i.user||'']);
    });
    expenseRows.push(['ИТОГО:','','','','', tQty, tTons.toFixed(2), '', tSum.toFixed(2),'','']);

    // Генерируем HTML для Excel
    const toTable = (rows) => {
        let t = '<table border="1"><tbody>';
        rows.forEach((row, idx) => {
            const tag = idx === 0 || row[0] === 'ИТОГО:' ? 'th' : 'td';
            t += '<tr>' + row.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
        });
        return t + '</tbody></table>';
    };

    // Свод — простой текст
    const summaryRows = [
        ['СВОДКА ЗА ДЕНЬ'],
        [''],
        ['ПРИХОД'],
        ['Операций прихода:', incomeItems.length],
        ['По документу (итого):', tDoc],
        ['По факту (итого):', tFact],
        ['Разница (итого):', tDiff],
        ['Вес (тонн):', tWeight.toFixed(2)],
        [''],
        ['РАСХОД'],
        ['Операций расхода:', expenseItems.length],
        ['Количество (итого):', tQty],
        ['Тонн (итого):', tTons.toFixed(2)],
        ['Сумма (итого):', tSum.toFixed(2)],
    ];

    // Настоящий XLSX через библиотеку
    const wb = XLSX.utils.book_new();

    const wsIncome = XLSX.utils.aoa_to_sheet(incomeRows);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Приход');

    const wsExpense = XLSX.utils.aoa_to_sheet(expenseRows);
    XLSX.utils.book_append_sheet(wb, wsExpense, 'Расход');

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

    XLSX.writeFile(wb, `Отчет_за_день_${selectedDate}.xlsx`);
}


// ===================== РЕЗЕРВНОЕ КОПИРОВАНИЕ =====================

function backupLog(msg, type = 'info') {
    const log = document.getElementById('backupLog');
    if (!log) return;
    const color = type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-gray-700';
    const time = new Date().toLocaleTimeString();
    log.innerHTML = `<div class="${color}">[${time}] ${msg}</div>` + log.innerHTML;
}

async function exportBackupJSON() {
    try {
        backupLog('Экспорт данных...');
        const year = window.currentYear || new Date().getFullYear();
        const token = localStorage.getItem('authToken');
        const base = window.api ? window.api.baseURL : '';
        const res = await fetch(`${base}/api/backup/export?year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${year}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        backupLog(`✅ Экспорт завершён: приход ${data.data.income.length}, расход ${data.data.expense.length}, погашения ${data.data.payments.length}, партнеры ${data.data.partners.length}`, 'success');
    } catch (err) {
        backupLog('❌ Ошибка экспорта: ' + err.message, 'error');
    }
}

async function exportBackupExcel() {
    try {
        backupLog('Экспорт в Excel...');
        const year = window.currentYear || new Date().getFullYear();
        const token = localStorage.getItem('authToken');
        const base = window.api ? window.api.baseURL : '';
        const res = await fetch(`${base}/api/backup/export?year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        const backup = await res.json();
        const wb = XLSX.utils.book_new();

        const sections = [
            { key: 'income', name: 'Приход' },
            { key: 'expense', name: 'Расход' },
            { key: 'payments', name: 'Погашения' },
            { key: 'partners', name: 'Партнеры' },
        ];

        for (const s of sections) {
            const rows = backup.data[s.key] || [];
            if (rows.length > 0) {
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, s.name);
            }
        }

        XLSX.writeFile(wb, `backup_${year}_${new Date().toISOString().slice(0,10)}.xlsx`);
        backupLog('✅ Excel экспорт завершён', 'success');
    } catch (err) {
        backupLog('❌ Ошибка Excel экспорта: ' + err.message, 'error');
    }
}

async function importBackupJSON() {
    const fileInput = document.getElementById('importBackupFile');
    if (!fileInput || !fileInput.files[0]) {
        alert('Выберите файл для импорта');
        return;
    }
    if (!confirm('Импортировать данные? Дубликаты будут пропущены.')) return;

    try {
        backupLog('Чтение файла...');
        const text = await fileInput.files[0].text();
        const backup = JSON.parse(text);
        if (!backup.data) throw new Error('Неверный формат файла');

        backupLog('Отправка данных на сервер...');
        const token = localStorage.getItem('authToken');
        const base = window.api ? window.api.baseURL : '';
        const year = backup.year || window.currentYear || new Date().getFullYear();
        const res = await fetch(`${base}/api/backup/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data: backup.data, year })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Ошибка импорта');

        const r = result.imported;
        const fmt = (s) => `+${s.inserted} / ~${s.updated}`;
        backupLog(`✅ Импорт завершён (новые / обновлённые): приход ${fmt(r.income)}, расход ${fmt(r.expense)}, погашения ${fmt(r.payments)}, партнеры ${fmt(r.partners)}`, 'success');
        // Обновляем данные
        await loadInitialData();
    } catch (err) {
        backupLog('❌ Ошибка импорта: ' + err.message, 'error');
    }
}

async function exportSectionExcel(section) {
    try {
        backupLog(`Экспорт раздела "${section}"...`);
        const year = window.currentYear || new Date().getFullYear();
        const token = localStorage.getItem('authToken');
        const base = window.api ? window.api.baseURL : '';
        const res = await fetch(`${base}/api/backup/export?year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        const backup = await res.json();

        const nameMap = { income: 'Приход', expense: 'Расход', payments: 'Погашения', partners: 'Партнеры' };
        const rows = backup.data[section] || [];
        if (rows.length === 0) {
            backupLog(`⚠️ Нет данных в разделе "${nameMap[section] || section}"`, 'error');
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, nameMap[section] || section);
        XLSX.writeFile(wb, `${section}_${year}_${new Date().toISOString().slice(0,10)}.xlsx`);
        backupLog(`✅ Экспорт "${nameMap[section]}" завершён (${rows.length} записей)`, 'success');
    } catch (err) {
        backupLog('❌ Ошибка: ' + err.message, 'error');
    }
}


// ===================== ОЧИСТКА ТАБЛИЦ =====================

const _clearTableNames = {
    income: 'Приход',
    expense: 'Расход',
    payments: 'Погашения',
    partners: 'Партнеры',
    management: 'Управление (фирмы, склады, товары, клиенты, коалиции)'
};

let _clearTableTarget = null;

function clearTableWithPassword(table) {
    _clearTableTarget = table;
    const modal = document.getElementById('clearTableModal');
    const text = document.getElementById('clearTableModalText');
    const pwdInput = document.getElementById('clearTablePassword');
    const errDiv = document.getElementById('clearTableError');

    if (!modal) return;

    text.textContent = `Вы собираетесь удалить ВСЕ записи из раздела "${_clearTableNames[table]}". Это действие необратимо. Введите ваш пароль для подтверждения.`;
    pwdInput.value = '';
    errDiv.classList.add('hidden');
    errDiv.textContent = '';
    modal.classList.remove('hidden');
    setTimeout(() => pwdInput.focus(), 100);

    // Вешаем обработчик один раз
    const confirmBtn = document.getElementById('clearTableConfirmBtn');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', _doClearTable);

    // Enter в поле пароля
    pwdInput.onkeydown = (e) => { if (e.key === 'Enter') _doClearTable(); };
}

function closeClearTableModal() {
    const modal = document.getElementById('clearTableModal');
    if (modal) modal.classList.add('hidden');
    _clearTableTarget = null;
}

async function _doClearTable() {
    const table = _clearTableTarget;
    const password = document.getElementById('clearTablePassword').value;
    const errDiv = document.getElementById('clearTableError');

    if (!password) {
        errDiv.textContent = 'Введите пароль';
        errDiv.classList.remove('hidden');
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const base = window.api ? window.api.baseURL : '';
        const res = await fetch(`${base}/api/backup/clear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ table, password })
        });

        const result = await res.json();

        if (!res.ok) {
            errDiv.textContent = result.error || 'Ошибка';
            errDiv.classList.remove('hidden');
            return;
        }

        closeClearTableModal();
        backupLog(`✅ Очищено "${_clearTableNames[table] || table}": удалено ${result.deleted} записей`, 'success');

        // Перезагружаем данные
        await loadInitialData();

    } catch (err) {
        errDiv.textContent = 'Ошибка: ' + err.message;
        errDiv.classList.remove('hidden');
    }
}


// ===================== ИМПОРТ ИЗ СТАРОГО ПРОЕКТА =====================

async function importLegacyBackup() {
    const fileInput = document.getElementById('importLegacyFile');
    if (!fileInput || !fileInput.files[0]) {
        alert('Выберите файл резервной копии старого проекта');
        return;
    }

    if (!confirm('Импортировать данные из старого проекта?\n\nДубликаты будут автоматически пропущены.\nСправочники (склады, клиенты, товары и т.д.) будут добавлены если их нет.')) return;

    try {
        backupLog('🔄 Чтение файла старого формата...');
        const text = await fileInput.files[0].text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            backupLog('❌ Ошибка: файл не является корректным JSON', 'error');
            return;
        }

        // Определяем корень данных
        const root = parsed.data || parsed;

        // Проверяем что это старый формат
        if (!root.years && !root.clients) {
            backupLog('❌ Файл не похож на backup старого проекта (нет полей years/clients)', 'error');
            return;
        }

        backupLog('📤 Отправка данных на сервер...');
        const token = localStorage.getItem('authToken');
        const base = window.api ? window.api.baseURL : '';

        const res = await fetch(`${base}/api/backup/import-legacy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(root)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Ошибка импорта');

        const r = result.imported;
        backupLog(`✅ Импорт завершён!`, 'success');
        backupLog(`📋 Справочники: фирмы +${r.companies}, склады +${r.warehouses}, товары +${r.products}, клиенты +${r.clients}, коалиции +${r.coalitions}`, 'success');
        backupLog(`📥 Приход: +${r.income.inserted} новых, пропущено ${r.income.skipped} дубликатов`, 'success');
        backupLog(`📤 Расход: +${r.expense.inserted} новых, пропущено ${r.expense.skipped} дубликатов`, 'success');
        backupLog(`💰 Погашения: +${r.payments.inserted} новых, пропущено ${r.payments.skipped} дубликатов`, 'success');

        // Перезагружаем данные
        await loadInitialData();

    } catch (err) {
        backupLog('❌ Ошибка: ' + err.message, 'error');
    }
}

// ===== TOAST УВЕДОМЛЕНИЯ =====

/**
 * Показать toast-уведомление
 * @param {string} message - текст сообщения
 * @param {'success'|'error'|'info'|'warning'} type - тип
 * @param {number} duration - мс (0 = не закрывать автоматически)
 */
window.showToast = function(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        const isMobile = window.innerWidth < 768;
        container.style.cssText = isMobile
            ? 'position:fixed;bottom:16px;left:8px;right:8px;z-index:9999;display:flex;flex-direction:column;gap:8px;'
            : 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px;';
        document.body.appendChild(container);
    }

    const colors = {
        success: '#16a34a',
        error:   '#dc2626',
        warning: '#d97706',
        info:    '#2563eb'
    };
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.style.cssText = `
        background:${colors[type] || colors.info};color:#fff;
        padding:12px 16px;border-radius:8px;
        box-shadow:0 4px 12px rgba(0,0,0,0.2);
        display:flex;align-items:flex-start;gap:10px;
        font-size:14px;line-height:1.4;
        animation:toastIn .25s ease;
        cursor:pointer;
    `;
    toast.innerHTML = `<span style="flex-shrink:0;font-size:16px">${icons[type] || icons.info}</span><span style="flex:1">${message}</span><span style="flex-shrink:0;opacity:.7;font-size:18px;line-height:1">&times;</span>`;

    const close = () => {
        toast.style.animation = 'toastOut .2s ease forwards';
        setTimeout(() => toast.remove(), 200);
    };
    toast.addEventListener('click', close);
    if (duration > 0) setTimeout(close, duration);

    container.appendChild(toast);

    // Добавляем CSS анимации один раз
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes toastIn  { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
            @keyframes toastOut { from { opacity:1; transform:translateX(0); }    to { opacity:0; transform:translateX(40px); } }
        `;
        document.head.appendChild(style);
    }
};

/**
 * Модальное подтверждение вместо confirm()
 * @returns {Promise<boolean>}
 */
window.showConfirm = function(message, title = 'Подтверждение') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:12px;padding:24px;max-width:420px;width:92%;box-shadow:0 8px 32px rgba(0,0,0,.2);">
                <h3 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1f2937">${title}</h3>
                <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.5">${message}</p>
                <div style="display:flex;gap:12px;justify-content:flex-end">
                    <button id="confirmNo"  style="padding:11px 22px;border:1px solid #d1d5db;border-radius:7px;background:#fff;cursor:pointer;font-size:15px;color:#374151;min-height:44px">Отмена</button>
                    <button id="confirmYes" style="padding:11px 22px;border:none;border-radius:7px;background:#dc2626;color:#fff;cursor:pointer;font-size:15px;font-weight:600;min-height:44px">Удалить</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#confirmYes').onclick = () => { overlay.remove(); resolve(true); };
        overlay.querySelector('#confirmNo').onclick  = () => { overlay.remove(); resolve(false); };
        overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
};

// ===== ИНДИКАТОР ЗАГРУЗКИ =====

window.showLoading = function(text = 'Загрузка...') {
    let el = document.getElementById('globalLoader');
    if (!el) {
        el = document.createElement('div');
        el.id = 'globalLoader';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.6);z-index:9998;display:flex;align-items:center;justify-content:center;';
        el.innerHTML = `<div style="background:#fff;border-radius:12px;padding:24px 32px;box-shadow:0 4px 20px rgba(0,0,0,.15);display:flex;align-items:center;gap:14px;">
            <div style="width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite"></div>
            <span id="globalLoaderText" style="font-size:15px;color:#374151;font-weight:500">${text}</span>
        </div>`;
        if (!document.getElementById('spinStyle')) {
            const s = document.createElement('style');
            s.id = 'spinStyle';
            s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(el);
    } else {
        const t = el.querySelector('#globalLoaderText');
        if (t) t.textContent = text;
        el.style.display = 'flex';
    }
};

window.hideLoading = function() {
    const el = document.getElementById('globalLoader');
    if (el) el.style.display = 'none';
};

// ===== ДЕБАУНС =====

/**
 * Возвращает дебаунс-обёртку функции
 */
window.debounce = function(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
};

// ===== СЧЁТЧИК ЗАПИСЕЙ =====

/**
 * Обновляет счётчик записей рядом с таблицей
 * @param {string} counterId - id элемента счётчика
 * @param {number} shown - отфильтровано
 * @param {number} total - всего
 */
window.updateRecordCount = function(counterId, shown, total) {
    const el = document.getElementById(counterId);
    if (!el) return;
    if (shown === total) {
        el.textContent = `Записей: ${total}`;
    } else {
        el.textContent = `Показано: ${shown} из ${total}`;
    }
};
