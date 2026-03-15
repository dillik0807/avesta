/**
 * 📤 МОДУЛЬ УПРАВЛЕНИЯ РАСХОДОМ ТОВАРОВ
 */

let editingExpenseId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📤 Инициализация модуля расхода...');
    
    const today = localDateStr();
    const expenseDate = document.getElementById('expenseDate');
    if (expenseDate) {
        expenseDate.value = today;
        updateExpenseMonth(); // Устанавливаем месяц при загрузке
    }
    
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }
    
    // Обновление месяца при изменении даты
    if (expenseDate) {
        expenseDate.addEventListener('change', updateExpenseMonth);
    }
    
    // Обновление полного номера при вводе номера накладной
    const expenseNumberInput = document.getElementById('expenseNumberInput');
    if (expenseNumberInput) {
        expenseNumberInput.addEventListener('input', updateExpenseFullNumber);
    }
    
    // Автоматический расчет
    const quantity = document.getElementById('expenseQuantity');
    const price = document.getElementById('expensePrice');
    
    if (quantity) quantity.addEventListener('input', () => {
        calculateExpenseTons();
        calculateExpenseTotal(); // Пересчитываем сумму после изменения тонн
    });
    if (price) price.addEventListener('input', calculateExpenseTotal);
    
    // Фильтры
    const filterDate = document.getElementById('filterExpenseDate');
    const clearFilters = document.getElementById('clearExpenseFilters');
    if (filterDate) filterDate.addEventListener('change', updateExpenseTable);
    if (clearFilters) clearFilters.addEventListener('click', clearExpenseFilters);

    // Закрытие мультиселект дропдаунов при клике вне
    document.addEventListener('click', (e) => {
        ['filterExpenseCompany','filterExpenseWarehouseGroup','filterExpenseWarehouse',
         'filterExpenseClient','filterExpenseProduct','filterExpenseCoalition','filterExpensePrice']
            .forEach(id => {
                const drop = document.getElementById('msDrop_' + id);
                const btn  = document.getElementById('msBtn_' + id);
                if (drop && btn && !drop.contains(e.target) && !btn.contains(e.target)) {
                    drop.classList.add('hidden');
                }
            });
    });
    
    const cancelBtn = document.getElementById('cancelExpenseEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelExpenseEdit);
    
    const clearFormBtn = document.getElementById('clearExpenseForm');
    if (clearFormBtn) clearFormBtn.addEventListener('click', clearExpenseForm);
    
    // Фильтрация товаров при выборе фирмы и склада
    const expenseCompany = document.getElementById('expenseCompany');
    const expenseWarehouse = document.getElementById('expenseWarehouse');
    const expenseProduct = document.getElementById('expenseProduct');
    
    if (expenseCompany) {
        expenseCompany.addEventListener('change', filterExpenseProducts);
        expenseCompany.addEventListener('input', filterExpenseProducts);
    }
    if (expenseWarehouse) {
        expenseWarehouse.addEventListener('change', filterExpenseProducts);
        expenseWarehouse.addEventListener('input', filterExpenseProducts);
    }
    if (expenseProduct) {
        // Используем blur для срабатывания после выбора из datalist
        expenseProduct.addEventListener('blur', autofillProductPrice);
        expenseProduct.addEventListener('change', autofillProductPrice);
    }
    
    loadExpenseDictionaries();

    // Скрываем форму добавления для завсклада и кассира
    const roleExp = window.currentUser?.role;
    if (roleExp === 'warehouse' || roleExp === 'cashier') {
        const addFormBlock = document.querySelector('#expense .bg-white.p-6.rounded-lg.shadow.mb-6');
        if (addFormBlock) addFormBlock.style.display = 'none';
    }
    
    console.log('✅ Модуль расхода инициализирован');
});

// Обновление месяца на основе выбранной даты
function updateExpenseMonth() {
    const dateInput = document.getElementById('expenseDate');
    const monthInput = document.getElementById('expenseMonth');
    
    if (dateInput && monthInput && dateInput.value) {
        const date = new Date(dateInput.value);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        monthInput.value = month;
        updateExpenseFullNumber();
    }
}

// Обновление полного номера (месяц\номер)
function updateExpenseFullNumber() {
    const monthInput = document.getElementById('expenseMonth');
    const numberInput = document.getElementById('expenseNumberInput');
    const hiddenInput = document.getElementById('expenseNumber');
    
    if (monthInput && numberInput && hiddenInput) {
        const month = monthInput.value;
        const number = numberInput.value.trim();
        
        if (number) {
            hiddenInput.value = `${month}\\${number}`;
        } else {
            hiddenInput.value = '';
        }
    }
}

