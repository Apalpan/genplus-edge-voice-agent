/* ═══ GEN+ Edge Voice Agent — frontend v2 ═══
   Funciona en dos contextos con el MISMO código:
   · LIVE: servido por FastAPI en 127.0.0.1:3040 (backend real: Whisper/Gemma/Piper)
   · DEMO: servido estático (GitHub Pages) → simula el agente client-side
   La detección es automática: si /api/status no responde, entra en modo demo. */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

let DEMO = false;
let STT_ENGINE = "browser";
let recognizing = false;
let mediaRec = null, chunks = [];
let uptime = 0;

/* ══════════════════ ESTADO DEL AGENTE ══════════════════ */
const STATE_LABEL = {
  reposo: ["EN REPOSO", "esperando a que alguien hable"],
  escuchando: ["ESCUCHANDO", "te escucho — habla con claridad"],
  pensando: ["PENSANDO", "gemma razonando en el edge…"],
  hablando: ["HABLANDO", "respuesta por voz en curso"],
  ejecutando: ["EJECUTANDO", "herramienta en marcha"],
};
function setState(s) {
  document.body.dataset.state = s;
  const [t, h] = STATE_LABEL[s] || STATE_LABEL.reposo;
  $("#stateChip").textContent = t;
  $("#stateHint").textContent = h;
  ORB.mode = s;
  ORB.redraw && ORB.redraw();   // reduced-motion: repinta el frame estático con el color del estado
}

/* ══════════════════ ORBE (plexus + parallax) ══════════════════ */
const ORB = (() => {
  const cv = $("#orb"), ctx = cv.getContext("2d");
  let W, H, R, pts = [], neigh = [], angle = 0, wobble = 0;
  const N = 180;
  // Estados distinguibles a 2-3 m: brillo/saturación distintos dentro de la familia azul
  const COLORS = {
    reposo: [77, 132, 255], escuchando: [56, 160, 255], pensando: [124, 108, 255],
    hablando: [170, 205, 255], ejecutando: [23, 177, 78],
  };
  function resize() {
    const d = Math.min(cv.clientWidth, cv.clientHeight) * (devicePixelRatio || 1);
    cv.width = cv.height = d; W = H = d; R = d * 0.37;
  }
  function build() {
    pts = [];
    const gr = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = gr * i;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    neigh = pts.map((p, i) => {
      const d = pts.map((q, j) => [j, (p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2]).filter(x => x[0] !== i);
      d.sort((a, b) => a[1] - b[1]);
      return d.slice(0, 3).map((x) => x[0]);
    });
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    const speed = ({ reposo: .0028, escuchando: .011, pensando: .02, hablando: .013, ejecutando: .009 }[o.mode] || .004);
    angle += speed; wobble += .016;
    const amp = o.mode === "hablando" ? Math.sin(wobble * 4) * .022 : 0;
    const cA = Math.cos(angle), sA = Math.sin(angle);
    const proj = pts.map(([x, y, z]) => {
      const rx = x * cA - z * sA, rz = x * sA + z * cA;
      const s = (1 / (2 - rz)) * (1 + amp);
      return [W / 2 + rx * R * s * 1.6, H / 2 + y * R * s * 1.6, rz, s];
    });
    const [cr, cg, cb] = COLORS[o.mode] || COLORS.reposo;
    ctx.lineWidth = devicePixelRatio || 1;
    for (let i = 0; i < N; i++) for (const j of neigh[i]) {
      if (j < i) continue;
      const a = proj[i], b = proj[j], op = Math.max(0, (a[2] + b[2]) / 2 + 1) * .16;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${op})`;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (const [x, y, z, s] of proj) {
      const op = Math.max(.14, (z + 1) * .48);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${op})`;
      ctx.beginPath(); ctx.arc(x, y, 1.7 * (devicePixelRatio || 1) * s, 0, 7); ctx.fill();
    }
    if (!REDUCED) requestAnimationFrame(frame);   // reduced-motion: un solo frame estático
  }
  const o = { mode: "reposo", redraw: () => { if (REDUCED) frame(); } };
  addEventListener("resize", () => { resize(); if (REDUCED) frame(); });
  resize(); build(); frame();
  // Parallax sutil: propiedad `translate` (no choca con la transition de .reveal) + rAF throttle
  if (!REDUCED && matchMedia("(pointer:fine)").matches) {
    const wrap = $("#orbWrap");
    let px = 0, py = 0, queued = false;
    addEventListener("pointermove", (e) => {
      px = (e.clientX / innerWidth - .5) * 10; py = (e.clientY / innerHeight - .5) * 8;
      if (!queued) { queued = true; requestAnimationFrame(() => { wrap.style.translate = `${px}px ${py}px`; queued = false; }); }
    }, { passive: true });
  }
  return o;
})();

