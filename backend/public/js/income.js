/**
 * 📥 МОДУЛЬ УПРАВЛЕНИЯ ПРИХОДОМ ТОВАРОВ
 */

// Переменные для редактирования
let editingIncomeId = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📥 Инициализация модуля прихода...');
    
    // Устанавливаем сегодняшнюю дату по умолчанию
    const today = localDateStr();
    const dateInput = document.getElementById('incomeDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Обработчик формы - ВАЖНО: удаляем старый обработчик перед добавлением нового
    const incomeForm = document.getElementById('incomeForm');
    if (incomeForm) {
        // Клонируем форму чтобы удалить все старые обработчики
        const newForm = incomeForm.cloneNode(true);
        incomeForm.parentNode.replaceChild(newForm, incomeForm);
        // Добавляем обработчик к новой форме
        newForm.addEventListener('submit', handleIncomeSubmit);
    }
    
    // Автоматический расчет разницы и веса
    const qtyDoc = document.getElementById('incomeQtyDoc');
    const qtyFact = document.getElementById('incomeQtyFact');
    
    if (qtyDoc && qtyFact) {
        qtyDoc.addEventListener('input', calculateIncomeDifference);
        qtyFact.addEventListener('input', () => {
            calculateIncomeDifference();
            calculateIncomeWeight(); // Пересчитываем вес при изменении Коли-Факт
        });
    }
    
    // Фильтры
    const clearFilters = document.getElementById('clearIncomeFilters');
    if (clearFilters) clearFilters.addEventListener('click', clearIncomeFilters);

    const filterDateEl = document.getElementById('filterIncomeDate');
    if (filterDateEl) filterDateEl.addEventListener('change', updateIncomeTable);
    const filterWagonEl = document.getElementById('filterIncomeWagon');
    if (filterWagonEl) filterWagonEl.addEventListener('input', window.debounce(updateIncomeTable, 300));

    // Закрытие дропдаунов при клике вне
    document.addEventListener('click', (e) => {
        ['filterIncomeCompany','filterIncomeWarehouseGroup','filterIncomeWarehouse','filterIncomeProduct']
            .forEach(id => {
                const drop = document.getElementById('msDrop_' + id);
                const btn  = document.getElementById('msBtn_' + id);
                if (drop && btn && !drop.contains(e.target) && !btn.contains(e.target)) {
                    drop.classList.add('hidden');
                }
            });
    });
    
    // Кнопка отмены редактирования
    const cancelBtn = document.getElementById('cancelIncomeEdit');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelIncomeEdit);
    }
    
    // Кнопка очистки формы
    const clearFormBtn = document.getElementById('clearIncomeForm');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearIncomeForm);
    }
    
    // Скрываем форму добавления для завсклада и кассира
    const role = window.currentUser?.role;
    if (role === 'warehouse' || role === 'cashier') {
        const addFormBlock = document.querySelector('#income .bg-white.p-6.rounded-lg.shadow.mb-6');
        if (addFormBlock) addFormBlock.style.display = 'none';
    }

    // Загружаем справочники
    loadIncomeDictionaries();
    
    console.log('✅ Модуль прихода инициализирован');
});

