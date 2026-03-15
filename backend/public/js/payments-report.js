/**
 * 💰 МОДУЛЬ ОТЧЕТА ПО ПОГАШЕНИЯМ
 */

console.log('💰 Модуль отчета по погашениям загружен');

// Глобальные переменные для хранения данных отчета
let currentPaymentsReportData = [];

// Инициализация отчета по погашениям
window.initPaymentsReport = function() {
    console.log('💰 Инициализация отчета по погашениям');
    
    // Оставляем поля дат пустыми
    const dateFromInput = document.getElementById('paymentsReportDateFrom');
    const dateToInput = document.getElementById('paymentsReportDateTo');
    
    if (dateFromInput) {
        dateFromInput.value = '';
    }
    if (dateToInput) {
        dateToInput.value = '';
    }
    
    // Заполняем селекторы
    loadPaymentsReportWarehouses();
    loadPaymentsReportClients();
};

// Загрузка списка складов для фильтра
function loadPaymentsReportWarehouses() {
    const warehouseSelect = document.getElementById('paymentsReportWarehouse');
    const appData = window.appData;
    
    if (!warehouseSelect || !appData) return;
    
    // Заполняем селектор складов
    warehouseSelect.innerHTML = '<option value="">Все склады</option>';
    if (appData.warehouses && Array.isArray(appData.warehouses)) {
        appData.warehouses.forEach(warehouse => {
            const option = document.createElement('option');
            option.value = warehouse.name;
            option.textContent = warehouse.name;
            warehouseSelect.appendChild(option);
        });
    }
}

// Загрузка списка клиентов для фильтра
function loadPaymentsReportClients() {
    const clientSelect = document.getElementById('paymentsReportClient');
    const yearData = window.getCurrentYearData();
    
    if (!clientSelect || !yearData) return;
    
    const clients = new Set();
    
    // Собираем уникальных клиентов из погашений
    if (yearData.payments) {
        yearData.payments.forEach(payment => {
            if (!payment.deleted && payment.client) {
                clients.add(payment.client);
            }
        });
    }
    
    // Заполняем селектор
    clientSelect.innerHTML = '<option value="">Все клиенты</option>';
    Array.from(clients).sort().forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        clientSelect.appendChild(option);
    });
}

// Генерация отчета по погашениям
window.generatePaymentsReport = function() {
    console.log('💰 Генерация отчета по погашениям');
    
    const dateFrom = document.getElementById('paymentsReportDateFrom')?.value;
    const dateTo = document.getElementById('paymentsReportDateTo')?.value;
    const warehouse = document.getElementById('paymentsReportWarehouse')?.value;
    const client = document.getElementById('paymentsReportClient')?.value;
    
    const yearData = window.getCurrentYearData();
    
    if (!yearData || !yearData.payments) {
        alert('Нет данных для отчета');
        return;
    }
    
    // Фильтруем погашения
    let filtered = yearData.payments.filter(payment => {
        if (payment.deleted) return false;
        
        const paymentDate = payment.date.split('T')[0];
        
        if (dateFrom && paymentDate < dateFrom) return false;
        if (dateTo && paymentDate > dateTo) return false;
        if (warehouse && payment.warehouse !== warehouse) return false;
        if (client && payment.client !== client) return false;
        
        return true;
    });
    
    // Сортируем по дате (новые сначала)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    currentPaymentsReportData = filtered;
    
    // Отображаем отчет
    displayPaymentsReport(filtered, dateFrom, dateTo, warehouse, client);
};