/* ══════════════════ CEREBRO DEMO (client-side, sin backend) ══════════════════ */
const KB = {
  genplus: [
    "GEN+ es la empresa de implementación premium de inteligencia artificial, BIM y automatización para la industria de la construcción.",
    "Ayudamos a constructoras, inmobiliarias y consultoras a pasar de herramientas sueltas a verdaderos sistemas operativos con agentes de inteligencia artificial.",
    "No vendemos inteligencia artificial en abstracto: diagnosticamos tus procesos, desplegamos agentes y medimos el impacto real.",
  ],
  cierre: "Trabajamos cuatro frentes: implementación de IA, digitalización BIM y VDC, productos propios como VisionPro, y capacitación. AECODE forma, y GEN+ implementa. Si quieres, te envío un diagnóstico a tu correo.",
  internet: "Casi todo lo que hago corre local, aquí en esta máquina, sin internet. Solo uso internet para enviarte tu informe por correo.",
  fallback: "Buena pregunta. En el stand respondo con Gemma corriendo local en la GPU. En esta vista previa web te muestro la experiencia; el cerebro completo corre offline en el equipo del stand.",
};
const QUIZ = [
  { texto: "¿Qué significa BIM en la industria de la construcción?", opciones: ["Building Information Modeling", "Basic Infrastructure Management", "Budget & Investment Model"], correcta: 0 },
  { texto: "Según la norma E.030, ¿cuál es la deriva máxima de entrepiso para concreto armado?", opciones: ["0.005", "0.007", "0.010"], correcta: 1 },
  { texto: "¿Qué hace VisionPro en una obra?", opciones: ["Cotiza materiales", "Detecta EPP y riesgos en video", "Firma contratos"], correcta: 1 },
  { texto: "¿Dónde corre un agente de IA 'edge' como el de este stand?", opciones: ["En la nube de un tercero", "En un equipo local, sin depender de internet", "En el celular del cliente"], correcta: 1 },
  { texto: "En el ecosistema GEN+ y AECODE, ¿cómo se reparten los roles?", opciones: ["AECODE forma y GEN+ implementa", "Son competidores", "Ambos solo capacitan"], correcta: 0 },
];
const demoMetrics = { turnos: 0, correos: 0, edificios: 0, informes: 0, fotos: 0, leads: 0 };
const demoExecs = [];

