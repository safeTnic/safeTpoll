#Requires -Version 5.1
<#
.SYNOPSIS
    safeTpoll - Ersteinrichtung & Docker-Setup

.DESCRIPTION
    Richtet die safeTpoll-Anwendung ein:
    - Erstellt .env aus .env.example (mit zufaelligem SECRET_KEY)
    - Baut den Docker-Container
    - Startet PostgreSQL, Redis und die App
    - Fuehrt Datenbankmigrationen aus
    - Legt optional einen Superuser an

.PARAMETER Reset
    Loescht alle Docker-Volumes (Datenbank, Media) und startet neu.

.PARAMETER DevVenv
    Richtet zusaetzlich ein lokales Python-venv fuer Entwicklung ein.

.PARAMETER Stop
    Stoppt alle laufenden Container.

.PARAMETER Logs
    Zeigt Live-Logs der App.

.EXAMPLE
    .\setup.ps1
    .\setup.ps1 -DevVenv
    .\setup.ps1 -Reset
    .\setup.ps1 -Stop
    .\setup.ps1 -Logs
#>

param(
    [switch]$Reset,
    [switch]$DevVenv,
    [switch]$Stop,
    [switch]$Logs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================
# Hilfsfunktionen
# ============================================================

function Write-Step([string]$msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "    [OK] $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "    [!]  $msg" -ForegroundColor Yellow
}

function Write-Err([string]$msg) {
    Write-Host "    [X]  $msg" -ForegroundColor Red
}

function New-SecretKey {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(-_=+)'
    $rng   = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = [byte[]]::new(64)
    $rng.GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Assert-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Err 'Docker nicht gefunden. Bitte Docker Desktop installieren.'
        Write-Host '    https://www.docker.com/products/docker-desktop/' -ForegroundColor Gray
        exit 1
    }
    try { docker info 2>&1 | Out-Null }
    catch {
        Write-Err 'Docker laeuft nicht. Bitte Docker Desktop starten.'
        exit 1
    }
    Write-OK 'Docker verfuegbar'
}

function Assert-Python {
    $py = Get-Command python  -ErrorAction SilentlyContinue
    if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
    if (-not $py) {
        Write-Err 'Python nicht gefunden. Fuer --DevVenv wird Python 3.11+ benoetigt.'
        exit 1
    }
    $ver = & $py.Source --version 2>&1
    Write-OK "Python: $ver"
    return $py.Source
}

# ============================================================
# Banner
# ============================================================

Write-Host ''
Write-Host '  +-------------------------------------------------+' -ForegroundColor Red
Write-Host '  |   safeTrail  -  safeTpoll  -  Setup & Docker   |' -ForegroundColor Red
Write-Host '  +-------------------------------------------------+' -ForegroundColor Red
Write-Host ''

$ScriptDir = $PSScriptRoot

# ============================================================
# --Stop
# ============================================================

if ($Stop) {
    Write-Step 'Stoppe Container...'
    Push-Location $ScriptDir
    docker compose down
    Pop-Location
    Write-OK 'Alle Container gestoppt.'
    exit 0
}

# ============================================================
# --Logs
# ============================================================

if ($Logs) {
    Write-Step 'Live-Logs der App (Strg+C zum Beenden)...'
    Push-Location $ScriptDir
    docker compose logs -f app
    Pop-Location
    exit 0
}

# ============================================================
# --Reset: Volumes loeschen
# ============================================================

if ($Reset) {
    Write-Warn 'ACHTUNG: Alle Daten (Datenbank, Mediendateien) werden geloescht!'
    $confirm = Read-Host '  Wirklich fortfahren? (ja/nein)'
    if ($confirm -ne 'ja') {
        Write-Host '  Abgebrochen.' -ForegroundColor Yellow
        exit 0
    }
    Write-Step 'Stoppe Container und loesche Volumes...'
    Push-Location $ScriptDir
    docker compose down -v --remove-orphans
    Pop-Location
    Write-OK 'Volumes geloescht. Fahre mit Neueinrichtung fort...'
}

# ============================================================
# Docker pruefen
# ============================================================

Write-Step 'Pruefe Voraussetzungen...'
Assert-Docker

# ============================================================
# .env erstellen
# ============================================================

Write-Step 'Konfigurationsdatei (.env)...'

$envFile    = Join-Path $ScriptDir '.env'
$envExample = Join-Path $ScriptDir '.env.example'

