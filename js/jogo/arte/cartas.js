"use strict";

// =========================
// ARTE DAS CARTAS DE HABILIDADE: carta flutuando no mapa (moldura na cor da carta, brilho,
// reflexo que passeia) e os 12 ícones (também usados no HUD). Tudo vetorial, desenhado
// uma vez em canvas fora da tela (cache por id) e reaproveitado com drawImage.
// =========================

const ArteCartas = (function() {
  const TINTA = "#1b1030";
  const PI = Math.PI, TAU = Math.PI * 2;

  // ---------- cores ----------
  const cacheCor = {};
  function rgb(h) { h = h.slice(1); if (h.length === 3) h = h.replace(/./g, "$&$&"); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, f) {
    const k = a + b + f;
    if (cacheCor[k]) return cacheCor[k];
    const x = rgb(a), y = rgb(b), o = [0, 1, 2].map(function(i) { return Math.round(x[i] + (y[i] - x[i]) * f); });
    return (cacheCor[k] = "#" + ((1 << 24) | (o[0] << 16) | (o[1] << 8) | o[2]).toString(16).slice(1));
  }
  function claro(c, f) { return mix(c, "#ffffff", f); }
  function escuro(c, f) { return mix(c, "#10081f", f); }
  function rgba(h, a) { const c = rgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function criar(w, h) { const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

  // ---------- brilho pré-renderizado (radial) por cor ----------
  const brilhos = {};
  function brilho(cor) {
    if (brilhos[cor]) return brilhos[cor];
    const c = criar(64, 64), g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.16, rgba(claro(cor, 0.45), 0.95));
    gr.addColorStop(0.42, rgba(cor, 0.5)); gr.addColorStop(0.75, rgba(cor, 0.12)); gr.addColorStop(1, rgba(cor, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (brilhos[cor] = c);
  }

  // ---------- formas com contorno ----------
  function traco(g, w, c) { g.lineWidth = w || 2.4; g.strokeStyle = c || TINTA; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
  function gv(g, y0, y1, c) {
    const gr = g.createLinearGradient(0, y0, 0, y1 + 0.01);
    gr.addColorStop(0, claro(c, 0.5)); gr.addColorStop(0.45, c); gr.addColorStop(1, escuro(c, 0.36)); return gr;
  }
  function rrPath(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function pol(g, p, c, y0, y1) {
    g.beginPath(); for (let i = 0; i < p.length; i += 2) { if (i) g.lineTo(p[i], p[i + 1]); else g.moveTo(p[i], p[i + 1]); } g.closePath();
    g.fillStyle = gv(g, y0, y1, c); g.fill(); traco(g);
  }
  function cir(g, x, y, r, c) {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r * 1.05);
    gr.addColorStop(0, claro(c, 0.7)); gr.addColorStop(0.5, c); gr.addColorStop(1, escuro(c, 0.38));
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill(); traco(g, 2);
  }
  function cintila(g, x, y, s) {
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s);
    g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill();
  }
  // traço grosso com contorno escuro por baixo (linhas, arcos)
  function forte(g, w, c) { g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = TINTA; g.lineWidth = w + 3.4; g.stroke(); g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
  function brilhoTopo(g, x, y, rx, ry, rot) { g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); }

  // =========================================================
  // OS 12 ÍCONES (desenhados em volta de (0,0), cabem em ~ 36 x 36 unidades)
  // =========================================================
  const ICONES = {};

  ICONES.escudo = function(g, c) {
    g.beginPath(); g.moveTo(0, -17); g.bezierCurveTo(6, -13, 12, -12, 16, -12); g.bezierCurveTo(17, 4, 11, 13, 0, 18);
    g.bezierCurveTo(-11, 13, -17, 4, -16, -12); g.bezierCurveTo(-12, -12, -6, -13, 0, -17); g.closePath();
    g.fillStyle = gv(g, -17, 18, "#4dabf7"); g.fill(); traco(g, 2.6);
    g.save(); g.clip(); g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(-20, -20, 20, 40); g.restore();
    g.beginPath(); g.moveTo(0, -11); g.bezierCurveTo(4, -9, 8, -8, 11, -8); g.bezierCurveTo(11, 2, 7, 8, 0, 12); g.bezierCurveTo(-7, 8, -11, 2, -11, -8); g.bezierCurveTo(-8, -8, -4, -9, 0, -11);
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1.8; g.stroke();
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 3.4 : 7.4; g.lineTo(Math.cos(a) * r, -1 + Math.sin(a) * r); }
    g.closePath(); g.fillStyle = "#ffd43b"; g.fill(); traco(g, 1.6);
  };
  ICONES.rapidez = function(g) {
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2.4; g.lineCap = "round";
    [[-17, -9, -10], [-18, 0, -11], [-16, 9, -9]].forEach(function(l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[1]); g.stroke(); });
    pol(g, [6, -19, -9, 2, -1, 2, -6, 19, 10, -4, 1, -4, 9, -19], "#ffd43b", -19, 19);
    g.beginPath(); g.moveTo(4, -14); g.lineTo(-4, -1); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.stroke();
  };
  ICONES.cura = function(g) {
    g.beginPath(); g.moveTo(0, 15); g.bezierCurveTo(-24, -2, -14, -20, 0, -9); g.bezierCurveTo(14, -20, 24, -2, 0, 15); g.closePath();
    g.fillStyle = gv(g, -17, 15, "#ff5d73"); g.fill(); traco(g, 2.6);
    brilhoTopo(g, -8, -9, 4, 2.2, -0.6);
    g.fillStyle = "#fff"; g.beginPath(); g.rect(-2.8, -7, 5.6, 14); g.rect(-7, -2.8, 14, 5.6); g.fill(); traco(g, 1.4);
    g.fillStyle = "#fff"; g.beginPath(); g.rect(-2.2, -6.4, 4.4, 12.8); g.rect(-6.4, -2.2, 12.8, 4.4); g.fill();
  };
  ICONES.furia = function(g) {
    g.beginPath(); g.moveTo(0, -20); g.bezierCurveTo(4, -12, 15, -8, 14, 5); g.bezierCurveTo(14, 14, 8, 18, 0, 18); g.bezierCurveTo(-9, 18, -15, 12, -14, 3); g.bezierCurveTo(-13, -3, -8, -5, -8, -11); g.bezierCurveTo(-4, -9, -2, -13, 0, -20); g.closePath();
    g.fillStyle = gv(g, -20, 18, "#ff5a3a"); g.fill(); traco(g, 2.6);
    g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(3, -2, 9, 0, 8, 7); g.bezierCurveTo(8, 13, 4, 15, 0, 15); g.bezierCurveTo(-5, 15, -9, 11, -8, 6); g.bezierCurveTo(-7, 2, -3, 0, 0, -6); g.closePath();
    g.fillStyle = gv(g, -6, 15, "#ffc233"); g.fill();
    // carinha brava
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(-3.6, 5, 2.4, 3, 0, 0, TAU); g.ellipse(3.6, 5, 2.4, 3, 0, 0, TAU); g.fill();
    g.fillStyle = TINTA; g.beginPath(); g.arc(-3, 6, 1.2, 0, TAU); g.arc(3, 6, 1.2, 0, TAU); g.fill();
    g.strokeStyle = TINTA; g.lineWidth = 2; g.lineCap = "round"; g.beginPath(); g.moveTo(-7, 0.6); g.lineTo(-1.5, 3); g.moveTo(7, 0.6); g.lineTo(1.5, 3); g.stroke();
  };
  ICONES.tiro_duplo = function(g) {
    function bala(y) {
      g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2.4; g.lineCap = "round"; [[-17, y - 2, -11], [-18, y + 3, -10]].forEach(function(l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[1]); g.stroke(); });
      g.beginPath(); g.moveTo(-8, y - 6); g.lineTo(6, y - 6); g.quadraticCurveTo(15, y - 6, 18, y); g.quadraticCurveTo(15, y + 6, 6, y + 6); g.lineTo(-8, y + 6); g.closePath();
      g.fillStyle = gv(g, y - 6, y + 6, "#ffc233"); g.fill(); traco(g, 2.2);
      g.save(); g.clip(); g.fillStyle = gv(g, y - 6, y + 6, "#ff7a2b"); g.fillRect(5, y - 8, 16, 16); g.restore();
      g.beginPath(); g.moveTo(-8, y - 6); g.lineTo(6, y - 6); g.quadraticCurveTo(15, y - 6, 18, y); g.quadraticCurveTo(15, y + 6, 6, y + 6); g.lineTo(-8, y + 6); g.closePath(); traco(g, 2.2);
      g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, y - 3); g.lineTo(5, y - 3); g.stroke();
    }
    bala(-9); bala(9);
  };
  ICONES.mini = function(g) {
    g.setLineDash([3.5, 3.5]); g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function(d) {
      const x = d[0] * 17, y = d[1] * 17;
      g.beginPath(); g.moveTo(x + d[1] * 4.5 - d[0] * 0, y + d[0] * 4.5); g.lineTo(x - d[0] * 7, y - d[1] * 7); g.lineTo(x - d[1] * 4.5, y - d[0] * 4.5); g.closePath();
      g.fillStyle = "#ffd43b"; g.fill(); traco(g, 1.6);
    });
    cir(g, 0, 0, 6.5, "#cc5de8");
    g.fillStyle = "#fff"; g.beginPath(); g.arc(-2.2, -0.5, 1.6, 0, TAU); g.arc(2.2, -0.5, 1.6, 0, TAU); g.fill(); g.fillStyle = TINTA; g.beginPath(); g.arc(-2, -0.3, 0.8, 0, TAU); g.arc(2.4, -0.3, 0.8, 0, TAU); g.fill();
  };
  ICONES.congelar = function(g) {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * PI / 3 - PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      g.moveTo(0, 0); g.lineTo(ca * 18, sa * 18);
      [[9.5, 5.5], [14, 4]].forEach(function(b) { const bx = ca * b[0], by = sa * b[0]; [-1, 1].forEach(function(s) { const a2 = a + s * 0.95; g.moveTo(bx, by); g.lineTo(bx + Math.cos(a2) * b[1], by + Math.sin(a2) * b[1]); }); });
    }
    forte(g, 3.4, "#e6fbff");
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * PI / 3; g.lineTo(Math.cos(a) * 4.6, Math.sin(a) * 4.6); } g.closePath(); g.fillStyle = "#99e9f2"; g.fill(); traco(g, 1.6);
    cintila(g, 12, -13, 3.6);
  };
  ICONES.fantasma = function(g) {
    g.beginPath(); g.moveTo(-14, 17); g.lineTo(-14, -2); g.bezierCurveTo(-14, -19, 14, -19, 14, -2); g.lineTo(14, 17);
    g.quadraticCurveTo(10, 11, 7, 17); g.quadraticCurveTo(3.5, 11, 0, 17); g.quadraticCurveTo(-3.5, 11, -7, 17); g.quadraticCurveTo(-10, 11, -14, 17); g.closePath();
    g.fillStyle = gv(g, -16, 17, "#f2f4fa"); g.fill(); traco(g, 2.6);
    g.fillStyle = TINTA; g.beginPath(); g.ellipse(-5, -3, 2.6, 3.6, 0, 0, TAU); g.ellipse(5, -3, 2.6, 3.6, 0, 0, TAU); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(-4.2, -4.4, 1, 0, TAU); g.arc(5.8, -4.4, 1, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,140,170,.7)"; g.beginPath(); g.ellipse(-9, 3, 2.6, 1.6, 0, 0, TAU); g.ellipse(9, 3, 2.6, 1.6, 0, 0, TAU); g.fill();
    g.fillStyle = TINTA; g.beginPath(); g.ellipse(0, 4, 2, 2.6, 0, 0, TAU); g.fill();
    brilhoTopo(g, -8, -12, 3.4, 1.8, -0.7);
  };
  ICONES.reflexo = function(g) {
    // espelho de mão
    g.beginPath(); g.moveTo(5, 8); g.lineTo(13, 17); forte(g, 4.6, "#c08a4a");
    cir(g, 0, -3, 13, "#d6dcea");
    g.beginPath(); g.arc(0, -3, 9.4, 0, TAU); g.fillStyle = "#9ee6ff"; g.fill(); traco(g, 1.6);
    g.strokeStyle = "#fff"; g.lineWidth = 2.4; g.lineCap = "round"; g.beginPath(); g.moveTo(-5, -7); g.lineTo(-1, -11); g.moveTo(-6, -2); g.lineTo(2, -10); g.stroke();
    // seta que volta
    g.beginPath(); g.moveTo(-16, 9); g.quadraticCurveTo(-4, 14, 8, 3); forte(g, 3.2, "#f783ac");
    pol(g, [5, -2, 14, 2, 4, 10], "#f783ac", -2, 10);
  };
  ICONES.super_pulo = function(g) {
    // asinhas nas laterais
    [-1, 1].forEach(function(s) {
      g.beginPath(); g.moveTo(s * 6, 2); g.bezierCurveTo(s * 13, 2, s * 19, -4, s * 20, -13); g.bezierCurveTo(s * 15, -10, s * 13, -11, s * 10, -9); g.bezierCurveTo(s * 15, -6, s * 10, -2, s * 6, -2); g.closePath();
      g.fillStyle = gv(g, -13, 2, "#ffffff"); g.fill(); traco(g, 1.8);
    });
    // mola
    g.beginPath(); g.moveTo(-9, 17);
    for (let i = 0; i < 5; i++) { g.lineTo(9, 14 - i * 6.4 - 1.6); g.lineTo(-9, 14 - i * 6.4 - 4.8); }
    g.lineTo(0, -15); forte(g, 3.6, "#94d82d");
    ellRet(g, -11, 16, 22, 4.4, "#b7ec4a");
    ellRet(g, -9, -16, 18, 4.4, "#b7ec4a");
  };
  function ellRet(g, x, y, w, h, c) { rrPath(g, x, y, w, h, h / 2); g.fillStyle = gv(g, y, y + h, c); g.fill(); traco(g, 1.8); }
  ICONES.chuva = function(g) {
    function met(x, y, s) {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.beginPath(); g.moveTo(-3, -4); g.quadraticCurveTo(-18, -16, -22, -22); g.quadraticCurveTo(-8, -20, 2, -9); g.closePath();
      g.fillStyle = "#ffb21f"; g.fill(); traco(g, 1.8);
      g.beginPath(); g.moveTo(-3, -2); g.quadraticCurveTo(-11, -9, -13, -13); g.quadraticCurveTo(-5, -11, 1, -5); g.closePath(); g.fillStyle = "#fff3a0"; g.fill();
      g.beginPath(); g.moveTo(-6, -5); g.lineTo(-1, -10); g.lineTo(7, -6); g.lineTo(8, 1); g.lineTo(2, 7); g.lineTo(-5, 4); g.closePath();
      g.fillStyle = gv(g, -10, 7, "#8a5a4a"); g.fill(); traco(g, 2);
      g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(-1, -5, 2.4, 1.2, -0.5, 0, TAU); g.fill();
      g.restore();
    }
    met(-3, -2, 1.05); met(14, 8, 0.75); met(-8, 17, 0.6);
  };
  ICONES.municao = function(g) {
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, d = 1 + Math.sin(a) * Math.sin(a); const x = 17 * Math.cos(a) / d, y = 17 * Math.sin(a) * Math.cos(a) / d * 1.5; if (i) g.lineTo(x, y - 2); else g.moveTo(x, y - 2); }
    g.closePath(); forte(g, 5, "#f1f3f8");
    g.strokeStyle = "rgba(120,130,160,.6)"; g.lineWidth = 1.4; g.stroke();
    // balinha embaixo
    g.beginPath(); g.moveTo(-8, 10.5); g.lineTo(3, 10.5); g.quadraticCurveTo(10, 10.5, 12, 14.5); g.quadraticCurveTo(10, 18.5, 3, 18.5); g.lineTo(-8, 18.5); g.closePath();
    g.fillStyle = gv(g, 10, 19, "#ffc233"); g.fill(); traco(g, 1.8);
  };

  // sprites dos ícones (um por id)
  const sprIcone = {};
  function iconeSpr(id) {
    if (sprIcone[id]) return sprIcone[id];
    const E = 3, c = criar(48 * E, 48 * E), g = c.getContext("2d");
    g.scale(E, E); g.translate(24, 24);
    if (ICONES[id]) ICONES[id](g, CARTA[id] ? CARTA[id].cor : "#fff");
    return (sprIcone[id] = c);
  }
  // só o ícone (HUD): centrado em (x,y), cabendo em "tam" px
  function icone(ctx, id, x, y, tam) {
    const s = tam / 40;
    ctx.drawImage(iconeSpr(id), x - 24 * s, y - 24 * s, 48 * s, 48 * s);
  }

  // =========================================================
  // A CARTA: moldura na cor, painel claro, ícone, canto com estrelinha
  // =========================================================
  const CW = 46, CH = 64;
  const sprCarta = {};
  function cartaSpr(id) {
    if (sprCarta[id]) return sprCarta[id];
    const cor = (CARTA[id] && CARTA[id].cor) || "#adb5bd", E = 3, c = criar((CW + 8) * E, (CH + 8) * E), g = c.getContext("2d");
    g.scale(E, E); g.translate((CW + 8) / 2, (CH + 8) / 2);
    const x = -CW / 2, y = -CH / 2;
    // moldura
    rrPath(g, x, y, CW, CH, 8); g.fillStyle = gv(g, y, y + CH, cor); g.fill(); traco(g, 3);
    // painel interno claro (levemente colorido)
    rrPath(g, x + 4, y + 4, CW - 8, CH - 8, 5);
    const pg = g.createRadialGradient(0, -6, 2, 0, 0, 34);
    pg.addColorStop(0, "#ffffff"); pg.addColorStop(0.7, claro(cor, 0.78)); pg.addColorStop(1, claro(cor, 0.5));
    g.fillStyle = pg; g.fill(); traco(g, 1.8, escuro(cor, 0.6));
    // listras decorativas de fundo
    g.save(); rrPath(g, x + 4, y + 4, CW - 8, CH - 8, 5); g.clip();
    g.strokeStyle = rgba(cor, 0.16); g.lineWidth = 3;
    for (let i = -4; i < 6; i++) { g.beginPath(); g.moveTo(x + i * 9, y + CH); g.lineTo(x + i * 9 + CH * 0.6, y); g.stroke(); }
    g.restore();
    // ícone
    g.save(); g.translate(0, -2); g.scale(0.78, 0.78); if (ICONES[id]) ICONES[id](g, cor); g.restore();
    // faixa inferior com pontinhos
    rrPath(g, x + 8, y + CH - 13, CW - 16, 6, 3); g.fillStyle = escuro(cor, 0.18); g.fill(); traco(g, 1.4);
    g.fillStyle = claro(cor, 0.6); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-6 + i * 6, y + CH - 10, 1.1, 0, TAU); g.fill(); }
    // cantos
    cintila(g, x + 8.5, y + 8.5, 3.2); cintila(g, x + CW - 8.5, y + CH - 18, 2.2);
    // brilho do vidro no topo
    g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(x + 13, y + 6.5, 9, 1.6, -0.1, 0, TAU); g.fill();
    return (sprCarta[id] = { c: c, w: CW + 8, h: CH + 8 });
  }
  // faixa de reflexo que atravessa a carta
  let faixa = null;
  function faixaSpr() {
    if (faixa) return faixa;
    const c = criar(40, 90), g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 40, 0);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,.75)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 40, 90);
    return (faixa = c);
  }

  // carta flutuando: balança, gira levemente, brilha. (x,y) = centro da carta
  function desenharCarta(ctx, id, x, y, escala, t) {
    const e = escala == null ? 1 : escala, tt = t || 0, cor = (CARTA[id] && CARTA[id].cor) || "#adb5bd";
    const bob = Math.sin(tt * 2.4 + id.length) * 3 * e, giro = Math.cos(tt * 1.7 + id.length);
    const sp = cartaSpr(id);
    ctx.save();
    ctx.translate(x, y + bob);
    // brilho atrás
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.55 + 0.2 * Math.sin(tt * 4);
    const R = 52 * e; ctx.drawImage(brilho(cor), -R, -R, R * 2, R * 2); ctx.restore();
    // sombra suave no chão (pequena)
    ctx.rotate(Math.sin(tt * 1.3) * 0.06);
    ctx.scale(e * (0.9 + 0.1 * giro), e * (1 + 0.015 * Math.sin(tt * 2.4)));
    ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    // reflexo que passeia (recortado na carta)
    const ph = ((tt * 0.55 + id.length * 0.13) % 2.2) - 0.6;
    if (ph > -0.3 && ph < 1.3) {
      ctx.save(); rrPath(ctx, -CW / 2, -CH / 2, CW, CH, 8); ctx.clip();
      ctx.globalAlpha = 0.85; ctx.translate(-CW / 2 + ph * (CW + 30) - 15, 0); ctx.rotate(0.35); ctx.drawImage(faixaSpr(), -20, -50, 40, 100);
      ctx.restore();
    }
    // estrelinhas
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 2; i++) {
      const ph2 = (tt * 0.8 + i * 0.5) % 1, a = i * 2.4 + tt * 0.5;
      ctx.globalAlpha = Math.sin(ph2 * PI);
      ctx.drawImage(brilho("#ffffff"), Math.cos(a) * 24 - 6, Math.sin(a) * 33 - 6, 12, 12);
    }
    ctx.restore();
  }

  function aquecer() { Object.keys(ICONES).forEach(function(id) { iconeSpr(id); cartaSpr(id); }); faixaSpr(); }

  return { desenharCarta: desenharCarta, icone: icone, aquecer: aquecer };
})();
