"""Estado de sesión del stand: métricas visibles + transcripción + leads.

En memoria (un turno = una interacción). Suficiente para el stand; si quieres
persistir leads, escríbelos también a data/leads/ (ver tools/email_report.py).
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class State:
    metrics: dict[str, int] = field(default_factory=lambda: {
        "turnos": 0, "correos": 0, "edificios": 0, "informes": 0, "fotos": 0, "leads": 0,
    })
    transcript: deque = field(default_factory=lambda: deque(maxlen=50))
    ejecuciones: deque = field(default_factory=lambda: deque(maxlen=30))

    def add_turn(self, who: str, text: str) -> None:
        if who == "user":
            self.metrics["turnos"] += 1
        self.transcript.appendleft({"who": who, "text": text})

    def bump(self, metric: str, n: int = 1) -> None:
        if metric in self.metrics:
            self.metrics[metric] += n

    def log_exec(self, tool: str, detail: str, ok: bool = True) -> None:
        self.ejecuciones.appendleft({"tool": tool, "detail": detail, "ok": ok})

    def snapshot(self) -> dict[str, Any]:
        return {
            "metrics": dict(self.metrics),
            "transcript": list(self.transcript)[:12],
            "ejecuciones": list(self.ejecuciones)[:8],
        }


STATE = State()
