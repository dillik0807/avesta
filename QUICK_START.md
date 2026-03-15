# 🚀 Быстрый старт

## Ваша база данных уже создана на Railway!

**DATABASE_URL:** `postgresql://postgres:ZLnohOUbenSgQTFUdbQbbGfNHOWCGPTz@switchyard.proxy.rlwy.net:15057/railway`

## Шаг 1: Установка зависимостей

```bash
cd postgres-version/backend
npm install
```

## Шаг 2: Инициализация базы данных

```bash
npm run init-db
```

Это создаст все таблицы и администратора:
- **Логин:** admin
- **Пароль:** admin123

## Шаг 3: Запуск сервера

```bash
npm start
```

Сервер запустится на http://localhost:3000

## Шаг 4: Открытие фронтенда

Откройте в браузере:
```
postgres-version/frontend/index.html
```

Или запустите простой HTTP сервер:
```bash
cd postgres-version/frontend
npx http-server -p 8080
```

Затем откройте: http://localhost:8080

## Шаг 5: Вход в систему

1. Откройте приложение
2. Введите:
   - Логин: `admin`
   - Пароль: `admin123`
3. ✅ Готово!

## Миграция данных из Firebase (опционально)

Если у вас есть данные в Firebase:

1. Экспортируйте данные из Firebase Console (Export JSON)
2. Сохраните как `firebase-export.json` в корне проекта
3. Запустите:
```bash
cd backend
node scripts/migrate-from-firebase.js
```

## Проверка подключения к базе данных

```bash
cd backend
node -e "require('./db').query('SELECT NOW()').then(r => console.log('✅ Подключение успешно:', r.rows[0]))"
```

## Деплой на Railway

### Вариант 1: Через Railway CLI

```bash
# Установка CLI
npm install -g @railway/cli

# Вход
railway login

# Линк к проекту
railway link

# Деплой
railway up
```

### Вариант 2: Через GitHub

1. Загрузите проект на GitHub
2. В Railway: New → GitHub Repo
3. Выберите репозиторий
4. Настройте переменные окружения:
   - `DATABASE_URL` (уже есть)
   - `JWT_SECRET` (скопируйте из .env)
   - `NODE_ENV=production`
   - `CORS_ORIGINS=https://ваш-домен.railway.app`

## Структура проекта

```
postgres-version/
├── backend/              # Node.js сервер
│   ├── server.js        # Главный файл
│   ├── db.js            # PostgreSQL
│   ├── routes/          # API маршруты
│   ├── scripts/         # Утилиты
│   └── .env             # Конфигурация (уже настроен!)
├── frontend/            # Клиент
│   ├── index.html       # Главная страница
│   └── js/api.js        # API клиент
└── database/
    └── schema.sql       # Схема БД
```

## API Endpoints

После запуска сервера доступны:

- `POST /api/auth/login` - Вход
- `GET /api/data/:year` - Получить данные
- `POST /api/income` - Добавить приход
- `POST /api/expense` - Добавить расход
- `POST /api/payments` - Добавить погашение
- `GET /api/management/dictionaries` - Справочники

## Troubleshooting

### Ошибка подключения к БД
```bash
# Проверьте DATABASE_URL в .env
cat backend/.env | grep DATABASE_URL
```

### Порт уже занят
```bash
# Измените PORT в .env
echo "PORT=3001" >> backend/.env
```

### CORS ошибки
Обновите `CORS_ORIGINS` в `.env`, добавив ваш фронтенд URL

## Полезные команды

```bash
# Просмотр логов (если запущено через Railway)
railway logs

# Подключение к БД
railway connect postgres

# Бэкап базы данных
pg_dump "postgresql://postgres:ZLnohOUbenSgQTFUdbQbbGfNHOWCGPTz@switchyard.proxy.rlwy.net:15057/railway" > backup.sql

# Восстановление
psql "postgresql://postgres:ZLnohOUbenSgQTFUdbQbbGfNHOWCGPTz@switchyard.proxy.rlwy.net:15057/railway" < backup.sql
```

## Следующие шаги

1. ✅ Смените пароль администратора
2. ✅ Добавьте пользователей
3. ✅ Настройте справочники (фирмы, склады, товары)
4. ✅ Начните работу!

## Поддержка

- 📖 Полная документация: `DEPLOYMENT.md`
- 🔄 Миграция данных: `MIGRATION_GUIDE.md`
- 📝 README: `README.md`
