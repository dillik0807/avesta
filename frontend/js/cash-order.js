/**
 * 💵 МОДУЛЬ КАССОВЫХ ОРДЕРОВ
 */

console.log('💵 Модуль кассовых ордеров загружен');

let currentCashOrderData = null;

// Открытие модального окна для создания кассового ордера
window.openCashOrderModal = function() {
    console.log('💵 Открытие модального окна кассового ордера');

    const selectedCheckboxes = document.querySelectorAll('.payment-checkbox:checked');
    console.log('Найдено выбранных чекбоксов:', selectedCheckboxes.length);

    if (selectedCheckboxes.length === 0) {
        alert('Выберите погашения для создания кассового ордера.\n\nИнструкция:\n1. Перейдите в раздел "Погашения"\n2. Поставьте галочки на нужных погашениях\n3. Нажмите "Создать кассовый ордер"');
        return;
    }

    // Проверить, что все выбранные погашения принадлежат одному клиенту
    const clients = new Set();
    selectedCheckboxes.forEach(checkbox => {
        clients.add(checkbox.dataset.client);
    });

    if (clients.size > 1) {
        alert('Выберите погашения только одного клиента');
        return;
    }

    // Заполнить выпадающий список клиентов
    const cashOrderClientSelect = document.getElementById('cashOrderClient');
    cashOrderClientSelect.innerHTML = '<option value="">Выберите клиента</option>';
    
    const appData = window.appData;
    if (appData && appData.clients) {
        appData.clients.forEach(client => {
            const clientName = typeof client === 'string' ? client : client.name;
            const clientPhone = typeof client === 'string' ? '' : (client.phone || '');
            const displayText = clientPhone ? `${clientName} (${clientPhone})` : clientName;
            const selected = clients.has(clientName) ? 'selected' : '';
            cashOrderClientSelect.innerHTML += `<option value="${clientName}" ${selected}>${displayText}</option>`;
        });
    }

    filterPaymentsByClient();
    document.getElementById('cashOrderModal').classList.remove('hidden');
};

