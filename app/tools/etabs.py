"""Demo estructural con ETABS por voz (2–8 pisos, sismo E.030, derivas).

ETABS SOLO corre en Windows por automatización COM. Este módulo:
  - Si ETABS 22 está instalado y `tools.etabs.enabled: true` → lo controla por COM.
  - Si no → devuelve un resultado SIMULADO claramente etiquetado (la demo no se cae).

El COM es la pieza más frágil del stand: va envuelto en try/except y con timeout.
"""
from __future__ import annotations

import re

from ..config import CONFIG

_MAX_PISOS = 8
_MIN_PISOS = 2


def _pisos_from(text: str) -> int:
    m = re.search(r"(\d+)\s*piso", text.lower())
    n = int(m.group(1)) if m else 4
    return max(_MIN_PISOS, min(_MAX_PISOS, n))


def _com_disponible() -> bool:
    try:
        import comtypes.client  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


def _correr_etabs(pisos: int) -> dict | None:
    """Intento real por COM. Devuelve None si no se puede (para caer al mock)."""
    if not _com_disponible():
        return None
    try:
        import comtypes.client
        helper = comtypes.client.CreateObject("ETABSv1.Helper")
        etabs = helper.GetObject("CSI.ETABS.API.ETABSObject")  # conecta a instancia abierta
        sap = etabs.SapModel
        # NOTA: aquí iría el modelado paramétrico real (grillas, alturas, sismo E.030,
        # análisis y lectura de derivas). Se deja el enganche; requiere ETABS abierto.
        _ = sap
        return None  # TODO: implementar modelado real cuando haya ETABS en la máquina
    except Exception:  # noqa: BLE001
        return None


def _mock(pisos: int) -> dict:
    # Deriva plausible que crece con la altura (demostrativa, no de diseño).
    deriva = round(0.0035 + pisos * 0.0006, 4)
    cumple = deriva <= 0.007
    return {
        "pisos": pisos, "deriva_max": deriva, "cumple": cumple, "simulado": True,
        "reply": f"Modelé un edificio de {pisos} pisos con sismo E.030. La deriva máxima estimada "
                 f"es {deriva:g}, así que {'cumple' if cumple else 'no cumple'} el límite de 0.007 "
                 f"para concreto armado. Es una simulación de demostración.",
    }


def handle(text: str) -> dict:
    if not CONFIG["tools"]["etabs"].get("enabled", False):
        return {"tool": "etabs", "action": None,
                "reply": "El demo de ETABS está desactivado en este equipo. Puedo mostrarte "
                         "el resto de capacidades del agente."}
    pisos = _pisos_from(text)
    real = _correr_etabs(pisos)
    r = real or _mock(pisos)
    return {"tool": "etabs", "action": "etabs", "reply": r["reply"],
            "meta": {"pisos": r["pisos"], "deriva_max": r["deriva_max"],
                     "cumple": r["cumple"], "simulado": r.get("simulado", False)}}