function demoBrain(text) {
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const num = (t.match(/(\d+[.,]?\d*)/) || [])[1];
  if (/que es gen|quien es gen|que hace gen|a que se dedica/.test(t))
    return { intent: "tool", tool: "genplus", reply: KB.genplus[Math.floor(Math.random() * 3)] + " " + KB.cierre };
  if (/deriva/.test(t) && num) {
    const v = parseFloat(num.replace(",", "."));
    const lim = /acero/.test(t) ? 0.010 : /alban|albañ/.test(t) ? 0.005 : 0.007;
    const mat = /acero/.test(t) ? "acero" : /alban|albañ/.test(t) ? "albañilería" : "concreto armado";
    const ok = v <= lim;
    demoExecs.unshift({ tool: "norma", detail: `deriva ${v} vs ${lim} → ${ok ? "CUMPLE" : "NO CUMPLE"}` });
    return { intent: "tool", tool: "norma", reply: `La deriva de ${v} ${ok ? "está dentro del" : "excede el"} límite de ${lim} para ${mat}. ${ok ? "CUMPLE" : "NO CUMPLE"}. Fuente: E.030, Tabla once.` };
  }
  if (/norma|e\.?030|sismo|zona sismica/.test(t))
    return { intent: "tool", tool: "norma", reply: "La norma E.030 divide el país en cuatro zonas sísmicas: zona cuatro en la costa con Z igual a cero punto cuarenta y cinco, hasta zona uno en la selva. Y fija la deriva máxima en cero punto cero cero siete para concreto armado. ¿Quieres que verifique una deriva?" };
  if (/etabs|edificio|estructural/.test(t)) {
    const pisos = Math.max(2, Math.min(8, parseInt((t.match(/(\d+)\s*piso/) || [])[1] || "5", 10)));
    const deriva = +(0.0035 + pisos * 0.0006).toFixed(4);
    demoMetrics.edificios++; demoExecs.unshift({ tool: "etabs", detail: `${pisos} pisos · deriva ${deriva}` });
    return { intent: "tool", tool: "etabs", action: "etabs", reply: `Modelé un edificio de ${pisos} pisos con sismo E.030. La deriva máxima estimada es ${deriva}, así que ${deriva <= 0.007 ? "cumple" : "no cumple"} el límite de cero punto cero cero siete. En el stand esto corre con ETABS real por automatización COM.` };
  }
  if (/quiz|juego|concurso|prueba/.test(t)) return { intent: "tool", tool: "quiz", action: "quiz", reply: "¡Empecemos el quiz de IA en construcción! Primera pregunta." };
  if (/correo|email|informe/.test(t)) return { intent: "tool", tool: "email", action: "email_form", reply: "Con gusto te envío un informe. ¿A qué correo lo mando? Dime tu nombre y tu empresa también." };
  if (/foto/.test(t)) { demoMetrics.fotos++; return { intent: "ui", action: "photo", reply: "¡Sonríe! Te tomé una foto para el recuerdo del stand." }; }
  if (/internet|conectado/.test(t)) return { intent: "ui", reply: KB.internet };
  if (/epp|casco|chaleco|deteccion|que ves/.test(t)) return { intent: "tool", tool: "vision", reply: "En el stand, VisionPro analiza la cámara en vivo y detecta cascos y chalecos con un modelo YOLO entrenado con imágenes de obras peruanas. En esta vista previa web la cámara está apagada." };
  if (/ciudad|gemelo|3d/.test(t)) return { intent: "ui", action: "city_3d", reply: "Así visualizamos proyectos con gemelos digitales: modelos 3D conectados a datos de obra." };
  if (/luz|luces/.test(t)) return { intent: "ui", reply: "Luces encendidas. En el stand controlo dispositivos físicos por voz." };
  if (/color/.test(t)) return { intent: "ui", action: "color", reply: "Cambié el color del núcleo." };
  if (/desintegra/.test(t)) return { intent: "ui", action: "disintegrate", reply: "Desintegrando… y de vuelta. Puro Edge AI." };
  return { intent: "chat", reply: KB.fallback };
}

/* ══════════════════ CHIPS ══════════════════ */
const CHIPS = [
  ["¿Qué es gen+?", "qué es gen+"], ["Quiz", "quiero jugar el quiz"],
  ["Edificio ETABS", "modela un edificio de 5 pisos en etabs"],
  ["¿Cumple la norma?", "mi deriva de 0.009 cumple la norma para concreto armado"],
  ["Consultar la norma", "consultar la norma E.030"],
  ["Informe a mi correo", "envíame el informe a mi correo"],
  ["¿Usa internet?", "usas internet"], ["Tomar una foto", "tómame una foto"],
  ["Detección en vivo", "activa la detección de EPP en vivo"],
  ["Ciudad 3D", "muéstrame la ciudad 3d"], ["Prender luces", "prende las luces"],
  ["Cambia de color", "cambia de color"], ["Desintégrate", "desintégrate"],
];
function renderChips() {
  const box = $("#chips"); box.innerHTML = "";
  for (const [label, text] of CHIPS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = label;
    b.onclick = () => sendText(text);
    box.appendChild(b);
  }
}