if (Test-Path $envFile) {
    Write-OK '.env existiert bereits - wird nicht ueberschrieben.'
}
else {
    if (-not (Test-Path $envExample)) {
        Write-Err '.env.example nicht gefunden. Bitte Projekt vollstaendig klonen.'
        exit 1
    }

    Write-Host ''
    Write-Host '  Bitte ein sicheres Datenbankpasswort eingeben:' -ForegroundColor White
    $dbPw1 = Read-Host '    Passwort' -AsSecureString
    $dbPw2 = Read-Host '    Passwort bestaetigen' -AsSecureString

    $bstr1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPw1)
    $bstr2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPw2)
    $pw1   = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr1)
    $pw2   = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr1)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)

    if ($pw1 -ne $pw2) {
        Write-Err 'Passwoerter stimmen nicht ueberein.'
        exit 1
    }
    if ($pw1.Length -lt 12) {
        Write-Err 'Passwort muss mindestens 12 Zeichen lang sein.'
        exit 1
    }

    $secretKey = New-SecretKey
    Write-OK 'SECRET_KEY generiert (64 Zeichen)'

    $envContent = Get-Content $envExample -Raw -Encoding UTF8
    $envContent = $envContent -replace 'AENDERN-langer-zufaelliger-string-min-50-zeichen', $secretKey
    $envContent = $envContent -replace 'AENDERN-sicheres-passwort', $pw1

    [System.IO.File]::WriteAllText($envFile, $envContent, [System.Text.Encoding]::UTF8)
    Write-OK '.env erstellt'

    Write-Host ''
    Write-Warn 'Die Datei .env enthaelt Secrets - niemals in Git committen!'
}

# ============================================================
# --DevVenv: Lokales Python-venv fuer Entwicklung
# ============================================================

if ($DevVenv) {
    Write-Step 'Lokales Python-venv fuer Entwicklung einrichten...'
    $pythonExe = Assert-Python

    $venvDir = Join-Path $ScriptDir 'venv'
    if (Test-Path $venvDir) {
        Write-OK "venv existiert bereits ($venvDir)"
    }
    else {
        Write-Host '    Erstelle venv...'
        & $pythonExe -m venv $venvDir
        Write-OK 'venv erstellt'
    }

    $pip = Join-Path $venvDir 'Scripts\pip.exe'
    Write-Host '    Installiere Abhaengigkeiten...'
    & $pip install --quiet --upgrade pip
    & $pip install --quiet -r (Join-Path $ScriptDir 'requirements.txt')
    Write-OK 'Pakete installiert'

    $activate = Join-Path $venvDir 'Scripts\Activate.ps1'
    Write-Host ''
    Write-Host '  venv aktivieren:' -ForegroundColor White
    Write-Host "    . $activate" -ForegroundColor Gray
    Write-Host '  Lokalen Server starten (nach Aktivierung):' -ForegroundColor White
    Write-Host '    daphne config.asgi:application' -ForegroundColor Gray
}

# ============================================================
# Docker-Image bauen
# ============================================================

Write-Step 'Docker-Image bauen...'
Push-Location $ScriptDir

Write-Host '    (Kann beim ersten Mal einige Minuten dauern...)' -ForegroundColor Gray
docker compose build

Write-OK 'Image gebaut'

# ============================================================
# Container starten
# ============================================================

Write-Step 'Container starten (db, redis, app)...'
docker compose up -d

Write-OK 'Container gestartet'

# ============================================================
# Warten bis App bereit ist
# ============================================================

Write-Step 'Warte bis die App gestartet ist...'
$maxWait = 60
$waited  = 0
$appPort = '8000'

$envContent = Get-Content $envFile -Raw -Encoding UTF8
if ($envContent -match 'APP_PORT=(\d+)') { $appPort = $Matches[1] }

do {
    Start-Sleep -Seconds 2
    $waited += 2
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$appPort/login/" `
            -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { break }
    }
    catch { }
    Write-Host "    Warte... ($waited/$maxWait s)" -ForegroundColor Gray
} while ($waited -lt $maxWait)

if ($waited -ge $maxWait) {
    Write-Warn 'App antwortet noch nicht. Logs pruefen: docker compose logs app'
}
else {
    Write-OK 'App ist bereit!'
}

# ============================================================
# Superuser anlegen
# ============================================================

Write-Step 'Superuser einrichten...'
Write-Host ''
$createUser = Read-Host '  Admin-Benutzer jetzt anlegen? (ja/nein)'

if ($createUser -eq 'ja') {
    Write-Host '    Interaktive Shell im Container wird geoeffnet...' -ForegroundColor Gray
    docker compose exec app python manage.py createsuperuser
}

Pop-Location

# ============================================================
# Fertig
# ============================================================

Write-Host ''
Write-Host '  ============================================' -ForegroundColor Green
Write-Host '   safeTpoll ist bereit!' -ForegroundColor Green
Write-Host '  ============================================' -ForegroundColor Green
Write-Host ''
Write-Host "  App:      http://localhost:$appPort/" -ForegroundColor White
Write-Host "  Login:    http://localhost:$appPort/login/" -ForegroundColor White
Write-Host "  Admin:    http://localhost:$appPort/admin/" -ForegroundColor White
Write-Host ''
Write-Host '  Nuetzliche Befehle:' -ForegroundColor Gray
Write-Host '    Logs:           .\setup.ps1 -Logs' -ForegroundColor Gray
Write-Host '    Stoppen:        .\setup.ps1 -Stop' -ForegroundColor Gray
Write-Host '    Neustart:       docker compose restart app' -ForegroundColor Gray
Write-Host '    Shell:          docker compose exec app bash' -ForegroundColor Gray
Write-Host '    Zuruecksetzen:  .\setup.ps1 -Reset' -ForegroundColor Gray
Write-Host ''
