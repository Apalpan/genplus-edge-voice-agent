@echo off
REM ═══════════════════════════════════════════════════════════════════════
REM  GEN+ Edge Voice Agent — arrancar el stand
REM ═══════════════════════════════════════════════════════════════════════
setlocal
cd /d "%~dp0"

echo === Asegurando que Ollama este arriba ===
where ollama >nul 2>&1
if not errorlevel 1 (
  start "" /b ollama serve
  timeout /t 2 >nul
  REM Precarga el modelo en la GPU (respuestas rapidas desde el primer turno)
  start "" /b ollama run gemma3:4b ""
)

echo === Activando entorno e iniciando la plataforma ===
call .venv\Scripts\activate.bat
echo.
echo   Abre en el navegador:  http://127.0.0.1:3040
echo   (Ctrl+C para detener)
echo.
python run.py
