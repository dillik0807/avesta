/**
 * 🤝 МОДУЛЬ ПАРТНЕРОВ
 * Работа с партнерами (аналогично погашениям)
 */

(function() {
    'use strict';
    
    console.log('🤝 Инициализация модуля партнеров...');
    
    let editingPartnerId = null;
    
    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        const form = document.getElementById('partnerForm');
        const clearBtn = document.getElementById('clearPartnerForm');
        const cancelBtn = document.getElementById('cancelPartnerEdit');
        const somoniInput = document.getElementById('partnerSomoni');
        const rateInput = document.getElementById('partnerRate');
        
        if (form) form.addEventListener('submit', handlePartnerSubmit);
        if (clearBtn) clearBtn.addEventListener('click', clearPartnerForm);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelPartnerEdit);
        if (somoniInput) somoniInput.addEventListener('input', calculatePartnerAmount);
        if (rateInput) rateInput.addEventListener('input', calculatePartnerAmount);
        
        // Устанавливаем сегодняшнюю дату
        const dateInput = document.getElementById('partnerDate');
        if (dateInput) {
            dateInput.value = localDateStr();
        }
        
        window.loadPartnerDictionaries();

        // Скрываем форму добавления для кассира
        if (window.currentUser?.role === 'cashier') {
            const addFormBlock = document.querySelector('#partners .bg-white.p-6.rounded-lg.shadow.mb-6');
            if (addFormBlock) addFormBlock.style.display = 'none';
        }
        
        console.log('✅ Модуль партнеров инициализирован');
    }
    
    // Загрузка справочников
    window.loadPartnerDictionaries = function() {
        console.log('📚 Загрузка справочников партнеров...');
        console.log('📊 Клиенты:', window.appData?.clients?.length || 0);
        
        const clientList = document.getElementById('partnerClientList');
        if (!clientList) return;
        
        clientList.innerHTML = '';
        
        if (window.appData?.clients) {
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
            console.log('✅ Загружаем клиентов:', window.appData.clients.length);
        }
    };
    
    // Расчет суммы в долларах
    function calculatePartnerAmount() {
        const somoni = parseFloat(document.getElementById('partnerSomoni').value) || 0;
        const rate = parseFloat(document.getElementById('partnerRate').value) || 0;
        const amount = rate > 0 ? somoni / rate : 0;
        document.getElementById('partnerAmount').value = amount.toFixed(2);
    }
    
    // Очистка формы
    function clearPartnerForm() {
        if (editingPartnerId && !confirm('Отменить редактирование?')) {
            return;
        }
        
        document.getElementById('partnerForm').reset();
        document.getElementById('partnerDate').value = localDateStr();
        document.getElementById('partnerAmount').value = '';
        editingPartnerId = null;
        document.getElementById('cancelPartnerEdit').classList.add('hidden');
    }
    
    // Отмена редактирования
    function cancelPartnerEdit() {
        clearPartnerForm();
    }
    
    // Отправка формы
    async function handlePartnerSubmit(e) {
        e.preventDefault();
        
        const client = document.getElementById('partnerClient').value.trim();
        
        // Валидация клиента
        if (client) {
            const clientExists = window.appData?.clients?.some(c => {
                const name = typeof c === 'string' ? c : c.name;
                return name === client;
            });
            if (!clientExists) {
                alert(`❌ Клиент "${client}" не найден в справочнике. Добавьте его в разделе "Управление".`);
                return;
            }
        }
        
        const formData = {
            date: document.getElementById('partnerDate').value,
            client: client,
            somoni: parseFloat(document.getElementById('partnerSomoni').value),
            rate: parseFloat(document.getElementById('partnerRate').value),
            amount: parseFloat(document.getElementById('partnerAmount').value),
            notes: document.getElementById('partnerNotes').value || null,
            year: window.currentYear || 2025
        };
        
        try {
            if (editingPartnerId) {
                await window.api.updatePartner(editingPartnerId, formData);
                alert('✅ Партнер обновлен!');
            } else {
                await window.api.addPartner(formData);
                alert('✅ Партнер добавлен!');
            }
            
            clearPartnerForm();
            await window.loadData();
            updatePartnersTable();
            window.updateDashboard();
            
        } catch (error) {
            console.error('❌ Ошибка при сохранении партнера:', error);
            alert('❌ Ошибка: ' + error.message);
        }
    }
    
    // Обновление таблицы партнеров
    window.updatePartnersTable = function() {
        console.log('📊 Обновление таблицы партнеров...');
        
        const tbody = document.getElementById('partnersTableBody');
        if (!tbody) return;
        
        const yearData = window.getCurrentYearData();
        if (!yearData || !yearData.partners || !Array.isArray(yearData.partners)) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
            return;
        }
        
        let filteredPartners = yearData.partners.filter(item => !item.deleted);
        filteredPartners.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let totalSomoni = 0;
        let totalAmount = 0;
        filteredPartners.forEach(item => {
            totalSomoni += parseFloat(item.somoni || 0);
            totalAmount += parseFloat(item.amount || 0);
        });
        
        document.getElementById('partnersTotalSomoni').textContent = totalSomoni.toLocaleString('ru-RU');
        document.getElementById('partnersTotalAmount').textContent = totalAmount.toLocaleString('ru-RU');
        
        if (filteredPartners.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        filteredPartners.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const date = item.date ? item.date.split('T')[0] : '';
            
            row.innerHTML = `
                <td class="p-3">
                    <input type="checkbox" class="partner-checkbox rounded" 
                        data-id="${item.id}" 
                        data-client="${item.client || ''}">
                </td>
                <td class="p-3">${date}</td>
                <td class="p-3">${item.client || ''}</td>
                <td class="p-3">${parseFloat(item.somoni || 0).toLocaleString('ru-RU')}</td>
                <td class="p-3">${parseFloat(item.rate || 0).toFixed(4)}</td>
                <td class="p-3">${parseFloat(item.amount || 0).toLocaleString('ru-RU')}</td>
                <td class="p-3">${item.notes || ''}</td>
                <td class="p-3 text-sm text-gray-600">${item.user || 'admin'}</td>
                <td class="p-3">
                    ${!['warehouse', 'cashier'].includes(window.currentUser?.role) ? `
                    <button onclick="editPartner(${item.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                    <button onclick="deletePartner(${item.id})" class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    };
    
    // Редактирование партнера
    window.editPartner = function(id) {
        const yearData = window.getCurrentYearData();
        if (!yearData || !yearData.partners) return;
        
        const item = yearData.partners.find(i => i.id === id);
        if (!item) {
            alert('Запись не найдена');
            return;
        }
        
        document.getElementById('partnerDate').value = toDateOnly(item.date);
        document.getElementById('partnerClient').value = item.client || '';
        document.getElementById('partnerSomoni').value = item.somoni || 0;
        document.getElementById('partnerRate').value = item.rate || 0;
        document.getElementById('partnerAmount').value = item.amount || 0;
        document.getElementById('partnerNotes').value = item.notes || '';
        
        editingPartnerId = id;
        document.getElementById('cancelPartnerEdit').classList.remove('hidden');
        document.getElementById('partnerClient').focus();
    };
    
    // Удаление партнера
    window.deletePartner = async function(id) {
        if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
        
        try {
            await window.api.deletePartner(id);
            alert('✅ Партнер удален!');
            await window.loadData();
            updatePartnersTable();
            window.updateDashboard();
        } catch (error) {
            console.error('❌ Ошибка:', error);
            alert('❌ Ошибка: ' + error.message);
        }
    };
    
    console.log('✅ partners.js загружен');
})();

