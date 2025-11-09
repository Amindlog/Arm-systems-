#!/bin/bash

# Скрипт для настройки PostgreSQL для приложения

echo "=== Настройка PostgreSQL для системы управления водоотведением ==="
echo ""

# Проверка, установлен ли PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL не установлен. Установка..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo "✓ PostgreSQL установлен"
else
    echo "✓ PostgreSQL уже установлен"
fi

# Проверка, запущен ли PostgreSQL
if sudo systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL запущен"
else
    echo "Запуск PostgreSQL..."
    sudo systemctl start postgresql
    echo "✓ PostgreSQL запущен"
fi

# Создание базы данных
echo ""
echo "Создание базы данных..."
sudo -u postgres psql -c "CREATE DATABASE water_management;" 2>/dev/null || echo "База данных уже существует"
echo "✓ База данных water_management создана"

# Установка пароля для пользователя postgres (если нужно)
echo ""
echo "Настройка пользователя postgres..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
echo "✓ Пароль пользователя postgres установлен"

# Создание файла .env если его нет
if [ ! -f backend/.env ]; then
    echo ""
    echo "Создание файла .env..."
    cp backend/env.example backend/.env
    echo "✓ Файл backend/.env создан"
    echo "  Проверьте настройки в backend/.env"
else
    echo "✓ Файл backend/.env уже существует"
fi

echo ""
echo "=== Настройка завершена ==="
echo ""
echo "Следующие шаги:"
echo "1. Проверьте настройки в backend/.env"
echo "2. Инициализируйте схему БД: cd backend && node config/init-db.js"
echo "3. Создайте тестовых пользователей: cd backend && node config/create-test-user.js"
echo "4. Запустите backend: cd backend && npm run dev"

