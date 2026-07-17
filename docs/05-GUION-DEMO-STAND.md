# 05 · Guion de la experiencia — Stand #27 "GEN+ / Vision Pro AI"

**AI Construction Summit 2026 · 17–18 jul · CIP Lima**
Agente de voz: **Iapetus** (orbe) · Motor: `edge-voice-agent` (Ollama en GPU + faster-whisper + Piper) · Captura: `gen-flows → GoHighLevel`

---

## 1. Objetivo y métrica

**Objetivo (una frase):** que cada visitante viva en menos de 3 minutos una consulta técnica real por voz —norma E.030 o edificio en ETABS— y salga con su informe en el correo, convertido en lead con nombre, empresa y contexto.

**Métrica de éxito:** **leads calificados por hora**, no "wows".
- Meta: **≥ 12 leads/hora** con correo válido + rol + interés declarado (registrados en GHL vía gen-flows).
- Secundarias: % de demos que llegan al momento AEC (norma/ETABS) ≥ 70 %; tiempo medio de atención ≤ 3 min en horas pico (hay cola).
- Un "wow" sin correo capturado **no cuenta**.

---

## 2. Recorrido en 5 momentos

| # | Momento | Tiempo | Quién conduce |
|---|---------|--------|---------------|
| 1 | **Gancho** — frenar al que pasa | 0:15 | Operador + orbe |
| 2 | **Interacción por voz** — "¿Qué es GEN+?" | 0:45–1:00 | Iapetus |
| 3 | **Momento AEC diferenciador** — norma E.030 o ETABS por voz | 0:45–1:00 | Iapetus |
| 4 | **Captura de lead** — quiz/ranking + "envíame el informe" | 0:45 | Iapetus + operador |
| 5 | **Cierre + siguiente paso comercial** | 0:20 | Operador |

**Total objetivo: 2:30–3:20 por visitante.** En cola, el operador puede saltar del momento 2 al 4 (gancho → captura) sin romper la experiencia.

---

## 3. Guion literal (frases cortas, aptas para TTS)

### Momento 1 — Gancho (elige según quién se acerca)

**Variante CEO / gerente (prioridad máxima):**
> "Buenos días. ¿Le pregunto en voz alta si su próximo edificio cumple la norma sísmica? Le respondo en diez segundos."

**Variante ingeniero / proyectista:**
> "Hágame una consulta de la E.030 por voz. O pídame un edificio de cinco pisos modelado en ETABS. Se lo muestro ahora."

**Variante estudiante / dev:**
> "¿Quiere ver una IA que corre local, sin nube, respondiendo estructuras? Rete al orbe con el quiz y suba al ranking."

> Regla del operador: **una sola frase**, mira al orbe, invita con la mano. Si frena, cede la palabra a Iapetus.

### Momento 2 — Interacción por voz

Visitante: *"¿Qué es GEN+?"*
> **Iapetus:** "GEN+ implementa inteligencia artificial y BIM en obra. AECODE forma a los equipos; GEN+ lo pone a funcionar en tus proyectos. Lo que oyes ahora corre en este mismo equipo, sin internet."

### Momento 3 — Momento AEC diferenciador (el que convierte)

**Ruta norma:** *"¿Un muro de 15 centímetros cumple la E.030?"*
> **Iapetus:** "Reviso la Norma E.030. Para ese sistema el espesor mínimo y la deriva admisible son estos… te lo dejo por escrito en el informe con el artículo citado."

**Ruta ETABS:** *"Modela un edificio de cinco pisos con sismo E.030."*
> **Iapetus:** "Listo. Genero el modelo de cinco niveles, aplico el espectro E.030 y calculo derivas. Mira la pantalla: la estructura y los resultados. ¿Te lo envío al correo?"

> Iapetus siempre termina con **"¿te lo envío al correo?"** — es el puente a la captura.

### Momento 4 — Captura + quiz

> **Iapetus:** "Antes de enviarlo, ¿aceptas el reto? Cinco preguntas de IA y construcción. Los mejores del día están en la pantalla de la derecha."
> (al terminar) "Buen puntaje. Para mandarte el informe y tu resultado, dime tu nombre, tu empresa y tu correo."

### Momento 5 — Cierre comercial

> **Iapetus:** "Enviado. Revisa tu bandeja: ahí está el informe y cómo GEN+ lo implementa en tu proyecto."
> **Operador:** "Te va a escribir nuestro equipo esta semana. Y no olvides el sello del Pasaporte Summit — ya llevas el stand 27."

---

## 4. Captura de lead sin fricción

El lead **no es un formulario**: es una frase.

