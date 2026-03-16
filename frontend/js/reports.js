/**
 * 📊 МОДУЛЬ ОТЧЕТОВ
 */

console.log('📊 Модуль отчетов загружен');

// ===== СВОД ВАГОНОВ =====
window.updateWagonSummary = function() {
    console.log('📊 Обновление свода вагонов...');
    
    const tbody = document.getElementById('wagonSummaryTableBody');
    if (!tbody) return;
    
    // Получаем выбранные фильтры из чекбоксов
    const selectedGroups = Array.from(document.querySelectorAll('#wagonGroupsList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const selectedWarehouses = Array.from(document.querySelectorAll('#wagonWarehousesList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const selectedProducts = Array.from(document.querySelectorAll('#wagonProductsList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData || !yearData.income) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        updateWagonSummaryTotals(0, 0, 0);
        return;
    }
    
    let filtered = yearData.income.filter(item => {
        if (item.deleted) return false;
        
        // Фильтр по группе складов
        if (selectedGroups.length > 0) {
            const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
            if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) {
                return false;
            }
        }
        
        // Фильтр по складу
        if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) {
            return false;
        }
        
        // Фильтр по товарам
        if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) {
            return false;
        }
        
        return true;
    });
    
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        updateWagonSummaryTotals(0, 0, 0);
        return;
    }
    
    // Подсчет итогов
    let totalQtyDoc = 0;
    let totalQtyFact = 0;
    let totalWeight = 0;
    
    tbody.innerHTML = '';
    filtered.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const qtyDoc = parseFloat(item.qty_doc || 0);
        const qtyFact = parseFloat(item.qty_fact || 0);
        const weight = parseFloat(item.weight_tons || 0);
        
        row.innerHTML = `
            <td class="p-3">${item.wagon || ''}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3 text-right">${qtyDoc.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${qtyFact.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${weight.toLocaleString('ru-RU', {minimumFractionDigits: 3})}</td>
        `;
        tbody.appendChild(row);
        
        // Суммируем итоги
        totalQtyDoc += qtyDoc;
        totalQtyFact += qtyFact;
        totalWeight += weight;
    });
    
    // Обновляем строку итогов
    updateWagonSummaryTotals(totalQtyDoc, totalQtyFact, totalWeight);
};

// Обновление строки итогов
function updateWagonSummaryTotals(qtyDoc, qtyFact, weight) {
    const totalQtyDocEl = document.getElementById('wagonTotalQtyDoc');
    const totalQtyFactEl = document.getElementById('wagonTotalQtyFact');
    const totalWeightEl = document.getElementById('wagonTotalWeight');
    
    if (totalQtyDocEl) totalQtyDocEl.textContent = qtyDoc.toLocaleString('ru-RU');
    if (totalQtyFactEl) totalQtyFactEl.textContent = qtyFact.toLocaleString('ru-RU');
    if (totalWeightEl) totalWeightEl.textContent = weight.toLocaleString('ru-RU', {minimumFractionDigits: 3});
}

// Загрузка справочников для фильтров свода вагонов
window.loadWagonSummaryFilters = function() {
    console.log('📋 Загрузка фильтров свода вагонов...');
    
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData || !appData) {
        console.error('❌ Нет данных');
        return;
    }
    
    console.log('📊 Данные года:', yearData);
    console.log('📊 Данные приложения:', appData);
    console.log('🏢 Склады в appData:', appData.warehouses);
    console.log('📦 Товары в appData:', appData.products);
    
    // Загружаем группы складов
    const groupsSelect = document.getElementById('wagonSummaryWarehouseGroups');
    console.log('🔍 Элемент groupsSelect:', groupsSelect);
    
    if (groupsSelect) {
        if (appData.warehouses && appData.warehouses.length > 0) {
            const groups = [...new Set(appData.warehouses
                .map(w => w.warehouse_group)
                .filter(g => g))].sort();
            
            console.log('🏢 Группы складов:', groups);
            
            groupsSelect.innerHTML = '';
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group;
                option.textContent = group;
                groupsSelect.appendChild(option);
            });
            
            console.log(`✅ Загружено ${groups.length} групп складов`);
            
            // Обработчик изменения групп - обновляет список складов
            groupsSelect.addEventListener('change', function() {
                updateWarehousesBySelectedGroups();
            });
        } else {
            console.error('❌ Нет данных складов');
        }
    } else {
        console.error('❌ Не найден select групп (wagonSummaryWarehouseGroups)');
    }
    
    // Загружаем все склады
    updateWarehousesBySelectedGroups();
    
    // Загружаем товары
    const productsSelect = document.getElementById('wagonSummaryProducts');
    console.log('🔍 Элемент productsSelect:', productsSelect);
    
    if (productsSelect) {
        if (appData.products && appData.products.length > 0) {
            const products = [...appData.products].sort((a, b) => a.name.localeCompare(b.name));
            
            console.log('📦 Товары:', products);
            
            productsSelect.innerHTML = '';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.name;
                option.textContent = product.name;
                productsSelect.appendChild(option);
            });
            
            console.log(`✅ Загружено ${products.length} товаров`);
        } else {
            console.error('❌ Нет данных товаров');
        }
    } else {
        console.error('❌ Не найден select товаров (wagonSummaryProducts)');
    }
};

