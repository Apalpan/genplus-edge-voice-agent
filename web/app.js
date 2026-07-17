/* ═══ GEN+ Edge Voice Agent — frontend ═══ */
const $ = (s) => document.querySelector(s);
const api = (p, o) => fetch(p, o).then((r) => (r.headers.get("content-type") || "").includes("json") ? r.json() : r);

let STT_ENGINE = "browser";
let TTS_ENGINE = "auto";
let recognizing = false;
let mediaRec = null, chunks = [];

/* ── Estado del agente ── */
function setState(s, label) {
  document.body.dataset.state = s;
  const chip = $("#stateChip");
  chip.textContent = (label || {
    reposo: "EN REPOSO", escuchando: "ESCUCHANDO", pensando: "PENSANDO",
    hablando: "HABLANDO", ejecutando: "EJECUTANDO",
  }[s] || "EN REPOSO");
  ORB.mode = s;
}

/* ══ ORBE (plexus sobre esfera) ══ */
const ORB = (() => {
  const cv = $("#orb"), ctx = cv.getContext("2d");
  let W, H, R, pts = [], neigh = [], angle = 0;
  const N = 150;
  const COLORS = {
    reposo: [77, 132, 255], escuchando: [33, 101, 255], pensando: [120, 150, 255],
    hablando: [110, 170, 255], ejecutando: [23, 177, 78],
  };
  function resize() {
    const d = Math.min(cv.clientWidth, cv.clientHeight) * devicePixelRatio;
    cv.width = cv.height = d; W = H = d; R = d * 0.36;
  }
  function build() {
    pts = [];
    const gr = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = gr * i;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    neigh = pts.map((p, i) => {
      const d = pts.map((q, j) => [j, (p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2]).filter(x=>x[0]!==i);
      d.sort((a, b) => a[1] - b[1]);
      return d.slice(0, 3).map((x) => x[0]);
    });
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    const speed = { reposo: .003, escuchando: .012, pensando: .022, hablando: .014, ejecutando: .01 }[ORB.mode] || .004;
    angle += speed;
    const cA = Math.cos(angle), sA = Math.sin(angle);
    const proj = pts.map(([x, y, z]) => {
      const rx = x * cA - z * sA, rz = x * sA + z * cA;
      const s = 1 / (2 - rz);                 // perspectiva
      return [W/2 + rx*R*s*1.6, H/2 + y*R*s*1.6, rz, s];
    });
    const [cr, cg, cb] = COLORS[ORB.mode] || COLORS.reposo;
    ctx.lineWidth = devicePixelRatio;
    for (let i = 0; i < N; i++) for (const j of neigh[i]) {
      if (j < i) continue;
      const a = proj[i], b = proj[j], op = Math.max(0, (a[2]+b[2])/2 + 1) * .18;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${op})`;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (const [x, y, z, s] of proj) {
      const op = Math.max(.15, (z + 1) * .5);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${op})`;
      ctx.beginPath(); ctx.arc(x, y, 1.7*devicePixelRatio*s, 0, 7); ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  const o = { mode: "reposo" };
  addEventListener("resize", () => { resize(); });
  resize(); build(); frame();
  return o;
})();

/* ══ CHIPS (botones de acción) ══ */
const CHIPS = [
  ["Enviar un correo", "quiero enviar un correo"], ["¿Qué es gen+?", "qué es gen+"],
  ["¿Usa internet?", "usas internet"], ["Tomar una foto", "tómame una foto"],
  ["Prender luces", "prende las luces"], ["Quiz", "quiero jugar el quiz"],
  ["Edificio ETABS", "modela un edificio de 5 pisos en etabs"],
  ["¿Cumple la norma?", "mi deriva de 0.009 cumple la norma para concreto armado"],
  ["Consultar la norma", "consultar la norma sobre la deriva máxima"],
  ["Informe a mi correo", "envíame el informe a mi correo"],
  ["Detección en vivo", "activa la detección en vivo"], ["¿Qué ves?", "qué ves"],
  ["Ciudad 3D", "muéstrame la ciudad 3d"], ["Desintégrate", "desintégrate"],
  ["Cambia de color", "cambia de color"],
];
function renderChips() {
  $("#chips").innerHTML = "";
  for (const [label, text] of CHIPS) {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label;
    b.onclick = () => sendText(text);
    $("#chips").appendChild(b);
  }
}

/* ══ FLUJO PRINCIPAL: texto → chat → voz ══ */
async function sendText(text) {
  if (!text) return;
  pushTranscript("user", text);
  setState("pensando");
  markPipe("GEMMA");
  try {
    const r = await api("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const reply = r.reply_display || r.reply || "";
    if (r.intent === "tool" || r.action) markPipe("AGENT FLOW");
    pushTranscript("agent", reply);
    handleAction(r);
    await speak(reply);
  } catch (e) {
    setState("reposo");
  } finally {
    refreshStatus();
  }
}

/* Efectos por acción devuelta por el backend */
function handleAction(r) {
  const a = r.action;
  if (a === "email_form") { openLead(); }
  else if (a === "quiz") { startQuiz(); }
  else if (a === "etabs" || a === "vision") { setState("ejecutando"); }
  else if (a === "photo") { flash(); }
}

/* ══ TTS ══ */
async function speak(text) {
  if (!text) { setState("reposo"); return; }
  setState("hablando");
  try {
    const res = await fetch("/api/tts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("audio")) {
      const buf = await res.arrayBuffer();
      const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
      audio.onended = () => setState("reposo");
      await audio.play();
      return;
    }
  } catch (e) { /* cae al navegador */ }
  // Fallback: voz del navegador
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES"; u.rate = 1.05;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith("es"));
    if (v) u.voice = v;
    u.onend = () => setState("reposo");
    speechSynthesis.speak(u);
  } else { setState("reposo"); }
}

/* ══ STT (voz → texto) ══ */
async function startListening() {
  if (recognizing) { stopListening(); return; }
  if (STT_ENGINE === "browser") return browserSTT();
  return recordSTT();   // whisper server-side
}
function browserSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Este navegador no soporta reconocimiento de voz. Usa los botones o activa Whisper."); return; }
  const rec = new SR();
  rec.lang = "es-PE"; rec.interimResults = false; rec.maxAlternatives = 1;
  recognizing = true; setState("escuchando");
  rec.onresult = (e) => { const t = e.results[0][0].transcript; recognizing = false; sendText(t); };
  rec.onerror = () => { recognizing = false; setState("reposo"); };
  rec.onend = () => { recognizing = false; if (document.body.dataset.state === "escuchando") setState("reposo"); };
  rec.start();
  window.__rec = rec;
}
function stopListening() { try { window.__rec && window.__rec.stop(); } catch {} if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); recognizing = false; }
async function recordSTT() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRec = new MediaRecorder(stream); chunks = [];
    mediaRec.ondataavailable = (e) => chunks.push(e.data);
    mediaRec.onstop = async () => {
      setState("pensando");
      const fd = new FormData();
      fd.append("audio", new Blob(chunks, { type: "audio/webm" }), "a.webm");
      const r = await api("/api/stt", { method: "POST", body: fd });
      if (r.text) sendText(r.text); else setState("reposo");
      stream.getTracks().forEach((t) => t.stop());
    };
    mediaRec.start(); recognizing = true; setState("escuchando");
    setTimeout(() => { if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); }, 7000);
  } catch (e) { alert("No pude acceder al micrófono."); setState("reposo"); }
}

