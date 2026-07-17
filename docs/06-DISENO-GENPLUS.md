# 06 · Sistema de Diseño GEN+ — Edge Voice Agent

Especificación visual de la interfaz web del **Edge Voice Agent**. Marca **OFICIAL GEN+ (azul)** — NO AECODE (violeta). La UI es un **HUD oscuro premium** tipo centro de operaciones: orbe 3D central de partículas azul, barra de estado superior, panel de agentes a la derecha, transcripción, botones grandes y pipeline al pie. Todo debe leerse a **2–3 m** en un stand.

---

## 1) Bloque `:root` — tokens (copiar tal cual)

```css
:root{
  /* ── Marca GEN+ (azul) ── */
  --gp-blue:        #2165FF;   /* primario · marca */
  --gp-navy:        #0E2A6B;   /* institucional · profundo */
  --gp-light-blue:  #4D84FF;   /* acento · foco */
  --gp-ice:         #E9F0FF;   /* superficie suave / texto sobre oscuro */
  --gp-black:       #040F20;   /* fondo base oscuro */
  --gp-bg-2:        #0E1121;   /* fondo paneles oscuros */
  --gp-slate:       #3B5070;   /* bordes / trazos secundarios */
  --gp-storm:       #5B6C87;   /* texto atenuado / labels */
  --gp-cloud:       #E7E9ED;   /* texto neutro */

  /* ── Semánticos ── */
  --gp-live:   #17b14e;   /* éxito · EN VIVO (uso restringido) */
  --gp-watch:  #f59e0b;   /* ámbar · watch / advertencia */
  --gp-error:  #e26a62;   /* rose · error */

  /* ── Texto ── */
  --gp-text:       #E9F0FF;
  --gp-text-dim:   #94A6C4;   /* mezcla ice/storm */
  --gp-text-mute:  #5B6C87;

  /* ── Superficies / bordes / glass ── */
  --gp-surface:    rgba(14,17,33,.72);
  --gp-border:     rgba(33,101,255,.18);
  --gp-border-2:   rgba(59,80,112,.35);
  --gp-glass:      rgba(10,20,40,.55);
  --gp-glass-blur: blur(18px);

  /* ── Marca: gradiente + glow ── */
  --gp-grad: linear-gradient(135deg, #0E2A6B 0%, #2165FF 58%, #4D84FF 100%);
  --gp-glow: 0 0 24px rgba(33,101,255,.5);
  --gp-glow-live: 0 0 24px rgba(23,177,78,.5);

  /* ── Grid técnico blueprint ── */
  --gp-grid: rgba(33,101,255,.05);
  --gp-grid-size: 44px;

  /* ── Radios ── */
  --gp-r-base: 8px;
  --gp-r-panel: 20px;   /* 16–24 */
  --gp-r-pill: 999px;

  /* ── Sombras (navy suave) ── */
  --gp-sh-1: 0 2px 8px rgba(4,15,32,.35);
  --gp-sh-2: 0 12px 40px rgba(4,15,32,.55);

  /* ── Tipografía ── */
  --gp-font: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  --gp-font-brand: "Ruberoid", "Plus Jakarta Sans", sans-serif;
  --gp-fw-title: 800;
  --gp-tracking: 0;   /* letter-spacing 0 SIEMPRE */

  /* ── Motion ── */
  --gp-t-fast: 180ms;
  --gp-t-base: 240ms;
  --gp-ease: cubic-bezier(.2,.7,.3,1);
}
```

---

## 2) Reglas de uso del color

- **Azul primario `--gp-blue`** = acción, marca, estado activo, trazos del orbe, bordes vivos. Es el color por defecto de todo lo interactivo.
- **Navy `--gp-navy`** = institucional y estructural: fondos de gradiente, cabeceras, sombras. Nunca para texto pequeño (bajo contraste).
- **Light Blue `--gp-light-blue`** = acento y **foco visible**. Reservado para hover/selección y el anillo de foco.
- **Contraste AA**: texto sobre `--gp-black`/`--gp-bg-2` usa `--gp-ice`/`--gp-cloud` (≥ 7:1). `--gp-storm` solo para labels ≥ 14px. Nunca azul sobre navy en texto de lectura.
- **Verde `--gp-live` SOLO para "EN VIVO"** y confirmación de agente ejecutando. No es un color decorativo ni de UI general. Ámbar = watch; rose = error. Estos tres nunca colorean texto de cuerpo.

