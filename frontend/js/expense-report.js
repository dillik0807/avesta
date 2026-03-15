/**
 * 📤 МОДУЛЬ ОТЧЕТА ПО РАСХОДУ ТОВАРОВ
 */

console.log('📤 Модуль отчета по расходу товаров загружен');

let currentExpenseReportData = [];

// Инициализация отчета
window.initExpenseReport = function() {
    console.log('📤 Инициализация отчета по расходу товаров');
    
    const dateFromInput = document.getElementById('expenseReportDateFrom');
    const dateToInput = document.getElementById('expenseReportDateTo');
    
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    loadExpenseReportFilters();
};

// Загрузка фильтров
function loadExpenseReportFilters() {
    const appData = window.appData;
    if (!appData) return;
    
    // Склады
    const warehouseSelect = document.getElementById('expenseReportWarehouse');
    if (warehouseSelect && appData.warehouses) {
        warehouseSelect.innerHTML = '<option value="">Все склады</option>';
        appData.warehouses.forEach(w => {
            warehouseSelect.innerHTML += `<option value="${w.name}">${w.name}</option>`;
        });
    }
    
    // Товары
    const productSelect = document.getElementById('expenseReportProduct');
    if (productSelect && appData.products) {
        productSelect.innerHTML = '<option value="">Все товары</option>';
        appData.products.forEach(p => {
            productSelect.innerHTML += `<option value="${p.name}">${p.name}</option>`;
        });
    }
    
    // Клиенты
    const clientSelect = document.getElementById('expenseReportClient');
    if (clientSelect && appData.clients) {
        clientSelect.innerHTML = '<option value="">Все клиенты</option>';
        appData.clients.forEach(c => {
            const name = typeof c === 'string' ? c : c.name;
            clientSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
    }
}

// Генерация отчета
window.generateExpenseReport = function() {
    console.log('📤 Генерация отчета по расходу товаров');
    
    const dateFrom = document.getElementById('expenseReportDateFrom')?.value;
    const dateTo = document.getElementById('expenseReportDateTo')?.value;
    const warehouse = document.getElementById('expenseReportWarehouse')?.value;
    const product = document.getElementById('expenseReportProduct')?.value;
    const client = document.getElementById('expenseReportClient')?.value;
    
    const yearData = window.getCurrentYearData();
    
    if (!yearData || !yearData.expense) {
        alert('Нет данных для отчета');
        return;
    }
    
    let filtered = yearData.expense.filter(item => {
        if (item.deleted) return false;
        
        const itemDate = item.date.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        if (warehouse && item.warehouse !== warehouse) return false;
        if (product && item.product !== product) return false;
        if (client && item.client !== client) return false;
        
        return true;
    });
    
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    currentExpenseReportData = filtered;
    
    displayExpenseReport(filtered);
};

// Отображение отчета
function displayExpenseReport(data) {
    const tbody = document.getElementById('expenseReportTableBody');
    const reportDiv = document.getElementById('expenseReportResults');
    
    if (!tbody || !reportDiv) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        reportDiv.classList.remove('hidden');
        updateExpenseReportTotals(0, 0, 0);
        return;
    }
    
    tbody.innerHTML = '';
    let totalQty = 0;
    let totalTons = 0;
    let totalSum = 0;
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const date = fmtDate(item.date);
        const qty = parseFloat(item.quantity || 0);
        const tons = parseFloat(item.tons || 0);
        const price = parseFloat(item.price || 0);
        const total = parseFloat(item.total || 0);
        
        totalQty += qty;
        totalTons += tons;
        totalSum += total;
        
        row.innerHTML = `
            <td class="p-3">${date}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3">${item.client || ''}</td>
            <td class="p-3 text-right">${qty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3 text-right">${price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3 text-right">${total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3 text-sm text-gray-500">${item.user || ''}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateExpenseReportTotals(totalQty, totalTons, totalSum);
    reportDiv.classList.remove('hidden');
}

// Обновление итогов
function updateExpenseReportTotals(qty, tons, sum) {
    const qtyEl = document.getElementById('expenseReportTotalQty');
    const tonsEl = document.getElementById('expenseReportTotalTons');
    const sumEl = document.getElementById('expenseReportTotalSum');
    
    if (qtyEl) qtyEl.textContent = qty.toLocaleString('ru-RU');
    if (tonsEl) tonsEl.textContent = tons.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    if (sumEl) sumEl.textContent = sum.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Печать
window.printExpenseReport = function() {
    if (currentExpenseReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    let totalQty = 0, totalTons = 0, totalSum = 0;
    let tableRows = '';
    
    currentExpenseReportData.forEach(item => {
        const date = fmtDate(item.date);
        const qty = parseFloat(item.quantity || 0);
        const tons = parseFloat(item.tons || 0);
        const price = parseFloat(item.price || 0);
        const total = parseFloat(item.total || 0);
        
        totalQty += qty;
        totalTons += tons;
        totalSum += total;
        
        tableRows += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${date}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.company || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.warehouse || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.product || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.client || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${qty.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Отчет по расходу товаров</title>
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
            <h1>📤 Отчет по расходу товаров</h1>
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Фирма</th>
                        <th>Склад</th>
                        <th>Товар</th>
                        <th>Клиент</th>
                        <th>Количество</th>
                        <th>Тонн</th>
                        <th>Цена</th>
                        <th>Сумма</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="totals">
                <p>ИТОГО Количество: ${totalQty.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Тонн: ${totalTons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</p>
                <p>ИТОГО Сумма: ${totalSum.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</p>
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
window.exportExpenseReportToExcel = function() {
    if (currentExpenseReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const data = currentExpenseReportData.map(item => ({
        'Дата': fmtDate(item.date),
        'Фирма': item.company || '',
        'Склад': item.warehouse || '',
        'Товар': item.product || '',
        'Клиент': item.client || '',
        'Количество': parseFloat(item.quantity || 0),
        'Тонн': parseFloat(item.tons || 0),
        'Цена': parseFloat(item.price || 0),
        'Сумма': parseFloat(item.total || 0),
        'Примечания': item.notes || '',
        'Пользователь': item.user || ''
    }));
    
    const ws = jsonToSheetWithTextDate(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Расход товаров');
    
    const dateFrom = document.getElementById('expenseReportDateFrom')?.value || '';
    const dateTo = document.getElementById('expenseReportDateTo')?.value || '';
    const username = window.currentUser?.username || 'user';
    const filename = dateFrom && dateTo 
        ? `Отчет_по_расходу_товаров_${dateFrom}_${dateTo}_${username}.xlsx`
        : `Отчет_по_расходу_товаров_${new Date().toISOString().split('T')[0]}_${username}.xlsx`;
    
    XLSX.writeFile(wb, filename);
};

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateExpenseReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', window.generateExpenseReport);
    }
    
    const printBtn = document.getElementById('printExpenseReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.printExpenseReport);
    }
    
    const excelBtn = document.getElementById('exportExpenseReportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', window.exportExpenseReportToExcel);
    }
});

console.log('✅ expense-report.js инициализирован');
