/**
 * 📦 МОДУЛЬ ОСТАТКОВ СКЛАДОВ
 */

console.log('📦 Модуль остатков складов загружен');

// Инициализация раздела остатков складов
window.initializeStockBalance = function() {
    console.log('📦 Инициализация раздела остатков складов');

    // Заполняем селектор складов
    const warehouseSelect = document.getElementById('stockBalanceWarehouse');
    const appData = window.appData;
    
    if (warehouseSelect && appData && appData.warehouses) {
        warehouseSelect.innerHTML = '<option value="">Все склады</option>';
        appData.warehouses.forEach(warehouse => {
            warehouseSelect.innerHTML += `<option value="${warehouse.name}">${warehouse.name}</option>`;
        });
    }

    // Заполняем селектор товаров
    const productSelect = document.getElementById('stockBalanceProduct');
    if (productSelect && appData && appData.products) {
        productSelect.innerHTML = '<option value="">Все товары</option>';
        appData.products.forEach(product => {
            productSelect.innerHTML += `<option value="${product.name}">${product.name}</option>`;
        });
    }

    // Устанавливаем текущую дату
    const dateInput = document.getElementById('stockBalanceDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
};

// Генерация отчета остатков складов
window.generateStockBalanceReport = function() {
    console.log('📊 Генерация отчета остатков складов');

    const warehouse = document.getElementById('stockBalanceWarehouse').value;
    const product = document.getElementById('stockBalanceProduct').value;
    const date = document.getElementById('stockBalanceDate').value;
    const showZero = document.getElementById('showZeroBalance').checked;

    const yearData = window.getCurrentYearData();
    const appData = window.appData;

    if (!yearData) {
        alert('Нет данных для отчета');
        return;
    }

    // Фильтруем данные по дате
    const filterDate = date ? new Date(date) : new Date();
    const currentYear = filterDate.getFullYear();
    
    // Рассчитываем остатки
    const balances = {};

    // Приход
    if (yearData.income) {
        yearData.income.forEach(item => {
            if (item.deleted) return;
            
            const itemDate = new Date(item.date);
            if (itemDate > filterDate) return;
            
            if (warehouse && item.warehouse !== warehouse) return;
            if (product && item.product !== product) return;

            const key = `${item.warehouse}|${item.product}`;
            if (!balances[key]) {
                balances[key] = {
                    warehouse: item.warehouse,
                    product: item.product,
                    balance: 0
                };
            }
            balances[key].balance += parseFloat(item.weight_tons || 0);
        });
    }

    // Расход
    if (yearData.expense) {
        yearData.expense.forEach(item => {
            if (item.deleted) return;
            
            const itemDate = new Date(item.date);
            if (itemDate > filterDate) return;
            
            if (warehouse && item.warehouse !== warehouse) return;
            if (product && item.product !== product) return;

            const key = `${item.warehouse}|${item.product}`;
            if (!balances[key]) {
                balances[key] = {
                    warehouse: item.warehouse,
                    product: item.product,
                    balance: 0
                };
            }
            balances[key].balance -= parseFloat(item.tons || 0);
        });
    }

    // Группируем по группам складов
    const warehouseGroups = {};
    Object.values(balances).forEach(item => {
        if (!showZero && item.balance === 0) return;
        
        const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
        const group = warehouseObj?.warehouse_group || 'Без группы';
        
        if (!warehouseGroups[group]) {
            warehouseGroups[group] = {};
        }
        if (!warehouseGroups[group][item.warehouse]) {
            warehouseGroups[group][item.warehouse] = [];
        }
        warehouseGroups[group][item.warehouse].push(item);
    });

    // Формируем текстовый отчет
    const reportDiv = document.getElementById('stockBalanceTableBody');
    const formattedDate = filterDate.toLocaleDateString('ru-RU');
    
    let html = `<tr><td class="p-6">`;
    html += `<div class="text-report" style="font-family: Arial, sans-serif; line-height: 1.8;">`;
    html += `<h2 class="text-2xl font-bold mb-4">Фактические Остатки - Все компании (${currentYear})</h2>`;
    html += `<p class="mb-6 text-gray-700">Склад: ${warehouse || 'Все склады'} | Дата формирования: ${formattedDate}</p>`;
    
    let warehouseNumber = 1;
    let grandTotal = {};
    
    // Сортируем группы
    const sortedGroups = Object.keys(warehouseGroups).sort();
    
    sortedGroups.forEach(group => {
        html += `<h3 class="text-lg font-bold mt-6 mb-3 text-blue-700">📂 ${group}</h3>`;
        
        const warehouses = warehouseGroups[group];
        const sortedWarehouses = Object.keys(warehouses).sort();
        
        sortedWarehouses.forEach(wh => {
            html += `<p class="font-semibold mt-3 mb-2 text-gray-900">${warehouseNumber}) ${wh}</p>`;
            warehouseNumber++;
            
            const items = warehouses[wh];
            items.forEach(item => {
                const balanceStr = item.balance.toFixed(2);
                // Определяем цвет в зависимости от остатка
                let colorClass = 'text-green-600'; // зеленый для положительных
                if (item.balance === 0) {
                    colorClass = 'text-gray-500'; // серый для нулевых
                } else if (item.balance < 0) {
                    colorClass = 'text-red-600'; // красный для отрицательных
                }
                
                html += `<div class="flex justify-between ml-6 text-gray-800" style="max-width: 600px;">`;
                html += `<span>${item.product}</span>`;
                html += `<span class="font-bold ${colorClass}">${balanceStr} т/н (${currentYear})</span>`;
                html += `</div>`;
                
                // Суммируем по товарам
                const productKey = item.product;
                if (!grandTotal[productKey]) {
                    grandTotal[productKey] = 0;
                }
                grandTotal[productKey] += item.balance;
            });
        });
    });
    
    // Итого
    html += `<h3 class="text-lg font-bold mt-8 mb-3 text-green-700">Итого: Все компании</h3>`;
    let totalSum = 0;
    Object.keys(grandTotal).sort().forEach(productKey => {
        const total = grandTotal[productKey];
        totalSum += total;
        
        // Определяем цвет в зависимости от остатка
        let colorClass = 'text-green-600'; // зеленый для положительных
        if (total === 0) {
            colorClass = 'text-gray-500'; // серый для нулевых
        } else if (total < 0) {
            colorClass = 'text-red-600'; // красный для отрицательных
        }
        
        html += `<div class="flex justify-between text-gray-800" style="max-width: 600px;">`;
        html += `<span>${productKey}</span>`;
        html += `<span class="font-bold ${colorClass}">${total.toFixed(2)} т/н (${currentYear})</span>`;
        html += `</div>`;
    });
    html += `<p class="font-bold mt-3 text-xl text-green-800">${totalSum.toFixed(2)} т/н (${currentYear})</p>`;
    
    // Добавляем информацию о расходах за сегодня
    html += `<h3 class="text-lg font-bold mt-8 mb-3 text-orange-700">📊 Фактический расход товаров за ${formattedDate}</h3>`;
    
    const today = new Date(filterDate);
    today.setHours(0, 0, 0, 0);
    const todayExpenses = yearData.expense?.filter(item => {
        if (item.deleted) return false;
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime();
    }) || [];
    
    if (todayExpenses.length === 0) {
        html += `<p class="text-gray-600">Расходов за сегодня не найдено</p>`;
    } else {
        todayExpenses.forEach(expense => {
            html += `<p class="text-gray-800">${expense.warehouse} - ${expense.product}: ${parseFloat(expense.tons || 0).toFixed(2)} т/н</p>`;
        });
    }
    
    html += `</div></td></tr>`;
    
    reportDiv.innerHTML = html;
    document.getElementById('stockBalanceReport').classList.remove('hidden');
};

// Печать отчета
window.printStockBalanceReport = function() {
    const reportContent = document.getElementById('stockBalanceTableBody');
    if (!reportContent || reportContent.innerHTML.includes('Нажмите "Сформировать отчет"')) {
        alert('Сначала сформируйте отчет');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Остатки складов</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px;
                    line-height: 1.8;
                }
                h2 { 
                    font-size: 24px; 
                    margin-bottom: 10px;
                    color: #000;
                }
                h3 { 
                    font-size: 18px; 
                    margin-top: 20px;
                    margin-bottom: 10px;
                }
                p { 
                    margin: 5px 0;
                }
                .flex {
                    display: flex;
                }
                .justify-between {
                    justify-content: space-between;
                }
                .text-blue-700 { color: #1d4ed8; }
                .text-green-700 { color: #15803d; }
                .text-green-800 { color: #166534; }
                .text-green-600 { color: #16a34a; }
                .text-red-600 { color: #dc2626; }
                .text-gray-500 { color: #6b7280; }
                .text-orange-700 { color: #c2410c; }
                .text-gray-700 { color: #374151; }
                .text-gray-800 { color: #1f2937; }
                .text-gray-600 { color: #4b5563; }
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                .ml-6 { margin-left: 24px; }
                .text-xl { font-size: 20px; }
                .text-2xl { font-size: 24px; }
                .text-lg { font-size: 18px; }
                .mb-4 { margin-bottom: 16px; }
                .mb-6 { margin-bottom: 24px; }
                .mb-3 { margin-bottom: 12px; }
                .mb-2 { margin-bottom: 8px; }
                .mt-3 { margin-top: 12px; }
                .mt-6 { margin-top: 24px; }
                .mt-8 { margin-top: 32px; }
                @media print {
                    body { margin: 15mm; }
                }
            </style>
        </head>
        <body>
            ${reportContent.innerHTML}
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
window.exportStockBalanceToExcel = function() {
    const yearData = window.getCurrentYearData();
    const appData = window.appData;
    
    if (!yearData) {
        alert('Нет данных для экспорта');
        return;
    }

    const warehouse = document.getElementById('stockBalanceWarehouse').value;
    const product = document.getElementById('stockBalanceProduct').value;
    const date = document.getElementById('stockBalanceDate').value;
    const showZero = document.getElementById('showZeroBalance').checked;

    const filterDate = date ? new Date(date) : new Date();
    const currentYear = filterDate.getFullYear();
    const formattedDate = filterDate.toLocaleDateString('ru-RU');
    
    // Рассчитываем остатки
    const balances = {};

    // Приход
    if (yearData.income) {
        yearData.income.forEach(item => {
            if (item.deleted) return;
            const itemDate = new Date(item.date);
            if (itemDate > filterDate) return;
            if (warehouse && item.warehouse !== warehouse) return;
            if (product && item.product !== product) return;

            const key = `${item.warehouse}|${item.product}`;
            if (!balances[key]) {
                balances[key] = {
                    warehouse: item.warehouse,
                    product: item.product,
                    balance: 0
                };
            }
            balances[key].balance += parseFloat(item.weight_tons || 0);
        });
    }

    // Расход
    if (yearData.expense) {
        yearData.expense.forEach(item => {
            if (item.deleted) return;
            const itemDate = new Date(item.date);
            if (itemDate > filterDate) return;
            if (warehouse && item.warehouse !== warehouse) return;
            if (product && item.product !== product) return;

            const key = `${item.warehouse}|${item.product}`;
            if (!balances[key]) {
                balances[key] = {
                    warehouse: item.warehouse,
                    product: item.product,
                    balance: 0
                };
            }
            balances[key].balance -= parseFloat(item.tons || 0);
        });
    }

    // Группируем по группам складов
    const warehouseGroups = {};
    Object.values(balances).forEach(item => {
        if (!showZero && item.balance === 0) return;
        
        const warehouseObj = appData.warehouses?.find(w => w.name === item.warehouse);
        const group = warehouseObj?.warehouse_group || 'Без группы';
        
        if (!warehouseGroups[group]) {
            warehouseGroups[group] = {};
        }
        if (!warehouseGroups[group][item.warehouse]) {
            warehouseGroups[group][item.warehouse] = [];
        }
        warehouseGroups[group][item.warehouse].push(item);
    });

    // Формируем данные для Excel
    const excelData = [];
    
    // Заголовок
    excelData.push([`Фактические Остатки - Все компании (${currentYear})`]);
    excelData.push([`Склад: ${warehouse || 'Все склады'} | Дата формирования: ${formattedDate}`]);
    excelData.push([]);
    
    let warehouseNumber = 1;
    let grandTotal = {};
    
    // Сортируем группы
    const sortedGroups = Object.keys(warehouseGroups).sort();
    
    sortedGroups.forEach(group => {
        excelData.push([`📂 ${group}`]);
        
        const warehouses = warehouseGroups[group];
        const sortedWarehouses = Object.keys(warehouses).sort();
        
        sortedWarehouses.forEach(wh => {
            excelData.push([`${warehouseNumber}) ${wh}`]);
            warehouseNumber++;
            
            const items = warehouses[wh];
            items.forEach(item => {
                const balanceStr = item.balance.toFixed(2);
                excelData.push([`  ${item.product}`]);
                excelData.push([`  ${balanceStr} т/н (${currentYear})`]);
                
                // Суммируем по товарам
                const productKey = item.product;
                if (!grandTotal[productKey]) {
                    grandTotal[productKey] = 0;
                }
                grandTotal[productKey] += item.balance;
            });
        });
        excelData.push([]);
    });
    
    // Итого
    excelData.push(['Итого: Все компании']);
    let totalSum = 0;
    Object.keys(grandTotal).sort().forEach(productKey => {
        const total = grandTotal[productKey];
        totalSum += total;
        excelData.push([productKey]);
        excelData.push([`${total.toFixed(2)} т/н (${currentYear})`]);
    });
    excelData.push([`${totalSum.toFixed(2)} т/н (${currentYear})`]);
    excelData.push([]);
    
    // Расходы за день
    excelData.push([`📊 Фактический расход товаров за ${formattedDate}`]);
    const today = new Date(filterDate);
    today.setHours(0, 0, 0, 0);
    const todayExpenses = yearData.expense?.filter(item => {
        if (item.deleted) return false;
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime();
    }) || [];
    
    if (todayExpenses.length === 0) {
        excelData.push(['Расходов за сегодня не найдено']);
    } else {
        todayExpenses.forEach(expense => {
            excelData.push([`${expense.warehouse} - ${expense.product}: ${parseFloat(expense.tons || 0).toFixed(2)} т/н`]);
        });
    }

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Остатки складов');
    XLSX.writeFile(wb, `Остатки_складов_${date || new Date().toISOString().split('T')[0]}.xlsx`);
};

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateStockBalanceBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', window.generateStockBalanceReport);
    }

    const printBtn = document.getElementById('printStockBalanceBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.printStockBalanceReport);
    }

    const excelBtn = document.getElementById('exportStockBalanceExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', window.exportStockBalanceToExcel);
    }
});

console.log('✅ stock-balance.js инициализирован');