function loadExpenseDictionaries() {
    const companyList = document.getElementById('expenseCompanyList');
    if (companyList && window.appData.companies) {
        companyList.innerHTML = '';
        window.appData.companies.forEach(company => {
            const option = document.createElement('option');
            option.value = typeof company === 'string' ? company : company.name;
            companyList.appendChild(option);
        });
    }
    
    const warehouseList = document.getElementById('expenseWarehouseList');
    if (warehouseList && window.appData.warehouses) {
        warehouseList.innerHTML = '';
        window.appData.warehouses.forEach(warehouse => {
            const option = document.createElement('option');
            option.value = typeof warehouse === 'string' ? warehouse : warehouse.name;
            warehouseList.appendChild(option);
        });
    }
    
    const productList = document.getElementById('expenseProductList');
    if (productList && window.appData.products) {
        productList.innerHTML = '';
        window.appData.products.forEach(product => {
            const option = document.createElement('option');
            option.value = typeof product === 'string' ? product : product.name;
            productList.appendChild(option);
        });
    }
    
    const clientList = document.getElementById('expenseClientList');
    if (clientList && window.appData.clients) {
        clientList.innerHTML = '';
        window.appData.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = typeof client === 'string' ? client : client.name;
            clientList.appendChild(option);
        });
    }
    
    const coalitionList = document.getElementById('expenseCoalitionList');
    if (coalitionList && window.appData.coalitions) {
        coalitionList.innerHTML = '';
        window.appData.coalitions.forEach(coalition => {
            const option = document.createElement('option');
            option.value = typeof coalition === 'string' ? coalition : coalition.name;
            coalitionList.appendChild(option);
        });
    }
    
    updateExpenseFilters();
}

// Фильтрация товаров на основе выбранной фирмы и склада
function filterExpenseProducts() {
    const selectedCompany = document.getElementById('expenseCompany').value;
    const selectedWarehouse = document.getElementById('expenseWarehouse').value;
    const productList = document.getElementById('expenseProductList');
    
    if (!productList) return;
    
    console.log('🔍 Фильтрация товаров:', { company: selectedCompany, warehouse: selectedWarehouse });
    
    // Если не выбраны фирма и склад, показываем все товары
    if (!selectedCompany && !selectedWarehouse) {
        productList.innerHTML = '';
        if (window.appData?.products) {
            window.appData.products.forEach(product => {
                const option = document.createElement('option');
                option.value = typeof product === 'string' ? product : product.name;
                productList.appendChild(option);
            });
        }
        console.log('✅ Показаны все товары');
        return;
    }
    
    // Получаем данные прихода для фильтрации
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.income) {
        console.warn('⚠️ Нет данных прихода для фильтрации');
        return;
    }
    
    // Фильтруем товары из прихода по выбранной фирме и складу
    const availableProducts = new Set();
    
    yearData.income.forEach(item => {
        if (item.deleted) return;
        
        const matchCompany = !selectedCompany || item.company === selectedCompany;
        const matchWarehouse = !selectedWarehouse || item.warehouse === selectedWarehouse;
        
        if (matchCompany && matchWarehouse && item.product) {
            availableProducts.add(item.product);
        }
    });
    
    // Обновляем список товаров
    productList.innerHTML = '';
    
    if (availableProducts.size === 0) {
        console.warn('⚠️ Нет товаров для выбранной фирмы и склада');
        // Показываем сообщение в консоли, но оставляем список пустым
    } else {
        const sortedProducts = Array.from(availableProducts).sort();
        sortedProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            productList.appendChild(option);
        });
        console.log(`✅ Найдено товаров: ${availableProducts.size}`);
    }
}

