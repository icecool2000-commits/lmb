/* biribol-anim.js – logos animados e abertura "cortada na piscina" (Biribol Mococa e Liga Metropolitana).
   Mesmo arquivo nos dois apps (fonte em torneio-src). Script clássico: expõe window.BiribolAnim = {logo, abertura}.
   - logo(el, tipo, {entrada, ciclo}): monta o logo em camadas (imagens em anim/) e anima com Web Animations
     (só transform/opacity/clip-path: roda no compositor). tipo "bm" = Biribol Mococa, "lmb" = Liga Metropolitana.
   - abertura(cfg): tela cheia com uma cena em SVG numa piscina de biribol (levantamento, atacante salta e corta,
     bola explode na água, PONTO!), uma onda cobre a tela e revela o logo animado; final parado 2 s; some suave.
     Linha do tempo própria em requestAnimationFrame (tudo calculado pelo relógio, sem passos soltos). */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const reduz = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- estilos ----------
  const CSS = `
.ba-logo{position:relative;isolation:isolate;user-select:none;-webkit-user-select:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ba-logo img{position:absolute;left:0;top:0;width:100%;height:auto;display:block;will-change:transform,opacity;backface-visibility:hidden;pointer-events:none}
.ba-logo .ba-cam,.ba-logo .ba-corpo{position:absolute;inset:0;will-change:transform,opacity}
.ba-logo .ba-clipbola{position:absolute;left:0;top:0;width:100%;overflow:hidden}
.ba-logo .ba-brilho{position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.ba-logo .ba-brilho i{position:absolute;top:-10%;bottom:-10%;left:0;width:45%;transform:translateX(-140%) skewX(-18deg);opacity:0;
  background:linear-gradient(90deg,transparent,rgb(255 255 255 / .15) 30%,rgb(255 255 255 / .85) 50%,rgb(255 255 255 / .15) 70%,transparent);will-change:transform,opacity}
.ba-logo .ba-choque{position:absolute;border-radius:50%;border:3px solid rgb(255 255 255 / .9);box-shadow:0 0 18px rgb(255 255 255 / .6);opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.2);will-change:transform,opacity}
.ba-logo .ba-aura{position:absolute;inset:-6%;border-radius:50%;opacity:0;pointer-events:none;will-change:opacity,transform}
.ba-ab{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#000;touch-action:manipulation}
.ba-ab svg.ba-cena{position:absolute;inset:0;width:100%;height:100%;display:block}
.ba-ab .ba-final{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:0;
  padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
.ba-ab .ba-final .ba-logo{cursor:default}
.ba-ab .ba-sub{font-family:"Anton",Impact,"Arial Narrow Bold",sans-serif;text-transform:uppercase;letter-spacing:.08em;color:#fff;font-size:clamp(14px,4.2vw,20px);text-align:center;opacity:0;margin:0;text-wrap:balance}
.ba-ab .ba-pular{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:3;background:rgb(0 0 0 / .35);color:#ddd;border:1px solid rgb(255 255 255 / .3);border-radius:999px;padding:6px 16px;font:500 13px system-ui,sans-serif;min-height:0;cursor:pointer}
`;
  let estilo = false;
  function injetarCSS() { if (estilo) return; estilo = true; const s = document.createElement("style"); s.textContent = CSS; document.head.append(s); }
  const elx = (tag, attrs, pai) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (pai) pai.append(e); return e; };
  const div = (cls, pai) => { const d = document.createElement("div"); if (cls) d.className = cls; if (pai) pai.append(d); return d; };
  const img = (src, pai, cls) => { const i = new Image(); i.src = src; i.alt = ""; i.decoding = "async"; i.draggable = false; if (cls) i.className = cls; if (pai) pai.append(i); return i; };

  // ---------- LOGOS ----------
  // bm: 1129 x 589 (bola atrás do BIRIBOL, corte em y=174; centro da bola ~ (593, 261)); lmb: 800 x 800 (bola em (402.5, 250), anel centrado em (400, 392))
  const LOGO = {
    bm: { w: 1129, h: 589, pasta: "anim/bm-" },
    lmb: { w: 800, h: 800, pasta: "anim/lmb-" },
  };
  const E = { saida: "cubic-bezier(.16,1,.3,1)", suave: "cubic-bezier(.45,0,.25,1)", mola: "cubic-bezier(.34,1.56,.64,1)" };

  function logo(el, tipo, op) {
    op = op || {};
    injetarCSS();
    const L = LOGO[tipo]; if (!L) return null;
    el.classList.add("ba-logo", "ba-" + tipo);
    el.style.aspectRatio = L.w + " / " + L.h;
    el.textContent = "";
    const cam = div("ba-cam", el);
    const P = n => L.pasta + n + ".webp";
    const R = {}; // referências
    let anims = [];
    if (tipo === "bm") {
      const clip = div("ba-clipbola", cam); clip.style.height = (174 / 589 * 100) + "%";
      R.bola = img(P("bola"), clip); R.bola.style.transformOrigin = "52.5% 44.3%";
      R.eco = img(P("biribol"), cam); R.eco.style.opacity = "0";
      R.palavra = img(P("biribol"), cam);
      R.script = img(P("mococa"), cam);
    } else {
      R.aura = div("ba-aura", cam); R.aura.style.background = "radial-gradient(circle,rgb(246 210 11 / .45),rgb(21 151 220 / .25) 45%,transparent 70%)";
      R.corpo = div("ba-corpo", cam);
      R.base = img(P("base"), R.corpo);
      R.anel = img(P("anel"), R.corpo); R.anel.style.transformOrigin = "50% 49%";
      R.letras = img(P("letras"), R.corpo); R.letras.style.opacity = "0"; R.letras.style.transformOrigin = "51% 61.6%";
      R.rastro = [img(P("bola"), cam), img(P("bola"), cam)]; R.rastro.forEach(r => { r.style.opacity = "0"; r.style.transformOrigin = "50.3% 31.25%"; });
      R.bola = img(P("bola"), cam); R.bola.style.transformOrigin = "50.3% 31.25%";
      R.choque = div("ba-choque", cam); Object.assign(R.choque.style, { left: "50.3%", top: "31.25%", width: "27%", height: "27%" });
    }
    const brilho = div("ba-brilho", cam), faixa = document.createElement("i"); brilho.append(faixa);
    const masc = "url(" + P("tudo") + ")"; brilho.style.webkitMaskImage = masc; brilho.style.maskImage = masc;

    const a = (alvo, k, o) => { const x = alvo.animate(k, Object.assign({ fill: "both" }, o)); anims.push(x); return x; };
    function limpar() { anims.forEach(x => x.cancel()); anims = []; }
    function reflexo(atraso) {
      a(faixa, [{ transform: "translateX(-140%) skewX(-18deg)", opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { transform: "translateX(320%) skewX(-18deg)", opacity: 0 }],
        { duration: 1100, delay: atraso || 0, easing: E.suave });
    }
    function entrada() {
      limpar();
      if (tipo === "bm") {
        // BIRIBOL entra rasgando da esquerda com rastro; a bola sobe por trás como um saque; Mococa é escrito à mão
        a(R.palavra, [{ transform: "translateX(-62%) skewX(-24deg) scaleX(1.15)", opacity: 0 }, { opacity: 1, offset: .35 },
          { transform: "translateX(2.5%) skewX(7deg) scaleX(.98)", offset: .62 }, { transform: "translateX(-.8%) skewX(-2deg)", offset: .82 }, { transform: "none", opacity: 1 }],
          { duration: 720, easing: "cubic-bezier(.2,.75,.25,1)" });
        a(R.eco, [{ transform: "translateX(-75%) skewX(-24deg) scaleX(1.25)", opacity: 0 }, { opacity: .45, offset: .3 }, { transform: "translateX(-4%) skewX(-8deg)", opacity: .25, offset: .62 }, { transform: "translateX(0)", opacity: 0 }],
          { duration: 760, delay: 40, easing: "cubic-bezier(.2,.75,.25,1)" });
        a(R.bola, [{ transform: "translateY(112%) rotate(-55deg)" }, { transform: "translateY(112%) rotate(-55deg)", offset: .01 },
          { transform: "translateY(-9%) rotate(8deg)", offset: .62 }, { transform: "translateY(2%) rotate(-2deg)", offset: .82 }, { transform: "none" }],
          { duration: 820, delay: 380, easing: "cubic-bezier(.22,.9,.3,1)" });
        a(R.script, [{ clipPath: "inset(0 100% 0 0)", transform: "translateY(4%)", opacity: 1 }, { clipPath: "inset(0 0% 0 0)", transform: "none", opacity: 1 }],
          { duration: 820, delay: 820, easing: "cubic-bezier(.55,.05,.35,1)" });
        a(cam, [{ transform: "none" }, { transform: "none", offset: .55 }, { transform: "scale(1.035)", offset: .7 }, { transform: "none" }], { duration: 1100, delay: 0, easing: E.suave });
        reflexo(1600);
        return 2700;
      }
      // LMB: a bola chega cortada do alto, explode no centro, o escudo abre, o anel gira e o LMB bate
      const T = 520;
      const kb = [{ transform: "translate(150%,-175%) scale(.45) rotate(-620deg)", opacity: 0 }, { opacity: 1, offset: .12 },
        { transform: "translate(-3%,3%) scale(1.1) rotate(-12deg)", offset: .8 }, { transform: "none", opacity: 1 }];
      a(R.bola, kb, { duration: T, easing: "cubic-bezier(.5,0,.75,.35)" });
      R.rastro.forEach((r, i) => a(r, kb.map((k, j) => Object.assign({}, k, { opacity: j === 0 ? 0 : j === 3 ? 0 : (.38 - i * .16) })), { duration: T, delay: 45 * (i + 1), easing: "cubic-bezier(.5,0,.75,.35)" }));
      a(R.choque, [{ transform: "translate(-50%,-50%) scale(.3)", opacity: 0 }, { opacity: 1, offset: .08 }, { transform: "translate(-50%,-50%) scale(2.6)", opacity: 0 }],
        { duration: 650, delay: T - 40, easing: "cubic-bezier(.1,.7,.3,1)" });
      a(R.corpo, [{ transform: "scale(.55) rotate(-14deg)", opacity: 0 }, { transform: "scale(1.06) rotate(2deg)", opacity: 1, offset: .55 }, { transform: "scale(.985)", offset: .8 }, { transform: "none", opacity: 1 }],
        { duration: 720, delay: T - 80, easing: "cubic-bezier(.2,.8,.25,1)" });
      a(R.anel, [{ transform: "rotate(-95deg)" }, { transform: "rotate(7deg)", offset: .72 }, { transform: "rotate(-2deg)", offset: .88 }, { transform: "none" }],
        { duration: 1100, delay: T - 80, easing: "cubic-bezier(.2,.75,.25,1)" });
      a(R.letras, [{ transform: "scale(1.9)", opacity: 0 }, { opacity: .9, offset: .25 }, { transform: "scale(1)", opacity: .9, offset: .7 }, { transform: "scale(1)", opacity: 0 }],
        { duration: 560, delay: T + 420, easing: "cubic-bezier(.3,.7,.3,1)" });
      a(cam, [{ transform: "none" }, { transform: "translate(1.2%,-.8%) rotate(.6deg)", offset: .2 }, { transform: "translate(-1%,.6%) rotate(-.5deg)", offset: .45 }, { transform: "translate(.4%,-.2%)", offset: .7 }, { transform: "none" }],
        { duration: 420, delay: T + 650 });
      a(R.aura, [{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "scale(1)", offset: .3 }, { opacity: 0, transform: "scale(1.15)" }], { duration: 1200, delay: T - 40, easing: E.suave });
      reflexo(T + 1050);
      return T + 2150;
    }
    // ciclo discreto (a cada ~7 s): reflexo + a bola dá um giro/quique
    let tCiclo = null;
    function pulso() {
      if (document.hidden) return;
      if (tipo === "bm") {
        a(R.bola, [{ transform: "none" }, { transform: "translateY(-10%) rotate(-14deg)", offset: .35, easing: "cubic-bezier(.3,0,.7,1)" }, { transform: "translateY(1.5%) rotate(3deg)", offset: .7 }, { transform: "none" }],
          { duration: 900, easing: E.suave });
        a(R.palavra, [{ transform: "none" }, { transform: "scale(1.025)", offset: .55 }, { transform: "none" }], { duration: 700, delay: 520, easing: E.suave });
        reflexo(700);
      } else {
        a(R.bola, [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg) scale(1.06)", offset: .7 }, { transform: "rotate(360deg)" }], { duration: 1100, easing: E.suave });
        a(R.letras, [{ transform: "scale(1.25)", opacity: 0 }, { opacity: .55, offset: .35 }, { transform: "scale(1)", opacity: 0 }], { duration: 650, delay: 700, easing: E.suave });
        reflexo(900);
      }
    }
    function ciclo() { clearInterval(tCiclo); tCiclo = setInterval(pulso, 7000); }
    function parar() { clearInterval(tCiclo); limpar(); }
    const pronto = Promise.all([...el.querySelectorAll("img")].map(i => i.decode ? i.decode().catch(() => {}) : 0));
    const api = { entrada, pulso, ciclo, parar, pronto, el };
    if (reduz()) return api;
    if (op.estado0 !== false && op.entrada) {
      // esconde as camadas até a entrada começar (evita ver o logo pronto antes da animação)
      if (tipo === "bm") { R.palavra.style.opacity = "0"; R.script.style.clipPath = "inset(0 100% 0 0)"; R.bola.style.transform = "translateY(112%)"; }
      else { R.corpo.style.opacity = "0"; R.bola.style.opacity = "0"; }
    }
    const comecar = () => pronto.then(() => {
      if (tipo === "bm") { R.palavra.style.opacity = ""; R.script.style.clipPath = ""; R.bola.style.transform = ""; }
      else { R.corpo.style.opacity = ""; R.bola.style.opacity = ""; }
      const d = op.entrada ? entrada() : 0; if (op.ciclo !== false) setTimeout(ciclo, d);
    });
    if (op.auto !== false) { if (op.depoisDe) window.addEventListener(op.depoisDe, () => setTimeout(comecar, op.atraso || 0), { once: true }); else setTimeout(comecar, op.atraso || 0); }
    api.comecar = comecar;
    if (op.toque !== false) el.addEventListener("click", () => { pronto.then(() => { entrada(); }); });
    return api;
  }

  // ---------- ABERTURA: cortada na piscina de biribol ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const EZ = {
    lin: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outQ: t => 1 - (1 - t) * (1 - t),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  // trilha: [[t, valor, easing-do-trecho-seguinte], ...]
  function trilha(pontos) {
    return t => {
      if (t <= pontos[0][0]) return pontos[0][1];
      for (let i = 0; i < pontos.length - 1; i++) {
        const [t0, v0, e] = pontos[i], [t1, v1] = pontos[i + 1];
        if (t <= t1) { const u = (EZ[e || "io"])((t - t0) / (t1 - t0)); return lerp(v0, v1, u); }
      }
      return pontos[pontos.length - 1][1];
    };
  }

  function abertura(cfg) {
    injetarCSS();
    const chave = cfg.chave || ("ab-" + cfg.tipo);
    let ja = false; try { ja = sessionStorage.getItem(chave) === "1"; sessionStorage.setItem(chave, "1"); } catch (e) {}
    if (ja || reduz() || !document.body.animate) { window.__semAbertura = true; return null; }
    const C = cfg.cores;
    const ov = document.createElement("div"); ov.className = "ba-ab"; ov.id = "abertura";
    ov.setAttribute("role", "img"); ov.setAttribute("aria-label", cfg.rotulo || "Abertura do app: atacante corta e marca o ponto na piscina de biribol");
    document.body.prepend(ov);
    ov.style.background = C.fundo[0];

    // ---- cena SVG (400 x 720) ----
    const svg = elx("svg", { class: "ba-cena", viewBox: "0 0 400 720", "aria-hidden": "true" }, ov);
    svg.style.opacity = "0";
    const ajusta = () => svg.setAttribute("preserveAspectRatio", innerWidth / innerHeight < .62 ? "xMidYMid slice" : "xMidYMid meet");
    ajusta(); addEventListener("resize", ajusta);
    const defs = elx("defs", {}, svg);
    const grad = (id, cores, vert = true, extra) => { const g = elx(vert ? "linearGradient" : "radialGradient", Object.assign({ id }, vert ? { x1: 0, y1: 0, x2: 0, y2: 1 } : {}, extra || {}), defs); cores.forEach(([o, c, op]) => elx("stop", { offset: o, "stop-color": c, "stop-opacity": op == null ? 1 : op }, g)); return g; };
    grad("ba-salao", [[0, C.fundo[0]], [.55, C.fundo[1]], [1, C.fundo[0]]]);
    grad("ba-agua", [[0, C.agua[0]], [1, C.agua[1]]]);
    grad("ba-aguaf", [[0, C.agua[0], .55], [.25, C.agua[1], .78], [1, C.agua[2], .95]]);
    grad("ba-luz", [[0, "#fff", .9], [1, "#fff", 0]], false);
    grad("ba-feixe", [[0, "#fff", .16], [1, "#fff", 0]]);
    const blur = elx("filter", { id: "ba-blur", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs); elx("feGaussianBlur", { stdDeviation: 3 }, blur);
    const pat = elx("pattern", { id: "ba-azulejo", width: 16, height: 16, patternUnits: "userSpaceOnUse" }, defs);
    elx("rect", { width: 16, height: 16, fill: C.azulejo[0] }, pat); elx("path", { d: "M0 .5H16M.5 0V16", stroke: C.azulejo[1], "stroke-width": 1 }, pat);

    const cam = elx("g", {}, svg);
    // salão: fundo, luzes, arquibancada com faixa da equipe
    elx("rect", { x: -200, y: -100, width: 800, height: 920, fill: "url(#ba-salao)" }, cam);
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 60;
      elx("polygon", { points: `${x - 6},40 ${x + 6},40 ${x + 60},460 ${x - 60},460`, fill: "url(#ba-feixe)", opacity: .7 }, cam);
      elx("ellipse", { cx: x, cy: 40, rx: 16, ry: 6, fill: "url(#ba-luz)" }, cam);
      elx("ellipse", { cx: x, cy: 40, rx: 4, ry: 2, fill: "#fff" }, cam);
    }
    for (let i = 0; i < 6; i++) elx("rect", { x: -200, y: 250 + i * 22, width: 800, height: 12, fill: "#000", opacity: .18 + i * .03 }, cam);
    const faixaY = 400;
    C.faixa.forEach((c, i) => elx("rect", { x: -200, y: faixaY + i * 8, width: 800, height: 8, fill: c }, cam));
    const txt = elx("text", { x: 200, y: faixaY + 15.6, "text-anchor": "middle", "font-family": "Anton,Impact,sans-serif", "font-size": 9.5, fill: C.faixaTexto || "#fff", "letter-spacing": 3 }, cam);
    txt.textContent = (cfg.faixaTexto + "   •   ").repeat(4);
    // borda da piscina (fundo) e água de trás
    const WY = 470, FY = 600;
    elx("rect", { x: -200, y: WY - 26, width: 800, height: 26, fill: "url(#ba-azulejo)" }, cam);
    elx("rect", { x: -200, y: WY - 30, width: 800, height: 5, fill: C.borda }, cam);
    const aguaTras = elx("path", { fill: "url(#ba-agua)" }, cam);
    // rede: postes e malha (leve perspectiva)
    const rede = elx("g", {}, cam);
    elx("rect", { x: 186, y: 320, width: 5, height: 280, fill: C.poste, rx: 2 }, rede);
    elx("rect", { x: 214, y: 336, width: 6, height: 280, fill: C.poste, rx: 2 }, rede);
    const malha = elx("g", { stroke: "#fff", "stroke-opacity": .55, "stroke-width": .8 }, rede);
    for (let i = 0; i <= 10; i++) { const u = i / 10; elx("line", { x1: lerp(188, 217, u), y1: lerp(342, 358, u), x2: lerp(188, 217, u), y2: lerp(382, 401, u) }, malha); }
    for (let i = 0; i <= 5; i++) { const u = i / 5; elx("line", { x1: 188, y1: lerp(342, 382, u), x2: 217, y2: lerp(358, 401, u) }, malha); }
    elx("line", { x1: 186, y1: 341, x2: 220, y2: 358, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, rede);
    elx("line", { x1: 186, y1: 383, x2: 220, y2: 402, stroke: "#fff", "stroke-width": 2, "stroke-linecap": "round", opacity: .8 }, rede);
    const antena = elx("line", { x1: 186, y1: 318, x2: 186, y2: 342, stroke: C.destaque, "stroke-width": 2.5 }, rede);

    // ---- atletas ----
    const camadaJog = elx("g", {}, cam);
    function atleta(x0, f, time, pele, escala) {
      const s = escala || 1;
      const root = elx("g", { transform: `translate(${x0} 0) scale(${f * s} ${s}) translate(0 ${(1 - s) * FY / s})` }, camadaJog);
      const corpo = elx("g", {}, root);
      const pernaT = elx("g", {}, corpo), pernaF = elx("g", {}, corpo);
      const perna = (g, cor) => { elx("path", { d: "M0 518 L2 556 L0 594", stroke: cor, "stroke-width": 10, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); };
      perna(pernaT, sombra(pele)); perna(pernaF, pele);
      const bracoT = braco(corpo, sombra(pele), -9);
      elx("path", { d: "M-14 442 C-17 470 -14 500 -12 520 L12 520 C14 500 17 470 14 442 Z", fill: pele }, corpo);
      elx("path", { d: "M-14 442 C-17 470 -14 500 -12 520 L-4 520 C-6 495 -8 470 -6 442 Z", fill: "#000", opacity: .14 }, corpo);
      elx("path", { d: "M-13 504 L13 504 L14 526 L3 530 L0 524 L-3 530 L-14 526 Z", fill: time.sunga }, corpo);
      elx("rect", { x: -13, y: 504, width: 26, height: 3, fill: time.detalhe, opacity: .9 }, corpo);
      elx("rect", { x: -4, y: 426, width: 8, height: 12, fill: pele }, corpo);
      elx("circle", { cx: 0, cy: 418, r: 12, fill: pele }, corpo);
      elx("circle", { cx: 12, cy: 419, r: 2.2, fill: pele }, corpo);
      elx("path", { d: "M-12.5 417 A12.5 12.5 0 0 1 12.5 414 L12 410 C6 404 -6 403 -12 410 Z", fill: time.touca }, corpo);
      elx("path", { d: "M-12.5 417 A12.5 12.5 0 0 1 -4 405.5 L-2 410 C-6 411 -9 414 -12.5 417 Z", fill: "#fff", opacity: .25 }, corpo);
      elx("circle", { cx: 7, cy: 416, r: 1.4, fill: "#1a1a1a" }, corpo);
      const bracoF = braco(corpo, pele, 9);
      const st = { dy: 0, lean: 0, t1: 0, t2: 0, f1: 0, f2: 0, perna: 0 };
      return {
        st, root,
        aplicar() {
          corpo.setAttribute("transform", `translate(0 ${st.dy}) rotate(${st.lean} 0 518)`);
          bracoT.set(st.t1, st.t2); bracoF.set(st.f1, st.f2);
          pernaT.setAttribute("transform", `rotate(${st.perna * .7} 0 518)`); pernaF.setAttribute("transform", `rotate(${st.perna} 0 518)`);
        },
      };
    }
    function braco(pai, cor, ox) {
      const g1 = elx("g", {}, pai);
      elx("line", { x1: ox, y1: 445, x2: ox, y2: 475, stroke: cor, "stroke-width": 9, "stroke-linecap": "round" }, g1);
      const g2 = elx("g", {}, g1);
      elx("line", { x1: ox, y1: 475, x2: ox, y2: 502, stroke: cor, "stroke-width": 8, "stroke-linecap": "round" }, g2);
      elx("circle", { cx: ox, cy: 504, r: 5.2, fill: cor }, g2);
      return { set(a, b) { g1.setAttribute("transform", `rotate(${a} ${ox} 445)`); g2.setAttribute("transform", `rotate(${b} ${ox} 475)`); } };
    }
    function sombra(hex) { const n = parseInt(hex.slice(1), 16); const k = .78; return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * k).toString(16).padStart(2, "0")).join(""); }

    const fundoDef = atleta(338, -1, C.fora, "#d9a273", .86);
    const levant = atleta(84, 1, C.casa, "#8d5a3b", .92);
    const bloq = atleta(240, -1, C.fora, "#c68642", .97);
    const atac = atleta(146, 1, C.casa, "#b97a4f", 1);

    // ---- água da frente (cobre o que está submerso), fundo da piscina com azulejos e borda da frente ----
    const aguaFrente = elx("path", { fill: "url(#ba-aguaf)" }, cam);
    const causticas = elx("g", { opacity: .22, stroke: "#fff", "stroke-width": 1.2, fill: "none" }, cam);
    const cLinhas = []; for (let i = 0; i < 7; i++) cLinhas.push(elx("path", {}, causticas));
    elx("rect", { x: -200, y: FY, width: 800, height: 140, fill: "url(#ba-azulejo)" }, cam);
    elx("rect", { x: -200, y: FY, width: 800, height: 6, fill: C.destaque, opacity: .9 }, cam);
    elx("rect", { x: -200, y: 662, width: 800, height: 80, fill: C.deck }, cam);
    elx("rect", { x: -200, y: 662, width: 800, height: 4, fill: "#fff", opacity: .5 }, cam);
    const brilhoAgua = elx("path", { fill: "none", stroke: "#fff", "stroke-width": 1.6, "stroke-opacity": .55 }, cam);

    // ---- bola, rastro, respingos ----
    const rastro = elx("g", { "stroke-linecap": "round" }, cam);
    const segs = []; for (let i = 0; i < 9; i++) segs.push(elx("line", { stroke: C.bola[0] }, rastro));
    const bola = elx("g", {}, cam);
    elx("circle", { r: 8.5, fill: C.bola[0], stroke: C.bola[2], "stroke-width": 1.2 }, bola);
    elx("path", { d: "M-8 -2 C-3 -6 3 -6 8 -3 M-6 5 C-1 1 5 2 8 3 M-1 -8.4 C-4 -3 -4 3 -1 8.4", stroke: C.bola[1], "stroke-width": 2.4, fill: "none" }, bola);
    elx("circle", { cx: -3, cy: -3.5, r: 2.6, fill: "#fff", opacity: .55 }, bola);
    const estrela = elx("g", { opacity: 0 }, cam);
    for (let i = 0; i < 10; i++) { const ang = i / 10 * Math.PI * 2, r1 = i % 2 ? 9 : 22; elx("line", { x1: Math.cos(ang) * 6, y1: Math.sin(ang) * 6, x2: Math.cos(ang) * r1, y2: Math.sin(ang) * r1, stroke: "#fff", "stroke-width": 2.4, "stroke-linecap": "round" }, estrela); }
    elx("circle", { r: 13, fill: "#fff", opacity: .8 }, estrela);
    const respingos = elx("g", { fill: "#e9f8ff" }, cam);
    function criaRespingo(x, y, n, forca, seed) {
      let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      const gotas = []; for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (rnd() - .5) * 2.2, v = forca * (.45 + rnd() * .75);
        gotas.push({ el: elx("circle", { r: 1.2 + rnd() * 2.8, opacity: 0 }, respingos), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, x, y });
      }
      const coroa = elx("path", { fill: "#dff4ff", opacity: 0 }, respingos);
      const aneis = [0, 1, 2].map(() => elx("ellipse", { cx: x, cy: y + 2, fill: "none", stroke: "#fff", "stroke-width": 1.4, opacity: 0 }, respingos));
      return {
        at(dt) {
          if (dt < 0 || dt > 1.6) { gotas.forEach(g => g.el.setAttribute("opacity", 0)); coroa.setAttribute("opacity", 0); aneis.forEach(a => a.setAttribute("opacity", 0)); return; }
          gotas.forEach(g => {
            const px = g.x + g.vx * dt, py = g.y + g.vy * dt + 520 * dt * dt;
            g.el.setAttribute("cx", px.toFixed(1)); g.el.setAttribute("cy", Math.min(py, y + 4).toFixed(1));
            g.el.setAttribute("opacity", py > y + 3 ? 0 : clamp(1 - dt / 1.1, 0, 1).toFixed(2));
          });
          const h = forca * .23 * Math.sin(clamp(dt / .55, 0, 1) * Math.PI), w = forca * .16 * (.6 + EZ.out(clamp(dt / .5, 0, 1)) * .6);
          let d = `M${x - w} ${y}`; for (let i = 0; i <= 6; i++) { const u = i / 6, xx = x - w + 2 * w * u; d += ` L${(xx + (i % 2 ? 0 : 0)).toFixed(1)} ${(y - (i % 2 ? h * (.55 + .45 * Math.sin(i)) : h * .25)).toFixed(1)}`; }
          d += ` L${x + w} ${y} Z`; coroa.setAttribute("d", d); coroa.setAttribute("opacity", h > .5 ? .85 : 0);
          aneis.forEach((a, i) => { const u = clamp((dt - i * .12) / 1.2, 0, 1); a.setAttribute("rx", (6 + u * (forca * .55)).toFixed(1)); a.setAttribute("ry", (2 + u * forca * .07).toFixed(1)); a.setAttribute("opacity", u > 0 && u < 1 ? (.8 * (1 - u)).toFixed(2) : 0); });
        },
      };
    }

    // ---- placar e PONTO! (fora da câmera) ----
    const hud = elx("g", { opacity: 0 }, svg);
    elx("rect", { x: 36, y: 62, width: 328, height: 40, rx: 9, fill: "#000", opacity: .55 }, hud);
    elx("rect", { x: 36, y: 62, width: 6, height: 40, rx: 3, fill: C.casa.touca }, hud);
    elx("rect", { x: 358, y: 62, width: 6, height: 40, rx: 3, fill: C.fora.touca }, hud);
    const tA = elx("text", { x: 52, y: 88, "font-family": "Anton,Impact,sans-serif", "font-size": 15, fill: "#fff", "letter-spacing": .5 }, hud); tA.textContent = cfg.placar.a;
    const tB = elx("text", { x: 348, y: 88, "text-anchor": "end", "font-family": "Anton,Impact,sans-serif", "font-size": 15, fill: "#fff", "letter-spacing": .5 }, hud); tB.textContent = cfg.placar.b;
    const sB = elx("text", { x: 214, y: 90, "font-family": "Anton,Impact,sans-serif", "font-size": 22, fill: "#fff" }, hud); sB.textContent = cfg.placar.sb;
    elx("text", { x: 200, y: 89, "text-anchor": "middle", "font-family": "Anton,Impact,sans-serif", "font-size": 16, fill: "#fff", opacity: .6 }, hud).textContent = "×";
    const gA = elx("g", {}, hud);
    const sA0 = elx("text", { x: 186, y: 90, "text-anchor": "end", "font-family": "Anton,Impact,sans-serif", "font-size": 22, fill: "#fff" }, gA); sA0.textContent = cfg.placar.sa;
    const sA1 = elx("text", { x: 186, y: 90, "text-anchor": "end", "font-family": "Anton,Impact,sans-serif", "font-size": 22, fill: C.destaque, opacity: 0 }, gA); sA1.textContent = cfg.placar.sa + 1;
    const tSet = elx("text", { x: 200, y: 116, "text-anchor": "middle", "font-family": "system-ui,sans-serif", "font-size": 9, "font-weight": 700, fill: "#fff", opacity: .7, "letter-spacing": 2 }, hud); tSet.textContent = cfg.placar.set;
    const ponto = elx("g", { opacity: 0 }, svg);
    const linhasVel = elx("g", { stroke: C.destaque, "stroke-width": 3, "stroke-linecap": "round", opacity: .8 }, ponto);
    for (let i = 0; i < 8; i++) elx("line", { x1: 60 - i * 6, y1: 168 + i * 9, x2: 120 - i * 4, y2: 168 + i * 9 }, linhasVel);
    const pTxt = elx("text", { x: 200, y: 214, "text-anchor": "middle", "font-family": "Anton,Impact,sans-serif", "font-size": 64, fill: "#fff", stroke: C.destaque, "stroke-width": 3, "paint-order": "stroke", transform: "skewX(-10)", "letter-spacing": 1 }, ponto);
    pTxt.textContent = cfg.ponto || "PONTO!";

    // ---- onda de transição ----
    const onda = elx("path", { fill: C.onda[0] }, svg);
    const onda2 = elx("path", { fill: C.onda[1] }, svg);

    // ---- final: logo animado + legenda ----
    const fim = div("ba-final", ov);
    fim.style.background = `radial-gradient(70% 50% at 50% 45%, ${C.finalCor}, ${C.fundo[0]} 75%)`;
    const caixa = div("", fim); caixa.style.width = cfg.tipo === "lmb" ? "min(72vw, 360px, 46vh)" : "min(86vw, 520px)";
    const L = logo(caixa, cfg.tipo, { entrada: true, auto: false, ciclo: false, toque: false });
    const sub = document.createElement("p"); sub.className = "ba-sub"; sub.textContent = cfg.legenda || ""; fim.append(sub);
    const pular = document.createElement("button"); pular.type = "button"; pular.className = "ba-pular"; pular.textContent = "Pular abertura"; ov.append(pular);

    // ---- linha do tempo (s) ----
    const tc = 1.86, ti = 2.12;            // contato e impacto na água
    const bolaSet = t => { const u = clamp((t - .62) / (tc - .62), 0, 1); const p0 = [96, 380], p1 = [160, 110], p2 = [186, 290]; const x = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], y = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]; return [x, y]; };
    const bolaCorte = t => { const u = EZ.in(clamp((t - tc) / (ti - tc), 0, 1)) * .55 + clamp((t - tc) / (ti - tc), 0, 1) * .45; return [lerp(186, 318, u), lerp(290, 470, u) - Math.sin(u * Math.PI) * 10]; };
    // atacante
    const A = {
      dy: trilha([[0, 0], [.95, 0, "io"], [1.15, 7, "out"], [1.55, -96, "outQ"], [1.9, -90, "in"], [2.42, 2, "out"], [2.6, 0, "io"], [2.95, -10, "io"], [3.3, 0]]),
      lean: trilha([[0, 0], [1.15, 6, "io"], [1.45, -4, "io"], [1.76, -13, "in"], [1.9, 12, "out"], [2.3, 6, "io"], [2.9, -4, "io"], [3.3, 0]]),
      f1: trilha([[0, 8], [.95, 8, "io"], [1.15, 45, "outQ"], [1.42, -178, "io"], [1.74, -212, "in"], [1.88, -150, "out"], [2.2, -45, "io"], [2.75, -12, "io"], [3.0, -175, "io"], [3.3, -168]]),
      f2: trilha([[0, -8], [1.42, -10, "io"], [1.74, -78, "in"], [1.86, -4, "out"], [2.2, 18, "io"], [2.75, 6, "io"], [3.0, -10]]),
      t1: trilha([[0, -6], [.95, -6, "io"], [1.15, 40, "outQ"], [1.42, -160, "io"], [1.7, -140, "io"], [1.95, -20, "io"], [2.6, 10, "io"], [3.3, 6]]),
      t2: trilha([[0, -10], [1.42, -6, "io"], [1.95, -30, "io"], [2.6, -10]]),
      perna: trilha([[0, 0], [1.15, 8, "out"], [1.45, 35, "io"], [1.85, 28, "io"], [2.3, -10, "io"], [2.7, 0]]),
    };
    const LV = {
      dy: trilha([[0, 0], [.35, 0, "io"], [.55, -14, "out"], [.85, 0]]),
      f1: trilha([[0, 10], [.2, 10, "io"], [.5, -170, "io"], [.75, -165, "io"], [1.3, 5]]), f2: trilha([[0, -10], [.5, -25, "io"], [.7, 0, "io"], [1.3, -8]]),
      t1: trilha([[0, -4], [.2, -4, "io"], [.5, -168, "io"], [.75, -160, "io"], [1.3, 0]]), t2: trilha([[0, -10], [.5, -25, "io"], [.7, 0, "io"], [1.3, -8]]),
      lean: trilha([[0, 0], [.5, -6, "io"], [.8, 2, "io"], [1.2, 0]]),
    };
    const BQ = {
      dy: trilha([[0, 0], [1.88, 0, "io"], [2.0, 5, "out"], [2.3, -55, "outQ"], [2.45, -52, "in"], [2.8, 0]]),
      f1: trilha([[0, 6], [1.9, 6, "io"], [2.15, -176, "io"], [2.5, -170, "io"], [2.9, 8]]), f2: trilha([[0, -6], [2.1, -4], [2.9, -6]]),
      t1: trilha([[0, -6], [1.9, -6, "io"], [2.15, -170, "io"], [2.5, -165, "io"], [2.9, -6]]), t2: trilha([[0, -6], [2.9, -6]]),
      perna: trilha([[0, 0], [2.0, 6, "io"], [2.3, 20, "io"], [2.8, 0]]),
      lean: trilha([[0, 0], [2.3, -4, "io"], [2.8, 0]]),
    };
    const FD = {
      dy: trilha([[0, 0], [1.95, 0, "io"], [2.1, 4, "out"], [2.32, -6, "in"], [2.62, 46, "out"], [3.1, 38]]),
      lean: trilha([[0, 0], [1.95, 0, "io"], [2.15, 18, "io"], [2.45, 62, "in"], [2.7, 72, "out"], [3.1, 70]]),
      f1: trilha([[0, 6], [1.98, 6, "io"], [2.3, -105, "io"], [2.7, -120]]), f2: trilha([[0, -8], [2.3, -4]]),
      t1: trilha([[0, -6], [1.98, -6, "io"], [2.3, -85, "io"], [2.7, -95]]), t2: trilha([[0, -8], [2.3, -6]]),
      perna: trilha([[0, 0], [2.2, 10, "io"], [2.6, 40]]),
    };
    const camS = trilha([[0, 1.1, "io"], [.95, 1.0, "io"], [1.65, 1.42, "io"], [1.95, 1.48, "out"], [2.3, 1.3, "io"], [2.9, 1.04, "io"], [3.3, 1.08]]);
    const camX = trilha([[0, 200, "io"], [.95, 196, "io"], [1.65, 186, "io"], [1.95, 205, "out"], [2.3, 270, "io"], [2.9, 215, "io"], [3.3, 210]]);
    const camY = trilha([[0, 430, "io"], [.95, 420, "io"], [1.65, 345, "io"], [1.95, 340, "out"], [2.3, 410, "io"], [2.9, 430, "io"], [3.3, 420]]);
    const spAtq = criaRespingo(146, WY, 16, 120, 7), spEnt = criaRespingo(150, WY, 14, 95, 19), spBola = criaRespingo(318, WY, 30, 230, 3), spDef = criaRespingo(358, WY, 18, 140, 11);
    const T_ONDA = 3.25, T_REVELA = 3.8, T_LOGO = 3.95;
    let durLogo = 2200, PARADO = 0, FIM = 0;
    const SEGURA = 2.0;

    function ondaPath(baseY, amp, fase) {
      let d = `M-200 ${baseY}`;
      for (let x = -200; x <= 600; x += 20) d += ` L${x} ${(baseY + Math.sin(x / 38 + fase) * amp + Math.sin(x / 17 - fase * 1.7) * amp * .35).toFixed(1)}`;
      return d;
    }
    const hist = [];
    let t0 = null, raf = 0, acabou = false, logoIniciado = false;
    function quadro(agora) {
      if (t0 == null) t0 = agora;
      const t = (agora - t0) / 1000;
      // água (ondas contínuas)
      const fase = t * 2.2;
      aguaTras.setAttribute("d", ondaPath(WY - 2, 2.2, fase) + ` L600 ${FY} L-200 ${FY} Z`);
      aguaFrente.setAttribute("d", ondaPath(WY, 2.6, fase + .8) + ` L600 ${FY + 2} L-200 ${FY + 2} Z`);
      brilhoAgua.setAttribute("d", ondaPath(WY, 2.6, fase + .8));
      cLinhas.forEach((p, i) => { let d = ""; const y = WY + 22 + i * 17; for (let x = -200; x <= 600; x += 25) d += (x === -200 ? "M" : " L") + x + " " + (y + Math.sin(x / 30 + t * 1.6 + i) * 3).toFixed(1); p.setAttribute("d", d); });
      // atletas
      for (const [ob, tr] of [[atac, A], [levant, LV], [bloq, BQ], [fundoDef, FD]]) { for (const k in tr) ob.st[k] = tr[k](t); ob.aplicar(); }
      // bola
      let bx, by, rot;
      if (t < .62) { [bx, by] = [96 + Math.sin(t * 6) * 1, 380]; rot = 0; }
      else if (t < tc) { [bx, by] = bolaSet(t); rot = (t - .62) * 260; }
      else if (t < ti) { [bx, by] = bolaCorte(t); rot = 320 + (t - tc) * 2600; }
      else { const dt = t - ti; bx = 318 + dt * 30; by = WY + 18 + Math.min(dt * 60, 40); rot = 0; }
      const sob = t >= ti;
      bola.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${t > tc - .02 && t < tc + .08 ? 1.25 - (Math.abs(t - tc - .03) * 4) : 1}, 1)`);
      bola.setAttribute("opacity", sob ? clamp(1 - (t - ti) * 3, 0, 1).toFixed(2) : 1);
      hist.push([bx, by, t]); while (hist.length && t - hist[0][2] > .14) hist.shift();
      segs.forEach((s, i) => {
        const a = hist[Math.floor(i / segs.length * hist.length)], b = hist[Math.min(hist.length - 1, Math.floor((i + 1) / segs.length * hist.length))];
        const vis = t > tc && t < ti + .02 && a && b;
        s.setAttribute("opacity", vis ? (.08 + .55 * i / segs.length).toFixed(2) : 0);
        if (vis) { s.setAttribute("x1", a[0]); s.setAttribute("y1", a[1]); s.setAttribute("x2", b[0]); s.setAttribute("y2", b[1]); s.setAttribute("stroke-width", (2 + 12 * i / segs.length).toFixed(1)); }
      });
      // brilho do contato
      const ec = (t - tc + .02) / .28;
      estrela.setAttribute("opacity", ec > 0 && ec < 1 ? (1 - ec).toFixed(2) : 0);
      estrela.setAttribute("transform", `translate(186 290) scale(${(.5 + ec * 1.3).toFixed(2)}) rotate(${(ec * 30).toFixed(0)})`);
      // respingos
      spAtq.at(t - 1.2); spEnt.at(t - 2.38); spBola.at(t - ti); spDef.at(t - 2.55);
      // câmera com tremor no impacto
      const tr = t - ti, amp = tr > 0 && tr < .45 ? 6 * Math.pow(1 - tr / .45, 2) : 0;
      const sx = amp * Math.sin(tr * 70), sy = amp * Math.cos(tr * 57) * .7;
      const S = camS(t);
      cam.setAttribute("transform", `translate(${200 + sx} ${380 + sy}) scale(${S.toFixed(4)}) translate(${-camX(t).toFixed(2)} ${-camY(t).toFixed(2)})`);
      // placar e PONTO!
      hud.setAttribute("opacity", clamp((t - .25) / .4, 0, 1) * clamp(1 - (t - T_ONDA) / .3, 0, 1));
      const fl = clamp((t - 2.22) / .3, 0, 1);
      sA0.setAttribute("opacity", 1 - fl); sA0.setAttribute("transform", `translate(0 ${(-fl * 12).toFixed(1)})`);
      sA1.setAttribute("opacity", fl); sA1.setAttribute("transform", `translate(0 ${((1 - fl) * 12).toFixed(1)})`);
      const pt = t - 2.18, pin = clamp(pt / .22, 0, 1), pout = clamp((t - (T_ONDA - .1)) / .3, 0, 1);
      ponto.setAttribute("opacity", pt > 0 ? (pin * (1 - pout)).toFixed(2) : 0);
      ponto.setAttribute("transform", `translate(200 200) scale(${(pt > 0 ? (pt < .22 ? 2.2 - EZ.back(pin) * 1.2 : 1 + Math.max(0, .05 - (pt - .22) * .05)) : 2.2).toFixed(3)}) translate(-200 -200)`);
      linhasVel.setAttribute("transform", `translate(${(EZ.out(clamp(pt / .5, 0, 1)) * 30).toFixed(1)} 0)`);
      // onda sobe cobrindo a cena e passa, revelando o logo
      const ou = clamp((t - T_ONDA) / (T_REVELA - T_ONDA), 0, 1), os = clamp((t - T_REVELA) / .6, 0, 1);
      const yOnda = 760 - EZ.io(ou) * 820 - EZ.in(os) * 900;
      onda.setAttribute("d", ondaPath(yOnda, 10, t * 5) + " L600 1700 L-200 1700 Z");
      onda2.setAttribute("d", ondaPath(yOnda + 26, 8, t * 4 + 2) + " L600 1700 L-200 1700 Z");
      onda.setAttribute("opacity", t > T_ONDA ? 1 : 0); onda2.setAttribute("opacity", t > T_ONDA ? 1 : 0);
            if (t >= T_REVELA) { fim.style.opacity = 1; cam.setAttribute("opacity", 0); }
      svg.style.opacity = t < T_REVELA ? clamp(t / .45, 0, 1) : (os < 1 ? 1 : 0);
      if (t >= T_LOGO && !logoIniciado) {
        logoIniciado = true;
        durLogo = L.entrada();
        sub.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: Math.max(0, durLogo - 900), easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
        PARADO = T_LOGO + durLogo / 1000; FIM = PARADO + SEGURA;
      }
      if (FIM && t >= FIM) { sair(); return; }
      raf = requestAnimationFrame(quadro);
    }
    function sair() {
      if (acabou) return; acabou = true; cancelAnimationFrame(raf); ov.style.pointerEvents = "none";
      window.dispatchEvent(new Event("abertura-fim"));
      ov.animate([{ opacity: getComputedStyle(ov).opacity }, { opacity: 0 }], { duration: 900, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" }).onfinish = () => ov.remove();
      if (logoIniciado) caixa.animate([{ transform: "none" }, { transform: "scale(.94)" }], { duration: 900, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" });
      document.querySelectorAll(cfg.app || ".wrap").forEach(app => app.animate([{ opacity: 0, transform: "translateY(14px) scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 150, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" }));
      removeEventListener("resize", ajusta);
    }
    ov.addEventListener("click", sair);
    // começa quando as imagens do logo estiverem prontas (ou em 2,5 s, no máximo); internet muito lenta: abre o app direto
    let comecou = false;
    const iniciar = () => { if (comecou || acabou) return; comecou = true; raf = requestAnimationFrame(quadro); };
    L.pronto.then(iniciar); setTimeout(iniciar, 2500);
    setTimeout(() => { if (!comecou) sair(); }, 3500);
    return { sair };
  }

  window.BiribolAnim = { logo, abertura };
})();
