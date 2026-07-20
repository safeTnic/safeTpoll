FROM python:3.12-slim

WORKDIR /app

# System-Abhängigkeiten (libpq für psycopg2, gcc für Builds)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Venv erstellen und als Standard-Python setzen
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Abhängigkeiten zuerst installieren (Layer-Cache-Optimierung)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Projektdateien kopieren
COPY . .

# Media- und Staticfiles-Verzeichnisse anlegen
RUN mkdir -p media staticfiles

# Windows-Zeilenenden (CRLF) entfernen und Entrypoint ausfuehrbar machen
RUN sed -i 's/\r$//' entrypoint.sh wait_for_db.py && chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
