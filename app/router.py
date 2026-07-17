"""Router de intención.

Dado el texto transcrito, decide: ¿es una HERRAMIENTA o una charla con Gemma?
Usa reglas por palabras clave (rápidas, deterministas, sin costo). Es lo correcto
para un stand: predecible y sin latencia. Si nada matchea, va a Gemma (chat).

Devuelve dict: {intent, tool, action, args}
  - intent: 'tool' | 'chat'
  - tool:   nombre de la herramienta (si intent=tool)
  - action: acción de UI sugerida para el frontend (ej. 'city_3d', 'photo')
"""
from __future__ import annotations

import re
import unicodedata

from .config import tool_enabled


def _n(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip()


# (herramienta, [patrones], acción_ui)
RULES: list[tuple[str, list[str], str | None]] = [
    ("genplus", [r"\bque es gen", r"\bquien es gen", r"\bque hace gen", r"gen\+? que es",
                 r"\bque es genplus", r"a que se dedica"], None),
    ("norma",   [r"\bnorma\b", r"e\.?030", r"e\.?060", r"\bderiva\b", r"\bsismo\b",
                 r"\bcumple\b.*\bnorma", r"zona sismica"], None),
    ("etabs",   [r"\betabs\b", r"\bedificio\b", r"analisis estructural", r"modela.*edificio"], "etabs"),
    ("quiz",    [r"\bquiz\b", r"\bjuego\b", r"\bpregunta.*\b", r"pon.*prueba", r"\bconcurso\b"], "quiz"),
    ("email",   [r"\benviar\b.*correo", r"\bcorreo\b", r"\bemail\b", r"\binforme\b.*correo",
                 r"mandame", r"enviame"], "email"),
    ("vision",  [r"deteccion en vivo", r"\bepp\b", r"\bcasco", r"\bchaleco", r"que ves",
                 r"detecta"], "vision"),
]

# Acciones puramente de UI (no herramienta de backend): efectos visuales del orbe/escena.
UI_ONLY: list[tuple[str, list[str]]] = [
    ("photo",       [r"tomar.*foto", r"tomame.*foto", r"una foto"]),
    ("city_3d",     [r"ciudad 3d", r"gemelo", r"ciudad en 3d"]),
    ("lights",      [r"prende.*luz", r"prende.*luces", r"enciende.*luz"]),
    ("color",       [r"cambia.*color", r"otro color"]),
    ("disintegrate",[r"desintegra", r"desintegrate"]),
    ("internet",    [r"usa.*internet", r"necesitas internet", r"estas conectado"]),
]


def route(text: str) -> dict:
    t = _n(text)

    for tool, patterns, action in RULES:
        if any(re.search(p, t) for p in patterns):
            if not tool_enabled(tool):
                # herramienta apagada → responde por chat explicando, sin romper
                return {"intent": "chat", "tool": None, "action": None,
                        "note": f"tool '{tool}' deshabilitada"}
            return {"intent": "tool", "tool": tool, "action": action}

    for action, patterns in UI_ONLY:
        if any(re.search(p, t) for p in patterns):
            return {"intent": "ui", "tool": None, "action": action}

    return {"intent": "chat", "tool": None, "action": None}