---

## 3) Anatomía de la UI (zonas + tokens)

| Zona | Descripción | Tokens |
|---|---|---|
| **Fondo** | `--gp-black` con grid blueprint 44px | `--gp-grid`, `--gp-grid-size` |
| **Topbar (estado)** | Barra glass con chips STT · LLM · TTS · RAM · uptime | `--gp-glass`, `--gp-border`, `--gp-text-dim` |
| **Orbe central** | Plexus de partículas azul; núcleo con glow | `--gp-grad`, `--gp-glow` |
| **Estados** | Etiqueta de estado bajo el orbe (REPOSO/ESCUCHANDO…) | `--gp-blue` / `--gp-live` |
| **Panel Agentes** | Derecha: **En vivo** (verde) vs **En catálogo** (azul atenuado) | `--gp-live`, `--gp-border`, `--gp-r-panel` |
| **Métricas** | Turnos · correos · edificios · informes · leads (cifras 800) | `--gp-blue`, `--gp-fw-title` |
| **Transcripción** | Log usuario/agente, scroll suave, texto ice | `--gp-text`, `--gp-surface` |
| **Botones** | Grandes, pill; primario gradiente + glow | `--gp-grad`, `--gp-r-pill`, `--gp-glow` |
| **Pipeline footer** | MIC → WHISPER → GEMMA → AGENT FLOW → PIPER | `--gp-slate`, `--gp-blue` (nodo activo) |

```css
.gp-app{
  background:
    linear-gradient(var(--gp-grid) 1px, transparent 1px) 0 0/var(--gp-grid-size) var(--gp-grid-size),
    linear-gradient(90deg, var(--gp-grid) 1px, transparent 1px) 0 0/var(--gp-grid-size) var(--gp-grid-size),
    var(--gp-black);
  color: var(--gp-text);
  font-family: var(--gp-font);
  letter-spacing: var(--gp-tracking);
}
.gp-panel{
  background: var(--gp-glass);
  -webkit-backdrop-filter: var(--gp-glass-blur);
  backdrop-filter: var(--gp-glass-blur);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-r-panel);
  box-shadow: var(--gp-sh-2);
}
.gp-btn{
  font: var(--gp-fw-title) 1.05rem/1 var(--gp-font);
  padding: .95rem 1.6rem;
  border-radius: var(--gp-r-pill);
  background: var(--gp-grad);
  color: #fff; border: 0; cursor: pointer;
  box-shadow: var(--gp-glow);
  transition: transform var(--gp-t-fast) var(--gp-ease),
              box-shadow var(--gp-t-fast) var(--gp-ease);
}
.gp-btn:hover{ transform: translateY(-2px); box-shadow: 0 0 34px rgba(33,101,255,.7); }
.gp-btn--ghost{ background: transparent; border: 1px solid var(--gp-border); box-shadow: none; }

.gp-chip--live{ color: var(--gp-live); }
.gp-chip--live::before{ /* punto EN VIVO */
  content:""; width:.55rem; height:.55rem; border-radius:50%;
  background: var(--gp-live); box-shadow: var(--gp-glow-live);
  display:inline-block; margin-right:.5rem; animation: gp-blink 1.4s infinite;
}
```

---

## 4) El orbe — estados visuales

El orbe traduce el estado del agente. Cambia color, velocidad y forma de pulso.