// Отображение отчета в таблице
function displayPaymentsReport(data, dateFrom, dateTo, warehouse, client) {
    const reportDiv = document.getElementById('paymentsReportResults');
    const tbody = document.getElementById('paymentsReportTableBody');
    
    if (!reportDiv || !tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        reportDiv.classList.remove('hidden');
        updatePaymentsReportTotals(0, 0);
        return;
    }
    
    // Формируем строки таблицы
    tbody.innerHTML = '';
    let totalSomoni = 0;
    let totalDollar = 0;
    
    data.forEach(payment => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const date = fmtDate(payment.date);
        const amount = parseFloat(payment.amount || 0);
        const somoni = parseFloat(payment.somoni || 0);
        const rate = parseFloat(payment.rate || 0);
        
        // Суммируем
        totalSomoni += somoni;
        totalDollar += amount;
        
        row.innerHTML = `
            <td class="p-3">${date}</td>
            <td class="p-3">${payment.client || ''}</td>
            <td class="p-3 text-right">${somoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3 text-right">${rate > 0 ? rate.toLocaleString('ru-RU', {minimumFractionDigits: 2}) : ''}</td>
            <td class="p-3 text-right">${amount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            <td class="p-3">${payment.notes || ''}</td>
            <td class="p-3 text-sm text-gray-500">${payment.user || ''}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Обновляем итоги
    updatePaymentsReportTotals(totalSomoni, totalDollar);
    
    // Показываем отчет
    reportDiv.classList.remove('hidden');
}

// Обновление итоговых сумм
function updatePaymentsReportTotals(somoni, dollar) {
    const somoniEl = document.getElementById('paymentsReportTotalSomoni');
    const dollarEl = document.getElementById('paymentsReportTotalDollar');
    
    if (somoniEl) somoniEl.textContent = somoni.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    if (dollarEl) dollarEl.textContent = dollar.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Печать отчета
window.printPaymentsReport = function() {
    if (currentPaymentsReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const dateFrom = document.getElementById('paymentsReportDateFrom')?.value || '';
    const dateTo = document.getElementById('paymentsReportDateTo')?.value || '';
    const client = document.getElementById('paymentsReportClient')?.value || 'Все клиенты';
    
    let totalSomoni = 0;
    let totalDollar = 0;
    
    let tableRows = '';
    currentPaymentsReportData.forEach(payment => {
        const date = fmtDate(payment.date);
        const amount = parseFloat(payment.amount || 0);
        const somoni = parseFloat(payment.somoni || 0);
        const rate = parseFloat(payment.rate || 0);
        
        totalSomoni += somoni;
        totalDollar += amount;
        
        tableRows += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${date}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${payment.client || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${somoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${rate > 0 ? rate.toLocaleString('ru-RU', {minimumFractionDigits: 2}) : ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${amount.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${payment.notes || ''}</td>
            </tr>
        `;
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Отчет по погашениям</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { text-align: center; margin-bottom: 20px; }
                .info { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background-color: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: left; }
                td { padding: 8px; border: 1px solid #ddd; }
                .totals { margin-top: 20px; font-weight: bold; }
                @media print {
                    body { margin: 15mm; }
                }
            </style>
        </head>
        <body>
            <h1>💰 Отчет по погашениям</h1>
            <div class="info">
                <p><strong>Период:</strong> ${dateFrom ? fmtDate(dateFrom) : 'Начало'} - ${dateTo ? fmtDate(dateTo) : 'Конец'}</p>
                <p><strong>Клиент:</strong> ${client}</p>
                <p><strong>Дата формирования:</strong> ${fmtDate(localDateStr())}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Клиент</th>
                        <th>Сомони</th>
                        <th>Курс</th>
                        <th>Сумма</th>
                        <th>Примечания</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="totals">
                <p>ИТОГО Сомони: ${totalSomoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})} сом.</p>
                <p>ИТОГО Доллар: ${totalDollar.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</p>
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
window.exportPaymentsReportToExcel = function() {
    if (currentPaymentsReportData.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const data = currentPaymentsReportData.map(payment => ({
        'Дата': fmtDate(payment.date),
        'Клиент': payment.client || '',
        'Сомони': parseFloat(payment.somoni || 0),
        'Курс': parseFloat(payment.rate || 0),
        'Сумма': parseFloat(payment.amount || 0),
        'Примечания': payment.notes || '',
        'Пользователь': payment.user || ''
    }));
    
    const ws = jsonToSheetWithTextDate(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Погашения');
    
    const dateFrom = document.getElementById('paymentsReportDateFrom')?.value || '';
    const dateTo = document.getElementById('paymentsReportDateTo')?.value || '';
    const username = window.currentUser?.username || 'user';
    const filename = dateFrom && dateTo 
        ? `Отчет_по_погашениям_${dateFrom}_${dateTo}_${username}.xlsx`
        : `Отчет_по_погашениям_${username}.xlsx`;
    
    XLSX.writeFile(wb, filename);
};

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generatePaymentsReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', window.generatePaymentsReport);
    }
    
    const printBtn = document.getElementById('printPaymentsReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.printPaymentsReport);
    }
    
    const excelBtn = document.getElementById('exportPaymentsReportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', window.exportPaymentsReportToExcel);
    }
});

console.log('✅ payments-report.js инициализирован');