// Закрытие модального окна создания кассового ордера
window.closeCashOrderModal = function() {
    document.getElementById('cashOrderModal').classList.add('hidden');
    // Снять выделение с чекбоксов погашений
    document.querySelectorAll('.payment-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    const selectAllPayments = document.getElementById('selectAllPayments');
    if (selectAllPayments) selectAllPayments.checked = false;
    
    // Снять выделение с чекбоксов партнеров
    document.querySelectorAll('.partner-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    const selectAllPartners = document.getElementById('selectAllPartners');
    if (selectAllPartners) selectAllPartners.checked = false;
};

// Закрытие модального окна печати кассового ордера
window.closePrintCashOrderModal = function() {
    document.getElementById('printCashOrderModal').classList.add('hidden');
};

// Переключение выбора всех чекбоксов погашений
window.toggleSelectAllPayments = function() {
    const selectAll = document.getElementById('selectAllPayments');
    const checkboxes = document.querySelectorAll('.payment-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
};

// Фильтрация погашений по выбранному клиенту
window.filterPaymentsByClient = function() {
    const selectedClient = document.getElementById('cashOrderClient').value;
    const selectedPaymentsContent = document.getElementById('selectedPaymentsContent');

    if (!selectedClient) {
        selectedPaymentsContent.innerHTML = '<p class="text-gray-500">Выберите клиента</p>';
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.payment-checkbox:checked');
    const yearData = window.getCurrentYearData();
    
    if (!yearData || !yearData.payments) {
        selectedPaymentsContent.innerHTML = '<p class="text-gray-500">Нет данных</p>';
        return;
    }

    const selectedPayments = [];
    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.dataset.client === selectedClient) {
            const paymentId = parseInt(checkbox.dataset.id);
            const payment = yearData.payments.find(p => p.id === paymentId);
            if (payment && !payment.deleted) {
                selectedPayments.push(payment);
            }
        }
    });

    if (selectedPayments.length === 0) {
        selectedPaymentsContent.innerHTML = '<p class="text-gray-500">Нет выбранных погашений для этого клиента</p>';
        return;
    }

    let html = '<div class="border rounded p-4">';
    html += '<table class="w-full text-sm">';
    html += '<thead class="bg-gray-50">';
    html += '<tr>';
    html += '<th class="p-2 text-left">Дата</th>';
    html += '<th class="p-2 text-right">Сомони</th>';
    html += '<th class="p-2 text-right">Курс</th>';
    html += '<th class="p-2 text-right">Доллар</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    let totalSomoni = 0;
    let totalDollar = 0;

    selectedPayments.forEach(payment => {
        const somoni = parseFloat(payment.somoni || 0);
        const dollar = parseFloat(payment.amount || 0);
        totalSomoni += somoni;
        totalDollar += dollar;
        
        html += '<tr class="border-t">';
        html += `<td class="p-2">${payment.date ? payment.date.split('T')[0] : ''}</td>`;
        html += `<td class="p-2 text-right">${somoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
        html += `<td class="p-2 text-right">${parseFloat(payment.rate || 0).toLocaleString('ru-RU', {minimumFractionDigits: 4})}</td>`;
        html += `<td class="p-2 text-right">${dollar.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
        html += '</tr>';
    });

    html += '</tbody>';
    html += '<tfoot class="bg-gray-100 font-semibold">';
    html += '<tr>';
    html += '<td class="p-2 text-right">ИТОГО:</td>';
    html += `<td class="p-2 text-right">${totalSomoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
    html += '<td class="p-2"></td>';
    html += `<td class="p-2 text-right">${totalDollar.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
    html += '</tr>';
    html += '</tfoot>';
    html += '</table>';
    html += '</div>';

    selectedPaymentsContent.innerHTML = html;
};

// Генерация кассового ордера
window.generateCashOrder = function() {
    console.log('💵 Генерация кассового ордера');

    const selectedClient = document.getElementById('cashOrderClient').value;
    console.log('Выбранный клиент:', selectedClient);

    if (!selectedClient) {
        alert('Выберите клиента из выпадающего списка');
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.payment-checkbox:checked');
    const yearData = window.getCurrentYearData();
    const selectedPayments = [];

    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.dataset.client === selectedClient) {
            const paymentId = parseInt(checkbox.dataset.id);
            const payment = yearData.payments.find(p => p.id === paymentId);
            if (payment && !payment.deleted) {
                selectedPayments.push(payment);
            }
        }
    });

    if (selectedPayments.length === 0) {
        alert('Нет выбранных погашений для создания кассового ордера');
        return;
    }

    // Сохраняем данные кассового ордера для экспорта
    currentCashOrderData = {
        client: selectedClient,
        payments: selectedPayments
    };

    generateCashOrderContent(selectedClient, selectedPayments);
    document.getElementById('cashOrderModal').classList.add('hidden');
    document.getElementById('printCashOrderModal').classList.remove('hidden');
};

// Генерация содержимого кассового ордера
function generateCashOrderContent(client, payments) {
    const orderNumber = `РКО-${Date.now()}`;
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const currentUserData = window.currentUser;
    const currentUserName = currentUserData ? currentUserData.username : 'Неизвестный пользователь';

    // Функция для генерации одного кассового ордера
    function generateSingleCashOrder(copyType) {
        let totalSomoni = 0;
        let totalDollar = 0;

        payments.forEach(payment => {
            totalSomoni += parseFloat(payment.somoni || 0);
            totalDollar += parseFloat(payment.amount || 0);
        });

        let html = `
            <div class="max-w-4xl mx-auto p-6 bg-white cash-order-copy">
                <div class="text-center mb-6">
                    <h1 class="text-xl font-bold mb-1">РАСХОДНЫЙ КАССОВЫЙ ОРДЕР</h1>
                    <p class="text-base">№ ${orderNumber} от ${currentDate}</p>
                    <p class="text-sm text-gray-600 mt-1">${copyType}</p>
                </div>
                
                <div class="mb-4">
                    <div class="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p><strong>Выдать:</strong> ${client}</p>
                            <p><strong>Дата составления:</strong> ${currentDate}</p>
                        </div>
                        <div>
                            <p><strong>Составил:</strong> ${currentUserName}</p>
                            <p><strong>Номер ордера:</strong> ${orderNumber}</p>
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="border border-gray-300 p-2 text-left" style="width: 5%;">№</th>
                                <th class="border border-gray-300 p-2 text-left" style="width: 15%;">Дата</th>
                                <th class="border border-gray-300 p-2 text-right" style="width: 25%;">Сомони</th>
                                <th class="border border-gray-300 p-2 text-right" style="width: 20%;">Курс</th>
                                <th class="border border-gray-300 p-2 text-right" style="width: 25%;">Доллар</th>
                                <th class="border border-gray-300 p-2 text-left" style="width: 10%;">Примечания</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        let itemNumber = 1;
        payments.forEach(payment => {
            const date = payment.date ? payment.date.split('T')[0] : '';
            html += `
                <tr>
                    <td class="border border-gray-300 p-2">${itemNumber++}</td>
                    <td class="border border-gray-300 p-2">${date}</td>
                    <td class="border border-gray-300 p-2 text-right">${parseFloat(payment.somoni || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                    <td class="border border-gray-300 p-2 text-right">${parseFloat(payment.rate || 0).toLocaleString('ru-RU', {minimumFractionDigits: 4})}</td>
                    <td class="border border-gray-300 p-2 text-right">${parseFloat(payment.amount || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                    <td class="border border-gray-300 p-2">${payment.notes || ''}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                        <tfoot>
                            <tr class="bg-gray-100 font-semibold">
                                <td colspan="2" class="border border-gray-300 p-2 text-right">ИТОГО:</td>
                                <td class="border border-gray-300 p-2 text-right">${totalSomoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                                <td class="border border-gray-300 p-2"></td>
                                <td class="border border-gray-300 p-2 text-right">${totalDollar.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>
                                <td class="border border-gray-300 p-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="mt-4">
                    <div class="text-right">
                        <p class="text-lg font-bold">ОБЩАЯ СУММА: ${totalDollar.toLocaleString('ru-RU', {minimumFractionDigits: 2})} $ (${totalSomoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})} сом.)</p>
                    </div>
                </div>
                
                <div class="mt-8 grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <p class="mb-6">Выдал: ________________</p>
                        <p class="text-xs">(подпись, ФИО кассира)</p>
                    </div>
                    <div>
                        <p class="mb-6">Получил: ________________</p>
                        <p class="text-xs">(подпись, ФИО получателя)</p>
                    </div>
                </div>
                
                <div class="mt-6 text-center text-xs text-gray-600">
                    <p>Кассовый ордер создан в системе учёта товаров</p>
                    <p>Дата и время создания: ${new Date().toLocaleString('ru-RU')}</p>
                </div>
            </div>
        `;
        
        return html;
    }

    // Генерируем два кассовых ордера: для кассы и для клиента
    const html = generateSingleCashOrder('Экземпляр для кассы') + 
                generateSingleCashOrder('Экземпляр для клиента');

    document.getElementById('cashOrderContent').innerHTML = html;
}

// Печать кассового ордера
window.printCashOrder = function() {
    window.print();
};

// Экспорт кассового ордера в Excel
window.exportCashOrderToExcel = function() {
    if (!currentCashOrderData) {
        alert('Нет данных кассового ордера для экспорта');
        return;
    }

    const { client, payments } = currentCashOrderData;
    const orderNumber = `РКО-${Date.now()}`;
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const currentUserData = window.currentUser;
    const currentUserName = currentUserData ? currentUserData.username : 'Неизвестный';

    const wb = XLSX.utils.book_new();

    // Создаем главный лист с информацией о кассовом ордере
    let totalSomoni = 0;
    let totalDollar = 0;

    payments.forEach(payment => {
        totalSomoni += parseFloat(payment.somoni || 0);
        totalDollar += parseFloat(payment.amount || 0);
    });

    const mainData = [
        ['РАСХОДНЫЙ КАССОВЫЙ ОРДЕР'],
        [`№ ${orderNumber} от ${currentDate}`],
        [`Клиент: ${client}`, '', '', '', `Составил: ${currentUserName}`],
        [''],
        ['№', 'Дата', 'Сомони', 'Курс', 'Доллар', 'Примечания']
    ];

    let itemNumber = 1;
    payments.forEach(payment => {
        const date = payment.date ? payment.date.split('T')[0] : '';
        mainData.push([
            itemNumber++,
            date,
            parseFloat(payment.somoni || 0),
            parseFloat(payment.rate || 0),
            parseFloat(payment.amount || 0),
            payment.notes || ''
        ]);
    });

    mainData.push(['']);
    mainData.push(['', 'ИТОГО:', totalSomoni, '', totalDollar, '']);

    const mainWs = XLSX.utils.aoa_to_sheet(mainData);
    XLSX.utils.book_append_sheet(wb, mainWs, 'Кассовый ордер');

    const username = currentUserName;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Кассовый_ордер_${client}_${username}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
};

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', function() {
    // Кнопка создания кассового ордера для погашений
    const createCashOrderBtn = document.getElementById('createCashOrderBtn');
    if (createCashOrderBtn) {
        createCashOrderBtn.addEventListener('click', window.openCashOrderModal);
    }

    // Кнопка создания кассового ордера для партнеров
    const createPartnerCashOrderBtn = document.getElementById('createPartnerCashOrderBtn');
    if (createPartnerCashOrderBtn) {
        createPartnerCashOrderBtn.addEventListener('click', window.openPartnerCashOrderModal);
    }

    // Выбор всех чекбоксов погашений
    const selectAllPayments = document.getElementById('selectAllPayments');
    if (selectAllPayments) {
        selectAllPayments.addEventListener('change', window.toggleSelectAllPayments);
    }

    // Выбор всех чекбоксов партнеров
    const selectAllPartners = document.getElementById('selectAllPartners');
    if (selectAllPartners) {
        selectAllPartners.addEventListener('change', window.toggleSelectAllPartners);
    }

    // Закрытие модального окна создания кассового ордера
    const closeCashOrderModal = document.getElementById('closeCashOrderModal');
    if (closeCashOrderModal) {
        closeCashOrderModal.addEventListener('click', window.closeCashOrderModal);
    }

    const cancelCashOrder = document.getElementById('cancelCashOrder');
    if (cancelCashOrder) {
        cancelCashOrder.addEventListener('click', window.closeCashOrderModal);
    }

    // Изменение клиента
    const cashOrderClient = document.getElementById('cashOrderClient');
    if (cashOrderClient) {
        cashOrderClient.addEventListener('change', function() {
            // Проверяем, какие чекбоксы выбраны (погашения или партнеры)
            const paymentCheckboxes = document.querySelectorAll('.payment-checkbox:checked');
            const partnerCheckboxes = document.querySelectorAll('.partner-checkbox:checked');
            
            if (paymentCheckboxes.length > 0) {
                window.filterPaymentsByClient();
            } else if (partnerCheckboxes.length > 0) {
                window.filterPartnersByClient();
            }
        });
    }

    // Печать кассового ордера
    const printCashOrder = document.getElementById('printCashOrder');
    if (printCashOrder) {
        printCashOrder.addEventListener('click', function() {
            // Проверяем, какие чекбоксы выбраны
            const paymentCheckboxes = document.querySelectorAll('.payment-checkbox:checked');
            const partnerCheckboxes = document.querySelectorAll('.partner-checkbox:checked');
            
            if (paymentCheckboxes.length > 0) {
                window.generateCashOrder();
            } else if (partnerCheckboxes.length > 0) {
                window.generatePartnerCashOrder();
            }
        });
    }

    // Закрытие модального окна печати
    const closePrintCashOrderModal = document.getElementById('closePrintCashOrderModal');
    if (closePrintCashOrderModal) {
        closePrintCashOrderModal.addEventListener('click', window.closePrintCashOrderModal);
    }

    // Печать
    const printCashOrderBtn = document.getElementById('printCashOrderBtn');
    if (printCashOrderBtn) {
        printCashOrderBtn.addEventListener('click', window.printCashOrder);
    }

    // Экспорт в Excel
    const exportCashOrderExcel = document.getElementById('exportCashOrderExcel');
    if (exportCashOrderExcel) {
        exportCashOrderExcel.addEventListener('click', window.exportCashOrderToExcel);
    }
});

console.log('✅ cash-order.js инициализирован');


// ===== КАССОВЫЙ ОРДЕР ДЛЯ ПАРТНЕРОВ =====

// Открытие модального окна для создания кассового ордера партнеров
window.openPartnerCashOrderModal = function() {
    console.log('💵 Открытие модального окна кассового ордера партнеров');

    const selectedCheckboxes = document.querySelectorAll('.partner-checkbox:checked');
    console.log('Найдено выбранных чекбоксов:', selectedCheckboxes.length);

    if (selectedCheckboxes.length === 0) {
        alert('Выберите партнеров для создания кассового ордера.\n\nИнструкция:\n1. Перейдите в раздел "Партнеры"\n2. Поставьте галочки на нужных записях\n3. Нажмите "Создать кассовый ордер"');
        return;
    }

    // Проверить, что все выбранные записи принадлежат одному клиенту
    const clients = new Set();
    selectedCheckboxes.forEach(checkbox => {
        clients.add(checkbox.dataset.client);
    });

    if (clients.size > 1) {
        alert('Выберите записи только одного клиента');
        return;
    }

    // Заполнить выпадающий список клиентов
    const cashOrderClientSelect = document.getElementById('cashOrderClient');
    cashOrderClientSelect.innerHTML = '<option value="">Выберите клиента</option>';
    
    const appData = window.appData;
    if (appData && appData.clients) {
        appData.clients.forEach(client => {
            const clientName = typeof client === 'string' ? client : client.name;
            const clientPhone = typeof client === 'string' ? '' : (client.phone || '');
            const displayText = clientPhone ? `${clientName} (${clientPhone})` : clientName;
            const selected = clients.has(clientName) ? 'selected' : '';
            cashOrderClientSelect.innerHTML += `<option value="${clientName}" ${selected}>${displayText}</option>`;
        });
    }

    filterPartnersByClient();
    document.getElementById('cashOrderModal').classList.remove('hidden');
};

// Переключение выбора всех чекбоксов партнеров
window.toggleSelectAllPartners = function() {
    const selectAll = document.getElementById('selectAllPartners');
    const checkboxes = document.querySelectorAll('.partner-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
};

// Фильтрация партнеров по выбранному клиенту
window.filterPartnersByClient = function() {
    const selectedClient = document.getElementById('cashOrderClient').value;
    const selectedPaymentsContent = document.getElementById('selectedPaymentsContent');

    if (!selectedClient) {
        selectedPaymentsContent.innerHTML = '<p class="text-gray-500">Выберите клиента</p>';
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.partner-checkbox:checked');
    const yearData = window.getCurrentYearData();
    
    if (!yearData || !yearData.partners) {
        selectedPaymentsContent.innerHTML = '<p class="text-gray-500">Нет данных</p>';
        return;
    }

    const selectedPartners = [];
    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.dataset.client === selectedClient) {
            const partnerId = parseInt(checkbox.dataset.id);
            const partner = yearData.partners.find(p => p.id === partnerId);
            if (partner && !partner.deleted) {
                selectedPartners.push(partner);
            }
        }
    });

    if (selectedPartners.length === 0) {
        selectedPaymentsContent.innerHTML = '<p class="text-gray-500">Нет выбранных записей для этого клиента</p>';
        return;
    }

    let html = '<div class="border rounded p-4">';
    html += '<table class="w-full text-sm">';
    html += '<thead class="bg-gray-50">';
    html += '<tr>';
    html += '<th class="p-2 text-left">Дата</th>';
    html += '<th class="p-2 text-right">Сомони</th>';
    html += '<th class="p-2 text-right">Курс</th>';
    html += '<th class="p-2 text-right">Доллар</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    let totalSomoni = 0;
    let totalDollar = 0;

    selectedPartners.forEach(partner => {
        const somoni = parseFloat(partner.somoni || 0);
        const dollar = parseFloat(partner.amount || 0);
        totalSomoni += somoni;
        totalDollar += dollar;
        
        html += '<tr class="border-t">';
        html += `<td class="p-2">${partner.date ? partner.date.split('T')[0] : ''}</td>`;
        html += `<td class="p-2 text-right">${somoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
        html += `<td class="p-2 text-right">${parseFloat(partner.rate || 0).toLocaleString('ru-RU', {minimumFractionDigits: 4})}</td>`;
        html += `<td class="p-2 text-right">${dollar.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
        html += '</tr>';
    });

    html += '</tbody>';
    html += '<tfoot class="bg-gray-100 font-semibold">';
    html += '<tr>';
    html += '<td class="p-2 text-right">ИТОГО:</td>';
    html += `<td class="p-2 text-right">${totalSomoni.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
    html += '<td class="p-2"></td>';
    html += `<td class="p-2 text-right">${totalDollar.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</td>`;
    html += '</tr>';
    html += '</tfoot>';
    html += '</table>';
    html += '</div>';

    selectedPaymentsContent.innerHTML = html;
};

// Генерация кассового ордера для партнеров
window.generatePartnerCashOrder = function() {
    console.log('💵 Генерация кассового ордера партнеров');

    const selectedClient = document.getElementById('cashOrderClient').value;
    console.log('Выбранный клиент:', selectedClient);

    if (!selectedClient) {
        alert('Выберите клиента из выпадающего списка');
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.partner-checkbox:checked');
    const yearData = window.getCurrentYearData();
    const selectedPartners = [];

    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.dataset.client === selectedClient) {
            const partnerId = parseInt(checkbox.dataset.id);
            const partner = yearData.partners.find(p => p.id === partnerId);
            if (partner && !partner.deleted) {
                selectedPartners.push(partner);
            }
        }
    });

    if (selectedPartners.length === 0) {
        alert('Нет выбранных записей для создания кассового ордера');
        return;
    }

    // Сохраняем данные кассового ордера для экспорта
    currentCashOrderData = {
        client: selectedClient,
        payments: selectedPartners
    };

    generateCashOrderContent(selectedClient, selectedPartners);
    document.getElementById('cashOrderModal').classList.add('hidden');
    document.getElementById('printCashOrderModal').classList.remove('hidden');
};