/* ══════════════════ FLUJO PRINCIPAL ══════════════════ */
let busy = false;   // un turno a la vez: evita voces solapadas y estados en carrera
async function sendText(text) {
  text = (text || "").trim();
  if (!text || busy) return;
  busy = true;
  try {
    pushTranscript("user", text);
    bumpMetric("turnos");
    setState("pensando");
    pipeFlow(true); markPipe("GEMMA");
    let r;
    if (DEMO) {
      await wait(420 + Math.random() * 500);   // latencia simulada del edge
      r = demoBrain(text);
    } else {
      try {
        r = await api("api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      } catch { r = { reply: "Perdí conexión con el núcleo local. Revisa que arrancar.bat esté corriendo." }; }
    }
    if (r.intent === "tool" || r.action) markPipe("AGENT FLOW");
    const reply = r.reply_display || r.reply || "";
    pushTranscript("agent", reply);
    handleAction(r);
    await speak(reply);
  } finally {
    busy = false;
    pipeFlow(false);
    refreshStatus();
  }
}

function handleAction(r) {
  switch (r.action) {
    case "email_form": openLead(); break;
    case "quiz": startQuiz(); break;
    case "etabs": case "vision": setState("ejecutando"); break;
    case "photo": flash(); if (!DEMO) api("api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "photo" }) }).catch(() => {}); else renderDemoPanels(); break;
    case "color": ORB.hueShift = true; break;
    case "disintegrate": disintegrate(); break;
  }
}

/* ══════════════════ TTS ══════════════════
   Blindado para el stand: pase lo que pase (onend que nunca dispara, audio que
   falla a mitad, voz bloqueada) el orbe SIEMPRE vuelve a reposo. */
let speakGuard = 0;
function speakDone(id) { if (id === speakGuard) setState("reposo"); }
function speak(text) {
  if (!text) { setState("reposo"); return Promise.resolve(); }
  const id = ++speakGuard;
  setState("hablando"); markPipe("PIPER");
  return new Promise((resolve) => {
    // Red de seguridad: si nada avisa el fin, volvemos a reposo igual (~vel. de habla)
    const safety = setTimeout(() => { speakDone(id); resolve(); }, 3000 + text.length * 80);
    let ended = false;
    const finish = () => { if (ended) return; ended = true; clearTimeout(safety); speakDone(id); resolve(); };

    const browserVoice = () => {
      if (!("speechSynthesis" in window)) return finish();
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/\(Fuente:[^)]*\)/g, ""));
        u.lang = "es-ES"; u.rate = 1.04;
        const v = speechSynthesis.getVoices().find((x) => /es[-_]/.test(x.lang));
        if (v) u.voice = v;
        u.onend = finish;
        u.onerror = finish;
        speechSynthesis.speak(u);
      } catch { finish(); }
    };

    if (DEMO) return browserVoice();
    // LIVE: intenta audio real del backend (Iapetus/Piper); si no hay, voz del navegador
    fetch("api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
      .then(async (res) => {
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("audio")) return browserVoice();
        const buf = await res.arrayBuffer();
        const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); finish(); };
        audio.onerror = () => { URL.revokeObjectURL(url); finish(); };
        audio.play().catch(() => { URL.revokeObjectURL(url); browserVoice(); });
      })
      .catch(browserVoice);
  });
}