// Печать таблицы партнёров
window.printPartnersTable = function() {
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.partners) return;

    const rows = yearData.partners.filter(i => !i.deleted);
    const year = window.currentYear || '';

    let totalSomoni = 0, totalAmount = 0;
    rows.forEach(i => { totalSomoni += parseFloat(i.somoni || 0); totalAmount += parseFloat(i.amount || 0); });

    const tableRows = rows.map((item, idx) => {
        const date = item.date ? item.date.split('T')[0] : '';
        return `<tr>
            <td>${idx + 1}</td>
            <td>${date}</td>
            <td>${item.client || ''}</td>
            <td>${parseFloat(item.somoni || 0).toLocaleString('ru-RU')}</td>
            <td>${parseFloat(item.rate || 0).toFixed(4)}</td>
            <td>${parseFloat(item.amount || 0).toLocaleString('ru-RU')}</td>
            <td>${item.notes || ''}</td>
            <td>${item.user || ''}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Партнеры ${year}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 4px 8px; }
            th { background: #f0f0f0; }
            tfoot td { font-weight: bold; background: #e8f4fd; }
        </style></head><body>
        <h2>🤝 Партнеры — ${year}</h2>
        <table>
            <thead><tr><th>№</th><th>Дата</th><th>Клиент</th><th>Сомони</th><th>Курс</th><th>Доллар</th><th>Примечания</th><th>Пользователь</th></tr></thead>
            <tbody>${tableRows}</tbody>
            <tfoot><tr><td colspan="3">ИТОГО:</td><td>${totalSomoni.toLocaleString('ru-RU')}</td><td></td><td>${totalAmount.toLocaleString('ru-RU')}</td><td colspan="2"></td></tr></tfoot>
        </table>
        <script>window.onload=()=>{window.print();}<\/script>
        </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
};

// Экспорт партнёров в Excel
window.exportPartnersExcel = function() {
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.partners) return;

    const rows = yearData.partners.filter(i => !i.deleted);
    const year = window.currentYear || '';

    const data = rows.map((item, idx) => ({
        '№': idx + 1,
        'Дата': item.date ? item.date.split('T')[0] : '',
        'Клиент': item.client || '',
        'Сомони': parseFloat(item.somoni || 0),
        'Курс': parseFloat(item.rate || 0),
        'Доллар': parseFloat(item.amount || 0),
        'Примечания': item.notes || '',
        'Пользователь': item.user || ''
    }));

    // Итоговая строка
    data.push({
        '№': '',
        'Дата': '',
        'Клиент': 'ИТОГО:',
        'Сомони': rows.reduce((s, i) => s + parseFloat(i.somoni || 0), 0),
        'Курс': '',
        'Доллар': rows.reduce((s, i) => s + parseFloat(i.amount || 0), 0),
        'Примечания': '',
        'Пользователь': ''
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Партнеры');
    XLSX.writeFile(wb, `partners_${year}_${new Date().toISOString().slice(0,10)}.xlsx`);
};
