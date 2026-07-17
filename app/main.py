"""Servidor del Edge Voice Agent — un solo proceso, módulos internos.

Endpoints (contrato con el frontend):
  GET  /                 → la app (web/index.html)
  GET  /api/status       → estado de motores (STT/LLM/TTS), flags y métricas
  POST /api/stt          → (audio) → {text}         (solo si stt.engine = whisper)
  POST /api/chat         → {text}  → {reply, intent, tool, action, cita, meta}
  POST /api/tts          → {text}  → audio/wav  |  {engine:'browser'}
  POST /api/action       → {action, ...} → dispara herramienta/efecto directo (botones)
  POST /api/quiz         → {op:'answer', idx, opcion} → siguiente pregunta / ranking
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from . import llm, stt, tts
from .config import CONFIG, ROOT, tool_enabled
from .router import route
from .state import STATE
from .tools import email_report, etabs, genplus, norma, quiz, vision

app = FastAPI(title=CONFIG["app"]["title"])
WEB = ROOT / "web"
app.mount("/web", StaticFiles(directory=WEB), name="web")

_TOOL_HANDLERS = {
    "genplus": genplus.handle, "norma": norma.handle, "etabs": etabs.handle,
    "quiz": quiz.handle, "email": email_report.handle, "vision": vision.handle,
}

# Frases puente mientras Gemma piensa (se dicen de inmediato con Iapetus si existe).
_history: list[dict] = []


@app.get("/")
def index() -> FileResponse:
    return FileResponse(WEB / "index.html")


@app.get("/api/status")
def status() -> JSONResponse:
    llm_ok, llm_msg = llm.available()
    stt_ok, stt_msg = stt.available()
    tts_ok, tts_msg = tts.available()
    return JSONResponse({
        "app": CONFIG["app"],
        "engines": {
            "llm":  {"ok": llm_ok, "detail": llm_msg, "model": CONFIG["llm"]["model"]},
            "stt":  {"ok": stt_ok, "detail": stt_msg, "engine": stt.engine()},
            "tts":  {"ok": tts_ok, "detail": tts_msg, "engine": CONFIG["tts"]["engine"]},
        },
        "tools": {k: tool_enabled(k) for k in _TOOL_HANDLERS},
        "agentflow": {"enabled": CONFIG["agentflow"]["enabled"],
                      "label": CONFIG["agentflow"]["label"]},
        **STATE.snapshot(),
    })


@app.post("/api/stt")
async def api_stt(audio: UploadFile = File(...)) -> JSONResponse:
    if stt.engine() != "whisper":
        return JSONResponse({"text": "", "note": f"STT en modo '{stt.engine()}'"}, status_code=200)
    suffix = Path(audio.filename or "a.webm").suffix or ".webm"
    tmp = Path(tempfile.gettempdir()) / f"genplus_in{suffix}"
    tmp.write_bytes(await audio.read())
    try:
        text = stt.transcribe(tmp)
        return JSONResponse({"text": text})
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"text": "", "error": str(e)}, status_code=500)
    finally:
        tmp.unlink(missing_ok=True)


@app.post("/api/chat")
async def api_chat(payload: dict) -> JSONResponse:
    text = (payload.get("text") or "").strip()
    if not text:
        return JSONResponse({"reply": "", "intent": "empty"})
    STATE.add_turn("user", text)

    decision = route(text)
    out: dict

    if decision["intent"] == "tool" and decision["tool"] in _TOOL_HANDLERS:
        out = _TOOL_HANDLERS[decision["tool"]](text)
        out.setdefault("intent", "tool")
    elif decision["intent"] == "ui":
        out = {"intent": "ui", "action": decision["action"],
               "reply": _UI_REPLIES.get(decision["action"], "Hecho.")}
    else:
        reply = llm.chat(text, history=_history[-6:])
        out = {"intent": "chat", "reply": reply, "action": None}

    reply = out.get("reply", "")
    if out.get("cita"):
        reply = f"{reply} (Fuente: {out['cita']})"
    if out.get("disclaimer"):
        reply = f"{reply}"  # el disclaimer se muestra en UI, no se dicta entero
    _history.append({"role": "user", "content": text})
    _history.append({"role": "assistant", "content": out.get("reply", "")})
    STATE.add_turn("agent", out.get("reply", ""))
    out["reply_display"] = reply
    return JSONResponse(out)


@app.post("/api/tts")
async def api_tts(payload: dict) -> Response:
    text = (payload.get("text") or "").strip()
    if not text:
        return JSONResponse({"engine": "off"})
    audio, mime = tts.synth(text)
    if audio is None:
        return JSONResponse({"engine": mime})   # 'browser' | 'off'
    return Response(content=audio, media_type=mime)


@app.post("/api/action")
async def api_action(payload: dict) -> JSONResponse:
    """Botones de la UI: dispara una herramienta o efecto por su nombre."""
    action = payload.get("action", "")
    if action in _TOOL_HANDLERS:
        return JSONResponse(_TOOL_HANDLERS[action](payload.get("text", action)))
    if action == "email_send":
        r = email_report.enviar(payload.get("nombre", "Visitante"),
                                payload.get("correo", ""), payload.get("empresa", ""),
                                payload.get("resumen", ""))
        return JSONResponse(r)
    # efectos de UI (foto, ciudad 3d, luces, color…): el frontend los ejecuta
    if action == "photo":
        STATE.bump("fotos")
    return JSONResponse({"action": action, "reply": _UI_REPLIES.get(action, "Hecho.")})


@app.post("/api/quiz")
async def api_quiz(payload: dict) -> JSONResponse:
    if payload.get("op") == "answer":
        return JSONResponse(quiz.responder(int(payload["idx"]), int(payload["opcion"])))
    return JSONResponse(quiz.iniciar(payload.get("nombre")))


_UI_REPLIES = {
    "photo": "¡Sonríe! Te tomé una foto para el recuerdo del stand.",
    "city_3d": "Mira nuestra ciudad en 3D: así visualizamos proyectos con gemelos digitales.",
    "lights": "Luces encendidas.",
    "color": "Cambié el color del núcleo.",
    "disintegrate": "Desintegrando… y de vuelta. Puro Edge AI.",
    "internet": "Casi todo lo que hago corre local, aquí en esta máquina, sin internet. "
                "Solo uso internet para enviarte tu informe por correo.",
}


def serve() -> None:
    import uvicorn
    uvicorn.run(app, host=CONFIG["app"]["host"], port=int(CONFIG["app"]["port"]), log_level="info")