/* ══ QUIZ ══ */
async function startQuiz() {
  const r = await api("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  if (r.pregunta) showQuestion(r);
}
function showQuestion(r) {
  const modal = $("#leadModal"); // reutilizamos el contenedor modal
  modal.querySelector(".modal-card").innerHTML = `
    <h3>Quiz · pregunta ${(r.idx ?? 0) + 1}/${r.total}</h3>
    <p style="margin-bottom:16px">${r.pregunta.texto}</p>
    <div id="quizOpts"></div>`;
  modal.hidden = false;
  r.pregunta.opciones.forEach((op, i) => {
    const b = document.createElement("button");
    b.className = "ghost"; b.style.cssText = "display:block;width:100%;margin-bottom:8px;text-align:left";
    b.textContent = op;
    b.onclick = async () => {
      const nx = await api("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "answer", idx: r.idx, opcion: i }) });
      speak(nx.reply);
      if (nx.fin) { modal.hidden = true; restoreModal(); }
      else showQuestion(nx);
    };
    $("#quizOpts").appendChild(b);
  });
}

/* ══ LEAD / CORREO ══ */
function openLead() { restoreModal(); $("#leadModal").hidden = false; }
function restoreModal() {
  $("#leadModal .modal-card").innerHTML = `
    <h3>Te envío tu informe</h3>
    <label>Nombre <input id="leadNombre" type="text" placeholder="Tu nombre"></label>
    <label>Empresa <input id="leadEmpresa" type="text" placeholder="Tu empresa"></label>
    <label>Correo <input id="leadCorreo" type="email" placeholder="tucorreo@empresa.com"></label>
    <div class="modal-actions"><button class="ghost" id="leadCancel">Cancelar</button><button class="primary" id="leadSend">Enviar informe</button></div>`;
  $("#leadCancel").onclick = () => $("#leadModal").hidden = true;
  $("#leadSend").onclick = async () => {
    const nombre = $("#leadNombre").value, correo = $("#leadCorreo").value, empresa = $("#leadEmpresa").value;
    if (!correo) { $("#leadCorreo").focus(); return; }
    const r = await api("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email_send", nombre, correo, empresa, resumen: "Interacción en el stand." }) });
    $("#leadModal").hidden = true; speak(r.reply); refreshStatus();
  };
}

