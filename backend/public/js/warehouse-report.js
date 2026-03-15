/**
 * 🏢 МОДУЛЬ ОТЧЕТА ПО СКЛАДАМ
 */

console.log('🏢 Модуль отчета по складам загружен');

let currentWarehouseReportData = [];

// Инициализация отчета
window.initWarehouseReport = function() {
    console.log('🏢 Инициализация отчета по складам');
    
    const dateFromInput = document.getElementById('warehouseReportDateFrom');
    const dateToInput = document.getElementById('warehouseReportDateTo');
    
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    loadWarehouseReportFilters();
};

// Загрузка фильтров
function loadWarehouseReportFilters() {
    const appData = window.appData;
    if (!appData) return;
    
    // Склады
    const warehouseSelect = document.getElementById('warehouseReportWarehouse');
    if (warehouseSelect && appData.warehouses) {
        warehouseSelect.innerHTML = '<option value="">Все склады</option>';
        appData.warehouses.forEach(w => {
            warehouseSelect.innerHTML += `<option value="${w.name}">${w.name}</option>`;
        });
    }
    
    // Товары
    const productSelect = document.getElementById('warehouseReportProduct');
    if (productSelect && appData.products) {
        productSelect.innerHTML = '<option value="">Все товары</option>';
        appData.products.forEach(p => {
            productSelect.innerHTML += `<option value="${p.name}">${p.name}</option>`;
        });
    }
}

// Генерация отчета
window.generateWarehouseReport = function() {
    console.log('🏢 Генерация отчета по складам');
    
    const dateFrom = document.getElementById('warehouseReportDateFrom')?.value;
    const dateTo = document.getElementById('warehouseReportDateTo')?.value;
    const warehouse = document.getElementById('warehouseReportWarehouse')?.value;
    const product = document.getElementById('warehouseReportProduct')?.value;
    
    const yearData = window.getCurrentYearData();
    
    if (!yearData) {
        alert('Нет данных для отчета');
        return;
    }
    
    // Собираем данные по складам и товарам
    const warehouseData = {};
    
    // Приход
    if (yearData.income) {
        yearData.income.forEach(item => {
            if (item.deleted) return;
            
            const itemDate = item.date.split('T')[0];
            if (dateFrom && itemDate < dateFrom) return;
            if (dateTo && itemDate > dateTo) return;
            if (warehouse && item.warehouse !== warehouse) return;
            if (product && item.product !== product) return;
            
            const key = `${item.company}|${item.warehouse}|${item.product}`;
            if (!warehouseData[key]) {
                warehouseData[key] = {
                    company: item.company,
                    warehouse: item.warehouse,
                    product: item.product,
                    incomeQty: 0,
                    expenseQty: 0,
                    balanceQty: 0,
                    incomeTons: 0,
                    expenseTons: 0,
                    balanceTons: 0
                };
            }
            
            warehouseData[key].incomeQty += parseFloat(item.qty_fact || 0);
            warehouseData[key].incomeTons += parseFloat(item.weight_tons || 0);
        });
    }
    
    // Расход
    if (yearData.expense) {
        yearData.expense.forEach(item => {
            if (item.deleted) return;
            
            const itemDate = item.date.split('T')[0];
            if (dateFrom && itemDate < dateFrom) return;
            if (dateTo && itemDate > dateTo) return;
            if (warehouse && item.warehouse !== warehouse) return;
            if (product && item.product !== product) return;
            
            const key = `${item.company}|${item.warehouse}|${item.product}`;
            if (!warehouseData[key]) {
                warehouseData[key] = {
                    company: item.company,
                    warehouse: item.warehouse,
                    product: item.product,
                    incomeQty: 0,
                    expenseQty: 0,
                    balanceQty: 0,
                    incomeTons: 0,
                    expenseTons: 0,
                    balanceTons: 0
                };
            }
            
            warehouseData[key].expenseQty += parseFloat(item.quantity || 0);
            warehouseData[key].expenseTons += parseFloat(item.tons || 0);
        });
    }
    
    // Вычисляем остатки
    const reportData = Object.values(warehouseData).map(item => ({
        ...item,
        balanceQty: item.incomeQty - item.expenseQty,
        balanceTons: item.incomeTons - item.expenseTons
    }));
    
    // Сортируем по фирме, складу и товару
    reportData.sort((a, b) => {
        if (a.company !== b.company) {
            return (a.company || '').localeCompare(b.company || '');
        }
        if (a.warehouse !== b.warehouse) {
            return a.warehouse.localeCompare(b.warehouse);
        }
        return a.product.localeCompare(b.product);
    });
    
    currentWarehouseReportData = reportData;
    displayWarehouseReport(reportData);
};