// Обновление списка складов по выбранным группам
window.updateWarehousesBySelectedGroups = function() {
    console.log('🔄 Обновление списка складов...');
    
    const appData = window.appData;
    if (!appData) {
        console.error('❌ Нет данных приложения');
        return;
    }
    
    const groupsSelect = document.getElementById('wagonSummaryWarehouseGroups');
    const warehousesSelect = document.getElementById('wagonSummaryWarehouses');
    
    console.log('🔍 Элемент warehousesSelect:', warehousesSelect);
    
    if (!warehousesSelect) {
        console.error('❌ Не найден select складов (wagonSummaryWarehouses)');
        return;
    }
    
    if (!appData.warehouses || appData.warehouses.length === 0) {
        console.error('❌ Нет данных складов');
        return;
    }
    
    const selectedGroups = groupsSelect ? Array.from(groupsSelect.selectedOptions).map(opt => opt.value) : [];
    console.log('🏢 Выбранные группы:', selectedGroups);
    
    let filteredWarehouses = appData.warehouses;
    if (selectedGroups.length > 0) {
        filteredWarehouses = appData.warehouses.filter(w => selectedGroups.includes(w.warehouse_group));
    }
    
    filteredWarehouses = [...filteredWarehouses].sort((a, b) => a.name.localeCompare(b.name));
    console.log('🏭 Отфильтрованные склады:', filteredWarehouses);
    
    warehousesSelect.innerHTML = '';
    filteredWarehouses.forEach(warehouse => {
        const option = document.createElement('option');
        option.value = warehouse.name;
        option.textContent = warehouse.name;
        warehousesSelect.appendChild(option);
    });
    
    console.log(`✅ Загружено ${filteredWarehouses.length} складов`);
};

// Сброс всех фильтров
window.clearAllWagonFilters = function() {
    const groupsSelect = document.getElementById('wagonSummaryWarehouseGroups');
    const warehousesSelect = document.getElementById('wagonSummaryWarehouses');
    const productsSelect = document.getElementById('wagonSummaryProducts');
    
    if (groupsSelect) groupsSelect.selectedIndex = -1;
    if (warehousesSelect) warehousesSelect.selectedIndex = -1;
    if (productsSelect) productsSelect.selectedIndex = -1;
    
    updateWarehousesBySelectedGroups();
    updateWagonSummary();
};

// Печать свода вагонов
window.printWagonSummary = function() {
    window.print();
};

