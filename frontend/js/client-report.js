/**
 * 👤 МОДУЛЬ ОТЧЕТА РАСХОД ПО КЛИЕНТАМ
 */

console.log('👤 Модуль отчета расход по клиентам загружен');

let currentClientReportData = [];

// Инициализация отчета
window.initClientReport = function() {
    console.log('👤 Инициализация отчета расход по клиентам');
    
    const dateFromInput = document.getElementById('clientReportDateFrom');
    const dateToInput = document.getElementById('clientReportDateTo');
    
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    loadClientReportFilters();
};

// Загрузка фильтров
function loadClientReportFilters() {
    const appData = window.appData;
    const yearData = window.getCurrentYearData();
    if (!appData || !yearData) return;
    
    // Склады
    const warehouseSelect = document.getElementById('clientReportWarehouse');
    if (warehouseSelect && appData.warehouses) {
        warehouseSelect.innerHTML = '<option value="">Все склады</option>';
        appData.warehouses.forEach(w => {
            warehouseSelect.innerHTML += `<option value="${w.name}">${w.name}</option>`;
        });
    }
    
    // Клиенты
    const clientSelect = document.getElementById('clientReportClient');
    if (clientSelect && yearData.expense) {
        const clients = new Set();
        yearData.expense.forEach(item => {
            if (!item.deleted && item.client) {
                clients.add(item.client);
            }
        });
        
        clientSelect.innerHTML = '<option value="">Все клиенты</option>';
        Array.from(clients).sort().forEach(client => {
            clientSelect.innerHTML += `<option value="${client}">${client}</option>`;
        });
    }
}

// Генерация отчета
window.generateClientReport = function() {
    console.log('👤 Генерация отчета расход по клиентам');
    
    const dateFrom = document.getElementById('clientReportDateFrom')?.value;
    const dateTo = document.getElementById('clientReportDateTo')?.value;
    const warehouse = document.getElementById('clientReportWarehouse')?.value;
    const client = document.getElementById('clientReportClient')?.value;
    
    const yearData = window.getCurrentYearData();
    
    if (!yearData || !yearData.expense) {
        alert('Нет данных для отчета');
        return;
    }
    
    // Фильтруем расходы
    let filtered = yearData.expense.filter(item => {
        if (item.deleted || !item.client) return false;
        
        const itemDate = item.date.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        if (warehouse && item.warehouse !== warehouse) return false;
        if (client && item.client !== client) return false;
        
        return true;
    });
    
    // Сортируем по дате (новые сначала)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    currentClientReportData = filtered;
    displayClientReport(filtered);
};

// Отображение отчета
function displayClientReport(data) {
    const tbody = document.getElementById('clientReportTableBody');
    const reportDiv = document.getElementById('clientReportResults');
    
    if (!tbody || !reportDiv) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        reportDiv.classList.remove('hidden');
        updateClientReportTotals(0, 0, 0);
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
            <td class="p-3">${item.coalition || ''}</td>
            <td class="p-3">${item.number || ''}</td>
            <td class="p-3">${item.client || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3 text-right">${qty.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3 text-right">${price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3 text-right">${total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3">${item.notes || ''}</td>
            <td class="p-3 text-sm text-gray-500">${item.user || ''}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateClientReportTotals(totalQty, totalTons, totalSum);
    reportDiv.classList.remove('hidden');
}

// Обновление итогов
function updateClientReportTotals(qty, tons, sum) {
    const qtyEl = document.getElementById('clientReportTotalQty');
    const tonsEl = document.getElementById('clientReportTotalTons');
    const sumEl = document.getElementById('clientReportTotalSum');
    
    if (qtyEl) qtyEl.textContent = qty.toLocaleString('ru-RU');
    if (tonsEl) tonsEl.textContent = tons.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    if (sumEl) sumEl.textContent = sum.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Печать
window.printClientReport = function() {
    if (currentClientReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    let totalQty = 0, totalTons = 0, totalSum = 0;
    let tableRows = '';
    
    currentClientReportData.forEach(item => {
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
                <td style="padding: 8px; border: 1px solid #ddd;">${item.coalition || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.number || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.client || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.product || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.company || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.warehouse || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${qty.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.notes || ''}</td>
            </tr>
        `;
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Расход по клиентам</title>
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
            <h1>👤 Расход по клиентам</h1>
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Коалица</th>
                        <th>Номер</th>
                        <th>Клиент</th>
                        <th>Товар</th>
                        <th>Фирма</th>
                        <th>Склад</th>
                        <th>Количество</th>
                        <th>Вес тонн</th>
                        <th>Цена</th>
                        <th>Сумма</th>
                        <th>Примечания</th>
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
window.exportClientReportToExcel = function() {
    if (currentClientReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const data = currentClientReportData.map(item => ({
        'Дата': fmtDate(item.date),
        'Коалица': item.coalition || '',
        'Номер': item.number || '',
        'Клиент': item.client || '',
        'Товар': item.product || '',
        'Фирма': item.company || '',
        'Склад': item.warehouse || '',
        'Количество': parseFloat(item.quantity || 0),
        'Вес тонн': parseFloat(item.tons || 0),
        'Цена': parseFloat(item.price || 0),
        'Сумма': parseFloat(item.total || 0),
        'Примечания': item.notes || '',
        'Пользователь': item.user || ''
    }));
    
    const ws = jsonToSheetWithTextDate(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Расход по клиентам');
    
    const username = window.currentUser?.username || 'user';
    XLSX.writeFile(wb, `Расход_по_клиентам_${new Date().toISOString().split('T')[0]}_${username}.xlsx`);
};

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateClientReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', window.generateClientReport);
    }
    
    const printBtn = document.getElementById('printClientReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.printClientReport);
    }
    
    const excelBtn = document.getElementById('exportClientReportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', window.exportClientReportToExcel);
    }
});

console.log('✅ client-report.js инициализирован');