// Отображение отчета
function displayWarehouseReport(data) {
    const tbody = document.getElementById('warehouseReportTableBody');
    const reportDiv = document.getElementById('warehouseReportResults');
    
    if (!tbody || !reportDiv) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        reportDiv.classList.remove('hidden');
        updateWarehouseReportTotals(0, 0, 0, 0);
        return;
    }
    
    tbody.innerHTML = '';
    let totalIncomeQty = 0;
    let totalExpenseQty = 0;
    let totalBalanceQty = 0;
    let totalBalanceTons = 0;
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        totalIncomeQty += item.incomeQty;
        totalExpenseQty += item.expenseQty;
        totalBalanceQty += item.balanceQty;
        totalBalanceTons += item.balanceTons;
        
        // Цвет для остатка
        let balanceClass = '';
        if (item.balanceQty > 0) balanceClass = 'text-green-600 font-bold';
        else if (item.balanceQty < 0) balanceClass = 'text-red-600 font-bold';
        else balanceClass = 'text-gray-500';
        
        row.innerHTML = `
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse}</td>
            <td class="p-3">${item.product}</td>
            <td class="p-3 text-right">${item.incomeQty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${item.expenseQty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right ${balanceClass}">${item.balanceQty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right ${balanceClass}">${item.balanceTons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateWarehouseReportTotals(totalIncomeQty, totalExpenseQty, totalBalanceQty, totalBalanceTons);
    reportDiv.classList.remove('hidden');
}

// Обновление итогов
function updateWarehouseReportTotals(incomeQty, expenseQty, balanceQty, balanceTons) {
    const incomeEl = document.getElementById('warehouseReportTotalIncome');
    const expenseEl = document.getElementById('warehouseReportTotalExpense');
    const balanceEl = document.getElementById('warehouseReportTotalBalance');
    const balanceTonsEl = document.getElementById('warehouseReportTotalBalanceTons');
    
    if (incomeEl) incomeEl.textContent = incomeQty.toLocaleString('ru-RU');
    if (expenseEl) expenseEl.textContent = expenseQty.toLocaleString('ru-RU');
    if (balanceEl) balanceEl.textContent = balanceQty.toLocaleString('ru-RU');
    if (balanceTonsEl) balanceTonsEl.textContent = balanceTons.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Печать
window.printWarehouseReport = function() {
    if (currentWarehouseReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    let totalIncomeQty = 0, totalExpenseQty = 0, totalBalanceQty = 0, totalBalanceTons = 0;
    let tableRows = '';
    
    currentWarehouseReportData.forEach(item => {
        totalIncomeQty += item.incomeQty;
        totalExpenseQty += item.expenseQty;
        totalBalanceQty += item.balanceQty;
        totalBalanceTons += item.balanceTons;
        
        let balanceStyle = '';
        if (item.balanceQty > 0) balanceStyle = 'color: green; font-weight: bold;';
        else if (item.balanceQty < 0) balanceStyle = 'color: red; font-weight: bold;';
        else balanceStyle = 'color: gray;';
        
        tableRows += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.company || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.warehouse}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.product}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.incomeQty.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.expenseQty.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; ${balanceStyle}">${item.balanceQty.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; ${balanceStyle}">${item.balanceTons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Отчет по складам</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { text-align: center; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background-color: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: left; }
                td { padding: 8px; border: 1px solid #ddd; }
                .totals { margin-top: 20px; font-weight: bold; }
                @media print { body { margin: 15mm; } }
            </style>
        </head>
        <body>
            <h1>🏢 Отчет по складам</h1>
            <table>
                <thead>
                    <tr>
                        <th>Фирма</th>
                        <th>Склад</th>
                        <th>Товар</th>
                        <th>Приход</th>
                        <th>Расход</th>
                        <th>Остаток</th>
                        <th>Остаток тонн</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="totals">
                <p>ИТОГО Приход: ${totalIncomeQty.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Расход: ${totalExpenseQty.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Остаток: ${totalBalanceQty.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Остаток тонн: ${totalBalanceTons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};

// Экспорт в Excel
window.exportWarehouseReportToExcel = function() {
    if (currentWarehouseReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const data = currentWarehouseReportData.map(item => ({
        'Фирма': item.company || '',
        'Склад': item.warehouse,
        'Товар': item.product,
        'Приход': item.incomeQty,
        'Расход': item.expenseQty,
        'Остаток': item.balanceQty,
        'Остаток тонн': item.balanceTons
    }));
    
    const ws = jsonToSheetWithTextDate(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчет по складам');
    
    const username = window.currentUser?.username || 'user';
    XLSX.writeFile(wb, `Отчет_по_складам_${new Date().toISOString().split('T')[0]}_${username}.xlsx`);
};

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateWarehouseReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', window.generateWarehouseReport);
    }
    
    const printBtn = document.getElementById('printWarehouseReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.printWarehouseReport);
    }
    
    const excelBtn = document.getElementById('exportWarehouseReportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', window.exportWarehouseReportToExcel);
    }
});

console.log('✅ warehouse-report.js инициализирован');