// Автозаполнение цены при выборе товара
function autofillProductPrice() {
    const selectedProduct = document.getElementById('expenseProduct').value.trim();
    const selectedWarehouse = document.getElementById('expenseWarehouse').value.trim();
    const priceInput = document.getElementById('expensePrice');
    
    console.log('🔍 Автозаполнение цены для товара:', selectedProduct, 'склад:', selectedWarehouse);
    
    if (!selectedProduct || !priceInput) {
        console.log('⚠️ Товар не выбран или поле цены не найдено');
        return;
    }
    
    // Проверяем что данные загружены
    if (!window.appData?.products) {
        console.warn('⚠️ Справочник товаров не загружен');
        return;
    }
    
    // Находим товар
    const product = window.appData.products.find(p => {
        const name = typeof p === 'string' ? p : p.name;
        return name === selectedProduct;
    });
    
    if (!product || typeof product === 'string') {
        console.warn(`⚠️ Товар "${selectedProduct}" не найден`);
        return;
    }
    
    console.log('✅ Товар найден:', product);
    
    // Находим склад для определения группы
    let warehouseGroup = 'ALL';
    if (selectedWarehouse && window.appData?.warehouses) {
        const warehouse = window.appData.warehouses.find(w => {
            const name = typeof w === 'string' ? w : w.name;
            return name === selectedWarehouse;
        });
        
        if (warehouse && typeof warehouse === 'object' && warehouse.warehouse_group) {
            warehouseGroup = warehouse.warehouse_group;
            console.log('📦 Группа склада:', warehouseGroup);
        }
    }
    
    // Ищем цену для товара и группы склада
    let price = null;
    
    if (window.appData?.prices && window.appData.prices.length > 0) {
        // Сначала ищем цену для конкретной группы склада
        const specificPrice = window.appData.prices.find(p => 
            p.product_id === product.id && 
            p.warehouse_group === warehouseGroup
        );
        
        if (specificPrice) {
            price = specificPrice.price;
            console.log(`💰 Найдена цена для группы ${warehouseGroup}: ${price}`);
        } else {
            // Если не найдена, ищем цену для всех складов
            const generalPrice = window.appData.prices.find(p => 
                p.product_id === product.id && 
                p.warehouse_group === 'ALL'
            );
            
            if (generalPrice) {
                price = generalPrice.price;
                console.log(`💰 Найдена общая цена: ${price}`);
            }
        }
    }
    
    // Если цена не найдена в истории, используем цену из товара
    if (!price && product.price && product.price > 0) {
        price = product.price;
        console.log(`💰 Используем цену из товара: ${price}`);
    }
    
    if (price && price > 0) {
        priceInput.value = price;
        calculateExpenseTotal();
        console.log(`✅ Цена установлена: ${price}`);
    } else {
        console.log(`ℹ️ Цена для "${selectedProduct}" не установлена`);
    }
}

function updateExpenseFilters() {
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.expense) return;

    const companies  = [...new Set(yearData.expense.map(i => i.company))].filter(Boolean).sort();
    const warehouses = [...new Set(yearData.expense.map(i => i.warehouse))].filter(Boolean).sort();
    const clients    = [...new Set(yearData.expense.map(i => i.client))].filter(Boolean).sort();
    const products   = [...new Set(yearData.expense.map(i => i.product))].filter(Boolean).sort();
    const coalitions = [...new Set(yearData.expense.map(i => i.coalition))].filter(Boolean).sort();
    const groups     = [...new Set((window.appData?.warehouses || [])
        .map(w => (typeof w === 'string' ? null : w.warehouse_group)).filter(Boolean))].sort();

    const prices = [...new Set(yearData.expense.map(i => String(parseFloat(i.price || 0))))].filter(v => v !== '0').sort((a,b) => parseFloat(a)-parseFloat(b));

    buildExpenseMultiselect('filterExpenseCompany',        companies,  'Все фирмы');
    buildExpenseMultiselect('filterExpenseWarehouseGroup', groups,     'Все группы');
    buildExpenseMultiselect('filterExpenseWarehouse',      warehouses, 'Все склады');
    buildExpenseMultiselect('filterExpenseClient',         clients,    'Все клиенты');
    buildExpenseMultiselect('filterExpenseProduct',        products,   'Все товары');
    buildExpenseMultiselect('filterExpenseCoalition',      coalitions, 'Все коалиции');
    buildExpenseMultiselect('filterExpensePrice',          prices,     'Все цены');
}

function buildExpenseMultiselect(id, items, allLabel) {
    const drop = document.getElementById('msDrop_' + id);
    const btn  = document.getElementById('msBtn_' + id);
    if (!drop || !btn) return;
    const checked = getExpenseMultiselectValues(id);
    drop.innerHTML = '';
    items.forEach(val => {
        const lbl = document.createElement('label');
        const cb  = document.createElement('input');
        cb.type = 'checkbox'; cb.value = val; cb.checked = checked.has(val);
        cb.addEventListener('change', () => { updateExpenseMultiselectBtn(id, allLabel); updateExpenseTable(); });
        lbl.appendChild(cb); lbl.appendChild(document.createTextNode(val));
        drop.appendChild(lbl);
    });
    btn.onclick = (e) => { e.stopPropagation(); drop.classList.toggle('hidden'); };
    updateExpenseMultiselectBtn(id, allLabel);
}

