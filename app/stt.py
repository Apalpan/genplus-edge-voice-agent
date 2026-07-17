"""Voz a texto (STT).

Dos motores, elegidos en config.yaml:
  - 'whisper': faster-whisper local en la GPU (offline, ideal para el stand).
  - 'browser': el navegador transcribe (0 instalación). En ese modo este módulo
               no hace nada: el frontend envía texto ya transcrito.

El modelo se carga PEREZOSAMENTE (la primera transcripción) para que el server
arranque instantáneo aunque falten los pesos.
"""
from __future__ import annotations

from pathlib import Path

from .config import CONFIG

_STT = CONFIG["stt"]
_model = None
_load_error: str | None = None


def engine() -> str:
    return _STT.get("engine", "browser")


def _get_model():
    global _model, _load_error
    if _model is not None or _load_error is not None:
        return _model
    try:
        from faster_whisper import WhisperModel  # import perezoso
        device = _STT.get("device", "cuda")
        _model = WhisperModel(
            _STT.get("model", "small"),
            device=device,
            compute_type=_STT.get("compute_type", "int8_float16" if device == "cuda" else "int8"),
        )
    except Exception as e:  # noqa: BLE001
        _load_error = f"{e.__class__.__name__}: {e}"
        _model = None
    return _model


def available() -> tuple[bool, str]:
    if engine() != "whisper":
        return True, f"modo '{engine()}' (transcribe el navegador)"
    try:
        import faster_whisper  # noqa: F401
        return True, f"faster-whisper '{_STT.get('model')}' · {_STT.get('device')}"
    except Exception:  # noqa: BLE001
        return False, "faster-whisper no instalado (pip install faster-whisper)"


def transcribe(audio_path: str | Path) -> str:
    """Transcribe un archivo de audio a texto. Solo aplica en modo 'whisper'."""
    if engine() != "whisper":
        return ""
    model = _get_model()
    if model is None:
        raise RuntimeError(f"Whisper no disponible: {_load_error}")
    segments, _info = model.transcribe(
        str(audio_path),
        language=_STT.get("language", "es"),
        vad_filter=True,
    )
    return " ".join(seg.text.strip() for seg in segments).strip()
