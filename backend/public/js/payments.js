/**
 * 💰 МОДУЛЬ УПРАВЛЕНИЯ ПОГАШЕНИЯМИ
 */

let editingPaymentId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('💰 Инициализация модуля погашений...');
    
    const today = localDateStr();
    const paymentDate = document.getElementById('paymentDate');
    if (paymentDate) paymentDate.value = today;
    
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }
    
    // Автоматический расчет доллара
    const somoni = document.getElementById('paymentSomoni');
    const rate = document.getElementById('paymentRate');
    
    if (somoni) somoni.addEventListener('input', calculatePaymentAmount);
    if (rate) rate.addEventListener('input', calculatePaymentAmount);
    
    const filterDate = document.getElementById('filterPaymentDate');
    const filterClient = document.getElementById('filterPaymentClient');
    const clearFilters = document.getElementById('clearPaymentFilters');
    
    if (filterDate) filterDate.addEventListener('change', updatePaymentsTable);
    if (filterClient) filterClient.addEventListener('change', updatePaymentsTable);
    if (clearFilters) clearFilters.addEventListener('click', clearPaymentFilters);
    
    const cancelBtn = document.getElementById('cancelPaymentEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelPaymentEdit);
    
    const clearFormBtn = document.getElementById('clearPaymentForm');
    if (clearFormBtn) clearFormBtn.addEventListener('click', clearPaymentForm);
    
    loadPaymentDictionaries();

    // Скрываем форму добавления для кассира
    if (window.currentUser?.role === 'cashier') {
        const addFormBlock = document.querySelector('#payments .bg-white.p-6.rounded-lg.shadow.mb-6');
        if (addFormBlock) addFormBlock.style.display = 'none';
    }
    
    console.log('✅ Модуль погашений инициализирован');
});

// Расчет доллара: Сомони / Курс = Доллар
function calculatePaymentAmount() {
    const somoni = parseFloat(document.getElementById('paymentSomoni').value) || 0;
    const rate = parseFloat(document.getElementById('paymentRate').value) || 0;
    
    const amount = rate > 0 ? somoni / rate : 0;
    document.getElementById('paymentAmount').value = amount.toFixed(2);
}

function loadPaymentDictionaries() {
    console.log('📚 Загрузка справочников погашений...');
    console.log('📊 Клиенты:', window.appData?.clients?.length || 0);
    
    const clientList = document.getElementById('paymentClientList');
    if (clientList) {
        clientList.innerHTML = '';
        if (window.appData?.clients && Array.isArray(window.appData.clients)) {
            console.log('✅ Загружаем клиентов:', window.appData.clients.length);
            window.appData.clients.forEach(client => {
                const name = typeof client === 'string' ? client : client.name;
                const phone = typeof client === 'string' ? '' : (client.phone || '');
                
                const option = document.createElement('option');
                option.value = name;
                if (phone) {
                    option.textContent = `${name} (${phone})`;
                }
                clientList.appendChild(option);
            });
        } else {
            console.warn('⚠️ Клиенты не загружены');
        }
    }
    
    updatePaymentFilters();
}

function updatePaymentFilters() {
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.payments) return;
    
    const clients = [...new Set(yearData.payments.map(item => item.client))].filter(Boolean).sort();
    
    const clientFilter = document.getElementById('filterPaymentClient');
    if (clientFilter) {
        const currentValue = clientFilter.value;
        clientFilter.innerHTML = '<option value="">Все клиенты</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client;
            option.textContent = client;
            clientFilter.appendChild(option);
        });
        if (currentValue) clientFilter.value = currentValue;
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    
    const client = document.getElementById('paymentClient').value.trim();
    
    // Валидация: проверяем что клиент есть в справочнике
    if (client) {
        const clientExists = window.appData?.clients?.some(c => {
            const name = typeof c === 'string' ? c : c.name;
            return name === client;
        });
        if (!clientExists) {
            window.showToast(`Клиент "${client}" не найден в справочнике`, 'error');
            return;
        }
    }
    
    const formData = {
        date: document.getElementById('paymentDate').value,
        client: client,
        somoni: parseFloat(document.getElementById('paymentSomoni').value),
        rate: parseFloat(document.getElementById('paymentRate').value),
        amount: parseFloat(document.getElementById('paymentAmount').value),
        notes: document.getElementById('paymentNotes').value || null,
        year: window.currentYear || 2025,
        user_id: window.currentUser ? window.currentUser.id : 1
    };
    
    try {
        if (editingPaymentId) {
            await window.api.updatePayment(editingPaymentId, formData);
            window.showToast('Погашение обновлено', 'success');
        } else {
            await window.api.addPayment(formData);
            window.showToast('Погашение добавлено', 'success');
        }
        
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentDate').value = localDateStr();
        editingPaymentId = null;
        document.getElementById('cancelPaymentEdit').classList.add('hidden');
        
        await window.loadData();
        updatePaymentsTable();
        window.updateDashboard();
        
    } catch (error) {
        console.error('❌ Ошибка при сохранении погашения:', error);
        window.showToast('Ошибка: ' + error.message, 'error');
    }
}