function getExpenseMultiselectValues(id) {
    const drop = document.getElementById('msDrop_' + id);
    if (!drop) return new Set();
    return new Set([...drop.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value));
}

function updateExpenseMultiselectBtn(id, allLabel) {
    const btn = document.getElementById('msBtn_' + id);
    if (!btn) return;
    const vals = [...getExpenseMultiselectValues(id)];
    btn.textContent = vals.length === 0 ? allLabel + ' ▾' : vals.join(', ') + ' ▾';
}

function calculateExpenseTons() {
    const quantity = parseFloat(document.getElementById('expenseQuantity').value) || 0;
    
    // Простая формула: количество / 20 = тонны
    const totalWeight = quantity / 20;
    document.getElementById('expenseTons').value = totalWeight.toFixed(3);
}

function calculateExpenseTotal() {
    const tons = parseFloat(document.getElementById('expenseTons').value) || 0;
    const price = parseFloat(document.getElementById('expensePrice').value) || 0;
    
    // Формула: цена за тонну × тонны = общая сумма
    const total = price * tons;
    
    document.getElementById('expenseTotal').value = total.toFixed(2);
}

async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const company = document.getElementById('expenseCompany').value;
    const warehouse = document.getElementById('expenseWarehouse').value;
    const product = document.getElementById('expenseProduct').value;
    const client = document.getElementById('expenseClient').value;
    const coalition = document.getElementById('expenseCoalition').value;
    
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
    
    // Проверка клиента
    if (client) {
        const clientExists = window.appData?.clients?.some(c => {
            const name = typeof c === 'string' ? c : c.name;
            return name === client;
        });
        if (!clientExists) {
            errors.push(`Клиент "${client}" не найден в справочнике. Добавьте его в разделе "Управление".`);
        }
    }
    
    // Проверка коалиции
    if (coalition) {
        const coalitionExists = window.appData?.coalitions?.some(c => {
            const name = typeof c === 'string' ? c : c.name;
            return name === coalition;
        });
        if (!coalitionExists) {
            errors.push(`Коалиция "${coalition}" не найдена в справочнике. Добавьте её в разделе "Управление".`);
        }
    }
    
    // Если есть ошибки валидации, показываем их и прерываем сохранение
    if (errors.length > 0) {
        window.showToast('Ошибка валидации:\n' + errors.join('\n'), 'error', 6000);
        return;
    }
    
    const formData = {
        date: document.getElementById('expenseDate').value,
        coalition: coalition || null,
        number: document.getElementById('expenseNumber').value || null,
        company: company,
        warehouse: warehouse,
        product: product,
        client: client,
        quantity: parseInt(document.getElementById('expenseQuantity').value),
        tons: parseFloat(document.getElementById('expenseTons').value),
        price: parseFloat(document.getElementById('expensePrice').value),
        total: parseFloat(document.getElementById('expenseTotal').value),
        notes: document.getElementById('expenseNotes').value || null,
        year: window.currentYear || 2025
    };
    
    try {
        if (editingExpenseId) {
            await window.api.updateExpense(editingExpenseId, formData);
            window.showToast('Расход обновлен', 'success');
        } else {
            await window.api.addExpense(formData);
            window.showToast('Расход добавлен', 'success');
        }
        
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseDate').value = localDateStr();
        updateExpenseMonth(); // Обновляем месяц после сброса
        editingExpenseId = null;
        document.getElementById('cancelExpenseEdit').classList.add('hidden');
        
        await window.loadData();
        updateExpenseTable();
        window.updateDashboard();
        
    } catch (error) {
        console.error('❌ Ошибка при сохранении расхода:', error);
        window.showToast('Ошибка: ' + error.message, 'error');
    }
}

