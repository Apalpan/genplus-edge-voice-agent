"""Quiz IA + construcción con ranking (gancho social del stand).

Estado en memoria: pregunta actual + tabla de puntajes. El ranking se muestra
en el segundo monitor. Conecta con el "Pasaporte Summit" (sello del stand #27).
"""
from __future__ import annotations

import json
from functools import lru_cache

from ..config import data_path
from ..state import STATE

_ranking: list[dict] = []       # [{nombre, puntaje}]
_sesion: dict = {"idx": 0, "nombre": None, "puntaje": 0}


@lru_cache(maxsize=1)
def _preguntas() -> list[dict]:
    p = data_path("quiz", "preguntas.json")
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def iniciar(nombre: str | None = None) -> dict:
    _sesion.update({"idx": 0, "nombre": nombre or "Visitante", "puntaje": 0})
    qs = _preguntas()
    if not qs:
        return {"reply": "El quiz no tiene preguntas cargadas todavía.", "pregunta": None}
    return {"reply": "¡Empecemos el quiz de IA en construcción! Primera pregunta.",
            "pregunta": _publica(qs[0]), "idx": 0, "total": len(qs)}


def responder(idx: int, opcion: int) -> dict:
    qs = _preguntas()
    if idx >= len(qs):
        return {"reply": "El quiz ya terminó.", "fin": True}
    correcta = qs[idx]["correcta"]
    ok = opcion == correcta
    if ok:
        _sesion["puntaje"] += 1
    nxt = idx + 1
    if nxt >= len(qs):
        _cerrar()
        return {"reply": f"¡Terminaste! Tu puntaje: {_sesion['puntaje']} de {len(qs)}.",
                "fin": True, "puntaje": _sesion["puntaje"], "ranking": ranking()}
    return {"reply": ("¡Correcto!" if ok else "Casi. ") + " Siguiente pregunta.",
            "correcto": ok, "explicacion": qs[idx].get("explicacion", ""),
            "pregunta": _publica(qs[nxt]), "idx": nxt, "total": len(qs)}


def _cerrar() -> None:
    _ranking.append({"nombre": _sesion["nombre"], "puntaje": _sesion["puntaje"]})
    _ranking.sort(key=lambda r: r["puntaje"], reverse=True)
    STATE.log_exec("quiz", f"{_sesion['nombre']}: {_sesion['puntaje']} pts")


def ranking(top: int = 10) -> list[dict]:
    return _ranking[:top]


def _publica(q: dict) -> dict:
    return {"texto": q["texto"], "opciones": q["opciones"]}


def handle(text: str) -> dict:
    r = iniciar()
    return {"tool": "quiz", "action": "quiz", "reply": r["reply"], "meta": r}