/* ══════════════════ STT ══════════════════ */
function startListening() {
  if (recognizing) { stopListening(); return; }
  markPipe("MIC");
  if (DEMO || STT_ENGINE === "browser") return browserSTT();
  return recordSTT();
}
function browserSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    $("#stateHint").textContent = "este navegador no soporta voz — escribe tu pedido";
    $("#askInput").focus();
    return;
  }
  const rec = new SR();
  rec.lang = "es-PE"; rec.interimResults = false; rec.maxAlternatives = 1;
  recognizing = true; setState("escuchando"); markPipe("WHISPER");
  rec.onresult = (e) => { recognizing = false; sendText(e.results[0][0].transcript); };
  rec.onerror = () => { recognizing = false; setState("reposo"); };
  rec.onend = () => { recognizing = false; if (document.body.dataset.state === "escuchando") setState("reposo"); };
  rec.start();
  window.__rec = rec;
}
function stopListening() {
  try { window.__rec && window.__rec.stop(); } catch {}
  if (mediaRec && mediaRec.state === "recording") mediaRec.stop();
  recognizing = false;
}
async function recordSTT() {
  if (recognizing) return;
  recognizing = true;            // guard SÍNCRONO: un doble toque no crea dos grabadoras
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRec = new MediaRecorder(stream); chunks = [];
    mediaRec.ondataavailable = (e) => chunks.push(e.data);
    mediaRec.onstop = async () => {
      let texto = "";
      try {
        setState("pensando"); markPipe("WHISPER");
        const fd = new FormData();
        fd.append("audio", new Blob(chunks, { type: "audio/webm" }), "a.webm");
        const r = await api("api/stt", { method: "POST", body: fd });
        texto = r.text || "";
      } catch {
        $("#stateHint").textContent = "no pude transcribir — intenta de nuevo";
      } finally {
        stream.getTracks().forEach((t) => t.stop());   // el micrófono SIEMPRE se apaga
        recognizing = false;
        if (texto) sendText(texto); else setState("reposo");
      }
    };
    mediaRec.start(); setState("escuchando");
    setTimeout(() => { if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); }, 7000);
  } catch {
    recognizing = false;
    $("#stateHint").textContent = "no pude acceder al micrófono";
    setState("reposo");
  }
}

