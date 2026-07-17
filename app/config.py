"""Carga y valida config.yaml. Fuente única de verdad para todo el sistema."""
from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent      # D:/AP/edge-voice-agent
CONFIG_PATH = ROOT / "config.yaml"

# Valores por defecto: si config.yaml está incompleto, el sistema igual arranca.
_DEFAULTS: dict[str, Any] = {
    "app": {"host": "127.0.0.1", "port": 3040,
            "title": "GEN+ EDGE AI · Agente de Voz", "subtitle": "Edge AI · construcción"},
    "llm": {"provider": "ollama", "base_url": "http://127.0.0.1:11434",
            "model": "gemma3:4b", "temperature": 0.5, "num_ctx": 4096, "max_tokens": 320},
    "stt": {"engine": "browser", "model": "small", "device": "cuda",
            "compute_type": "int8_float16", "language": "es"},
    "tts": {"engine": "auto", "voice": "iapetus", "iapetus_dir": "data/voces/iapetus",
            "piper_exe": "", "piper_model": ""},
    "tools": {
        "genplus": {"enabled": True},
        "norma": {"enabled": True, "disclaimer": ""},
        "quiz": {"enabled": True},
        "etabs": {"enabled": False},
        "email": {"enabled": False, "destino_default": ""},
        "vision": {"enabled": False, "service_url": ""},
    },
    "agentflow": {"enabled": False, "webhook_url": "", "label": "gen-flows"},
}


def _deep_merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load() -> dict[str, Any]:
    raw: dict = {}
    if CONFIG_PATH.exists():
        try:
            raw = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8")) or {}
        except yaml.YAMLError as e:
            print(f"[config] config.yaml tiene un error de formato, uso valores por defecto: {e}")
            raw = {}
    return _deep_merge(_DEFAULTS, raw)


CONFIG: dict[str, Any] = load()


def tool_enabled(name: str) -> bool:
    return bool(CONFIG.get("tools", {}).get(name, {}).get("enabled", False))


def data_path(*parts: str) -> Path:
    return ROOT.joinpath("data", *parts)
