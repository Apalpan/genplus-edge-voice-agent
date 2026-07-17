"""'¿Qué es GEN+?' — responde desde la base de conocimiento con frases aptas para voz.

Usa respuestas canónicas (rápidas, sin latencia, siempre correctas para el stand).
Si la pregunta es más abierta, puede delegar a Gemma con el KB como contexto.
"""
from __future__ import annotations

import random

# Frases fieles a los documentos GEN+ (SO-GEN+, Vision, Roadmap). Listas para TTS.
CANONICAS = [
    "GEN+ es la empresa de implementación premium de inteligencia artificial, BIM y "
    "automatización para la industria de arquitectura, ingeniería y construcción.",
    "Ayudamos a constructoras, inmobiliarias y consultoras a pasar de herramientas sueltas "
    "a verdaderos sistemas operativos con agentes de inteligencia artificial.",
    "No vendemos inteligencia artificial en abstracto: diagnosticamos tus procesos, "
    "desplegamos agentes y medimos el impacto real, en menos tiempo y con menos errores.",
]

CIERRE = ("Trabajamos cuatro frentes: implementación de IA, digitalización BIM y VDC, "
          "productos propios como VisionPro, y capacitación. AECODE forma, y GEN+ implementa. "
          "Si quieres, te envío un diagnóstico a tu correo.")


def handle(text: str) -> dict:
    intro = random.choice(CANONICAS)
    return {"tool": "genplus", "action": None, "reply": f"{intro} {CIERRE}", "cita": None}