/* ══════════════════ QUIZ ══════════════════ */
let quizIdx = 0, quizScore = 0;
async function startQuiz() {
  quizIdx = 0; quizScore = 0;
  if (DEMO) return showQuestion(QUIZ[0]);
  const r = await api("api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => null);
  if (r && r.pregunta) showQuestion(r.pregunta, r.idx, r.total);
}
function showQuestion(q, idx = quizIdx, total = QUIZ.length) {
  openModal(`
    <h3 id="modalTitle">Quiz · pregunta ${idx + 1}/${total}</h3>
    <p class="q">${q.texto}</p>
    <div id="quizOpts"></div>`);
  q.opciones.forEach((op, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "opt"; b.textContent = op;
    b.onclick = () => answerQuiz(q, i, idx, total, b);
    $("#quizOpts").appendChild(b);
  });
}
async function answerQuiz(q, opcion, idx, total, btn) {
  $$("#quizOpts .opt").forEach((b) => (b.disabled = true));   // sin doble respuesta
  if (DEMO) {
    const ok = opcion === q.correcta;
    btn.classList.add(ok ? "good" : "badx");
    if (ok) quizScore++;
    await wait(REDUCED ? 60 : 480);
    quizIdx = idx + 1;
    if (quizIdx >= QUIZ.length) {
      closeModal();
      demoExecs.unshift({ tool: "quiz", detail: `visitante: ${quizScore}/${QUIZ.length} pts` });
      renderDemoPanels();
      speak(`¡Terminaste! Tu puntaje: ${quizScore} de ${QUIZ.length}. ${quizScore >= 4 ? "Nivel experto. Reclama tu sello del pasaporte." : "Buen intento. Llévate tu sello del pasaporte."}`);
    } else showQuestion(QUIZ[quizIdx]);
    return;
  }
  const nx = await api("api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "answer", idx, opcion }) }).catch(() => null);
  if (!nx) return closeModal();
  if (nx.fin) { closeModal(); speak(nx.reply); refreshStatus(); }
  else { speak(nx.reply); showQuestion(nx.pregunta, nx.idx, nx.total); }
}

/* ══════════════════ LEAD / CORREO ══════════════════ */
function openLead() {
  openModal(`
    <h3 id="modalTitle">Te envío tu informe</h3>
    <label>Nombre <input id="leadNombre" type="text" placeholder="Tu nombre" autocomplete="name"></label>
    <label>Empresa <input id="leadEmpresa" type="text" placeholder="Tu empresa" autocomplete="organization"></label>
    <label>Correo <input id="leadCorreo" type="email" placeholder="tucorreo@empresa.com" autocomplete="email"></label>
    <div class="modal-actions">
      <button type="button" class="ghost" id="leadCancel">Cancelar</button>
      <button type="button" class="primary" id="leadSend">Enviar informe</button>
    </div>`);
  $("#leadNombre").focus();
  $("#leadCancel").onclick = closeModal;
  $("#leadSend").onclick = async () => {
    const nombre = $("#leadNombre").value.trim() || "Visitante";
    const correo = $("#leadCorreo").value.trim();
    const empresa = $("#leadEmpresa").value.trim();
    if (!correo) { $("#leadCorreo").focus(); return; }
    closeModal();
    if (DEMO) {
      demoMetrics.leads++; demoMetrics.informes++;
      demoExecs.unshift({ tool: "email", detail: `lead: ${nombre} · ${correo}` });
      renderDemoPanels();
      speak(`Listo, ${nombre}. Registré tus datos. En el stand, el informe llega a tu correo con copia al equipo GEN+.`);
      return;
    }
    const r = await api("api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email_send", nombre, correo, empresa, resumen: "Interacción en el stand." }) }).catch(() => null);
    speak(r ? r.reply : "No pude registrar el lead. Revisa el backend.");
    refreshStatus();
  };
}

