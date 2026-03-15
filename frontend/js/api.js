/**
 * 🌐 API КЛИЕНТ ДЛЯ РАБОТЫ С СЕРВЕРОМ
 */

class API {
    constructor() {
        // Определяем базовый URL API
        // Всегда используем Railway бэкенд
        this.baseURL = 'https://avesta-production.up.railway.app';
        
        // Всегда требуем логин при открытии страницы
        localStorage.removeItem('authToken');
        this.token = null;
        
        console.log('🌐 API Base URL:', this.baseURL);
    }

    // Установка токена
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Удаление токена
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Базовый запрос
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                    window.location.reload();
                }
                // Если сервер вернул сообщение об ошибке, используем его
                const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('❌ Ошибка API запроса:', error);
            throw error;
        }
    }

    // Аутентификация
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    // Получение списка доступных годов
    async getAvailableYears() {
        return await this.request('/data/years/list');
    }

    // Получение данных за год
    async getData(year) {
        return await this.request(`/data/${year}`);
    }

    // Синхронизация
    async sync(year, lastSyncTime) {
        return await this.request('/data/sync', {
            method: 'POST',
            body: JSON.stringify({ year, lastSyncTime })
        });
    }

    // Приход
    async addIncome(data) {
        return await this.request('/income', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateIncome(id, data) {
        return await this.request(`/income/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteIncome(id) {
        return await this.request(`/income/${id}`, {
            method: 'DELETE'
        });
    }

    // Расход
    async addExpense(data) {
        return await this.request('/expense', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateExpense(id, data) {
        return await this.request(`/expense/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteExpense(id) {
        return await this.request(`/expense/${id}`, {
            method: 'DELETE'
        });
    }

    // Погашения
    async addPayment(data) {
        return await this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePayment(id, data) {
        return await this.request(`/payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deletePayment(id) {
        return await this.request(`/payments/${id}`, {
            method: 'DELETE'
        });
    }

    // Партнеры
    async addPartner(data) {
        return await this.request('/partners', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePartner(id, data) {
        return await this.request(`/partners/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deletePartner(id) {
        return await this.request(`/partners/${id}`, {
            method: 'DELETE'
        });
    }

    // Справочники
    async getDictionaries() {
        return await this.request('/management/dictionaries');
    }

    async addCompany(name) {
        return await this.request('/management/companies', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async updateCompany(id, name) {
        return await this.request(`/management/companies/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });
    }

    async deleteCompany(id) {
        return await this.request(`/management/companies/${id}`, {
            method: 'DELETE'
        });
    }

    async addWarehouse(name, warehouseGroup) {
        return await this.request('/management/warehouses', {
            method: 'POST',
            body: JSON.stringify({ name, warehouseGroup })
        });
    }

    async updateWarehouse(id, name, warehouseGroup) {
        return await this.request(`/management/warehouses/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, warehouseGroup })
        });
    }

    async deleteWarehouse(id) {
        return await this.request(`/management/warehouses/${id}`, {
            method: 'DELETE'
        });
    }

    async addProduct(name, weightPerUnit, price) {
        return await this.request('/management/products', {
            method: 'POST',
            body: JSON.stringify({ name, weightPerUnit, price })
        });
    }

    async updateProduct(id, name, weightPerUnit, price) {
        return await this.request(`/management/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, weightPerUnit, price })
        });
    }

    async deleteProduct(id) {
        return await this.request(`/management/products/${id}`, {
            method: 'DELETE'
        });
    }

    async addClient(name, phone) {
        return await this.request('/management/clients', {
            method: 'POST',
            body: JSON.stringify({ name, phone })
        });
    }

    async updateClient(id, name, phone) {
        return await this.request(`/management/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, phone })
        });
    }

    async deleteClient(id) {
        return await this.request(`/management/clients/${id}`, {
            method: 'DELETE'
        });
    }

    async addCoalition(name) {
        return await this.request('/management/coalitions', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async updateCoalition(id, name) {
        return await this.request(`/management/coalitions/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });
    }

    async deleteCoalition(id) {
        return await this.request(`/management/coalitions/${id}`, {
            method: 'DELETE'
        });
    }

    // Цены
    async getPrices() {
        return await this.request('/prices');
    }

    async addPrice(data) {
        return await this.request('/prices', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async deletePrice(id) {
        return await this.request(`/prices/${id}`, {
            method: 'DELETE'
        });
    }

    async clearOldPrices(beforeDate) {
        return await this.request('/prices/clear-old', {
            method: 'POST',
            body: JSON.stringify({ beforeDate })
        });
    }

    // ========================================
    // 👤 ПОЛЬЗОВАТЕЛИ
    // ========================================

    // Получить всех пользователей
    async getUsers() {
        return this.request('/users');
    }

    // Добавить пользователя
    async addUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Обновить пользователя
    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // Удалить пользователя
    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Сменить пароль
    async changePassword(username, currentPassword, newPassword) {
        return this.request('/users/change-password', {
            method: 'POST',
            body: JSON.stringify({ username, currentPassword, newPassword })
        });
    }

    // ========================================
    // НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ
    // ========================================

    // Получить настройки пользователя
    async getUserSettings() {
        return this.request('/settings');
    }

    // Установить год по умолчанию
    async setDefaultYear(year) {
        return this.request('/settings/default-year', {
            method: 'POST',
            body: JSON.stringify({ year })
        });
    }

    // Удалить год по умолчанию
    async clearDefaultYear() {
        return this.request('/settings/default-year', {
            method: 'DELETE'
        });
    }

    // Обновить настройки пользователя
    async updateUserSettings(settings) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify({ settings })
        });
    }

    // ========================================
    // 📅 УПРАВЛЕНИЕ ГОДАМИ
    // ========================================

    async copyYearData(from_year, to_year, tables) {
        return this.request('/years/copy', {
            method: 'POST',
            body: JSON.stringify({ from_year, to_year, tables })
        });
    }

    async moveYearData(from_year, to_year, tables) {
        return this.request('/years/move', {
            method: 'POST',
            body: JSON.stringify({ from_year, to_year, tables })
        });
    }
}

// Создаем глобальный экземпляр API
window.api = new API();
console.log('✅ API клиент инициализирован');
