/* Orbe de particulas v4 — canvas 2D puro, sin librerias (el stand es offline).
   Esfera de Fibonacci con pliegues + rotacion en DOS ejes (tumble) + estelas de
   movimiento (fade destination-out) + destellos por particula + ondas al escuchar +
   respiracion en reposo. Paleta gen+: violeta -> azul sobre navy.
   v4: efectos por voz — desintegrarse (fisica radial + drag, queda como polvo que
   gira con la esfera), rearmarse (easing escalonado por particula, en espacio MODELO
   para que el destino siga vivo mientras rota) y cambio de paleta con transicion.
   API estable: orb.mount(canvas) · orb.setState(estado, nivel) · orb.playEnvelope(env, fps)
                · orb.fx(nombre, opts): 'disintegrate' | 'assemble' | 'color' | 'colorReset' */
(function () {
  const STATES = {
    idle:      { spin: 0.10, tilt: 0.05, turb: 0.06, radius: 1.00, hueA: 268, hueB: 220, fade: 0.30, tw: 0.5 },
    listening: { spin: 0.16, tilt: 0.09, turb: 0.15, radius: 1.10, hueA: 262, hueB: 214, fade: 0.26, tw: 0.8 },
    transcribing:{spin: 0.34, tilt: 0.16, turb: 0.24, radius: 1.02, hueA: 272, hueB: 224, fade: 0.24, tw: 1.0 },
    thinking:  { spin: 0.44, tilt: 0.22, turb: 0.34, radius: 1.02, hueA: 276, hueB: 226, fade: 0.22, tw: 1.2 },
    speaking:  { spin: 0.20, tilt: 0.10, turb: 0.20, radius: 1.06, hueA: 258, hueB: 216, fade: 0.24, tw: 0.9 },
    executing: { spin: 0.58, tilt: 0.28, turb: 0.16, radius: 1.04, hueA: 250, hueB: 210, fade: 0.20, tw: 1.4 },
    success:   { spin: 0.14, tilt: 0.06, turb: 0.08, radius: 1.10, hueA: 150, hueB: 190, fade: 0.26, tw: 1.0 },
    error:     { spin: 0.14, tilt: 0.06, turb: 0.30, radius: 0.96, hueA: 350, hueB: 20,  fade: 0.30, tw: 0.8 },
  };

  let cv, ctx, pts = [], N = 3000, dpr = 1;
  let state = "idle", target = STATES.idle, cur = Object.assign({}, STATES.idle);
  let level = 0, levelGoal = 0, t = 0, tx = 0, pulse = -1, burst = -1, raf = null;
  let env = null, envFps = 25, envStart = 0;
  let slowFrames = 0, lastT = 0, ripples = [], lastRipple = 0;
  // v3: cometas orbitales, sacudida en error y estrella fugaz en reposo
  let comets = [], shake = 0, star = null, nextStar = 0;
  // v4: efectos (desintegrar/armar) + paleta comandada por voz
  let fxMode = "none", fxT = 0, fxAuto = -1;   // none | out | dust | in
  let hueOver = null, satCur = 96;             // {a, b, sat} — null = paleta del estado
  const DUST_A = 0.14;                         // alpha del polvo: tenue pero visible

  function build(n) {
    pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r,
                 s: Math.random(), f: Math.random() * Math.PI * 2,
                 dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, sx0: 0, sy0: 0, sz0: 0, dl: 0 });
    }
  }

  // Desintegrar: velocidad radial (en espacio MODELO: rotar un radial sigue siendo
  // radial en pantalla) + tangencial aleatoria + drag. fast = ciclo de rearmado.
  function fxOut(fast) {
    fxMode = "out"; fxT = 0;
    for (const p of pts) {
      const m = (fast ? 2.6 : 1.7) + Math.random() * 2.4;
      // Direccion desde la posicion ACTUAL (base + offset): si llega durante un
      // rearmado, explota desde donde esta — resetear offsets aqui teletransportaria.
      p.vx = (p.x + p.dx) * m + (Math.random() - 0.5) * 1.5;
      p.vy = (p.y + p.dy) * m + (Math.random() - 0.5) * 1.5;
      p.vz = (p.z + p.dz) * m + (Math.random() - 0.5) * 1.5;
      p.dl = Math.random() * (fast ? 0.10 : 0.35);
    }
  }

  // Rearmar: cada particula vuela de donde quedo hacia su sitio en la esfera,
  // con arranque escalonado (p.s) — el barrido se ve organico, no mecanico.
  function fxIn() {
    fxMode = "in"; fxT = 0;
    for (const p of pts) {
      p.sx0 = p.dx; p.sy0 = p.dy; p.sz0 = p.dz;
      p.dl = p.s * 0.55;
    }
  }

  // Ruido barato y deterministico: producto de senos. Suficiente para los pliegues.
  function fold(p, tt) {
    return Math.sin(p.x * 3.1 + tt) * Math.sin(p.y * 2.7 - tt * 0.8) * Math.cos(p.z * 3.4 + tt * 0.6);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(cv.clientWidth), h = Math.round(cv.clientHeight);
    if (!w || !h) return false;
    cv.width = w * dpr;
    cv.height = h * dpr;
    return true;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!cv.width || !cv.height) { resize(); return; }
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;

    // Degradacion automatica si el equipo no da los 30 fps (feria, Jetson).
    // Nunca durante un efecto: build() borraria los offsets y el polvo "resucitaria".
    if (dt > 0.033 && fxMode === "none") {
      if (++slowFrames > 90 && N > 1500) { N = 1500; build(N); slowFrames = 0; }
    } else slowFrames = 0;

    // La paleta pedida por voz manda, salvo en success/error (esos colores INFORMAN).
    const informa = state === "success" || state === "error";
    for (const k in target) {
      let goal = target[k];
      if (hueOver && !informa) {
        if (k === "hueA") goal = hueOver.a;
        else if (k === "hueB") goal = hueOver.b;
      }
      cur[k] += (goal - cur[k]) * Math.min(1, dt * 4);
    }
    const satGoal = (hueOver && !informa && hueOver.sat) ? hueOver.sat : 96;
    satCur += (satGoal - satCur) * Math.min(1, dt * 4);
    if (!Number.isFinite(satCur)) satCur = 96;

    // Linea de tiempo de los efectos + factor global de "cuerpo" (atenua halo,
    // ecualizador y cometas mientras el orbe esta deshecho).
    let coreK = 1;
    if (fxMode !== "none") {
      fxT += dt;
      if (!Number.isFinite(fxT)) fxT = 0;
      if (fxMode === "out") {
        coreK = Math.max(0.25, 1 - (fxT / 1.5) * 0.75);
        if (fxT > 1.5) { fxMode = "dust"; fxT = 0; }
      } else if (fxMode === "dust") {
        coreK = 0.25;
      } else if (fxMode === "in") {
        coreK = 0.25 + 0.75 * Math.min(1, fxT / 1.5);
        if (fxT > 1.6) {
          fxMode = "none"; burst = 0;                 // flourish al completar el armado
          ripples.push({ r: -1, a: 0.28, hue: cur.hueB });
          for (const p of pts) { p.dx = p.dy = p.dz = 0; p.vx = p.vy = p.vz = 0; }
        }
      }
      if (fxAuto > 0) { fxAuto -= dt; if (fxAuto <= 0 && (fxMode === "out" || fxMode === "dust")) { fxIn(); fxAuto = -1; } }
    }

    if (env) {
      const i = Math.floor((now - envStart) / 1000 * envFps);
      if (!(i >= 0) || i >= env.length) { env = null; levelGoal = 0; }
      else { const v = +env[i]; levelGoal = Number.isFinite(v) ? v : 0; }
    }
    // Autosanado: un solo NaN que entre (mensaje raro por WS) no puede matar el orbe para siempre.
    if (!Number.isFinite(levelGoal)) levelGoal = 0;
    if (!Number.isFinite(level)) level = 0;
    level += (levelGoal - level) * Math.min(1, dt * 12);

    t += dt * cur.spin;
    tx += dt * cur.tilt;                       // precesion: segundo eje de giro
    if (pulse >= 0) { pulse += dt * 1.6; if (pulse > 1.6) pulse = -1; }
    if (burst >= 0) { burst += dt * 2.2; if (burst > 1) burst = -1; }

    const W = cv.width, H = cv.height;

    // Estelas: en vez de borrar, desvanecer lo anterior (fade mas bajo = estela mas larga)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0," + cur.fade.toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);

    const breath = state === "idle" ? 1 + 0.022 * Math.sin(t * 2.2) : 1;
    const R = Math.min(W, H) * 0.34 * breath;
    // Deriva organica del centro (Lissajous sutil; doble al pensar) + sacudida en error
    const drift = state === "thinking" ? 2 : 1;
    let cx = W / 2 + Math.sin(t * 0.9 + 1.3) * R * 0.018 * drift;
    let cy = H / 2 + Math.cos(t * 0.66) * R * 0.014 * drift;
    if (shake > 0.001) {
      cx += (Math.random() - 0.5) * shake * R * 0.07;
      cy += (Math.random() - 0.5) * shake * R * 0.04;
      shake *= Math.max(0, 1 - dt * 2.6);
    }
    const cosY = Math.cos(t), sinY = Math.sin(t);
    const cosX = Math.cos(tx * 0.7), sinX = Math.sin(tx * 0.7);

    // Halo respirante detras de la esfera
    ctx.globalCompositeOperation = "lighter";
    const glowR = R * (1.5 + level * 0.3);
    const g = ctx.createRadialGradient(cx, cy, R * 0.22, cx, cy, glowR);
    const gHue = ((cur.hueA + cur.hueB) / 2 + Math.sin(t * 0.6) * 6).toFixed(0);
    const gSat = satCur.toFixed(0);
    g.addColorStop(0, "hsla(" + gHue + "," + gSat + "%,60%," + ((0.15 + level * 0.14) * coreK).toFixed(3) + ")");
    g.addColorStop(0.55, "hsla(" + gHue + "," + gSat + "%,50%," + (0.05 * coreK).toFixed(3) + ")");
    g.addColorStop(1, "hsla(" + gHue + "," + gSat + "%,45%,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

    // Ondas al escuchar: anillos que nacen del orbe al ritmo de tu voz
    if (state === "listening" && now - lastRipple > 620 - level * 260) {
      ripples.push({ r: R * 0.9, a: 0.28 + level * 0.3 });
      lastRipple = now;
    }
    ripples = ripples.filter(rp => rp.a > 0.01);
    for (const rp of ripples) {
      if (rp.r < 0) rp.r = R * 0.95;          // shockwave de cambio de estado: nace del orbe
      rp.r += dt * R * (rp.hue ? 1.4 : 0.9);  // las de estado corren mas rapido
      rp.a *= 1 - dt * 1.7;
      ctx.beginPath();
      ctx.arc(cx, cy, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = "hsla(" + (rp.hue || 220) + ",90%,70%," + rp.a.toFixed(3) + ")";
      ctx.lineWidth = (rp.hue ? 1.8 : 1.4) * dpr;
      ctx.stroke();
    }

    // Anillo ecualizador al hablar: 20 arcos cuya longitud sigue la voz de Iapetus
    if (state === "speaking" || env) {
      const nA = 20, base = R * 1.24;
      const aAlpha = 0.07 + level * 0.30;
      for (let i = 0; i < nA; i++) {
        const a0 = (i / nA) * 6.283 + t * 0.5;
        const len = 0.10 + level * 0.40 + 0.05 * Math.sin(now * 0.006 + i * 1.7);
        ctx.beginPath();
        ctx.arc(cx, cy, base, a0, a0 + len);
        ctx.strokeStyle = "hsla(" + cur.hueB.toFixed(0) + "," + satCur.toFixed(0) + "%,68%," + (aAlpha * coreK).toFixed(3) + ")";
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }
    }

    // Estrella fugaz ocasional en reposo (la pantalla nunca se ve muerta)
    if (state === "idle") {
      if (!star && now > nextStar) {
        star = { x: -W * 0.05, y: H * (0.06 + Math.random() * 0.3), vx: W * (0.5 + Math.random() * 0.3), vy: H * 0.09 };
        if (Math.random() < 0.5) { star.x = W * 1.05; star.vx = -star.vx; }
      }
      if (star) {
        star.x += star.vx * dt; star.y += star.vy * dt;
        ctx.fillStyle = "hsla(215,95%,82%,0.8)";
        ctx.fillRect(star.x, star.y, 2.2 * dpr, 2.2 * dpr);
        if (star.x < -W * 0.06 || star.x > W * 1.06) { star = null; nextStar = now + 6000 + Math.random() * 6000; }
      }
    } else if (star) { star = null; nextStar = now + 4000; }

    const twSpeed = now * 0.004 * cur.tw;
    const burstK = burst >= 0 ? Math.sin(burst * Math.PI) * 0.22 : 0;  // exito: expansion breve

    for (const p of pts) {
      // Efectos v4: offset en espacio MODELO (el polvo hereda el giro de la esfera).
      let fxK = 1;
      if (fxMode === "out") {
        if (fxT > p.dl) {
          p.dx += p.vx * dt; p.dy += p.vy * dt; p.dz += p.vz * dt;
          const dr = Math.max(0, 1 - dt * 0.9);       // drag: el polvo se asienta
          p.vx *= dr; p.vy *= dr; p.vz *= dr;
        }
        fxK = 1 - Math.max(0, Math.min(1, (fxT - p.dl) / 1.2)) * (1 - DUST_A);
      } else if (fxMode === "dust") {
        p.dx += Math.sin(t * 0.6 + p.f * 6.28) * dt * 0.06;
        p.dy += Math.cos(t * 0.5 + p.f * 4.1) * dt * 0.06;
        fxK = DUST_A + 0.05 * Math.sin(twSpeed + p.f * 6.28);
      } else if (fxMode === "in") {
        const e = Math.max(0, Math.min(1, (fxT - p.dl) / 0.95));
        const ease = 1 - Math.pow(1 - e, 3);          // easeOutCubic: frena al llegar
        p.dx = p.sx0 * (1 - ease); p.dy = p.sy0 * (1 - ease); p.dz = p.sz0 * (1 - ease);
        fxK = DUST_A + (1 - DUST_A) * ease;
      }
      const px = p.x + p.dx, py = p.y + p.dy, pz = p.z + p.dz;

      // Giro en Y (spin) + inclinacion en X (tumble): la esfera "voltea", no solo rota
      let x = px * cosY - pz * sinY;
      let z = px * sinY + pz * cosY;
      let y = py * cosX - z * sinX;
      z = py * sinX + z * cosX;

      const d = 1 + fold(p, t) * (cur.turb + level * 0.22) + level * 0.06 + burstK;
      const rr = R * cur.radius * d;
      // El polvo sale de la esfera unitaria: clamp para que un z lejano no
      // genere alphas negativos (fillStyle invalido = color anterior, bug sutil).
      const depth = Math.max(0, Math.min(1.6, (z + 1) / 2));
      const persp = 0.75 + depth * 0.45;
      const sx = cx + x * rr * persp;
      const sy = cy + y * rr * persp;

      // Luz direccional + destello individual (cada particula titila a su fase)
      const lam = Math.max(0, (-x * 0.5 + -y * 0.62 + z * 0.6)) * 0.85 + 0.15;
      const tw = 0.75 + 0.25 * Math.sin(twSpeed + p.f * 6.28);

      let a = (0.16 + depth * 0.6) * (0.5 + lam * 0.8) * tw * fxK;
      let size = (1.0 + depth * 2.1) * dpr * (0.85 + p.s * 0.3) * (0.75 + 0.25 * fxK);
      if (pulse >= 0) {
        const band = 1 - Math.min(1, Math.abs((1 - depth) - (pulse - 0.3)) * 5);
        if (band > 0) { a = Math.min(1, a + band * 0.85); size *= 1 + band * 1.3; }
      }
      const hue = cur.hueA + (cur.hueB - cur.hueA) * ((y + 1) / 2) + Math.sin(t * 0.5) * 5;
      const light = 50 + depth * 14 + lam * 18;
      ctx.fillStyle = "hsla(" + hue.toFixed(0) + "," + satCur.toFixed(0) + "%," + light.toFixed(0) + "%," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
      ctx.fillRect(sx, sy, size, size);
    }

    // Cometas orbitales: pocos, brillantes, con estela gratis (el fade ya la deja).
    // Orbitan en planos inclinados propios y aceleran con el estado y la voz.
    for (const c of comets) {
      c.a += dt * c.sp * (0.6 + cur.spin * 2.4 + level * 1.2);
      const cp = Math.cos(c.pl), sp2 = Math.sin(c.pl);
      const ox = Math.cos(c.a) * cp, oy = Math.cos(c.a) * sp2, oz = Math.sin(c.a);
      let x = ox * cosY - oz * sinY;
      let z = ox * sinY + oz * cosY;
      let y = oy * cosX - z * sinX;
      z = oy * sinX + z * cosX;
      const rr = R * c.rr;
      const depth = (z + 1) / 2, persp = 0.75 + depth * 0.45;
      const sx = cx + x * rr * persp, sy = cy + y * rr * persp;
      const a = (0.22 + depth * 0.6) * (0.4 + 0.6 * coreK);
      const size = (1.5 + depth * 2.2) * dpr;
      ctx.fillStyle = "hsla(" + cur.hueB.toFixed(0) + "," + satCur.toFixed(0) + "%,74%," + a.toFixed(3) + ")";
      ctx.fillRect(sx, sy, size, size);
    }

    ctx.globalCompositeOperation = "source-over";
  }

  window.orb = {
    mount: function (canvas) {
      cv = canvas;
      ctx = cv.getContext("2d");
      build(N);
      comets = Array.from({ length: 8 }, () => ({
        a: Math.random() * 6.283, sp: 0.55 + Math.random() * 0.9,
        pl: Math.random() * Math.PI, rr: 1.18 + Math.random() * 0.24,
      }));
      nextStar = performance.now() + 5000;
      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("load", resize);
      if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
      if (!raf) raf = requestAnimationFrame(frame);
    },
    setState: function (s, lv) {
      if (!STATES[s]) return;
      // Si el orbe esta hecho polvo y le toca trabajar, se rearma solo: el agente
      // "vuelve a la vida" para escuchar/hablar. En reposo puede quedarse deshecho.
      if (s !== "idle" && (fxMode === "dust" || fxMode === "out")) { fxIn(); fxAuto = -1; }
      if (s === "executing" && state !== "executing") pulse = 0;
      if (s === "success" && state !== "success") burst = 0;
      if (s !== state && s !== "idle") {
        // Shockwave de transicion: un anillo del color del estado nuevo (r<0 = nace del orbe)
        ripples.push({ r: -1, a: s === "error" ? 0.34 : 0.2, hue: s === "success" ? 152 : s === "error" ? 4 : 226 });
      }
      if (s === "error" && state !== "error") shake = 1;
      state = s;
      target = STATES[s];
      if (typeof lv === "number" && isFinite(lv)) levelGoal = Math.max(0, Math.min(1, lv));
      else if (s !== "speaking") levelGoal = 0;
    },
    playEnvelope: function (e, fps) {
      if (!e || !e.length) return;
      env = e; envFps = Number(fps) || 25; envStart = performance.now();
      this.setState("speaking");
    },
    // v4: efectos comandados por voz. Todos son seguros de llamar en cualquier momento.
    fx: function (name, o) {
      o = o || {};
      if (name === "disintegrate") {
        if (fxMode === "none" || fxMode === "in") fxOut(false);
        fxAuto = -1;                                   // deshecho hasta nueva orden
      } else if (name === "assemble") {
        if (fxMode === "dust" || fxMode === "out") { fxIn(); fxAuto = -1; }
        else if (fxMode === "none") { fxOut(true); fxAuto = 0.6; }  // intacto: ciclo rapido
        // durante 'in' ya se esta armando: no-op (re-explotar seria absurdo)
      } else if (name === "color") {
        if (o.random) {
          const h = Math.random() * 360;
          // SIN modulo: hue>360 es valido en CSS (periodico) y la interpolacion
          // por particula queda siempre a 38 grados — con % el wrap pintaba arcoiris.
          hueOver = { a: h, b: h + 38, sat: 96 };
        } else {
          hueOver = { a: +o.hueA || 0, b: +o.hueB || 0, sat: +o.sat || 96 };
        }
        if (!Number.isFinite(hueOver.a) || !Number.isFinite(hueOver.b)) hueOver = null;
        else ripples.push({ r: -1, a: 0.3, hue: hueOver.a });
      } else if (name === "colorReset") {
        hueOver = null;
        ripples.push({ r: -1, a: 0.25, hue: 226 });
      }
    },
  };
})();
