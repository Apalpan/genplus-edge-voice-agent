/* ═══ demo.js — VISTA PREVIA WEB del Edge Voice Agent (stand gen+) ═══════════
   Reemplaza el backend real (FastAPI + WebSocket) por un bus simulado que habla
   el MISMO contrato de eventos que el orquestador. La UI (index.html) no se toca:
   cree estar conectada al agente del stand. En el evento, el sistema completo
   corre local-first en el equipo físico (Whisper + Gemma 4 + Piper locales).    */
(function () {
  "use strict";

  /* ── estado simulado ─────────────────────────────────────────────────────── */
  const stats = { interacciones: 0, correos: 0, edificios: 0, informes: 0, fotos: 0, leads: 0 };
  const players = [
    { nombre: "María F.", empresa: "Constructora Andes", score: 3, total: 3 },
    { nombre: "Jorge L.", empresa: "Inmobiliaria Sur", score: 2, total: 3 },
    { nombre: "Valeria Q.", empresa: "Estudio VQ", score: 2, total: 3 },
    { nombre: "Renzo T.", empresa: "PUCP", score: 1, total: 3 },
  ];
  let sockets = [];
  let pendingEmail = null, pendingPlayer = null, idleTimer = null;

  /* ── voz del navegador (el stand real usa Iapetus pre-renderizada + Piper) ── */
  function voice(text) {
    if (!("speechSynthesis" in window)) return 1200;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES"; u.rate = 1.05;
      const v = speechSynthesis.getVoices().find((x) => /es[-_]/.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
    return Math.max(1400, text.length * 62);
  }
  function envelope(ms) {                    // sobre de amplitud para que el orbe "hable"
    const n = Math.max(10, Math.round(ms / 40)), env = [];
    for (let i = 0; i < n; i++) {
      const w = Math.sin(i * 0.9) * 0.25 + Math.sin(i * 0.23) * 0.2;
      env.push(Math.max(0.05, Math.min(1, 0.5 + w + (Math.random() - 0.5) * 0.3)));
    }
    return env;
  }

  /* ── bus de eventos (imita publish() del server) ─────────────────────────── */
  function emit(type, data, status) {
    const msg = Object.assign({ type }, data || {});
    if (status !== undefined) msg.state = { status };
    const raw = JSON.stringify(msg);
    sockets.forEach((ws) => { if (ws.onmessage) ws.onmessage({ data: raw }); });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function agentSay(text, status) {
    const ms = voice(text);
    emit("agent", { text }, "speaking");
    emit("speak", { env: envelope(ms), fps: 25, voz: "kore" });
    emit("metric", { stage: "tts", ms: 60 + Math.round(Math.random() * 40) });
    await sleep(ms);
    emit("status", {}, status || "idle");   // cierra el turno sin duplicar transcripción
  }
  async function userTurn(text) {
    stats.interacciones++;
    emit("user", { text }, "transcribing");
    emit("metric", { stage: "stt", ms: 380 + Math.round(Math.random() * 220) });
    await sleep(420);
  }

  /* ── guiones por intención (espejo del router real) ──────────────────────── */
  const FAQ_GEN = "gen+ es la empresa de implementación premium de inteligencia artificial, BIM y automatización para la construcción. Diagnosticamos tus procesos, desplegamos agentes y medimos el impacto real. AECODE forma, y gen+ implementa.";
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  async function route(text) {
    await userTurn(text);
    const t = norm(text);

    const appMatch = [
      [/ai process/, "AI Process"],
      [/trainer ?math|matematic/, "TrainerMath"],
      [/vision ?pro|vision computacional/, "VisionPro"],
      [/state of ai|estado de la ia/, "State of AI in AEC"],
      [/summit/, "AI Construction Summit"],
    ].find(([pattern]) => pattern.test(t));
    if (appMatch && /abre|muestra|entra|llevame/.test(t)) {
      emit("app_open", { ok: true, label: appMatch[1] }, "executing");
      return agentSay(`${appMatch[1]} está disponible en la pestaña Ecosistema. En la aplicación local también lo abro directamente por voz.`);
    }

    if (/agent ?flow|agenda|centro de operaciones|publicidad/.test(t)) {
      emit("agentflow", { phase: "start", agent: "Genbot Voice Gateway" }, "thinking");
      await sleep(900);
      emit("metric", { stage: "flow", ms: 870 });
      emit("agentflow", { phase: "done", agent: "operations", run_id: "preview" }, "speaking");
      return agentSay("Genbot puede consultar calendario, reuniones, contactos y reportes mediante AgentFlow. Esta página lo simula; la ejecución real corre desde la computadora autorizada.");
    }
    if (/controla.*pc|controlar.*pc|abre.*calculadora|computadora/.test(t)) {
      emit("pc_action", { ok: true, action: "vista previa" }, "executing");
      return agentSay("En la aplicación local puedo abrir aplicaciones aprobadas y controlar el volumen. Esta vista web no recibe permisos sobre tu computadora.");
    }

    if (/correo|email|informe.*correo|env[ií]a/.test(t) && !/informe del edificio/.test(t)) {
      emit("email_prompt", {}, "waiting");
      await agentSay("Con gusto. Escribe tu correo en la pantalla, ahí mismo te llega.", "waiting");
      pendingEmail = true;
      return;
    }
    if (/que es gen|quien es gen|a que se dedica/.test(t)) {
      emit("metric", { stage: "router", ms: 2 });
      return agentSay(FAQ_GEN);
    }
    if (/internet|conectado/.test(t)) {
      emit("metric", { stage: "router", ms: 2 });
      return agentSay("Whisper y Gemma 4 corren localmente. AgentFlow se usa solo cuando Genbot necesita consultar servicios y agentes remotos.");
    }
    if (/foto/.test(t)) {
      await agentSay("¡Sonríe! Tres, dos, uno.", "executing");
      stats.fotos++;
      return agentSay("Lista. En el stand la verías impresa en el panel de fotos.");
    }
    if (/luces/.test(t)) {
      const on = !/apaga/.test(t);
      emit("lights", { on }, "executing");
      return agentSay(on ? "Luces encendidas." : "Luces apagadas.");
    }
    if (/quiz|trivia|juego/.test(t)) return quizFlow();
    if (/deriva/.test(t) && /cumple/.test(t)) {
      emit("metric", { stage: "router", ms: 2 });
      await agentSay("Reviso las derivas del último edificio contra la norma E punto cero treinta.", "executing");
      emit("derivas", { limite: 0.007, pisos: 8, t1: 0.82, cumple: true, deriva_x: 0.0052, deriva_y: 0.0047 }, "executing");
      return agentSay("Cumple. La deriva máxima fue cero punto cero cero cinco dos, bajo el límite de cero punto cero cero siete para concreto armado.");
    }
    if (/norma|e\.?030|e\.?060/.test(t)) {
      emit("norma", { phase: "start", pregunta: text }, "thinking");
      emit("metric", { stage: "router", ms: 3 });
      await sleep(1600);
      emit("metric", { stage: "llm", ms: 1540 });
      emit("norma", {
        phase: "done", pregunta: text,
        respuesta: "Para concreto armado, la distorsión máxima de entrepiso es 0.007, según la Tabla N.º 11 de la E.030. En acero el límite sube a 0.010 y en albañilería baja a 0.005.",
        fuentes: ["E.030 · Art. 5.2 · Tabla N°11"],
      }, "speaking");
      return agentSay("La deriva máxima para concreto armado es cero punto cero cero siete. Te lo dejo citado en pantalla con su artículo.");
    }
    if (/etabs|edificio|pisos/.test(t)) {
      const pisos = Math.max(2, Math.min(8, parseInt((t.match(/(\d+)\s*piso/) || [])[1] || "8", 10)));
      emit("etabs", { kind: "demo", phase: "start", pisos }, "executing");
      await agentSay(`Levanto un edificio de ${pisos} pisos y corro el sismo de la norma. Dame unos segundos.`, "executing");
      await sleep(2400);
      emit("metric", { stage: "etabs", ms: 2380 });
      emit("etabs", { kind: "demo", phase: "done", pisos, secs: 2.4, detalle: `${pisos} pisos · sismo E.030 · ✓ analizado` }, "executing");
      stats.edificios++;
      emit("derivas", { limite: 0.007, pisos, t1: 0.11 * pisos, cumple: true, deriva_x: 0.004 + pisos * 0.0002, deriva_y: 0.0038 + pisos * 0.0002 }, "speaking");
      return agentSay("Edificio analizado. Las derivas cumplen la norma; el veredicto está en pantalla. En el stand esto corre con ETABS de verdad, por automatización.");
    }
    if (/clima|temperatura/.test(t)) {
      emit("clima", { temp: 16, desc: "Nublado (garúa fina)", sensacion: 15, humedad: 88, viento: 14 }, "speaking");
      return agentSay("En Lima hay dieciséis grados, cielo nublado con garúa fina. Clásico julio limeño.");
    }
    if (/camara|deteccion|epp|casco|chaleco|que ves|vision/.test(t)) {
      return agentSay("La detección de cascos y chalecos corre con nuestra cámara en el stand físico, con el modelo de obra de Vision Pro. Ven a probarla en vivo.");
    }
    if (/ciudad|ainy|gemelo/.test(t)) {
      const app = /ainy/.test(t) ? "ainy" : "ciudad";
      emit("gestos", { on: true, app }, "executing");
      return agentSay("Abro el gemelo tres D. En la aplicación local también puedes navegarlo por voz y gestos frente a la cámara.");
    }
    if (/desintegra/.test(t)) {
      emit("orb_fx", { fx: "disintegrate" }, "executing");
      await sleep(1500);
      emit("orb_fx", { fx: "assemble" }, "idle");
      return agentSay("Y de vuelta. Puro edge.");
    }
    if (/color/.test(t)) {
      emit("orb_fx", { fx: "color", hueA: 150 + Math.random() * 160, hueB: 180 + Math.random() * 120, sat: 80 }, "idle");
      return agentSay("¿Qué tal este?");
    }
    if (/hola|quien eres/.test(t)) {
      return agentSay("Hola, soy Genbot, el agente de voz de gen+. Escucho con Whisper, razono con Gemma 4 y conecto herramientas mediante AgentFlow.");
    }
    if (/adios|chau|gracias/.test(t)) return agentSay("¡Gracias por visitarnos! Pasa por el stand de gen+ y llévate tu diagnóstico.");
    emit("metric", { stage: "llm", ms: 900 + Math.round(Math.random() * 600) });
    return agentSay("Buena pregunta. En la aplicación real la respondo con Gemma 4 en la tarjeta gráfica de esta computadora. Esta es una vista previa segura del sistema completo.");
  }

  /* ── quiz con ranking (flujo completo, interactivo) ──────────────────────── */
  const QUIZ = [
    { q: "¿Qué significa BIM: modelado de información de construcción, o manejo básico de inventarios?", a: "Modelado de información de construcción.", ok: true },
    { q: "Según la E punto cero treinta, ¿la deriva máxima en concreto armado es cero punto cero cero siete, o cero punto cero dos?", a: "Cero punto cero cero siete.", ok: true },
    { q: "¿Un agente edge corre en la nube, o en un equipo local como este?", a: "En un equipo local. Por eso no dependo de internet.", ok: false },
  ];
  async function quizFlow() {
    await agentSay("¡Va el quiz de inteligencia artificial en construcción! Tres preguntas rápidas.", "executing");
    let score = 0;
    for (const item of QUIZ) {
      await agentSay(item.q, "listening");
      await sleep(900);
      await userTurn(item.ok ? item.a : "mmm… ¿en la nube?");
      if (item.ok) { score++; await agentSay("¡Correcto!"); }
      else await agentSay("Casi: corro aquí mismo, local. Esa es la gracia del edge.");
    }
    emit("quiz_score", { score, total: QUIZ.length }, "speaking");
    await agentSay(`Hiciste ${score} de ${QUIZ.length}. ¿Entras al ranking del día? Escribe tu nombre en pantalla.`, "waiting");
    emit("player_prompt", {}, "waiting");
    pendingPlayer = { score, total: QUIZ.length };
  }

  /* ── WebSocket falso (mismo contrato que ui/server.py) ───────────────────── */
  class FakeWS {
    constructor() {
      this.readyState = 1;
      sockets.push(this);
      setTimeout(() => {
        if (this.onopen) this.onopen();
        emit("status", {}, "idle");
        setTimeout(() => agentSay("Hola, soy Genbot. Esta es la vista previa web: toca un ejemplo para probar el flujo."), 1400);
        armIdle();
      }, 300);
    }
    send(raw) {
      let m = {}; try { m = JSON.parse(raw); } catch (e) { return; }
      armIdle();
      if (m.cmd === "say" && m.text) route(m.text);
      else if (m.cmd === "listen") {
        emit("status", {}, "listening");
        let i = 0;
        const iv = setInterval(() => { emit("level", { level: 0.2 + Math.random() * 0.6 }); if (++i > 10) clearInterval(iv); }, 120);
        setTimeout(() => route("¿qué es gen+?"), 1600);   // sin micrófono: demo guiada
      } else if (m.cmd === "email_to") {
        pendingEmail = null;
        emit("email_prompt_close", {}, "executing");
        emit("exec", { agent: "Correo", subject: "Saludos desde el stand de gen+", to: m.to }, "executing");
        emit("metric", { stage: "flow", ms: 640 + Math.round(Math.random() * 300) });
        setTimeout(() => {
          stats.correos++;
          emit("exec_result", { ok: true, run_id: "demo-" + Math.random().toString(36).slice(2, 8) });
          agentSay("Simulación completada. En la computadora del stand, AgentFlow sí entrega el correo y muestra su identificador de ejecución.");
        }, 900);
      } else if (m.cmd === "email_cancel") {
        pendingEmail = null;
        emit("email_prompt_close", {}, "idle");
      } else if (m.cmd === "player" && pendingPlayer) {
        const rec = { nombre: m.nombre || "Visitante", empresa: m.empresa || "", score: pendingPlayer.score, total: pendingPlayer.total };
        players.push(rec); players.sort((a, b) => b.score - a.score);
        stats.leads++;
        pendingPlayer = null;
        emit("player_prompt_close", {}, "speaking");
        emit("leaderboard", { reload: true, lider: rec.nombre }, "speaking");
        agentSay(`¡Listo, ${rec.nombre}! Ya estás en el ranking. En el stand, tu lead viaja directo a gen flows.`);
      } else if (m.cmd === "player_cancel") {
        pendingPlayer = null;
        emit("player_prompt_close", {}, "idle");
      }
    }
    close() { this.readyState = 3; sockets = sockets.filter((w) => w !== this); }
  }
  FakeWS.OPEN = 1;
  window.WebSocket = FakeWS;

  /* ── modo atracción (como el real: cada rato invita solo) ────────────────── */
  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      emit("attract", {}, "idle");
      voice("Acércate y pruébame: soy el agente de voz del stand de gen+.");
      armIdle();
    }, 45000);
  }

  /* ── fetch falso para /api/* y /photo ────────────────────────────────────── */
  const realFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    const u = String(url);
    const json = (obj) => Promise.resolve(new Response(JSON.stringify(obj), { headers: { "Content-Type": "application/json" } }));
    if (u.includes("/api/info")) return json({ assistant: "Genbot", stt: "faster-whisper small", stt_device: "CUDA", brain: "gemma4:latest", tts: "Iapetus + Piper", tts_chip: "Iapetus", agentflow_host: "AgentFlow", agentflow_agent: true, to: "coordinación gen+" });
    if (u.includes("/api/stats")) return json(stats);
    if (u.includes("/api/salud")) return json({ ram_libre_gb: 9.4, ram_total_gb: 32 });
    if (u.includes("/api/mics")) return json({ mics: [{ id: 0, name: "Micrófono del stand (demo)", api: "WASAPI", current: true }] });
    if (u.includes("/api/mic/test")) return json({ rms: 0.041, pico: 0.32, texto: "hola gen plus", veredicto: "Se te escucha claro ✓ (demo)" });
    if (u.includes("/api/mic")) return json({ ok: true, name: "Micrófono del stand (demo)" });
    if (u.includes("/api/fotos")) return json({ fotos: [] });
    if (u.includes("/api/vision")) return json({ activo: false, conteo: {}, fps: 0 });
    if (u.includes("/api/leaderboard")) {
      const hh = new Date().getHours();
      return json({ hora: `${String(hh).padStart(2, "0")}:00–${String((hh + 1) % 24).padStart(2, "0")}:00`, jugadores_hora: players.length, top: players.slice(0, 10) });
    }
    if (u.includes("/api/informe")) return json({ error: "solo en el stand" });
    if (u.includes("/api/twin")) return json({ ok: true });
    if (u.includes("/photo")) return realFetch("static/gen-logo-navy.png");
    return realFetch(url, opts);
  };

  /* ── sello de vista previa en el header ──────────────────────────────────── */
  addEventListener("DOMContentLoaded", () => {
    const chips = document.getElementById("chips");
    if (chips) {
      const c = document.createElement("span");
      c.className = "chip";
      c.style.cssText = "color:#EED611;border-color:rgba(238,214,17,.4)";
      c.innerHTML = '<span class="led" style="background:#EED611"></span>DEMO';
      chips.prepend(c);
    }
    if ("speechSynthesis" in window) speechSynthesis.getVoices();
  });
})();
