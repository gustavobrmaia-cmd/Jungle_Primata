"use strict";

// =========================
// ARTE DOS 15 CENÁRIOS
//  prerender              -> fundo fixo (céu, paisagem, decoração) num canvas, feito uma vez por rodada
//  desenharFundoAnimado   -> camada animada barata (nuvens, estrelas, neve, bolhas...) só com sprites
//  desenharPlataformas    -> sprite em cache por plataforma + esteiras/bumpers/portais animados
//  desenharFrente         -> lava, água, escuridão, vento, aviso de inversão (por cima de tudo)
// Nada de shadowBlur/filter por quadro: o que é pesado vai para canvases de cache.
// =========================
const ArteCenarios = (function() {
  const L = 1280, A = 720, TAU = Math.PI * 2, TINTA = "#1b1030";
  let cache = { id: "" };      // sprites do cenário atual (jogado fora ao trocar de cenário)
  const brilhos = {};          // sprites de brilho por cor (pequenos, ficam para sempre)
  let masc = null, mascG = null, ultT = 0, acVento = 0;

  // ---------- ajudantes ----------
  function nova(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function rnd(s) { s = s >>> 0; return function() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function ca(h, a) { const n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
  function lin(g, x0, y0, x1, y1, p) { const q = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < p.length; i++) q.addColorStop(p[i][0], p[i][1]); return q; }
  function rad(g, x, y, r, p, x2, y2) { const q = g.createRadialGradient(x2 == null ? x : x2, y2 == null ? y : y2, 0, x, y, r); for (let i = 0; i < p.length; i++) q.addColorStop(p[i][0], p[i][1]); return q; }
  function rr(g, x, y, w, h, r, cont) { r = Math.max(0, Math.min(r, w / 2, h / 2)); if (!cont) g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function C(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
  function poli(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  function mod(a, b) { return ((a % b) + b) % b; }
  function dado(k, fn) { return cache[k] || (cache[k] = fn()); }
  function spr(k, w, h, fn) { let c = cache[k]; if (!c) { c = nova(w, h); fn(c.getContext("2d"), w, h); cache[k] = c; } return c; }
  // sprite de brilho (radial) numa cor
  function brilho(cor) {
    let c = brilhos[cor];
    if (!c) { c = nova(64, 64); const g = c.getContext("2d"); g.fillStyle = rad(g, 32, 32, 32, [[0, ca(cor, 1)], [.25, ca(cor, .55)], [.6, ca(cor, .14)], [1, ca(cor, 0)]]); g.fillRect(0, 0, 64, 64); brilhos[cor] = c; }
    return c;
  }
  // desenha brilho aditivo
  function luz(g, x, y, r, cor, a) { const ga = g.globalAlpha, go = g.globalCompositeOperation; g.globalCompositeOperation = "lighter"; g.globalAlpha = a; g.drawImage(brilho(cor), x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = go; g.globalAlpha = ga; }
  function halo(g, x, y, r, cor, a) { const ga = g.globalAlpha; g.globalAlpha = a; g.drawImage(brilho(cor), x - r, y - r, r * 2, r * 2); g.globalAlpha = ga; }
  function ceu(g, c, p) { g.fillStyle = lin(g, 0, 0, 0, A, p); g.fillRect(-60, c.top - 10, L + 120, c.bot - c.top + 20); }
  function estrelas(g, n, seed, y0, y1, cor) {
    const r = rnd(seed); g.fillStyle = cor || "#fff";
    for (let i = 0; i < n; i++) { g.globalAlpha = .25 + r() * .75; const s = r() < .12 ? 2.4 : 1.3; g.fillRect(r() * L, y0 + r() * (y1 - y0), s, s); }
    g.globalAlpha = 1;
  }
  // estrelinha de 4 pontas
  function faisca(g, x, y, r, cor) { g.fillStyle = cor; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }
  function colinaY(x, y, amp, per, fase) { return y + Math.sin(x / per + fase) * amp + Math.sin(x / per * 2.3 + fase * 1.7) * amp * .35; }
  function colina(g, y, amp, per, fase, c0, c1, bot) {
    g.beginPath(); g.moveTo(-10, bot);
    for (let x = -10; x <= L + 10; x += 16) g.lineTo(x, colinaY(x, y, amp, per, fase));
    g.lineTo(L + 10, bot); g.closePath(); g.fillStyle = lin(g, 0, y - amp, 0, y + amp * 2.5, [[0, c0], [1, c1]]); g.fill();
  }
  // cordilheira de picos: sh = [cor, alpha] sombra do lado direito, neve = cor do topo
  function serra(g, y, alt, passo, seed, c0, c1, bot, sh, neve) {
    const r = rnd(seed), p = [];
    for (let x = -passo; x <= L + passo; x += passo) { p.push([x, y - alt * (.45 + .55 * r())]); p.push([x + passo / 2, y - alt * (.1 + .2 * r())]); }
    g.beginPath(); g.moveTo(-passo, bot); p.forEach(q => g.lineTo(q[0], q[1])); g.lineTo(L + passo, bot); g.closePath();
    g.fillStyle = lin(g, 0, y - alt, 0, y + 40, [[0, c0], [1, c1]]); g.fill();
    for (let i = 0; i < p.length - 1; i += 2) {
      const a = p[i], v = p[i + 1], u = p[i - 1] || [a[0] - passo / 2, a[1] + 30];
      if (sh) { g.fillStyle = lin(g, 0, y - alt, 0, y + 40, [[0, ca(sh[0], sh[1])], [1, ca(sh[0], 0)]]); poli(g, [a[0], a[1], v[0], v[1], v[0], y + 40, a[0], y + 40]); g.fill(); }
      if (neve) { g.fillStyle = neve; poli(g, [a[0], a[1], a[0] + (v[0] - a[0]) * .3, a[1] + (v[1] - a[1]) * .3, a[0] + (v[0] - a[0]) * .18, a[1] + 16 + (v[1] - a[1]) * .22, a[0], a[1] + 26 + (v[1] - a[1]) * .1, a[0] - (a[0] - u[0]) * .2, a[1] + 14 + (u[1] - a[1]) * .22, a[0] - (a[0] - u[0]) * .3, a[1] + (u[1] - a[1]) * .3]); g.fill(); }
    }
    return p;
  }
  function bruma(g, y0, y1, cor, a) { g.fillStyle = lin(g, 0, y0, 0, y1, [[0, ca(cor, 0)], [1, ca(cor, a)]]); g.fillRect(-20, y0, L + 40, y1 - y0); }
  function nuvem(g, x, y, s) { // nuvem fofa (usa o fillStyle atual)
    g.beginPath();
    [[0, 0, 26], [30, -14, 32], [66, -6, 28], [94, 4, 22], [-26, 6, 20]].forEach(q => { g.moveTo(x + (q[0] + q[2]) * s, y + q[1] * s); g.arc(x + q[0] * s, y + q[1] * s, q[2] * s, 0, TAU); });
    rr(g, x - 30 * s, y + 2 * s, 146 * s, 24 * s, 12 * s, true); g.fill();
  }
  function nuvemSpr(a, b, k, e) { // sprite de nuvem (260 x 110 vezes a escala e), desenhado sem redimensionar
    e = e || 1; return spr("nv" + (k || "") + a + b + e, 260 * e, 110 * e, (g) => { g.scale(e, e); g.fillStyle = lin(g, 0, 0, 0, 80, [[0, a], [1, b]]); nuvem(g, 56, 60, 1.35); });
  }
  function pinheiro(g, x, y, h, c0, c1, neve) {
    g.fillStyle = c1; g.fillRect(x - h * .04, y - h * .12, h * .08, h * .12);
    for (let i = 0; i < 3; i++) {
      const yy = y - h * .1 - i * h * .27, w = h * .3 * (1 - i * .22);
      g.fillStyle = i % 2 ? c1 : c0; poli(g, [x, yy - h * .42, x + w, yy, x - w, yy]); g.fill();
      if (neve) { g.fillStyle = neve; poli(g, [x, yy - h * .42, x + w * .45, yy - h * .2, x + w * .15, yy - h * .24, x - w * .2, yy - h * .17, x - w * .45, yy - h * .2]); g.fill(); }
    }
  }
  function arvore(g, x, y, s, c0, c1) {
    g.fillStyle = "#6a4630"; rr(g, x - 5 * s, y - 34 * s, 10 * s, 36 * s, 3 * s); g.fill();
    [[0, -58, 30], [-22, -42, 22], [22, -42, 22]].forEach(q => { C(g, x + q[0] * s, y + q[1] * s, q[2] * s); g.fillStyle = c0; g.fill(); });
    C(g, x - 8 * s, y - 66 * s, 15 * s); g.fillStyle = c1; g.fill();
  }
  function predio(g, x, y, w, h, c0, c1, jan, r, pj) { // prédio com janelinhas acesas
    g.fillStyle = lin(g, 0, y, 0, y + Math.min(h, 400), [[0, c0], [1, c1]]); g.fillRect(x, y, w, h);
    for (let j = y + 12; j < y + h - 10; j += 16) for (let i = x + 8; i < x + w - 12; i += 14) if (r() < pj) { g.fillStyle = jan[(r() * jan.length) | 0]; g.globalAlpha = .4 + r() * .45; g.fillRect(i, j, 7, 9); }
    g.globalAlpha = 1;
  }
  function vinheta(g, c, a) {
    g.fillStyle = rad(g, 640, 360, 820, [[.45, "rgba(0,0,0,0)"], [1, "rgba(0,0,0," + a + ")"]], 640, 360);
    g.fillRect(-60, c.top - 10, L + 120, c.bot - c.top + 20);
  }

  // =========================
  // PLATAFORMAS (sprites em cache; origem do desenho = canto da plataforma, P = margem do contorno)
  // =========================
  const P = 14;
  // corpo arredondado com gradiente, detalhes recortados, contorno escuro e brilho no topo
  function corpo(g, w, h, r, c0, c1, bd, det) {
    g.save(); g.beginPath(); rr(g, 0, 0, w, h, r); g.fillStyle = lin(g, 0, 0, 0, Math.min(h, 110), [[0, c0], [1, c1]]); g.fill();
    g.clip(); if (det) det(g, w, h); g.restore();
    g.beginPath(); rr(g, 0, 0, w, h, r); g.lineWidth = 3; g.lineJoin = "round"; g.strokeStyle = bd || TINTA; g.stroke();
    g.beginPath(); g.moveTo(r, 3.5); g.lineTo(w - r, 3.5); g.lineWidth = 2; g.lineCap = "round"; g.strokeStyle = "rgba(255,255,255,.38)"; g.stroke();
  }
  function prancha(g, w, h, p) { // tábua de madeira com tufinhos em cima
    corpo(g, w, h, 8, p.w0, p.w1, p.wb, (g, w, h) => {
      g.strokeStyle = "rgba(50,24,8,.32)"; g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const y = 6 + i * 5; g.beginPath(); g.moveTo(10, y); g.bezierCurveTo(w * .3, y - 2, w * .6, y + 2, w - 10, y); g.stroke(); }
      g.fillStyle = "rgba(40,20,8,.55)"; [9, w - 9].forEach(x => { C(g, x, h / 2, 2); g.fill(); });
    });
    if (p.g1) { const r = rnd(w); g.fillStyle = p.g1; g.strokeStyle = p.gb; g.lineWidth = 1.5; for (let x = 10; x < w - 8; x += 20 + r() * 26) { g.beginPath(); g.moveTo(x, 1); g.lineTo(x + 2, -8); g.lineTo(x + 5, 0); g.lineTo(x + 8, -10); g.lineTo(x + 11, 1); g.closePath(); g.fill(); g.stroke(); } }
  }
  const K = {
    terra(g, w, h, o) {
      const p = o.pal; if (o.fina) return prancha(g, w, h, p);
      const r = rnd(w * 3 + h);
      corpo(g, w, h, 9, p.a, p.b, p.bd, (g, w, h) => {
        g.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < w / 12; i++) { g.beginPath(); g.ellipse(r() * w, 24 + r() * (Math.min(h, 90) - 28), 2 + r() * 4, 1.5 + r() * 2.5, 0, 0, TAU); g.fill(); }
        g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, 13); for (let x = w; x > 0; x -= 18) g.quadraticCurveTo(x - 9, 25, x - 18, 13); g.closePath();
        g.fillStyle = lin(g, 0, 0, 0, 24, [[0, p.g0], [1, p.g1]]); g.fill(); g.strokeStyle = p.gb; g.lineWidth = 2; g.stroke();
      });
    },
    gelo(g, w, h, o) {
      const r = rnd(w + h * 7);
      corpo(g, w, h, 10, "#dff6ff", "#7cc8f0", "#245a96", (g, w, h) => {
        g.fillStyle = "rgba(255,255,255,.35)"; for (let x = -20; x < w; x += 46 + r() * 30) { poli(g, [x, 0, x + 14, 0, x - 12 + 30, Math.min(h, 90), x - 6, Math.min(h, 90)]); g.fill(); }
        g.strokeStyle = "rgba(60,130,200,.35)"; g.lineWidth = 1.5; for (let i = 0; i < w / 40; i++) { g.beginPath(); const x = r() * w, y = 8 + r() * Math.min(h - 8, 60); g.moveTo(x, y); g.lineTo(x + 14 + r() * 18, y + 10 + r() * 10); g.lineTo(x + 30 + r() * 10, y + r() * 8); g.stroke(); }
      });
      g.fillStyle = "#fff"; g.strokeStyle = "#8cc4e6"; g.lineWidth = 2; g.beginPath(); g.moveTo(-2, 6); g.lineTo(-2, -3);
      for (let x = -2; x < w + 2; x += 20) g.quadraticCurveTo(x + 10, -12 - r() * 4, x + 20, -3);
      g.lineTo(w + 2, 8); for (let x = w + 2; x > -2; x -= 17) g.quadraticCurveTo(x - 8, 17, x - 17, 8); g.closePath(); g.fill(); g.stroke();
      if (!o.baixo) { g.fillStyle = "#c8ecff"; g.strokeStyle = "#245a96"; g.lineWidth = 2; for (let x = 14; x < w - 10; x += 22 + r() * 34) { const l = 8 + r() * 14; poli(g, [x, h - 1, x + 7, h - 1, x + 3.5, h + l]); g.fill(); g.stroke(); } }
    },
    lua(g, w, h) {
      const r = rnd(w + h);
      corpo(g, w, h, 9, "#d4d0e2", "#8a86a0", "#2a2540", (g, w, h) => {
        for (let i = 0; i < w / 40; i++) { const x = 14 + r() * (w - 28), y = 8 + r() * Math.min(h - 14, 60), a = 5 + r() * 9; g.fillStyle = "rgba(60,56,90,.38)"; g.beginPath(); g.ellipse(x, y, a, a * .4, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y - 1, a, a * .4, 0, Math.PI, TAU); g.stroke(); }
      });
    },
    rocha(g, w, h) {
      const r = rnd(w * 5 + h);
      corpo(g, w, h, 11, "#5a4058", "#241626", "#10060f", (g, w, h) => {
        const hh = Math.min(h, 110);
        for (let k = 0; k < Math.max(2, w / 90); k++) {
          let x = 14 + r() * (w - 28), y = hh * .35; g.beginPath(); g.moveTo(x, 4);
          for (let i = 0; i < 4; i++) { x += (r() - .5) * 36; y += 8 + r() * hh * .18; g.lineTo(x, Math.min(y, hh)); }
          g.strokeStyle = "rgba(255,90,20,.55)"; g.lineWidth = 5; g.stroke(); g.strokeStyle = "#ffcf5a"; g.lineWidth = 1.6; g.stroke();
        }
        g.fillStyle = "rgba(255,120,50,.28)"; g.fillRect(0, 0, w, 5);
      });
    },
    asteroide(g, w, h, o) {
      const r = rnd((o.i + 3) * 99), pal = [["#b8a8e8", "#5a4a92"], ["#e0a47c", "#85503e"], ["#8fd8c4", "#3e7f7c"], ["#e8c0d8", "#8a5a86"], ["#a8c0f0", "#4a5f9c"]][o.i % 5], n = 16, p = [];
      for (let i = 0; i < n; i++) { const a = i / n * TAU, cs = Math.cos(a), sn = Math.sin(a), k = .93 + r() * .07; p.push([w / 2 + w / 2 * Math.sign(cs) * Math.pow(Math.abs(cs), .55) * k, h / 2 + h / 2 * Math.sign(sn) * Math.pow(Math.abs(sn), .55) * k]); }
      const trilha = () => { g.beginPath(); const m0 = [(p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2]; g.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } g.closePath(); };
      g.save(); trilha(); g.fillStyle = rad(g, w * .9, h * 1.1, w, [[0, pal[1]], [1, pal[0]]], w * .3, h * .1); g.fillStyle = lin(g, 0, 0, w * .5, h, [[0, pal[0]], [1, pal[1]]]); g.fill(); g.clip();
      for (let i = 0; i < 6; i++) { const x = r() * w, y = 14 + r() * (h - 20), a = 6 + r() * 10; g.fillStyle = "rgba(30,20,60,.3)"; g.beginPath(); g.ellipse(x, y, a, a * .6, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y - 1, a, a * .6, 0, Math.PI, TAU); g.stroke(); }
      g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(0, 0, w, 6); g.restore();
      trilha(); g.lineWidth = 3; g.lineJoin = "round"; g.strokeStyle = TINTA; g.stroke();
    },
    tech(g, w, h) {
      corpo(g, w, h, 6, "#dcecf6", "#6a8ca6", "#10283a", (g, w, h) => {
        const hh = Math.min(h, 110);
        g.strokeStyle = "rgba(20,50,80,.3)"; g.lineWidth = 1.5; for (let x = 60; x < w - 20; x += 60) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, hh); g.stroke(); }
        g.fillStyle = "#ffd23a"; for (const x of [0, w - 26]) { g.save(); g.beginPath(); g.rect(x, 0, 26, h); g.clip(); for (let i = -h; i < 40; i += 12) { poli(g, [x + i, h, x + i + 6, h, x + i + 6 + h, 0, x + i + h, 0]); g.fill(); } g.restore(); }
        g.fillStyle = "#38f0ff"; g.fillRect(32, 5, w - 64, 3); g.fillRect(32, h - 8, w - 64, 3);
        if (h > 40) for (let x = 90; x < w - 50; x += 120) { C(g, x, 30, 12); g.fillStyle = "#4a6a82"; g.fill(); C(g, x, 30, 8); g.fillStyle = "#1c3248"; g.fill(); g.strokeStyle = "#7fa0b8"; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 8, 30); g.lineTo(x + 8, 30); g.moveTo(x, 22); g.lineTo(x, 38); g.stroke(); }
      });
    },
    steel(g, w, h) {
      corpo(g, w, h, 5, "#78889a", "#3a4452", "#12161d", (g, w, h) => {
        g.fillStyle = "#ffae1a"; for (let i = -8; i < w; i += 22) { poli(g, [i, 7, i + 11, 7, i + 4, 0, i - 7, 0]); g.fill(); }
        g.fillStyle = "#12161d"; g.fillRect(0, 7, w, 2);
        g.fillStyle = "rgba(20,24,32,.55)"; for (let x = 0; x < w; x += 76) g.fillRect(x, 12, 3, Math.min(h, 100));
        g.fillStyle = "#b8c4d0"; for (let x = 12; x < w; x += 38) { C(g, x, h > 30 ? 20 : h - 7, 2.4); g.fill(); }
      });
    },
    esteira(g, w, h) {
      if (h <= 30) { // capsula com rolos nas pontas
        corpo(g, w, h, h / 2, "#4a4a5a", "#26262f", "#0d0d14");
        [h / 2, w - h / 2].forEach(x => { C(g, x, h / 2, h / 2 - 3); g.fillStyle = lin(g, x - 8, 0, x + 8, h, [[0, "#c8ccd8"], [1, "#68707c"]]); g.fill(); C(g, x, h / 2, 3); g.fillStyle = "#222"; g.fill(); });
        return;
      }
      corpo(g, w, h, 6, "#6a7684", "#2e3642", "#10131a", (g, w, h) => {
        g.fillStyle = "#1c1c26"; g.fillRect(0, 0, w, 25);
        g.fillStyle = "#ffae1a"; for (let i = 0; i < w; i += 26) g.fillRect(i, 28, 13, 4);
        g.fillStyle = "rgba(0,0,0,.35)"; for (let x = 20; x < w - 30; x += 80) { rr(g, x, 40, 44, 12, 4); g.fill(); }
        g.fillStyle = "#98a4b2"; for (let x = 10; x < w; x += 40) { C(g, x, 36, 2.2); g.fill(); }
      });
    },
    dojo(g, w, h) {
      const r = rnd(w);
      if (h < 30 || w < 300) return prancha(g, w, h, { w0: "#d24a3a", w1: "#8a1e26", wb: "#2a0a12" });
      // ringue: rocha flutuante embaixo, madeira vermelha laqueada, tatame de palha em cima
      g.save(); g.beginPath(); g.moveTo(14, h - 4); g.quadraticCurveTo(w * .3, h + 30, w * .5 - 40, h + 70); g.quadraticCurveTo(w * .5, h + 96, w * .5 + 40, h + 70); g.quadraticCurveTo(w * .7, h + 30, w - 14, h - 4); g.closePath();
      g.fillStyle = lin(g, 0, h, 0, h + 90, [[0, "#6a4a58"], [1, "#2e2038"]]); g.fill(); g.lineWidth = 3; g.strokeStyle = TINTA; g.stroke();
      g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w * (.2 + r() * .6), h + 2); g.lineTo(w * (.35 + r() * .3), h + 20 + r() * 40); g.stroke(); } g.restore();
      corpo(g, w, h, 8, "#cc3040", "#78141e", "#2a0810", (g, w, h) => {
        g.fillStyle = "#f2d896"; g.fillRect(0, 0, w, 15); g.fillStyle = "#d8b66a"; g.fillRect(0, 12, w, 4);
        g.strokeStyle = "rgba(150,100,30,.35)"; g.lineWidth = 1; for (let x = 0; x < w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, 12); g.stroke(); }
        g.fillStyle = "#f6c648"; g.fillRect(0, 22, w, 3); g.fillRect(0, h - 7, w, 3);
      });
      g.fillStyle = "#fff"; g.strokeStyle = "#2a0810"; g.lineWidth = 2; [-1, w - 7].forEach(x => { rr(g, x, -4, 8, 22, 3); g.fill(); g.stroke(); }); // cordas nas pontas
    },
    predio(g, w, h, o) {
      const r = rnd(w * 7 + o.i);
      corpo(g, w, h, 4, "#5a68a0", "#232850", "#0b0a2a", (g, w, h) => {
        g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(0, 0, w, 14);
        for (let j = 20; j < Math.min(h, 400) - 8; j += 18) for (let i = 10; i < w - 12; i += 16) { g.fillStyle = r() < .55 ? (r() < .5 ? "#ffd36a" : "#6af0ff") : "rgba(10,10,40,.55)"; g.fillRect(i, j, 8, 10); }
      });
      g.save(); g.shadowColor = "#3dfff0"; g.shadowBlur = 12; g.strokeStyle = "#8ffff6"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(6, -1); g.lineTo(w - 6, -1); g.stroke(); g.restore();
    },
    hover(g, w, h) {
      corpo(g, w, h, h / 2, "#4a2a7a", "#1c0e3a", "#0b0620", (g, w, h) => { g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, 0, w, 5); });
      g.save(); g.shadowColor = "#ff3df2"; g.shadowBlur = 12; g.strokeStyle = "#ff8af6"; g.lineWidth = 2.5; g.beginPath(); rr(g, 3, 3, w - 6, h - 6, h / 2 - 3); g.stroke(); g.restore();
      for (let i = 0; i < 5; i++) { C(g, w * (.2 + i * .15), h - 6, 2.5); g.fillStyle = "#7ffcff"; g.fill(); }
    },
    andaime(g, w, h) {
      g.strokeStyle = "#0b0a2a"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); for (let x = 10; x < w - 10; x += 20) { g.moveTo(x, h - 3); g.lineTo(x + 20, 6); } g.stroke();
      g.strokeStyle = "#8a92c8"; g.lineWidth = 2; g.beginPath(); for (let x = 10; x < w - 10; x += 20) { g.moveTo(x, h - 3); g.lineTo(x + 20, 6); } g.stroke();
      corpo(g, w, 10, 4, "#ffd23a", "#c9921a", "#1a1030");
      g.fillStyle = "#1a1030"; for (let x = 8; x < w - 8; x += 16) g.fillRect(x, 4, 7, 2);
    },
    neon(g, w, h, o) {
      const cor = ["#3df0ff", "#ff3df2", "#ffe03d", "#6dff7a"][o.i % 4];
      corpo(g, w, h, 8, "#3a1a6a", "#150838", "#0a0420", (g, w, h) => {
        g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(0, 0, w, 6);
        g.fillStyle = cor; g.globalAlpha = .75; for (let x = 12; x < w - 6; x += 24) { C(g, x, Math.min(h - 7, 15), 2); g.fill(); } g.globalAlpha = 1;
      });
      g.save(); g.shadowColor = cor; g.shadowBlur = 14; g.strokeStyle = cor; g.lineWidth = 2.5; g.beginPath(); rr(g, 2, 2, w - 4, h - 4, 7); g.stroke(); g.stroke(); g.restore();
    },
    galho(g, w, h) {
      const r = rnd(w * 11);
      corpo(g, w, h, h / 2, "#7a5438", "#3e2a22", "#150d0a", (g, w, h) => {
        g.strokeStyle = "rgba(20,10,6,.4)"; g.lineWidth = 1.5; for (let x = 10; x < w - 10; x += 14 + r() * 14) { g.beginPath(); g.moveTo(x, 3); g.quadraticCurveTo(x + 4, h / 2, x - 2, h - 3); g.stroke(); }
        g.fillStyle = "#3f8a52"; g.fillRect(0, 0, w, 5);
      });
      for (let i = 0; i < w / 18; i++) { const x = 8 + r() * (w - 16), y = r() < .6 ? h - 2 : 2, a = (r() - .5) * 1.6 + (y > 5 ? Math.PI / 2 : -Math.PI / 2); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = r() < .5 ? "#2f8a4a" : "#46b05c"; g.strokeStyle = "#103a24"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(7, 0, 8, 3.8, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    },
    arenito(g, w, h) {
      const r = rnd(w * 3 + h), pil = h > w * 1.2;
      corpo(g, w, h, pil ? 6 : 8, "#f2c078", "#bf7a3a", "#5a2f18", (g, w, h) => {
        g.strokeStyle = "rgba(140,70,30,.3)"; g.lineWidth = 2;
        if (pil) { for (let x = 12; x < w - 6; x += 14) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, h - 4); g.stroke(); } g.fillStyle = "rgba(120,60,20,.5)"; g.fillRect(0, 26, w, 14); g.fillStyle = "#ffe9a8"; for (let x = 8; x < w - 6; x += 12) g.fillRect(x, 30, 5, 6); g.fillStyle = "#ffe0a0"; g.fillRect(0, 0, w, 10); g.fillStyle = "rgba(120,60,20,.4)"; g.fillRect(0, h - 14, w, 14); return; }
        for (let y = 12; y < Math.min(h, 100); y += 9 + r() * 6) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y - 3, w * .6, y + 3, w, y - 1); g.stroke(); }
        g.fillStyle = "#ffe5a2"; g.fillRect(0, 0, w, 8); g.fillStyle = "rgba(255,255,255,.25)"; for (let i = 0; i < w / 10; i++) g.fillRect(r() * w, 10 + r() * 30, 2, 2);
      });
    },
    coral(g, w, h) {
      const r = rnd(w * 13 + h), solo = h >= 50;
      corpo(g, w, h, 10, solo ? "#ecd9a2" : "#9a62b8", solo ? "#b89860" : "#4a2a6a", solo ? "#5a4020" : "#1d0f33", (g, w, h) => {
        g.fillStyle = "rgba(0,0,0,.14)"; for (let i = 0; i < w / 10; i++) { g.beginPath(); g.ellipse(r() * w, 18 + r() * Math.min(h - 20, 70), 2 + r() * 4, 1.5 + r() * 2, 0, 0, TAU); g.fill(); }
        if (solo) { g.strokeStyle = "rgba(120,80,30,.3)"; g.lineWidth = 2; for (let y = 22; y < 100; y += 14) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y - 4, w * .6, y + 4, w, y); g.stroke(); } }
      });
      const cs = ["#ff6f91", "#ffb347", "#ff4dc4", "#5cf0c8"];
      for (let x = 10; x < w - 8; x += 16 + r() * 26) { const c = cs[(r() * 4) | 0], a = 7 + r() * 5; g.fillStyle = c; g.strokeStyle = "#2a0f3a"; g.lineWidth = 2;
        if (r() < .5) { g.beginPath(); g.moveTo(x - 3, 2); g.lineTo(x - 5, -a); g.lineTo(x + 5, -a - 2); g.lineTo(x + 3, 2); g.closePath(); g.fill(); g.stroke(); } else { C(g, x, -a * .4, a * .55); g.fill(); g.stroke(); } }
    },
    ruina(g, w, h) {
      const r = rnd(w * 7 + h);
      corpo(g, w, h, 5, "#d0c298", "#8c7c5c", "#2a2418", (g, w, h) => {
        const hh = Math.min(h, 110), bw = h < 40 ? 46 : 58;
        g.strokeStyle = "rgba(60,50,30,.4)"; g.lineWidth = 1.5;
        for (let y = h < 40 ? h / 2 : 18; y < hh; y += h < 40 ? 99 : 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        for (let row = 0, y = 0; y < hh; row++, y += h < 40 ? h / 2 : 20) for (let x = (row % 2) * bw / 2; x < w; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (h < 40 ? h / 2 : 20)); g.stroke(); }
        if (h >= 40) { g.fillStyle = "#5af0d0"; g.globalAlpha = .7; for (let x = 40; x < w - 30; x += 90) { g.fillRect(x, 34, 12, 3); g.fillRect(x + 4, 34, 3, 12); } g.globalAlpha = 1; }
        g.fillStyle = "#5aa850"; for (let i = 0; i < w / 14; i++) { g.beginPath(); g.ellipse(r() * w, 2, 5 + r() * 9, 4 + r() * 4, 0, 0, TAU); g.fill(); }
      });
      g.fillStyle = "#4a9a48"; g.strokeStyle = "#1a4a24"; g.lineWidth = 1.5; for (let i = 0; i < w / 40; i++) { const x = 10 + r() * (w - 20); g.beginPath(); g.ellipse(x, 1, 8 + r() * 6, 4, 0, Math.PI, TAU); g.fill(); g.stroke(); }
    },
    tijolo(g, w, h) {
      const r = rnd(w * 9 + h);
      corpo(g, w, h, 4, "#8a80aa", "#48406a", "#14102a", (g, w, h) => {
        const hh = Math.min(h, 110), bh = h < 40 ? 12 : 15, bw = 34;
        for (let row = 0, y = 0; y < hh; row++, y += bh) for (let x = -(row % 2) * bw / 2; x < w; x += bw) { g.fillStyle = "rgba(" + (r() < .5 ? "255,255,255" : "0,0,20") + "," + (.04 + r() * .09) + ")"; g.fillRect(x + 1, y + 1, bw - 2, bh - 2); }
        g.strokeStyle = "rgba(20,14,50,.55)"; g.lineWidth = 1.5;
        for (let row = 0, y = 0; y < hh; row++, y += bh) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = -(row % 2) * bw / 2; x < w; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); } }
        g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(0, 0, w, 7);
      });
    }
  };

  // sprite da plataforma (cache por índice/tamanho/extensão de tela)
  function sprPlat(tema, p, i, est) {
    const dy = Math.ceil(est.deslocY || 0), fixa = !p.move;
    const eb = fixa && p.y + p.h >= 715 ? dy + 6 : 0, ec = fixa && p.y <= 0 ? dy + 6 : 0;
    const k = "p" + i + "|" + p.w + "|" + p.h + "|" + eb + "|" + ec;
    let s = cache[k];
    if (!s) {
      const nome = typeof tema.k === "function" ? tema.k(p) : tema.k, h = p.h + eb + ec;
      const c = nova(p.w + P * 2, h + P * 2 + (nome === "dojo" && p.w > 300 ? 110 : 0)), g = c.getContext("2d");
      g.translate(P, P); K[nome](g, p.w, h, { fina: p.fina, pal: tema.pal, i: i, baixo: eb > 0 });
      s = cache[k] = { c: c, ox: P, oy: P + ec };
    }
    return s;
  }
  // retângulo animado da faixa da esteira (x, y, w, h relativos à plataforma)
  function faixa(p) { return p.h <= 30 ? [p.h / 2, 3, p.w - p.h, p.h - 6] : [4, 4, p.w - 8, 20]; }
  function padraoEsteira(g, dir) {
    return dado("pe" + dir, () => {
      const c = nova(36, 20), q = c.getContext("2d");
      q.fillStyle = "#24242e"; q.fillRect(0, 0, 36, 20); q.fillStyle = "#2e2e3a"; q.fillRect(0, 0, 36, 3);
      q.strokeStyle = "#ffb020"; q.lineWidth = 4; q.lineCap = "round"; q.lineJoin = "round"; q.beginPath();
      q.moveTo(dir > 0 ? 8 : 28, 4); q.lineTo(dir > 0 ? 20 : 16, 10); q.lineTo(dir > 0 ? 8 : 28, 16); q.stroke();
      q.strokeStyle = "rgba(0,0,0,.4)"; q.lineWidth = 1.5; q.beginPath(); q.moveTo(34.5, 0); q.lineTo(34.5, 20); q.stroke();
      return g.createPattern(c, "repeat");
    });
  }
  function bumper(g, b, i, t) {
    const cs = [["#ff3df2", "#8a0f9a"], ["#3df0ff", "#0f5a9a"], ["#ffe03d", "#9a5a0f"], ["#6dff7a", "#0f8a3a"]][i % 4], f = b.flash || 0;
    const s = spr("bp" + b.r + "|" + i % 4, (b.r + 10) * 2, (b.r + 10) * 2, (q, w) => {
      const m = w / 2, r = b.r;
      C(q, m, m, r); q.fillStyle = rad(q, m, m, r, [[0, cs[0]], [1, cs[1]]], m - r * .3, m - r * .3); q.fill(); q.lineWidth = 3.5; q.strokeStyle = TINTA; q.stroke();
      C(q, m, m, r * .74); q.lineWidth = 3; q.strokeStyle = "rgba(255,255,255,.85)"; q.stroke();
      C(q, m, m, r * .56); q.fillStyle = rad(q, m, m, r * .56, [[0, "#fff"], [1, cs[0]]], m - r * .15, m - r * .2); q.fill(); q.lineWidth = 2.5; q.strokeStyle = TINTA; q.stroke();
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; C(q, m + Math.cos(a) * r * .87, m + Math.sin(a) * r * .87, 2.2); q.fillStyle = "#fff"; q.fill(); }
      q.beginPath(); q.ellipse(m - r * .22, m - r * .3, r * .2, r * .1, -.6, 0, TAU); q.fillStyle = "rgba(255,255,255,.8)"; q.fill();
    });
    const e = 1 + f * .2, r = (b.r + 10) * e;
    luz(g, b.x, b.y, b.r * (1.6 + f * .8), cs[0], .22 + f * .6);
    g.drawImage(s, b.x - r, b.y - r, r * 2, r * 2);
    if (f > .02) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = f * .55; g.drawImage(s, b.x - r, b.y - r, r * 2, r * 2); g.restore(); }
  }
  function portal(g, x, y, cor, t, k) {
    const rx = 27, ry = 44, e = Math.sin(t * 4 + k) * .04 + 1;
    const esp = spr("ps" + cor, 96, 96, (q) => { // espiral
      q.translate(48, 48); q.lineCap = "round"; q.strokeStyle = cor; for (let j = 0; j < 3; j++) { q.lineWidth = 6 - j; q.globalAlpha = .9 - j * .2; q.beginPath(); for (let a = 0; a < 9; a += .25) { const r = 4 + a * 4.6; q.lineTo(Math.cos(a + j * 2.1) * r, Math.sin(a + j * 2.1) * r); } q.stroke(); } });
    const anel = spr("pa" + cor, 70, 106, (q) => {
      q.beginPath(); q.ellipse(35, 53, rx, ry, 0, 0, TAU); q.fillStyle = "rgba(10,0,30,.55)"; q.fill();
      q.lineWidth = 9; q.strokeStyle = TINTA; q.stroke(); q.lineWidth = 6; q.strokeStyle = cor; q.stroke(); q.lineWidth = 2; q.strokeStyle = "#fff"; q.beginPath(); q.ellipse(35, 53, rx - 2, ry - 2, 0, 3.6, 5.2); q.stroke();
    });
    luz(g, x, y, 80 * e, cor, .55);
    g.save(); g.translate(x, y); g.drawImage(anel, -35, -53);
    g.beginPath(); g.ellipse(0, 0, rx - 3, ry - 3, 0, 0, TAU); g.clip(); g.scale(rx / ry * 1.5, 1.05); g.rotate(t * 2.2 * (k % 2 ? -1 : 1)); g.globalAlpha = .9; g.drawImage(esp, -ry, -ry, ry * 2, ry * 2); g.restore();
    g.save(); g.globalCompositeOperation = "lighter"; for (let j = 0; j < 4; j++) { const a = t * 2 + j * 1.57 + k; g.globalAlpha = .8; g.drawImage(brilho(cor), x + Math.cos(a) * 38 - 6, y + Math.sin(a) * 52 - 6, 12, 12); } g.restore();
  }

  // =========================
  // TEMAS: cada cenário tem cor de destaque, estilo de plataforma, pre (fundo fixo) e anim (camada animada)
  // =========================
  function nuvensAnim(g, t, lista, cor, a, k) { // nuvens à deriva (um sprite por escala, em posição inteira)
    const ga = g.globalAlpha; g.globalAlpha = a == null ? 1 : a;
    for (const q of lista) { const w = 260 * q[2], x = mod(q[0] + t * q[3], L + w * 1.2) - w; g.drawImage(nuvemSpr(cor[0], cor[1], k, q[2]), Math.round(x), q[1]); }
    g.globalAlpha = ga;
  }
  // estrelas que piscam (posições fixas, alfa pela senoide)
  function piscar(g, t, n, seed, y0, y1, cor) {
    const d = dado("pi" + seed, () => { const r = rnd(seed), a = []; for (let i = 0; i < n; i++) a.push([r() * L, y0 + r() * (y1 - y0), r() * TAU, 1 + r() * 2.5]); return a; });
    g.fillStyle = cor || "#fff";
    for (let i = 0; i < d.length; i++) { const q = d[i]; g.globalAlpha = .25 + .75 * Math.abs(Math.sin(t * q[3] + q[2])); g.fillRect(q[0], q[1], 2, 2); }
    g.globalAlpha = 1;
  }
  function aurora(g, y, alt, fase, cor, a) {
    g.beginPath();
    for (let x = -20; x <= L + 20; x += 20) { const yy = y + Math.sin(x / 170 + fase) * 40 + Math.sin(x / 70 + fase * 2) * 12; x < 0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
    for (let x = L + 20; x >= -20; x -= 20) g.lineTo(x, y + alt + Math.sin(x / 130 + fase) * 30);
    g.closePath(); g.fillStyle = lin(g, 0, y - 40, 0, y + alt + 30, [[0, ca(cor, 0)], [.25, ca(cor, a)], [1, ca(cor, 0)]]); g.fill();
  }

  const T = {};

  // ---------- CAMPO: dia ensolarado, colinas, moinho ----------
  const moinho = () => [1040, colinaY(1040, 540, 26, 150, .5) - 108];
  T.campo = {
    cor: "#7be04a", k: "terra",
    pal: { a: "#a06a44", b: "#5a382c", bd: "#2a1a18", g0: "#9ceb62", g1: "#3fae3f", gb: "#1f5a2a", w0: "#d79a58", w1: "#9a6634", wb: "#3a2210" },
    pre(g, c) {
      ceu(g, c, [[0, "#3b93e6"], [.6, "#86cdf5"], [1, "#e2f6ff"]]);
      halo(g, 190, 110, 330, "#fff4b0", .85);
      C(g, 190, 110, 52); g.fillStyle = "#ffe36a"; g.fill(); C(g, 190, 110, 42); g.fillStyle = "#fff6b8"; g.fill();
      serra(g, 480, 170, 90, 11, "#8fb6e6", "#b4d6f2", c.bot, ["#5a86c0", .25]);
      colina(g, 540, 26, 150, .5, "#97d684", "#7bc16f", c.bot);
      const mx = 1040, my = moinho()[1] + 108 + 4;
      g.fillStyle = "#f3e8d0"; poli(g, [mx - 24, my, mx + 24, my, mx + 14, my - 112, mx - 14, my - 112]); g.fill();
      g.fillStyle = "rgba(160,130,90,.5)"; poli(g, [mx + 6, my, mx + 24, my, mx + 14, my - 112, mx + 4, my - 112]); g.fill();
      g.fillStyle = "#d9534f"; poli(g, [mx - 20, my - 108, mx + 20, my - 108, mx, my - 142]); g.fill();
      g.fillStyle = "#7a5a3a"; rr(g, mx - 8, my - 30, 16, 30, 7); g.fill();
      [[110, .6], [300, .7], [520, .55], [790, .65], [1190, .7]].forEach(q => arvore(g, q[0], colinaY(q[0], 540, 26, 150, .5) + 8, q[1], "#6fb768", "#8ccf7c"));
      colina(g, 600, 22, 120, 2, "#6cc063", "#4ea154", c.bot);
      [[60, 1], [430, 1.05], [700, .9], [1110, 1], [1245, 1.1]].forEach(q => arvore(g, q[0], colinaY(q[0], 600, 22, 120, 2) + 10, q[1], "#4fa04e", "#6bbf5c"));
      const r = rnd(5), cs = ["#ff8fa8", "#fff", "#ffd84a", "#c88bff"];
      for (let i = 0; i < 60; i++) { const x = r() * L; C(g, x, colinaY(x, 600, 22, 120, 2) + 14 + r() * 40, 2.3); g.fillStyle = cs[(r() * 4) | 0]; g.fill(); }
      bruma(g, 430, 560, "#ffffff", .22); vinheta(g, c, .22);
    },
    anim(g, e, t) {
      nuvensAnim(g, t, [[100, 50, .9, 9], [500, 120, .6, 5], [800, 36, 1.1, 12], [1100, 140, .7, 7], [300, 210, .5, 4]], ["#ffffff", "#d3ecff"], .94);
      const p = moinho(); g.save(); g.translate(p[0], p[1]); g.rotate(t * .7);
      for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = "#8a6a4a"; g.fillRect(0, -2.5, 78, 5); g.fillStyle = "#fffaf0"; g.fillRect(16, -14, 58, 12); g.strokeStyle = "rgba(120,90,60,.5)"; g.lineWidth = 1; g.strokeRect(16, -14, 58, 12); }
      C(g, 0, 0, 7); g.fillStyle = "#d9534f"; g.fill(); g.restore();
      g.strokeStyle = "#2a3a5a"; g.lineWidth = 2; g.lineCap = "round"; g.beginPath();
      for (let i = 0; i < 3; i++) { const x = mod(t * (34 + i * 6) + i * 400, L + 100) - 50, y = 150 + i * 46 + Math.sin(t * 1.3 + i) * 8, f = Math.sin(t * 9 + i * 2) * 5; g.moveTo(x - 9, y - 4 + f); g.quadraticCurveTo(x - 4, y - 5 - f, x, y); g.quadraticCurveTo(x + 4, y - 5 - f, x + 9, y - 4 + f); }
      g.stroke();
    }
  };

  // ---------- GELO: noite polar, aurora, neve caindo ----------
  T.gelo = {
    cor: "#8fe3ff", k: "gelo",
    pre(g, c) {
      ceu(g, c, [[0, "#091238"], [.45, "#1c4690"], [1, "#8fd4f0"]]);
      estrelas(g, 170, 3, c.top, 420, "#e8f4ff");
      g.save(); g.globalCompositeOperation = "lighter"; aurora(g, 120, 130, 0, "#46ffb0", .32); aurora(g, 200, 90, 2, "#4ad0ff", .22); aurora(g, 90, 100, 4, "#b07bff", .2); g.restore();
      luz(g, 1070, 120, 150, "#cfe8ff", .6); C(g, 1070, 120, 34); g.fillStyle = "#f2f8ff"; g.fill();
      g.fillStyle = "rgba(150,180,220,.5)"; [[-10, -8, 8], [12, 6, 6], [-4, 14, 4]].forEach(q => { C(g, 1070 + q[0], 120 + q[1], q[2]); g.fill(); });
      serra(g, 500, 260, 110, 21, "#cfeaff", "#5e8cc8", c.bot, ["#1c3a7a", .45], "#ffffff");
      serra(g, 565, 150, 90, 22, "#a8d4ee", "#7ab0d8", c.bot, ["#2a5a9a", .4], "#ffffff");
      colina(g, 610, 16, 150, 1, "#eef9ff", "#c4e2f4", c.bot);
      const r = rnd(9);
      [[40, 120], [120, 90], [330, 110], [560, 80], [740, 100], [960, 120], [1180, 100], [1250, 130]].forEach(q => pinheiro(g, q[0], colinaY(q[0], 610, 16, 150, 1) + 10, q[1], "#2f7a66", "#1e5a54", "#ffffff"));
      // boneco de neve
      const sx = 1130, sy = colinaY(sx, 610, 16, 150, 1) + 12;
      [[0, -18, 20], [0, -50, 15], [0, -74, 11]].forEach(q => { C(g, sx + q[0], sy + q[1], q[2]); g.fillStyle = lin(g, sx - 20, 0, sx + 20, 0, [[0, "#fff"], [1, "#bcd8f0"]]); g.fill(); g.lineWidth = 2; g.strokeStyle = "#5a86b8"; g.stroke(); });
      g.fillStyle = "#222"; [[-4, -77], [4, -77]].forEach(q => { C(g, sx + q[0], sy + q[1], 1.6); g.fill(); }); g.fillStyle = "#ff8a2a"; poli(g, [sx, -74 + sy, sx + 12, -72 + sy, sx, -71 + sy]); g.fill();
      g.fillStyle = "#e0405a"; rr(g, sx - 12, sy - 66, 24, 5, 2.5); g.fill();
      bruma(g, 430, 620, "#cfeaff", .25); vinheta(g, c, .3);
    },
    anim(g, e, t, c) {
      const au = dado("au", () => spr("aur", L + 40, 320, q => { q.translate(20, 0); q.globalCompositeOperation = "lighter"; aurora(q, 130, 130, 1, "#46ffb0", .5); aurora(q, 150, 100, 3, "#9a7bff", .4); }));
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = .3 + .25 * Math.sin(t * .8); g.drawImage(au, Math.round(Math.sin(t * .3) * 24), c.top < -50 ? Math.round(c.top * .3) : 0); g.restore();
      piscar(g, t, 28, 4, c.top, 400, "#fff");
      const H = c.bot - c.top, n = 70;
      g.fillStyle = "#fff";
      for (let i = 0; i < n; i++) {
        const k = i * .6180339, sp = 28 + (i % 5) * 16, x = mod((k % 1) * L + Math.sin(t * .8 + i) * 22 + t * 10, L + 20) - 10, y = mod(((k * 7) % 1) * H + t * sp, H + 20) + c.top - 10, s = 2 + (i % 3);
        g.globalAlpha = .55 + (i % 4) * .12; g.fillRect(x, y, s, s);
      }
      g.globalAlpha = 1;
    }
  };

  // ---------- LUA: Terra no céu, estrelas, superfície cinza ----------
  T.lua = {
    cor: "#cfd3ff", k: "lua",
    pre(g, c) {
      ceu(g, c, [[0, "#04020e"], [1, "#1b1840"]]);
      estrelas(g, 340, 5, c.top, 560, "#fff"); estrelas(g, 50, 6, c.top, 500, "#bfd8ff");
      const ex = 1010, ey = 165, er = 82;
      luz(g, ex, ey, 200, "#5ab4ff", .5);
      g.save(); C(g, ex, ey, er); g.clip();
      g.fillStyle = rad(g, ex, ey, er, [[0, "#6cc8ff"], [1, "#1a5fb4"]], ex - 25, ey - 25); g.fillRect(ex - er, ey - er, er * 2, er * 2);
      g.fillStyle = "#4fb35a"; [[-30, -20, 30, 22], [20, 10, 24, 30], [-10, 40, 22, 12], [40, -40, 14, 12]].forEach(q => { g.beginPath(); g.ellipse(ex + q[0], ey + q[1], q[2], q[3], .5, 0, TAU); g.fill(); });
      g.fillStyle = "rgba(255,255,255,.8)"; [[-30, -50, 36, 6], [10, -10, 40, 7], [-34, 28, 30, 6], [30, 48, 26, 5]].forEach(q => { g.beginPath(); g.ellipse(ex + q[0], ey + q[1], q[2], q[3], -.15, 0, TAU); g.fill(); });
      g.fillStyle = rad(g, ex + 70, ey + 60, er * 1.5, [[0, "rgba(2,6,30,.85)"], [.6, "rgba(2,6,30,.45)"], [1, "rgba(2,6,30,0)"]]); g.fillRect(ex - er, ey - er, er * 2, er * 2);
      g.restore(); C(g, ex, ey, er); g.lineWidth = 2.5; g.strokeStyle = "rgba(150,210,255,.55)"; g.stroke();
      serra(g, 560, 100, 110, 31, "#625f86", "#403e60", c.bot, ["#10102a", .4]);
      colina(g, 612, 16, 170, .4, "#9693b6", "#64618a", c.bot);
      const r = rnd(7);
      for (let i = 0; i < 9; i++) { const x = 40 + r() * 1200, y = 625 + r() * 28, a = 30 + r() * 50; g.fillStyle = "rgba(40,36,70,.4)"; g.beginPath(); g.ellipse(x, y, a, a * .18, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 1, a, a * .18, 0, Math.PI, TAU); g.stroke(); }
      // bandeira e módulo lunar
      const fx = 1130, fy = 636; g.fillStyle = "#e8e8f4"; g.fillRect(fx, fy - 70, 3, 70); g.fillStyle = "#ff5a6a"; g.fillRect(fx + 3, fy - 70, 36, 22); faisca(g, fx + 21, fy - 59, 7, "#fff");
      const lx = 790, ly = 640; g.strokeStyle = "#2a2540"; g.lineWidth = 3; g.beginPath(); g.moveTo(lx - 10, ly - 12); g.lineTo(lx - 28, ly); g.moveTo(lx + 10, ly - 12); g.lineTo(lx + 28, ly); g.stroke();
      rr(g, lx - 20, ly - 38, 40, 28, 8); g.fillStyle = lin(g, 0, ly - 38, 0, ly - 10, [[0, "#f0d070"], [1, "#b88a30"]]); g.fill(); g.lineWidth = 3; g.stroke(); C(g, lx, ly - 24, 6); g.fillStyle = "#4a6aa0"; g.fill();
      vinheta(g, c, .3);
    },
    anim(g, e, t, c) {
      piscar(g, t, 45, 8, c.top, 540, "#fff");
      const k = mod(t, 8) / 1.2; // estrela cadente
      if (k < 1) { const x = 300 + k * 420, y = 60 + k * 170; g.save(); g.globalAlpha = 1 - k; g.strokeStyle = "#fff"; g.lineWidth = 2; g.lineCap = "round"; g.beginPath(); g.moveTo(x - 70, y - 28); g.lineTo(x, y); g.stroke(); g.restore(); }
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 12; i++) { g.globalAlpha = .35 + .3 * Math.sin(t + i); const x = (i * 107) % L, y = 380 + (i * 61) % 240 + Math.sin(t * .6 + i) * 18; g.drawImage(brilho("#cfd3ff"), x, y, 8, 8); }
      g.restore();
    }
  };

  // ---------- VULCÃO: céu vermelho, vulcão com lava, brasas ----------
  T.vulcao = {
    cor: "#ff6a1a", k: "rocha",
    pre(g, c) {
      ceu(g, c, [[0, "#14050f"], [.4, "#4e1022"], [.75, "#a82a1a"], [1, "#ff7a2a"]]);
      estrelas(g, 30, 3, c.top, 160, "#ffb88a");
      [[120, 120, 1.2], [520, 70, 1.5], [900, 150, 1.3], [1200, 60, 1]].forEach(q => { g.fillStyle = "#b83a20"; nuvem(g, q[0], q[1] + 5, q[2]); g.fillStyle = "#2a0d1c"; nuvem(g, q[0], q[1], q[2]); });
      serra(g, 560, 200, 130, 41, "#3a1626", "#1c0a14", c.bot, ["#000", .3]);
      poli(g, [200, 760, 400, 560, 540, 380, 575, 312, 600, 296, 680, 296, 705, 312, 740, 380, 880, 560, 1080, 760]);
      g.fillStyle = lin(g, 0, 296, 0, 740, [[0, "#3a1a2c"], [1, "#160a12"]]); g.fill();
      luz(g, 640, 296, 190, "#ff6a2a", .9);
      g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.shadowColor = "#ff5a1a"; g.shadowBlur = 16;
      [[[610, 304], [540, 400], [520, 480], [440, 600], [400, 720]], [[670, 304], [730, 410], [760, 500], [850, 610], [890, 720]], [[640, 300], [632, 400], [650, 520], [620, 640]]].forEach(l => { g.beginPath(); g.moveTo(l[0][0], l[0][1]); l.forEach(q => g.lineTo(q[0], q[1])); g.strokeStyle = "#ff5a1a"; g.lineWidth = 7; g.stroke(); g.shadowBlur = 0; g.strokeStyle = "#ffc24a"; g.lineWidth = 2.5; g.stroke(); g.shadowBlur = 16; });
      g.restore();
      g.beginPath(); g.ellipse(640, 298, 52, 9, 0, 0, TAU); g.fillStyle = "#ffcf5a"; g.fill();
      g.fillStyle = rad(g, 640, 780, 560, [[0, "rgba(255,120,30,.6)"], [1, "rgba(255,120,30,0)"]]); g.fillRect(0, 200, L, c.bot);
      g.fillStyle = "#0e050b"; poli(g, [-10, 780, -10, 560, 40, 600, 70, 580, 120, 650, 170, 640, 210, 780]); g.fill(); poli(g, [1290, 780, 1290, 580, 1240, 610, 1200, 570, 1150, 650, 1100, 640, 1070, 780]); g.fill();
      vinheta(g, c, .4);
    },
    anim(g, e, t, c) {
      const fu = nuvemSpr("#4a2a3a", "#1a0a14", "f");
      for (let i = 0; i < 3; i++) { const k = mod(t * .08 + i / 3, 1); g.save(); g.globalAlpha = Math.sin(k * Math.PI) * .75; const s = .45 + k * 1.1; g.drawImage(fu, 640 - 130 * s + Math.sin(k * 4 + i) * 30, 290 - k * 280, 260 * s, 110 * s); g.restore(); }
      g.save(); g.globalCompositeOperation = "lighter"; const H = c.bot - c.top + 100;
      for (let i = 0; i < 38; i++) { const k = mod(t * (.05 + (i % 5) * .012) + i * .137, 1), x = mod(i * 97.3 + Math.sin(t * .9 + i) * 24 + t * 8, L), y = c.bot + 30 - k * H, s = 7 + (i % 3) * 3; g.globalAlpha = Math.sin(k * Math.PI) * .9; g.drawImage(brilho(i % 4 ? "#ff8a2a" : "#ffd36a"), x, y, s, s); }
      g.restore();
    }
  };

  // ---------- ESPAÇO: nebulosa, planeta com anel, asteroides ----------
  T.espaco = {
    cor: "#b46cff", k: "asteroide",
    pre(g, c) {
      ceu(g, c, [[0, "#06041a"], [.5, "#150a38"], [1, "#2a0f4a"]]);
      [[300, 200, 380, "#ff3da8", .26, .3], [820, 240, 420, "#5a3dff", .34, -.4], [1000, 620, 360, "#00c8ff", .18, .2], [200, 640, 320, "#a03dff", .22, -.2], [640, 440, 300, "#ff6a3d", .09, 0], [640, -60, 400, "#3d9bff", .2, 0]].forEach(q => { g.save(); g.translate(q[0], q[1]); g.rotate(q[5]); g.scale(1.7, .8); luz(g, 0, 0, q[2], q[3], q[4]); g.restore(); });
      estrelas(g, 420, 5, c.top, c.bot, "#fff"); estrelas(g, 60, 6, c.top, c.bot, "#ffd0f0"); estrelas(g, 50, 7, c.top, c.bot, "#c0e0ff");
      const r = rnd(2); for (let i = 0; i < 6; i++) { const x = r() * L, y = c.top + r() * (c.bot - c.top); luz(g, x, y, 14, "#fff", .9); faisca(g, x, y, 9 + r() * 6, "rgba(255,255,255,.85)"); }
      // planeta com anel
      const px = 1135, py = 600, pr = 62;
      const anel = (a0, a1) => { g.save(); g.translate(px, py); g.rotate(-.35); g.scale(1, .26); [[118, 18, "rgba(232,200,140,.85)"], [142, 8, "rgba(200,150,220,.6)"]].forEach(q => { g.beginPath(); g.arc(0, 0, q[0], a0, a1); g.lineWidth = q[1]; g.strokeStyle = q[2]; g.stroke(); }); g.restore(); };
      anel(Math.PI, TAU);
      g.save(); C(g, px, py, pr); g.clip(); g.fillStyle = lin(g, 0, py - pr, 0, py + pr, [[0, "#ffb86a"], [.3, "#ff8a6a"], [.5, "#f0a0a0"], [.7, "#d86a8a"], [1, "#8a3a7a"]]); g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      g.fillStyle = rad(g, px + 50, py + 40, pr * 1.6, [[0, "rgba(10,0,40,.85)"], [.55, "rgba(10,0,40,.4)"], [1, "rgba(10,0,40,0)"]]); g.fillRect(px - pr, py - pr, pr * 2, pr * 2); g.restore();
      C(g, px, py, pr); g.lineWidth = 2; g.strokeStyle = "rgba(255,220,200,.35)"; g.stroke(); anel(0, Math.PI);
      C(g, 140, 120, 22); g.fillStyle = rad(g, 140, 120, 22, [[0, "#c8f0ff"], [1, "#3a6ac0"]], 132, 112); g.fill(); luz(g, 140, 120, 60, "#6ac0ff", .35);
      vinheta(g, c, .3);
    },
    anim(g, e, t, c) {
      piscar(g, t, 60, 11, c.top, c.bot, "#fff");
      const k = mod(t, 9) / 1.4; if (k < 1) { const x = 900 - k * 600, y = 40 + k * 140; g.save(); g.globalAlpha = 1 - k; g.globalCompositeOperation = "lighter"; g.strokeStyle = "#bfe0ff"; g.lineWidth = 2.5; g.lineCap = "round"; g.beginPath(); g.moveTo(x + 90, y - 36); g.lineTo(x, y); g.stroke(); g.restore(); luz(g, x, y, 14, "#bfe0ff", 1 - k); }
      // asteroides distantes à deriva
      const a = dado("ad", () => [0, 1, 2, 3, 4, 5].map(i => spr("adr" + i, 40, 40, q => { const r = rnd(i + 5); q.beginPath(); for (let j = 0; j < 9; j++) { const an = j / 9 * TAU, rr_ = 12 + r() * 6; q.lineTo(20 + Math.cos(an) * rr_, 20 + Math.sin(an) * rr_); } q.closePath(); q.fillStyle = lin(q, 0, 0, 40, 40, [[0, "#6a5a90"], [1, "#2a2050"]]); q.fill(); q.lineWidth = 2; q.strokeStyle = "#140a30"; q.stroke(); })));
      g.save(); g.globalAlpha = .55;
      for (let i = 0; i < 6; i++) { const s = 1 + i % 3 * .6, x = mod(i * 230 + t * (5 + i * 2), L + 100) - 50, y = 80 + (i * 119) % 560 + Math.sin(t * .3 + i) * 14; g.save(); g.translate(x, y); g.rotate(t * .2 * (i % 2 ? 1 : -1) + i); g.drawImage(a[i], -20 * s, -20 * s, 40 * s, 40 * s); g.restore(); }
      g.restore();
    }
  };

  // ---------- LABORATÓRIO: parede técnica, reator, tubos, setas da gravidade ----------
  function tubo(g, x, y, w, h, cor) {
    g.fillStyle = "#1a2a40"; rr(g, x - w / 2 - 6, y - 12, w + 12, 18, 5); g.fill(); rr(g, x - w / 2 - 6, y + h - 6, w + 12, 18, 5); g.fill();
    g.beginPath(); rr(g, x - w / 2, y, w, h, w / 2); g.fillStyle = "rgba(160,220,255,.12)"; g.fill();
    g.save(); g.clip(); g.fillStyle = lin(g, 0, y + h * .3, 0, y + h, [[0, ca(cor, .45)], [1, ca(cor, .85)]]); g.fillRect(x - w / 2, y + h * .3, w, h); g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x - w / 2 + 6, y + 8, 6, h - 16); g.restore();
    g.lineWidth = 3; g.strokeStyle = "#0e1a2a"; g.beginPath(); rr(g, x - w / 2, y, w, h, w / 2); g.stroke();
  }
  T.laboratorio = {
    cor: "#3dffb4", k: "tech",
    pre(g, c) {
      ceu(g, c, [[0, "#162a44"], [1, "#223e5e"]]);
      g.strokeStyle = "rgba(130,190,240,.1)"; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x <= L; x += 80) { g.moveTo(x, c.top); g.lineTo(x, c.bot); } for (let y = -720; y <= 1440; y += 80) { g.moveTo(0, y); g.lineTo(L, y); } g.stroke();
      g.fillStyle = "rgba(255,255,255,.025)"; for (let y = -720; y < 1440; y += 160) for (let x = (y / 160 % 2 ? 0 : 80); x < L; x += 160) g.fillRect(x + 2, y + 2, 76, 76);
      [66, 640].forEach(y => { g.save(); g.globalAlpha = .55; g.beginPath(); g.rect(0, y, L, 14); g.clip(); g.fillStyle = "#ffd23a"; g.fillRect(0, y, L, 14); g.fillStyle = "#1a1a2a"; for (let x = -20; x < L; x += 30) { poli(g, [x, y + 14, x + 12, y + 14, x + 26, y, x + 14, y]); g.fill(); } g.restore(); });
      for (const x of [70, 1210]) tubo(g, x, 110, 70, 400, x < 600 ? "#38ff9c" : "#ff5ad8");
      for (const x of [190, 1090]) tubo(g, x, 150, 38, 150, x < 600 ? "#ffd23a" : "#4ad0ff");
      const cx = 640, cy = 330; g.lineCap = "butt";
      [[170, 16, "#1a3050"], [138, 10, "#2a4a70"], [104, 14, "#1a3050"]].forEach(q => { C(g, cx, cy, q[0]); g.lineWidth = q[1]; g.strokeStyle = q[2]; g.stroke(); });
      g.strokeStyle = "#0e1a2a"; g.lineWidth = 3; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * 162, cy + Math.sin(a) * 162); g.lineTo(cx + Math.cos(a) * 178, cy + Math.sin(a) * 178); g.stroke(); }
      C(g, cx, cy, 70); g.fillStyle = "#0e1a2a"; g.fill(); C(g, cx, cy, 58); g.fillStyle = rad(g, cx, cy, 58, [[0, "#c8fff0"], [.4, "#3dffb4"], [1, "#0a6a60"]]); g.fill();
      g.fillStyle = "#2a3e58"; g.fillRect(0, 96, L, 8); g.fillRect(0, 600, L, 8);
      vinheta(g, c, .35);
    },
    anim(g, e, t, c) {
      luz(g, 640, 330, 130 + Math.sin(t * 2) * 12, "#3dffb4", .35 + .15 * Math.sin(t * 2));
      const gr = e.gravidade === -1 ? -1 : 1, al = e.avisoInversao > 0, H = 600;
      g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 5; g.strokeStyle = al ? "#ff5a5a" : "#38f0ff"; g.globalAlpha = .4;
      g.beginPath();
      for (const x of [28, 1252]) for (let i = 0; i < 6; i++) { const y = 70 + mod(i * 100 + t * 70 * gr, H), d = 10 * gr; g.moveTo(x - 12, y - d); g.lineTo(x, y + d); g.lineTo(x + 12, y - d); }
      g.stroke(); g.restore();
      const L2 = dado("lamp", () => [[300, 80], [380, 80], [460, 80], [820, 80], [900, 80], [980, 80], [300, 620], [980, 620]]);
      for (let i = 0; i < L2.length; i++) { const on = Math.sin(t * 3 + i * 1.7) > 0, cor = ["#ff4a4a", "#4aff7a", "#ffd23a"][i % 3]; C(g, L2[i][0], L2[i][1], 5); g.fillStyle = on ? cor : "#1a2a3a"; g.fill(); if (on) luz(g, L2[i][0], L2[i][1], 16, cor, .7); }
    }
  };

  // ---------- DOJO: ringue flutuando no céu ao entardecer ----------
  function ilha(g, x, y, s, cor) { // ilhazinha flutuante com pagode e pinheirinho
    g.fillStyle = cor; poli(g, [x - 70 * s, y, x + 70 * s, y, x + 40 * s, y + 30 * s, x + 10 * s, y + 80 * s, x - 10 * s, y + 40 * s, x - 40 * s, y + 24 * s]); g.fill();
    [[0, 36], [8, 28], [16, 20]].forEach((q, i) => { poli(g, [x - (34 - i * 6) * s, y - q[0] * s, x + (34 - i * 6) * s, y - q[0] * s, x + (24 - i * 6) * s, y - (q[0] + 8) * s, x - (24 - i * 6) * s, y - (q[0] + 8) * s]); g.fill(); });
    g.fillRect(x - 12 * s, y - 40 * s, 24 * s, 40 * s); poli(g, [x, y - 70 * s, x + 26 * s, y - 46 * s, x - 26 * s, y - 46 * s]); g.fill();
    pinheiro(g, x + 52 * s, y, 50 * s, cor, cor);
  }
  T.dojo = {
    cor: "#ff5d73", k: "dojo",
    pre(g, c) {
      ceu(g, c, [[0, "#2e1a5c"], [.35, "#8a3a7a"], [.6, "#e0607a"], [.8, "#ff9a5a"], [1, "#ffd08a"]]);
      estrelas(g, 50, 3, c.top, 200, "#ffe8f0");
      halo(g, 640, 430, 380, "#ff9a60", .55); C(g, 640, 430, 105); g.fillStyle = lin(g, 0, 325, 0, 535, [[0, "#ffd890"], [1, "#ff8a50"]]); g.fill();
      serra(g, 650, 170, 110, 17, "#9a4a86", "#c0607a", c.bot, ["#4a1a5a", .3]);
      g.beginPath(); g.moveTo(-120, 760); g.quadraticCurveTo(160, 640, 240, 350); g.lineTo(300, 350); g.quadraticCurveTo(380, 640, 700, 760); g.closePath(); g.fillStyle = lin(g, 0, 340, 0, 700, [[0, "#8a4a8a"], [1, "#c8607a"]]); g.fill();
      g.fillStyle = "#ffe4ee"; poli(g, [238, 360, 241, 350, 301, 350, 304, 360, 318, 420, 296, 392, 282, 428, 266, 394, 248, 430, 228, 396, 222, 420]); g.fill();
      ilha(g, 1130, 520, .8, "#6a3070"); ilha(g, 110, 570, .6, "#7a3a78");
      // torii distante
      g.fillStyle = "rgba(150,40,80,.8)"; g.fillRect(572, 400, 14, 170); g.fillRect(694, 400, 14, 170); g.fillRect(556, 420, 168, 10); poli(g, [538, 392, 742, 392, 726, 408, 554, 408]); g.fill();
      [[630, "#ffb8a0", .9], [668, "#f08a96", 1.1], [708, "#c85a86", 1.3], [748, "#8a3a7a", 1.5]].forEach(f => { const r = rnd(f[0]); g.fillStyle = f[1]; for (let x = -60; x < L + 60; x += 110 * f[2] * .7) nuvem(g, x + r() * 30, f[0] + r() * 14, f[2]); g.fillRect(-20, f[0] + 26 * f[2], L + 40, c.bot - f[0]); });
      vinheta(g, c, .25);
    },
    anim(g, e, t, c) {
      luz(g, 640, 430, 260 + Math.sin(t) * 12, "#ffa060", .16);
      nuvensAnim(g, t, [[0, 600, .9, 14], [500, 640, 1.1, 10], [900, 580, .7, 18]], ["#ffc4ac", "#e07a90"], .8, "d");
      const pt = dado("pt", () => [0, 1, 2, 3, 4, 5, 6, 7].map(f => spr("ptl" + f, 16, 16, q => { q.translate(8, 8); q.rotate(f * .8); q.scale(1, .45 + .55 * Math.abs(Math.cos(f * .8))); q.fillStyle = "#ffc0d4"; q.beginPath(); q.ellipse(0, 0, 6.5, 4, 0, 0, TAU); q.fill(); q.fillStyle = "#ff8fb0"; q.beginPath(); q.ellipse(2, 0, 3, 2, 0, 0, TAU); q.fill(); })));
      const H = c.bot - c.top;
      for (let i = 0; i < 22; i++) { const k = mod(t * (.06 + i % 4 * .015) + i * .157, 1), x = mod(i * 131 + t * 24 + Math.sin(t + i) * 30, L + 40) - 20, y = c.top + k * (H + 40) - 20; g.drawImage(pt[(Math.floor(t * 5 + i * 3)) & 7], Math.round(x), Math.round(y)); }
      g.strokeStyle = "#4a1a50"; g.lineWidth = 2.2; g.lineCap = "round"; g.beginPath();
      for (let i = 0; i < 3; i++) { const x = mod(t * 40 + i * 70 + 200, L + 100) - 50, y = 200 + i * 26 + Math.sin(t * .8 + i) * 8, f = Math.sin(t * 7 + i) * 4; g.moveTo(x - 9, y - 3 + f); g.quadraticCurveTo(x - 4, y - 5 - f, x, y); g.quadraticCurveTo(x + 4, y - 5 - f, x + 9, y - 3 + f); }
      g.stroke();
    }
  };

  // ---------- CIDADE: telhados neon à noite, vão entre os prédios ----------
  function letreiro(g, x, y, w, h, cor) {
    g.save(); g.shadowColor = cor; g.shadowBlur = 14; g.strokeStyle = cor; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); rr(g, x, y, w, h, 6); g.stroke();
    g.beginPath(); g.moveTo(x + w * .25, y + h * .5); g.lineTo(x + w * .45, y + h * .25); g.lineTo(x + w * .65, y + h * .75); g.lineTo(x + w * .78, y + h * .5); g.stroke(); g.restore();
  }
  T.cidade = {
    cor: "#ff3df2", k: p => p.move ? "hover" : p.fina ? "andaime" : "predio",
    pre(g, c) {
      ceu(g, c, [[0, "#070722"], [.5, "#251060"], [1, "#8a2a8a"]]);
      estrelas(g, 90, 3, c.top, 380, "#fff");
      luz(g, 1040, 110, 150, "#ffe9c0", .45); C(g, 1040, 110, 36); g.fillStyle = "#fff1d0"; g.fill(); g.fillStyle = "rgba(200,170,150,.5)"; [[-10, -8, 8], [12, 8, 6]].forEach(q => { C(g, 1040 + q[0], 110 + q[1], q[2]); g.fill(); });
      let r = rnd(5);
      for (let x = -20; x < L; x += 36 + r() * 40) { const h = 200 + r() * 220; predio(g, x, A - h, 56 + r() * 20, c.bot - A + h, "#3a2a7a", "#1a1250", ["#ffd36a", "#ff8ad0"], r, .22); }
      bruma(g, 300, 720, "#8a2a8a", .35);
      r = rnd(8);
      for (let x = -10; x < L; x += 60 + r() * 40) { const h = 120 + r() * 200 + (x < 200 || x > 1050 ? 150 : 0); predio(g, x, A - h, 70 + r() * 30, c.bot - A + h, "#2a1e6a", "#0c0a30", ["#ffd36a", "#6af0ff", "#ff6ad0"], r, .4); if (r() < .3) { g.fillStyle = "#0c0a30"; g.fillRect(x + 30, A - h - 24, 3, 24); } }
      letreiro(g, 40, 330, 90, 40, "#3df0ff"); letreiro(g, 1140, 300, 80, 44, "#ff3df2"); letreiro(g, 1080, 470, 60, 30, "#ffe03d");
      g.fillStyle = lin(g, 0, 560, 0, c.bot, [[0, "rgba(10,4,40,0)"], [1, "rgba(10,4,40,.85)"]]); g.fillRect(430, 560, 420, c.bot - 560);
      luz(g, 640, c.bot + 30, 330, "#ff6a3a", .55);
      vinheta(g, c, .3);
    },
    anim(g, e, t, c) {
      const bl = dado("bl", () => spr("blimp", 200, 80, q => { q.translate(100, 38); q.beginPath(); q.ellipse(0, 0, 80, 26, 0, 0, TAU); q.fillStyle = lin(q, 0, -26, 0, 26, [[0, "#9a8ae8"], [1, "#4a3a9a"]]); q.fill(); q.lineWidth = 3; q.strokeStyle = TINTA; q.stroke(); q.fillStyle = "#ff3df2"; poli(q, [-70, -8, -96, -26, -96, 4]); q.fill(); q.stroke(); poli(q, [-70, 8, -96, 26, -96, -4]); q.fill(); q.stroke(); rr(q, -18, 24, 36, 12, 5); q.fillStyle = "#2a2060"; q.fill(); q.stroke(); q.fillStyle = "#3dfff0"; q.fillRect(-24, -4, 48, 8); }));
      const bx = mod(t * 14, L + 400) - 250; g.drawImage(bl, bx, 80 + Math.sin(t * .6) * 6); luz(g, bx + 100, 118, 40, "#3dfff0", .35);
      g.save(); g.globalCompositeOperation = "lighter";
      const bm = dado("bm", () => lin(g, 0, 0, 0, -600, [[0, "rgba(180,220,255,.2)"], [1, "rgba(180,220,255,0)"]]));
      g.fillStyle = bm; [[200, 520, 0], [1100, 500, 2]].forEach(q => { g.save(); g.translate(q[0], q[1]); g.rotate(Math.sin(t * .5 + q[2]) * .5); poli(g, [-10, 0, 10, 0, 60, -600, -60, -600]); g.fill(); g.restore(); });
      g.restore();
      for (const [x, y, cor, f] of [[85, 350, "#3df0ff", 1], [1180, 322, "#ff3df2", 2], [1110, 485, "#ffe03d", 3]]) luz(g, x, y, 70, cor, .3 + .25 * (Math.sin(t * 9 * f) > -.3 ? 1 : 0));
      for (let i = 0; i < 4; i++) { const d = i % 2 ? -1 : 1, x = mod(t * (70 + i * 25) * d + i * 300, L + 200) - 100, y = 180 + i * 90; g.fillStyle = "#1a1050"; rr(g, x - 10, y - 3, 20, 7, 3); g.fill(); luz(g, x - 11 * d, y, 16, "#ff4a4a", .8); luz(g, x + 11 * d, y, 12, "#fff", .6); }
    }
  };

  // ---------- FLIPERAMA: mesa de pinball neon ----------
  T.fliperama = {
    cor: "#ffe03d", k: "neon",
    pre(g, c, cen) {
      ceu(g, c, [[0, "#1a0640"], [1, "#2e0c5a"]]);
      g.strokeStyle = "rgba(130,70,255,.22)"; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x <= L + 80; x += 80) for (let y = c.top - 40; y <= c.bot + 80; y += 80) { g.moveTo(x - 40, y); g.lineTo(x, y - 40); g.lineTo(x + 40, y); g.lineTo(x, y + 40); g.closePath(); }
      g.stroke();
      g.save(); g.shadowColor = "#ff3df2"; g.shadowBlur = 10; g.lineWidth = 2.5;
      (cen.bumpers || []).forEach((b, i) => { g.strokeStyle = ["#ff3df2", "#3df0ff", "#ffe03d", "#6dff7a"][i % 4]; g.globalAlpha = .3; [1.7, 2.2].forEach(k => { C(g, b.x, b.y, b.r * k); g.stroke(); }); });
      g.restore();
      g.font = "900 120px 'Arial Black', Impact, sans-serif"; g.textAlign = "center"; g.fillStyle = "rgba(255,61,242,.08)"; g.fillText("1000", 640, 200); g.fillStyle = "rgba(61,240,255,.08)"; g.fillText("x2", 200, 460); g.fillText("x3", 1080, 460);
      const r = rnd(4); for (let i = 0; i < 12; i++) faisca(g, r() * L, c.top + r() * (c.bot - c.top), 8 + r() * 12, "rgba(255,255,255,.35)");
      g.fillStyle = lin(g, 0, 0, 28, 0, [[0, "#ff3df2"], [1, "#6a1a9a"]]); g.fillRect(0, c.top, 28, c.bot - c.top); g.fillStyle = lin(g, L - 28, 0, L, 0, [[0, "#6a1a9a"], [1, "#3df0ff"]]); g.fillRect(L - 28, c.top, 28, c.bot - c.top);
      g.fillStyle = lin(g, 0, c.top, 0, 24, [[0, "#3df0ff"], [1, "#6a1a9a"]]); g.fillRect(0, c.top, L, 24);
      g.fillStyle = "#0a0420"; g.fillRect(28, c.top, 4, c.bot - c.top); g.fillRect(L - 32, c.top, 4, c.bot - c.top); g.fillRect(0, c.top + 24, L, 4);
      luzesF().forEach(b => { C(g, b[0], b[1], 5); g.fillStyle = "#1a0a30"; g.fill(); });
      vinheta(g, c, .3);
    },
    anim(g, e, t, c) {
      const b = luzesF(), n = b.length;
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) { const on = (i + Math.floor(t * 8)) % 3 === 0; if (on) { g.globalAlpha = .9; const cor = i % 2 ? "#ffe03d" : "#ff7af0"; g.drawImage(brilho(cor), b[i][0] - 13, b[i][1] - 13, 26, 26); } }
      g.restore();
    }
  };
  function luzesF() { // lâmpadas dos trilhos
    return dado("lf", () => { const a = []; for (let y = 60; y <= 640; y += 40) { a.push([14, y]); a.push([L - 14, y]); } for (let x = 60; x <= L - 60; x += 40) a.push([x, 12]); return a; });
  }

  // ---------- FLORESTA: noite, árvore gigante, vagalumes ----------
  function mata(g, y, h, seed, cor, bot) {
    const r = rnd(seed); g.fillStyle = cor;
    for (let x = -20; x < L + 30; x += 16 + r() * 18) { const hh = h * (.55 + .6 * r()); if (r() < .7) { poli(g, [x, y - hh, x + hh * .16, y - hh * .35, x + hh * .26, y, x - hh * .26, y, x - hh * .16, y - hh * .35]); g.fill(); } else { C(g, x, y - hh * .5, hh * .32); g.fill(); } }
    g.fillRect(-20, y - 4, L + 40, bot - y + 4);
  }
  const COGUS = [[90, "#4af0ff"], [330, "#ff7ae8"], [560, "#4af0ff"], [790, "#b8ff6a"], [990, "#ff7ae8"], [1190, "#4af0ff"]];
  function cogumelo(g, x, y, cor) {
    g.fillStyle = "#e8e0d0"; rr(g, x - 3, y - 12, 6, 12, 2); g.fill();
    g.beginPath(); g.ellipse(x, y - 12, 11, 8, 0, Math.PI, TAU); g.closePath(); g.fillStyle = cor; g.fill(); g.lineWidth = 2; g.strokeStyle = "#0a1a20"; g.stroke();
    g.fillStyle = "rgba(255,255,255,.8)"; [[-4, -16], [3, -18], [6, -14]].forEach(q => { C(g, x + q[0], y + q[1], 1.6); g.fill(); });
  }
  T.floresta = {
    cor: "#8dff6a", k: p => p.fina ? "galho" : "terra",
    pal: { a: "#3a3a30", b: "#1c1a1c", bd: "#0a0a0e", g0: "#3f9a5a", g1: "#1e6a44", gb: "#0a2a1c" },
    pre(g, c) {
      ceu(g, c, [[0, "#040a1c"], [.55, "#0a2630"], [1, "#12403a"]]);
      estrelas(g, 80, 7, c.top, 300, "#cfe8ff");
      luz(g, 1020, 110, 280, "#9fe8ff", .5); C(g, 1020, 110, 34); g.fillStyle = "#eafcff"; g.fill();
      mata(g, 480, 150, 1, "#0e3340", c.bot); bruma(g, 380, 560, "#2a6a6a", .3);
      mata(g, 545, 210, 2, "#0b2a33", c.bot); bruma(g, 430, 620, "#1a5a5a", .25);
      mata(g, 620, 270, 3, "#081f26", c.bot);
      // árvore gigante
      const tr = (x0, x1, w0, w1) => { g.beginPath(); g.moveTo(x0 - w0 * 1.5, c.bot); g.bezierCurveTo(x0 - w0 * .6, 650, x0 - w1, 560, x0 - w1, 380); g.lineTo(x0 - w1 * .9, 120); g.lineTo(x1 + w1 * .9, 120); g.lineTo(x1 + w1, 380); g.bezierCurveTo(x1 + w1, 560, x1 + w0 * .6, 650, x1 + w0 * 1.5, c.bot); g.closePath(); g.fillStyle = lin(g, x0 - w0, 0, x1 + w0, 0, [[0, "#1c2a2a"], [.4, "#24342f"], [1, "#0c1618"]]); g.fill(); };
      tr(600, 680, 36, 40);
      g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 3; g.lineCap = "round"; for (let i = 0; i < 9; i++) { const x = 566 + i * 18; g.beginPath(); g.moveTo(x, 700); g.bezierCurveTo(x + 6, 520, x - 6, 340, x + 3, 130); g.stroke(); }
      const cop = (x, y, n, sd, rmin, rmax, spread) => { const r = rnd(sd); const a = []; for (let i = 0; i < n; i++) a.push([x + (r() - .5) * spread, y + (r() - .5) * 90, rmin + r() * (rmax - rmin)]); a.forEach(q => { C(g, q[0], q[1], q[2]); g.fillStyle = "#0c3a30"; g.fill(); }); a.forEach(q => { C(g, q[0] - q[2] * .18, q[1] - q[2] * .22, q[2] * .78); g.fillStyle = "#115040"; g.fill(); }); };
      cop(640, 70, 18, 2, 70, 120, 740);
      tr(30, 40, 30, 34); tr(1240, 1250, 30, 34); cop(60, 100, 7, 4, 60, 100, 200); cop(1230, 100, 7, 5, 60, 100, 200);
      g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = lin(g, 900, 0, 700, 640, [[0, "rgba(160,240,255,.10)"], [1, "rgba(160,240,255,0)"]]); poli(g, [980, c.top, 1060, c.top, 640, 700, 420, 700]); g.fill(); g.restore();
      g.strokeStyle = "#0a3a2c"; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const x = 200 + (i * 83) % 880; g.beginPath(); g.moveTo(x, c.top); g.bezierCurveTo(x + 6, 40, x - 8, 80 + (i * 17) % 70, x, 100 + (i * 29) % 90); g.stroke(); }
      g.fillStyle = "#06141a"; const r = rnd(9); for (let x = 0; x < L; x += 7 + r() * 8) { const h = 14 + r() * 28; poli(g, [x, 660, x + 3, 660 - h, x + 8, 660]); g.fill(); }
      vinheta(g, c, .45);
    },
    anim(g, e, t) {
      COGUS.forEach(q => { const k = q[1]; g.drawImage(spr("cg" + k, 30, 26, a => { cogumelo(a, 15, 25, k); }), q[0] - 15, 634); luz(g, q[0], 646, 34, k, .35 + .15 * Math.sin(t * 2 + q[0])); });
      nuvensAnim(g, t, [[0, 520, 1.3, 6], [700, 560, 1.5, 4], [380, 600, 1.2, 5]], ["#4a8a8a", "#2a5a5a"], .22, "m");
    }
  };

  // ---------- DESERTO: dunas, sol forte, vento ----------
  function cacto(g, x, y, s) {
    g.fillStyle = "#4a9a4a"; g.strokeStyle = "#1e4a24"; g.lineWidth = 2.5; g.lineJoin = "round";
    [[x - 9 * s, y - 70 * s, 18 * s, 70 * s], [x - 30 * s, y - 52 * s, 11 * s, 28 * s], [x + 19 * s, y - 60 * s, 11 * s, 32 * s]].forEach(q => { g.beginPath(); rr(g, q[0], q[1], q[2], q[3], q[2] / 2); g.fill(); g.stroke(); });
    g.fillRect(x - 30 * s, y - 30 * s, 24 * s, 10 * s); g.fillRect(x + 6 * s, y - 36 * s, 24 * s, 10 * s);
    g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(x - 5 * s, y - 64 * s, 4 * s, 56 * s);
  }
  function fase(e, t) { if (t !== ultT) { const dt = t - ultT; acVento += (dt > 0 && dt < .5 ? dt : 0) * (e.vento || 0); ultT = t; } return acVento; }
  T.deserto = {
    cor: "#ffb347", k: "arenito",
    pre(g, c) {
      ceu(g, c, [[0, "#d9603f"], [.35, "#f08f4f"], [.7, "#ffc27a"], [1, "#ffe4b0"]]);
      luz(g, 900, 190, 380, "#fff0b0", .8); C(g, 900, 190, 70); g.fillStyle = "#fff0b8"; g.fill(); C(g, 900, 190, 54); g.fillStyle = "#fffbe8"; g.fill();
      g.fillStyle = lin(g, 0, 440, 0, 560, [[0, "#c8704a"], [1, "#e0905a"]]);
      [[60, 130, 80], [1040, 150, 100], [1180, 90, 60]].forEach(q => { poli(g, [q[0], 560, q[0] + 14, 560 - q[1], q[0] + q[2] - 10, 560 - q[1], q[0] + q[2] + 12, 560]); g.fill(); });
      g.fillStyle = "#d8845a"; poli(g, [320, 560, 410, 450, 500, 560]); g.fill(); poli(g, [470, 560, 520, 500, 570, 560]); g.fill(); g.fillStyle = "rgba(120,50,30,.3)"; poli(g, [410, 450, 500, 560, 410, 560]); g.fill();
      colina(g, 540, 26, 200, .3, "#f0b068", "#d88a4a", c.bot);
      colina(g, 590, 30, 160, 2, "#e89a52", "#c8703c", c.bot);
      cacto(g, 340, colinaY(340, 590, 30, 160, 2) + 10, .9); cacto(g, 1010, colinaY(1010, 590, 30, 160, 2) + 10, .75);
      colina(g, 635, 16, 130, 4, "#dc8848", "#b4602f", c.bot);
      cacto(g, 90, colinaY(90, 635, 16, 130, 4) + 10, 1.05); cacto(g, 1190, colinaY(1190, 635, 16, 130, 4) + 10, 1);
      bruma(g, 420, 600, "#ffe4b0", .3); vinheta(g, c, .25);
    },
    anim(g, e, t, c) {
      const ac = fase(e, t);
      nuvensAnim(g, t, [[0, 60, 1.1, 5], [600, 120, .9, 3], [1000, 40, .8, 4]], ["#ffd0a0", "#f4a070"], .45, "d");
      g.strokeStyle = "#5a2a30"; g.lineWidth = 2.2; g.lineCap = "round"; g.beginPath();
      for (let i = 0; i < 3; i++) { const a = t * .25 + i * 2.1, x = 400 + Math.cos(a) * 160 + i * 120, y = 120 + Math.sin(a) * 30 + i * 24, f = Math.sin(t * 5 + i) * 3; g.moveTo(x - 10, y - 3 + f); g.quadraticCurveTo(x - 4, y - 5 - f, x, y); g.quadraticCurveTo(x + 4, y - 5 - f, x + 10, y - 3 + f); }
      g.stroke();
      const x = mod(ac * 300 + 200, L + 120) - 60, y = 644 - Math.abs(Math.sin(ac * 6)) * 14;
      g.save(); g.translate(x, y); g.rotate(ac * 300 / 16); g.strokeStyle = "#8a5a2a"; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(0, 0, 16, 5 + i * 1.8, i * .5, 0, TAU); g.stroke(); } g.restore();
    }
  };

  // ---------- FÁBRICA: galpão com engrenagens, canos e janela de fumaça ----------
  function engrenagem(r, n, c0, c1) {
    return spr("en" + r + "|" + n + c0, r * 2 + 12, r * 2 + 12, q => {
      const m = r + 6; q.translate(m, m); q.beginPath();
      for (let i = 0; i < n; i++) { const a = i / n * TAU, w = TAU / n; [[a, 1], [a + w * .18, 1], [a + w * .3, 1.17], [a + w * .56, 1.17], [a + w * .68, 1]].forEach((p, j) => { const rr_ = r * .85 * p[1] + (p[1] > 1 ? r * .05 : 0); q.lineTo(Math.cos(p[0]) * rr_, Math.sin(p[0]) * rr_); }); }
      q.closePath(); q.fillStyle = lin(q, -r, -r, r, r, [[0, c0], [1, c1]]); q.fill(); q.lineWidth = 3; q.lineJoin = "round"; q.strokeStyle = "#14101a"; q.stroke();
      C(q, 0, 0, r * .6); q.fillStyle = "rgba(0,0,0,.25)"; q.fill(); q.strokeStyle = "rgba(0,0,0,.5)"; q.lineWidth = 2; q.stroke();
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; q.beginPath(); q.moveTo(0, 0); q.lineTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); q.lineWidth = r * .16; q.strokeStyle = c1; q.stroke(); }
      C(q, 0, 0, r * .2); q.fillStyle = "#14101a"; q.fill(); C(q, 0, 0, r * .12); q.fillStyle = c0; q.fill();
    });
  }
  const ENG = [[110, 130, 64, 12, 1], [226, 190, 40, 8, -1.5], [1170, 150, 72, 14, -1], [1052, 214, 42, 8, 1.6], [70, 400, 50, 10, -1], [1215, 410, 54, 10, 1]];
  T.fabrica = {
    cor: "#ffa31a", k: p => p.esteira ? "esteira" : "steel",
    pre(g, c) {
      ceu(g, c, [[0, "#2c2632"], [1, "#3a3040"]]);
      g.strokeStyle = "rgba(255,255,255,.06)"; g.lineWidth = 2; g.beginPath(); for (let y = c.top, k = 0; y < c.bot; y += 26, k++) { g.moveTo(0, y); g.lineTo(L, y); for (let x = (k % 2) * 40; x < L; x += 80) { g.moveTo(x, y); g.lineTo(x, y + 26); } } g.stroke();
      // janela de fumaça
      g.fillStyle = lin(g, 0, 50, 0, 220, [[0, "#6a3a4a"], [1, "#e0904a"]]); g.fillRect(440, 60, 400, 160);
      g.fillStyle = "#2a1a28"; [[470, 80], [560, 110], [690, 90], [780, 120]].forEach(q => { g.fillRect(q[0], q[1], 26, 220 - q[1]); g.fillRect(q[0] - 4, q[1], 34, 8); });
      g.strokeStyle = "#14101a"; g.lineWidth = 7; g.strokeRect(440, 60, 400, 160); g.lineWidth = 5; g.beginPath(); g.moveTo(573, 60); g.lineTo(573, 220); g.moveTo(707, 60); g.lineTo(707, 220); g.stroke();
      [0, 320, 960, 1240].forEach(x => { g.fillStyle = lin(g, x, 0, x + 40, 0, [[0, "#4a4254"], [.5, "#3a3444"], [1, "#2a2434"]]); g.fillRect(x, c.top, 40, c.bot - c.top); g.fillStyle = "#8a8294"; for (let y = c.top + 20; y < c.bot; y += 60) { C(g, x + 8, y, 2.3); g.fill(); C(g, x + 32, y, 2.3); g.fill(); } });
      [[300, "#b8643a"], [590, "#4a86a8"]].forEach(q => { g.fillStyle = lin(g, 0, q[0] - 12, 0, q[0] + 12, [[0, "#f0b090"], [.3, q[1]], [1, "#2a1a24"]]); g.fillRect(-10, q[0] - 12, L + 20, 24); g.strokeStyle = "#14101a"; g.lineWidth = 3; g.strokeRect(-10, q[0] - 12, L + 20, 24); g.fillStyle = "#3a3040"; for (let x = 160; x < L; x += 280) { g.fillRect(x, q[0] - 17, 14, 34); g.strokeRect(x, q[0] - 17, 14, 34); } });
      g.strokeStyle = "#14101a"; g.lineWidth = 5; g.setLineDash([8, 5]); g.beginPath(); [250, 1030].forEach(x => { g.moveTo(x, c.top); g.lineTo(x, 190); }); g.stroke(); g.setLineDash([]);
      vinheta(g, c, .4);
    },
    anim(g, e, t) {
      for (let i = 0; i < ENG.length; i++) { const q = ENG[i], s = engrenagem(q[2], q[3], i % 2 ? "#7a6a88" : "#8a7a70", i % 2 ? "#3a3048" : "#4a3a38"), m = q[2] + 6; g.save(); g.translate(q[0], q[1]); g.rotate(t * .5 * q[4]); g.drawImage(s, -m, -m); g.restore(); }
      const fu = nuvemSpr("#8a7a88", "#4a3a4a", "f");
      for (let i = 0; i < 4; i++) { const k = mod(t * .12 + i * .25, 1), x = [483, 573, 703, 793][i] + 13; g.save(); g.globalAlpha = Math.sin(k * Math.PI) * .6; const s = .25 + k * .6; g.drawImage(fu, x - 130 * s + k * 30, 110 - k * 100, 260 * s, 110 * s); g.restore(); }
      for (const [x, y] of [[380, 95], [900, 95]]) { const on = Math.sin(t * 6 + x) > 0; C(g, x, y, 7); g.fillStyle = on ? "#ff5a3a" : "#4a1a1a"; g.fill(); if (on) luz(g, x, y, 40, "#ff5a3a", .7); }
    }
  };

  // ---------- OCEANO: fundo do mar, raios de luz, bolhas, peixes ----------
  function peixe(cor) { return spr("pe" + cor, 48, 26, q => { q.translate(24, 13); q.fillStyle = cor; q.beginPath(); q.ellipse(2, 0, 16, 9, 0, 0, TAU); q.fill(); poli(q, [-12, 0, -22, -9, -22, 9]); q.fill(); q.fillStyle = "rgba(255,255,255,.25)"; q.beginPath(); q.ellipse(4, -3, 10, 3, 0, 0, TAU); q.fill(); C(q, 10, -2, 3); q.fillStyle = "#fff"; q.fill(); C(q, 11, -2, 1.4); q.fillStyle = "#111"; q.fill(); }); }
  T.oceano = {
    cor: "#35d6ff", k: "coral",
    pre(g, c) {
      ceu(g, c, [[0, "#1ca0e0"], [.35, "#0b5fa8"], [1, "#041f4d"]]);
      g.fillStyle = lin(g, 0, c.top, 0, c.top + 220, [[0, "rgba(180,240,255,.35)"], [1, "rgba(180,240,255,0)"]]); g.fillRect(-10, c.top, L + 20, 220);
      serra(g, 610, 170, 100, 51, "#0b4a8a", "#073a78", c.bot, ["#02183a", .3]);
      // corais distantes
      const r = rnd(7), cs = ["#d8507a", "#d89a3a", "#a05ad8", "#3ad8b0"];
      for (let i = 0; i < 26; i++) { const x = r() * L, y = 640 + r() * 14, h = 30 + r() * 60; g.strokeStyle = ca(cs[i % 4], .45); g.lineWidth = 6; g.lineCap = "round"; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + k * 12, y - h * .5, x + k * 20, y - h * (.8 + r() * .2)); g.stroke(); } }
      colina(g, 650, 12, 200, 1, "#2a6aa0", "#1a4a80", c.bot);
      // naufrágio
      g.save(); g.translate(1110, 646); g.rotate(-.12); g.fillStyle = "#0f3a5a"; g.strokeStyle = "#06223a"; g.lineWidth = 3; poli(g, [-110, -50, 110, -64, 80, 0, -80, 0]); g.fill(); g.stroke(); g.fillRect(-10, -150, 8, 100); g.strokeRect(-10, -150, 8, 100); poli(g, [-2, -146, 50, -110, -2, -96]); g.fill();
      g.fillStyle = "#1a6a9a"; for (let i = 0; i < 4; i++) { C(g, -70 + i * 40, -30, 7); g.fill(); g.stroke(); } g.restore();
      // algas distantes
      g.strokeStyle = "rgba(20,120,110,.6)"; g.lineWidth = 8; for (let i = 0; i < 10; i++) { const x = r() * L; g.beginPath(); g.moveTo(x, c.bot); g.bezierCurveTo(x - 20, 600, x + 20, 540, x, 480 + r() * 80); g.stroke(); }
      vinheta(g, c, .3);
    },
    anim(g, e, t, c) {
      const ra = dado("ray", () => spr("rayo", 160, 720, q => { q.fillStyle = lin(q, 0, 0, 0, 720, [[0, "rgba(200,250,255,.5)"], [1, "rgba(200,250,255,0)"]]); poli(q, [60, 0, 120, 0, 100, 720, 0, 720]); q.fill(); }));
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) { g.globalAlpha = .13 + .07 * Math.sin(t * .7 + i * 2); g.drawImage(ra, Math.round(40 + i * 260 + Math.sin(t * .3 + i) * 30), c.top); }
      g.restore();
      // algas balançando
      g.lineCap = "round"; for (let i = 0; i < 6; i++) { const x = [36, 90, 1214, 1250, 400, 880][i], h = 150 + (i * 37) % 90, s = Math.sin(t * 1.3 + i) * 26, b = c.bot; g.beginPath(); g.moveTo(x, b); g.bezierCurveTo(x - 22, b - h * .4, x + s, b - h * .7, x + s * 1.3, b - h); g.strokeStyle = "#0e5a4a"; g.lineWidth = 12; g.stroke(); g.strokeStyle = "#2cc08a"; g.lineWidth = 6; g.stroke(); }
      const cor = ["#ffb347", "#ff6f91", "#ffe066"];
      for (let i = 0; i < 8; i++) { const d = i < 4 ? 1 : -1, x = mod(i * 170 + t * (36 + i * 4) * d, L + 160) - 80, y = (i < 4 ? 170 : 470) + (i % 4) * 26 + Math.sin(t * 1.4 + i) * 10; g.save(); g.translate(x, y); g.scale(d, 1); g.drawImage(peixe(cor[i % 3]), -24, -13); g.restore(); }
      // águas-vivas
      const mw = dado("mw", () => spr("medusa", 60, 50, q => { q.beginPath(); q.ellipse(30, 24, 24, 20, 0, Math.PI, TAU); q.quadraticCurveTo(30, 34, 6, 24); q.closePath(); q.fillStyle = rad(q, 30, 24, 26, [[0, "rgba(255,180,255,.95)"], [1, "rgba(200,90,220,.7)"]]); q.fill(); q.lineWidth = 2; q.strokeStyle = "rgba(255,255,255,.7)"; q.stroke(); }));
      for (let i = 0; i < 2; i++) { const x = 230 + i * 820 + Math.sin(t * .4 + i * 3) * 30, y = 330 + Math.sin(t * .8 + i) * 30, p = 1 + Math.sin(t * 2 + i) * .08; luz(g, x, y, 50, "#ff9af0", .3); g.drawImage(mw, x - 30 * p, y - 24 * (2 - p), 60 * p, 50 * (2 - p)); g.strokeStyle = "rgba(255,190,255,.7)"; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(x - 14 + k * 9, y + 6); g.quadraticCurveTo(x - 14 + k * 9 + Math.sin(t * 2 + k + i) * 7, y + 24, x - 14 + k * 9 + Math.sin(t * 2 + k + 1) * 4, y + 44); } g.stroke(); }
      const bu = dado("bu", () => spr("bub", 20, 20, q => { C(q, 10, 10, 8); q.fillStyle = "rgba(200,240,255,.15)"; q.fill(); q.lineWidth = 1.8; q.strokeStyle = "rgba(220,250,255,.8)"; q.stroke(); C(q, 7, 7, 2); q.fillStyle = "#fff"; q.fill(); }));
      const H = c.bot - c.top;
      for (let i = 0; i < 26; i++) { const k = mod(t * (.05 + i % 4 * .02) + i * .119, 1), s = 7 + (i % 4) * 4; g.drawImage(bu, mod(i * 53.7, L) + Math.sin(t * 1.5 + i) * 10, c.bot - k * (H + 20), s, s); }
    },
  };

  // ---------- TEMPLO: ruínas antigas, pirâmide, portais mágicos ----------
  function coluna(g, x, y, w, h, quebrada) {
    g.fillStyle = lin(g, x, 0, x + w, 0, [[0, "#6a5a8a"], [.5, "#8a7aa8"], [1, "#4a3a6a"]]); g.fillRect(x, y, w, h); g.fillRect(x - 6, y, w + 12, 12); g.fillRect(x - 6, y + h - 12, w + 12, 12);
    if (quebrada) { g.fillStyle = "#6a5a8a"; poli(g, [x - 6, y, x + w + 6, y, x + w, y - 10, x + w * .6, y + 6, x + w * .3, y - 14, x, y - 4]); g.fill(); }
    g.fillStyle = "rgba(30,20,60,.35)"; for (let i = 1; i < 4; i++) g.fillRect(x + i * w / 4 - 1, y + 14, 2, h - 28);
  }
  function folhas(g, x, y, n, len, a0, cor) {
    g.fillStyle = cor;
    for (let i = 0; i < n; i++) { const a = a0 + (i - n / 2) * .42, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + ex) / 2 + Math.sin(a) * 20, (y + ey) / 2 - Math.cos(a) * 20 - 20, ex, ey + 20); g.quadraticCurveTo((x + ex) / 2 - Math.sin(a) * 20, (y + ey) / 2 + Math.cos(a) * 20 - 10, x, y); g.fill(); }
  }
  const RUNAS = [[120, 300], [210, 520], [1090, 330], [1170, 540], [330, 150], [950, 160], [640, 250]];
  T.templo = {
    cor: "#5affd0", k: "ruina",
    pre(g, c) {
      ceu(g, c, [[0, "#14213d"], [.5, "#3c2a6b"], [.85, "#b4527a"], [1, "#e8a070"]]);
      estrelas(g, 80, 3, c.top, 300, "#fff0f8");
      luz(g, 640, 190, 340, "#ffd0a0", .4); C(g, 640, 190, 100); g.fillStyle = lin(g, 0, 90, 0, 290, [[0, "#ffe8c0"], [1, "#f0a080"]]); g.globalAlpha = .85; g.fill(); g.globalAlpha = 1;
      serra(g, 580, 220, 120, 61, "#4a3a7a", "#2a2058", c.bot, ["#10083a", .35]);
      // pirâmide em degraus
      for (let i = 0; i < 6; i++) { const hw = 270 - i * 38, y = 720 - (i + 1) * 78; g.fillStyle = lin(g, 0, y, 0, y + 78, [[0, "#4a3e7a"], [1, "#2a2050"]]); g.fillRect(640 - hw, y, hw * 2, c.bot - y); g.fillStyle = "#6a5a9a"; g.fillRect(640 - hw, y, hw * 2, 7); }
      g.fillStyle = "#5a4e8a"; g.fillRect(612, 252, 56, c.bot - 252); g.strokeStyle = "rgba(20,10,50,.5)"; g.lineWidth = 2; g.beginPath(); for (let y = 262; y < 720; y += 18) { g.moveTo(612, y); g.lineTo(668, y); } g.stroke();
      g.fillStyle = "#2a2050"; rr(g, 590, 160, 100, 92, 6); g.fill(); g.fillStyle = "#6a5a9a"; g.fillRect(584, 152, 112, 10); g.fillStyle = "#0a0620"; rr(g, 624, 190, 32, 62, 14); g.fill(); luz(g, 640, 220, 70, "#5affd0", .7);
      coluna(g, 40, 300, 56, 420, true); coluna(g, 1184, 260, 56, 460, false); coluna(g, 170, 460, 40, 260, true); coluna(g, 1070, 430, 40, 290, true);
      g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = lin(g, 0, 130, 0, 580, [[0, "rgba(90,255,208,0)"], [.5, "rgba(90,255,208,.14)"], [1, "rgba(90,255,208,0)"]]); g.fillRect(612, 130, 56, 450); g.restore();
      g.strokeStyle = "#0e3a34"; g.lineWidth = 4; for (let i = 0; i < 14; i++) { const x = (i * 97 + 30) % L; g.beginPath(); g.moveTo(x, c.top); g.bezierCurveTo(x + 8, 40, x - 10, 90 + (i * 23) % 80, x, 120 + (i * 41) % 110); g.stroke(); }
      folhas(g, 0, c.bot, 7, 260, -1, "#0a2a2c"); folhas(g, L, c.bot, 7, 260, -2.1, "#0a2a2c"); folhas(g, 300, c.bot, 5, 120, -1.5, "#0c3a34"); folhas(g, 980, c.bot, 5, 120, -1.6, "#0c3a34");
      vinheta(g, c, .35);
    },
    anim(g, e, t) {
      RUNAS.forEach((q, i) => { const a = .5 + .5 * Math.sin(t * 1.6 + i * 1.3); luz(g, q[0], q[1], 26, "#5affd0", .15 + a * .45); g.save(); g.translate(q[0], q[1]); g.globalAlpha = .45 + a * .5; g.strokeStyle = "#9affe8"; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -8); g.lineTo(6, -8); g.moveTo(0, -8); g.lineTo(0, 8); g.moveTo(-6, 2); g.lineTo(6, -2); g.stroke(); g.restore(); });
      const lado = dado("lado", () => spr("lado", 90, 720, q => { q.fillStyle = lin(q, 0, 0, 90, 0, [[0, "rgba(255,255,255,.8)"], [1, "rgba(255,255,255,0)"]]); q.fillRect(0, 0, 90, 720); }));
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = .4 + .15 * Math.sin(t * 2);
      g.fillStyle = "#4de8ff"; g.fillRect(0, -400, 4, 1500);
      g.drawImage(brilho("#4de8ff"), -80, -100, 160, 920); g.drawImage(brilho("#ff4dd8"), L - 80, -100, 160, 920);
      g.restore();
      g.strokeStyle = "rgba(180,255,240,.7)"; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
      for (let i = 0; i < 5; i++) { const k = mod(t * .6 + i / 5, 1), y = 130 + i * 100, d = k * 26; g.moveTo(34 - d + 8, y - 10); g.lineTo(26 - d, y); g.lineTo(34 - d + 8, y + 10); g.moveTo(L - 34 + d - 8, y - 10); g.lineTo(L - 26 + d, y); g.lineTo(L - 34 + d - 8, y + 10); }
      g.globalAlpha = .6; g.stroke(); g.globalAlpha = 1;
      g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 20; i++) { const k = mod(t * .08 + i * .173, 1); g.globalAlpha = Math.sin(k * Math.PI) * .7; g.drawImage(brilho("#9affe8"), mod(i * 211, L) + Math.sin(t + i) * 20, 720 - k * 720, 7, 7); } g.restore();
    }
  };

  // ---------- CASTELO: muralhas, tempestade, relâmpagos e meteoros ----------
  function torre(g, x, y, w, h, tel, cor) {
    g.fillStyle = cor; g.fillRect(x, y, w, h); for (let i = 0; i < 4; i++) g.fillRect(x - 4 + i * (w + 8) / 4 + 2, y - 14, (w + 8) / 4 - 6, 16); g.fillRect(x - 5, y, w + 10, 8);
    if (tel) { poli(g, [x - 6, y - 14, x + w / 2, y - 14 - tel, x + w + 6, y - 14]); g.fill(); }
    g.fillStyle = "#ffd36a"; for (let j = y + 30; j < y + h - 30; j += 60) { rr(g, x + w / 2 - 6, j, 12, 22, 6); g.fill(); }
  }
  T.castelo = {
    cor: "#c98bff", k: "tijolo",
    pre(g, c) {
      ceu(g, c, [[0, "#0e0b1f"], [.5, "#2a1a46"], [1, "#5a3a64"]]);
      luz(g, 260, 130, 220, "#c8b8ff", .35); C(g, 260, 130, 40); g.fillStyle = "#e8e0ff"; g.fill();
      [[100, 80, 1.8], [420, 40, 2], [760, 90, 2.2], [1100, 30, 2], [250, 190, 1.6], [980, 200, 1.7]].forEach(q => { g.fillStyle = "rgba(20,10,40,.7)"; nuvem(g, q[0], q[1], q[2]); });
      halo(g, 640, 600, 520, "#9a4a9a", .35);
      serra(g, 590, 140, 120, 71, "#2a1e4a", "#1a1236", c.bot, ["#000", .3]);
      torre(g, 540, 330, 200, 390, 0, "#1c1434"); torre(g, 486, 270, 56, 450, 70, "#241a42"); torre(g, 738, 270, 56, 450, 70, "#241a42"); torre(g, 600, 230, 80, 100, 56, "#2a2048");
      g.fillStyle = "#1a1230"; g.fillRect(-10, 560, L + 20, c.bot - 560); for (let x = 0; x < L; x += 44) g.fillRect(x, 540, 28, 24);
      g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(-10, 560, L + 20, 6);
      g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; g.beginPath(); for (let y = 580; y < c.bot; y += 30) { g.moveTo(0, y); g.lineTo(L, y); } g.stroke();
      torre(g, -20, 150, 110, 570 + c.bot - 720, 80, "#241a42"); torre(g, 1190, 190, 110, 530 + c.bot - 720, 80, "#241a42");
      [[380, 590], [900, 590]].forEach(q => { g.fillStyle = "#3a2a4a"; rr(g, q[0] - 4, q[1], 8, 24, 3); g.fill(); g.fillStyle = "#8a6a4a"; rr(g, q[0] - 9, q[1] - 4, 18, 8, 3); g.fill(); });
      vinheta(g, c, .4);
    },
    anim(g, e, t, c) {
      nuvensAnim(g, t, [[0, 20, 1.6, 7], [500, 60, 1.9, 5], [900, 10, 1.7, 8], [300, 150, 1.4, 6]], ["#3a2a5a", "#1a1030"], .55, "t");
      for (let i = 0; i < 2; i++) { const k = mod(t * .12 + i * .5, 1), x = 80 + k * 1100 + i * 140, y = c.top + k * (c.bot - c.top) * .7 + 20; g.save(); g.globalAlpha = Math.sin(k * Math.PI) * .7; g.strokeStyle = "#ffa04a"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(x - 90, y - 70); g.lineTo(x, y); g.stroke(); g.restore(); luz(g, x, y, 18, "#ffd08a", Math.sin(k * Math.PI)); }
      for (const [x, y] of [[380, 584], [900, 584]]) { const f = Math.sin(t * 17 + x) * 3, h = 16 + f; luz(g, x, y - 10, 46, "#ff8a2a", .55); g.fillStyle = "#ff8a2a"; poli(g, [x - 6, y, x + 6, y, x + 3, y - h, x, y - h - 6, x - 3, y - h + 2]); g.fill(); g.fillStyle = "#ffe08a"; poli(g, [x - 3, y, x + 3, y, x, y - h * .6]); g.fill(); }
      for (const [x, y, d] of [[40, 70, 1], [1240, 110, -1]]) { g.fillStyle = "#c0394a"; g.beginPath(); g.moveTo(x, y); for (let i = 0; i <= 8; i++) g.lineTo(x + d * i * 5, y + Math.sin(t * 5 - i * .7) * 4 * (i / 8) + i * .6); for (let i = 8; i >= 0; i--) g.lineTo(x + d * i * 5, y + 18 + Math.sin(t * 5 - i * .7) * 4 * (i / 8) + i * .6); g.closePath(); g.fill(); g.fillStyle = "#6a5a7a"; g.fillRect(x - 1.5, y - 8, 3, 70); }
      const k = mod(t, 7.3), n = Math.floor(t / 7.3); // relâmpago
      const fl = k < .12 ? 1 - k / .12 : k > .3 && k < .4 ? (.4 - k) / .1 * .6 : 0;
      if (fl > 0) { g.save(); g.fillStyle = "rgba(190,170,255," + (fl * .28) + ")"; g.fillRect(-10, c.top, L + 20, c.bot - c.top); if (k < .22) { const r = rnd(n * 977 + 3); let x = 200 + r() * 880, y = c.top; g.strokeStyle = "#f4eeff"; g.lineWidth = 3; g.lineJoin = "round"; g.globalAlpha = Math.min(1, fl + .3); g.beginPath(); g.moveTo(x, y); while (y < 480) { x += (r() - .5) * 60; y += 30 + r() * 30; g.lineTo(x, y); } g.stroke(); } g.restore(); }
    }
  };

  // =========================
  // FRENTE (por cima de tudo): lava, água, escuridão, vento, aviso de inversão
  // =========================
  function lava(g, est, t, dy) {
    const y0 = est.lavaY, bot = A + dy + 30, onda = x => Math.sin(x * .02 + t * 2) * 4 + Math.sin(x * .047 - t * 3) * 2.5;
    // brilho quente acima da superfície
    const bri = spr("lvg", L, 150, q => { q.fillStyle = lin(q, 0, 0, 0, 150, [[0, "rgba(255,110,30,0)"], [1, "rgba(255,150,40,.85)"]]); q.fillRect(0, 0, L, 150); });
    g.globalCompositeOperation = "lighter"; g.globalAlpha = .55 + .12 * Math.sin(t * 2); g.drawImage(bri, 0, Math.round(y0 - 140)); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    // corpo: textura pronta (gradiente + manchas) que desliza de lado; embaixo, cor lisa
    const corpo = spr("lvc", L * 2, 220, q => {
      q.fillStyle = lin(q, 0, 0, 0, 220, [[0, "#ff9a1f"], [.35, "#e8431a"], [1, "#8a1408"]]); q.fillRect(0, 0, L * 2, 220);
      const r = rnd(3); for (let i = 0; i < 70; i++) { const x = r() * L, y = 8 + r() * 200, a = 10 + r() * 26; for (const o of [0, L]) { q.beginPath(); q.ellipse(x + o, y, a, a * .3, 0, 0, TAU); q.fillStyle = r() < .6 ? "rgba(140,20,5,.45)" : "rgba(255,210,90,.4)"; q.fill(); } }
    });
    const off = Math.floor(mod(t * 18, L)), ys = Math.round(y0 + 6);
    g.drawImage(corpo, off, 0, L, 220, 0, ys, L, 220);
    g.fillStyle = "#8a1408"; g.fillRect(0, ys + 220, L, bot - ys - 220);
    // faixa ondulada da superfície
    g.save(); g.translate(0, y0); g.beginPath(); g.moveTo(-10, 12);
    for (let x = -10; x <= L + 10; x += 20) g.lineTo(x, onda(x));
    g.lineTo(L + 10, 12); g.closePath(); g.fillStyle = dado("lvs", () => lin(g, 0, -6, 0, 12, [[0, "#ffd54a"], [1, "#ff8a1f"]])); g.fill();
    g.lineJoin = "round"; g.beginPath(); for (let x = -10; x <= L + 10; x += 20) x < 0 ? g.moveTo(x, onda(x)) : g.lineTo(x, onda(x));
    g.lineWidth = 5; g.strokeStyle = "#ffe27a"; g.stroke(); g.lineWidth = 2; g.strokeStyle = "#fff6c0"; g.translate(0, 1); g.stroke(); g.translate(0, -1);
    // crostas escuras flutuando e bolhas estourando
    g.fillStyle = "#6a1a12"; g.strokeStyle = "#2a0806"; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = mod(i * 233 + t * (8 + i * 2), L + 100) - 50, y = 18 + (i % 3) * 18 + Math.sin(t + i) * 3; g.beginPath(); g.ellipse(x, y, 30 + i * 3, 6, 0, 0, TAU); g.fill(); g.stroke(); }
    g.beginPath(); g.strokeStyle = "rgba(255,226,122,.8)";
    for (let i = 0; i < 8; i++) { const k = mod(t * .45 + i * .37, 1), x = mod(i * 163 + 40, L), r = 3 + Math.sin(k * Math.PI) * 6; g.moveTo(x + r, onda(x) + 22 + (i % 3) * 20); g.arc(x, onda(x) + 22 + (i % 3) * 20, r, 0, TAU); }
    g.stroke(); g.restore();
  }
  function agua(g, t, dy) {
    // peça de 256x256 com tom azulado + cáusticas (feita uma vez), repetida e rolando devagar
    const tile = spr("cau", 256, 256, q => {
      q.fillStyle = "rgba(10,110,200,.12)"; q.fillRect(0, 0, 256, 256);
      const r = rnd(11); q.strokeStyle = "rgba(255,255,255,.13)"; q.lineWidth = 2; q.lineJoin = "round"; q.shadowColor = "#fff"; q.shadowBlur = 5;
      for (let i = 0; i < 16; i++) { const x = r() * 256, y = r() * 256, n = 5, pts = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, rd = 14 + r() * 20; pts.push([Math.cos(a) * rd, Math.sin(a) * rd * .7]); } for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { q.beginPath(); pts.forEach((p, k) => k ? q.lineTo(x + ox + p[0], y + oy + p[1]) : q.moveTo(x + ox + p[0], y + oy + p[1])); q.closePath(); q.stroke(); } }
    });
    const ox = Math.floor(mod(t * 14, 256)) - 256, oy = Math.floor(mod(t * 7, 256)) - 256 - Math.ceil(dy / 256) * 256;
    for (let y = oy; y < A + dy + 10; y += 256) for (let x = ox; x < L + 10; x += 256) g.drawImage(tile, x, y);
  }
  function escuridao(g, est, t, dy) {
    // máscara escura em meia resolução (reaproveitada); cada luz "fura" a máscara com um sprite macio
    const W = est.largura || L, H = est.altura || A, mw = Math.ceil(W / 2), mh = Math.ceil(H / 2);
    if (!masc || masc.width !== mw || masc.height !== mh) { masc = nova(mw, mh); mascG = masc.getContext("2d"); }
    const lz = spr("lzm", 128, 128, q => { q.fillStyle = rad(q, 64, 64, 64, [[0, "rgba(0,0,0,1)"], [.4, "rgba(0,0,0,.92)"], [.75, "rgba(0,0,0,.35)"], [1, "rgba(0,0,0,0)"]]); q.fillRect(0, 0, 128, 128); });
    mascG.globalCompositeOperation = "source-over"; mascG.fillStyle = "rgba(3,6,20,.9)"; mascG.fillRect(0, 0, mw, mh);
    mascG.globalCompositeOperation = "destination-out";
    const ls = est.luzes || [];
    for (let i = 0; i < ls.length; i++) { const l = ls[i], r = (l.r || 100) * 1.25 / 2; mascG.drawImage(lz, l.x / 2 - r, (l.y + dy) / 2 - r, r * 2, r * 2); }
    g.imageSmoothingEnabled = false; g.drawImage(masc, 0, -dy, mw * 2, mh * 2); g.imageSmoothingEnabled = true;
    for (let i = 0; i < ls.length; i++) luz(g, ls[i].x, ls[i].y, (ls[i].r || 100) * .8, "#ffe0a0", .1);
    // vagalumes e cogumelos brilham por cima do escuro
    g.save(); g.globalCompositeOperation = "lighter"; const vg = brilho("#d8ff70");
    for (let i = 0; i < 22; i++) { const x = 90 + (i * 53) % 1100 + Math.sin(t * .5 + i) * 40, y = 130 + (i * 37) % 480 + Math.cos(t * .4 + i * 1.3) * 30, a = Math.max(0, Math.sin(t * 2 + i * 2)); g.globalAlpha = .25 + a * .75; g.drawImage(vg, x - 11, y - 11, 22, 22); }
    g.globalAlpha = .55; COGUS.forEach(q => g.drawImage(brilho(q[1]), q[0] - 24, 622, 48, 48));
    g.restore();
  }
  function vento(g, est, t, dy) {
    const v = est.vento || 0, ac = fase(est, t), av = Math.abs(v), H = A + dy * 2;
    if (av < .02) return;
    g.save(); g.fillStyle = "rgba(235,170,90," + (.1 * av) + ")"; g.fillRect(-10, -dy - 10, L + 20, H + 20);
    g.lineCap = "round"; g.lineWidth = 2; const d = v > 0 ? 1 : -1;
    for (let gr = 0; gr < 2; gr++) {
      g.beginPath(); g.strokeStyle = gr ? "rgba(255,226,170," + (.5 * Math.min(1, av * 1.4)) + ")" : "rgba(214,150,80," + (.45 * Math.min(1, av * 1.4)) + ")";
      for (let i = gr; i < 46; i += 2) { const k = i * .6180339 % 1, sp = .6 + (i * .37 % 1) * .8, x = mod(k * L + ac * 900 * sp, L + 400) - 200, y = -dy + ((i * .7548) % 1) * H, len = (50 + 90 * av) * d; g.moveTo(x, y); g.quadraticCurveTo(x + len * .5, y + Math.sin(t * 3 + i) * 6, x + len, y); }
      g.stroke();
    }
    g.fillStyle = "rgba(255,226,170," + (.8 * av) + ")"; g.beginPath();
    for (let i = 0; i < 50; i++) { const x = mod(i * 97.1 + ac * 1400 * (.8 + i % 3 * .3), L + 20) - 10, y = -dy + ((i * .3819) % 1) * H + Math.sin(t * 4 + i) * 5; g.rect(x, y, 3, 2); }
    g.fill(); g.restore();
  }
  function aviso(g, est, t, dy) {
    const a = est.avisoInversao || 0; if (a <= .01) return;
    const p = .5 + .5 * Math.sin(t * 14), vg = spr("avr", L, A, q => { q.fillStyle = rad(q, 640, 360, 760, [[.4, "rgba(255,30,30,0)"], [1, "rgba(255,30,30,.75)"]]); q.fillRect(0, 0, L, A); });
    g.save(); g.globalAlpha = a * (.35 + .55 * p); g.drawImage(vg, 0, 0); // sem redimensionar (barato)
    if (dy > 0) { g.fillStyle = "rgba(255,30,30,.75)"; g.fillRect(0, -dy, L, dy); g.fillRect(0, A, L, dy); }
    const d = est.gravidade === -1 ? 1 : -1; // seta aponta para onde a gravidade vai
    g.globalAlpha = a * (.5 + .4 * p); g.lineCap = "round"; g.lineJoin = "round";
    for (let k = 0; k < 5; k++) { const x = 160 + k * 240; for (let i = 0; i < 3; i++) { const y = 360 + mod(i * 90 + t * 240 * d, 270) * 1 - 135; g.beginPath(); g.moveTo(x - 28, y - 14 * d); g.lineTo(x, y + 14 * d); g.lineTo(x + 28, y - 14 * d); g.lineWidth = 12; g.strokeStyle = "#7a0a0a"; g.stroke(); g.lineWidth = 7; g.strokeStyle = "#ffd23a"; g.stroke(); } }
    g.restore();
  }

  // =========================
  // API
  // =========================
  function uso(cen) { if (cache.id !== cen.id) cache = { id: cen.id }; return T[cen.id]; }
  function prerender(cen, largura, altura) {
    const tm = uso(cen), cv = nova(largura, altura), g = cv.getContext("2d"), dy = (altura - A) / 2;
    g.translate((largura - L) / 2, dy);
    if (tm) tm.pre(g, { top: -dy, bot: A + dy, dy: dy }, cen);
    return cv;
  }
  function desenharFundoAnimado(g, cen, est, t) {
    const tm = uso(cen); if (!tm) return; est = est || {};
    const dy = est.deslocY || 0; g.save(); tm.anim(g, est, t, { top: -dy, bot: A + dy }); g.restore();
  }
  function desenharPlataformas(g, cen, plats, est, t) {
    const tm = uso(cen); if (!tm) return; est = est || {};
    const dy = est.deslocY || 0;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i], s = sprPlat(tm, p, i, est);
      if (p.move) {
        if (cen.id === "cidade") luz(g, p.x + p.w / 2, p.y + p.h + 6, 54, "#ff3df2", .5 + .2 * Math.sin(t * 18 + i));
        else if (cen.id === "fabrica") { g.save(); g.strokeStyle = "#8a93a0"; g.lineWidth = 3; g.setLineDash([7, 4]); g.beginPath(); g.moveTo(p.x + 16, p.y); g.lineTo(p.x + 16, -dy - 10); g.moveTo(p.x + p.w - 16, p.y); g.lineTo(p.x + p.w - 16, -dy - 10); g.stroke(); g.restore(); }
      }
      g.drawImage(s.c, p.x - s.ox, p.y - s.oy);
      if (p.esteira) { // faixa da esteira rolando no sentido certo
        const f = faixa(p), dir = p.esteira > 0 ? 1 : -1, off = mod(t * Math.abs(p.esteira) * 60 * dir, 36);
        g.save(); g.beginPath(); g.rect(p.x + f[0], p.y + f[1], f[2], f[3]); g.clip(); g.translate(p.x + f[0] + off, p.y + f[1]); g.fillStyle = padraoEsteira(g, dir); g.fillRect(-off, 0, f[2], f[3]); g.restore();
      }
      if (cen.id === "gelo") { // brilhinhos no gelo
        const gl = spr("glint", 24, 24, q => { faisca(q, 12, 12, 11, "#fff"); });
        g.save(); g.globalCompositeOperation = "lighter";
        for (let j = 0; j < 2; j++) { const a = Math.pow(Math.max(0, Math.sin(t * 1.4 + i * 2.3 + j * 3.1)), 6); if (a > .02) { const x = p.x + 14 + ((i * 53 + j * 131) % Math.max(10, p.w - 28)), sz = 10 + a * 18; g.globalAlpha = a; g.drawImage(gl, x - sz / 2, p.y + 6 - sz / 2, sz, sz); } }
        g.restore();
      }
    }
    const bs = est.bumpers || cen.bumpers; if (bs) for (let i = 0; i < bs.length; i++) bumper(g, bs[i], i, t);
    const ps = est.portais || cen.portais;
    if (ps) ps.forEach((par, k) => { const pts = Array.isArray(par) ? par : par.a && par.b ? [par.a, par.b] : [par]; pts.forEach((q, j) => portal(g, q.x, q.y, j ? "#ff4dd8" : "#4de8ff", t, k + j)); });
  }
  function desenharFrente(g, cen, est, t) {
    uso(cen); est = est || {}; const dy = est.deslocY || 0;
    g.save();
    if (cen.lava && est.lavaY != null) lava(g, est, t, dy);
    if (cen.agua) agua(g, t, dy);
    if (cen.escuro) escuridao(g, est, t, dy);
    if (cen.vento) vento(g, est, t, dy);
    if (cen.inverte) aviso(g, est, t, dy);
    g.restore();
  }
  function corDestaque(id) { return T[id] ? T[id].cor : "#ffffff"; }

  return { prerender: prerender, desenharFundoAnimado: desenharFundoAnimado, desenharPlataformas: desenharPlataformas, desenharFrente: desenharFrente, corDestaque: corDestaque };
})();
