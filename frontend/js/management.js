/**
 * ⚙️ МОДУЛЬ УПРАВЛЕНИЯ СПРАВОЧНИКАМИ
 */

let editingCompanyId = null;
let editingWarehouseId = null;
let editingProductId = null;
let editingClientId = null;
let editingCoalitionId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('⚙️ Инициализация модуля управления...');
    
    // Формы добавления
    const companyForm = document.getElementById('addCompanyForm');
    const warehouseForm = document.getElementById('addWarehouseForm');
    const productForm = document.getElementById('addProductForm');
    const clientForm = document.getElementById('addClientForm');
    const coalitionForm = document.getElementById('addCoalitionForm');
    const priceForm = document.getElementById('priceForm');
    
    if (companyForm) companyForm.addEventListener('submit', handleAddCompany);
    if (warehouseForm) warehouseForm.addEventListener('submit', handleAddWarehouse);
    if (productForm) productForm.addEventListener('submit', handleAddProduct);
    if (clientForm) clientForm.addEventListener('submit', handleAddClient);
    if (coalitionForm) coalitionForm.addEventListener('submit', handleAddCoalition);
    if (priceForm) priceForm.addEventListener('submit', handleAddPrice);
    
    // Кнопка очистки старых цен
    const clearOldPricesBtn = document.getElementById('clearOldPricesBtn');
    if (clearOldPricesBtn) clearOldPricesBtn.addEventListener('click', clearOldPrices);
    
    // Фильтр истории цен
    const priceHistoryFilter = document.getElementById('priceHistoryFilter');
    if (priceHistoryFilter) priceHistoryFilter.addEventListener('change', updatePriceHistoryTable);
    
    // Устанавливаем сегодняшнюю дату
    const priceDate = document.getElementById('priceDate');
    if (priceDate) priceDate.value = localDateStr();
    
    console.log('✅ Модуль управления инициализирован');
});