/* ══ UI helpers ══ */
function pushTranscript(who, text) {
  const box = $("#transcript"), empty = box.querySelector(".empty"); if (empty) empty.remove();
  const d = document.createElement("div");
  d.className = "line " + who;
  d.innerHTML = `<span class="who">${who === "user" ? "Visitante" : "GEN+"}:</span> ${text}`;
  box.prepend(d);
}
function markPipe(name) {
  document.querySelectorAll(".pipeline span").forEach((s) => s.classList.toggle("active", s.textContent === name));
  setTimeout(() => document.querySelectorAll(".pipeline span").forEach((s) => s.classList.remove("active")), 1400);
}
function flash() {
  const f = document.createElement("div");
  f.style.cssText = "position:fixed;inset:0;background:#fff;z-index:99;opacity:.85;transition:opacity .5s";
  document.body.appendChild(f); requestAnimationFrame(() => f.style.opacity = "0");
  setTimeout(() => f.remove(), 500);
}

/* ══ STATUS polling ══ */
let uptime = 0;
async function refreshStatus() {
  try {
    const s = await api("/api/status");
    STT_ENGINE = s.engines.stt.engine; TTS_ENGINE = s.engines.tts.engine;
    $("#brandSub").textContent = "EDGE AI · AGENTE DE VOZ";
    setPill("stt", s.engines.stt.ok, (s.engines.stt.engine === "whisper" ? "CUDA" : s.engines.stt.engine));
    setPill("llm", s.engines.llm.ok, s.engines.llm.model);
    setPill("tts", s.engines.tts.ok, s.engines.tts.engine === "auto" ? "iapetus" : s.engines.tts.engine);
    setPill("flow", s.agentflow.enabled, s.agentflow.enabled ? "gen-flows" : "local");
    renderAgents(s); renderMetrics(s.metrics); renderExecs(s.ejecuciones);
    $("#footL").textContent = `stt ${s.engines.stt.ok ? "✓" : "—"} · llm ${s.engines.llm.ok ? "✓" : "—"} · tts ✓`;
  } catch (e) {}
}
function setPill(k, ok, val) {
  const p = document.querySelector(`.pill[data-k="${k}"]`); if (!p) return;
  p.classList.toggle("ok", !!ok); p.classList.toggle("bad", !ok);
  p.querySelector("b").textContent = val || "—";
}
function renderAgents(s) {
  const live = $("#agentsLive");
  live.innerHTML = `
    <div class="agent-card"><div><div class="name">Correo</div><div class="desc">Agent Flow · gen-flows · webhook</div></div>
      <span class="badge-live">EN VIVO</span></div>
    <div class="agent-card"><div><div class="name">ETABS · Edificio gen+</div><div class="desc">2–8 pisos por voz · sismo E.030 · derivas</div></div>
      <span class="badge-live">${s.tools.etabs ? "EN VIVO" : "DEMO"}</span></div>`;
  const cat = [["Aecodito · Centro de Operaciones", "gen-flows"], ["Buscador SEACE", "licitaciones"],
    ["Agente Inmobiliario", "web · WhatsApp"], ["Ventas Summit VIP", "gen-flows"],
    ["Verificador de Pagos", "vouchers"], ["Reuniones", "Meet / Zoom"]];
  $("#catalog").innerHTML = cat.map(([n, t]) => `<li><span>${n}</span><em>${t}</em></li>`).join("");
}
function renderMetrics(m) {
  const order = [["turnos", "Turnos"], ["correos", "Correos"], ["edificios", "Edificios"], ["informes", "Informes"], ["fotos", "Fotos"], ["leads", "Leads"]];
  $("#metrics").innerHTML = order.map(([k, l]) => `<div class="metric"><div class="v">${m[k] ?? 0}</div><div class="l">${l}</div></div>`).join("");
}
function renderExecs(ex) {
  const box = $("#execs");
  if (!ex || !ex.length) { box.innerHTML = `<p class="empty">Sin ejecuciones todavía.</p>`; return; }
  box.innerHTML = ex.map((e) => `<div class="row"><b>${e.tool}</b> ${e.detail}</div>`).join("");
}

/* ══ INIT ══ */
$("#btnTalk").onclick = startListening;
$("#btnClear").onclick = () => { $("#transcript").innerHTML = `<p class="empty">Nadie ha hablado todavía.</p>`; };
$("#btnMic").onclick = () => navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});
renderChips(); restoreModal(); setState("reposo"); refreshStatus();
setInterval(refreshStatus, 4000);
setInterval(() => { uptime++; const m = String(Math.floor(uptime / 60)).padStart(2, "0"), s = String(uptime % 60).padStart(2, "0"); $("#uptime").textContent = `${m}:${s}`; }, 1000);
if ("speechSynthesis" in window) speechSynthesis.getVoices();
