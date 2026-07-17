"""Detección de EPP en vivo (YOLO) — enganche opcional.

La visión pesada (PyTorch CUDA + Ultralytics + YOLOv8s de GEN+, 11 clases EPP,
mAP 87.67%) corre en un ENTORNO APARTE / servicio propio para no cargar el núcleo.
Aquí solo consultamos ese servicio si está configurado. Si no, se apaga solo.

Para el stand: instancia STANDALONE local (webcam), NO el VPS de producción PDK.
"""
from __future__ import annotations

import httpx

from ..config import CONFIG

_CFG = CONFIG["tools"]["vision"]


def handle(text: str) -> dict:
    if not _CFG.get("enabled", False):
        return {"tool": "vision", "action": None,
                "reply": "La detección de EPP en vivo no está activa en este equipo. "
                         "Es nuestro sistema VisionPro: detecta cascos y chalecos en obra con visión por computadora."}
    url = _CFG.get("service_url", "")
    if not url:
        return {"tool": "vision", "action": "vision",
                "reply": "Activando la cámara. VisionPro analiza si las personas usan casco y chaleco.",
                "meta": {"mode": "frontend"}}
    try:
        r = httpx.get(f"{url.rstrip('/')}/detect", timeout=4.0)
        r.raise_for_status()
        det = r.json()
        return {"tool": "vision", "action": "vision",
                "reply": det.get("resumen", "Analizando la escena en vivo."),
                "meta": det}
    except Exception:  # noqa: BLE001
        return {"tool": "vision", "action": "vision",
                "reply": "La cámara está calentando. En un momento verás la detección de EPP.",
                "meta": {"mode": "frontend"}}
