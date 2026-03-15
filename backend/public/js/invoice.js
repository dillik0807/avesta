/**
 * 📄 МОДУЛЬ НАКЛАДНЫХ
 */

console.log('📄 Модуль накладных загружен');

let currentInvoiceData = null;

// Открытие модального окна для создания накладной
window.openInvoiceModal = function() {
    console.log('📄 Открытие модального окна накладной');

    const selectedCheckboxes = document.querySelectorAll('.expense-checkbox:checked');
    console.log('Найдено выбранных чекбоксов:', selectedCheckboxes.length);

    if (selectedCheckboxes.length === 0) {
        alert('Выберите документы для создания накладной.\n\nИнструкция:\n1. Перейдите в раздел "Расход"\n2. Поставьте галочки на нужных документах\n3. Нажмите "Создать накладную"');
        return;
    }

    // Проверить, что все выбранные документы принадлежат одному клиенту
    const clients = new Set();
    selectedCheckboxes.forEach(checkbox => {
        clients.add(checkbox.dataset.client);
    });

    if (clients.size > 1) {
        alert('Выберите документы только одного клиента');
        return;
    }

    // Заполнить выпадающий список клиентов
    const invoiceClientSelect = document.getElementById('invoiceClient');
    invoiceClientSelect.innerHTML = '<option value="">Выберите клиента</option>';
    
    const appData = window.appData;
    if (appData && appData.clients) {
        appData.clients.forEach(client => {
            const clientName = typeof client === 'string' ? client : client.name;
            const clientPhone = typeof client === 'string' ? '' : (client.phone || '');
            const displayText = clientPhone ? `${clientName} (${clientPhone})` : clientName;
            const selected = clients.has(clientName) ? 'selected' : '';
            invoiceClientSelect.innerHTML += `<option value="${clientName}" ${selected}>${displayText}</option>`;
        });
    }

    filterExpensesByClient();
    document.getElementById('invoiceModal').classList.remove('hidden');
};

