# Genie · asistente inteligente de GEN+

**Demo pública:** https://apalpan.github.io/genplus-edge-voice-agent/stand/

Genie, pronunciado **Yeny**, es el asistente de voz de GEN+ para demostraciones comerciales. La página pública reproduce de forma segura el flujo del producto y permite probar conversación, AgentFlow, acciones de PC, ingeniería y productos del ecosistema.

## Arquitectura real

```text
Micrófono → Whisper CUDA → Router → Gemma 4 / acción autorizada → Piper Daniela
                                      ↓
                                AgentFlow cuando aplica
```

El runtime completo corre en la computadora autorizada del stand. La página pública no recibe control sobre la PC, no ejecuta modelos locales ni usa credenciales reales; esas acciones se muestran como una simulación comercial explícita.

## Alcance del repositorio

- `stand/`: showcase comercial estático desplegado con GitHub Pages.
- `stand/static/showcase.js`: contrato simulado de eventos y voz del navegador.
- `stand/static/`: orbe, fuentes, mundos 3D y recursos visuales.
- `/`: redirección a la experiencia canónica de Genie.

El runtime Windows, los modelos, la voz Piper, instaladores, preflight y pruebas se mantienen en el repositorio privado de operación.