function updateExpenseTable() {
    console.log('📊 Обновление таблицы расхода...');
    
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;
    
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.expense || !Array.isArray(yearData.expense)) {
        tbody.innerHTML = '<tr><td colspan="15" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    const filterDate      = document.getElementById('filterExpenseDate').value;
    const selCompanies    = getExpenseMultiselectValues('filterExpenseCompany');
    const selGroups       = getExpenseMultiselectValues('filterExpenseWarehouseGroup');
    const selWarehouses   = getExpenseMultiselectValues('filterExpenseWarehouse');
    const selClients      = getExpenseMultiselectValues('filterExpenseClient');
    const selProducts     = getExpenseMultiselectValues('filterExpenseProduct');
    const selCoalitions   = getExpenseMultiselectValues('filterExpenseCoalition');
    const selPrices       = getExpenseMultiselectValues('filterExpensePrice');

    let filteredExpense = yearData.expense.filter(item => {
        if (item.deleted) return false;

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
                    if (itemDateStr !== todayStr) return false; break;
                case 'yesterday': {
                    const y = new Date(today); y.setDate(y.getDate()-1);
                    if (itemDateStr !== localDateStr(y)) return false; break;
                }
                case 'week': {
                    const w = new Date(today); w.setDate(w.getDate()-7);
                    if (itemDateStr < localDateStr(w)) return false; break;
                }
                case 'month': {
                    const m = new Date(today); m.setDate(m.getDate()-30);
                    if (itemDateStr < localDateStr(m)) return false; break;
                }
                case 'q1': if (!dateInRange(ymd(yr,1,1), ymd(yr,3,31))) return false; break;
                case 'q2': if (!dateInRange(ymd(yr,4,1), ymd(yr,6,30))) return false; break;
                case 'q3': if (!dateInRange(ymd(yr,7,1), ymd(yr,9,30))) return false; break;
                case 'q4': if (!dateInRange(ymd(yr,10,1), ymd(yr,12,31))) return false; break;
            }
        }

        if (selCompanies.size  > 0 && !selCompanies.has(item.company))   return false;
        if (selGroups.size     > 0) {
            const wh = (window.appData?.warehouses||[]).find(w=>(typeof w!=='string')&&w.name===item.warehouse);
            if (!wh || !selGroups.has(wh.warehouse_group)) return false;
        }
        if (selWarehouses.size > 0 && !selWarehouses.has(item.warehouse)) return false;
        if (selClients.size    > 0 && !selClients.has(item.client))       return false;
        if (selProducts.size   > 0 && !selProducts.has(item.product))     return false;
        if (selCoalitions.size > 0 && !selCoalitions.has(item.coalition)) return false;
        if (selPrices.size     > 0 && !selPrices.has(String(parseFloat(item.price || 0)))) return false;

        const price = parseFloat(item.price || 0);

        return true;
    });
    
    filteredExpense.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let totalQuantity = 0;
    let totalTons = 0;
    let totalPrice = 0;
    
    filteredExpense.forEach(item => {
        totalQuantity += parseInt(item.quantity || 0);
        totalTons += parseFloat(item.tons || 0);
        totalPrice += parseFloat(item.total || 0);
    });
    
    document.getElementById('expenseTotalQuantity').textContent = totalQuantity;
    document.getElementById('expenseTotalTons').textContent = totalTons.toFixed(2);
    document.getElementById('expenseTotalPrice').textContent = totalPrice.toLocaleString('ru-RU');
    
    if (filteredExpense.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="p-4 text-center text-gray-500">Нет данных для отображения</td></tr>';
        window.updateRecordCount('expenseRecordCount', 0, yearData.expense.filter(i => !i.deleted).length);
        return;
    }
    
    tbody.innerHTML = '';
    filteredExpense.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const paymentStatus = item.payment_status === 'paid' ? '✅ Оплачено' : '⏳ Не оплачено';
        const statusClass = item.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600';
        
        // Форматируем дату
        const date = item.date ? item.date.split('T')[0] : '';
        const canEdit = !['warehouse', 'cashier'].includes(window.currentUser?.role);
        
        row.innerHTML = `
            <td class="p-3">
                <input type="checkbox" class="expense-checkbox rounded" 
                    data-id="${item.id}" 
                    data-client="${item.client || ''}" 
                    data-warehouse="${item.warehouse || ''}">
            </td>
            <td class="p-3">${date}</td>
            <td class="p-3">${item.coalition || ''}</td>
            <td class="p-3">${item.number || ''}</td>
            <td class="p-3">${item.company || ''}</td>
            <td class="p-3">${item.warehouse || ''}</td>
            <td class="p-3">${item.product || ''}</td>
            <td class="p-3">${item.client || ''}</td>
            <td class="p-3">${item.quantity || 0}</td>
            <td class="p-3">${parseFloat(item.tons || 0).toFixed(2)}</td>
            <td class="p-3">${parseFloat(item.price || 0).toFixed(2)}</td>
            <td class="p-3">${parseFloat(item.total || 0).toLocaleString('ru-RU')}</td>
            <td class="p-3 ${statusClass}">${paymentStatus}</td>
            <td class="p-3 text-sm text-gray-600">${item.user || 'admin'}</td>
            <td class="p-3">
                ${canEdit ? `
                <button onclick="editExpense(${item.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                <button onclick="deleteExpense(${item.id})" class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });

    window.updateRecordCount('expenseRecordCount', filteredExpense.length, yearData.expense.filter(i => !i.deleted).length);
}

