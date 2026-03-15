/**
 * 🔄 АДАПТЕР ДЛЯ СОВМЕСТИМОСТИ
 * Преобразует вызовы Firebase в PostgreSQL API
 */

// Глобальные данные приложения
window.appData = {
    years: {},
    companies: [],
    warehouses: [],
    products: [],
    clients: [],
    coalitions: [],
    users: []
};

window.currentYear = new Date().getFullYear(); // Автоматически текущий год
window.currentUser = null;

// Функция загрузки года по умолчанию из базы данных
async function loadDefaultYear() {
    try {
        if (!window.api.token) {
            console.log('⚠️ Пользователь не авторизован, используем текущий год');
            return;
        }

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
}

// Эмуляция Firebase функций
window.firebaseDB = {};
window.firebaseAuth = {};
window.firebaseRefs = {
    ref: () => ({}),
    set: async () => {},
    get: async () => ({ exists: () => false, val: () => null }),
    onValue: () => {},
    push: () => ({ key: Date.now().toString() })
};

// Функция загрузки данных
window.loadData = async function() {
    try {
        console.log('📥 Загрузка данных из PostgreSQL...');
        if (typeof window.showLoading === 'function') window.showLoading('Загрузка данных...');
        
        const year = window.currentYear || new Date().getFullYear();
        const data = await window.api.getData(year);
        
        // Преобразуем данные в формат appData
        if (!window.appData.years) {
            window.appData.years = {};
        }
        
        window.appData.years[year] = {
            income: data.income || [],
            expense: data.expense || [],
            payments: data.payments || [],
            partners: data.partners || []
        };
        
        window.appData.companies = data.companies || [];
        window.appData.warehouses = data.warehouses || [];
        window.appData.products = data.products || [];
        window.appData.clients = data.clients || [];
        window.appData.coalitions = data.coalitions || [];
        
        console.log('✅ Данные загружены:', {
            companies: window.appData.companies.length,
            warehouses: window.appData.warehouses.length,
            products: window.appData.products.length,
            clients: window.appData.clients.length,
            coalitions: window.appData.coalitions.length,
            income: data.income?.length || 0,
            expense: data.expense?.length || 0,
            payments: data.payments?.length || 0,
            partners: data.partners?.length || 0
        });
        
        // Обновляем справочники в формах если функции доступны
        if (typeof window.loadIncomeDictionaries === 'function') {
            window.loadIncomeDictionaries();
        }
        if (typeof window.loadExpenseDictionaries === 'function') {
            window.loadExpenseDictionaries();
        }
        if (typeof window.loadPaymentDictionaries === 'function') {
            window.loadPaymentDictionaries();
        }
        if (typeof window.loadPartnerDictionaries === 'function') {
            window.loadPartnerDictionaries();
        }
        
        // Обновляем селектор годов после загрузки данных
        if (typeof window.updateYearSelector === 'function') {
            window.updateYearSelector();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        return false;
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
};

// Функция сохранения данных (теперь через API)
window.saveData = async function() {
    console.log('💾 Данные сохраняются автоматически через API');
    // В PostgreSQL версии данные сохраняются сразу при добавлении/редактировании
    return true;
};

// Получение данных текущего года
window.getCurrentYearData = function() {
    const year = window.currentYear || new Date().getFullYear();
    if (!window.appData.years[year]) {
        window.appData.years[year] = {
            income: [],
            expense: [],
            payments: [],
            partners: []
        };
    }
    return window.appData.years[year];
};

// Обновление всех таблиц
window.updateAllTables = function() {
    console.log('🔄 Обновление таблиц...');
    
    // Обновляем таблицы если они существуют
    if (typeof window.updateIncomeTable === 'function') {
        window.updateIncomeTable();
    }
    if (typeof window.updateExpenseTable === 'function') {
        window.updateExpenseTable();
    }
    if (typeof window.updatePaymentsTable === 'function') {
        window.updatePaymentsTable();
    }
    if (typeof window.updateDashboard === 'function') {
        window.updateDashboard();
    }
};

// Переключение года
window.switchYear = async function(year) {
    console.log('📅 Переключение на год:', year);
    const yearNum = parseInt(year);
    window.currentYear = yearNum;
    
    console.log('📅 Текущий год установлен:', window.currentYear);
    
    // Загружаем данные для нового года
    await window.loadData();
    
    console.log('📅 Данные загружены для года:', yearNum);
    
    // Обновляем интерфейс
    window.updateAllTables();
    
    // Обновляем отображение текущего года
    const displays = document.querySelectorAll('#currentYearDisplay, #mobileCurrentYearDisplay');
    displays.forEach(el => {
        if (el) el.textContent = year;
    });
    
    console.log('📅 Отображение года обновлено');
    
    // Обновляем селектор
    updateYearSelector();
    
    console.log('📅 Селектор обновлен');
    
    // Обновляем список годов и статистику
    if (typeof window.updateYearsList === 'function') {
        window.updateYearsList();
        console.log('📅 Список годов обновлен');
    }
    if (typeof window.updateYearsStats === 'function') {
        window.updateYearsStats();
        console.log('📅 Статистика годов обновлена');
    }
    
    console.log('✅ Переключение на год завершено:', year);
};

// Добавление нового года
window.addNewYear = async function() {
    // Проверяем права доступа
    if (!window.currentUser || window.currentUser.role !== 'admin') {
        alert('Только администраторы могут создавать новые года!');
        return;
    }
    
    const year = prompt('Введите год (например, 2027):');
    if (!year) return;
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2050) {
        alert('Неверный формат года');
        return;
    }
    
    // Создаем год в appData (будет доступен до обновления страницы)
    if (!window.appData.years[yearNum]) {
        window.appData.years[yearNum] = {
            income: [],
            expense: [],
            payments: [],
            partners: []
        };
    }
    
    // Обновляем селектор
    updateYearSelector();
    
    // Переключаемся на новый год
    await window.switchYear(yearNum);
    
    // Обновляем список годов и статистику
    if (typeof window.updateYearsList === 'function') {
        window.updateYearsList();
    }
    if (typeof window.updateYearsStats === 'function') {
        window.updateYearsStats();
    }
    
    alert(`Год ${yearNum} создан! Добавьте данные (приходы/расходы) для этого года, чтобы он сохранился после обновления страницы.`);
};

// Добавление года из интерфейса
window.addNewYearFromInterface = async function() {
    // Проверяем права доступа
    if (!window.currentUser || window.currentUser.role !== 'admin') {
        alert('Только администраторы могут создавать новые года!');
        return;
    }
    
    const input = document.getElementById('newYearInput');
    if (!input || !input.value) {
        alert('Введите год');
        return;
    }
    
    const yearNum = parseInt(input.value);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2050) {
        alert('Неверный формат года (должен быть от 2020 до 2050)');
        return;
    }
    
    // Создаем год в appData (будет доступен до обновления страницы)
    if (!window.appData.years[yearNum]) {
        window.appData.years[yearNum] = {
            income: [],
            expense: [],
            payments: [],
            partners: []
        };
    }
    
    // Очищаем поле ввода
    input.value = '';
    
    // Обновляем селектор
    updateYearSelector();
    
    // Переключаемся на новый год
    await window.switchYear(yearNum);
    
    // Обновляем список годов и статистику
    if (typeof window.updateYearsList === 'function') {
        window.updateYearsList();
    }
    if (typeof window.updateYearsStats === 'function') {
        window.updateYearsStats();
    }
    
    alert(`Год ${yearNum} создан! Добавьте данные (приходы/расходы) для этого года, чтобы он сохранился после обновления страницы.`);
};

// Обновление селектора годов
window.updateYearSelector = function() {
    const selector = document.getElementById('yearSelector');
    const currentYearDisplay = document.getElementById('currentYearDisplay');
    
    if (!selector) return;
    
    // Получаем все года из appData и добавляем текущий год
    const yearsSet = new Set(Object.keys(window.appData.years));
    const currentYear = new Date().getFullYear();
    
    // Добавляем текущий год и несколько соседних годов для выбора
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        yearsSet.add(year.toString());
    }
    
    // Сортируем по убыванию
    const years = Array.from(yearsSet).sort((a, b) => b - a);
    
    // Обновляем селектор
    selector.innerHTML = '';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === window.currentYear.toString()) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
    
    // Обновляем отображение текущего года
    if (currentYearDisplay) {
        currentYearDisplay.textContent = window.currentYear;
    }
};