// Экспорт в Excel
window.exportWagonSummaryToExcel = function() {
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData || !yearData.income) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const selectedGroups = Array.from(document.querySelectorAll('#wagonGroupsList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const selectedWarehouses = Array.from(document.querySelectorAll('#wagonWarehousesList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const selectedProducts = Array.from(document.querySelectorAll('#wagonProductsList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    let filtered = yearData.income.filter(item => {
        if (item.deleted) return false;
        
        if (selectedGroups.length > 0) {
            const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
            if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) {
                return false;
            }
        }
        
        if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) {
            return false;
        }
        
        if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) {
            return false;
        }
        
        return true;
    });
    
    const data = filtered.map(item => ({
        'Вагон': item.wagon || '',
        'Фирма': item.company || '',
        'Склад': item.warehouse || '',
        'Товар': item.product || '',
        'По док': parseFloat(item.qty_doc || 0),
        'Факт': parseFloat(item.qty_fact || 0),
        'Тонн': parseFloat(item.weight_tons || 0)
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Свод Вагонов');
    XLSX.writeFile(wb, `Свод_Вагонов_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ===== СВОД ОСТАТКОВ =====
window.updateBalanceSummary = function() {
    console.log('📦 Обновление свода остатков...');
    
    const tbody = document.getElementById('balanceSummaryTableBody');
    if (!tbody) return;
    
    const dateFrom = document.getElementById('balanceSummaryDateFrom')?.value;
    const dateTo = document.getElementById('balanceSummaryDateTo')?.value;
    
    const yearData = window.getCurrentYearData();
    if (!yearData) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    const balances = {};
    
    if (yearData.income) {
        yearData.income.forEach(item => {
            if (item.deleted) return;
            const itemDate = item.date.split('T')[0];
            if ((dateFrom && itemDate < dateFrom) || (dateTo && itemDate > dateTo)) return;
            
            const key = `${item.warehouse}|${item.product}`;
            if (!balances[key]) {
                balances[key] = { warehouse: item.warehouse, product: item.product, income: 0, expense: 0 };
            }
            balances[key].income += parseFloat(item.weight_tons || 0);
        });
    }
    
    if (yearData.expense) {
        yearData.expense.forEach(item => {
            if (item.deleted) return;
            const itemDate = item.date.split('T')[0];
            if ((dateFrom && itemDate < dateFrom) || (dateTo && itemDate > dateTo)) return;
            
            const key = `${item.warehouse}|${item.product}`;
            if (!balances[key]) {
                balances[key] = { warehouse: item.warehouse, product: item.product, income: 0, expense: 0 };
            }
            balances[key].expense += parseFloat(item.tons || 0);
        });
    }
    
    const rows = Object.values(balances);
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    rows.forEach(item => {
        const balance = item.income - item.expense;
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3 text-right">${item.income.toLocaleString('ru-RU', {minimumFractionDigits: 3})}</td>
            <td class="p-3 text-right">${item.expense.toLocaleString('ru-RU', {minimumFractionDigits: 3})}</td>
            <td class="p-3 text-right ${balance < 0 ? 'text-red-600' : ''}">${balance.toLocaleString('ru-RU', {minimumFractionDigits: 3})}</td>
        `;
        tbody.appendChild(row);
    });
};

// ===== ОТЧЁТ ПО ДОЛГАМ =====
window.updateDebtReport = async function() {
    console.log('💳 Обновление отчёта по долгам...');
    
    const tbody = document.getElementById('debtReportTableBody');
    if (!tbody) return;
    
    const hidePositiveBalances = document.getElementById('hidePositiveBalancesCheckbox')?.checked || false;

    let expenseData, paymentsData;

    // Для завсклада загружаем долги по всем складам (без фильтра)
    const role = window.currentUser?.role;
    if (role === 'warehouse') {
        try {
            const year = window.currentYear || new Date().getFullYear();
            const token = localStorage.getItem('authToken');
            const base = window.api ? window.api.baseURL : '';
            const res = await fetch(`${base}/api/data/${year}/debts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const fullData = await res.json();
            expenseData = fullData.expense || [];
            paymentsData = fullData.payments || [];
        } catch(e) {
            console.error('Ошибка загрузки долгов:', e);
            expenseData = [];
            paymentsData = [];
        }
    } else {
        const yearData = window.getCurrentYearData();
        if (!yearData) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
            updateDebtReportTotals(0, 0, 0);
            updateDebtReportSummary(0, 0, 0, 0, 0);
            return;
        }
        expenseData = yearData.expense || [];
        paymentsData = yearData.payments || [];
    }
    
    const debts = {};
    
    // Собираем расходы
    if (expenseData) {
        expenseData.forEach(item => {
            if (item.deleted || !item.client) return;
            if (!debts[item.client]) debts[item.client] = { expense: 0, payment: 0 };
            debts[item.client].expense += parseFloat(item.total || 0);
        });
    }
    
    // Собираем погашения
    if (paymentsData) {
        paymentsData.forEach(item => {
            if (item.deleted || !item.client) return;
            if (!debts[item.client]) debts[item.client] = { expense: 0, payment: 0 };
            debts[item.client].payment += parseFloat(item.amount || 0);
        });
    }
    
    // Преобразуем в массив
    let allRows = Object.entries(debts).map(([client, data]) => ({
        client,
        expense: data.expense,
        payment: data.payment,
        debt: data.payment - data.expense  // погашения - расход = долг
    }));
    
    // Подсчет ОБЩИХ итогов (для блока "Итоги для информации") - ДО фильтрации
    let summaryTotalExpense = 0;
    let summaryTotalPayment = 0;
    let summaryTotalOverpayments = 0;  // Сумма всех переплат (положительные балансы)
    let summaryTotalDebts = 0;         // Сумма всех долгов (отрицательные балансы)
    let summaryFinalBalance = 0;
    
    allRows.forEach(item => {
        summaryTotalExpense += item.expense;
        summaryTotalPayment += item.payment;
        summaryFinalBalance += item.debt;
        
        if (item.debt > 0) {
            summaryTotalOverpayments += item.debt;
        } else if (item.debt < 0) {
            summaryTotalDebts += Math.abs(item.debt);
        }
    });
    
    // Фильтруем положительные остатки если галочка установлена
    let rows = allRows;
    if (hidePositiveBalances) {
        rows = allRows.filter(item => item.debt < 0);  // Показываем только отрицательные (долги)
    }
    
    // Сортируем по имени клиента (алфавитный порядок)
    rows.sort((a, b) => a.client.localeCompare(b.client, 'ru'));
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        updateDebtReportTotals(0, 0, 0);
        updateDebtReportSummary(summaryTotalExpense, summaryTotalPayment, summaryTotalOverpayments, summaryTotalDebts, summaryFinalBalance);
        return;
    }
    
    // Подсчет итогов ТАБЛИЦЫ (для tfoot) - ПОСЛЕ фильтрации
    let totalExpense = 0;
    let totalPayment = 0;
    let totalDebt = 0;
    
    tbody.innerHTML = '';
    rows.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="p-3">
                <span class="text-blue-600 hover:text-blue-800 cursor-pointer underline font-medium"
                    onclick="window.openClientCardModal('${item.client.replace(/'/g, "\\'")}')">${item.client}</span>
            </td>
            <td class="p-3 text-right">${item.expense.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</td>
            <td class="p-3 text-right">${item.payment.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</td>
            <td class="p-3 text-right ${item.debt < 0 ? 'text-red-600 font-bold' : 'text-green-600'}">${item.debt.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</td>
        `;
        tbody.appendChild(row);
        
        totalExpense += item.expense;
        totalPayment += item.payment;
        totalDebt += item.debt;
    });
    
    // Обновляем итоги таблицы (tfoot)
    updateDebtReportTotals(totalExpense, totalPayment, totalDebt);
    
    // Обновляем блок "Итоги для информации" (всегда показывает ВСЕ данные)
    updateDebtReportSummary(summaryTotalExpense, summaryTotalPayment, summaryTotalOverpayments, summaryTotalDebts, summaryFinalBalance);
};

// Обновление итогов отчета по долгам
function updateDebtReportTotals(expense, payment, debt) {
    const totalExpenseEl = document.getElementById('debtReportTotalExpense');
    const totalPaymentEl = document.getElementById('debtReportTotalPayment');
    const totalDebtEl = document.getElementById('debtReportTotalDebt');
    
    if (totalExpenseEl) totalExpenseEl.textContent = expense.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    if (totalPaymentEl) totalPaymentEl.textContent = payment.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    if (totalDebtEl) totalDebtEl.textContent = debt.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Обновление блока "Итоги для информации"
function updateDebtReportSummary(totalExpense, totalPayment, totalOverpayments, totalDebts, finalBalance) {
    const summaryTotalExpenseEl = document.getElementById('summaryTotalExpense');
    const summaryTotalPaymentEl = document.getElementById('summaryTotalPayment');
    const summaryOverpaymentsEl = document.getElementById('summaryOverpayments');
    const summaryDebtsEl = document.getElementById('summaryDebts');
    const summaryFinalBalanceEl = document.getElementById('summaryFinalBalance');
    
    if (summaryTotalExpenseEl) {
        summaryTotalExpenseEl.textContent = totalExpense.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    }
    if (summaryTotalPaymentEl) {
        summaryTotalPaymentEl.textContent = totalPayment.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    }
    if (summaryOverpaymentsEl) {
        summaryOverpaymentsEl.textContent = totalOverpayments.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    }
    if (summaryDebtsEl) {
        summaryDebtsEl.textContent = totalDebts.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    }
    if (summaryFinalBalanceEl) {
        summaryFinalBalanceEl.textContent = finalBalance.toLocaleString('ru-RU', {minimumFractionDigits: 2});
        // Меняем цвет в зависимости от баланса
        if (finalBalance < 0) {
            summaryFinalBalanceEl.className = 'text-3xl font-bold text-red-600';
        } else if (finalBalance > 0) {
            summaryFinalBalanceEl.className = 'text-3xl font-bold text-green-600';
        } else {
            summaryFinalBalanceEl.className = 'text-3xl font-bold text-gray-600';
        }
    }
}

// Печать отчета по долгам
window.printDebtReport = function() {
    window.print();
};

// Экспорт отчета по долгам в Excel
window.exportDebtReportToExcel = function() {
    const yearData = window.getCurrentYearData();
    if (!yearData) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const hidePositiveBalances = document.getElementById('hidePositiveBalancesCheckbox')?.checked || false;
    
    const debts = {};
    
    if (yearData.expense) {
        yearData.expense.forEach(item => {
            if (item.deleted || !item.client) return;
            if (!debts[item.client]) {
                debts[item.client] = { expense: 0, payment: 0 };
            }
            debts[item.client].expense += parseFloat(item.total || 0);
        });
    }
    
    if (yearData.payments) {
        yearData.payments.forEach(item => {
            if (item.deleted || !item.client) return;
            if (!debts[item.client]) {
                debts[item.client] = { expense: 0, payment: 0 };
            }
            debts[item.client].payment += parseFloat(item.amount || 0);
        });
    }
    
    let rows = Object.entries(debts).map(([client, data]) => ({
        'Клиент': client,
        'Расход ($)': data.expense.toFixed(2),
        'Погашено ($)': data.payment.toFixed(2),
        'Долг ($)': (data.payment - data.expense).toFixed(2)  // погашения - расход = долг
    }));
    
    if (hidePositiveBalances) {
        rows = rows.filter(item => parseFloat(item['Долг ($)']) < 0);  // Показываем только отрицательные (долги)
    }
    
    // Сортируем по имени клиента (алфавитный порядок)
    rows.sort((a, b) => a['Клиент'].localeCompare(b['Клиент'], 'ru'));
    
    if (rows.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёт по долгам');
    
    const filterText = hidePositiveBalances ? '_без_положительных' : '';
    XLSX.writeFile(wb, `Отчёт_по_долгам${filterText}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ===== ИТОГИ ВАГОНОВ =====
window.updateWagonTotals = function() {
    console.log('📊 Обновление итогов вагонов...');
    
    const tbody = document.getElementById('wagonTotalsTableBody');
    if (!tbody) return;
    
    const dateFrom = document.getElementById('wagonTotalsDateFrom')?.value;
    const dateTo = document.getElementById('wagonTotalsDateTo')?.value;
    
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.income) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    const totals = {};
    
    yearData.income.forEach(item => {
        if (item.deleted) return;
        const itemDate = item.date.split('T')[0];
        if ((dateFrom && itemDate < dateFrom) || (dateTo && itemDate > dateTo)) return;
        
        const key = `${item.warehouse}|${item.product}`;
        if (!totals[key]) {
            totals[key] = { warehouse: item.warehouse, product: item.product, wagons: 0, weight: 0 };
        }
        totals[key].wagons += 1;
        totals[key].weight += parseFloat(item.weight_tons || 0);
    });
    
    const rows = Object.values(totals);
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    rows.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3 text-right">${item.wagons}</td>
            <td class="p-3 text-right">${item.weight.toLocaleString('ru-RU', {minimumFractionDigits: 3})}</td>
        `;
        tbody.appendChild(row);
    });
};

// Инициализация дат по умолчанию и кнопок обновления
document.addEventListener('DOMContentLoaded', function() {
    const year = window.currentYear || new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const dateInputs = [
        'balanceSummaryDateFrom', 'balanceSummaryDateTo',
        'debtReportDateFrom', 'debtReportDateTo',
        'wagonTotalsDateFrom', 'wagonTotalsDateTo'
    ];
    
    dateInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = id.includes('From') ? startDate : endDate;
        }
    });
    
    // Добавляем обработчики для кнопок обновления
    const wagonSummaryBtn = document.getElementById('updateWagonSummaryBtn');
    if (wagonSummaryBtn) {
        wagonSummaryBtn.addEventListener('click', window.updateWagonSummary);
    }
    
    const balanceSummaryBtn = document.getElementById('updateBalanceSummaryBtn');
    if (balanceSummaryBtn) {
        balanceSummaryBtn.addEventListener('click', window.updateBalanceSummary);
    }
    
    // Обработчики для отчета по долгам
    const hidePositiveBalancesCheckbox = document.getElementById('hidePositiveBalancesCheckbox');
    if (hidePositiveBalancesCheckbox) {
        hidePositiveBalancesCheckbox.addEventListener('change', window.updateDebtReport);
    }
    
    const printDebtReportBtn = document.getElementById('printDebtReportBtn');
    if (printDebtReportBtn) {
        printDebtReportBtn.addEventListener('click', window.printDebtReport);
    }
    
    const exportDebtReportExcelBtn = document.getElementById('exportDebtReportExcelBtn');
    if (exportDebtReportExcelBtn) {
        exportDebtReportExcelBtn.addEventListener('click', window.exportDebtReportToExcel);
    }
    
    const wagonTotalsBtn = document.getElementById('updateWagonTotalsBtn');
    if (wagonTotalsBtn) {
        wagonTotalsBtn.addEventListener('click', window.updateWagonTotals);
    }
    
    // Обработчики для печати и Excel в своде вагонов
    const printWagonBtn = document.getElementById('printWagonSummary');
    if (printWagonBtn) {
        printWagonBtn.addEventListener('click', window.printWagonSummary);
    }
    
    const excelWagonBtn = document.getElementById('excelWagonSummary');
    if (excelWagonBtn) {
        excelWagonBtn.addEventListener('click', window.exportWagonSummaryToExcel);
    }
    
    const clearWagonFiltersBtn = document.getElementById('clearWagonFiltersBtn');
    if (clearWagonFiltersBtn) {
        clearWagonFiltersBtn.addEventListener('click', window.clearAllWagonFilters);
    }
    
    // Обработчики для свода остатков
    const printBalanceBtn = document.getElementById('printBalanceSummary');
    if (printBalanceBtn) {
        printBalanceBtn.addEventListener('click', window.printBalanceSummary);
    }
    
    const excelBalanceBtn = document.getElementById('excelBalanceSummary');
    if (excelBalanceBtn) {
        excelBalanceBtn.addEventListener('click', window.exportBalanceSummaryToExcel);
    }
    
    const clearBalanceFiltersBtn = document.getElementById('clearBalanceFiltersBtn');
    if (clearBalanceFiltersBtn) {
        clearBalanceFiltersBtn.addEventListener('click', window.clearAllBalanceFilters);
    }
    
    // Обработчики для итогов вагонов
    const printTotalsBtn = document.getElementById('printWagonTotals');
    if (printTotalsBtn) {
        printTotalsBtn.addEventListener('click', window.printWagonTotals);
    }
    
    const excelTotalsBtn = document.getElementById('excelWagonTotals');
    if (excelTotalsBtn) {
        excelTotalsBtn.addEventListener('click', window.exportWagonTotalsToExcel);
    }
    
    const clearTotalsFiltersBtn = document.getElementById('clearTotalsFiltersBtn');
    if (clearTotalsFiltersBtn) {
        clearTotalsFiltersBtn.addEventListener('click', window.clearAllTotalsFilters);
    }
});

