# 🚀 Инструкция по деплою на Railway

## Шаг 1: Подготовка проекта

1. Убедитесь, что у вас установлен Node.js (версия 18+)
2. Клонируйте проект или скопируйте папку `postgres-version`

## Шаг 2: Регистрация на Railway

1. Перейдите на https://railway.com/
2. Нажмите "Start a New Project"
3. Войдите через GitHub (рекомендуется)

## Шаг 3: Создание PostgreSQL базы данных

1. В Railway нажмите "+ New"
2. Выберите "Database" → "PostgreSQL"
3. Дождитесь создания базы данных
4. Перейдите в настройки PostgreSQL
5. Скопируйте "DATABASE_URL" из раздела "Connect"

Пример DATABASE_URL:
```
postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
```

## Шаг 4: Инициализация базы данных

### Вариант A: Через Railway CLI (рекомендуется)

1. Установите Railway CLI:
```bash
npm install -g @railway/cli
```

2. Войдите в аккаунт:
```bash
railway login
```

3. Подключитесь к проекту:
```bash
railway link
```

4. Выполните инициализацию:
```bash
cd backend
railway run node scripts/init-db.js
```

### Вариант B: Через pgAdmin или psql

1. Установите pgAdmin или psql
2. Подключитесь к базе данных используя DATABASE_URL
3. Выполните SQL из файла `database/schema.sql`

## Шаг 5: Деплой бэкенда

1. В Railway нажмите "+ New" → "GitHub Repo"
2. Выберите ваш репозиторий
3. Railway автоматически определит Node.js проект

4. Настройте переменные окружения:
   - Перейдите в "Variables"
   - Добавьте следующие переменные:

```
DATABASE_URL=<ваш DATABASE_URL из шага 3>
JWT_SECRET=<случайная строка, например: my-super-secret-jwt-key-2024>
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://ваш-домен.railway.app
```

5. Настройте Root Directory:
   - В настройках проекта найдите "Root Directory"
   - Установите: `postgres-version/backend`

6. Railway автоматически запустит деплой

## Шаг 6: Деплой фронтенда

### Вариант A: Статический хостинг на Railway

1. Создайте новый сервис в Railway
2. Выберите "Empty Service"
3. Настройте переменные:
```
BACKEND_URL=https://ваш-backend.railway.app
```

4. Добавьте Dockerfile в `postgres-version/frontend`:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Вариант B: Vercel (рекомендуется для фронтенда)

1. Установите Vercel CLI:
```bash
npm install -g vercel
```

2. Деплой:
```bash
cd frontend
vercel
```

3. Настройте переменную окружения:
```
VITE_API_URL=https://ваш-backend.railway.app
```

## Шаг 7: Настройка CORS

В Railway откройте настройки бэкенда и обновите `CORS_ORIGINS`:
```
CORS_ORIGINS=https://ваш-frontend.vercel.app,https://ваш-frontend.railway.app
```

## Шаг 8: Проверка работы

1. Откройте ваш фронтенд URL
2. Войдите с учетными данными:
   - Логин: `admin`
   - Пароль: `admin123`

3. ⚠️ ВАЖНО: Сразу смените пароль администратора!

## Шаг 9: Настройка домена (опционально)

1. В Railway перейдите в "Settings" → "Domains"
2. Добавьте свой домен
3. Настройте DNS записи согласно инструкциям Railway

## Мониторинг и логи

### Просмотр логов:
```bash
railway logs
```

### Мониторинг базы данных:
1. В Railway откройте PostgreSQL сервис
2. Перейдите в "Metrics"
3. Отслеживайте использование CPU, памяти и соединений

## Резервное копирование

### Автоматическое (Railway):
Railway автоматически создает бэкапы PostgreSQL

### Ручное:
```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

### Восстановление:
```bash
railway run psql $DATABASE_URL < backup.sql
```

## Масштабирование

1. В Railway перейдите в "Settings"
2. Увеличьте ресурсы в разделе "Resources"
3. Настройте автоскейлинг при необходимости

## Troubleshooting

### Ошибка подключения к БД:
- Проверьте DATABASE_URL
- Убедитесь, что база данных запущена
- Проверьте логи: `railway logs`

### 502 Bad Gateway:
- Проверьте, что бэкенд запущен
- Проверьте PORT в переменных окружения
- Проверьте логи приложения

### CORS ошибки:
- Обновите CORS_ORIGINS
- Убедитесь, что фронтенд использует правильный API URL

## Полезные команды

```bash
# Подключение к базе данных
railway connect postgres

# Выполнение команды в контейнере
railway run <команда>

# Просмотр переменных окружения
railway variables

# Перезапуск сервиса
railway restart
```

## Стоимость

Railway предоставляет:
- $5 бесплатных кредитов в месяц
- PostgreSQL: ~$5/месяц
- Backend сервис: ~$5/месяц

Итого: ~$10/месяц (первый месяц бесплатно)

## Поддержка

- Railway документация: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- GitHub Issues: создайте issue в вашем репозитории
