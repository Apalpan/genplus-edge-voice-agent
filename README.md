# GEN+ · Edge Voice Agent

**🌐 Vista previa web (modo demo):** https://apalpan.github.io/genplus-edge-voice-agent/
*(la misma interfaz; sin backend simula el agente con la voz del navegador — el sistema
completo corre offline en el equipo del stand)*

Agente de voz **Edge AI** para el stand de GEN+ en el AI Construction Summit 2026.
El visitante habla → **faster-whisper** transcribe → **Gemma 3:4b** (Ollama) responde
→ **Piper/Iapetus** habla. Todo **local y offline** (salvo el correo). Un solo comando.

```
MIC → Whisper (CUDA) → Router de intención → [ Gemma | Herramienta ] → TTS → Parlantes
```

## Arranque rápido (Windows 11 + RTX)
```powershell
ollama pull gemma3:4b        # descarga el modelo (una vez)
.\instalar.bat               # crea .venv (Python 3.12) e instala librerías
.\arrancar.bat               # inicia Ollama + la app  →  http://127.0.0.1:3040
```
Guía detallada y niveles de instalación: ver el dossier en
`D:\AP\AP_Knowledge_OS\AI Summit GEN+\03-INSTALACION-PASO-A-PASO.md`.

## Principios
- **Un proceso, módulos — no microservicios.** Menos piezas móviles = menos fallos en vivo.
- **Núcleo de voz offline primero.** Cada herramienta detrás de un flag en `config.yaml`.
- **Degradación elegante.** Si falta Whisper/Piper/ETABS/internet, el sistema sigue vivo.

## Estructura
```
config.yaml         # ← todo se controla aquí (flags, modelos, voces)
run.py              # python run.py  →  arranca el servidor
app/                # main (FastAPI) · llm · stt · tts · router · state · persona
app/tools/          # norma · etabs · email_report · quiz · vision · genplus
data/               # genplus_kb.md · norma/tablas_e030.json · quiz · voces/
web/                # index.html · styles.css · app.js  (UI HUD azul GEN+)
```

## Endpoints
`GET /` · `GET /api/status` · `POST /api/stt` · `POST /api/chat` · `POST /api/tts` ·
`POST /api/action` · `POST /api/quiz`.

## Estado
MVP funcional del núcleo de voz + UI + herramientas base. Pendientes en
`…\AI Summit GEN+\04-QUE-TE-FALTA.md`. ETABS real, visión EPP y despliegue Jetson
son fases posteriores.

*GEN+ · Edge AI para construcción · AECODE forma, GEN+ implementa.*