// Загрузка справочников для автозаполнения
async function loadIncomeDictionaries() {
    console.log('📚 Загрузка справочников...');
    console.log('📊 Данные:', {
        companies: window.appData?.companies?.length || 0,
        warehouses: window.appData?.warehouses?.length || 0,
        products: window.appData?.products?.length || 0
    });
    
    // Заполняем datalist для компаний
    const companyList = document.getElementById('incomeCompanyList');
    if (companyList) {
        companyList.innerHTML = '';
        if (window.appData?.companies && Array.isArray(window.appData.companies)) {
            console.log('✅ Загружаем компании:', window.appData.companies.length);
            window.appData.companies.forEach(company => {
                const option = document.createElement('option');
                const name = typeof company === 'string' ? company : company.name;
                option.value = name;
                companyList.appendChild(option);
            });
        } else {
            console.warn('⚠️ Компании не загружены');
        }
    }
    
    // Заполняем datalist для складов
    const warehouseList = document.getElementById('incomeWarehouseList');
    if (warehouseList) {
        warehouseList.innerHTML = '';
        if (window.appData?.warehouses && Array.isArray(window.appData.warehouses)) {
            console.log('✅ Загружаем склады:', window.appData.warehouses.length);
            window.appData.warehouses.forEach(warehouse => {
                const option = document.createElement('option');
                const name = typeof warehouse === 'string' ? warehouse : warehouse.name;
                option.value = name;
                warehouseList.appendChild(option);
            });
        } else {
            console.warn('⚠️ Склады не загружены');
        }
    }
    
    // Заполняем datalist для товаров
    const productList = document.getElementById('incomeProductList');
    if (productList) {
        productList.innerHTML = '';
        if (window.appData?.products && Array.isArray(window.appData.products)) {
            console.log('✅ Загружаем товары:', window.appData.products.length);
            window.appData.products.forEach(product => {
                const option = document.createElement('option');
                const name = typeof product === 'string' ? product : product.name;
                option.value = name;
                productList.appendChild(option);
            });
        } else {
            console.warn('⚠️ Товары не загружены');
        }
    }
    
    // Обновляем фильтры
    updateIncomeFilters();
}

// Обновление фильтров
function updateIncomeFilters() {
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.income) return;

    const companies = [...new Set(yearData.income.map(i => i.company))].filter(Boolean).sort();
    const warehouses = [...new Set(yearData.income.map(i => i.warehouse))].filter(Boolean).sort();
    const products  = [...new Set(yearData.income.map(i => i.product))].filter(Boolean).sort();
    const groups = [...new Set((window.appData?.warehouses || [])
        .map(w => (typeof w === 'string' ? null : w.warehouse_group))
        .filter(Boolean))].sort();

    buildMultiselect('filterIncomeCompany',        companies, 'Все фирмы');
    buildMultiselect('filterIncomeWarehouseGroup', groups,    'Все группы');
    buildMultiselect('filterIncomeWarehouse',      warehouses,'Все склады');
    buildMultiselect('filterIncomeProduct',        products,  'Все товары');
}

// Строит мультиселект с чекбоксами
function buildMultiselect(id, items, allLabel) {
    const drop = document.getElementById('msDrop_' + id);
    const btn  = document.getElementById('msBtn_' + id);
    if (!drop || !btn) return;

    // Сохраняем текущий выбор
    const checked = getMultiselectValues(id);

    drop.innerHTML = '';
    items.forEach(val => {
        const lbl = document.createElement('label');
        const cb  = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        cb.checked = checked.has(val);
        cb.addEventListener('change', () => { updateMultiselectBtn(id, allLabel); updateIncomeTable(); });
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(val));
        drop.appendChild(lbl);
    });

    // Кнопка открытия/закрытия
    btn.onclick = (e) => { e.stopPropagation(); drop.classList.toggle('hidden'); };

    updateMultiselectBtn(id, allLabel);
}

// Возвращает Set выбранных значений мультиселекта
function getMultiselectValues(id) {
    const drop = document.getElementById('msDrop_' + id);
    if (!drop) return new Set();
    return new Set([...drop.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value));
}

// Обновляет текст кнопки мультиселекта
function updateMultiselectBtn(id, allLabel) {
    const btn = document.getElementById('msBtn_' + id);
    if (!btn) return;
    const vals = [...getMultiselectValues(id)];
    btn.textContent = vals.length === 0 ? allLabel + ' ▾' : vals.join(', ') + ' ▾';
}

// Расчет разницы
function calculateIncomeDifference() {
    const qtyDoc = parseFloat(document.getElementById('incomeQtyDoc').value) || 0;
    const qtyFact = parseFloat(document.getElementById('incomeQtyFact').value) || 0;
    const difference = qtyFact - qtyDoc;
    
    document.getElementById('incomeDifference').value = difference;
}

