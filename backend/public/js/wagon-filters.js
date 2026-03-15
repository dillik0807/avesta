/**
 * 🚂 ФИЛЬТРЫ СВОДА ВАГОНОВ - Выпадающие списки с чекбоксами
 */

// Инициализация выпадающих списков
window.initWagonDropdowns = function() {
    // Закрытие dropdown при клике вне его
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.relative')) {
            document.querySelectorAll('[id$="Dropdown"]').forEach(dropdown => {
                dropdown.classList.add('hidden');
            });
        }
    });
    
    // Группы складов
    const groupsBtn = document.getElementById('wagonGroupsDropdownBtn');
    const groupsDropdown = document.getElementById('wagonGroupsDropdown');
    if (groupsBtn && groupsDropdown) {
        groupsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            groupsDropdown.classList.toggle('hidden');
            document.getElementById('wagonWarehousesDropdown')?.classList.add('hidden');
            document.getElementById('wagonProductsDropdown')?.classList.add('hidden');
        });
    }
    
    // Склады
    const warehousesBtn = document.getElementById('wagonWarehousesDropdownBtn');
    const warehousesDropdown = document.getElementById('wagonWarehousesDropdown');
    if (warehousesBtn && warehousesDropdown) {
        warehousesBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            warehousesDropdown.classList.toggle('hidden');
            document.getElementById('wagonGroupsDropdown')?.classList.add('hidden');
            document.getElementById('wagonProductsDropdown')?.classList.add('hidden');
        });
    }
    
    // Товары
    const productsBtn = document.getElementById('wagonProductsDropdownBtn');
    const productsDropdown = document.getElementById('wagonProductsDropdown');
    if (productsBtn && productsDropdown) {
        productsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            productsDropdown.classList.toggle('hidden');
            document.getElementById('wagonGroupsDropdown')?.classList.add('hidden');
            document.getElementById('wagonWarehousesDropdown')?.classList.add('hidden');
        });
    }
};

// Загрузка групп складов
window.loadWagonGroups = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const groups = [...new Set(appData.warehouses
        .map(w => w.warehouse_group)
        .filter(g => g))].sort();
    
    const container = document.getElementById('wagonGroupsList');
    if (!container) return;
    
    container.innerHTML = groups.map(group => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${group}" class="rounded" onchange="updateWagonGroupsLabel(); updateWagonWarehousesByGroups();">
            <span class="text-sm">${group}</span>
        </label>
    `).join('');
};

// Загрузка складов
window.loadWagonWarehouses = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const warehouses = [...appData.warehouses].sort((a, b) => a.name.localeCompare(b.name));
    
    const container = document.getElementById('wagonWarehousesList');
    if (!container) return;
    
    container.innerHTML = warehouses.map(warehouse => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${warehouse.name}" class="rounded" onchange="updateWagonWarehousesLabel();">
            <span class="text-sm">${warehouse.name}</span>
        </label>
    `).join('');
};

// Обновление складов по выбранным группам
window.updateWagonWarehousesByGroups = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const selectedGroups = Array.from(document.querySelectorAll('#wagonGroupsList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    let filteredWarehouses = appData.warehouses;
    if (selectedGroups.length > 0) {
        filteredWarehouses = appData.warehouses.filter(w => selectedGroups.includes(w.warehouse_group));
    }
    
    filteredWarehouses = [...filteredWarehouses].sort((a, b) => a.name.localeCompare(b.name));
    
    const container = document.getElementById('wagonWarehousesList');
    if (!container) return;
    
    container.innerHTML = filteredWarehouses.map(warehouse => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${warehouse.name}" class="rounded" onchange="updateWagonWarehousesLabel();">
            <span class="text-sm">${warehouse.name}</span>
        </label>
    `).join('');
    
    updateWagonWarehousesLabel();
};

// Загрузка товаров
window.loadWagonProducts = function() {
    const appData = window.appData;
    if (!appData || !appData.products) return;
    
    const products = [...appData.products].sort((a, b) => a.name.localeCompare(b.name));
    
    const container = document.getElementById('wagonProductsList');
    if (!container) return;
    
    container.innerHTML = products.map(product => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${product.name}" class="rounded" onchange="updateWagonProductsLabel();">
            <span class="text-sm">${product.name}</span>
        </label>
    `).join('');
};

// Обновление меток выбора
window.updateWagonGroupsLabel = function() {
    const checked = document.querySelectorAll('#wagonGroupsList input[type="checkbox"]:checked');
    const label = document.getElementById('wagonGroupsSelected');
    if (label) {
        label.textContent = checked.length === 0 ? 'Все группы' : `Выбрано: ${checked.length}`;
    }
};

window.updateWagonWarehousesLabel = function() {
    const checked = document.querySelectorAll('#wagonWarehousesList input[type="checkbox"]:checked');
    const label = document.getElementById('wagonWarehousesSelected');
    if (label) {
        label.textContent = checked.length === 0 ? 'Все склады' : `Выбрано: ${checked.length}`;
    }
};

window.updateWagonProductsLabel = function() {
    const checked = document.querySelectorAll('#wagonProductsList input[type="checkbox"]:checked');
    const label = document.getElementById('wagonProductsSelected');
    if (label) {
        label.textContent = checked.length === 0 ? 'Все товары' : `Выбрано: ${checked.length}`;
    }
};

// Функции выбора всех/очистки
window.selectAllWagonGroups = function() {
    document.querySelectorAll('#wagonGroupsList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateWagonGroupsLabel();
    updateWagonWarehousesByGroups();
};

window.clearAllWagonGroups = function() {
    document.querySelectorAll('#wagonGroupsList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateWagonGroupsLabel();
    updateWagonWarehousesByGroups();
};

window.selectAllWagonWarehouses = function() {
    document.querySelectorAll('#wagonWarehousesList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateWagonWarehousesLabel();
};

window.clearAllWagonWarehouses = function() {
    document.querySelectorAll('#wagonWarehousesList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateWagonWarehousesLabel();
};

window.selectAllWagonProducts = function() {
    document.querySelectorAll('#wagonProductsList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateWagonProductsLabel();
};

window.clearAllWagonProducts = function() {
    document.querySelectorAll('#wagonProductsList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateWagonProductsLabel();
};

// Сброс всех фильтров
window.clearAllWagonFilters = function() {
    clearAllWagonGroups();
    clearAllWagonWarehouses();
    clearAllWagonProducts();
    window.updateWagonSummary();
};

// Загрузка всех фильтров
window.loadWagonSummaryFilters = function() {
    initWagonDropdowns();
    loadWagonGroups();
    loadWagonWarehouses();
    loadWagonProducts();
};

console.log('✅ wagon-filters.js загружен');