// Раздел "Отчёты" - обработчик кнопок
window.initReportButtons = function() {
    console.log('📋 Инициализация кнопок отчетов');
    
    const reportButtons = document.querySelectorAll('.report-btn');
    const reportsSection = document.getElementById('reports');
    const dailyReportSection = document.getElementById('daily-report');
    const paymentsReportSection = document.getElementById('payments-report');
    const expenseReportSection = document.getElementById('expense-report');
    const incomeReportSection = document.getElementById('income-report');
    const clientReportSection = document.getElementById('client-report');
    const warehouseReportSection = document.getElementById('warehouse-report');
    
    // Обработчик кнопки "Назад" для отчета за текущий день
    const backDailyBtn = document.getElementById('backToReportsFromDailyBtn');
    if (backDailyBtn) {
        backDailyBtn.addEventListener('click', function() {
            if (dailyReportSection) dailyReportSection.classList.remove('active');
            if (reportsSection) reportsSection.classList.add('active');
        });
    }
    
    // Обработчик кнопки "Назад" для отчета по погашениям
    const backBtn = document.getElementById('backToReportsListBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            if (paymentsReportSection) paymentsReportSection.classList.remove('active');
            if (reportsSection) reportsSection.classList.add('active');
        });
    }
    
    // Обработчик кнопки "Назад" для отчета по расходу
    const backExpenseBtn = document.getElementById('backToReportsFromExpenseBtn');
    if (backExpenseBtn) {
        backExpenseBtn.addEventListener('click', function() {
            if (expenseReportSection) expenseReportSection.classList.remove('active');
            if (reportsSection) reportsSection.classList.add('active');
        });
    }
    
    // Обработчик кнопки "Назад" для отчета по приходу
    const backIncomeBtn = document.getElementById('backToReportsFromIncomeBtn');
    if (backIncomeBtn) {
        backIncomeBtn.addEventListener('click', function() {
            if (incomeReportSection) incomeReportSection.classList.remove('active');
            if (reportsSection) reportsSection.classList.add('active');
        });
    }
    
    // Обработчик кнопки "Назад" для отчета по клиентам
    const backClientBtn = document.getElementById('backToReportsFromClientBtn');
    if (backClientBtn) {
        backClientBtn.addEventListener('click', function() {
            if (clientReportSection) clientReportSection.classList.remove('active');
            if (reportsSection) reportsSection.classList.add('active');
        });
    }
    
    // Обработчик кнопки "Назад" для отчета по складам
    const backWarehouseBtn = document.getElementById('backToReportsFromWarehouseBtn');
    if (backWarehouseBtn) {
        backWarehouseBtn.addEventListener('click', function() {
            if (warehouseReportSection) warehouseReportSection.classList.remove('active');
            if (reportsSection) reportsSection.classList.add('active');
        });
    }
    
    // Обработчик кнопки "Назад" для карточки клиента
    const backClientCardBtn = document.getElementById('backToReportsFromClientCardBtn');
    if (backClientCardBtn) {
        backClientCardBtn.addEventListener('click', function() {
            const clientCardSection = document.getElementById('client-card');
            if (clientCardSection) clientCardSection.classList.remove('active');
            if (reportsSection) reportsSection.classList.add('active');
        });
    }
    
    reportButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const reportType = this.getAttribute('data-report');
            
            // Скрываем секцию отчетов
            if (reportsSection) {
                reportsSection.classList.remove('active');
            }
            
            // Обработка отчета за текущий день
            if (reportType === 'daily-report') {
                if (dailyReportSection) {
                    dailyReportSection.classList.add('active');
                    if (typeof window.initDailyReport === 'function') {
                        window.initDailyReport();
                    }
                }
            }
            // Обработка отчета по погашениям
            else if (reportType === 'payments-report') {
                if (paymentsReportSection) {
                    paymentsReportSection.classList.add('active');
                    if (typeof window.initPaymentsReport === 'function') {
                        window.initPaymentsReport();
                    }
                }
            }
            // Обработка отчета по расходу товаров
            else if (reportType === 'product-expense') {
                if (expenseReportSection) {
                    expenseReportSection.classList.add('active');
                    if (typeof window.initExpenseReport === 'function') {
                        window.initExpenseReport();
                    }
                }
            }
            // Обработка отчета по приходу товаров
            else if (reportType === 'product-income') {
                if (incomeReportSection) {
                    incomeReportSection.classList.add('active');
                    if (typeof window.initIncomeReport === 'function') {
                        window.initIncomeReport();
                    }
                }
            }
            // Обработка отчета расход по клиентам
            else if (reportType === 'client-expense') {
                if (clientReportSection) {
                    clientReportSection.classList.add('active');
                    if (typeof window.initClientReport === 'function') {
                        window.initClientReport();
                    }
                }
            }
            // Обработка отчета по складам
            else if (reportType === 'warehouse-report') {
                if (warehouseReportSection) {
                    warehouseReportSection.classList.add('active');
                    if (typeof window.initWarehouseReport === 'function') {
                        window.initWarehouseReport();
                    }
                }
            }
            // Обработка карточки клиента
            else if (reportType === 'client-card') {
                const clientCardSection = document.getElementById('client-card');
                if (clientCardSection) {
                    clientCardSection.classList.add('active');
                    if (typeof window.initClientCard === 'function') {
                        window.initClientCard();
                    }
                }
            }
            // Для остальных отчетов показываем сообщение
            else {
                alert('Этот отчет временно недоступен. Используйте отдельные отчеты из меню:\n\n🚂 Свод Вагонов\n📦 Свод Остатков\n💳 Отчёт по долгам\n📊 Итоги Вагонов\n💰 Отчёт по погашениям\n📤 Отчёт по расходу товаров\n📥 Отчёт по приходу товаров\n👤 Расход по клиентам\n🏢 Отчёт по складам');
            }
        });
    });
};

