"""Wartet bis PostgreSQL bereit ist. Wird vom entrypoint.sh aufgerufen."""
import sys
import time
import os
import psycopg2

host = os.environ.get("DB_HOST", "db")
port = int(os.environ.get("DB_PORT", 5432))
name = os.environ.get("DB_NAME", "safetpoll")
user = os.environ.get("DB_USER", "safetpoll_user")
pw   = os.environ.get("DB_PASSWORD", "")

for attempt in range(30):
    try:
        conn = psycopg2.connect(dbname=name, user=user, password=pw, host=host, port=port)
        conn.close()
        print(f"Datenbank bereit nach {attempt + 1} Versuch(en).")
        sys.exit(0)
    except psycopg2.OperationalError as e:
        print(f"  Versuch {attempt + 1}/30 – warte 2 Sekunden... ({e})")
        time.sleep(2)

print("FEHLER: Datenbank nicht erreichbar nach 60 Sekunden.")
sys.exit(1)
