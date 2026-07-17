"""Informe por correo — la ÚNICA función que necesita internet.

Flujo: capta nombre/empresa/correo → genera un PDF (Edge headless) → lo envía por
SMTP con copia al coordinador → registra el LEAD (a data/leads/ y, si está
configurado, a gen-flows/GHL por webhook). Ese registro con correo + interés ES el lead.

Si falta configuración o internet, guarda el informe localmente y lo dice (fallback).
"""
from __future__ import annotations

import json
import smtplib
import subprocess
import tempfile
from email.message import EmailMessage
from pathlib import Path

import httpx

from ..config import CONFIG, ROOT
from ..state import STATE

_CFG = CONFIG["tools"]["email"]
_AF = CONFIG["agentflow"]
_EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def _leads_dir() -> Path:
    d = ROOT / "data" / "leads"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _informe_html(lead: dict, resumen: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      body{{font-family:'Segoe UI',sans-serif;color:#040F20;margin:48px}}
      h1{{color:#2165FF}} .k{{color:#5B6C87}} hr{{border:none;border-top:2px solid #E9F0FF}}
    </style></head><body>
      <h1>GEN+ · Informe para {lead.get('nombre','')}</h1>
      <p class="k">{lead.get('empresa','')} · {lead.get('correo','')}</p><hr>
      <h3>Resumen de tu interacción</h3><p>{resumen}</p>
      <h3>Cómo puede ayudarte GEN+</h3>
      <p>Implementamos IA, BIM/VDC y automatización en empresas de construcción.
      El siguiente paso natural es un diagnóstico de IA con un mapa de oportunidades para tu empresa.</p>
      <p class="k">AECODE forma · GEN+ implementa — AI Construction Summit 2026</p>
    </body></html>"""


def _render_pdf(html: str, out: Path) -> bool:
    edge = next((e for e in _EDGE_CANDIDATES if Path(e).exists()), None)
    if not edge:
        return False
    src = Path(tempfile.gettempdir()) / "genplus_informe.html"
    src.write_text(html, encoding="utf-8")
    try:
        subprocess.run([edge, "--headless", "--disable-gpu",
                        f"--print-to-pdf={out}", src.as_uri()],
                       check=True, timeout=40, capture_output=True)
        return out.exists()
    except Exception:  # noqa: BLE001
        return False


def _registrar_lead(lead: dict) -> None:
    STATE.bump("leads")
    (_leads_dir() / f"lead_{STATE.metrics['leads']:04d}.json").write_text(
        json.dumps(lead, ensure_ascii=False, indent=2), encoding="utf-8")
    if _AF.get("enabled") and _AF.get("webhook_url"):
        try:  # dispara flujo real en gen-flows / GHL (UTMs para trazabilidad)
            httpx.post(_AF["webhook_url"], json={
                **lead, "source": "stand-27-visionpro",
                "utm_source": "summit2026", "utm_medium": "stand27", "utm_campaign": "visionpro"},
                timeout=6.0)
        except Exception:  # noqa: BLE001
            pass


def enviar(nombre: str, correo: str, empresa: str = "", resumen: str = "") -> dict:
    lead = {"nombre": nombre, "correo": correo, "empresa": empresa, "interes": resumen}
    _registrar_lead(lead)  # el lead se registra SIEMPRE, aunque el correo falle

    if not _CFG.get("enabled", False):
        return {"reply": f"Registré tus datos, {nombre}. El envío de correo está desactivado "
                         f"en este equipo, pero tu diagnóstico queda agendado.", "lead": True}

    pdf = _leads_dir() / f"informe_{STATE.metrics['leads']:04d}.pdf"
    _render_pdf(_informe_html(lead, resumen or "Interacción en el stand GEN+."), pdf)

    try:
        msg = EmailMessage()
        msg["Subject"] = "Tu diagnóstico GEN+ · AI Construction Summit"
        msg["From"] = _CFG.get("smtp_from", "GEN+")
        msg["To"] = correo
        if _CFG.get("coordinator_cc"):
            msg["Cc"] = _CFG["coordinator_cc"]
        msg.set_content(f"Hola {nombre}, gracias por visitarnos. Adjuntamos tu informe. — GEN+")
        if pdf.exists():
            msg.add_attachment(pdf.read_bytes(), maintype="application",
                               subtype="pdf", filename="Diagnostico-GENplus.pdf")
        with smtplib.SMTP(_CFG["smtp_host"], int(_CFG["smtp_port"]), timeout=20) as s:
            s.starttls()
            if _CFG.get("smtp_user"):
                s.login(_CFG["smtp_user"], _CFG.get("smtp_pass", ""))
            s.send_message(msg)
        STATE.bump("correos"); STATE.bump("informes")
        STATE.log_exec("email", f"informe → {correo}")
        return {"reply": f"Listo, {nombre}. Te envié tu informe a {correo}.", "lead": True, "sent": True}
    except Exception as e:  # noqa: BLE001
        STATE.log_exec("email", f"falló envío a {correo}: {e.__class__.__name__}", ok=False)
        return {"reply": f"Guardé tu informe, {nombre}, pero no pude enviarlo ahora "
                         f"(sin internet). Lo mandaremos apenas haya conexión.", "lead": True, "sent": False}


def handle(text: str) -> dict:
    # El agente pide los datos por voz; el frontend abre un formulario rápido para
    # confirmar el correo (dictar correos por voz es poco fiable).
    return {"tool": "email", "action": "email_form", "reply":
            "Con gusto te envío un informe. ¿A qué correo lo mando? Dime tu nombre y tu empresa también."}