window.editExpense = function(id) {
    const yearData = window.getCurrentYearData();
    if (!yearData || !yearData.expense) return;
    
    const item = yearData.expense.find(i => i.id === id);
    if (!item) {
        window.showToast('Запись не найдена', 'error');
        return;
    }
    
    document.getElementById('expenseDate').value = toDateOnly(item.date);
    document.getElementById('expenseCoalition').value = item.coalition || '';
    
    // Разбираем номер на месяц и номер накладной
    if (item.expense_number) {
        const parts = item.expense_number.split('\\');
        if (parts.length === 2) {
            document.getElementById('expenseMonth').value = parts[0];
            document.getElementById('expenseNumberInput').value = parts[1];
        } else {
            document.getElementById('expenseNumberInput').value = item.expense_number;
        }
    } else {
        document.getElementById('expenseNumberInput').value = '';
    }
    updateExpenseFullNumber();
    
    document.getElementById('expenseCompany').value = item.company || '';
    document.getElementById('expenseWarehouse').value = item.warehouse || '';
    document.getElementById('expenseProduct').value = item.product || '';
    document.getElementById('expenseClient').value = item.client || '';
    document.getElementById('expenseQuantity').value = item.quantity || 0;
    document.getElementById('expenseTons').value = item.total_weight || 0;
    document.getElementById('expensePrice').value = item.price_per_unit || 0;
    document.getElementById('expenseTotal').value = item.total_price || 0;
    document.getElementById('expenseNotes').value = item.notes || '';
    
    editingExpenseId = id;
    document.getElementById('cancelExpenseEdit').classList.remove('hidden');
    document.getElementById('expenseForm').scrollIntoView({ behavior: 'smooth' });
};

window.deleteExpense = async function(id) {
    const ok = await window.showConfirm('Вы уверены, что хотите удалить эту запись?');
    if (!ok) return;
    
    try {
        await window.api.deleteExpense(id);
        window.showToast('Запись удалена', 'success');
        
        await window.loadData();
        updateExpenseTable();
        window.updateDashboard();
    } catch (error) {
        console.error('❌ Ошибка при удалении:', error);
        window.showToast('Ошибка: ' + error.message, 'error');
    }
};

function cancelExpenseEdit() {
    editingExpenseId = null;
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = localDateStr();
    updateExpenseMonth(); // Обновляем месяц после сброса
    document.getElementById('cancelExpenseEdit').classList.add('hidden');
}

async function clearExpenseForm() {
    if (editingExpenseId) {
        if (!await window.showConfirm('Вы редактируете запись. Отменить редактирование и очистить форму?')) {
            return;
        }
        editingExpenseId = null;
        document.getElementById('cancelExpenseEdit').classList.add('hidden');
    }
    
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = localDateStr();
    updateExpenseMonth();
    document.getElementById('expenseTons').value = '';
    document.getElementById('expenseTotal').value = '';
}

function clearExpenseFilters() {
    const dateEl = document.getElementById('filterExpenseDate');
    if (dateEl) dateEl.value = '';

    const labels = {
        filterExpenseCompany:'Все фирмы', filterExpenseWarehouseGroup:'Все группы',
        filterExpenseWarehouse:'Все склады', filterExpenseClient:'Все клиенты',
        filterExpenseProduct:'Все товары', filterExpenseCoalition:'Все коалиции',
        filterExpensePrice:'Все цены'
    };
    Object.keys(labels).forEach(id => {
        const drop = document.getElementById('msDrop_' + id);
        if (drop) drop.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
        const btn = document.getElementById('msBtn_' + id);
        if (btn) btn.textContent = labels[id] + ' ▾';
    });
    updateExpenseTable();
}

window.updateExpenseTable = updateExpenseTable;
window.loadExpenseDictionaries = loadExpenseDictionaries;

console.log('✅ expense.js загружен');