/* ══════════════════ MODAL genérico (focus atrapado + restaurado) ══════════════════ */
let modalOpener = null;
function openModal(html) {
  modalOpener = document.activeElement;
  $("#leadModal .modal-card").innerHTML = html;
  $("#leadModal").hidden = false;
  document.querySelector("main").setAttribute("inert", "");
  document.querySelector("header").setAttribute("inert", "");
  const first = $("#leadModal .modal-card").querySelector("input, button");
  if (first) first.focus();
}
function closeModal() {
  $("#leadModal").hidden = true;
  document.querySelector("main").removeAttribute("inert");
  document.querySelector("header").removeAttribute("inert");
  if (modalOpener && modalOpener.focus) modalOpener.focus();
  modalOpener = null;
}
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#leadModal").hidden) closeModal();
  // Tab ciclado dentro del modal
  if (e.key === "Tab" && !$("#leadModal").hidden) {
    const f = [...$("#leadModal .modal-card").querySelectorAll("input, button:not(:disabled)")];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$("#leadModal").addEventListener("click", (e) => { if (e.target.id === "leadModal") closeModal(); });

/* ══════════════════ UI helpers ══════════════════ */
function pushTranscript(who, text) {
  const box = $("#transcript"); box.querySelector(".empty")?.remove();
  const d = document.createElement("div");
  d.className = "line " + who;
  d.innerHTML = `<span class="who">${who === "user" ? "Visitante" : "GEN+"}:</span> ${esc(text)}`;
  box.prepend(d);
}
function esc(s) { const d = document.createElement("i"); d.textContent = s; return d.innerHTML; }
function markPipe(name) {
  $$(".pipeline span").forEach((s) => s.classList.toggle("active", s.dataset.n === name));
  setTimeout(() => $$(".pipeline span").forEach((s) => s.classList.remove("active")), 1500);
}
function pipeFlow(on) { $("#pipeline").classList.toggle("flow", !!on); }
function flash() {
  const f = document.createElement("div"); f.className = "flash";
  document.body.appendChild(f);
  requestAnimationFrame(() => (f.style.opacity = "0"));
  setTimeout(() => f.remove(), 520);
}
function disintegrate() {
  if (REDUCED) return;
  const w = $("#orbWrap");   // solo transform/opacity: composited, sin repaints
  w.style.transition = "opacity .6s var(--ease-out), scale .6s var(--ease-out)";
  w.style.opacity = "0"; w.style.scale = "1.18";
  setTimeout(() => { w.style.opacity = "1"; w.style.scale = "1"; }, 1100);
}
function bumpMetric(k) { if (DEMO) { demoMetrics[k]++; renderDemoPanels(); } }
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function api(p, o) {
  const r = await fetch(p, o);
  if (!r.ok) throw new Error(r.status);
  return (r.headers.get("content-type") || "").includes("json") ? r.json() : r;
}

/* ══════════════════ PANELES ══════════════════ */
const CATALOG = [
  ["Aecodito · Centro de Operaciones", "gen-flows"], ["Buscador SEACE", "licitaciones"],
  ["Agente Inmobiliario", "web · WhatsApp"], ["Ventas Summit VIP", "gen-flows"],
  ["Verificador de Pagos", "vouchers"], ["Reuniones", "Meet / Zoom"],
];
function renderAgents(tools = {}) {
  $("#agentsLive").innerHTML = `
    <div class="agent-card"><div><div class="name">Correo</div><div class="desc">Agent Flow · gen-flows · webhook</div></div>
      <span class="badge-live${DEMO || !tools.email ? " badge-demo" : ""}">${DEMO ? "SIMULADO" : tools.email ? "EN VIVO" : "APAGADO"}</span></div>
    <div class="agent-card"><div><div class="name">ETABS · Edificio gen+</div><div class="desc">2–8 pisos por voz · sismo E.030 · derivas · COM</div></div>
      <span class="badge-live${DEMO || !tools.etabs ? " badge-demo" : ""}">${DEMO ? "SIMULADO" : tools.etabs ? "EN VIVO" : "DEMO"}</span></div>`;
  $("#catalog").innerHTML = CATALOG.map(([n, t]) => `<li><span>${n}</span><em>${t}</em></li>`).join("");
}
const METRIC_ORDER = [["turnos", "Turnos"], ["correos", "Correos"], ["edificios", "Edificios"], ["informes", "Informes"], ["fotos", "Fotos"], ["leads", "Leads"]];
let lastMetrics = {};
function renderMetrics(m) {
  const box = $("#metrics");
  if (!box.children.length) {
    box.innerHTML = METRIC_ORDER.map(([k, l]) => `<div class="metric" data-k="${k}"><div class="v">0</div><div class="l">${l}</div></div>`).join("");
  }
  for (const [k] of METRIC_ORDER) {
    const el = box.querySelector(`[data-k="${k}"]`);
    const v = m[k] ?? 0;
    if (lastMetrics[k] !== v) {
      el.querySelector(".v").textContent = v;
      el.classList.add("tick");
      setTimeout(() => el.classList.remove("tick"), 400);
    }
  }
  lastMetrics = { ...m };
}
function renderExecs(ex) {
  const box = $("#execs");
  if (!ex || !ex.length) { box.innerHTML = `<p class="empty">Sin ejecuciones todavía.</p>`; return; }
  box.innerHTML = ex.slice(0, 8).map((e) => `<div class="row${e.ok === false ? " err" : ""}"><b>${e.tool}</b> <span>${esc(e.detail)}</span></div>`).join("");
}
function renderDemoPanels() { renderMetrics(demoMetrics); renderExecs(demoExecs); }

/* ══════════════════ STATUS ══════════════════ */
function setPill(k, ok, val) {
  const p = document.querySelector(`.pill[data-k="${k}"]`); if (!p) return;
  p.classList.toggle("ok", !!ok); p.classList.toggle("bad", ok === false);
  const b = p.querySelector("b"); if (b) b.textContent = val || "—";
}
async function refreshStatus() {
  if (DEMO) {
    // Puntos azules (simulado), no verdes: el verde es solo para EN VIVO real
    for (const [k, v] of [["stt", "navegador"], ["llm", "demo"], ["tts", "navegador"], ["flow", "simulado"]]) {
      const p = document.querySelector(`.pill[data-k="${k}"]`);
      if (p) { p.classList.add("sim"); p.classList.remove("ok", "bad"); p.querySelector("b").textContent = v; }
    }
    $("#footL").textContent = "vista previa web · el sistema completo corre offline en el stand";
    renderDemoPanels();
    return;
  }
  try {
    const s = await api("api/status");
    STT_ENGINE = s.engines.stt.engine;
    setPill("stt", s.engines.stt.ok, s.engines.stt.engine === "whisper" ? "CUDA" : s.engines.stt.engine);
    setPill("llm", s.engines.llm.ok, s.engines.llm.model);
    setPill("tts", s.engines.tts.ok, s.engines.tts.engine === "auto" ? "iapetus" : s.engines.tts.engine);
    setPill("flow", s.agentflow.enabled, s.agentflow.enabled ? "gen-flows" : "local");
    renderAgents(s.tools); renderMetrics(s.metrics); renderExecs(s.ejecuciones);
    $("#footL").textContent = `stt ${s.engines.stt.ok ? "✓" : "—"} · llm ${s.engines.llm.ok ? "✓" : "—"} · tts ✓ · ${s.engines.llm.model}`;
  } catch {}
}

/* ══════════════════ BOOT + INIT ══════════════════ */
const BOOT_LINES = ["inicializando núcleo edge…", "cargando modelo de voz…", "conectando gemma local…", "sistema en línea"];
async function boot() {
  // ¿Hay backend? (timeout corto)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1800);
    const r = await fetch("api/status", { signal: ctrl.signal });
    clearTimeout(t);
    DEMO = !r.ok;
  } catch { DEMO = true; }

  if (DEMO) { $("#demoPill").hidden = false; renderAgents({}); renderDemoPanels(); }
  else renderAgents({});

  // Boot solo la primera vez por sesión (en el stand se recarga todo el día)
  const seen = sessionStorage.getItem("gp_boot");
  if (!REDUCED && !seen) {
    for (let i = 0; i < BOOT_LINES.length; i++) {
      $("#bootLine").textContent = BOOT_LINES[i];
      $("#bootBar").style.width = ((i + 1) / BOOT_LINES.length) * 100 + "%";
      await wait(260);
    }
    try { sessionStorage.setItem("gp_boot", "1"); } catch {}
  }
  $("#boot").classList.add("done");
  document.body.classList.add("ready");
  refreshStatus();
}

$("#btnTalk").onclick = startListening;
$("#btnClear").onclick = () => {
  $("#transcript").innerHTML = `<p class="empty">Nadie ha hablado todavía.</p>`;
  if (DEMO) { demoExecs.length = 0; for (const k in demoMetrics) demoMetrics[k] = 0; renderDemoPanels(); }
};
$("#btnMic").onclick = () =>
  navigator.mediaDevices?.getUserMedia({ audio: true })
    .then((s) => { s.getTracks().forEach((t) => t.stop()); $("#stateHint").textContent = "micrófono autorizado ✓"; })
    .catch(() => { $("#stateHint").textContent = "micrófono denegado — revisa permisos del navegador"; });
$("#askForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#askInput").value;
  $("#askInput").value = "";
  sendText(v);
});

renderChips(); renderMetrics({}); setState("reposo"); boot();
setInterval(() => { if (!DEMO) refreshStatus(); }, 4000);
setInterval(() => {
  uptime++;
  $("#uptime").textContent = `${String(Math.floor(uptime / 60)).padStart(2, "0")}:${String(uptime % 60).padStart(2, "0")}`;
}, 1000);
if ("speechSynthesis" in window) speechSynthesis.getVoices();
