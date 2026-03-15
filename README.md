# Система учёта товаров - PostgreSQL версия

## ✅ ГОТОВО К ЗАПУСКУ!

Ваша база данных PostgreSQL уже создана на Railway и настроена.

## 🚀 Быстрый старт (3 команды)

```bash
# 1. Установка зависимостей
cd postgres-version/backend && npm install

# 2. Инициализация базы данных
npm run init-db

# 3. Запуск сервера
npm start
```

Откройте `postgres-version/frontend/index.html` в браузере.

**Логин:** admin  
**Пароль:** admin123

📖 **Подробная инструкция:** `QUICK_START.md`

---

## Описание
Полная миграция системы учёта товаров с Firebase на PostgreSQL (Railway).

## Технологии
- **Frontend**: HTML, CSS (Tailwind), JavaScript
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Railway)
- **Deployment**: Railway

## Структура проекта
```
postgres-version/
├── backend/              # Node.js сервер
│   ├── server.js        # Главный файл сервера
│   ├── db.js            # Подключение к PostgreSQL
│   ├── routes/          # API маршруты
│   └── package.json     # Зависимости
├── frontend/            # Клиентская часть
│   ├── index.html       # Главная страница
│   ├── js/              # JavaScript файлы
│   └── assets/          # Статические файлы
└── database/            # SQL схемы
    └── schema.sql       # Структура БД
```

## Установка

### 1. Создание базы данных на Railway
1. Зарегистрируйтесь на https://railway.com/
2. Создайте новый проект
3. Добавьте PostgreSQL сервис
4. Скопируйте DATABASE_URL

### 2. Настройка бэкенда
```bash
cd backend
npm install
```

Создайте файл `.env`:
```
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
NODE_ENV=production
```

### 3. Инициализация базы данных
```bash
npm run init-db
```

### 4. Запуск
```bash
npm start
```

## Деплой на Railway

1. Установите Railway CLI:
```bash
npm install -g @railway/cli
```

2. Войдите в аккаунт:
```bash
railway login
```

3. Инициализируйте проект:
```bash
railway init
```

4. Деплой:
```bash
railway up
```

## API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход

### Данные
- `GET /api/data` - Получить все данные
- `POST /api/data/sync` - Синхронизация данных
- `PUT /api/data/update` - Обновить данные

### Приход
- `GET /api/income` - Список прихода
- `POST /api/income` - Добавить приход
- `PUT /api/income/:id` - Обновить приход
- `DELETE /api/income/:id` - Удалить приход

### Расход
- `GET /api/expense` - Список расхода
- `POST /api/expense` - Добавить расход
- `PUT /api/expense/:id` - Обновить расход
- `DELETE /api/expense/:id` - Удалить расход

### Погашения
- `GET /api/payments` - Список погашений
- `POST /api/payments` - Добавить погашение
- `PUT /api/payments/:id` - Обновить погашение
- `DELETE /api/payments/:id` - Удалить погашение

## Миграция данных

Для миграции данных из Firebase:
```bash
npm run migrate-from-firebase
```

## Отличия от Firebase версии

1. **База данных**: PostgreSQL вместо Firebase Realtime Database
2. **Синхронизация**: REST API вместо WebSocket
3. **Аутентификация**: JWT токены вместо Firebase Auth
4. **Хранение**: Реляционная БД вместо NoSQL
5. **Офлайн режим**: IndexedDB + периодическая синхронизация

## Преимущества PostgreSQL версии

✅ Полный контроль над данными
✅ Реляционная структура данных
✅ Мощные SQL запросы
✅ Транзакции и целостность данных
✅ Бесплатный хостинг на Railway
✅ Масштабируемость
✅ Резервное копирование