// Расчет веса в тоннах
function calculateIncomeWeight() {
    const qtyFact = parseFloat(document.getElementById('incomeQtyFact').value) || 0;
    
    // Формула: Коли-Факт / 20 = Вес Тонн Факт
    const totalWeight = qtyFact / 20;
    document.getElementById('incomeWeightTons').value = totalWeight.toFixed(3);
}

// Обработка отправки формы
let isSubmitting = false; // Флаг для предотвращения двойной отправки

async function handleIncomeSubmit(e) {
    e.preventDefault();
    
    // Защита от двойной отправки
    if (isSubmitting) {
        console.log('⚠️ Форма уже отправляется, ждите...');
        return;
    }
    
    isSubmitting = true;
    
    try {
        const company = document.getElementById('incomeCompany').value;
        const warehouse = document.getElementById('incomeWarehouse').value;
        const product = document.getElementById('incomeProduct').value;
        
        // Валидация: проверяем что выбранные значения есть в справочниках
        const errors = [];
        
        // Проверка компании
        if (company) {
            const companyExists = window.appData?.companies?.some(c => {
                const name = typeof c === 'string' ? c : c.name;
                return name === company;
            });
            if (!companyExists) {
                errors.push(`Фирма "${company}" не найдена в справочнике. Добавьте её в разделе "Управление".`);
            }
        }
        
        // Проверка склада
        if (warehouse) {
            const warehouseExists = window.appData?.warehouses?.some(w => {
                const name = typeof w === 'string' ? w : w.name;
                return name === warehouse;
            });
            if (!warehouseExists) {
                errors.push(`Склад "${warehouse}" не найден в справочнике. Добавьте его в разделе "Управление".`);
            }
        }
        
        // Проверка товара
        if (product) {
            const productExists = window.appData?.products?.some(p => {
                const name = typeof p === 'string' ? p : p.name;
                return name === product;
            });
            if (!productExists) {
                errors.push(`Товар "${product}" не найден в справочнике. Добавьте его в разделе "Управление".`);
            }
        }
        
        // Если есть ошибки валидации, показываем их и прерываем сохранение
        if (errors.length > 0) {
            window.showToast('Ошибка валидации:\n' + errors.join('\n'), 'error', 6000);
            return;
        }
        
        const formData = {
            date: document.getElementById('incomeDate').value,
            wagon_number: document.getElementById('incomeWagon').value,
            company: company,
            warehouse: warehouse,
            product: product,
            qty_doc: parseInt(document.getElementById('incomeQtyDoc').value),
            qty_fact: parseInt(document.getElementById('incomeQtyFact').value),
            difference: parseInt(document.getElementById('incomeDifference').value),
            total_weight: parseFloat(document.getElementById('incomeWeightTons').value),
            notes: document.getElementById('incomeNotes').value || null,
            year: window.currentYear || 2025,
            user_id: window.currentUser ? window.currentUser.id : 1
        };
        
        if (editingIncomeId) {
            console.log('📝 Обновление прихода:', editingIncomeId);
            await window.api.updateIncome(editingIncomeId, formData);
            window.showToast('Приход обновлен', 'success');
        } else {
            console.log('➕ Добавление прихода:', formData);
            await window.api.addIncome(formData);
            window.showToast('Приход добавлен', 'success');
        }
        
        // Очищаем форму
        document.getElementById('incomeForm').reset();
        const dateInput = document.getElementById('incomeDate');
        if (dateInput) {
            dateInput.value = localDateStr();
        }
        editingIncomeId = null;
        const cancelBtn = document.getElementById('cancelIncomeEdit');
        if (cancelBtn) {
            cancelBtn.classList.add('hidden');
        }
        
        // Перезагружаем данные
        await window.loadData();
        updateIncomeTable();
        if (typeof window.updateDashboard === 'function') {
            window.updateDashboard();
        }
        
    } catch (error) {
        console.error('❌ Ошибка при сохранении прихода:', error);
        window.showToast('Ошибка: ' + error.message, 'error');
    } finally {
        isSubmitting = false;
    }
}

