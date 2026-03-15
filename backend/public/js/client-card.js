/**
 * 👤 МОДУЛЬ КАРТОЧКИ КЛИЕНТА
 */

console.log('👤 Модуль карточки клиента загружен');

// Инициализация модуля
window.initClientCard = function() {
    console.log('✅ Инициализация карточки клиента');
    
    // Загружаем список клиентов
    loadClientsList();
    
    // Обработчик галочки "Показать всех клиентов"
    const showAllCheckbox = document.getElementById('clientCardShowAllClients');
    const clientInput = document.getElementById('clientCardClientInput');
    
    if (showAllCheckbox && clientInput) {
        showAllCheckbox.addEventListener('change', function() {
            if (this.checked) {
                clientInput.value = '';
                clientInput.disabled = true;
                clientInput.placeholder = 'Все клиенты';
            } else {
                clientInput.disabled = false;
                clientInput.placeholder = 'Введите имя клиента...';
            }
        });

        clientInput.addEventListener('focus', loadClientsList);
    }
    
    // Обработчик кнопки "Сформировать отчет"
    const generateBtn = document.getElementById('generateClientCardBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateClientCard);
    }
    
    // Обработчик кнопки печати
    const printBtn = document.getElementById('printClientCardBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printClientCard);
    }
    
    // Обработчик кнопки Excel
    const excelBtn = document.getElementById('exportClientCardBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', exportClientCardToExcel);
    }
};

// Загрузка списка клиентов
function loadClientsList() {
    const clientDatalist = document.getElementById('clientCardClientList');
    if (!clientDatalist) return;
    
    const clients = new Set();

    // Из справочника клиентов
    if (window.appData?.clients) {
        window.appData.clients.forEach(c => {
            const name = typeof c === 'string' ? c : c.name;
            if (name) clients.add(name);
        });
    }

    // Из расходов текущего года
    const yearData = window.getCurrentYearData();
    if (yearData?.expense) {
        yearData.expense.forEach(item => {
            if (!item.deleted && item.client) clients.add(item.client);
        });
    }
    
    const sortedClients = Array.from(clients).sort((a, b) => a.localeCompare(b, 'ru'));
    
    clientDatalist.innerHTML = '';
    sortedClients.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        clientDatalist.appendChild(option);
    });
    
    console.log(`✅ Загружено ${sortedClients.length} клиентов`);
}

