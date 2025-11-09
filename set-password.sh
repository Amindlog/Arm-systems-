#!/bin/bash
# Скрипт для установки пароля пользователя postgres
# Требует sudo прав

echo "Установка пароля для пользователя postgres..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

if [ $? -eq 0 ]; then
    echo "✓ Пароль успешно установлен"
else
    echo "✗ Ошибка при установке пароля"
    exit 1
fi