// Обновление таблицы прихода
function updateIncomeTable() {
    console.log('📊 Обновление таблицы прихода...');
    
    const tbody = document.getElementById('incomeTableBody');
    if (!tbody) return;
    
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.income || !Array.isArray(yearData.income)) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    // Получаем фильтры
    const filterDate     = document.getElementById('filterIncomeDate')?.value || '';
    const filterWagon    = (document.getElementById('filterIncomeWagon')?.value || '').trim().toLowerCase();
    const selCompanies   = getMultiselectValues('filterIncomeCompany');
    const selGroups      = getMultiselectValues('filterIncomeWarehouseGroup');
    const selWarehouses  = getMultiselectValues('filterIncomeWarehouse');
    const selProducts    = getMultiselectValues('filterIncomeProduct');

    // Фильтруем данные
    let filteredIncome = yearData.income.filter(item => {
        if (item.deleted) return false;

        // Фильтр по дате
        if (filterDate) {
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
                    if (itemDateStr !== localDateStr(y)) return false;
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

        // Вагон
        if (filterWagon && !(item.wagon || '').toLowerCase().includes(filterWagon)) return false;

        // Фирма (мультиселект)
        if (selCompanies.size > 0 && !selCompanies.has(item.company)) return false;

        // Группа складов (мультиселект)
        if (selGroups.size > 0) {
            const wh = (window.appData?.warehouses || []).find(w => (typeof w !== 'string') && w.name === item.warehouse);
            if (!wh || !selGroups.has(wh.warehouse_group)) return false;
        }

        // Склад (мультиселект)
        if (selWarehouses.size > 0 && !selWarehouses.has(item.warehouse)) return false;

        // Товар (мультиселект)
        if (selProducts.size > 0 && !selProducts.has(item.product)) return false;

        return true;
    });
    
    // Сортируем по дате (новые сверху)
    filteredIncome.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Подсчитываем итоги
    let totalDoc = 0;
    let totalFact = 0;
    let totalDiff = 0;
    let totalTons = 0;
    
    filteredIncome.forEach(item => {
        totalDoc += parseInt(item.qty_doc || 0);
        totalFact += parseInt(item.qty_fact || 0);
        totalDiff += parseInt(item.difference || 0);
        totalTons += parseFloat(item.weight_tons || 0);
    });
    
    // Обновляем итоги
    document.getElementById('incomeTotalDoc').textContent = totalDoc;
    document.getElementById('incomeTotalFact').textContent = totalFact;
    document.getElementById('incomeTotalDiff').textContent = totalDiff;
    document.getElementById('incomeTotalTons').textContent = totalTons.toFixed(2);
    
    // Обновляем счётчик записей
    const totalIncome = yearData.income.filter(i => !i.deleted).length;
    window.updateRecordCount('incomeRecordCount', filteredIncome.length, totalIncome);

    // Заполняем таблицу
    if (filteredIncome.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    filteredIncome.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Форматируем дату
        const date = item.date ? item.date.split('T')[0] : '';
        
        const canEdit = !['warehouse', 'cashier'].includes(window.currentUser?.role);
        row.innerHTML = `
            <td class="p-3">${date}</td>
            <td class="p-3">${item.wagon || ''}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3">${item.qty_doc || 0}</td>
            <td class="p-3">${item.qty_fact || 0}</td>
            <td class="p-3">${item.difference || 0}</td>
            <td class="p-3">${parseFloat(item.weight_tons || 0).toFixed(2)}</td>
            <td class="p-3 text-sm text-gray-600">${item.user || 'admin'}</td>
            <td class="p-3">
                ${canEdit ? `
                <button onclick="editIncome(${item.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                <button onclick="deleteIncome(${item.id})" class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Таблица обновлена: ${filteredIncome.length} записей`);
}

// Редактирование прихода
window.editIncome = function(id) {
    console.log('✏️ Редактирование прихода:', id);
    
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.income) return;
    
    const item = yearData.income.find(i => i.id === id);
    if (!item) {
        window.showToast('Запись не найдена', 'error');
        return;
    }
    
    // Заполняем форму
    document.getElementById('incomeDate').value = toDateOnly(item.date);
    document.getElementById('incomeWagon').value = item.wagon_number || '';
    document.getElementById('incomeCompany').value = item.company || '';
    document.getElementById('incomeWarehouse').value = item.warehouse || '';
    document.getElementById('incomeProduct').value = item.product || '';
    document.getElementById('incomeQtyDoc').value = item.qty_doc || 0;
    document.getElementById('incomeQtyFact').value = item.qty_fact || 0;
    document.getElementById('incomeDifference').value = item.difference || 0;
    document.getElementById('incomeWeightTons').value = item.total_weight || 0;
    document.getElementById('incomeNotes').value = item.notes || '';
    
    // Устанавливаем режим редактирования
    editingIncomeId = id;
    document.getElementById('cancelIncomeEdit').classList.remove('hidden');
    
    // Прокручиваем к форме
    document.getElementById('incomeForm').scrollIntoView({ behavior: 'smooth' });
};

