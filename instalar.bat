@echo off
REM ═══════════════════════════════════════════════════════════════════════
REM  GEN+ Edge Voice Agent — instalar (una sola vez)
REM  Requiere: Python 3.12 (64-bit) con "Add to PATH", y Ollama instalado.
REM ═══════════════════════════════════════════════════════════════════════
setlocal
cd /d "%~dp0"

echo.
echo === [1/4] Verificando Python 3.12 ===
py -3.12 --version >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] No se encontro Python 3.12.
  echo   Instala Python 3.12 (64-bit) desde https://www.python.org/downloads/windows/
  echo   y marca "Add Python to PATH". NO uses 3.13.
  pause
  exit /b 1
)
py -3.12 --version

echo.
echo === [2/4] Creando entorno virtual .venv ===
if not exist ".venv" (
  py -3.12 -m venv .venv
)
call .venv\Scripts\activate.bat

echo.
echo === [3/4] Instalando librerias de Python ===
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo === [4/4] Descargando el modelo Gemma (si falta) ===
where ollama >nul 2>&1
if errorlevel 1 (
  echo   [AVISO] Ollama no esta en el PATH. Instalalo desde https://ollama.com/download/windows
) else (
  ollama pull gemma3:4b
)

echo.
echo === LISTO. Ahora ejecuta: arrancar.bat ===
pause
