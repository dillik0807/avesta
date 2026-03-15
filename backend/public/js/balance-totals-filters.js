/**
 * 📦 ФИЛЬТРЫ ДЛЯ СВОДА ОСТАТКОВ И ИТОГОВ ВАГОНОВ
 */

// ===== СВОД ОСТАТКОВ =====

// Инициализация dropdown для свода остатков
window.initBalanceDropdowns = function() {
    const dropdowns = [
        { btn: 'balanceGroupsDropdownBtn', dropdown: 'balanceGroupsDropdown' },
        { btn: 'balanceWarehousesDropdownBtn', dropdown: 'balanceWarehousesDropdown' },
        { btn: 'balanceProductsDropdownBtn', dropdown: 'balanceProductsDropdown' }
    ];
    
    dropdowns.forEach(({ btn, dropdown }) => {
        const btnEl = document.getElementById(btn);
        const dropdownEl = document.getElementById(dropdown);
        if (btnEl && dropdownEl) {
            btnEl.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdownEl.classList.toggle('hidden');
                dropdowns.forEach(({ dropdown: other }) => {
                    if (other !== dropdown) {
                        document.getElementById(other)?.classList.add('hidden');
                    }
                });
            });
        }
    });
};

window.loadBalanceFilters = function() {
    initBalanceDropdowns();
    loadBalanceGroups();
    loadBalanceWarehouses();
    loadBalanceProducts();
};

window.loadBalanceGroups = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const groups = [...new Set(appData.warehouses.map(w => w.warehouse_group).filter(g => g))].sort();
    const container = document.getElementById('balanceGroupsList');
    if (!container) return;
    
    container.innerHTML = groups.map(group => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${group}" class="rounded" onchange="updateBalanceGroupsLabel(); updateBalanceWarehousesByGroups();">
            <span class="text-sm">${group}</span>
        </label>
    `).join('');
};

window.loadBalanceWarehouses = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const warehouses = [...appData.warehouses].sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('balanceWarehousesList');
    if (!container) return;
    
    container.innerHTML = warehouses.map(warehouse => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${warehouse.name}" class="rounded" onchange="updateBalanceWarehousesLabel();">
            <span class="text-sm">${warehouse.name}</span>
        </label>
    `).join('');
};

window.updateBalanceWarehousesByGroups = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const selectedGroups = Array.from(document.querySelectorAll('#balanceGroupsList input[type="checkbox"]:checked')).map(cb => cb.value);
    let filteredWarehouses = selectedGroups.length > 0 
        ? appData.warehouses.filter(w => selectedGroups.includes(w.warehouse_group))
        : appData.warehouses;
    
    filteredWarehouses = [...filteredWarehouses].sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('balanceWarehousesList');
    if (!container) return;
    
    container.innerHTML = filteredWarehouses.map(warehouse => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${warehouse.name}" class="rounded" onchange="updateBalanceWarehousesLabel();">
            <span class="text-sm">${warehouse.name}</span>
        </label>
    `).join('');
    updateBalanceWarehousesLabel();
};

window.loadBalanceProducts = function() {
    const appData = window.appData;
    if (!appData || !appData.products) return;
    
    const products = [...appData.products].sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('balanceProductsList');
    if (!container) return;
    
    container.innerHTML = products.map(product => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${product.name}" class="rounded" onchange="updateBalanceProductsLabel();">
            <span class="text-sm">${product.name}</span>
        </label>
    `).join('');
};

window.updateBalanceGroupsLabel = function() {
    const checked = document.querySelectorAll('#balanceGroupsList input[type="checkbox"]:checked');
    const label = document.getElementById('balanceGroupsSelected');
    if (label) label.textContent = checked.length === 0 ? 'Все группы' : `Выбрано: ${checked.length}`;
};

window.updateBalanceWarehousesLabel = function() {
    const checked = document.querySelectorAll('#balanceWarehousesList input[type="checkbox"]:checked');
    const label = document.getElementById('balanceWarehousesSelected');
    if (label) label.textContent = checked.length === 0 ? 'Все склады' : `Выбрано: ${checked.length}`;
};

window.updateBalanceProductsLabel = function() {
    const checked = document.querySelectorAll('#balanceProductsList input[type="checkbox"]:checked');
    const label = document.getElementById('balanceProductsSelected');
    if (label) label.textContent = checked.length === 0 ? 'Все товары' : `Выбрано: ${checked.length}`;
};

