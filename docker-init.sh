#!/bin/bash

# Скрипт для инициализации базы данных в Docker контейнере

echo "Проверка запущенных контейнеров..."

# Проверяем, что контейнеры запущены
if ! docker ps | grep -q water_management_backend; then
    echo "❌ Ошибка: контейнер water_management_backend не запущен."
    echo "Запустите сначала: docker-compose up -d"
    exit 1
fi

echo "Ожидание готовности базы данных..."
# Ждем, пока база данных будет готова
until docker exec water_management_db pg_isready -U postgres > /dev/null 2>&1; do
    echo "Ожидание PostgreSQL..."
    sleep 2
done

echo "✅ База данных готова!"

echo "Инициализация схемы базы данных..."
docker exec water_management_backend node config/init-db.js

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при инициализации схемы"
    exit 1
fi

echo "Выполнение миграций..."
docker exec water_management_backend node config/migrate-add-phone.js

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при выполнении миграции migrate-add-phone"
    exit 1
fi

docker exec water_management_backend node config/migrate-add-line-id.js

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при выполнении миграции migrate-add-line-id"
    exit 1
fi

docker exec water_management_backend node config/migrate-add-completed-at.js

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при выполнении миграции migrate-add-completed-at"
    exit 1
fi

docker exec water_management_backend node config/migrate-pipe-material.js

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при выполнении миграции migrate-pipe-material"
    exit 1
fi

echo "Создание тестовых пользователей..."
docker exec water_management_backend node config/create-test-user.js

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при создании тестовых пользователей"
    exit 1
fi

echo "✅ Инициализация завершена!"

