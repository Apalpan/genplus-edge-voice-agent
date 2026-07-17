@echo off
REM  Chequeo rapido de que todo este listo antes del evento.
setlocal
cd /d "%~dp0"

echo === Python 3.12 ===
py -3.12 --version 2>nul || echo   [FALTA] Python 3.12

echo === Entorno virtual ===
if exist ".venv\Scripts\python.exe" (echo   OK .venv) else (echo   [FALTA] corre instalar.bat)

echo === Ollama + modelo ===
where ollama >nul 2>&1 && (ollama list) || echo   [FALTA] Ollama

echo === GPU NVIDIA ===
where nvidia-smi >nul 2>&1 && (nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader) || echo   [AVISO] sin nvidia-smi

echo === Edge (para PDF de informes) ===
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (echo   OK Edge) else (echo   [AVISO] Edge no encontrado)

echo.
echo Si todo dice OK, corre arrancar.bat
pause