async function handleAddCompany(e) {
    e.preventDefault();
    
    const name = document.getElementById('companyName').value;
    
    try {
        if (editingCompanyId) {
            await window.api.updateCompany(editingCompanyId, name);
            alert('✅ Фирма обновлена!');
            editingCompanyId = null;
        } else {
            await window.api.addCompany(name);
            alert('✅ Фирма добавлена!');
        }
        
        document.getElementById('addCompanyForm').reset();
        
        // Перезагружаем справочники
        const dictionaries = await window.api.getDictionaries();
        window.appData.companies = dictionaries.companies || [];
        window.appData.warehouses = dictionaries.warehouses || [];
        window.appData.products = dictionaries.products || [];
        window.appData.clients = dictionaries.clients || [];
        window.appData.coalitions = dictionaries.coalitions || [];
        
        updateManagementTables();
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function handleAddWarehouse(e) {
    e.preventDefault();
    
    const name = document.getElementById('warehouseName').value;
    const group = document.getElementById('warehouseGroup').value || null;
    
    try {
        if (editingWarehouseId) {
            await window.api.updateWarehouse(editingWarehouseId, name, group);
            alert('✅ Склад обновлен!');
            editingWarehouseId = null;
        } else {
            await window.api.addWarehouse(name, group);
            alert('✅ Склад добавлен!');
        }
        
        document.getElementById('addWarehouseForm').reset();
        
        // Перезагружаем справочники
        const dictionaries = await window.api.getDictionaries();
        window.appData.companies = dictionaries.companies || [];
        window.appData.warehouses = dictionaries.warehouses || [];
        window.appData.products = dictionaries.products || [];
        window.appData.clients = dictionaries.clients || [];
        window.appData.coalitions = dictionaries.coalitions || [];
        
        updateManagementTables();
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    
    try {
        if (editingProductId) {
            await window.api.updateProduct(editingProductId, name, 0.050, 0);
            alert('✅ Товар обновлен!');
            editingProductId = null;
        } else {
            await window.api.addProduct(name, 0.050, 0);
            alert('✅ Товар добавлен!');
        }
        
        document.getElementById('addProductForm').reset();
        
        // Перезагружаем ВСЕ данные включая цены
        await window.loadData();
        
        // Обновляем таблицы
        updateManagementTables();
        
        // Обновляем справочники в формах
        if (typeof window.loadExpenseDictionaries === 'function') {
            window.loadExpenseDictionaries();
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function handleAddClient(e) {
    e.preventDefault();
    
    const name = document.getElementById('clientName').value;
    const phone = document.getElementById('clientPhone').value || null;
    
    try {
        if (editingClientId) {
            await window.api.updateClient(editingClientId, name, phone);
            alert('✅ Клиент обновлен!');
            editingClientId = null;
        } else {
            await window.api.addClient(name, phone);
            alert('✅ Клиент добавлен!');
        }
        
        document.getElementById('addClientForm').reset();
        
        // Перезагружаем справочники
        const dictionaries = await window.api.getDictionaries();
        window.appData.companies = dictionaries.companies || [];
        window.appData.warehouses = dictionaries.warehouses || [];
        window.appData.products = dictionaries.products || [];
        window.appData.clients = dictionaries.clients || [];
        window.appData.coalitions = dictionaries.coalitions || [];
        
        updateManagementTables();
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function handleAddCoalition(e) {
    e.preventDefault();
    
    const name = document.getElementById('coalitionName').value;
    
    try {
        if (editingCoalitionId) {
            await window.api.updateCoalition(editingCoalitionId, name);
            alert('✅ Коалиция обновлена!');
            editingCoalitionId = null;
        } else {
            await window.api.addCoalition(name);
            alert('✅ Коалиция добавлена!');
        }
        
        document.getElementById('addCoalitionForm').reset();
        
        // Перезагружаем справочники
        const dictionaries = await window.api.getDictionaries();
        window.appData.companies = dictionaries.companies || [];
        window.appData.warehouses = dictionaries.warehouses || [];
        window.appData.products = dictionaries.products || [];
        window.appData.clients = dictionaries.clients || [];
        window.appData.coalitions = dictionaries.coalitions || [];
        
        updateManagementTables();
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

async function handleAddPrice(e) {
    e.preventDefault();
    
    const productId = parseInt(document.getElementById('priceProduct').value);
    const warehouseGroup = document.getElementById('priceWarehouseGroup').value;
    const price = parseFloat(document.getElementById('priceValue').value);
    const effectiveDate = document.getElementById('priceDate').value;
    
    try {
        await window.api.addPrice({
            product_id: productId,
            warehouse_group: warehouseGroup,
            price: price,
            effective_date: effectiveDate,
            notes: ''
        });
        alert('✅ Цена установлена!');
        
        document.getElementById('priceForm').reset();
        document.getElementById('priceDate').value = localDateStr();
        document.getElementById('priceWarehouseGroup').value = 'ALL';
        
        // Перезагружаем данные
        await window.loadData();
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

function updateManagementTables() {
    console.log('📊 Обновление таблиц управления...');
    
    updateCompaniesTable();
    updateWarehousesTable();
    updateProductsTable();
    updateClientsTable();
    updateCoalitionsTable();
    updatePriceSelectors();
    loadPriceHistory();
}

function updateCompaniesTable() {
    const tbody = document.getElementById('companiesTableBody');
    if (!tbody) return;
    
    if (!window.appData.companies || window.appData.companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    window.appData.companies.forEach((company, index) => {
        const id = typeof company === 'object' ? company.id : null;
        const name = typeof company === 'string' ? company : company.name;
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-3">${name}</td>
            <td class="p-3 text-center">${index + 1}</td>
            <td class="p-3 text-center">
                ${id ? `
                    <button onclick="editCompany(${id}, '${name.replace(/'/g, "\\'")}')" 
                        class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                    <button onclick="deleteCompany(${id}, '${name.replace(/'/g, "\\'")}')" 
                        class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateWarehousesTable() {
    const tbody = document.getElementById('warehousesTableBody');
    if (!tbody) return;
    
    if (!window.appData.warehouses || window.appData.warehouses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    window.appData.warehouses.forEach((warehouse, index) => {
        const id = typeof warehouse === 'object' ? warehouse.id : null;
        const name = typeof warehouse === 'string' ? warehouse : warehouse.name;
        const group = typeof warehouse === 'object' ? (warehouse.warehouse_group || warehouse.group || '-') : '-';
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-3">${name}</td>
            <td class="p-3">${group}</td>
            <td class="p-3 text-center">${index + 1}</td>
            <td class="p-3 text-center">
                ${id ? `
                    <button onclick="editWarehouse(${id}, '${name.replace(/'/g, "\\'")}', '${group}')" 
                        class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                    <button onclick="deleteWarehouse(${id}, '${name.replace(/'/g, "\\'")}')" 
                        class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    if (!window.appData.products || window.appData.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    window.appData.products.forEach((product, index) => {
        const id = typeof product === 'object' ? product.id : null;
        const name = typeof product === 'string' ? product : product.name;
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-3">${name}</td>
            <td class="p-3 text-center">${index + 1}</td>
            <td class="p-3 text-center">
                ${id ? `
                    <button onclick="editProduct(${id}, '${name.replace(/'/g, "\\'")}', 0, 0)" 
                        class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                    <button onclick="deleteProduct(${id}, '${name.replace(/'/g, "\\'")}')" 
                        class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateClientsTable() {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;
    
    if (!window.appData.clients || window.appData.clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    window.appData.clients.forEach((client, index) => {
        const id = typeof client === 'object' ? client.id : null;
        const name = typeof client === 'string' ? client : client.name;
        const phone = typeof client === 'object' ? (client.phone || '-') : '-';
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-3">${name}</td>
            <td class="p-3">${phone}</td>
            <td class="p-3 text-center">${index + 1}</td>
            <td class="p-3 text-center">
                ${id ? `
                    <button onclick="editClient(${id}, '${name.replace(/'/g, "\\'")}', '${phone}')" 
                        class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                    <button onclick="deleteClient(${id}, '${name.replace(/'/g, "\\'")}')" 
                        class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateCoalitionsTable() {
    const tbody = document.getElementById('coalitionsTableBody');
    if (!tbody) return;
    
    if (!window.appData.coalitions || window.appData.coalitions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    window.appData.coalitions.forEach((coalition, index) => {
        const id = typeof coalition === 'object' ? coalition.id : null;
        const name = typeof coalition === 'string' ? coalition : coalition.name;
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-3">${name}</td>
            <td class="p-3 text-center">${index + 1}</td>
            <td class="p-3 text-center">
                ${id ? `
                    <button onclick="editCoalition(${id}, '${name.replace(/'/g, "\\'")}')" 
                        class="text-blue-600 hover:text-blue-800 mr-2" title="Редактировать">✏️</button>
                    <button onclick="deleteCoalition(${id}, '${name.replace(/'/g, "\\'")}')" 
                        class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Функции редактирования
window.editCompany = function(id, name) {
    document.getElementById('companyName').value = name;
    editingCompanyId = id;
    document.getElementById('companyName').focus();
};

window.editWarehouse = function(id, name, group) {
    document.getElementById('warehouseName').value = name;
    document.getElementById('warehouseGroup').value = group === '-' ? '' : group;
    editingWarehouseId = id;
    document.getElementById('warehouseName').focus();
};

window.editProduct = function(id, name) {
    document.getElementById('productName').value = name;
    editingProductId = id;
    document.getElementById('productName').focus();
};

window.editClient = function(id, name, phone) {
    document.getElementById('clientName').value = name;
    document.getElementById('clientPhone').value = phone === '-' ? '' : phone;
    editingClientId = id;
    document.getElementById('clientName').focus();
};

window.editCoalition = function(id, name) {
    document.getElementById('coalitionName').value = name;
    editingCoalitionId = id;
    document.getElementById('coalitionName').focus();
};

// Функции удаления
window.deleteCompany = async function(id, name) {
    if (!confirm(`Вы уверены, что хотите удалить фирму "${name}"?`)) return;
    
    try {
        await window.api.deleteCompany(id);
        alert('✅ Фирма удалена!');
        await window.loadData();
        updateManagementTables();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
};

window.deleteWarehouse = async function(id, name) {
    if (!confirm(`Вы уверены, что хотите удалить склад "${name}"?`)) return;
    
    try {
        await window.api.deleteWarehouse(id);
        alert('✅ Склад удален!');
        await window.loadData();
        updateManagementTables();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
};

window.deleteProduct = async function(id, name) {
    if (!confirm(`Вы уверены, что хотите удалить товар "${name}"?`)) return;
    
    try {
        await window.api.deleteProduct(id);
        alert('✅ Товар удален!');
        await window.loadData();
        updateManagementTables();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
};

window.deleteClient = async function(id, name) {
    if (!confirm(`Вы уверены, что хотите удалить клиента "${name}"?`)) return;
    
    try {
        await window.api.deleteClient(id);
        alert('✅ Клиент удален!');
        await window.loadData();
        updateManagementTables();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
};

window.deleteCoalition = async function(id, name) {
    if (!confirm(`Вы уверены, что хотите удалить коалицию "${name}"?`)) return;
    
    try {
        await window.api.deleteCoalition(id);
        alert('✅ Коалиция удалена!');
        await window.loadData();
        updateManagementTables();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
};

// Функции управления ценами
function updatePriceSelectors() {
    // Обновляем селектор товаров
    const priceProduct = document.getElementById('priceProduct');
    if (priceProduct && window.appData.products) {
        priceProduct.innerHTML = '<option value="">Выберите товар</option>';
        window.appData.products.forEach(product => {
            const id = typeof product === 'object' ? product.id : null;
            const name = typeof product === 'string' ? product : product.name;
            if (id) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                priceProduct.appendChild(option);
            }
        });
    }
    
    // Обновляем селектор групп складов
    const priceWarehouseGroup = document.getElementById('priceWarehouseGroup');
    if (priceWarehouseGroup && window.appData.warehouses) {
        const groups = [...new Set(window.appData.warehouses
            .map(w => typeof w === 'object' ? w.warehouse_group : null)
            .filter(g => g))];
        
        priceWarehouseGroup.innerHTML = '<option value="">Выберите группу</option><option value="ALL">🌍 Все склады (глобальная)</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            priceWarehouseGroup.appendChild(option);
        });
    }
    
    // Обновляем фильтр истории
    const priceHistoryFilter = document.getElementById('priceHistoryFilter');
    if (priceHistoryFilter && window.appData.products) {
        const currentValue = priceHistoryFilter.value;
        priceHistoryFilter.innerHTML = '<option value="">Все товары</option>';
        window.appData.products.forEach(product => {
            const id = typeof product === 'object' ? product.id : null;
            const name = typeof product === 'string' ? product : product.name;
            if (id) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                priceHistoryFilter.appendChild(option);
            }
        });
        if (currentValue) priceHistoryFilter.value = currentValue;
    }
}

async function loadPriceHistory() {
    try {
        const prices = await window.api.getPrices();
        window.appData.prices = prices || [];
        updatePriceHistoryTable();
    } catch (error) {
        console.error('❌ Ошибка загрузки цен:', error);
    }
}

function updatePriceHistoryTable() {
    const tbody = document.getElementById('priceHistoryTable');
    if (!tbody) return;
    
    if (!window.appData.prices || window.appData.prices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    
    const filterProductId = document.getElementById('priceHistoryFilter')?.value;
    let filteredPrices = window.appData.prices;
    
    if (filterProductId) {
        filteredPrices = filteredPrices.filter(p => p.product_id == filterProductId);
    }
    
    // Сортируем по дате (новые сверху)
    filteredPrices.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
    
    tbody.innerHTML = '';
    filteredPrices.forEach(price => {
        const date = new Date(price.effective_date).toLocaleDateString('ru-RU');
        const groupDisplay = price.warehouse_group === 'ALL' ? '🌍 Все склады' : `Группа ${price.warehouse_group}`;
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-2">${date}</td>
            <td class="p-2">${price.product_name || 'Неизвестно'}</td>
            <td class="p-2">${groupDisplay}</td>
            <td class="p-2">${parseFloat(price.price).toLocaleString('ru-RU')} ₽</td>
            <td class="p-2 text-sm text-gray-600">${price.created_by_name || 'admin'}</td>
            <td class="p-2">
                <button onclick="deletePrice(${price.id})" class="text-red-600 hover:text-red-800" title="Удалить">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.deletePrice = async function(id) {
    if (!confirm('Вы уверены, что хотите удалить эту цену?')) return;
    
    try {
        await window.api.deletePrice(id);
        alert('✅ Цена удалена!');
        await loadPriceHistory();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
};

async function clearOldPrices() {
    if (!confirm('Удалить все цены старше 30 дней?')) return;
    
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        await window.api.clearOldPrices(thirtyDaysAgo.toISOString().split('T')[0]);
        alert('✅ Старые цены удалены!');
        await loadPriceHistory();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('❌ Ошибка: ' + error.message);
    }
}

window.updateManagementTables = updateManagementTables;

console.log('✅ management.js загружен');


// ========================================
// 👤 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
// ========================================

let editingUserId = null;

// Инициализация форм пользователей
document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userForm');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const cancelUserEdit = document.getElementById('cancelUserEdit');
    
    if (userForm) userForm.addEventListener('submit', handleAddUser);
    if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);
    if (cancelUserEdit) cancelUserEdit.addEventListener('click', cancelUserEditing);
});

// Заполнение чекбоксов групп складов
async function populateWarehouseGroupSelect() {
    const container = document.getElementById('userWarehouseGroupCheckboxes');
    if (!container) return;
    
    try {
        const data = await api.getDictionaries();
        const warehouses = data.warehouses || [];
        
        // Получаем уникальные группы
        const groups = [...new Set(warehouses.map(w => w.warehouse_group).filter(g => g))].sort();
        
        container.innerHTML = '';
        
        // Добавляем чекбокс "Все склады"
        const allLabel = document.createElement('label');
        allLabel.className = 'flex items-center gap-2';
        allLabel.innerHTML = `
            <input type="checkbox" value="" class="rounded warehouse-group-checkbox" id="allWarehousesCheckbox">
            <span class="font-medium">Все склады</span>
        `;
        container.appendChild(allLabel);
        
        // Добавляем чекбоксы для каждой группы
        groups.forEach(group => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2';
            label.innerHTML = `
                <input type="checkbox" value="${group}" class="rounded warehouse-group-checkbox">
                <span>${group}</span>
            `;
            container.appendChild(label);
        });
        
        // Обработчик для "Все склады"
        const allCheckbox = document.getElementById('allWarehousesCheckbox');
        const groupCheckboxes = container.querySelectorAll('.warehouse-group-checkbox:not(#allWarehousesCheckbox)');
        
        if (allCheckbox) {
            allCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    groupCheckboxes.forEach(cb => cb.checked = false);
                }
            });
        }
        
        // Обработчик для групп - снимаем "Все склады" при выборе конкретной группы
        groupCheckboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                if (this.checked && allCheckbox) {
                    allCheckbox.checked = false;
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки групп складов:', error);
    }
}

// Добавление/редактирование пользователя
async function handleAddUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('userRole').value;
    const requirePasswordChange = document.getElementById('userRequirePasswordChange')?.checked || false;
    const isBlocked = document.getElementById('userIsBlocked')?.checked || false;
    
    // Собираем выбранные группы складов
    const allCheckbox = document.getElementById('allWarehousesCheckbox');
    const groupCheckboxes = document.querySelectorAll('.warehouse-group-checkbox:not(#allWarehousesCheckbox)');
    
    let warehouseGroup = null;
    if (allCheckbox && allCheckbox.checked) {
        warehouseGroup = null; // Все склады
    } else {
        const selectedGroups = Array.from(groupCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        if (selectedGroups.length > 0) {
            warehouseGroup = selectedGroups; // Массив выбранных групп
        }
    }
    
    if (!username || !password || !role) {
        alert('Заполните все обязательные поля');
        return;
    }
    
    try {
        if (editingUserId) {
            // Редактирование
            await api.updateUser(editingUserId, { 
                username, 
                password, 
                role, 
                warehouse_group: warehouseGroup,
                require_password_change: requirePasswordChange,
                is_blocked: isBlocked
            });
            alert('✅ Пользователь обновлен');
            editingUserId = null;
            document.getElementById('cancelUserEdit').classList.add('hidden');
        } else {
            // Добавление
            await api.addUser({ 
                username, 
                password, 
                role, 
                warehouse_group: warehouseGroup,
                require_password_change: requirePasswordChange,
                is_blocked: isBlocked
            });
            alert('✅ Пользователь добавлен');
        }
        
        e.target.reset();
        // Сбрасываем чекбоксы
        if (allCheckbox) allCheckbox.checked = true;
        groupCheckboxes.forEach(cb => cb.checked = false);
        document.getElementById('userRequirePasswordChange').checked = false;
        document.getElementById('userIsBlocked').checked = false;
        
        await loadUsers();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Смена пароля
async function handleChangePassword(e) {
    e.preventDefault();
    
    const username = document.getElementById('changePasswordUser').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPasswordChange').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!username || !currentPassword || !newPassword || !confirmPassword) {
        alert('Заполните все поля');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('Новый пароль и подтверждение не совпадают');
        return;
    }
    
    if (newPassword.length < 4) {
        alert('Пароль должен быть не менее 4 символов');
        return;
    }
    
    try {
        await api.changePassword(username, currentPassword, newPassword);
        alert('✅ Пароль успешно изменен');
        e.target.reset();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Загрузка списка пользователей
async function loadUsers() {
    try {
        const users = await api.getUsers();
        updateUsersTable(users);
        updateChangePasswordSelect(users);
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
    }
}

// Обновление таблицы пользователей
function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Нет пользователей</td></tr>';
        return;
    }
    
    const roleNames = {
        admin: 'Администратор',
        warehouse: 'Завсклада',
        cashier: 'Кассир',
        manager: 'Руководитель'
    };
    
    tbody.innerHTML = users.map(user => {
        // Форматируем группы складов
        let warehouseGroupText = 'Все склады';
        if (user.warehouse_group) {
            if (Array.isArray(user.warehouse_group)) {
                warehouseGroupText = user.warehouse_group.join(', ');
            } else {
                warehouseGroupText = user.warehouse_group;
            }
        }
        
        // Форматируем статус
        let statusBadges = [];
        if (user.is_blocked) {
            statusBadges.push('<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">🔒 Заблокирован</span>');
        }
        if (user.require_password_change) {
            statusBadges.push('<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">🔑 Смена пароля</span>');
        }
        if (statusBadges.length === 0) {
            statusBadges.push('<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">✅ Активен</span>');
        }
        const statusText = statusBadges.join(' ');
        
        return `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3">${user.username}</td>
            <td class="p-3">${roleNames[user.role] || user.role}</td>
            <td class="p-3">${warehouseGroupText}</td>
            <td class="p-3">${statusText}</td>
            <td class="p-3">
                <div class="flex gap-1 flex-wrap">
                    <button onclick="editUser(${user.id})" 
                        class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        title="Редактировать">
                        ✏️
                    </button>
                    <button onclick="togglePasswordChange(${user.id}, ${!user.require_password_change})" 
                        class="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                        title="${user.require_password_change ? 'Отменить смену пароля' : 'Требовать смену пароля'}">
                        🔑
                    </button>
                    <button onclick="toggleBlock(${user.id}, ${!user.is_blocked})" 
                        class="bg-${user.is_blocked ? 'green' : 'red'}-500 text-white px-2 py-1 rounded text-xs hover:bg-${user.is_blocked ? 'green' : 'red'}-600"
                        title="${user.is_blocked ? 'Разблокировать' : 'Заблокировать'}">
                        ${user.is_blocked ? '🔓' : '🔒'}
                    </button>
                    <button onclick="deleteUser(${user.id}, '${user.username}')" 
                        class="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                        title="Удалить"
                        ${user.username === 'admin' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Обновление селекта смены пароля
function updateChangePasswordSelect(users) {
    const select = document.getElementById('changePasswordUser');
    if (!select) return;
    
    const currentUser = window.currentUser;
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    select.innerHTML = '<option value="">Выберите пользователя</option>';
    
    users.forEach(user => {
        // Админ видит всех, обычные пользователи только себя
        if (isAdmin || (currentUser && user.username === currentUser.username)) {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = `${user.username} (${getRoleText(user.role)})`;
            select.appendChild(option);
        }
    });
}

// Редактирование пользователя
window.editUser = async function(id) {
    try {
        const users = await api.getUsers();
        const user = users.find(u => u.id === id);
        
        if (!user) {
            alert('Пользователь не найден');
            return;
        }
        
        document.getElementById('newUsername').value = user.username;
        document.getElementById('newPassword').value = '';
        document.getElementById('userRole').value = user.role;
        
        // Устанавливаем галочки статуса
        document.getElementById('userRequirePasswordChange').checked = user.require_password_change || false;
        document.getElementById('userIsBlocked').checked = user.is_blocked || false;
        
        // Устанавливаем чекбоксы групп складов
        const allCheckbox = document.getElementById('allWarehousesCheckbox');
        const groupCheckboxes = document.querySelectorAll('.warehouse-group-checkbox:not(#allWarehousesCheckbox)');
        
        // Сначала снимаем все чекбоксы
        if (allCheckbox) allCheckbox.checked = false;
        groupCheckboxes.forEach(cb => cb.checked = false);
        
        if (!user.warehouse_group || user.warehouse_group === null) {
            // Все склады
            if (allCheckbox) allCheckbox.checked = true;
        } else if (Array.isArray(user.warehouse_group)) {
            // Массив групп
            groupCheckboxes.forEach(cb => {
                if (user.warehouse_group.includes(cb.value)) {
                    cb.checked = true;
                }
            });
        } else {
            // Одна группа (старый формат)
            groupCheckboxes.forEach(cb => {
                if (cb.value === user.warehouse_group) {
                    cb.checked = true;
                }
            });
        }
        
        editingUserId = id;
        document.getElementById('cancelUserEdit').classList.remove('hidden');
        
        // Прокрутка к форме
        document.getElementById('userForm').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка при загрузке данных пользователя');
    }
};

// Удаление пользователя
window.deleteUser = async function(id, username) {
    if (username === 'admin') {
        alert('Нельзя удалить администратора');
        return;
    }
    
    if (!confirm(`Удалить пользователя "${username}"?`)) {
        return;
    }
    
    try {
        await api.deleteUser(id);
        alert('✅ Пользователь удален');
        await loadUsers();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
};

// Переключить требование смены пароля
window.togglePasswordChange = async function(id, newValue) {
    try {
        const users = await api.getUsers();
        const user = users.find(u => u.id === id);
        
        if (!user) {
            alert('Пользователь не найден');
            return;
        }
        
        const action = newValue ? 'установить' : 'снять';
        if (!confirm(`${newValue ? '🔑 Требовать' : '✅ Отменить'} смену пароля для пользователя "${user.username}"?`)) {
            return;
        }
        
        await api.updateUser(id, {
            username: user.username,
            // password не передаем - оставляем старый
            role: user.role,
            warehouse_group: user.warehouse_group,
            require_password_change: newValue,
            is_blocked: user.is_blocked
        });
        
        alert(`✅ ${newValue ? 'Установлено' : 'Снято'} требование смены пароля`);
        await loadUsers();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
};

// Переключить блокировку пользователя
window.toggleBlock = async function(id, newValue) {
    try {
        const users = await api.getUsers();
        const user = users.find(u => u.id === id);
        
        if (!user) {
            alert('Пользователь не найден');
            return;
        }
        
        if (user.username === 'admin') {
            alert('Нельзя заблокировать администратора');
            return;
        }
        
        const action = newValue ? 'заблокировать' : 'разблокировать';
        if (!confirm(`${newValue ? '🔒 Заблокировать' : '🔓 Разблокировать'} пользователя "${user.username}"?`)) {
            return;
        }
        
        await api.updateUser(id, {
            username: user.username,
            // password не передаем - оставляем старый
            role: user.role,
            warehouse_group: user.warehouse_group,
            require_password_change: user.require_password_change,
            is_blocked: newValue
        });
        
        alert(`✅ Пользователь ${newValue ? 'заблокирован' : 'разблокирован'}`);
        await loadUsers();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
};

// Отмена редактирования
function cancelUserEditing() {
    editingUserId = null;
    document.getElementById('userForm').reset();
    document.getElementById('cancelUserEdit').classList.add('hidden');
}

// Получение текста роли
function getRoleText(role) {
    const roleNames = {
        admin: 'Администратор',
        warehouse: 'Завсклада',
        cashier: 'Кассир',
        manager: 'Руководитель'
    };
    return roleNames[role] || role;
}

// Обновление таблиц управления (добавляем загрузку пользователей)
const originalUpdateManagementTables = window.updateManagementTables;
window.updateManagementTables = async function() {
    if (originalUpdateManagementTables) {
        await originalUpdateManagementTables();
    }
    
    // Загружаем пользователей если находимся на странице пользователей
    const usersSection = document.getElementById('users');
    if (usersSection && !usersSection.classList.contains('hidden')) {
        await populateWarehouseGroupSelect();
        await loadUsers();
    }
};

// Экспортируем функцию для использования в main.js
window.initUsersSection = async function() {
    console.log('👤 Инициализация раздела пользователей...');
    console.log('👤 window.currentUser:', window.currentUser);
    
    // Загружаем год по умолчанию из БД
    try {
        const settings = await window.api.getUserSettings();
        const defaultYear = settings.default_year;
        console.log('📅 Текущий год по умолчанию из БД:', defaultYear);
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить год по умолчанию:', error);
    }
    
    await populateWarehouseGroupSelect();
    await loadUsers();
    
    // Инициализируем управление годами с задержкой
    setTimeout(async () => {
        console.log('📅 Инициализация управления годами...');
        console.log('📅 window.currentUser:', window.currentUser);
        
        if (typeof window.updateYearsList === 'function') {
            await window.updateYearsList();
            console.log('✅ updateYearsList вызвана');
        } else {
            console.warn('⚠️ updateYearsList не найдена');
        }
        
        if (typeof window.updateYearsStats === 'function') {
            window.updateYearsStats();
            console.log('✅ updateYearsStats вызвана');
        } else {
            console.warn('⚠️ updateYearsStats не найдена');
        }
        
        // Показываем/скрываем раздел управления годами в зависимости от роли
        const yearManagementSection = document.getElementById('yearManagementSection');
        console.log('📅 yearManagementSection найден:', !!yearManagementSection);
        
        if (yearManagementSection) {
            if (window.currentUser) {
                console.log('👤 Роль пользователя:', window.currentUser.role);
                if (window.currentUser.role === 'admin') {
                    yearManagementSection.classList.remove('hidden');
                    console.log('✅ Раздел управления годами показан');
                } else {
                    yearManagementSection.classList.add('hidden');
                    console.log('🔒 Раздел управления годами скрыт (не администратор)');
                }
            } else {
                console.warn('⚠️ window.currentUser не установлен');
                // Показываем раздел по умолчанию, если пользователь не определен
                yearManagementSection.classList.remove('hidden');
            }
        } else {
            console.error('❌ yearManagementSection не найден в DOM');
        }
        
        // Проверяем состояние чекбоксов после рендеринга
        try {
            const settings = await window.api.getUserSettings();
            const defaultYear = settings.default_year;
            if (defaultYear) {
                const checkbox = document.getElementById(`defaultYear${defaultYear}`);
                console.log(`📋 Чекбокс для года ${defaultYear}:`, checkbox ? 'найден' : 'не найден');
                if (checkbox) {
                    console.log(`📋 Состояние чекбокса: ${checkbox.checked ? 'checked ✓' : 'unchecked ✗'}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось проверить состояние чекбокса:', error);
        }
    }, 200);
};
