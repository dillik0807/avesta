/**
 * 📅 МОДУЛЬ ОТЧЕТА ЗА ТЕКУЩИЙ ДЕНЬ
 */

console.log('📅 Модуль отчета за текущий день загружен');

let currentDailyReportData = { income: [], expense: [] };

// Инициализация отчета
window.initDailyReport = function() {
    console.log('📅 Инициализация отчета за текущий день');
    
    const dateInput = document.getElementById('dailyReportDate');
    if (dateInput) {
        // Устанавливаем текущую дату
        const today = localDateStr();
        dateInput.value = today;
    }
};

// Генерация отчета
window.generateDailyReport = function() {
    console.log('📅 Генерация отчета за текущий день');
    
    const selectedDate = document.getElementById('dailyReportDate')?.value;
    
    if (!selectedDate) {
        alert('Выберите дату');
        return;
    }
    
    console.log('📅 Выбранная дата:', selectedDate);
    
    const yearData = window.getCurrentYearData();
    
    if (!yearData) {
        alert('Нет данных для отчета');
        return;
    }
    
    console.log('📊 Всего приходов:', yearData.income?.length || 0);
    console.log('📊 Всего расходов:', yearData.expense?.length || 0);
    
    // Показываем первые 3 даты из базы для отладки
    if (yearData.income && yearData.income.length > 0) {
        console.log('📅 Примеры дат приходов:', yearData.income.slice(0, 3).map(i => ({ date: i.date, split: i.date.split('T')[0] })));
    }
    if (yearData.expense && yearData.expense.length > 0) {
        console.log('📅 Примеры дат расходов:', yearData.expense.slice(0, 3).map(e => ({ date: e.date, split: e.date.split('T')[0] })));
    }
    
    // Фильтруем приходы за выбранную дату
    const incomeData = (yearData.income || []).filter(item => {
        if (item.deleted) return false;
        const itemDate = item.date.split('T')[0];
        const matches = itemDate === selectedDate;
        if (matches) {
            console.log('✅ Найден приход:', itemDate, item);
        }
        return matches;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Фильтруем расходы за выбранную дату
    const expenseData = (yearData.expense || []).filter(item => {
        if (item.deleted) return false;
        const itemDate = item.date.split('T')[0];
        const matches = itemDate === selectedDate;
        if (matches) {
            console.log('✅ Найден расход:', itemDate, item);
        }
        return matches;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('📊 Отфильтровано приходов:', incomeData.length);
    console.log('📊 Отфильтровано расходов:', expenseData.length);
    
    currentDailyReportData = { income: incomeData, expense: expenseData };
    
    displayDailyReport(incomeData, expenseData);
};

// Отображение отчета
function displayDailyReport(incomeData, expenseData) {
    const incomeTbody = document.getElementById('dailyReportIncomeTableBody');
    const expenseTbody = document.getElementById('dailyReportExpenseTableBody');
    const reportDiv = document.getElementById('dailyReportResults');
    const summaryDiv = document.getElementById('dailyReportSummary');
    
    if (!incomeTbody || !expenseTbody || !reportDiv) {
        console.error('❌ Не найдены элементы таблиц');
        return;
    }
    
    console.log('📊 Отображение отчета:', { incomeCount: incomeData.length, expenseCount: expenseData.length });
    
    // Рассчитываем сводку
    const incomeOperations = incomeData.length;
    const expenseOperations = expenseData.length;
    const totalExpenseSum = expenseData.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    const totalIncomeWeight = incomeData.reduce((sum, item) => sum + parseFloat(item.weight_tons || 0), 0);
    
    // Отображаем сводку
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div class="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 class="text-lg font-bold mb-4 text-gray-800">📊 СВОДКА ЗА ДЕНЬ</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white p-4 rounded shadow-sm">
                        <div class="text-sm text-gray-600 mb-1">Операций прихода:</div>
                        <div class="text-2xl font-bold text-green-600">${incomeOperations}</div>
                    </div>
                    <div class="bg-white p-4 rounded shadow-sm">
                        <div class="text-sm text-gray-600 mb-1">Операций расхода:</div>
                        <div class="text-2xl font-bold text-blue-600">${expenseOperations}</div>
                    </div>
                    <div class="bg-white p-4 rounded shadow-sm">
                        <div class="text-sm text-gray-600 mb-1">Общая сумма расхода:</div>
                        <div class="text-2xl font-bold text-orange-600">${totalExpenseSum.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</div>
                    </div>
                    <div class="bg-white p-4 rounded shadow-sm">
                        <div class="text-sm text-gray-600 mb-1">Общий вес прихода:</div>
                        <div class="text-2xl font-bold text-green-600">${totalIncomeWeight.toLocaleString('ru-RU', {minimumFractionDigits: 2})} тонн</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Отображаем приходы
    incomeTbody.innerHTML = '';
    let totalQtyDoc = 0, totalQtyFact = 0, totalTons = 0;
    
    if (incomeData.length === 0) {
        incomeTbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500">Нет приходов за выбранную дату</td></tr>';
    } else {
        incomeData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const qtyDoc = parseFloat(item.qty_doc || 0);
            const qtyFact = parseFloat(item.qty_fact || 0);
            const difference = qtyFact - qtyDoc;
            const tons = parseFloat(item.weight_tons || 0);
            
            totalQtyDoc += qtyDoc;
            totalQtyFact += qtyFact;
            totalTons += tons;
            
            const itemDate = fmtDate(item.date);
            
            row.innerHTML = `
                <td class="p-3">${itemDate}</td>
                <td class="p-3">${item.wagon || ''}</td>
                <td class="p-3">${item.company || ''}</td>
                <td class="p-3">${item.warehouse || ''}</td>
                <td class="p-3">${item.product || ''}</td>
                <td class="p-3 text-right">${qtyDoc.toLocaleString('ru-RU')}</td>
                <td class="p-3 text-right">${qtyFact.toLocaleString('ru-RU')}</td>
                <td class="p-3 text-right ${difference !== 0 ? (difference > 0 ? 'text-green-600' : 'text-red-600') : ''}">${difference.toLocaleString('ru-RU')}</td>
                <td class="p-3 text-right">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            `;
            
            incomeTbody.appendChild(row);
        });
    }
    
    updateDailyReportIncomeTotals(totalQtyDoc, totalQtyFact, totalTons);
    
    // Отображаем расходы
    expenseTbody.innerHTML = '';
    let totalExpenseQty = 0, totalExpenseTons = 0, totalSum = 0;
    
    if (expenseData.length === 0) {
        expenseTbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500">Нет расходов за выбранную дату</td></tr>';
    } else {
        expenseData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const qty = parseFloat(item.quantity || 0);
            const tons = parseFloat(item.tons || 0);
            const price = parseFloat(item.price || 0);
            const total = parseFloat(item.total || 0);
            
            totalExpenseQty += qty;
            totalExpenseTons += tons;
            totalSum += total;
            
            const itemDate = fmtDate(item.date);
            
            row.innerHTML = `
                <td class="p-3">${itemDate}</td>
                <td class="p-3">${item.company || ''}</td>
                <td class="p-3">${item.warehouse || ''}</td>
                <td class="p-3">${item.product || ''}</td>
                <td class="p-3">${item.client || ''}</td>
                <td class="p-3 text-right">${qty.toLocaleString('ru-RU')}</td>
                <td class="p-3 text-right">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td class="p-3 text-right">${price.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td class="p-3 text-right">${total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            `;
            
            expenseTbody.appendChild(row);
        });
    }
    
    updateDailyReportExpenseTotals(totalExpenseQty, totalExpenseTons, totalSum);
    
    // Показываем отчет
    reportDiv.classList.remove('hidden');
    console.log('✅ Отчет отображен');
}

// Обновление итогов прихода
function updateDailyReportIncomeTotals(qtyDoc, qtyFact, tons) {
    const qtyDocEl = document.getElementById('dailyReportIncomeTotalQtyDoc');
    const qtyFactEl = document.getElementById('dailyReportIncomeTotalQtyFact');
    const tonsEl = document.getElementById('dailyReportIncomeTotalTons');
    
    if (qtyDocEl) qtyDocEl.textContent = qtyDoc.toLocaleString('ru-RU');
    if (qtyFactEl) qtyFactEl.textContent = qtyFact.toLocaleString('ru-RU');
    if (tonsEl) tonsEl.textContent = tons.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Обновление итогов расхода
function updateDailyReportExpenseTotals(qty, tons, sum) {
    const qtyEl = document.getElementById('dailyReportExpenseTotalQty');
    const tonsEl = document.getElementById('dailyReportExpenseTotalTons');
    const sumEl = document.getElementById('dailyReportExpenseTotalSum');
    
    if (qtyEl) qtyEl.textContent = qty.toLocaleString('ru-RU');
    if (tonsEl) tonsEl.textContent = tons.toLocaleString('ru-RU', {minimumFractionDigits: 2});
    if (sumEl) sumEl.textContent = sum.toLocaleString('ru-RU', {minimumFractionDigits: 2});
}

// Печать
window.printDailyReport = function() {
    if (currentDailyReportData.income.length === 0 && currentDailyReportData.expense.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const selectedDate = document.getElementById('dailyReportDate')?.value;
    const dateFormatted = fmtDate(selectedDate);
    
    // Рассчитываем сводку
    const incomeOperations = currentDailyReportData.income.length;
    const expenseOperations = currentDailyReportData.expense.length;
    const totalExpenseSum = currentDailyReportData.expense.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    const totalIncomeWeight = currentDailyReportData.income.reduce((sum, item) => sum + parseFloat(item.weight_tons || 0), 0);
    
    // Приходы
    let incomeRows = '';
    let totalIncomeQtyDoc = 0, totalIncomeQtyFact = 0, totalIncomeTons = 0;
    
    currentDailyReportData.income.forEach(item => {
        const qtyDoc = parseFloat(item.qty_doc || 0);
        const qtyFact = parseFloat(item.qty_fact || 0);
        const difference = qtyFact - qtyDoc;
        const tons = parseFloat(item.weight_tons || 0);
        const itemDate = fmtDate(item.date);
        
        totalIncomeQtyDoc += qtyDoc;
        totalIncomeQtyFact += qtyFact;
        totalIncomeTons += tons;
        
        let diffStyle = '';
        if (difference > 0) diffStyle = 'color: green;';
        else if (difference < 0) diffStyle = 'color: red;';
        
        incomeRows += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${itemDate}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.wagon || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.company || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.warehouse || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.product || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${qtyDoc.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${qtyFact.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; ${diffStyle}">${difference.toLocaleString('ru-RU')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${tons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    // Расходы
    let expenseRows = '';
    let totalExpenseQty = 0, totalExpenseTons = 0, totalExpenseSumPrint = 0;
    
    currentDailyReportData.expense.forEach(item => {
        const qty = parseFloat(item.quantity || 0);
        const tons = parseFloat(item.tons || 0);
        const price = parseFloat(item.price || 0);
        const total = parseFloat(item.total || 0);
        const itemDate = fmtDate(item.date);
        
        totalExpenseQty += qty;
        totalExpenseTons += tons;
        totalExpenseSumPrint += total;
        
        expenseRows += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${itemDate}</td>
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
            <title>Отчет за текущий день</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { text-align: center; margin-bottom: 20px; }
                h2 { margin-top: 30px; margin-bottom: 15px; color: #1f2937; }
                .summary { 
                    background: linear-gradient(to right, #eff6ff, #f0fdf4);
                    padding: 20px; 
                    border-radius: 8px; 
                    margin-bottom: 30px;
                    border: 1px solid #e5e7eb;
                }
                .summary h3 { 
                    font-size: 18px; 
                    font-weight: bold; 
                    margin-bottom: 15px;
                    color: #374151;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                .summary-item {
                    background: white;
                    padding: 15px;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .summary-label {
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 5px;
                }
                .summary-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                .summary-value.green { color: #16a34a; }
                .summary-value.blue { color: #2563eb; }
                .summary-value.orange { color: #ea580c; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background-color: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: left; }
                td { padding: 8px; border: 1px solid #ddd; }
                .totals { margin-top: 10px; margin-bottom: 20px; font-weight: bold; }
                @media print { body { margin: 15mm; } }
            </style>
        </head>
        <body>
            <h1>📅 Отчет за ${dateFormatted}</h1>
            
            <div class="summary">
                <h3>📊 СВОДКА ЗА ДЕНЬ</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">Операций прихода:</div>
                        <div class="summary-value green">${incomeOperations}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Операций расхода:</div>
                        <div class="summary-value blue">${expenseOperations}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Общая сумма расхода:</div>
                        <div class="summary-value orange">${totalExpenseSum.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Общий вес прихода:</div>
                        <div class="summary-value green">${totalIncomeWeight.toLocaleString('ru-RU', {minimumFractionDigits: 2})} тонн</div>
                    </div>
                </div>
            </div>
            
            <h2>📥 Приходы товаров</h2>
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
                <tbody>${incomeRows || '<tr><td colspan="9" style="text-align: center; padding: 20px;">Нет приходов</td></tr>'}</tbody>
            </table>
            <div class="totals">
                <p>ИТОГО По док: ${totalIncomeQtyDoc.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Факт: ${totalIncomeQtyFact.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Тонн: ${totalIncomeTons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</p>
            </div>
            
            <h2>📤 Расходы товаров</h2>
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
                <tbody>${expenseRows || '<tr><td colspan="9" style="text-align: center; padding: 20px;">Нет расходов</td></tr>'}</tbody>
            </table>
            <div class="totals">
                <p>ИТОГО Количество: ${totalExpenseQty.toLocaleString('ru-RU')}</p>
                <p>ИТОГО Тонн: ${totalExpenseTons.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</p>
                <p>ИТОГО Сумма: ${totalExpenseSumPrint.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $</p>
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
window.exportDailyReportToExcel = function() {
    if (currentDailyReportData.income.length === 0 && currentDailyReportData.expense.length === 0) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    
    // Рассчитываем сводку
    const incomeOperations = currentDailyReportData.income.length;
    const expenseOperations = currentDailyReportData.expense.length;
    const totalExpenseSum = currentDailyReportData.expense.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    const totalIncomeWeight = currentDailyReportData.income.reduce((sum, item) => sum + parseFloat(item.weight_tons || 0), 0);
    
    // Лист сводки
    const summaryData = [
        ['📊 СВОДКА ЗА ДЕНЬ', ''],
        ['', ''],
        ['Операций прихода:', incomeOperations],
        ['Операций расхода:', expenseOperations],
        ['Общая сумма расхода ($):', totalExpenseSum],
        ['Общий вес прихода (тонн):', totalIncomeWeight]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');
    
    // Лист приходов
    if (currentDailyReportData.income.length > 0) {
        const incomeData = currentDailyReportData.income.map(item => ({
            'Дата': fmtDate(item.date),
            'Вагон': item.wagon || '',
            'Фирма': item.company || '',
            'Склад': item.warehouse || '',
            'Товар': item.product || '',
            'По док': parseFloat(item.qty_doc || 0),
            'Факт': parseFloat(item.qty_fact || 0),
            'Разница': parseFloat(item.qty_fact || 0) - parseFloat(item.qty_doc || 0),
            'Тонн': parseFloat(item.weight_tons || 0)
        }));
        
        const wsIncome = jsonToSheetWithTextDate(incomeData);
        XLSX.utils.book_append_sheet(wb, wsIncome, 'Приходы');
    }
    
    // Лист расходов
    if (currentDailyReportData.expense.length > 0) {
        const expenseData = currentDailyReportData.expense.map(item => ({
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
        
        const wsExpense = jsonToSheetWithTextDate(expenseData);
        XLSX.utils.book_append_sheet(wb, wsExpense, 'Расходы');
    }
    
    const selectedDate = document.getElementById('dailyReportDate')?.value || localDateStr();
    const username = window.currentUser?.username || 'user';
    XLSX.writeFile(wb, `Отчет_за_день_${selectedDate}_${username}.xlsx`);
};

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateDailyReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', window.generateDailyReport);
    }
    
    const printBtn = document.getElementById('printDailyReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.printDailyReport);
    }
    
    const excelBtn = document.getElementById('exportDailyReportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', window.exportDailyReportToExcel);
    }
});

console.log('✅ daily-report.js инициализирован');