console.log('✅ reports.js инициализирован');

// ========================================
// 👤 МОДАЛЬНАЯ КАРТОЧКА КЛИЕНТА ИЗ ДОЛГОВ
// ========================================

window.openClientCardModal = function(clientName) {
    // Удаляем старое модальное окно если есть
    const old = document.getElementById('clientCardModal');
    if (old) old.remove();

    const yearData = window.getCurrentYearData();
    if (!yearData) return;

    // Фильтруем данные по клиенту
    const expenses = (yearData.expense || []).filter(i => !i.deleted && i.client === clientName);
    const payments = (yearData.payments || []).filter(i => !i.deleted && i.client === clientName);

    const totalExpense = expenses.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const totalPayment = payments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const debt = totalPayment - totalExpense;
    const debtColor = debt < 0 ? 'text-red-600' : 'text-green-600';
    const fmt = (n) => parseFloat(n || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2});

    // Строки расходов
    const expenseRows = expenses.map(i => `
        <tr class="hover:bg-gray-50 text-sm">
            <td class="p-2">${(i.date||'').split('T')[0]}</td>
            <td class="p-2">${i.product||''}</td>
            <td class="p-2">${i.warehouse||''}</td>
            <td class="p-2 text-right">${fmt(i.quantity)}</td>
            <td class="p-2 text-right">${fmt(i.price)}</td>
            <td class="p-2 text-right font-medium">${fmt(i.total)}</td>
            <td class="p-2 text-gray-500">${i.notes||''}</td>
        </tr>`).join('');

    // Строки погашений
    const paymentRows = payments.map(i => `
        <tr class="hover:bg-gray-50 text-sm">
            <td class="p-2">${(i.date||'').split('T')[0]}</td>
            <td class="p-2 text-right">${fmt(i.somoni)}</td>
            <td class="p-2 text-right">${fmt(i.rate)}</td>
            <td class="p-2 text-right font-medium">${fmt(i.amount)}</td>
            <td class="p-2 text-gray-500">${i.notes||''}</td>
        </tr>`).join('');

    const modal = document.createElement('div');
    modal.id = 'clientCardModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-5xl my-4" id="clientCardModalContent">
            <!-- Заголовок -->
            <div class="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
                <h2 class="text-lg font-bold">👤 Карточка клиента: ${clientName}</h2>
                <div class="flex gap-2">
                    <button onclick="window.printClientCardModal()" 
                        class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50">
                        🖨️ Печать
                    </button>
                    <button onclick="window.exportClientCardModalExcel('${clientName.replace(/'/g, "\\'")}')"
                        class="bg-green-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-600">
                        📊 Excel
                    </button>
                    <button onclick="document.getElementById('clientCardModal').remove()"
                        class="bg-red-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-600">
                        ✕ Закрыть
                    </button>
                </div>
            </div>

            <div class="p-4" id="clientCardModalPrintArea">
                <!-- Сводка -->
                <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="bg-red-50 p-3 rounded text-center">
                        <div class="text-sm text-gray-500">Расход</div>
                        <div class="text-lg font-bold text-red-600">${fmt(totalExpense)} $</div>
                    </div>
                    <div class="bg-green-50 p-3 rounded text-center">
                        <div class="text-sm text-gray-500">Погашено</div>
                        <div class="text-lg font-bold text-green-600">${fmt(totalPayment)} $</div>
                    </div>
                    <div class="bg-gray-50 p-3 rounded text-center">
                        <div class="text-sm text-gray-500">Долг</div>
                        <div class="text-lg font-bold ${debtColor}">${fmt(debt)} $</div>
                    </div>
                </div>

                <!-- Расходы -->
                <h3 class="font-bold text-gray-700 mb-2">📤 Расходы (${expenses.length})</h3>
                <div class="overflow-x-auto mb-4">
                    <table class="w-full border-collapse text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2 text-left">Дата</th>
                                <th class="p-2 text-left">Товар</th>
                                <th class="p-2 text-left">Склад</th>
                                <th class="p-2 text-right">Кол-во</th>
                                <th class="p-2 text-right">Цена</th>
                                <th class="p-2 text-right">Сумма</th>
                                <th class="p-2 text-left">Примечания</th>
                            </tr>
                        </thead>
                        <tbody>${expenseRows || '<tr><td colspan="7" class="p-3 text-center text-gray-400">Нет данных</td></tr>'}</tbody>
                        <tfoot class="bg-gray-50 font-bold">
                            <tr>
                                <td colspan="5" class="p-2 text-right">ИТОГО:</td>
                                <td class="p-2 text-right">${fmt(totalExpense)} $</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Погашения -->
                <h3 class="font-bold text-gray-700 mb-2">💰 Погашения (${payments.length})</h3>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2 text-left">Дата</th>
                                <th class="p-2 text-right">Сомони</th>
                                <th class="p-2 text-right">Курс</th>
                                <th class="p-2 text-right">Сумма ($)</th>
                                <th class="p-2 text-left">Примечания</th>
                            </tr>
                        </thead>
                        <tbody>${paymentRows || '<tr><td colspan="5" class="p-3 text-center text-gray-400">Нет данных</td></tr>'}</tbody>
                        <tfoot class="bg-gray-50 font-bold">
                            <tr>
                                <td colspan="3" class="p-2 text-right">ИТОГО:</td>
                                <td class="p-2 text-right">${fmt(totalPayment)} $</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Закрытие по клику на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
};

