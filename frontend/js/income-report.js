/**
 * 📥 МОДУЛЬ ОТЧЕТА ПО ПРИХОДУ ТОВАРОВ
 */

console.log('📥 Модуль отчета по приходу товаров загружен');

let currentIncomeReportData = [];

// Инициализация отчета
window.initIncomeReport = function() {
    console.log('📥 Инициализация отчета по приходу товаров');
    
    const dateFromInput = document.getElementById('incomeReportDateFrom');
    const dateToInput = document.getElementById('incomeReportDateTo');
    
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    loadIncomeReportFilters();
};

// Загрузка фильтров
function loadIncomeReportFilters() {
    const appData = window.appData;
    if (!appData) return;
    
    // Склады
    const warehouseSelect = document.getElementById('incomeReportWarehouse');
    if (warehouseSelect && appData.warehouses) {
        warehouseSelect.innerHTML = '<option value="">Все склады</option>';
        appData.warehouses.forEach(w => {
            warehouseSelect.innerHTML += `<option value="${w.name}">${w.name}</option>`;
        });
    }
    
    // Товары
    const productSelect = document.getElementById('incomeReportProduct');
    if (productSelect && appData.products) {
        productSelect.innerHTML = '<option value="">Все товары</option>';
        appData.products.forEach(p => {
            productSelect.innerHTML += `<option value="${p.name}">${p.name}</option>`;
        });
    }
    
    // Фирмы
    const companySelect = document.getElementById('incomeReportCompany');
    if (companySelect && appData.companies) {
        companySelect.innerHTML = '<option value="">Все фирмы</option>';
        appData.companies.forEach(c => {
            companySelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    }
}

// Генерация отчета
window.generateIncomeReport = function() {
    console.log('📥 Генерация отчета по приходу товаров');
    
    const dateFrom = document.getElementById('incomeReportDateFrom')?.value;
    const dateTo = document.getElementById('incomeReportDateTo')?.value;
    const warehouse = document.getElementById('incomeReportWarehouse')?.value;
    const product = document.getElementById('incomeReportProduct')?.value;
    const company = document.getElementById('incomeReportCompany')?.value;
    
    const yearData = window.getCurrentYearData();
    
    if (!yearData || !yearData.income) {
        alert('Нет данных для отчета');
        return;
    }
    
    let filtered = yearData.income.filter(item => {
        if (item.deleted) return false;
        
        const itemDate = item.date.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        if (warehouse && item.warehouse !== warehouse) return false;
        if (product && item.product !== product) return false;
        if (company && item.company !== company) return false;
        
        return true;
    });
    
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    currentIncomeReportData = filtered;
    
    displayIncomeReport(filtered);
};

// Отображение отчета
function displayIncomeReport(data) {
    const tbody = document.getElementById('incomeReportTableBody');
    const reportDiv = document.getElementById('incomeReportResults');
    
    if (!tbody || !reportDiv) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        reportDiv.classList.remove('hidden');
        updateIncomeReportTotals(0, 0, 0);
        return;
    }
    
    tbody.innerHTML = '';
    let totalQtyDoc = 0;
    let totalQtyFact = 0;
    let totalTons = 0;
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const date = fmtDate(item.date);
        const qtyDoc = parseFloat(item.qty_doc || 0);
        const qtyFact = parseFloat(item.qty_fact || 0);
        const difference = qtyFact - qtyDoc;
        const tons = parseFloat(item.weight_tons || 0);
        
        totalQtyDoc += qtyDoc;
        totalQtyFact += qtyFact;
        totalTons += tons;
        
        row.innerHTML = `
            <td class="p-3">${date}</td>
            <td class="p-3">${item.wagon || ''}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3 text-right">${qtyDoc.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${qtyFact.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right ${difference !== 0 ? (difference > 0 ? 'text-green-600' : 'text-red-600') : ''}">${difference.toLocaleString('ru-RU')}</td>
            <td class="p-3 text-right">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3 text-sm text-gray-500">${item.user || ''}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateIncomeReportTotals(totalQtyDoc, totalQtyFact, totalTons);
    reportDiv.classList.remove('hidden');
}

// Обновление итогов
function updateIncomeReportTotals(qtyDoc, qtyFact, tons) {
    const qtyDocEl = document.getElementById('incomeReportTotalQtyDoc');
    const qtyFactEl = document.getElementById('incomeReportTotalQtyFact');
    const tonsEl = document.getElementById('incomeReportTotalTons');
    
    if (qtyDocEl) qtyDocEl.textContent = qtyDoc.toLocaleString('ru-RU');
    if (qtyFactEl) qtyFactEl.textContent = qtyFact.toLocaleString('ru-RU');
    if (tonsEl) tonsEl.textContent = tons.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Печать
window.printIncomeReport = function() {
    if (currentIncomeReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    let totalQtyDoc = 0, totalQtyFact = 0, totalTons = 0;
    let tableRows = '';
    
    currentIncomeReportData.forEach(item => {
        const date = fmtDate(item.date);
        const qtyDoc = parseFloat(item.qty_doc || 0);
        const qtyFact = parseFloat(item.qty_fact || 0);
        const difference = qtyFact - qtyDoc;
        const tons = parseFloat(item.weight_tons || 0);
        
        totalQtyDoc += qtyDoc;
        totalQtyFact += qtyFact;
        totalTons += tons;
        
        tableRows += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${date}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.wagon || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.company || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.warehouse || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.product || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${qtyDoc.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${qtyFact.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; ${difference !== 0 ? (difference > 0 ? 'color: green;' : 'color: red;') : ''}">${difference.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Отчет по приходу товаров</title>
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
            <h1>📥 Отчет по приходу товаров</h1>
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Вагон</th>
                        <th>Фирма</th>
                        <th>Склад</th>
                        <th>Товар</th>
                        <th>По док</th>
                        <th>Факт</th>
                        <th>Разница</th>
                        <th>Тонн</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="totals">
                <p>ИТОГО По док: ${totalQtyDoc.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Факт: ${totalQtyFact.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Тонн: ${totalTons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</p>
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
window.exportIncomeReportToExcel = function() {
    if (currentIncomeReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const data = currentIncomeReportData.map(item => ({
        'Дата': fmtDate(item.date),
        'Вагон': item.wagon || '',
        'Фирма': item.company || '',
        'Склад': item.warehouse || '',
        'Товар': item.product || '',
        'По док': parseFloat(item.qty_doc || 0),
        'Факт': parseFloat(item.qty_fact || 0),
        'Разница': parseFloat(item.qty_fact || 0) - parseFloat(item.qty_doc || 0),
        'Тонн': parseFloat(item.weight_tons || 0),
        'Примечания': item.notes || '',
        'Пользователь': item.user || ''
    }));
    
    const ws = jsonToSheetWithTextDate(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Приход товаров');
    
    const dateFrom = document.getElementById('incomeReportDateFrom')?.value || '';
    const dateTo = document.getElementById('incomeReportDateTo')?.value || '';
    const username = window.currentUser?.username || 'user';
    const filename = dateFrom && dateTo 
        ? `Отчет_по_приходу_товаров_${dateFrom}_${dateTo}_${username}.xlsx`
        : `Отчет_по_приходу_товаров_${new Date().toISOString().split('T')[0]}_${username}.xlsx`;
    
    XLSX.writeFile(wb, filename);
};

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateIncomeReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', window.generateIncomeReport);
    }
    
    const printBtn = document.getElementById('printIncomeReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.printIncomeReport);
    }
    
    const excelBtn = document.getElementById('exportIncomeReportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', window.exportIncomeReportToExcel);
    }
});

console.log('✅ income-report.js инициализирован');
