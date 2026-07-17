"""Texto a voz (TTS) con jerarquía anti-mudez.

Orden (engine: 'auto'):
  1. Iapetus pregrabada  — si la frase coincide con un WAV en data/voces/iapetus/
  2. Piper local         — si piper_exe + piper_model están configurados
  3. Navegador (fallback)— el frontend usa speechSynthesis; aquí devolvemos None

synth() devuelve (audio_bytes | None, mime | 'browser').
Nunca lanza excepción: si todo falla, delega al navegador.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

from .config import CONFIG, ROOT

_TTS = CONFIG["tts"]


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9áéíóúñ ]", "", s.lower()).strip()


def _iapetus_index() -> dict[str, Path]:
    """Mapa frase-normalizada -> wav. Usa un manifest.json si existe, o los nombres."""
    d = ROOT / _TTS.get("iapetus_dir", "data/voces/iapetus")
    idx: dict[str, Path] = {}
    if not d.exists():
        return idx
    manifest = d / "manifest.json"
    if manifest.exists():
        try:
            for frase, fname in json.loads(manifest.read_text(encoding="utf-8")).items():
                wav = d / fname
                if wav.exists():
                    idx[_norm(frase)] = wav
        except Exception:  # noqa: BLE001
            pass
    for wav in d.glob("*.wav"):
        idx.setdefault(_norm(wav.stem.replace("_", " ")), wav)
    return idx


def _try_iapetus(text: str) -> bytes | None:
    hit = _iapetus_index().get(_norm(text))
    return hit.read_bytes() if hit else None


def _try_piper(text: str) -> bytes | None:
    exe, model = _TTS.get("piper_exe"), _TTS.get("piper_model")
    if not exe or not model or not Path(exe).exists() or not Path(model).exists():
        return None
    try:
        out = Path(tempfile.gettempdir()) / f"genplus_tts_{hashlib.md5(text.encode()).hexdigest()[:10]}.wav"
        subprocess.run([exe, "-m", model, "-f", str(out)], input=text.encode("utf-8"),
                       check=True, timeout=30, capture_output=True)
        data = out.read_bytes()
        out.unlink(missing_ok=True)
        return data
    except Exception:  # noqa: BLE001
        return None


def available() -> tuple[bool, str]:
    eng = _TTS.get("engine", "auto")
    if eng in ("browser", "off"):
        return True, f"modo '{eng}'"
    n_iap = len(_iapetus_index())
    piper_ok = bool(_TTS.get("piper_exe")) and Path(_TTS.get("piper_exe") or "x").exists()
    return True, f"iapetus:{n_iap} frases · piper:{'sí' if piper_ok else 'no'} · fallback navegador"


def synth(text: str) -> tuple[bytes | None, str]:
    eng = _TTS.get("engine", "auto")
    if eng == "off":
        return None, "off"
    if eng == "browser":
        return None, "browser"
    if eng in ("auto", "iapetus"):
        wav = _try_iapetus(text)
        if wav:
            return wav, "audio/wav"
        if eng == "iapetus":
            return None, "browser"
    if eng in ("auto", "piper"):
        wav = _try_piper(text)
        if wav:
            return wav, "audio/wav"
    return None, "browser"
