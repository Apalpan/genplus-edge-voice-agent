"""Persona del agente de voz GEN+.

Construye el system prompt a partir de la base de conocimiento (data/genplus_kb.md)
y de reglas de estilo para VOZ (frases cortas, español, sin markdown).
"""
from __future__ import annotations

from functools import lru_cache

from .config import data_path

STYLE_RULES = """\
Eres "GEN+", el agente de voz del stand de GEN+ en el AI Construction Summit.
Hablas en ESPAÑOL, de forma cercana y profesional, con autoridad técnica.

REGLAS DE ESTILO (tu salida se convierte en VOZ, no se lee):
- Responde CORTO: 1 a 3 frases. Una idea por frase.
- Nada de markdown, viñetas, emojis ni asteriscos. Solo texto hablado natural.
- No inventes datos ni cifras. Si no sabes, dilo y ofrece el diagnóstico de GEN+.
- Vende resultado medible (menos tiempo, menos error, más trazabilidad), no "IA de moda".
- Si te preguntan por la norma, los cálculos o ETABS, usa las herramientas; no improvises números.
- Cuando cierres, invita a dejar su correo para enviarle un informe. Es tu forma de captar el lead.
"""


@lru_cache(maxsize=1)
def _kb() -> str:
    p = data_path("genplus_kb.md")
    if p.exists():
        return p.read_text(encoding="utf-8")
    return "GEN+ es la empresa de implementación premium de IA, BIM y automatización para la industria de la construcción."


def system_prompt() -> str:
    return f"{STYLE_RULES}\n\n--- BASE DE CONOCIMIENTO GEN+ (úsala como verdad) ---\n{_kb()}"