// Печать карточки из модального окна
window.printClientCardModal = function() {
    const content = document.getElementById('clientCardModalPrintArea');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><meta charset="UTF-8"><title>Карточка клиента</title>
        <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ccc;padding:4px 8px}
        th{background:#f0f0f0}</style></head>
        <body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
};

// Excel из модального окна
window.exportClientCardModalExcel = function(clientName) {
    const yearData = window.getCurrentYearData();
    if (!yearData) return;

    const expenses = (yearData.expense || []).filter(i => !i.deleted && i.client === clientName);
    const payments = (yearData.payments || []).filter(i => !i.deleted && i.client === clientName);
    const totalExpense = expenses.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const totalPayment = payments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const debt = totalPayment - totalExpense;

    const wb = XLSX.utils.book_new();
    const rows = [];

    rows.push([`Карточка клиента: ${clientName}`]);
    rows.push([`Дата: ${new Date().toLocaleDateString('ru-RU')}`]);
    rows.push([]);
    rows.push(['Расход ($):', totalExpense.toFixed(2), 'Погашено ($):', totalPayment.toFixed(2), 'Долг ($):', debt.toFixed(2)]);
    rows.push([]);
    rows.push(['РАСХОДЫ']);
    rows.push(['Дата','Товар','Склад','Количество','Цена','Сумма','Примечания']);
    expenses.forEach(i => rows.push([
        (i.date||'').split('T')[0], i.product||'', i.warehouse||'',
        parseFloat(i.quantity||0), parseFloat(i.price||0), parseFloat(i.total||0), i.notes||''
    ]));
    rows.push(['','','','','ИТОГО:', totalExpense.toFixed(2),'']);
    rows.push([]);
    rows.push(['ПОГАШЕНИЯ']);
    rows.push(['Дата','Сомони','Курс','Сумма ($)','Примечания']);
    payments.forEach(i => rows.push([
        (i.date||'').split('T')[0], parseFloat(i.somoni||0), parseFloat(i.rate||0),
        parseFloat(i.amount||0), i.notes||''
    ]));
    rows.push(['','','ИТОГО:', totalPayment.toFixed(2),'']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, clientName.substring(0, 31));
    XLSX.writeFile(wb, `Карточка_${clientName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