// Удаление прихода
window.deleteIncome = async function(id) {
    const ok = await window.showConfirm('Вы уверены, что хотите удалить эту запись?');
    if (!ok) return;
    
    try {
        console.log('🗑️ Удаление прихода:', id);
        await window.api.deleteIncome(id);
        window.showToast('Запись удалена', 'success');
        
        await window.loadData();
        updateIncomeTable();
        window.updateDashboard();
        
    } catch (error) {
        console.error('❌ Ошибка при удалении:', error);
        window.showToast('Ошибка: ' + error.message, 'error');
    }
};

// Отмена редактирования
function cancelIncomeEdit() {
    editingIncomeId = null;
    document.getElementById('incomeForm').reset();
    document.getElementById('incomeDate').value = localDateStr();
    document.getElementById('cancelIncomeEdit').classList.add('hidden');
}

// Очистка формы
async function clearIncomeForm() {
    if (editingIncomeId) {
        if (!await window.showConfirm('Вы редактируете запись. Отменить редактирование и очистить форму?')) {
            return;
        }
        editingIncomeId = null;
        document.getElementById('cancelIncomeEdit').classList.add('hidden');
    }
    
    document.getElementById('incomeForm').reset();
    document.getElementById('incomeDate').value = localDateStr();
    document.getElementById('incomeDifference').value = '';
    document.getElementById('incomeWeightTons').value = '';
}

// Очистка фильтров
function clearIncomeFilters() {
    const dateEl = document.getElementById('filterIncomeDate');
    if (dateEl) dateEl.value = '';
    const wagonEl = document.getElementById('filterIncomeWagon');
    if (wagonEl) wagonEl.value = '';

    ['filterIncomeCompany','filterIncomeWarehouseGroup','filterIncomeWarehouse','filterIncomeProduct']
        .forEach(id => {
            const drop = document.getElementById('msDrop_' + id);
            if (drop) drop.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
            const btn = document.getElementById('msBtn_' + id);
            const labels = { filterIncomeCompany:'Все фирмы', filterIncomeWarehouseGroup:'Все группы',
                             filterIncomeWarehouse:'Все склады', filterIncomeProduct:'Все товары' };
            if (btn) btn.textContent = (labels[id] || 'Все') + ' ▾';
        });
    updateIncomeTable();
}

// Экспортируем функции
window.updateIncomeTable = updateIncomeTable;
window.loadIncomeDictionaries = loadIncomeDictionaries;

console.log('✅ income.js загружен');
