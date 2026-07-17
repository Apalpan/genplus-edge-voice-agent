"""Cliente del cerebro local: Ollama + Gemma 3:4b.

Todo local, sin internet. Si Ollama no está arriba o el modelo no está,
devuelve un mensaje claro en vez de reventar (la demo nunca se queda muda).
"""
from __future__ import annotations

import httpx

from .config import CONFIG
from .persona import system_prompt

_LLM = CONFIG["llm"]
_BASE = _LLM["base_url"].rstrip("/")


def available() -> tuple[bool, str]:
    """(ok, detalle) — ¿está Ollama arriba y con el modelo descargado?"""
    try:
        r = httpx.get(f"{_BASE}/api/tags", timeout=3.0)
        r.raise_for_status()
        names = [m.get("name", "") for m in r.json().get("models", [])]
        model = _LLM["model"]
        if any(n == model or n.startswith(model.split(":")[0]) for n in names):
            return True, model
        return False, f"Ollama arriba pero falta el modelo '{model}'. Corre: ollama pull {model}"
    except Exception as e:  # noqa: BLE001
        return False, f"Ollama no responde en {_BASE} ({e.__class__.__name__}). ¿Está 'ollama serve' corriendo?"


def chat(user_text: str, history: list[dict] | None = None,
         extra_context: str | None = None) -> str:
    """Una respuesta de Gemma. history = [{'role','content'}...]."""
    messages: list[dict] = [{"role": "system", "content": system_prompt()}]
    if extra_context:
        messages.append({"role": "system", "content": f"Contexto de herramienta:\n{extra_context}"})
    messages.extend(history or [])
    messages.append({"role": "user", "content": user_text})

    payload = {
        "model": _LLM["model"],
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": _LLM.get("temperature", 0.5),
            "num_ctx": _LLM.get("num_ctx", 4096),
            "num_predict": _LLM.get("max_tokens", 320),
        },
    }
    try:
        r = httpx.post(f"{_BASE}/api/chat", json=payload, timeout=60.0)
        r.raise_for_status()
        return (r.json().get("message", {}).get("content") or "").strip()
    except Exception as e:  # noqa: BLE001
        ok, detail = available()
        if not ok:
            return f"El cerebro local no está listo. {detail}"
        return f"No pude generar la respuesta ({e.__class__.__name__})."