function updatePaymentsTable() {
    console.log('📊 Обновление таблицы погашений...');
    
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.payments || !Array.isArray(yearData.payments)) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    const filterDate = document.getElementById('filterPaymentDate').value;
    const filterClient = document.getElementById('filterPaymentClient').value;
    
    let filteredPayments = yearData.payments.filter(item => {
        if (item.deleted) return false;
        
        if (filterDate) {
            // Берём только дату YYYY-MM-DD из записи
            const itemDateStr = (item.date || '').split('T')[0];
            const today = new Date();
            const todayStr = localDateStr();
            const yr = today.getFullYear();

            const dateInRange = (from, to) => itemDateStr >= from && itemDateStr <= to;
            const pad = (n) => String(n).padStart(2,'0');
            const ymd = (y,m,d) => `${y}-${pad(m)}-${pad(d)}`;

            switch (filterDate) {
                case 'today':
                    if (itemDateStr !== todayStr) return false;
                    break;
                case 'yesterday': {
                    const y = new Date(today); y.setDate(y.getDate()-1);
                    const yStr = localDateStr(y);
                    if (itemDateStr !== yStr) return false;
                    break;
                }
                case 'week': {
                    const w = new Date(today); w.setDate(w.getDate()-7);
                    if (itemDateStr < localDateStr(w)) return false;
                    break;
                }
                case 'month': {
                    const m = new Date(today); m.setDate(m.getDate()-30);
                    if (itemDateStr < localDateStr(m)) return false;
                    break;
                }
                case 'q1': if (!dateInRange(ymd(yr,1,1), ymd(yr,3,31))) return false; break;
                case 'q2': if (!dateInRange(ymd(yr,4,1), ymd(yr,6,30))) return false; break;
                case 'q3': if (!dateInRange(ymd(yr,7,1), ymd(yr,9,30))) return false; break;
                case 'q4': if (!dateInRange(ymd(yr,10,1), ymd(yr,12,31))) return false; break;
            }
        }
        
        if (filterClient && item.client !== filterClient) return false;
        
        return true;
    });
    
    filteredPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let totalSomoni = 0;
    let totalAmount = 0;
    filteredPayments.forEach(item => {
        totalSomoni += parseFloat(item.somoni || 0);
        totalAmount += parseFloat(item.amount || 0);
    });
    
    document.getElementById('paymentsTotalSomoni').textContent = totalSomoni.toLocaleString('ru-RU');
    document.getElementById('paymentsTotalAmount').textContent = totalAmount.toLocaleString('ru-RU');
    
    if (filteredPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        window.updateRecordCount('paymentsRecordCount', 0, yearData.payments.filter(i => !i.deleted).length);
        return;
    }
    
    tbody.innerHTML = '';
    filteredPayments.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Форматируем дату
        const date = item.date ? item.date.split('T')[0] : '';
        
        row.innerHTML = `
            <td class="p-3">
                <input type="checkbox" class="payment-checkbox rounded" 
                    data-id="${item.id}" 
                    data-client="${item.client || ''}">
            </td>
            <td class="p-3">${date}</td>
            <td class="p-3">${item.client || ''}</td>
            <td class="p-3">${parseFloat(item.somoni || 0).toLocaleString('ru-RU')}</td>
            <td class="p-3">${parseFloat(item.rate || 0).toFixed(4)}</td>
            <td class="p-3">${parseFloat(item.amount || 0).toLocaleString('ru-RU')}</td>
            <td class="p-3">${item.notes || ''}</td>
            <td class="p-3 text-sm text-gray-600">${item.username || 'admin'}</td>
            <td class="p-3">
                ${!['warehouse', 'cashier'].includes(window.currentUser?.role) ? `
                <button onclick="editPayment(${item.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                <button onclick="deletePayment(${item.id})" class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });

    window.updateRecordCount('paymentsRecordCount', filteredPayments.length, yearData.payments.filter(i => !i.deleted).length);
}

window.editPayment = function(id) {
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.payments) return;
    
    const item = yearData.payments.find(i => i.id === id);
    if (!item) {
        window.showToast('Запись не найдена', 'error');
        return;
    }
    
    document.getElementById('paymentDate').value = toDateOnly(item.date);
    document.getElementById('paymentClient').value = item.client || '';
    document.getElementById('paymentSomoni').value = item.somoni || 0;
    document.getElementById('paymentRate').value = item.rate || 0;
    document.getElementById('paymentAmount').value = item.amount || 0;
    document.getElementById('paymentNotes').value = item.notes || '';
    
    editingPaymentId = id;
    document.getElementById('cancelPaymentEdit').classList.remove('hidden');
    document.getElementById('paymentForm').scrollIntoView({ behavior: 'smooth' });
};

window.deletePayment = async function(id) {
    const ok = await window.showConfirm('Вы уверены, что хотите удалить эту запись?');
    if (!ok) return;
    
    try {
        await window.api.deletePayment(id);
        window.showToast('Запись удалена', 'success');
        
        await window.loadData();
        updatePaymentsTable();
        window.updateDashboard();
    } catch (error) {
        console.error('❌ Ошибка при удалении:', error);
        window.showToast('Ошибка: ' + error.message, 'error');
    }
};

function cancelPaymentEdit() {
    editingPaymentId = null;
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentDate').value = localDateStr();
    document.getElementById('cancelPaymentEdit').classList.add('hidden');
}

async function clearPaymentForm() {
    if (editingPaymentId) {
        if (!await window.showConfirm('Вы редактируете запись. Отменить редактирование и очистить форму?')) {
            return;
        }
        editingPaymentId = null;
        document.getElementById('cancelPaymentEdit').classList.add('hidden');
    }
    
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentDate').value = localDateStr();
    document.getElementById('paymentAmount').value = '';
}

function clearPaymentFilters() {
    document.getElementById('filterPaymentDate').value = 'today';
    document.getElementById('filterPaymentClient').value = '';
    updatePaymentsTable();
}

window.updatePaymentsTable = updatePaymentsTable;
window.loadPaymentDictionaries = loadPaymentDictionaries;

console.log('✅ payments.js загружен');
