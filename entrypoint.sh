#!/bin/sh
set -e

echo "==> Warte auf Datenbank..."
python /app/wait_for_db.py

echo "==> Migrationen ausfuehren..."
python manage.py migrate --noinput

echo "==> Statische Dateien sammeln..."
python manage.py collectstatic --noinput --clear

echo "==> Starte Server (Daphne)..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