| Estado | Comportamiento | Color / clase |
|---|---|---|
| **Reposo** | Respira lento, escala 0.98↔1.02 (~5s) | `--gp-blue` tenue · `.orb--idle` |
| **Escuchando** | Pulsa al ritmo del audio del mic | `--gp-light-blue` · `.orb--listen` |
| **Pensando** | Gira rápido, partículas en órbita | `--gp-blue` brillante · `.orb--think` |
| **Hablando** | Ondas concéntricas salientes | `--gp-grad` · `.orb--speak` |
| **Ejecutando** | Cambia a **verde** (acción/herramienta) | `--gp-live` · `.orb--run` |

```css
.orb{ filter: drop-shadow(var(--gp-glow)); transition: filter var(--gp-t-base) var(--gp-ease); }
.orb--idle  { animation: gp-breathe 5s ease-in-out infinite; }
.orb--listen{ animation: gp-pulse 1s   ease-in-out infinite; }
.orb--think { animation: gp-spin 2.4s  linear      infinite; }
.orb--speak { animation: gp-wave 1.2s  ease-out    infinite; }
.orb--run   { filter: drop-shadow(var(--gp-glow-live)); }

@keyframes gp-breathe{ 0%,100%{transform:scale(.98)} 50%{transform:scale(1.02)} }
@keyframes gp-pulse  { 0%,100%{transform:scale(1)}   50%{transform:scale(1.08)} }
@keyframes gp-spin   { to{ transform: rotate(360deg) } }
@keyframes gp-wave   { 0%{box-shadow:0 0 0 0 rgba(33,101,255,.5)} 100%{box-shadow:0 0 0 40px rgba(33,101,255,0)} }
@keyframes gp-blink  { 0%,100%{opacity:1} 50%{opacity:.35} }
```

---

## 5) Motion

- **Hover / press: 180ms** (`--gp-t-fast`). Transiciones de estado: 240ms. Easing único `--gp-ease`.
- Anima solo `transform`, `opacity`, `filter`, `box-shadow` — nunca layout.
- **`prefers-reduced-motion`**: se cancela toda animación continua (orbe se congela en su color de estado; los pulsos se sustituyen por cambio de color estático).

```css
@media (prefers-reduced-motion: reduce){
  *{ animation-duration:.001ms!important; animation-iteration-count:1!important;
     transition-duration:.001ms!important; }
  .orb{ animation:none!important; }
}
```

---

## 6) Logo GEN+

Brand-mark tipográfico **"GEN+"** con gradiente de marca cuando no hay PNG. En superficies oscuras, versión **blanca sólida**. `letter-spacing: 0`.

```css
.gp-logo{ font: var(--gp-fw-title) 1.5rem/1 var(--gp-font-brand); letter-spacing:0; }
.gp-logo--grad{
  background: var(--gp-grad); -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
.gp-logo--grad .plus{ /* el "+" siempre light-blue para legibilidad */
  -webkit-text-fill-color: var(--gp-light-blue);
}
.gp-logo--white{ color:#fff; }   /* uso en oscuro sobre glow o foto */
```

Regla: sobre fondos oscuros complejos (foto, orbe) usar `.gp-logo--white`; sobre superficies planas navy/negro, `.gp-logo--grad`.

---

## 7) Accesibilidad para stand

- **Legible a 2–3 m**: cuerpo base ≥ 18px; cifras de métricas ≥ 40px peso 800; labels ≥ 14px.
- **Botones grandes (táctil)**: mínimo **56×56px** de área tocable; separación ≥ 12px.
- **Foco visible** con `--gp-light-blue`, grueso y siempre presente (nunca `outline:none` sin reemplazo).

```css
:where(button,a,[tabindex],input){
  min-height: 56px;
}
:focus-visible{
  outline: 3px solid var(--gp-light-blue);
  outline-offset: 3px;
  border-radius: var(--gp-r-base);
}
```

---

**Resumen de identidad:** azul GEN+ manda; verde solo cuando algo está EN VIVO/ejecutando; oscuro premium con grid blueprint, glass y glow; tipografía Plus Jakarta Sans peso 800 en títulos y `letter-spacing: 0` en todo. Fiel a GEN+, nunca AECODE.
