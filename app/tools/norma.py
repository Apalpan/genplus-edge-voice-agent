"""Copiloto de la norma peruana E.030 (sismo).

Separa DOS preguntas distintas (patrón del vault):
  - "Consultar la norma"  → recuperación de texto (keyword) → cita el artículo.
  - "¿Cumple la norma?"   → chequeo de UMBRAL determinista (no es RAG).

Los datos viven en data/norma/tablas_e030.json. Son de REFERENCIA para demo;
llevan disclaimer. Para producción hay que ingerir los PDFs oficiales.
"""
from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache

from ..config import CONFIG, data_path

_DISCLAIMER = CONFIG["tools"]["norma"].get(
    "disclaimer", "Referencial; no reemplaza al ingeniero estructural colegiado."
)


def _n(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


@lru_cache(maxsize=1)
def _tablas() -> dict:
    p = data_path("norma", "tablas_e030.json")
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def _find_number(text: str) -> float | None:
    m = re.search(r"(\d+(?:[.,]\d+)?)", text.replace(",", "."))
    return float(m.group(1)) if m else None


def consultar(query: str) -> dict:
    """Recuperación keyword sobre el corpus + tablas. Devuelve respuesta + cita."""
    t = _n(query)
    corpus = _tablas().get("corpus_consulta", [])
    best, best_score = None, 0
    for item in corpus:
        hay = _n(item["tema"] + " " + item["texto"])
        score = sum(1 for w in set(t.split()) if len(w) > 3 and w in hay)
        if score > best_score:
            best, best_score = item, score
    if not best:
        return {"reply": "No tengo ese punto de la norma en mi índice de demostración. "
                          "Puedo enviarte la referencia oficial por correo.",
                "cita": None, "disclaimer": _DISCLAIMER}
    return {
        "reply": best["texto"],
        "cita": f"E.030 · {best['articulo']}",
        "disclaimer": _DISCLAIMER,
    }


def cumple_deriva(valor: float, material: str = "concreto armado") -> dict:
    """¿La deriva 'valor' cumple para el material? Chequeo determinista."""
    limites = _tablas().get("deriva_maxima", {}).get("por_material", {})
    mat = _n(material)
    limite = None
    for k, v in limites.items():
        if _n(k) == mat or mat in _n(k):
            limite = v
            break
    if limite is None:
        limite = limites.get("concreto armado", 0.007)
        material = "concreto armado"
    cumple = valor <= limite
    verdict = "CUMPLE" if cumple else "NO CUMPLE"
    return {
        "reply": f"La deriva de {valor:g} {'está dentro del' if cumple else 'excede el'} "
                 f"límite de {limite:g} para {material}. {verdict}.",
        "cita": "E.030 · Tabla N°11 (límites de distorsión de entrepiso)",
        "cumple": cumple, "limite": limite, "disclaimer": _DISCLAIMER,
    }


def handle(text: str) -> dict:
    """Punto de entrada desde el router. Decide consultar vs. cumplimiento."""
    t = _n(text)
    # ¿Es una verificación de deriva? ("mi deriva de 0.009 cumple")
    if "deriva" in t and ("cumple" in t or _find_number(t) is not None):
        val = _find_number(t)
        if val is not None:
            mat = "acero" if "acero" in t else ("albanileria" if "alban" in t or "albañ" in t
                                                else "concreto armado")
            r = cumple_deriva(val, mat)
            return {"tool": "norma", "action": None, "reply": r["reply"],
                    "cita": r["cita"], "disclaimer": r["disclaimer"]}
    r = consultar(text)
    return {"tool": "norma", "action": None, "reply": r["reply"],
            "cita": r["cita"], "disclaimer": r["disclaimer"]}