1. El visitante dice **"envíame el informe a mi correo"** (Iapetus lo pide en cada demo).
2. **Dicta por voz** nombre, empresa y correo. Iapetus repite el correo letra por letra para confirmar ("¿juan punto perez arroba…?").
3. El agente arma el payload (nombre, empresa, correo, rol inferido, consulta hecha, puntaje del quiz, `stand=27`) y lo envía a **`gen-flows`**, que lo registra en **GoHighLevel** y dispara el **PDF** al correo.
4. **Ese envío ES el lead**, con trazabilidad completa: la fuente es la consulta real, no un UTM vacío.

**UTMs / trazabilidad:** cada informe lleva `utm_source=summit2026&utm_medium=stand27&utm_campaign=visionpro`, y el registro en GHL guarda la consulta técnica como nota. Así sabemos **qué preguntó** cada lead, no solo que pasó.

> Si la dictada del correo falla dos veces, el operador teclea manualmente en el panel — mismo endpoint de gen-flows, cero pérdida.

---

## 5. El quiz como gancho social

- **5 preguntas** de IA + construcción (dificultad media, respondibles por voz o toque).
- **Ranking en vivo** en el **segundo monitor**: nombre + puntaje del día. La competencia atrae a la cola y da tema de conversación.
- **Premio simbólico:** sticker/pin GEN+ para el Top 10 del día; el nombre en pantalla ya es el premio real (ego + foto).
- **Conexión con "Pasaporte Summit":** completar el quiz = **sello del stand #27**. El operador sella el pasaporte al cerrar. Esto amarra el lead a la mecánica del evento y da excusa para pedir el correo ("te mando tu resultado y el sello queda registrado").

---

## 6. Rol del operador humano (edecán / Alejandro)

**Mientras Iapetus habla, el operador NO habla:** dirige la mirada del visitante a la pantalla correcta, tiene el segundo monitor con el ranking a la vista y prepara el pin/pasaporte. Cuida la cola: sonríe al siguiente, gestiona el ritmo.

**Rescate si algo falla — frase puente + botón manual:**
- Si el STT no entiende: *"Déjame lanzarlo yo"* → el operador toca el **botón manual** del panel (norma / ETABS / quiz) y la demo sigue.
- Si Iapetus tarda: *"El orbe está pensando en 3D, dame un segundo"* → nunca silencio en seco.
- Si se traba: *"Vamos directo a lo bueno"* → salta al momento AEC o a la captura con el panel.

> Principio: **el humano cubre a la máquina, no compite con ella.** Una frase puente, un botón, y seguimos.

---

## 7. Plan B — nunca pantalla muerta

Tres niveles de degradación, del menos al más severo:

1. **Cae el micrófono / STT:** **Modo botones.** El panel del operador dispara cada capacidad (¿qué es GEN+?, norma, ETABS, quiz, EPP) con un toque. Iapetus sigue hablando (Piper) y capturando correo por teclado.
2. **Cae la GPU / Ollama (sin inferencia):** **Respuestas Iapetus pregrabadas** (audios en `data/voces/iapetus`) para las 6 preguntas frecuentes + capturas de pantalla de un ETABS ya resuelto. La demo se vuelve guiada, pero suena y convierte.
3. **Cae la energía / equipo completo:** **video loop** de la mejor demo (norma + ETABS + EPP) en el monitor con batería/UPS, y captura de leads con QR impreso de respaldo → mismo flujo gen-flows.

> Regla de oro del stand: **si la demo va a fallar delante de un CEO, se degrada un nivel antes de mostrarse rota.** El riesgo reputacional del Summit es una pantalla muerta; eso no puede pasar.

---

## 8. Checklist pre-turno (30 min antes)

- [ ] **Reiniciar el equipo** en limpio; cerrar apps que roben GPU/RAM.
- [ ] **Ollama cargado en GPU** — lanzar una inferencia de calentamiento y confirmar que el modelo está en VRAM (no en CPU).
- [ ] **faster-whisper listo** en CUDA (primer "hola" transcrito < 1 s).
- [ ] **Prueba de micrófono** con ruido de feria: hablar a 40 cm, verificar que capta y no satura.
- [ ] **Volumen** de Piper calibrado por encima del murmullo del pabellón; probar con auriculares y en parlante.
- [ ] **Luz para la cámara** (detección EPP): apuntar un foco al punto donde se para el visitante; sin contraluz.
- [ ] **Segundo monitor** mostrando el ranking del quiz, reseteado del día.
- [ ] **gen-flows / GHL:** enviar **1 lead de prueba** a tu propio correo y confirmar que llega el PDF con UTMs.
- [ ] **Piper con voz Iapetus** cargada; probar fallback a voz de navegador.
- [ ] **Plan B a mano:** audios pregrabados y video loop listos en carpeta; UPS conectado; QR impreso de respaldo.
- [ ] **Pasaporte Summit + pines** GEN+ a la vista.

---

*Un stand no se gana con la mejor IA. Se gana con la IA que **no se cae** delante del que decide, y se lleva su correo. — GEN+*