// Генерация карточки клиента
function generateClientCard() {
    const showAllClients = document.getElementById('clientCardShowAllClients')?.checked;
    const selectedClient = showAllClients ? '' : document.getElementById('clientCardClientInput')?.value.trim();
    const dateFrom = document.getElementById('clientCardDateFrom')?.value;
    const dateTo = document.getElementById('clientCardDateTo')?.value;
    
    const yearData = window.getCurrentYearData();
    if (!yearData) {
        alert('Нет данных для формирования отчета');
        return;
    }
    
    // Фильтруем расходы
    let expenses = yearData.expense ? yearData.expense.filter(item => {
        if (item.deleted) return false;
        if (!item.client) return false;
        if (selectedClient && item.client !== selectedClient) return false;
        
        const itemDate = item.date.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        
        return true;
    }) : [];
    
    // Фильтруем погашения
    let payments = yearData.payments ? yearData.payments.filter(item => {
        if (item.deleted) return false;
        if (!item.client) return false;
        if (selectedClient && item.client !== selectedClient) return false;
        
        const itemDate = item.date.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        
        return true;
    }) : [];
    
    // Группируем данные по клиентам
    const clientsData = {};
    
    expenses.forEach(item => {
        const client = item.client;
        if (!clientsData[client]) {
            clientsData[client] = {
                totalExpense: 0,
                totalPayments: 0,
                debt: 0,
                expense: [],
                payments: []
            };
        }
        clientsData[client].expense.push(item);
        clientsData[client].totalExpense += parseFloat(item.total || 0);
    });
    
    payments.forEach(item => {
        const client = item.client;
        if (!clientsData[client]) {
            clientsData[client] = {
                totalExpense: 0,
                totalPayments: 0,
                debt: 0,
                expense: [],
                payments: []
            };
        }
        clientsData[client].payments.push(item);
        clientsData[client].totalPayments += parseFloat(item.amount || 0);
    });
    
    // Расчет долгов (погашения - расход = долг)
    Object.keys(clientsData).forEach(client => {
        clientsData[client].debt = clientsData[client].totalPayments - clientsData[client].totalExpense;
    });
    
    // Сортировка клиентов по долгу (от меньшего к большему, т.е. самые большие долги первыми)
    const sortedClients = Object.keys(clientsData).sort((a, b) => {
        return clientsData[a].debt - clientsData[b].debt;
    });
    
    if (sortedClients.length === 0) {
        document.getElementById('clientCardResults').innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <p class="text-lg">Нет данных для отображения</p>
            </div>
        `;
        return;
    }
    
    // Генерируем HTML
    let html = generateClientCardHTML(sortedClients, clientsData);
    
    document.getElementById('clientCardResults').innerHTML = html;
    
    console.log(`✅ Сформирована карточка для ${sortedClients.length} клиентов`);
}

// Генерация HTML для карточки клиента
function generateClientCardHTML(sortedClients, clientsData) {
    let html = '<div class="space-y-6">';
    
    // Общие итоги
    let grandTotalExpense = 0;
    let grandTotalPayments = 0;
    let grandTotalDebt = 0;
    
    Object.values(clientsData).forEach(data => {
        grandTotalExpense += data.totalExpense;
        grandTotalPayments += data.totalPayments;
        grandTotalDebt += data.debt;
    });
    
    html += `
        <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 class="text-xl font-bold text-blue-900 mb-3">📊 Общая сводка</h3>
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-white p-3 rounded">
                    <div class="text-sm text-gray-600">Общий расход</div>
                    <div class="text-2xl font-bold text-blue-600">${grandTotalExpense.toFixed(2)} $</div>
                </div>
                <div class="bg-white p-3 rounded">
                    <div class="text-sm text-gray-600">Погашено</div>
                    <div class="text-2xl font-bold text-green-600">${grandTotalPayments.toFixed(2)} $</div>
                </div>
                <div class="bg-white p-3 rounded">
                    <div class="text-sm text-gray-600">Общий долг</div>
                    <div class="text-2xl font-bold ${grandTotalDebt < 0 ? 'text-red-600' : 'text-blue-600'}">${grandTotalDebt.toFixed(2)} $</div>
                </div>
            </div>
        </div>
    `;
    
    // Карточки клиентов
    sortedClients.forEach((clientName, index) => {
        const data = clientsData[clientName];
        
        // Группируем расходы по складам
        const expenseByWarehouse = {};
        data.expense.forEach(item => {
            const warehouse = item.warehouse;
            if (!expenseByWarehouse[warehouse]) {
                expenseByWarehouse[warehouse] = {
                    items: [],
                    totalAmount: 0
                };
            }
            expenseByWarehouse[warehouse].items.push(item);
            expenseByWarehouse[warehouse].totalAmount += parseFloat(item.total || 0);
        });
        
        html += `
            <div class="mb-6 border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <div class="flex justify-between items-center mb-4 bg-blue-100 p-3 rounded">
                    <h4 class="text-lg font-bold text-blue-900">${index + 1}. ${clientName}</h4>
                    <div class="text-right">
                        <div class="text-sm text-gray-600">Долг:</div>
                        <div class="text-xl font-bold ${data.debt < 0 ? 'text-red-600' : 'text-blue-600'}">
                            ${data.debt.toFixed(2)} $
                        </div>
                    </div>
                </div>
        `;
        
        // Расходы по складам
        if (Object.keys(expenseByWarehouse).length > 0) {
            html += `<div class="mb-4"><h5 class="font-semibold mb-2 text-gray-700">📦 Расходы:</h5>`;
            
            Object.keys(expenseByWarehouse).sort().forEach(warehouse => {
                const whData = expenseByWarehouse[warehouse];
                html += `
                    <div class="mb-3 bg-white rounded border">
                        <div class="bg-gray-100 p-2 font-semibold flex justify-between text-sm">
                            <span>🏪 ${warehouse}</span>
                            <span class="text-blue-700">${whData.totalAmount.toFixed(2)} $</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="p-2 text-left">Дата</th>
                                        <th class="p-2 text-left">Товар</th>
                                        <th class="p-2 text-left">Фирма</th>
                                        <th class="p-2 text-right">Кол-во</th>
                                        <th class="p-2 text-right">Цена</th>
                                        <th class="p-2 text-right">Сумма</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                whData.items.forEach(item => {
                    html += `
                        <tr class="border-t hover:bg-gray-50">
                            <td class="p-2">${item.date.split('T')[0]}</td>
                            <td class="p-2">${item.product || ''}</td>
                            <td class="p-2">${item.company || ''}</td>
                            <td class="p-2 text-right">${parseFloat(item.quantity || 0).toFixed(2)}</td>
                            <td class="p-2 text-right">${parseFloat(item.price || 0).toFixed(2)}</td>
                            <td class="p-2 text-right font-semibold">${parseFloat(item.total || 0).toFixed(2)}</td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        } else {
            html += `<div class="mb-4 text-gray-500 italic">Нет расходов</div>`;
        }
        
        // Погашения
        if (data.payments.length > 0) {
            html += `
                <div class="mb-2">
                    <h5 class="font-semibold mb-2 text-gray-700">💰 Погашения:</h5>
                    <div class="overflow-x-auto bg-white rounded border">
                        <table class="w-full text-sm">
                            <thead class="bg-green-50">
                                <tr>
                                    <th class="p-2 text-left">Дата</th>
                                    <th class="p-2 text-right">Сомони</th>
                                    <th class="p-2 text-right">Курс</th>
                                    <th class="p-2 text-right">Сумма ($)</th>
                                    <th class="p-2 text-left">Примечания</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            data.payments.forEach(item => {
                html += `
                    <tr class="border-t hover:bg-green-50">
                        <td class="p-2">${item.date.split('T')[0]}</td>
                        <td class="p-2 text-right">${parseFloat(item.somoni || 0).toFixed(2)}</td>
                        <td class="p-2 text-right">${parseFloat(item.rate || 0).toFixed(2)}</td>
                        <td class="p-2 text-right font-semibold text-green-700">${parseFloat(item.amount || 0).toFixed(2)}</td>
                        <td class="p-2">${item.notes || '-'}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            html += `<div class="mb-2 text-gray-500 italic">Нет погашений</div>`;
        }
        
        html += `</div>`;
    });
    
    html += `</div>`;
    
    return html;
}

// Печать карточки клиента
function printClientCard() {
    window.print();
}

// Экспорт в Excel
function exportClientCardToExcel() {
    const showAllClients = document.getElementById('clientCardShowAllClients')?.checked;
    const selectedClient = showAllClients ? '' : document.getElementById('clientCardClientInput')?.value.trim();
    const dateFrom = document.getElementById('clientCardDateFrom')?.value;
    const dateTo = document.getElementById('clientCardDateTo')?.value;
    
    const yearData = window.getCurrentYearData();
    if (!yearData) {
        alert('Нет данных для экспорта');
        return;
    }
    
    // Фильтруем расходы
    let expenses = yearData.expense ? yearData.expense.filter(item => {
        if (item.deleted) return false;
        if (!item.client) return false;
        if (selectedClient && item.client !== selectedClient) return false;
        
        const itemDate = item.date.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        
        return true;
    }) : [];
    
    // Фильтруем погашения
    let payments = yearData.payments ? yearData.payments.filter(item => {
        if (item.deleted) return false;
        if (!item.client) return false;
        if (selectedClient && item.client !== selectedClient) return false;
        
        const itemDate = item.date.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        
        return true;
    }) : [];
    
    // Группируем данные по клиентам
    const clientsData = {};
    
    expenses.forEach(item => {
        const client = item.client;
        if (!clientsData[client]) {
            clientsData[client] = {
                totalExpense: 0,
                totalPayments: 0,
                debt: 0,
                expense: [],
                payments: []
            };
        }
        clientsData[client].expense.push(item);
        clientsData[client].totalExpense += parseFloat(item.total || 0);
    });
    
    payments.forEach(item => {
        const client = item.client;
        if (!clientsData[client]) {
            clientsData[client] = {
                totalExpense: 0,
                totalPayments: 0,
                debt: 0,
                expense: [],
                payments: []
            };
        }
        clientsData[client].payments.push(item);
        clientsData[client].totalPayments += parseFloat(item.amount || 0);
    });
    
    // Расчет долгов (погашения - расход = долг)
    Object.keys(clientsData).forEach(client => {
        clientsData[client].debt = clientsData[client].totalPayments - clientsData[client].totalExpense;
    });
    
    // Сортировка клиентов (от меньшего к большему, т.е. самые большие долги первыми)
    const sortedClients = Object.keys(clientsData).sort((a, b) => {
        return clientsData[a].debt - clientsData[b].debt;
    });
    
    if (sortedClients.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    // Общие итоги
    let grandTotalExpense = 0;
    let grandTotalPayments = 0;
    let grandTotalDebt = 0;
    
    Object.values(clientsData).forEach(data => {
        grandTotalExpense += data.totalExpense;
        grandTotalPayments += data.totalPayments;
        grandTotalDebt += data.debt;
    });
    
    // Создаем книгу Excel
    const wb = XLSX.utils.book_new();
    
    // Лист 1: Общая сводка
    const summaryData = [
        ['КАРТОЧКА КЛИЕНТА'],
        ['Клиент:', selectedClient || 'Все клиенты'],
        ['Период:', `${dateFrom || 'начало'} - ${dateTo || 'конец'}`],
        ['Дата формирования:', new Date().toLocaleString('ru-RU')],
        ['Всего клиентов:', sortedClients.length],
        [],
        ['ОБЩАЯ СВОДКА'],
        ['Общий расход ($):', grandTotalExpense.toFixed(2)],
        ['Погашено ($):', grandTotalPayments.toFixed(2)],
        ['Общий долг ($):', grandTotalDebt.toFixed(2)],
        [],
        ['СВОДКА ПО КЛИЕНТАМ'],
        ['№', 'Клиент', 'Расход ($)', 'Погашено ($)', 'Долг ($)']
    ];
    
    sortedClients.forEach((client, index) => {
        const data = clientsData[client];
        summaryData.push([
            index + 1,
            client,
            data.totalExpense.toFixed(2),
            data.totalPayments.toFixed(2),
            data.debt.toFixed(2)
        ]);
    });
    
    summaryData.push([]);
    summaryData.push(['ИТОГО:', '', grandTotalExpense.toFixed(2), grandTotalPayments.toFixed(2), grandTotalDebt.toFixed(2)]);
    
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Общая сводка');
    
    // Листы для каждого клиента
    sortedClients.forEach((clientName, index) => {
        const data = clientsData[clientName];
        
        const clientData = [
            [`КЛИЕНТ: ${clientName}`],
            ['Расход ($):', data.totalExpense.toFixed(2)],
            ['Погашено ($):', data.totalPayments.toFixed(2)],
            ['Долг ($):', data.debt.toFixed(2)],
            [],
            ['РАСХОДЫ'],
            ['Дата', 'Товар', 'Фирма', 'Склад', 'Количество', 'Цена ($)', 'Сумма ($)', 'Примечания']
        ];
        
        data.expense.forEach(item => {
            clientData.push([
                item.date.split('T')[0],
                item.product || '',
                item.company || '',
                item.warehouse || '',
                parseFloat(item.quantity || 0),
                parseFloat(item.price || 0),
                parseFloat(item.total || 0),
                item.notes || ''
            ]);
        });
        
        clientData.push([]);
        clientData.push(['', '', '', '', '', 'ИТОГО:', data.totalExpense.toFixed(2), '']);
        clientData.push([]);
        clientData.push(['ПОГАШЕНИЯ']);
        clientData.push(['Дата', 'Сомони', 'Курс', 'Сумма ($)', 'Примечания']);
        
        data.payments.forEach(item => {
            clientData.push([
                item.date.split('T')[0],
                parseFloat(item.somoni || 0),
                parseFloat(item.rate || 0),
                parseFloat(item.amount || 0),
                item.notes || ''
            ]);
        });
        
        clientData.push([]);
        clientData.push(['', '', 'ИТОГО:', data.totalPayments.toFixed(2), '']);
        
        const wsClient = XLSX.utils.aoa_to_sheet(clientData);
        
        // Ограничиваем длину имени листа (Excel максимум 31 символ)
        let sheetName = `${index + 1}. ${clientName}`;
        if (sheetName.length > 31) {
            sheetName = sheetName.substring(0, 28) + '...';
        }
        
        XLSX.utils.book_append_sheet(wb, wsClient, sheetName);
    });
    
    // Сохранение файла
    const clientText = selectedClient ? `_${selectedClient}` : '_Все_клиенты';
    const fileName = `Карточка_клиента${clientText}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log(`✅ Экспорт завершен: ${fileName}`);
}

console.log('✅ client-card.js инициализирован');