window.selectAllBalanceGroups = function() {
    document.querySelectorAll('#balanceGroupsList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateBalanceGroupsLabel();
    updateBalanceWarehousesByGroups();
};

window.clearAllBalanceGroups = function() {
    document.querySelectorAll('#balanceGroupsList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateBalanceGroupsLabel();
    updateBalanceWarehousesByGroups();
};

window.selectAllBalanceWarehouses = function() {
    document.querySelectorAll('#balanceWarehousesList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateBalanceWarehousesLabel();
};

window.clearAllBalanceWarehouses = function() {
    document.querySelectorAll('#balanceWarehousesList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateBalanceWarehousesLabel();
};

window.selectAllBalanceProducts = function() {
    document.querySelectorAll('#balanceProductsList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateBalanceProductsLabel();
};

window.clearAllBalanceProducts = function() {
    document.querySelectorAll('#balanceProductsList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateBalanceProductsLabel();
};

window.clearAllBalanceFilters = function() {
    clearAllBalanceGroups();
    clearAllBalanceWarehouses();
    clearAllBalanceProducts();
    window.updateBalanceSummary();
};

// ===== ИТОГИ ВАГОНОВ =====

window.initTotalsDropdowns = function() {
    const dropdowns = [
        { btn: 'totalsGroupsDropdownBtn', dropdown: 'totalsGroupsDropdown' },
        { btn: 'totalsWarehousesDropdownBtn', dropdown: 'totalsWarehousesDropdown' },
        { btn: 'totalsProductsDropdownBtn', dropdown: 'totalsProductsDropdown' }
    ];
    
    dropdowns.forEach(({ btn, dropdown }) => {
        const btnEl = document.getElementById(btn);
        const dropdownEl = document.getElementById(dropdown);
        if (btnEl && dropdownEl) {
            btnEl.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdownEl.classList.toggle('hidden');
                dropdowns.forEach(({ dropdown: other }) => {
                    if (other !== dropdown) {
                        document.getElementById(other)?.classList.add('hidden');
                    }
                });
            });
        }
    });
};

window.loadTotalsFilters = function() {
    initTotalsDropdowns();
    loadTotalsGroups();
    loadTotalsWarehouses();
    loadTotalsProducts();
};

window.loadTotalsGroups = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const groups = [...new Set(appData.warehouses.map(w => w.warehouse_group).filter(g => g))].sort();
    const container = document.getElementById('totalsGroupsList');
    if (!container) return;
    
    container.innerHTML = groups.map(group => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${group}" class="rounded" onchange="updateTotalsGroupsLabel(); updateTotalsWarehousesByGroups();">
            <span class="text-sm">${group}</span>
        </label>
    `).join('');
};

window.loadTotalsWarehouses = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const warehouses = [...appData.warehouses].sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('totalsWarehousesList');
    if (!container) return;
    
    container.innerHTML = warehouses.map(warehouse => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${warehouse.name}" class="rounded" onchange="updateTotalsWarehousesLabel();">
            <span class="text-sm">${warehouse.name}</span>
        </label>
    `).join('');
};

window.updateTotalsWarehousesByGroups = function() {
    const appData = window.appData;
    if (!appData || !appData.warehouses) return;
    
    const selectedGroups = Array.from(document.querySelectorAll('#totalsGroupsList input[type="checkbox"]:checked')).map(cb => cb.value);
    let filteredWarehouses = selectedGroups.length > 0 
        ? appData.warehouses.filter(w => selectedGroups.includes(w.warehouse_group))
        : appData.warehouses;
    
    filteredWarehouses = [...filteredWarehouses].sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('totalsWarehousesList');
    if (!container) return;
    
    container.innerHTML = filteredWarehouses.map(warehouse => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${warehouse.name}" class="rounded" onchange="updateTotalsWarehousesLabel();">
            <span class="text-sm">${warehouse.name}</span>
        </label>
    `).join('');
    updateTotalsWarehousesLabel();
};

window.loadTotalsProducts = function() {
    const appData = window.appData;
    if (!appData || !appData.products) return;
    
    const products = [...appData.products].sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('totalsProductsList');
    if (!container) return;
    
    container.innerHTML = products.map(product => `
        <label class="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" value="${product.name}" class="rounded" onchange="updateTotalsProductsLabel();">
            <span class="text-sm">${product.name}</span>
        </label>
    `).join('');
};

window.updateTotalsGroupsLabel = function() {
    const checked = document.querySelectorAll('#totalsGroupsList input[type="checkbox"]:checked');
    const label = document.getElementById('totalsGroupsSelected');
    if (label) label.textContent = checked.length === 0 ? 'Все группы' : `Выбрано: ${checked.length}`;
};

window.updateTotalsWarehousesLabel = function() {
    const checked = document.querySelectorAll('#totalsWarehousesList input[type="checkbox"]:checked');
    const label = document.getElementById('totalsWarehousesSelected');
    if (label) label.textContent = checked.length === 0 ? 'Все склады' : `Выбрано: ${checked.length}`;
};

window.updateTotalsProductsLabel = function() {
    const checked = document.querySelectorAll('#totalsProductsList input[type="checkbox"]:checked');
    const label = document.getElementById('totalsProductsSelected');
    if (label) label.textContent = checked.length === 0 ? 'Все товары' : `Выбрано: ${checked.length}`;
};

window.selectAllTotalsGroups = function() {
    document.querySelectorAll('#totalsGroupsList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateTotalsGroupsLabel();
    updateTotalsWarehousesByGroups();
};

window.clearAllTotalsGroups = function() {
    document.querySelectorAll('#totalsGroupsList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateTotalsGroupsLabel();
    updateTotalsWarehousesByGroups();
};

window.selectAllTotalsWarehouses = function() {
    document.querySelectorAll('#totalsWarehousesList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateTotalsWarehousesLabel();
};

window.clearAllTotalsWarehouses = function() {
    document.querySelectorAll('#totalsWarehousesList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateTotalsWarehousesLabel();
};

window.selectAllTotalsProducts = function() {
    document.querySelectorAll('#totalsProductsList input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateTotalsProductsLabel();
};

window.clearAllTotalsProducts = function() {
    document.querySelectorAll('#totalsProductsList input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateTotalsProductsLabel();
};

window.clearAllTotalsFilters = function() {
    clearAllTotalsGroups();
    clearAllTotalsWarehouses();
    clearAllTotalsProducts();
    window.updateWagonTotals();
};

console.log('✅ balance-totals-filters.js загружен');