// Закрытие модального окна создания накладной
window.closeInvoiceModal = function() {
    document.getElementById('invoiceModal').classList.add('hidden');
    // Снять выделение с чекбоксов
    document.querySelectorAll('.expense-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    const selectAll = document.getElementById('selectAllExpense');
    if (selectAll) selectAll.checked = false;
};

// Закрытие модального окна печати
window.closePrintModal = function() {
    document.getElementById('printModal').classList.add('hidden');
};

// Переключение выбора всех чекбоксов
window.toggleSelectAllExpense = function() {
    const selectAll = document.getElementById('selectAllExpense');
    const checkboxes = document.querySelectorAll('.expense-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
};

// Фильтрация расходов по выбранному клиенту
window.filterExpensesByClient = function() {
    const selectedClient = document.getElementById('invoiceClient').value;
    const selectedExpensesContent = document.getElementById('selectedExpensesContent');

    if (!selectedClient) {
        selectedExpensesContent.innerHTML = '<p class="text-gray-500">Выберите клиента</p>';
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.expense-checkbox:checked');
    const yearData = window.getCurrentYearData();
    
    if (!yearData || !yearData.expense) {
        selectedExpensesContent.innerHTML = '<p class="text-gray-500">Нет данных</p>';
        return;
    }

    const selectedExpenses = [];
    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.dataset.client === selectedClient) {
            const expenseId = parseInt(checkbox.dataset.id);
            const expense = yearData.expense.find(e => e.id === expenseId);
            if (expense && !expense.deleted) {
                selectedExpenses.push(expense);
            }
        }
    });

    if (selectedExpenses.length === 0) {
        selectedExpensesContent.innerHTML = '<p class="text-gray-500">Нет выбранных документов для этого клиента</p>';
        return;
    }

    // Группировка по складам
    const warehouseGroups = {};
    selectedExpenses.forEach(expense => {
        if (!warehouseGroups[expense.warehouse]) {
            warehouseGroups[expense.warehouse] = [];
        }
        warehouseGroups[expense.warehouse].push(expense);
    });

    let html = '';
    let grandTotal = 0;

    Object.keys(warehouseGroups).forEach(warehouse => {
        let warehouseTotal = 0;
        html += `<div class="border rounded p-4 mb-4">
            <h4 class="font-semibold mb-2">Склад: ${warehouse}</h4>
            <table class="w-full text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="p-2 text-left">Дата</th>
                        <th class="p-2 text-left">Товар</th>
                        <th class="p-2 text-right">Кол-во</th>
                        <th class="p-2 text-right">Тонн</th>
                        <th class="p-2 text-right">Цена</th>
                        <th class="p-2 text-right">Сумма</th>
                    </tr>
                </thead>
                <tbody>`;

        warehouseGroups[warehouse].forEach(expense => {
            const total = parseFloat(expense.total || 0);
            warehouseTotal += total;
            html += `<tr class="border-t">
                <td class="p-2">${expense.date ? expense.date.split('T')[0] : ''}</td>
                <td class="p-2">${expense.product || ''}</td>
                <td class="p-2 text-right">${parseFloat(expense.quantity || 0).toLocaleString('ru-RU')}</td>
                <td class="p-2 text-right">${parseFloat(expense.tons || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td class="p-2 text-right">${parseFloat(expense.price || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                <td class="p-2 text-right">${total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
            </tr>`;
        });

        grandTotal += warehouseTotal;

        html += `</tbody>
                <tfoot class="bg-gray-100 font-semibold">
                    <tr>
                        <td colspan="5" class="p-2 text-right">Итого по складу:</td>
                        <td class="p-2 text-right">${warehouseTotal.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
    });

    html += `<div class="text-right text-lg font-bold mt-4">
        ОБЩАЯ СУММА: ${grandTotal.toLocaleString('ru-RU', {minimumFractionDigits: 2})} доллар
    </div>`;

    selectedExpensesContent.innerHTML = html;
};

// Генерация накладной
window.generateInvoice = function() {
    console.log('📄 Генерация накладной');

    const selectedClient = document.getElementById('invoiceClient').value;
    console.log('Выбранный клиент:', selectedClient);

    if (!selectedClient) {
        alert('Выберите клиента из выпадающего списка');
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.expense-checkbox:checked');
    const yearData = window.getCurrentYearData();
    const selectedExpenses = [];

    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.dataset.client === selectedClient) {
            const expenseId = parseInt(checkbox.dataset.id);
            const expense = yearData.expense.find(e => e.id === expenseId);
            if (expense && !expense.deleted) {
                selectedExpenses.push(expense);
            }
        }
    });

    if (selectedExpenses.length === 0) {
        alert('Нет выбранных документов для создания накладной');
        return;
    }

    // Сохраняем данные накладной для экспорта
    currentInvoiceData = {
        client: selectedClient,
        expenses: selectedExpenses
    };

    generateInvoiceContent(selectedClient, selectedExpenses);
    document.getElementById('invoiceModal').classList.add('hidden');
    document.getElementById('printModal').classList.remove('hidden');
};

// Генерация содержимого накладной
function generateInvoiceContent(client, expenses) {
    const invoiceNumber = `РН-${Date.now()}`;
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const currentUserData = window.currentUser;
    const currentUserName = currentUserData ? currentUserData.username : 'Неизвестный пользователь';

    // Группировка по складам
    const warehouseGroups = {};
    expenses.forEach(expense => {
        if (!warehouseGroups[expense.warehouse]) {
            warehouseGroups[expense.warehouse] = [];
        }
        warehouseGroups[expense.warehouse].push(expense);
    });

    // Функция для генерации одной накладной
    function generateSingleInvoice(copyType) {
        let html = `
            <div class="max-w-4xl mx-auto p-6 bg-white invoice-copy">
                <div class="text-center mb-6">
                    <h1 class="text-xl font-bold mb-1">РАСХОДНАЯ НАКЛАДНАЯ</h1>
                    <p class="text-base">№ ${invoiceNumber} от ${currentDate}</p>
                    <p class="text-sm text-gray-600 mt-1">${copyType}</p>
                </div>
                
                <div class="mb-4">
                    <div class="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p><strong>Клиент:</strong> ${client}</p>
                            <p><strong>Дата составления:</strong> ${currentDate}</p>
                        </div>
                        <div>
                            <p><strong>Составил:</strong> ${currentUserName}</p>
                            <p><strong>Номер накладной:</strong> ${invoiceNumber}</p>
                        </div>
                    </div>
                </div>
        `;

        let grandTotal = 0;
        let itemNumber = 1;

        Object.keys(warehouseGroups).forEach(warehouse => {
            html += `
                <div class="mb-6">
                    <h3 class="text-base font-semibold mb-2 bg-gray-100 p-2">Склад: ${warehouse}</h3>
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="border border-gray-300 p-1 text-left" style="width: 5%;">№</th>
                                <th class="border border-gray-300 p-1 text-left" style="width: 10%;">Дата</th>
                                <th class="border border-gray-300 p-1 text-left" style="width: 35%;">Наименование товара</th>
                                <th class="border border-gray-300 p-1 text-left" style="width: 10%;">Кол-во</th>
                                <th class="border border-gray-300 p-1 text-left" style="width: 10%;">Тонн</th>
                                <th class="border border-gray-300 p-1 text-left" style="width: 15%;">Цена</th>
                                <th class="border border-gray-300 p-1 text-left" style="width: 15%;">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            let warehouseTotal = 0;
            warehouseGroups[warehouse].forEach(expense => {
                const total = parseFloat(expense.total || 0);
                warehouseTotal += total;
                const date = expense.date ? expense.date.split('T')[0] : '';
                html += `
                    <tr>
                        <td class="border border-gray-300 p-1">${itemNumber++}</td>
                        <td class="border border-gray-300 p-1">${date}</td>
                        <td class="border border-gray-300 p-1">${expense.product || ''}</td>
                        <td class="border border-gray-300 p-1">${parseFloat(expense.quantity || 0).toLocaleString('ru-RU')}</td>
                        <td class="border border-gray-300 p-1">${parseFloat(expense.tons || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                        <td class="border border-gray-300 p-1">${parseFloat(expense.price || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                        <td class="border border-gray-300 p-1">${total.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                    </tr>
                `;
            });

            grandTotal += warehouseTotal;

            html += `
                        </tbody>
                        <tfoot>
                            <tr class="bg-gray-100 font-semibold">
                                <td colspan="6" class="border border-gray-300 p-1 text-right">Итого по складу ${warehouse}:</td>
                                <td class="border border-gray-300 p-1">${warehouseTotal.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        });

        html += `
                <div class="mt-4">
                    <div class="text-right">
                        <p class="text-lg font-bold">ОБЩАЯ СУММА: ${grandTotal.toLocaleString('ru-RU', {minimumFractionDigits: 2})} доллар</p>
                    </div>
                </div>
                
                <div class="mt-8 grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <p class="mb-6">Отпустил: ________________</p>
                        <p class="text-xs">(подпись, ФИО)</p>
                    </div>
                    <div>
                        <p class="mb-6">Получил: ________________</p>
                        <p class="text-xs">(подпись, ФИО)</p>
                    </div>
                </div>
                
                <div class="mt-6 text-center text-xs text-gray-600">
                    <p>Накладная создана в системе учёта товаров</p>
                    <p>Дата и время создания: ${new Date().toLocaleString('ru-RU')}</p>
                </div>
            </div>
        `;
        
        return html;
    }

    // Генерируем две накладные: для клиента и для завсклада
    const html = generateSingleInvoice('Экземпляр для клиента') + 
                generateSingleInvoice('Экземпляр для завсклада');

    document.getElementById('invoiceContent').innerHTML = html;
}

// Печать накладной
window.printInvoice = function() {
    window.print();
};

// Экспорт накладной в Excel
window.exportInvoiceToExcel = function() {
    if (!currentInvoiceData) {
        alert('Нет данных накладной для экспорта');
        return;
    }

    const { client, expenses } = currentInvoiceData;
    const invoiceNumber = `РН-${Date.now()}`;
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const currentUserData = window.currentUser;
    const currentUserName = currentUserData ? currentUserData.username : 'Неизвестный';

    // Группировка по складам
    const warehouseGroups = {};
    expenses.forEach(expense => {
        if (!warehouseGroups[expense.warehouse]) {
            warehouseGroups[expense.warehouse] = [];
        }
        warehouseGroups[expense.warehouse].push(expense);
    });

    const wb = XLSX.utils.book_new();

    // Создаем общий лист с информацией о накладной
    const summaryData = [
        ['', '', 'РАСХОДНАЯ НАКЛАДНАЯ', '', ''],
        ['', '', `№ ${invoiceNumber} от ${currentDate}`, '', ''],
        ['', '', '', '', ''],
        ['Параметр', 'Значение', '', 'Параметр', 'Значение'],
        ['Клиент:', client, '', 'Номер накладной:', invoiceNumber],
        ['Дата составления:', currentDate, '', 'Составил:', currentUserName],
        ['', '', '', '', ''],
        ['', '', 'ИТОГИ ПО СКЛАДАМ', '', '']
    ];

    let grandTotal = 0;
    Object.keys(warehouseGroups).forEach(warehouse => {
        let warehouseTotal = 0;
        warehouseGroups[warehouse].forEach(expense => {
            warehouseTotal += parseFloat(expense.total || 0);
        });
        grandTotal += warehouseTotal;
        summaryData.push(['Склад:', warehouse, '', 'Сумма:', warehouseTotal.toFixed(2)]);
    });

    summaryData.push(['', '', '', '', '']);
    summaryData.push(['', '', 'ОБЩАЯ СУММА:', '', grandTotal.toFixed(2)]);

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!merges'] = [
        { s: { r: 0, c: 2 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } },
        { s: { r: 7, c: 2 }, e: { r: 7, c: 4 } }
    ];

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Расходная накладная');

    // Создаем отдельный лист для каждого склада
    Object.keys(warehouseGroups).forEach(warehouse => {
        const expenses = warehouseGroups[warehouse];
        
        const data = [
            ['', '', 'РАСХОДНАЯ НАКЛАДНАЯ', '', '', '', ''],
            ['', '', `№ ${invoiceNumber} от ${currentDate}`, '', '', '', ''],
            ['', '', `Клиент: ${client}`, '', '', '', ''],
            ['', '', `Склад: ${warehouse}`, '', '', '', ''],
            ['', '', '', '', '', '', ''],
            ['№', 'Дата', 'Товар', 'Кол-во', 'Тонн', 'Цена', 'Сумма']
        ];

        let itemNumber = 1;
        let warehouseTotal = 0;

        expenses.forEach(expense => {
            const total = parseFloat(expense.total || 0);
            warehouseTotal += total;
            const date = expense.date ? expense.date.split('T')[0] : '';
            data.push([
                itemNumber++,
                date,
                expense.product || '',
                parseFloat(expense.quantity || 0),
                parseFloat(expense.tons || 0),
                parseFloat(expense.price || 0),
                total
            ]);
        });

        data.push(['', '', '', '', '', 'ИТОГО:', warehouseTotal]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!merges'] = [
            { s: { r: 0, c: 2 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 2 }, e: { r: 1, c: 6 } },
            { s: { r: 2, c: 2 }, e: { r: 2, c: 6 } },
            { s: { r: 3, c: 2 }, e: { r: 3, c: 6 } }
        ];

        XLSX.utils.book_append_sheet(wb, ws, warehouse.substring(0, 31));
    });

    const username = currentUserName;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Накладная_${client}_${username}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
};

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', function() {
    // Кнопка создания накладной
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', window.openInvoiceModal);
    }

    // Выбор всех чекбоксов
    const selectAllExpense = document.getElementById('selectAllExpense');
    if (selectAllExpense) {
        selectAllExpense.addEventListener('change', window.toggleSelectAllExpense);
    }

    // Закрытие модального окна создания накладной
    const closeInvoiceModal = document.getElementById('closeInvoiceModal');
    if (closeInvoiceModal) {
        closeInvoiceModal.addEventListener('click', window.closeInvoiceModal);
    }

    const cancelInvoice = document.getElementById('cancelInvoice');
    if (cancelInvoice) {
        cancelInvoice.addEventListener('click', window.closeInvoiceModal);
    }

    // Изменение клиента
    const invoiceClient = document.getElementById('invoiceClient');
    if (invoiceClient) {
        invoiceClient.addEventListener('change', window.filterExpensesByClient);
    }

    // Печать накладной
    const printInvoice = document.getElementById('printInvoice');
    if (printInvoice) {
        printInvoice.addEventListener('click', window.generateInvoice);
    }

    // Закрытие модального окна печати
    const closePrintModal = document.getElementById('closePrintModal');
    if (closePrintModal) {
        closePrintModal.addEventListener('click', window.closePrintModal);
    }

    // Печать
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', window.printInvoice);
    }

    // Экспорт в Excel
    const exportInvoiceExcel = document.getElementById('exportInvoiceExcel');
    if (exportInvoiceExcel) {
        exportInvoiceExcel.addEventListener('click', window.exportInvoiceToExcel);
    }
});

console.log('✅ invoice.js инициализирован');
