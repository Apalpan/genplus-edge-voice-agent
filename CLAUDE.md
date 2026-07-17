# Edge Voice Agent — reglas del proyecto (para agentes de código)

Único archivo de contexto. Léelo antes de tocar el repo.

## Objetivo
Agente de voz local para el stand de GEN+ (AI Construction Summit 2026). Corre en una
laptop Windows 11 (RTX 4060) y luego, parcialmente, en Jetson.

## Arquitectura (no la rompas)
- **Un proceso Python, módulos internos.** NO microservicios. `app/main.py` orquesta.
- Pipeline: `mic → app/stt.py (faster-whisper) → app/router.py → [app/llm.py Gemma | app/tools/*] → app/tts.py → parlantes`.
- Config única: `config.yaml`. Cada herramienta detrás de `tools.<x>.enabled`.
- Ollama es servicio propio (localhost:11434). No lo envuelvas en otro servicio.

## Restricciones críticas
- **ETABS solo en Windows** (COM, `comtypes`). Envuélvelo en try/except; ten mock.
- **El núcleo debe funcionar sin internet.** El correo es lo único online.
- **No expongas secretos** (SMTP, webhooks) en el repo. Van en `config.yaml` local / `.env`.
- **Python 3.12.** Respeta el contrato de `requirements.txt`.
- No reemplaces componentes que funcionan sin justificarlo. Antes de modificar, mapea
  los archivos afectados. Después de modificar, prueba. No afirmes que algo funciona sin probarlo.
- **Degradación elegante siempre:** si un motor/herramienta falta, responde claro, no revientes.

## Comandos
- Instalar: `instalar.bat` · Arrancar: `arrancar.bat` · Verificar: `verificar.bat`
- Manual: `python run.py` (con `.venv` activo). App en `http://127.0.0.1:3040`.

## Definition of Done
Código arranca · el flujo tocado se probó a mano · sin secretos en el repo ·
`config.yaml` sigue controlando los flags · núcleo de voz sigue vivo si apagas una herramienta.

## Orden de prioridad
1. Núcleo de voz offline (STT→LLM→TTS) sólido. 2. Demo comercial (quiz, correo, lead).
3. AEC (ETABS, norma, 3D). 4. Pesado (YOLO/EPP, Jetson). No subas de nivel si el
anterior se cae.