// Установка года по умолчанию
window.setDefaultYear = async function(year, isChecked) {
    console.log('📅 setDefaultYear вызвана:', { year, isChecked });
    
    try {
        if (isChecked) {
            // Сохраняем год по умолчанию в базу данных
            const response = await window.api.setDefaultYear(year);
            console.log('✅ Год по умолчанию установлен в БД:', year);
            console.log('💾 Ответ сервера:', response);
        } else {
            // Убираем год по умолчанию
            const response = await window.api.clearDefaultYear();
            console.log('❌ Год по умолчанию удален из БД');
            console.log('💾 Ответ сервера:', response);
        }
        
        // Обновляем список годов (это перерисует чекбоксы с правильным состоянием)
        if (typeof window.updateYearsList === 'function') {
            await window.updateYearsList();
        }
    } catch (error) {
        console.error('❌ Ошибка при установке года по умолчанию:', error);
        alert('Ошибка: ' + error.message);
    }
};

// Обновление списка годов
window.updateYearsList = async function() {
    const yearsList = document.getElementById('yearsList');
    if (!yearsList) {
        console.warn('⚠️ yearsList элемент не найден');
        return;
    }
    
    // Получаем все года из appData и добавляем текущий год
    const yearsSet = new Set(Object.keys(window.appData.years));
    const currentYear = new Date().getFullYear();
    
    // Добавляем текущий год и несколько соседних годов
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        yearsSet.add(year.toString());
    }
    
    const years = Array.from(yearsSet).sort((a, b) => b - a);
    
    // Получаем год по умолчанию из базы данных
    let defaultYear = null;
    try {
        const settings = await window.api.getUserSettings();
        defaultYear = settings.default_year ? settings.default_year.toString() : null;
        console.log('📅 Текущий год по умолчанию из БД:', defaultYear);
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить год по умолчанию:', error);
    }
    
    yearsList.innerHTML = '';
    years.forEach(year => {
        const yearDiv = document.createElement('div');
        yearDiv.className = 'flex items-center justify-between p-2 bg-gray-50 rounded';
        
        const isCurrent = year === window.currentYear.toString();
        const isDefault = year === defaultYear;
        const hasData = window.appData.years[year] && 
            (window.appData.years[year].income?.length > 0 || 
             window.appData.years[year].expense?.length > 0 ||
             window.appData.years[year].payments?.length > 0);
        
        // Создаем уникальный ID для чекбокса
        const checkboxId = `defaultYear${year}`;
        
        yearDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <input type="checkbox" 
                    id="${checkboxId}" 
                    ${isDefault ? 'checked' : ''} 
                    onchange="setDefaultYear(${year}, this.checked)"
                    class="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    title="Установить как год по умолчанию при входе">
                <label for="${checkboxId}" class="font-medium ${isCurrent ? 'text-blue-600' : ''} cursor-pointer">
                    ${year} ${isCurrent ? '(текущий)' : ''} ${isDefault ? '⭐' : ''} ${hasData ? '✓' : '(пусто)'}
                </label>
            </div>
            <button onclick="switchYear(${year})" class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50">
                Переключить
            </button>
        `;
        
        yearsList.appendChild(yearDiv);
    });
    
    console.log('✅ Список годов обновлен, всего годов:', years.length);
};

// Обновление статистики по годам
window.updateYearsStats = function() {
    const yearsStats = document.getElementById('yearsStats');
    if (!yearsStats) return;
    
    // Получаем все года из appData и добавляем текущий год
    const yearsSet = new Set(Object.keys(window.appData.years));
    const currentYear = new Date().getFullYear();
    
    // Добавляем текущий год и несколько соседних годов
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        yearsSet.add(year.toString());
    }
    
    const years = Array.from(yearsSet).sort((a, b) => b - a);
    
    yearsStats.innerHTML = '';
    years.forEach(year => {
        const yearData = window.appData.years[year] || { income: [], expense: [], payments: [] };
        const incomeCount = yearData.income?.length || 0;
        const expenseCount = yearData.expense?.length || 0;
        const paymentsCount = yearData.payments?.length || 0;
        
        const statDiv = document.createElement('div');
        statDiv.className = 'bg-gray-50 p-4 rounded';
        statDiv.innerHTML = `
            <div class="font-bold text-lg mb-2">${year}</div>
            <div class="text-sm text-gray-600 space-y-1">
                <div>📥 Приходов: ${incomeCount}</div>
                <div>📤 Расходов: ${expenseCount}</div>
                <div>💰 Погашений: ${paymentsCount}</div>
            </div>
        `;
        
        yearsStats.appendChild(statDiv);
    });
};

// Функция обновления статуса синхронизации
window.updateSyncStatus = function(status, text) {
    const indicators = document.querySelectorAll('#syncIndicator, #syncIndicatorDesktop');
    const texts = document.querySelectorAll('#syncText, #syncTextDesktop');
    
    const colors = {
        'connected': 'bg-green-500',
        'syncing': 'bg-yellow-500',
        'offline': 'bg-gray-400',
        'error': 'bg-red-500'
    };
    
    indicators.forEach(el => {
        if (el) {
            el.className = `w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`;
        }
    });
    
    texts.forEach(el => {
        if (el) {
            el.textContent = text || status;
        }
    });
};

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация адаптера...');
    
    // Проверяем авторизацию
    if (!window.api.token) {
        console.log('⚠️ Пользователь не авторизован');
        return;
    }
    
    // Загружаем год по умолчанию из базы данных
    await loadDefaultYear();
    
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
        }
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить список годов:', error);
    }
    
    // Загружаем данные для текущего года
    await window.loadData();
    
    // Инициализируем селектор годов
    if (typeof window.updateYearSelector === 'function') {
        window.updateYearSelector();
    }
    
    // Обновляем статус
    window.updateSyncStatus('connected', 'PostgreSQL');
    
    console.log('✅ Адаптер инициализирован');
});

console.log('✅ Адаптер загружен');
