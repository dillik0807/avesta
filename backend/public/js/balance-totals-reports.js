/**
 * 📦📊 ОТЧЕТЫ: СВОД ОСТАТКОВ И ИТОГИ ВАГОНОВ
 */

// ===== СВОД ОСТАТКОВ =====

window.updateBalanceSummary = function() {
    console.log('📦 Обновление свода остатков...');
    
    const tbody = document.getElementById('balanceSummaryTableBody');
    if (!tbody) return;
    
    const selectedGroups = Array.from(document.querySelectorAll('#balanceGroupsList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedWarehouses = Array.from(document.querySelectorAll('#balanceWarehousesList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedProducts = Array.from(document.querySelectorAll('#balanceProductsList input[type="checkbox"]:checked')).map(cb => cb.value);
    
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        updateBalanceSummaryTotals(0, 0, 0, 0);
        return;
    }
    
    const balances = {};
    
    if (yearData.income) {
        yearData.income.forEach(item => {
            if (item.deleted) return;
            
            // Фильтр по группе складов
            if (selectedGroups.length > 0) {
                const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
                if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) return;
            }
            
            // Фильтр по складу
            if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) return;
            
            // Фильтр по товару
            if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) return;
            
            const key = `${item.warehouse}|${item.company}|${item.product}`;
            if (!balances[key]) {
                balances[key] = { 
                    warehouse: item.warehouse, 
                    company: item.company, 
                    product: item.product, 
                    incomeQty: 0, 
                    expenseQty: 0,
                    incomeTons: 0, 
                    expenseTons: 0 
                };
            }
            balances[key].incomeQty += parseFloat(item.qty_fact || 0);
            balances[key].incomeTons += parseFloat(item.weight_tons || 0);
        });
    }
    
    if (yearData.expense) {
        yearData.expense.forEach(item => {
            if (item.deleted) return;
            
            // Фильтр по группе складов
            if (selectedGroups.length > 0) {
                const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
                if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) return;
            }
            
            // Фильтр по складу
            if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) return;
            
            // Фильтр по товару
            if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) return;
            
            const key = `${item.warehouse}|${item.company}|${item.product}`;
            if (!balances[key]) {
                balances[key] = { 
                    warehouse: item.warehouse, 
                    company: item.company, 
                    product: item.product, 
                    incomeQty: 0, 
                    expenseQty: 0,
                    incomeTons: 0, 
                    expenseTons: 0 
                };
            }
            balances[key].expenseQty += parseFloat(item.quantity || 0);
            balances[key].expenseTons += parseFloat(item.tons || 0);
        });
    }
    
    const rows = Object.values(balances).sort((a, b) => {
        return (a.warehouse || '').localeCompare(b.warehouse || '', 'ru') ||
               (a.company  || '').localeCompare(b.company  || '', 'ru') ||
               (a.product  || '').localeCompare(b.product  || '', 'ru');
    });
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        updateBalanceSummaryTotals(0, 0, 0, 0);
        return;
    }
    
    // Подсчет общих итогов
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBalance = 0;
    let totalBalanceTons = 0;
    
    tbody.innerHTML = '';
    rows.forEach(item => {
        const balanceQty = item.incomeQty - item.expenseQty;
        const balanceTons = item.incomeTons - item.expenseTons;
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3 text-right">${item.incomeQty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${item.expenseQty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right ${balanceQty < 0 ? 'text-red-600' : ''}">${balanceQty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right ${balanceTons < 0 ? 'text-red-600' : ''}">${balanceTons.toLocaleString('ru-RU', {minimumFractionDigits: 3})}</td>
        `;
        tbody.appendChild(row);
        
        // Суммируем итоги
        totalIncome += item.incomeQty;
        totalExpense += item.expenseQty;
        totalBalance += balanceQty;
        totalBalanceTons += balanceTons;
    });
    
    // Обновляем строку итогов
    updateBalanceSummaryTotals(totalIncome, totalExpense, totalBalance, totalBalanceTons);
};

// Обновление строки итогов
function updateBalanceSummaryTotals(income, expense, balance, balanceTons) {
    const totalIncomeEl = document.getElementById('balanceTotalIncome');
    const totalExpenseEl = document.getElementById('balanceTotalExpense');
    const totalBalanceEl = document.getElementById('balanceTotalBalance');
    const totalBalanceTonsEl = document.getElementById('balanceTotalBalanceTons');
    
    if (totalIncomeEl) totalIncomeEl.textContent = income.toLocaleString('ru-RU');
    if (totalExpenseEl) totalExpenseEl.textContent = expense.toLocaleString('ru-RU');
    if (totalBalanceEl) totalBalanceEl.textContent = balance.toLocaleString('ru-RU');
    if (totalBalanceTonsEl) totalBalanceTonsEl.textContent = balanceTons.toLocaleString('ru-RU', {minimumFractionDigits: 3});
}

window.printBalanceSummary = function() {
    window.print();
};

window.exportBalanceSummaryToExcel = function() {
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const selectedGroups = Array.from(document.querySelectorAll('#balanceGroupsList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedWarehouses = Array.from(document.querySelectorAll('#balanceWarehousesList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedProducts = Array.from(document.querySelectorAll('#balanceProductsList input[type="checkbox"]:checked')).map(cb => cb.value);
    
    const balances = {};
    
    if (yearData.income) {
        yearData.income.forEach(item => {
            if (item.deleted) return;
            if (selectedGroups.length > 0) {
                const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
                if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) return;
            }
            if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) return;
            if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) return;
            
            const key = `${item.warehouse}|${item.company}|${item.product}`;
            if (!balances[key]) {
                balances[key] = { 
                    warehouse: item.warehouse, 
                    company: item.company, 
                    product: item.product, 
                    incomeQty: 0, 
                    expenseQty: 0,
                    incomeTons: 0, 
                    expenseTons: 0 
                };
            }
            balances[key].incomeQty += parseFloat(item.qty_fact || 0);
            balances[key].incomeTons += parseFloat(item.weight_tons || 0);
        });
    }
    
    if (yearData.expense) {
        yearData.expense.forEach(item => {
            if (item.deleted) return;
            if (selectedGroups.length > 0) {
                const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
                if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) return;
            }
            if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) return;
            if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) return;
            
            const key = `${item.warehouse}|${item.company}|${item.product}`;
            if (!balances[key]) {
                balances[key] = { 
                    warehouse: item.warehouse, 
                    company: item.company, 
                    product: item.product, 
                    incomeQty: 0, 
                    expenseQty: 0,
                    incomeTons: 0, 
                    expenseTons: 0 
                };
            }
            balances[key].expenseQty += parseFloat(item.quantity || 0);
            balances[key].expenseTons += parseFloat(item.tons || 0);
        });
    }
    
    const data = Object.values(balances).map(item => ({
        'Склад': item.warehouse,
        'Фирма': item.company,
        'Товар': item.product,
        'Приход': item.incomeQty,
        'Расход': item.expenseQty,
        'Остаток': item.incomeQty - item.expenseQty,
        'Остаток тонн': item.incomeTons - item.expenseTons
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Свод Остатков');
    XLSX.writeFile(wb, `Свод_Остатков_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ===== ИТОГИ ВАГОНОВ =====

window.updateWagonTotals = function() {
    console.log('📊 Обновление итогов вагонов...');
    
    const tbody = document.getElementById('wagonTotalsTableBody');
    if (!tbody) return;
    
    const selectedGroups = Array.from(document.querySelectorAll('#totalsGroupsList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedWarehouses = Array.from(document.querySelectorAll('#totalsWarehousesList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedProducts = Array.from(document.querySelectorAll('#totalsProductsList input[type="checkbox"]:checked')).map(cb => cb.value);
    
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData || !yearData.income) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        updateWagonTotalsSummary(0, 0, 0, 0, 0);
        return;
    }
    
    const totals = {};
    
    yearData.income.forEach(item => {
        if (item.deleted) return;
        
        // Фильтр по группе складов
        if (selectedGroups.length > 0) {
            const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
            if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) return;
        }
        
        // Фильтр по складу
        if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) return;
        
        // Фильтр по товару
        if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) return;
        
        const key = `${item.product}|${item.company}|${item.warehouse}`;
        if (!totals[key]) {
            totals[key] = { 
                product: item.product, 
                company: item.company, 
                warehouse: item.warehouse, 
                wagons: 0, 
                qtyDoc: 0,
                qtyFact: 0,
                difference: 0,
                weight: 0 
            };
        }
        totals[key].wagons += 1;
        totals[key].qtyDoc += parseFloat(item.qty_doc || 0);
        totals[key].qtyFact += parseFloat(item.qty_fact || 0);
        totals[key].difference += parseFloat(item.difference || 0);
        totals[key].weight += parseFloat(item.weight_tons || 0);
    });
    
    const rows = Object.values(totals).sort((a, b) => {
        return (a.product   || '').localeCompare(b.product   || '', 'ru') ||
               (a.company   || '').localeCompare(b.company   || '', 'ru') ||
               (a.warehouse || '').localeCompare(b.warehouse || '', 'ru');
    });
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        updateWagonTotalsSummary(0, 0, 0, 0, 0);
        return;
    }
    
    // Подсчет общих итогов
    let totalWagons = 0;
    let totalQtyDoc = 0;
    let totalQtyFact = 0;
    let totalDifference = 0;
    let totalWeight = 0;
    
    tbody.innerHTML = '';
    rows.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3 text-right">${item.wagons}</td>
            <td class="p-3 text-right">${item.qtyDoc.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${item.qtyFact.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${item.difference.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${item.weight.toLocaleString('ru-RU', {minimumFractionDigits: 3})}</td>
        `;
        tbody.appendChild(row);
        
        // Суммируем итоги
        totalWagons += item.wagons;
        totalQtyDoc += item.qtyDoc;
        totalQtyFact += item.qtyFact;
        totalDifference += item.difference;
        totalWeight += item.weight;
    });
    
    // Обновляем строку итогов
    updateWagonTotalsSummary(totalWagons, totalQtyDoc, totalQtyFact, totalDifference, totalWeight);
};

// Обновление строки итогов
function updateWagonTotalsSummary(wagons, qtyDoc, qtyFact, difference, weight) {
    const totalWagonsEl = document.getElementById('totalWagonsCount');
    const totalQtyDocEl = document.getElementById('totalQtyDoc');
    const totalQtyFactEl = document.getElementById('totalQtyFact');
    const totalDifferenceEl = document.getElementById('totalDifference');
    const totalWeightEl = document.getElementById('totalWeight');
    
    if (totalWagonsEl) totalWagonsEl.textContent = wagons.toLocaleString('ru-RU');
    if (totalQtyDocEl) totalQtyDocEl.textContent = qtyDoc.toLocaleString('ru-RU');
    if (totalQtyFactEl) totalQtyFactEl.textContent = qtyFact.toLocaleString('ru-RU');
    if (totalDifferenceEl) totalDifferenceEl.textContent = difference.toLocaleString('ru-RU');
    if (totalWeightEl) totalWeightEl.textContent = weight.toLocaleString('ru-RU', {minimumFractionDigits: 3});
}

window.printWagonTotals = function() {
    window.print();
};

window.exportWagonTotalsToExcel = function() {
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData || !yearData.income) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const selectedGroups = Array.from(document.querySelectorAll('#totalsGroupsList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedWarehouses = Array.from(document.querySelectorAll('#totalsWarehousesList input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedProducts = Array.from(document.querySelectorAll('#totalsProductsList input[type="checkbox"]:checked')).map(cb => cb.value);
    
    const totals = {};
    
    yearData.income.forEach(item => {
        if (item.deleted) return;
        if (selectedGroups.length > 0) {
            const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
            if (!warehouseObj || !selectedGroups.includes(warehouseObj.warehouse_group)) return;
        }
        if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) return;
        if (selectedProducts.length > 0 && !selectedProducts.includes(item.product)) return;
        
        const key = `${item.product}|${item.company}|${item.warehouse}`;
        if (!totals[key]) {
            totals[key] = { 
                product: item.product, 
                company: item.company, 
                warehouse: item.warehouse, 
                wagons: 0, 
                qtyDoc: 0,
                qtyFact: 0,
                difference: 0,
                weight: 0 
            };
        }
        totals[key].wagons += 1;
        totals[key].qtyDoc += parseFloat(item.qty_doc || 0);
        totals[key].qtyFact += parseFloat(item.qty_fact || 0);
        totals[key].difference += parseFloat(item.difference || 0);
        totals[key].weight += parseFloat(item.weight_tons || 0);
    });
    
    const data = Object.values(totals).map(item => ({
        'Товар': item.product,
        'Фирма': item.company,
        'Склад': item.warehouse,
        'Количество вагонов': item.wagons,
        'Приход по док': item.qtyDoc,
        'Приход по факт': item.qtyFact,
        'Разница': item.difference,
        'Вес тонн': item.weight
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Итоги Вагонов');
    XLSX.writeFile(wb, `Итоги_Вагонов_${new Date().toISOString().split('T')[0]}.xlsx`);
};

console.log('✅ balance-totals-reports.js загружен');
