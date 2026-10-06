"use strict";

// =========================
// ARTE DAS ARMAS: desenho das 50 armas (na mão e como ícone), projéteis, feixes,
// avisos do céu, caixas de arma. Tudo vetorial, desenhado uma vez em canvas fora da tela
// (cache por id) e reaproveitado com drawImage. Sem shadowBlur por quadro.
// =========================

const ArteArmas = (function() {
  const TINTA = "#1b1030";
  const PI = Math.PI, TAU = Math.PI * 2;

  // ---------- utilidades de cor ----------
  const cacheCor = {};
  function rgb(h) {
    h = h.charAt(0) === "#" ? h.slice(1) : h;
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // mistura duas cores hex (f = 0 devolve a, 1 devolve b)
  function mix(a, b, f) {
    const k = a + b + f;
    if (cacheCor[k]) return cacheCor[k];
    const x = rgb(a), y = rgb(b), o = [0, 1, 2].map(function(i) {
      return Math.round(x[i] + (y[i] - x[i]) * f);
    });
    return (cacheCor[k] = "#" + ((1 << 24) | (o[0] << 16) | (o[1] << 8) | o[2]).toString(16).slice(1));
  }
  function claro(c, f) { return mix(c, "#ffffff", f); }
  function escuro(c, f) { return mix(c, "#10081f", f); }
  function rgba(h, a) { const c = rgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function criar(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // ---------- sprites de brilho (radial) por cor, feitos uma vez ----------
  const brilhos = {};
  function brilho(cor) {
    if (brilhos[cor]) return brilhos[cor];
    const c = criar(64, 64), g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.16, rgba(claro(cor, 0.45), 0.95));
    gr.addColorStop(0.42, rgba(cor, 0.5));
    gr.addColorStop(0.75, rgba(cor, 0.12));
    gr.addColorStop(1, rgba(cor, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return (brilhos[cor] = c);
  }
  // desenha o brilho (modo lighter) centrado em (x,y) com raio r
  function bril(ctx, x, y, r, cor, a) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a == null ? 1 : a;
    ctx.drawImage(brilho(cor), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  // rastro (faixa que afina para trás), cabeça em x=0 apontando para a direita
  const rastros = {};
  function rastro(cor) {
    if (rastros[cor]) return rastros[cor];
    const c = criar(64, 16), g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, rgba(cor, 0));
    gr.addColorStop(0.7, rgba(cor, 0.55));
    gr.addColorStop(1, rgba(claro(cor, 0.6), 0.95));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 8); g.lineTo(60, 1); g.quadraticCurveTo(66, 8, 60, 15); g.closePath(); g.fill();
    return (rastros[cor] = c);
  }

  // ---------- formas com contorno (usadas no cache das armas) ----------
  function traco(g, w) { g.lineWidth = w || 2; g.strokeStyle = TINTA; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
  function gv(g, y0, y1, c) {
    const gr = g.createLinearGradient(0, y0, 0, y1 + 0.01);
    gr.addColorStop(0, claro(c, 0.5)); gr.addColorStop(0.4, c); gr.addColorStop(1, escuro(c, 0.38));
    return gr;
  }
  function rrPath(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
    g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
    g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
  }
  // retângulo arredondado com gradiente, contorno e brilho no topo
  function ret(g, x, y, w, h, r, c) {
    rrPath(g, x, y, w, h, r);
    g.fillStyle = gv(g, y, y + h, c); g.fill(); traco(g);
    if (h > 5 && w > 7) {
      g.fillStyle = "rgba(255,255,255,0.38)";
      rrPath(g, x + 1.8, y + 1.4, w - 3.6, Math.min(2.2, h * 0.2), 1); g.fill();
    }
  }
  // polígono [x,y,x,y...]
  function pol(g, p, c) {
    let y0 = 1e9, y1 = -1e9;
    g.beginPath();
    for (let i = 0; i < p.length; i += 2) {
      if (p[i + 1] < y0) y0 = p[i + 1];
      if (p[i + 1] > y1) y1 = p[i + 1];
      if (i) g.lineTo(p[i], p[i + 1]); else g.moveTo(p[i], p[i + 1]);
    }
    g.closePath();
    g.fillStyle = gv(g, y0, y1, c); g.fill(); traco(g);
  }
  // esfera: gradiente radial com reflexo
  function cir(g, x, y, r, c, sh) {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r * 1.05);
    gr.addColorStop(0, claro(c, 0.7)); gr.addColorStop(0.5, c); gr.addColorStop(1, escuro(c, sh == null ? 0.4 : sh));
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill(); traco(g);
  }
  function ell(g, x, y, rx, ry, c, rot) {
    g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    g.fillStyle = gv(g, y - ry, y + ry, c); g.fill(); traco(g);
  }
  // cápsula grossa de (x0,y0) a (x1,y1) (canos, cabos, varetas)
  function cap(g, x0, y0, x1, y1, w, c) {
    g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
    g.strokeStyle = TINTA; g.lineWidth = w + 3.6; g.stroke();
    g.strokeStyle = c; g.lineWidth = w; g.stroke();
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
    let nx = dy / l, ny = -dx / l;
    if (ny > 0) { nx = -nx; ny = -ny; }
    g.beginPath(); g.moveTo(x0 + nx * w * 0.22, y0 + ny * w * 0.22); g.lineTo(x1 + nx * w * 0.22, y1 + ny * w * 0.22);
    g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = Math.max(1, w * 0.28); g.stroke();
  }
  // linha com contorno (cordas, arcos): pontos [x,y,...]
  function lin(g, p, w, c, fecha) {
    g.beginPath();
    for (let i = 0; i < p.length; i += 2) { if (i) g.lineTo(p[i], p[i + 1]); else g.moveTo(p[i], p[i + 1]); }
    if (fecha) g.closePath();
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = TINTA; g.lineWidth = w + 3; g.stroke();
    g.strokeStyle = c; g.lineWidth = w; g.stroke();
  }
  // estrelinha de brilho (4 pontas) branca
  function cintila(g, x, y, s) {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s);
    g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill();
  }
  // estrela de n pontas (raio externo R, interno ri)
  function estrelaPath(g, x, y, R, ri, n, rot) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (rot || 0) + i * PI / n, rr = i % 2 ? ri : R;
      if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }
  // crescente (bumerangue, vento): arco de raio R com abertura "span" e espessura w
  function crescente(g, R, span, w, c, semTinta) {
    const L = [], Rr = [], n = 14;
    for (let i = 0; i <= n; i++) {
      const u = i / n * 2 - 1, a = u * span, wi = w * (1 - 0.45 * Math.abs(u) * Math.abs(u)) / 2;
      const cx = R * Math.cos(a) - R, cy = R * Math.sin(a), nx = Math.cos(a), ny = Math.sin(a);
      L.push(cx + nx * wi, cy + ny * wi); Rr.push(cx - nx * wi, cy - ny * wi);
    }
    const p = L.concat(Rr.reverse());
    g.beginPath();
    for (let i = 0; i < p.length; i += 2) { if (i) g.lineTo(p[i], p[i + 1]); else g.moveTo(p[i], p[i + 1]); }
    g.closePath();
    g.fillStyle = c; g.fill();
    if (!semTinta) traco(g, 1.8);
  }

  // =========================================================
  // AS 50 ARMAS: cada uma desenhada apontando para a direita (+x), com a empunhadura
  // perto da origem (0,0). Unidades de projeto = pixels para raio 22 da bolinha.
  // =========================================================
  const A = {};
  let COMMAO = true; // desenha a luva? (os ícones não têm)
  function def(id, b, f, glow, mel) { A[id] = { b: b, f: f, glow: glow || null, mel: mel || null }; }
  // luva branca de desenho animado segurando a arma
  function M(g, x, y) {
    if (!COMMAO) return;
    cir(g, x + 3.4, y - 4.6, 3.6, "#f7f8ff", 0.2);
    cir(g, x, y, 6.8, "#f7f8ff", 0.2);
    g.strokeStyle = "rgba(27,16,48,0.35)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 2, y + 1); g.lineTo(x + 5.5, y + 2.6); g.stroke();
  }
  // cabo de pistola
  function cabo(g, c, x, y) { pol(g, [x - 6, y, x + 6, y, x + 9, y + 15, x - 4, y + 16], c); }
  function guarda(g, x, y) { g.beginPath(); g.arc(x, y, 6, 0.1, PI - 0.1); traco(g, 2.6); }
  function ponta(g, x, y, r, c) { cir(g, x, y, r, c); }

  def("estilingue", [25, 0], function(g) {
    lin(g, [25, -16, 11, 0, 25, 16], 2.6, "#ff6b6b");
    cap(g, -7, 10, 8, 1, 7, "#c98b4a"); cap(g, 8, 1, 25, -16, 6, "#c98b4a"); cap(g, 8, 1, 25, 16, 6, "#c98b4a");
    ell(g, 11, 0, 5, 6, "#8a5a2b"); cir(g, 12, 0, 4.4, "#b3bac8");
    M(g, -1, 6);
  });

  def("pistola", [36, -5], function(g) {
    cabo(g, "#ff9a3c", 0, 0);
    ret(g, -9, -12, 45, 11, 4, "#bac4d8");
    ret(g, 30, -10, 8, 8, 2, "#69738f");
    ret(g, -7, -15, 4, 4, 1, "#69738f"); ret(g, 30, -15, 3.5, 4, 1, "#69738f");
    g.strokeStyle = "rgba(27,16,48,.35)"; g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-4 + i * 3, -10); g.lineTo(-4 + i * 3, -3); g.stroke(); }
    guarda(g, 9, 0); M(g, 0, 8);
  });

  def("revolver", [45, -5], function(g) {
    pol(g, [-8, -2, 5, -2, 9, 15, -7, 16], "#b0652d");
    ret(g, 18, -12, 28, 7, 2, "#d5dbe8"); ret(g, 18, -14.5, 28, 3, 1, "#8892ab");
    ret(g, 42, -15, 4, 5, 1, "#8892ab");
    ret(g, -9, -13, 28, 14, 5, "#d5dbe8");
    ret(g, 6, -14, 14, 15, 4, "#9aa5bd");
    g.strokeStyle = "rgba(27,16,48,.4)"; g.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(9 + i * 4, -11); g.lineTo(9 + i * 4, -2); g.stroke(); }
    pol(g, [-12, -14, -6, -14, -5, -7, -10, -8], "#6a738f");
    guarda(g, 6, 0); M(g, -1, 8);
  });

  def("submetralhadora", [38, -5], function(g) {
    pol(g, [4, -1, 18, 22, 11, 22, 0, -1], "#8a93ad");
    cabo(g, "#3b4160", -5, 0);
    ret(g, -9, -13, 38, 13, 3, "#586082");
    ret(g, 26, -11, 14, 9, 2, "#2f3550");
    g.fillStyle = "#c6cde0"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(30 + i * 4, -6.5, 1.2, 0, TAU); g.fill(); }
    ret(g, -5, -17, 20, 5, 2, "#ffb347");
    ret(g, 38, -9, 5, 5, 1, "#6a738f");
    guarda(g, 10, 0); M(g, -2, 8);
  });

  def("minigun", [58, -3], function(g) {
    for (let i = 0; i < 3; i++) ret(g, 12, -13 + i * 6, 44, 6.5, 2.5, i === 1 ? "#cfd6e6" : "#98a2bb");
    ret(g, 30, -15, 5, 22, 2, "#ffb347"); ret(g, 54, -14.5, 5, 21, 2, "#3b4160");
    ret(g, -8, -16, 22, 24, 7, "#59627f");
    ret(g, 2, -22, 18, 7, 3, "#ffb347");
    pol(g, [-3, 7, 7, 7, 8, 18, -2, 18], "#3b4160");
    ret(g, -16, 2, 14, 12, 3, "#6b7a3a");
    g.strokeStyle = TINTA; g.lineWidth = 1.2; g.fillStyle = "#ffd43b";
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-12 + i * 3.4, 2, 2, PI, TAU); g.fill(); g.stroke(); }
    M(g, 3, 12);
  });

  def("escopeta", [64, -6], function(g) {
    pol(g, [-8, -10, -14, -7, -14, 9, -7, 11, -3, 4], "#b8743a");
    ret(g, 2, -10, 62, 6, 2.5, "#7a84a0");
    ret(g, 6, -4, 44, 6, 2.5, "#59627f");
    ret(g, -8, -13, 22, 15, 4, "#3b4160");
    ret(g, 22, -4.5, 20, 9, 3.5, "#b8743a");
    ret(g, 60, -12, 4, 5, 1, "#c6cde0");
    pol(g, [-2, 1, 6, 1, 8, 12, -3, 12], "#8a5a2b");
    M(g, 0, 7);
  });

  def("escopeta_dupla", [66, -7], function(g) {
    pol(g, [-8, -10, -14, -7, -14, 9, -7, 11, -3, 4], "#9a5a2a");
    ret(g, 2, -14, 64, 7, 3, "#aab3c8"); ret(g, 2, -7.5, 64, 7, 3, "#7a84a0");
    ret(g, 62, -15, 4, 18, 2, "#ffb347");
    ret(g, -8, -16, 20, 17, 4, "#4b3a6a");
    ret(g, 16, -4, 22, 10, 4, "#9a5a2a");
    g.fillStyle = "#ffd43b"; g.beginPath(); g.arc(-1, -8, 2, 0, TAU); g.fill();
    pol(g, [-2, 1, 6, 1, 8, 12, -3, 12], "#6a3a1a");
    M(g, 0, 7);
  });

  def("rifle", [60, -6], function(g) {
    pol(g, [4, -1, 10, -1, 16, 15, 8, 15], "#2f3550");
    cabo(g, "#2f3550", -4, 0);
    ret(g, -12, -11, 12, 12, 3, "#4d5a3f");
    ret(g, -9, -13, 38, 13, 3, "#5d6b4a");
    ret(g, 26, -11.5, 22, 9, 2, "#2f3550");
    ret(g, 46, -9, 14, 4.5, 1.5, "#98a2bb"); ret(g, 56, -11, 6, 8, 2, "#6a738f");
    ret(g, -2, -20, 16, 7, 3, "#2b2f45"); g.fillStyle = "#ff6b6b"; g.beginPath(); g.arc(12, -16.5, 2, 0, TAU); g.fill();
    guarda(g, 9, 0); M(g, -1, 8);
  });

  def("sniper", [80, -6], function(g) {
    ret(g, 28, -8, 52, 4, 1.5, "#8892ab"); ret(g, 78, -9.5, 5, 7, 1, "#4b5470");
    lin(g, [50, -4, 44, 8], 2, "#4b5470"); lin(g, [54, -4, 60, 8], 2, "#4b5470");
    pol(g, [-8, -9, -14, -7, -14, 8, -6, 10, -3, 3], "#3a4a7a");
    ret(g, -8, -12, 40, 11, 4, "#4d63a8");
    pol(g, [-2, 0, 6, 0, 8, 12, -3, 12], "#2b3866");
    ret(g, 2, -21, 34, 9, 4, "#2b2f45"); ret(g, 31, -23, 8, 13, 3, "#586082"); ret(g, -1, -23, 7, 13, 3, "#586082");
    cir(g, 38, -16.5, 4, "#7ae7ff"); cintila(g, 37, -18, 2.2);
    ret(g, 8, -14, 3, 4, 1, "#586082"); ret(g, 24, -14, 3, 4, 1, "#586082");
    M(g, 0, 7);
  });

  def("plasma", [40, -5], function(g) {
    pol(g, [-6, 0, 6, 0, 9, 14, -3, 15], "#2b3b66");
    pol(g, [-10, -13, 20, -14, 24, -2, 18, 2, -8, 2], "#35d6b4");
    ret(g, 2, -17, 16, 5, 2, "#e9fff8");
    cir(g, 27, -6, 11, "#c9fff0", 0.2);
    g.fillStyle = "#4dffb0"; g.beginPath(); g.arc(27, -6, 7, 0, TAU); g.fill();
    g.fillStyle = "#e9fff8"; g.beginPath(); g.arc(25.5, -7.5, 3.4, 0, TAU); g.fill();
    ret(g, 33, -9, 8, 6, 2, "#2b3b66");
    ret(g, 10, -3, 8, 5, 2, "#ffffff");
    M(g, 0, 8);
  }, [[27, -6, 22, "#3dffa6"]]);

  def("pula_pula", [44, -4], function(g) {
    pol(g, [-6, 0, 6, 0, 9, 14, -3, 15], "#4dabf7");
    ret(g, -10, -14, 32, 15, 7, "#ffd43b");
    ret(g, 4, -10, 12, 7, 3, "#ff8fb8");
    g.beginPath(); g.moveTo(21, -6);
    for (let i = 0; i < 6; i++) g.lineTo(23 + i * 2.8, i % 2 ? -1 : -11);
    g.lineTo(37, -6);
    g.strokeStyle = TINTA; g.lineWidth = 6.5; g.lineJoin = "round"; g.stroke();
    g.strokeStyle = "#c7cde0"; g.lineWidth = 3.2; g.stroke();
    cir(g, 42, -6, 8, "#ff5fa2");
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2; g.beginPath(); g.arc(42, -6, 4.5, 3.6, 5.0); g.stroke();
    M(g, 0, 8);
  });

  def("confete", [38, -2], function(g) {
    const cores = ["#ff5d73", "#ffd43b", "#4dabf7", "#51cf66", "#cc5de8"];
    // serpentinas saindo da boca
    const sp = [[-0.5, "#ff5d73"], [0.1, "#4dabf7"], [0.7, "#ffd43b"]];
    for (let k = 0; k < 3; k++) {
      g.beginPath(); g.moveTo(34, -2);
      for (let i = 1; i <= 8; i++) g.lineTo(34 + i * 3.4, -2 + sp[k][0] * i * 3.2 + Math.sin(i * 1.3 + k) * 3);
      g.strokeStyle = TINTA; g.lineWidth = 4.6; g.stroke(); g.strokeStyle = sp[k][1]; g.lineWidth = 2.4; g.stroke();
    }
    pol(g, [-8, -2, 28, -17, 28, 13], "#b05cf0");
    g.save(); g.beginPath(); g.moveTo(-8, -2); g.lineTo(28, -17); g.lineTo(28, 13); g.closePath(); g.clip();
    for (let i = 0; i < 7; i++) { g.fillStyle = cores[i % 5]; g.beginPath(); g.arc(2 + i * 4.5, -2 + ((i * 7) % 11) - 5, 2, 0, TAU); g.fill(); }
    g.restore();
    g.beginPath(); g.moveTo(-8, -2); g.lineTo(28, -17); g.lineTo(28, 13); g.closePath(); traco(g);
    g.beginPath(); g.ellipse(28, -2, 4.5, 15, 0, 0, TAU); g.fillStyle = "#3a1a5e"; g.fill(); traco(g);
    cir(g, -9, -2, 3.2, "#ffd43b");
    for (let i = 0; i < 9; i++) { g.fillStyle = cores[i % 5]; g.save(); g.translate(36 + (i * 5) % 18, -18 + ((i * 13) % 34)); g.rotate(i); g.fillRect(-2, -1.4, 4, 2.8); g.restore(); }
    M(g, 2, 4);
  });

  def("arma_agua", [44, -5], function(g) {
    pol(g, [-6, 0, 6, 0, 9, 14, -3, 15], "#ff6b6b");
    ret(g, -9, -13, 34, 14, 6, "#ffd43b");
    ret(g, -2, -25, 26, 13, 6, "#9ae6ff");
    g.save(); rrPath(g, -2, -25, 26, 13, 6); g.clip();
    g.fillStyle = "#2f9bff"; g.beginPath(); g.moveTo(-2, -19);
    for (let i = 0; i <= 26; i += 2) g.lineTo(-2 + i, -19 + Math.sin(i * 0.5) * 1.6);
    g.lineTo(24, -12); g.lineTo(-2, -12); g.fill();
    g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(6, -15, 1.6, 0, TAU); g.fill(); g.beginPath(); g.arc(14, -16.5, 1.2, 0, TAU); g.fill();
    g.restore(); rrPath(g, -2, -25, 26, 13, 6); traco(g);
    ret(g, 22, -11, 20, 8, 3, "#ff6b6b"); ret(g, 40, -12, 5, 10, 2, "#c7cde0");
    ret(g, 26, -2, 8, 6, 2, "#4dabf7");
    M(g, 0, 8);
  });

  def("zarabatana", [68, -2], function(g) {
    cap(g, -6, -2, 66, -2, 6, "#a3c957");
    for (let i = 0; i < 6; i++) { g.fillStyle = "#6b9a2a"; rrPath(g, 6 + i * 11, -6, 3, 8, 1); g.fill(); traco(g, 1.2); }
    ret(g, -9, -5, 6, 6, 2, "#4b3a2a");
    g.fillStyle = "#c98b4a"; pol(g, [66, -4, 74, -2, 66, 0], "#5b6078");
    M(g, 2, 3);
  });

  def("onda_sonora", [44, -2], function(g) {
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.arc(34, -2, 14 + i * 7, -0.85, 0.85);
      g.strokeStyle = TINTA; g.lineWidth = 5.5 - i; g.stroke();
      g.strokeStyle = ["#7ae7ff", "#a5f0ff", "#d6f8ff"][i]; g.lineWidth = 3 - i * 0.5; g.stroke();
    }
    pol(g, [4, -7, 32, -17, 32, 13, 4, 3], "#ff5d73");
    g.beginPath(); g.ellipse(32, -2, 4.5, 15, 0, 0, TAU); g.fillStyle = "#7a1830"; g.fill(); traco(g);
    g.strokeStyle = "#fff"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(14, -9); g.lineTo(14, 5); g.stroke();
    ret(g, -9, -9, 16, 14, 4, "#ffd43b");
    pol(g, [-4, 5, 5, 5, 6, 15, -3, 15], "#3b4160");
    M(g, 0, 9);
  }, [[34, -2, 18, "#7ae7ff"]]);

  // ---- arremesso ----
  def("shuriken", [30, -3], function(g) {
    g.save(); g.translate(16, -3); g.rotate(0.3); estrelaShuri(g, 18); g.restore();
    M(g, 1, 5);
  });

  def("bumerangue", [36, -14], function(g) {
    g.save(); g.translate(14, -3); g.rotate(-0.3);
    lin(g, [-9, -23, 6, 0, -9, 23], 11, "#ffc233");
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2.4; g.lineCap = "round"; g.beginPath(); g.moveTo(-8, -20); g.lineTo(3, -2); g.stroke();
    g.fillStyle = "#e8403a"; [[-4, -12], [-4, 12], [3, 0]].forEach(function(p) { g.beginPath(); g.arc(p[0], p[1], 2.4, 0, TAU); g.fill(); });
    g.restore();
    M(g, 0, 6);
  });

  function arcoBase(g, cor, n) {
    g.beginPath(); g.moveTo(-5, -31); g.quadraticCurveTo(24, 0, -5, 31);
    g.lineCap = "round"; g.strokeStyle = TINTA; g.lineWidth = 8.5; g.stroke(); g.strokeStyle = cor; g.lineWidth = 5; g.stroke();
    g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-3, -28); g.quadraticCurveTo(19, 0, -3, 28); g.stroke();
    cir(g, -5, -31, 2.8, "#ffd43b"); cir(g, -5, 31, 2.8, "#ffd43b");
    ret(g, 6, -6, 7, 12, 3, "#8a4b2b");
  }
  function flecha(g, x0, ang, len) {
    g.save(); g.translate(x0, 0); g.rotate(ang);
    cap(g, 0, 0, len - 6, 0, 2.2, "#d9a15a");
    pol(g, [len - 8, -4, len + 5, 0, len - 8, 4], "#cfd6e4");
    pol(g, [1, 0, -5, -5, 6, -4], "#ff5d73"); pol(g, [1, 0, -5, 5, 6, 4], "#ffffff");
    g.restore();
  }
  def("arco", [38, 0], function(g) {
    lin(g, [-5, -31, -9, 0, -5, 31], 1.4, "#f4f6ff");
    flecha(g, -9, 0, 46);
    arcoBase(g, "#c9803a"); M(g, 9, 1);
  });
  def("arco_triplo", [38, 0], function(g) {
    lin(g, [-5, -31, -9, 0, -5, 31], 1.4, "#f4f6ff");
    flecha(g, -9, -0.26, 44); flecha(g, -9, 0.26, 44); flecha(g, -9, 0, 48);
    arcoBase(g, "#9b5de5"); M(g, 9, 1);
  });

  def("besta", [48, -6], function(g) {
    lin(g, [30, -27, 12, -5, 30, 27], 1.6, "#f4f6ff");
    pol(g, [-8, -4, 46, -4, 48, 4, -8, 7], "#b0652d");
    pol(g, [-2, 4, 6, 4, 8, 15, -3, 15], "#8a4b2b");
    cap(g, 4, -7, 46, -7, 3, "#d9a15a"); pol(g, [44, -11, 54, -7, 44, -3], "#cfd6e4");
    pol(g, [4, -7, -1, -11, 9, -10], "#ff5d73");
    g.beginPath(); g.moveTo(28, -30); g.quadraticCurveTo(46, 0, 28, 30);
    g.lineCap = "round"; g.strokeStyle = TINTA; g.lineWidth = 9; g.stroke(); g.strokeStyle = "#7a84a0"; g.lineWidth = 5.4; g.stroke();
    g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(29, -27); g.quadraticCurveTo(43, 0, 29, 27); g.stroke();
    ret(g, 22, -6, 14, 10, 3, "#586082");
    M(g, 0, 6);
  });

  function lamina(g, x, y, R, n, c) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = i * PI / n, rr = i % 2 ? R * 0.84 : R, a2 = a + (i % 2 ? 0 : 0.12);
      g.lineTo(x + Math.cos(a2) * rr, y + Math.sin(a2) * rr);
    }
    g.closePath(); g.fillStyle = gv(g, y - R, y + R, c); g.fill(); traco(g, 1.8);
  }
  def("serra", [50, -4], function(g) {
    pol(g, [-4, 0, 6, 0, 8, 14, -3, 15], "#4b5470");
    ret(g, -9, -13, 30, 15, 6, "#ff9f43");
    ret(g, 4, -9, 8, 5, 2, "#fff");
    lamina(g, 33, -4, 18, 12, "#d4dcee");
    g.strokeStyle = "rgba(75,84,112,.5)"; g.lineWidth = 1.2; g.beginPath(); g.arc(33, -4, 11.5, 0, TAU); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2; g.beginPath(); g.arc(33, -4, 14, 3.6, 4.7); g.stroke();
    cir(g, 33, -4, 4.4, "#ff9f43");
    M(g, 0, 8);
  });

  def("bola_neve", [28, -3], function(g) {
    cir(g, 14, -3, 14, "#eef9ff", 0.3);
    g.fillStyle = "rgba(143,200,245,.55)"; g.beginPath(); g.arc(18, 3, 8, 0, TAU); g.fill();
    cir(g, 9, -9, 3.4, "#ffffff", 0.05);
    g.fillStyle = "rgba(160,200,235,.8)";
    [[16, -8, 1.6], [20, -2, 1.4], [7, 1, 1.5]].forEach(function(p) { g.beginPath(); g.arc(p[0], p[1], p[2], 0, TAU); g.fill(); });
    cintila(g, 24, -14, 4);
    M(g, 0, 5);
  });

  def("gancho", [46, -6], function(g) {
    ell(g, 12, 9, 10, 7, "#c9a066"); g.beginPath(); g.ellipse(12, 9, 5, 3.4, 0, 0, TAU); g.fillStyle = "#6b4a2a"; g.fill();
    ret(g, -9, -13, 30, 12, 4, "#4b5470");
    pol(g, [-4, -1, 6, -1, 8, 12, -3, 12], "#ff9f43");
    ret(g, 20, -11, 14, 8, 2, "#8892ab");
    lin(g, [34, -7, 42, -7], 3, "#cfd6e4");
    g.beginPath(); g.moveTo(42, -7); g.quadraticCurveTo(60, -7, 56, -22);
    g.moveTo(42, -7); g.quadraticCurveTo(60, -7, 56, 9);
    g.moveTo(42, -7); g.lineTo(58, -7);
    g.lineCap = "round"; g.strokeStyle = TINTA; g.lineWidth = 7; g.stroke(); g.strokeStyle = "#cfd6e4"; g.lineWidth = 3.6; g.stroke();
    M(g, 0, 7);
  });

  // ---- explosivos ----
  // estrela de aço de 4 pontas com facetas (arma e projétil)
  function estrelaShuri(g, R) {
    const ri = R * 0.3;
    estrelaPath(g, 0, 0, R, ri, 4, -PI / 4 + 0.0);
    const gr = g.createLinearGradient(-R, -R, R, R);
    gr.addColorStop(0, "#f2f6ff"); gr.addColorStop(0.5, "#aeb8d0"); gr.addColorStop(1, "#6a738f");
    g.fillStyle = gr; g.fill();
    // metade escura de cada ponta (facetas)
    g.fillStyle = "rgba(40,50,90,.38)";
    for (let i = 0; i < 4; i++) {
      const a = -PI / 4 + i * PI / 2, a1 = a + PI / 4;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri); g.closePath(); g.fill();
    }
    estrelaPath(g, 0, 0, R, ri, 4, -PI / 4); traco(g, Math.max(1.5, R * 0.1));
    g.beginPath(); g.arc(0, 0, R * 0.2, 0, TAU); g.fillStyle = "#1b1030"; g.fill();
    g.fillStyle = "#e8403a"; g.beginPath(); g.arc(0, 0, R * 0.1, 0, TAU); g.fill();
  }

  def("bazuca", [70, -9], function(g) {
    pol(g, [58, -17, 72, -9, 58, -1], "#ff5d73");
    ret(g, -10, -18, 70, 18, 6, "#7a9650");
    ret(g, -13, -20, 8, 22, 3, "#4d5a3f");
    ret(g, 50, -19, 7, 20, 2, "#4d5a3f");
    g.fillStyle = "#ffd43b"; for (let i = 0; i < 3; i++) { rrPath(g, 22 + i * 7, -17.5, 3.5, 15, 1); g.fill(); }
    ret(g, 14, -25, 8, 7, 2, "#2f3550");
    ret(g, 26, -2, 7, 10, 3, "#3b4160");
    pol(g, [-3, -1, 6, -1, 8, 12, -3, 12], "#3b4160");
    M(g, 1, 6);
  });

  def("lanca_granadas", [44, -6], function(g) {
    pol(g, [-4, 0, 6, 0, 9, 14, -3, 15], "#6b4a2a");
    ret(g, 16, -15, 30, 17, 6, "#5d9448");
    ret(g, 42, -17, 6, 21, 2, "#2f3550");
    ret(g, -9, -16, 28, 18, 6, "#7aad5a");
    ret(g, 0, -20, 16, 6, 3, "#2f3550");
    g.fillStyle = "#2f3550"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(4 + i * 6, -7, 2.3, 0, TAU); g.fill(); }
    cir(g, 30, -6, 3.5, "#2b2f45");
    guarda(g, 8, 2); M(g, 0, 8);
  });

  // granada de mão (abacaxi) – usada na arma e no projétil
  function granadaCorpo(g, x, y, rx, ry, cor, cor2) {
    ell(g, x, y, rx, ry, cor);
    g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.clip();
    g.strokeStyle = "rgba(27,16,48,.4)"; g.lineWidth = 1.2;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * rx * 0.4 - ry, y - ry); g.lineTo(x + i * rx * 0.4 + ry, y + ry); g.stroke(); g.beginPath(); g.moveTo(x + i * rx * 0.4 + ry, y - ry); g.lineTo(x + i * rx * 0.4 - ry, y + ry); g.stroke(); }
    g.restore();
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); traco(g);
    g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(x - rx * 0.4, y - ry * 0.45, rx * 0.22, ry * 0.3, -0.5, 0, TAU); g.fill();
    ret(g, x - rx * 0.32, y - ry - 4, rx * 0.64, 6, 2, cor2 || "#aeb6c8");
    lin(g, [x + rx * 0.2, y - ry - 3, x + rx * 0.95, y - ry - 1, x + rx * 1.05, y - ry * 0.3], 2.4, cor2 || "#cfd6e4");
    g.beginPath(); g.arc(x - rx * 0.1, y - ry - 8, 3.4, 0, TAU); g.strokeStyle = TINTA; g.lineWidth = 3.8; g.stroke(); g.strokeStyle = "#ffd43b"; g.lineWidth = 1.7; g.stroke();
  }
  def("granada", [24, -8], function(g) { granadaCorpo(g, 12, -1, 10, 12, "#6aa84f"); M(g, 2, 5); });

  def("dinamite", [34, -6], function(g) {
    const ys = [-10, -2.5, 5];
    for (let i = 0; i < 3; i++) {
      ret(g, -4, ys[i] - 3.5, 34, 8, 4, i === 1 ? "#ff6a5a" : "#e8403a");
    }
    g.fillStyle = "#f4e4c1"; for (let i = 0; i < 3; i++) { g.fillRect(24, ys[i] - 3.4, 4, 7.4); }
    ret(g, 10, -14, 7, 24, 2, "#f7d98a");
    g.fillStyle = TINTA; g.font = "bold 5px sans-serif";
    lin(g, [30, -9, 36, -13, 34, -19], 2, "#8a6a3a");
    cir(g, 34, -20, 2.6, "#ffd43b"); cintila(g, 34, -20, 5);
    M(g, 1, 4);
  }, [[34, -20, 11, "#ffb347"]]);

  def("fragmentacao", [26, -9], function(g) {
    granadaCorpo(g, 13, -1, 11, 12, "#4d5568", "#ffb347");
    g.fillStyle = "#ffb347"; g.save(); g.beginPath(); g.ellipse(13, -1, 11, 12, 0, 0, TAU); g.clip();
    g.beginPath(); g.moveTo(1, -3); g.lineTo(13, 3); g.lineTo(25, -3); g.lineTo(25, 3); g.lineTo(13, 9); g.lineTo(1, 3); g.closePath(); g.fill(); g.restore();
    g.beginPath(); g.ellipse(13, -1, 11, 12, 0, 0, TAU); traco(g);
    M(g, 3, 5);
  });

  def("canhao", [56, -6], function(g) {
    lin(g, [-2, -17, -5, -23, 0, -27], 2, "#8a6a3a"); cir(g, 0, -27, 2.4, "#ffd43b"); cintila(g, 0, -27, 5);
    pol(g, [-5, -17, 52, -14, 52, 2, -5, 5], "#59627f");
    ret(g, 6, -18, 6, 25, 2, "#ffc233"); ret(g, 34, -17, 6, 21, 2, "#ffc233");
    ret(g, 50, -18, 9, 24, 3, "#7a84a0");
    g.beginPath(); g.ellipse(59, -6, 2.5, 8, 0, 0, TAU); g.fillStyle = "#10081f"; g.fill();
    cir(g, 8, 11, 12, "#a8602b");
    g.strokeStyle = TINTA; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = i * PI / 4; g.beginPath(); g.moveTo(8 + Math.cos(a) * 11, 11 + Math.sin(a) * 11); g.lineTo(8 - Math.cos(a) * 11, 11 - Math.sin(a) * 11); g.stroke(); }
    cir(g, 8, 11, 3.4, "#ffc233");
    M(g, 0, 2);
  });

  def("mini_misseis", [48, -9], function(g) {
    ret(g, -9, -4, 46, 12, 4, "#4b5470");
    function miss(y) { ret(g, -5, y - 4, 38, 8, 4, "#f4f6ff"); pol(g, [32, y - 4.5, 47, y, 32, y + 4.5], "#ff5d73"); pol(g, [-4, y - 3, -9, y - 8, 2, y - 4], "#ff5d73"); }
    miss(-12); miss(-4);
    ret(g, 8, -18, 4, 24, 1.5, "#ffc233"); ret(g, 24, -18, 4, 24, 1.5, "#ffc233");
    pol(g, [-3, 8, 6, 8, 8, 18, -2, 18], "#2f3550");
    M(g, 1, 12);
  });

  def("missil", [62, -3], function(g) {
    pol(g, [-3, -8, -12, -17, -2, -17, 8, -8], "#ff5d73"); pol(g, [-3, 6, -12, 15, -2, 15, 8, 6], "#ff5d73");
    ret(g, -4, -9, 48, 16, 8, "#f4f6ff");
    pol(g, [40, -9, 52, -6, 62, -1, 52, 4, 40, 7], "#ff5d73");
    g.fillStyle = "#4dabf7"; g.fillRect(8, -9, 5, 16);
    g.beginPath(); g.rect(8, -9, 5, 16); g.strokeStyle = TINTA; g.lineWidth = 1.5; g.stroke();
    cir(g, 24, -1, 4.2, "#7ae7ff"); cintila(g, 22.5, -2.6, 2);
    M(g, 3, 8);
  });

  def("abelhas", [34, -2], function(g) {
    ell(g, 14, 4, 12, 7, "#ffb21f");
    ell(g, 14, -4, 15, 9, "#ffc93c"); ell(g, 14, -13, 12, 7, "#ffd95e"); ell(g, 14, -20, 7, 5, "#ffe58a");
    g.strokeStyle = "rgba(122,74,10,.55)"; g.lineWidth = 1.6; [[-9, 6], [-1, 8], [8, 10]].forEach(function(r) { g.beginPath(); g.ellipse(14, r[0], 13 - (r[0] === -9 ? 2 : 0), 3, 0, 0.1, PI - 0.1); g.stroke(); });
    g.beginPath(); g.ellipse(26, -2, 3.5, 6, 0, 0, TAU); g.fillStyle = "#3a1a0a"; g.fill(); traco(g, 1.6);
    // abelhinhas
    [[4, -26], [30, -16]].forEach(function(p) {
      g.save(); g.translate(p[0], p[1]);
      g.fillStyle = "rgba(220,245,255,.9)"; g.beginPath(); g.ellipse(-1, -4, 3, 2, -0.6, 0, TAU); g.fill(); traco(g, 1);
      ell(g, 0, 0, 5, 3.4, "#ffd43b"); g.fillStyle = TINTA; g.fillRect(-1.2, -3, 1.6, 6);
      g.restore();
    });
    M(g, 0, 8);
  });

  def("bola_fogo", [30, -4], function(g) {
    function chama(x, y, s, c) {
      g.beginPath(); g.moveTo(x + s, y);
      g.bezierCurveTo(x + s * 0.8, y - s * 1.1, x - s * 0.5, y - s * 1.25, x - s * 1.9, y - s * 0.6);
      g.bezierCurveTo(x - s * 1.2, y - s * 0.3, x - s * 1.5, y + s * 0.4, x - s * 2.1, y + s * 0.8);
      g.bezierCurveTo(x - s * 1.1, y + s * 1.0, x + s * 0.5, y + s * 1.2, x + s, y);
      g.closePath(); g.fillStyle = c;
    }
    chama(18, -3, 13, "#e8403a"); g.fill(); traco(g, 2);
    chama(18, -3, 9.5, "#ff9f43"); g.fill();
    chama(18, -2, 6, "#ffd43b"); g.fill();
    cir(g, 17, -3, 4.2, "#fff6c9", 0.05);
    M(g, 0, 5);
  }, [[16, -3, 30, "#ff8a2b"]]);

  def("granada_gelo", [26, -9], function(g) {
    granadaCorpo(g, 13, -1, 11, 12, "#7ad3f5", "#e9f9ff");
    g.strokeStyle = "#ffffff"; g.lineWidth = 1.8; g.lineCap = "round";
    for (let i = 0; i < 3; i++) { const a = i * PI / 3; g.beginPath(); g.moveTo(13 + Math.cos(a) * 6.5, -1 + Math.sin(a) * 6.5); g.lineTo(13 - Math.cos(a) * 6.5, -1 - Math.sin(a) * 6.5); g.stroke(); }
    cintila(g, 24, -12, 4);
    M(g, 3, 5);
  });

  def("mina", [18, 0], function(g) {
    ell(g, 12, 3, 20, 7, "#4b5470");
    g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(12, -22, 30, 2); g.closePath();
    g.fillStyle = gv(g, -14, 3, "#8a93ad"); g.fill(); traco(g);
    g.save(); g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(12, -22, 30, 2); g.closePath(); g.clip();
    g.fillStyle = "#ffd43b"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-4 + i * 9, 2); g.lineTo(2 + i * 9, 2); g.lineTo(8 + i * 9, -14); g.lineTo(2 + i * 9, -14); g.fill(); }
    g.restore(); g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(12, -22, 30, 2); g.closePath(); traco(g);
    ell(g, 12, 3, 20, 5, "#59627f");
    cir(g, 12, -8, 3.6, "#ff4757");
    M(g, 8, 9);
  }, [[12, -8, 10, "#ff3b4e"]]);

  // ---- energia ----
  def("laser", [42, -5], function(g) {
    pol(g, [-5, 0, 7, 0, 10, 14, -2, 15], "#ff5d73");
    pol(g, [-10, -12, 24, -14, 38, -8, 38, -1, -9, 2], "#f4f6ff");
    ret(g, 4, -9, 22, 5, 2, "#ff5d73");
    cir(g, 36, -5, 6, "#ff3b4e"); g.fillStyle = "#fff"; g.beginPath(); g.arc(35, -6.5, 2.4, 0, TAU); g.fill();
    ret(g, -8, -17, 12, 6, 3, "#8892ab");
    M(g, 0, 8);
  }, [[36, -5, 20, "#ff3b4e"]]);

  def("railgun", [70, -5], function(g) {
    ret(g, 6, -13, 62, 4.5, 2, "#c6cde0"); ret(g, 6, -1, 62, 4.5, 2, "#8892ab");
    g.fillStyle = "#7ae7ff"; g.fillRect(8, -8.4, 58, 7.4);
    g.fillStyle = "#e9fdff"; g.fillRect(8, -5.8, 58, 2.4);
    for (let i = 0; i < 4; i++) ret(g, 14 + i * 12, -18, 5, 26, 2, "#4d63a8");
    ret(g, -10, -17, 20, 26, 6, "#2f3a63");
    ret(g, -4, -13, 8, 4, 2, "#7ae7ff");
    cir(g, 68, -5, 3.4, "#e9fdff");
    pol(g, [-3, 8, 6, 8, 8, 19, -2, 19], "#2b3866");
    M(g, 0, 11);
  }, [[68, -5, 22, "#46c8ff"], [30, -5, 26, "#46c8ff"]]);

  def("arco_iris", [50, -5], function(g) {
    pol(g, [-5, 0, 7, 0, 10, 14, -2, 15], "#ff8fd0");
    ret(g, -11, -15, 36, 17, 8, "#fff2fb");
    const cs = ["#ff5d73", "#ff922b", "#ffd43b", "#51cf66", "#4dabf7", "#845ef7"];
    g.save(); rrPath(g, 22, -13, 28, 14, 3); g.clip();
    for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(22, -13 + i * 2.35, 30, 2.4); }
    g.restore(); rrPath(g, 22, -13, 28, 14, 3); traco(g);
    estrelaPath(g, 4, -7, 7.5, 3.4, 5, -PI / 2); g.fillStyle = "#ffd43b"; g.fill(); traco(g, 1.6);
    estrelaPath(g, 52, -6, 7, 3, 5, -PI / 2); g.fillStyle = "#fff6c9"; g.fill(); traco(g, 1.6);
    cintila(g, 14, -19, 4);
    M(g, 0, 8);
  }, [[52, -6, 18, "#ff9ad5"]]);

  def("feixe", [48, -6], function(g) {
    pol(g, [-4, 0, 6, 0, 9, 14, -3, 15], "#3b2a6a");
    ret(g, -10, -15, 32, 17, 6, "#5b3b9a");
    for (let i = 0; i < 3; i++) ret(g, 6 + i * 5, -18, 3.5, 23, 1.5, "#ff7ad9");
    pol(g, [22, -9, 44, -17, 44, 5, 22, -1], "#ffc233");
    g.beginPath(); g.ellipse(44, -6, 4, 11, 0, 0, TAU); g.fillStyle = "#2a0f50"; g.fill(); traco(g);
    cir(g, 38, -6, 5, "#ff7ad9"); g.fillStyle = "#fff"; g.beginPath(); g.arc(37, -7.5, 2, 0, TAU); g.fill();
    M(g, 0, 8);
  }, [[42, -6, 22, "#d36bff"]]);

  def("tesla", [48, -9], function(g) {
    pol(g, [-4, 0, 6, 0, 9, 14, -3, 15], "#3b4160");
    ret(g, -10, -15, 22, 17, 6, "#4b5470");
    for (let i = 0; i < 5; i++) ell(g, 14 + i * 5, -8 - i * 0.2, 4.2, 10 - i * 0.8, "#e0894a");
    cir(g, 42, -8, 7.5, "#dfe6f5");
    g.strokeStyle = TINTA; g.lineWidth = 3.2; g.lineJoin = "round";
    [[0, -1], [0.9, -1], [-0.8, 1]].forEach(function(d, k) {
      const a = -0.5 + k * 0.9;
      g.beginPath(); g.moveTo(42 + Math.cos(a) * 7, -8 + Math.sin(a) * 7);
      g.lineTo(42 + Math.cos(a) * 12, -8 + Math.sin(a) * 12 - 3); g.lineTo(42 + Math.cos(a) * 14, -8 + Math.sin(a) * 14 + 2); g.lineTo(42 + Math.cos(a) * 19, -8 + Math.sin(a) * 19 - 2);
      g.stroke();
      g.strokeStyle = "#a5f3ff"; g.lineWidth = 1.6; g.stroke(); g.strokeStyle = TINTA; g.lineWidth = 3.2;
    });
    M(g, 0, 8);
  }, [[42, -8, 24, "#5ad2ff"]]);

  def("raio_gelo", [50, -6], function(g) {
    pol(g, [-4, 0, 6, 0, 9, 14, -3, 15], "#4b7fb0");
    ret(g, -10, -14, 30, 16, 6, "#d6f1ff");
    ret(g, 4, -10, 14, 5, 2, "#7ad3f5");
    // cristal na frente
    pol(g, [20, -6, 30, -18, 44, -14, 54, -6, 44, 2, 30, 6], "#9fe6ff");
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(30, -18); g.lineTo(34, -6); g.lineTo(44, -14); g.moveTo(34, -6); g.lineTo(54, -6); g.moveTo(34, -6); g.lineTo(30, 6); g.stroke();
    cintila(g, 38, -12, 4);
    M(g, 0, 8);
  }, [[42, -6, 20, "#8ae8ff"]]);

  def("bolhas", [44, -4], function(g) {
    cap(g, -6, 3, 26, -1, 4, "#ff8fd0");
    g.beginPath(); g.ellipse(36, -5, 9, 13, 0.1, 0, TAU);
    g.fillStyle = "rgba(200,240,255,.35)"; g.fill();
    g.strokeStyle = TINTA; g.lineWidth = 6.5; g.stroke(); g.strokeStyle = "#ffd43b"; g.lineWidth = 3.2; g.stroke();
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.6; g.beginPath(); g.arc(36, -5, 5, 3.8, 5); g.stroke();
    function bol(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = "rgba(160,225,255,.35)"; g.fill(); g.strokeStyle = "rgba(27,16,48,.85)"; g.lineWidth = 1.6; g.stroke(); g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, r * 0.62, 3.6, 4.7); g.stroke(); }
    bol(54, -16, 6); bol(55, 6, 4.5); bol(48, -27, 3.2);
    M(g, 0, 4);
  });

  def("buraco_negro", [34, -2], function(g) {
    g.save(); g.translate(18, -3); g.rotate(-0.35);
    g.beginPath(); g.ellipse(0, 0, 21, 6.5, 0, PI, TAU);
    g.strokeStyle = "#ff7ad9"; g.lineWidth = 3.2; g.stroke();
    g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fillStyle = "#0a0614"; g.fill(); traco(g, 2.4);
    g.strokeStyle = "rgba(190,120,255,.9)"; g.lineWidth = 1.8; g.beginPath(); g.arc(0, 0, 12.5, 3.5, 5.5); g.stroke();
    g.beginPath(); g.ellipse(0, 0, 21, 6.5, 0, 0, PI); g.strokeStyle = TINTA; g.lineWidth = 6.5; g.stroke();
    g.strokeStyle = "#ffb347"; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = "#fff0c0"; g.lineWidth = 1.2; g.stroke();
    g.restore();
    cintila(g, 30, -16, 3.6); cintila(g, 4, -18, 3);
    M(g, 0, 6);
  }, [[18, -3, 30, "#a55bff"]]);

  // ---- fogo e vento ----
  def("lanca_chamas", [54, -6], function(g) {
    lin(g, [4, -14, 2, -6, 8, -2], 3, "#3b4160");
    ret(g, -6, -28, 28, 14, 7, "#e8403a");
    g.fillStyle = "#ffd43b"; g.save(); rrPath(g, -6, -28, 28, 14, 7); g.clip();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 8 - 4, -28); g.lineTo(i * 8 + 2, -28); g.lineTo(i * 8 + 8, -14); g.lineTo(i * 8 + 2, -14); g.fill(); }
    g.restore(); rrPath(g, -6, -28, 28, 14, 7); traco(g);
    pol(g, [-4, 0, 6, 0, 9, 14, -3, 15], "#3b4160");
    ret(g, -9, -13, 26, 14, 5, "#59627f");
    ret(g, 16, -10, 30, 7, 3, "#98a2bb"); ret(g, 44, -12, 7, 11, 2, "#ff9f43");
    g.beginPath(); g.moveTo(52, -6); g.quadraticCurveTo(56, -14, 60, -6); g.quadraticCurveTo(56, -2, 52, -6);
    g.fillStyle = "#ffd43b"; g.fill(); traco(g, 1.6);
    M(g, 0, 8);
  }, [[56, -6, 18, "#ff8a2b"]]);

  def("soprador", [48, -5], function(g) {
    pol(g, [18, -9, 52, -17, 52, 7, 18, 1], "#a7e3a0");
    ret(g, 50, -19, 5, 28, 2, "#2f7a3a");
    ret(g, -10, -16, 30, 20, 8, "#4cbf56");
    ret(g, 0, -12, 8, 12, 2, "#2f7a3a");
    g.strokeStyle = "rgba(27,16,48,.45)"; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(10, -12 + i * 4); g.lineTo(17, -12 + i * 4); g.stroke(); }
    pol(g, [-3, 4, 7, 4, 9, 14, -2, 14], "#2f3550");
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2; g.lineCap = "round";
    [[58, -10, 66], [60, -3, 70], [58, 4, 66]].forEach(function(l) { g.beginPath(); g.moveTo(l[0], l[1]); g.quadraticCurveTo(l[0] + 4, l[1] - 3, l[2], l[1]); g.stroke(); });
    M(g, 0, 8);
  });

  // ---- corpo a corpo ----
  def("martelo", [60, 0], function(g) {
    cap(g, -8, 0, 44, 0, 6, "#c98b4a");
    g.strokeStyle = "rgba(27,16,48,.4)"; g.lineWidth = 1.2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8 + i * 8, -2); g.lineTo(11 + i * 8, 2); g.stroke(); }
    ret(g, 34, -17, 28, 34, 7, "#e8403a");
    ret(g, 34, -17, 5, 34, 2, "#ffd43b"); ret(g, 57, -17, 5, 34, 2, "#ffd43b");
    cintila(g, 46, -9, 4);
    M(g, 1, 0);
  }, null, { tipo: "martelo", alc: 62 });

  def("espada", [76, 0], function(g) {
    pol(g, [14, -5.5, 66, -5.5, 80, 0, 66, 5.5, 14, 5.5], "#d6e8ff");
    g.fillStyle = "rgba(90,130,200,.45)"; g.fillRect(16, -1, 58, 2.4);
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(18, -3.6); g.lineTo(62, -3.6); g.stroke();
    ret(g, 9, -14, 7, 28, 3, "#ffc233");
    cir(g, 12.5, -14, 3, "#ff5d73"); cir(g, 12.5, 14, 3, "#ff5d73");
    ret(g, -5, -3.6, 15, 7.2, 3, "#8a4b2b");
    cir(g, -8, 0, 4.5, "#ffc233");
    M(g, 2, 0);
  }, null, { tipo: "espada", alc: 76 });

  def("luva_boxe", [38, 0], function(g) {
    ret(g, -6, -9, 12, 18, 4, "#f4f6ff");
    g.strokeStyle = "rgba(27,16,48,.5)"; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-3, -5 + i * 5); g.lineTo(3, -5 + i * 5); g.stroke(); }
    g.beginPath(); g.moveTo(4, -10); g.bezierCurveTo(6, -22, 34, -22, 36, -4); g.bezierCurveTo(37, 10, 28, 14, 18, 13); g.bezierCurveTo(12, 16, 6, 14, 4, 10); g.closePath();
    g.fillStyle = gv(g, -20, 14, "#e8403a"); g.fill(); traco(g, 2.4);
    g.beginPath(); g.moveTo(20, 12); g.bezierCurveTo(12, 9, 14, 3, 22, 4); g.strokeStyle = "rgba(27,16,48,.55)"; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.ellipse(18, -13, 8, 3, -0.25, 0, TAU); g.fill();
    ret(g, 8, -9, 6, 4, 2, "#ffffff");
  }, null, { tipo: "luva", alc: 40 });

  // ---- do céu ----
  def("meteoro", [30, -8], function(g) {
    function chama(x, y, s, c) {
      g.beginPath(); g.moveTo(x + s, y - s * 0.1);
      g.bezierCurveTo(x + s * 0.5, y - s * 1.2, x - s * 1.3, y - s * 1.0, x - s * 2.2, y - s * 1.7);
      g.bezierCurveTo(x - s * 1.6, y - s * 0.6, x - s * 1.8, y + s * 0.3, x - s * 2.5, y + s * 0.9);
      g.bezierCurveTo(x - s * 1.2, y + s * 0.9, x + s * 0.3, y + s * 1.1, x + s, y - s * 0.1);
      g.closePath(); g.fillStyle = c;
    }
    chama(16, -4, 12, "#ff6a2b"); g.fill(); traco(g, 2); chama(16, -4, 8.5, "#ffb21f"); g.fill();
    pol(g, [6, -9, 14, -17, 24, -13, 28, -3, 23, 6, 12, 8, 4, 0], "#7b5646");
    g.strokeStyle = "#ffb21f"; g.lineWidth = 1.8; g.lineCap = "round";
    g.beginPath(); g.moveTo(10, -8); g.lineTo(15, -3); g.lineTo(13, 3); g.moveTo(15, -3); g.lineTo(23, -4); g.stroke();
    g.fillStyle = "rgba(255,255,255,.3)"; g.beginPath(); g.ellipse(12, -11, 4, 2, -0.5, 0, TAU); g.fill();
    M(g, 0, 6);
  }, [[16, -4, 32, "#ff8a2b"]]);

  def("relampago", [14, -24], function(g) {
    pol(g, [18, -26, 2, -2, 12, -2, 4, 22, 26, -8, 15, -8, 24, -26], "#ffd43b");
    g.beginPath(); g.moveTo(16, -22); g.lineTo(7, -4); g.lineTo(14, -4); g.lineTo(9, 10); g.strokeStyle = "#fffbe0"; g.lineWidth = 2.2; g.lineCap = "round"; g.stroke();
    cintila(g, 28, -20, 4); cintila(g, -2, -12, 3);
    M(g, 0, 7);
  }, [[14, -2, 30, "#ffd43b"]]);

  // =========================================================
  // CACHE DAS ARMAS (sprite na mão com luva; sprite do ícone sem luva, recortado)
  // =========================================================
  const X0 = -40, Y0 = -52, LW = 170, LH = 104; // área de projeto em unidades
  function renderizar(a, mao, esc, rot) {
    const c = criar(LW * esc, LH * esc), g = c.getContext("2d");
    g.scale(esc, esc); g.translate(-X0, -Y0);
    if (rot) g.rotate(rot);
    COMMAO = mao;
    a.f(g);
    COMMAO = true;
    return c;
  }
  // recorta o canvas ao retângulo realmente pintado (devolve medidas em unidades de projeto)
  function recortar(c, esc) {
    let bx0 = 0, by0 = 0, bx1 = c.width, by1 = c.height;
    try {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height;
      bx0 = w; by0 = h; bx1 = 0; by1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 10) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      }
      if (bx1 < bx0) { bx0 = 0; by0 = 0; bx1 = w - 1; by1 = h - 1; }
    } catch (e) { /* sem leitura de pixels: usa a área toda */ }
    bx0 = Math.max(0, bx0 - 1); by0 = Math.max(0, by0 - 1);
    bx1 = Math.min(c.width - 1, bx1 + 1); by1 = Math.min(c.height - 1, by1 + 1);
    const o = criar(bx1 - bx0 + 1, by1 - by0 + 1);
    o.getContext("2d").drawImage(c, -bx0, -by0);
    return { c: o, x0: bx0 / esc + X0, y0: by0 / esc + Y0, w: o.width / esc, h: o.height / esc };
  }
  const sprMao = {}, sprIcone = {};
  function spriteMao(id) {
    return sprMao[id] || (sprMao[id] = recortar(renderizar(A[id], true, 2), 2));
  }
  function spriteIcone(id) {
    if (sprIcone[id]) return sprIcone[id];
    // armas compridas e finas ganham um giro no ícone para encher melhor o quadrado
    const t = recortar(renderizar(A[id], false, 1), 1);
    const rot = t.w / t.h > 1.9 ? -0.55 : 0;
    return (sprIcone[id] = recortar(renderizar(A[id], false, 3, rot), 3));
  }

  const relogio = function() { return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000; };

  // =========================================================
  // API: arma na mão, ícone, ponta do cano
  // =========================================================
  const DIST_MAO = 1.2, ESC_ARMA = 1.12; // ESC_ARMA: armas um pouco maiores que a bolinha para ler bem // distância da empunhadura ao centro da bolinha, em raios

  function suave(u) { return u * u * (3 - 2 * u); }

  // golpe corpo a corpo: aplica a rotação/avanço e desenha o rastro. Devolve nada.
  function golpeMelee(ctx, a, t) {
    const m = a.mel;
    if (m.tipo === "luva") {
      const dx = 30 * Math.sin(Math.min(1, t / 0.75) * PI);
      if (dx > 5) {
        ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineCap = "round";
        for (let i = -1; i <= 1; i++) { ctx.lineWidth = i ? 2 : 3; ctx.beginPath(); ctx.moveTo(-4 + dx * 0.2, i * 9 - 2); ctx.lineTo(8 + dx * 0.55 - 14, i * 9 - 2); ctx.stroke(); }
        ctx.restore();
      }
      ctx.translate(dx, 0); const s = 1 + 0.14 * Math.sin(Math.min(1, t / 0.75) * PI); ctx.scale(s, s);
      return;
    }
    let sw;
    if (t < 0.28) sw = -1.55 * suave(t / 0.28);
    else if (t < 0.56) { const u = (t - 0.28) / 0.28; sw = -1.55 + 2.6 * u * u; }
    else sw = 1.05 * (1 - suave((t - 0.56) / 0.44));
    // rastro do arco enquanto corta
    if (t > 0.3 && t < 0.9) {
      const fim = Math.max(sw, -1.55), alfa = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.3;
      if (fim > -1.45) {
        const R = m.alc * 0.88, cor = m.tipo === "espada" ? "#bfe6ff" : "#ffe08a";
        ctx.save(); ctx.lineCap = "round";
        const a0 = Math.max(-1.55, fim - 1.5);
        ctx.globalAlpha = 0.35 * alfa; ctx.strokeStyle = cor; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(0, 0, R, a0, fim); ctx.stroke();
        ctx.globalAlpha = 0.7 * alfa; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, R, a0 + (fim - a0) * 0.35, fim); ctx.stroke();
        ctx.globalAlpha = 0.95 * alfa; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, a0 + (fim - a0) * 0.65, fim); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.rotate(sw);
  }

  function desenharNaMao(ctx, id, x, y, ang, r, recuo, golpe) {
    const a = A[id];
    if (!a) return;
    const sp = spriteMao(id), esc = r / 22 * ESC_ARMA, ca = Math.cos(ang);
    ctx.save();
    ctx.translate(x + ca * r * DIST_MAO, y + Math.sin(ang) * r * DIST_MAO);
    ctx.rotate(ang);
    if (ca < 0) ctx.scale(1, -1); // não deixa a arma de cabeça para baixo
    ctx.scale(esc, esc);
    if (recuo > 0) { ctx.translate(-recuo * 8, 0); ctx.rotate(-recuo * 0.13); }
    if (a.mel && golpe > 0) golpeMelee(ctx, a, golpe);
    ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
    if (a.glow) {
      const tt = relogio();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < a.glow.length; i++) {
        const gl = a.glow[i], p = 0.5 + 0.5 * Math.sin(tt * 7 + i * 2 + gl[0]);
        ctx.globalAlpha = 0.5 + 0.35 * p + recuo * 0.4;
        const rr = gl[2] * (0.9 + 0.12 * p + recuo * 0.2);
        ctx.drawImage(brilho(gl[3]), gl[0] - rr, gl[1] - rr, rr * 2, rr * 2);
      }
    }
    ctx.restore();
  }

  // ícone da arma centrado em (x,y), cabendo num quadrado de "tam" px
  function icone(ctx, id, x, y, tam) {
    if (!A[id]) return;
    const sp = spriteIcone(id), s = tam * 0.94 / Math.max(sp.w, sp.h);
    ctx.drawImage(sp.c, x - sp.w * s / 2, y - sp.h * s / 2, sp.w * s, sp.h * s);
  }

  // de onde sai o tiro (boca do cano / ponta da arma) no mundo
  function pontaDoCano(id, x, y, ang, r) {
    const a = A[id], ca = Math.cos(ang), sa = Math.sin(ang);
    if (!a) return { x: x + ca * r * 2, y: y + sa * r * 2 };
    const esc = r / 22 * ESC_ARMA, fl = ca < 0 ? -1 : 1;
    const ox = x + ca * r * DIST_MAO, oy = y + sa * r * DIST_MAO;
    const lx = a.b[0] * esc, ly = a.b[1] * esc * fl;
    return { x: ox + lx * ca - ly * sa, y: oy + lx * sa + ly * ca };
  }

  // =========================================================
  // PROJÉTEIS: um sprite por visual+raio (cache), mais efeitos vivos baratos por cima
  // (brilho "lighter", asas, chama, pavio, luz piscando). Sprites apontam para a direita (+x).
  // =========================================================
  const psp = {};
  function psprite(key, w, h, fn) {
    if (psp[key]) return psp[key];
    const E = 2, c = criar(w * E, h * E), g = c.getContext("2d");
    g.scale(E, E); g.translate(w / 2, h / 2);
    fn(g);
    return (psp[key] = { c: c, w: w, h: h });
  }
  function pt(ctx, s) { ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h); }
  function balaPath(g, L, h, bico) {
    g.beginPath(); g.moveTo(-L / 2, -h / 2); g.lineTo(L * 0.5 - bico, -h / 2);
    g.quadraticCurveTo(L * 0.5 - bico * 0.2, -h / 2, L / 2, 0);
    g.quadraticCurveTo(L * 0.5 - bico * 0.2, h / 2, L * 0.5 - bico, h / 2);
    g.lineTo(-L / 2, h / 2); g.closePath();
  }
  function gradH(g, h, c) {
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, claro(c, 0.6)); gr.addColorStop(0.45, c); gr.addColorStop(1, escuro(c, 0.4)); return gr;
  }
  // bala com ogiva: corpo + ponta de cor diferente
  function balaSpr(g, L, h, corpo, ponta) {
    balaPath(g, L, h, L * 0.34);
    g.fillStyle = gradH(g, h, corpo); g.fill();
    g.save(); balaPath(g, L, h, L * 0.34); g.clip();
    g.fillStyle = gradH(g, h, ponta); g.beginPath(); g.rect(L * 0.16, -h, L, h * 2); g.fill();
    g.restore();
    balaPath(g, L, h, L * 0.34); traco(g, 1.5);
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = Math.max(1, h * 0.14); g.lineCap = "round";
    g.beginPath(); g.moveTo(-L * 0.38, -h * 0.26); g.lineTo(L * 0.3, -h * 0.26); g.stroke();
  }
  // língua de fogo apontando para trás (cabeça em 0,0)
  function lingua(g, s, len, w1, w2) {
    g.beginPath(); g.moveTo(0, -s);
    g.bezierCurveTo(-len * 0.4, -s * 1.15, -len * 0.75, -s * 0.45 + w1, -len, w2);
    g.bezierCurveTo(-len * 0.7, s * 0.45 + w2 * 0.3, -len * 0.4, s * 1.15, 0, s);
    g.closePath();
  }
  function chamaTras(ctx, x, len, wid, t, c1, c2, c3) {
    const f = 1 + 0.25 * Math.sin(t * 55) + 0.12 * Math.sin(t * 91);
    ctx.save(); ctx.translate(x, 0);
    [[1, c1], [0.66, c2], [0.36, c3]].forEach(function(k) {
      const L = len * f * k[0], W = wid * k[0];
      ctx.beginPath(); ctx.moveTo(0, -W / 2); ctx.quadraticCurveTo(-L * 0.5, -W * 0.6, -L, 0); ctx.quadraticCurveTo(-L * 0.5, W * 0.6, 0, W / 2); ctx.closePath();
      ctx.fillStyle = k[1]; ctx.fill();
    });
    ctx.restore();
  }
  function foguetinho(g, L, h, nariz, corpo, aleta) {
    pol(g, [-L / 2 + 1, -h / 2, -L / 2 - 3, -h / 2 - 3.5, -L / 2 + 5, -h / 2 - 3.5, -L * 0.1, -h / 2], aleta);
    pol(g, [-L / 2 + 1, h / 2, -L / 2 - 3, h / 2 + 3.5, -L / 2 + 5, h / 2 + 3.5, -L * 0.1, h / 2], aleta);
    rrPath(g, -L / 2, -h / 2, L * 0.72, h, h * 0.35); g.fillStyle = gv(g, -h / 2, h / 2, corpo); g.fill(); traco(g, 1.5);
    pol(g, [L * 0.2, -h / 2, L / 2, 0, L * 0.2, h / 2], nariz);
  }
  const VS = 1.2; // projéteis desenhados um pouco maiores que a hitbox (leitura)

  const PV = {};
  // pedra do estilingue
  PV.pedra = { dim: function(r) { return [r * 3 + 4, r * 3 + 4]; }, orient: "gira", gira: 9,
    mk: function(g, r) { pol(g, [-r, -r * 0.3, -r * 0.4, -r * 0.95, r * 0.6, -r * 0.8, r * 1.0, 0, r * 0.5, r * 0.9, -r * 0.5, r * 0.85], "#9aa1b3"); g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.ellipse(-r * 0.2, -r * 0.45, r * 0.3, r * 0.16, -0.4, 0, TAU); g.fill(); },
    tr: "#cfd6e4", rt: 0.9, rw: 0.9, ra: 0.5 };
  PV.bala = { dim: function(r) { return [r * 4 + 6, r * 2 + 6]; }, dono: true, rt: 1.6, rw: 1.5, ra: 0.9, rl: true, gl: 3.4,
    mk: function(g, r) { balaSpr(g, r * 4, r * 2, "#ffe066", "#ff9f43"); } };
  PV.bala_grande = { dim: function(r) { return [r * 4.4 + 6, r * 2.2 + 6]; }, dono: true, rt: 1.8, rw: 1.5, ra: 0.9, rl: true, gl: 3.4,
    mk: function(g, r) { balaSpr(g, r * 4.4, r * 2.2, "#ffc233", "#ff5d3a"); } };
  PV.bala_rastro = { dim: function(r) { return [r * 5.4 + 6, r * 1.6 + 6]; }, dono: true, rt: 3.2, rw: 1.5, ra: 1, rl: true, gl: 4.4, rmax: 130,
    mk: function(g, r) { balaSpr(g, r * 5.4, r * 1.6, "#e9fdff", "#7ae7ff"); } };
  PV.chumbo = { dim: function(r) { return [r * 2.6 + 4, r * 2.6 + 4]; }, orient: "fixo", rt: 1.2, rw: 1, ra: 0.45, tr: "#e6ebf5",
    mk: function(g, r) { cir(g, 0, 0, r * 1.15, "#59607a"); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(-r * 0.4, -r * 0.45, r * 0.28, 0, TAU); g.fill(); } };
  PV.plasma = { dim: function(r) { return [r * 3 + 4, r * 3 + 4]; }, orient: "fixo", gl: 4.2, glc: "#3dffa6", rt: 1.1, rw: 1.6, rl: true, ra: 0.8, tr: "#3dffa6",
    mk: function(g, r) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.25); gr.addColorStop(0, "#fff"); gr.addColorStop(0.45, "#a8ffd6"); gr.addColorStop(1, "#1fd68a"); g.beginPath(); g.arc(0, 0, r * 1.2, 0, TAU); g.fillStyle = gr; g.fill(); g.strokeStyle = "#0b6a45"; g.lineWidth = 1.4; g.stroke(); },
    live: function(ctx, p, r, t) { ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 3; i++) { const a = t * 9 + i * 2.1; ctx.globalAlpha = 0.9; ctx.drawImage(brilho("#d6fff0"), Math.cos(a) * r * 1.5 - 3, Math.sin(a) * r * 1.5 - 3, 6, 6); } } };
  PV.bola_pula = { dim: function(r) { return [r * 3 + 4, r * 3 + 4]; }, orient: "gira", gira: 8,
    mk: function(g, r) { cir(g, 0, 0, r * 1.2, "#ff5fa2"); g.save(); g.beginPath(); g.arc(0, 0, r * 1.2, 0, TAU); g.clip(); g.fillStyle = "#fff"; g.fillRect(-r * 1.4, -r * 0.28, r * 2.8, r * 0.56); g.restore(); g.beginPath(); g.arc(0, 0, r * 1.2, 0, TAU); traco(g, 1.6); g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.ellipse(-r * 0.5, -r * 0.7, r * 0.3, r * 0.18, -0.6, 0, TAU); g.fill(); },
    gl: 2.6, glc: "#ff8fc0", gla: 0.4 };
  PV.agua = { dim: function(r) { return [r * 3.6 + 4, r * 2.2 + 4]; }, rt: 1.4, rw: 1.1, ra: 0.5, tr: "#8fdcff",
    mk: function(g, r) { g.beginPath(); g.ellipse(0, 0, r * 1.45, r * 0.95, 0, 0, TAU); const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, "#b8ecff"); gr.addColorStop(0.5, "#4cb8ff"); gr.addColorStop(1, "#2a7fe0"); g.fillStyle = gr; g.fill(); g.strokeStyle = "#1c5fa8"; g.lineWidth = 1.2; g.stroke(); g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.35, r * 0.55, r * 0.22, 0, 0, TAU); g.fill(); } };
  PV.dardo = { dim: function(r) { return [r * 8 + 6, r * 3 + 6]; }, rt: 0.8, rw: 0.8, ra: 0.5, tr: "#a5f3ff",
    mk: function(g, r) { const L = r * 8; pol(g, [-L / 2, 0, -L / 2 - 2, -r * 1.3, -L / 2 + r * 2.2, -r * 0.5], "#ff5d73"); pol(g, [-L / 2, 0, -L / 2 - 2, r * 1.3, -L / 2 + r * 2.2, r * 0.5], "#ffd43b");
      g.beginPath(); g.moveTo(-L / 2 + 1, 0); g.lineTo(L / 2 - r * 1.6, 0); g.strokeStyle = TINTA; g.lineWidth = r * 0.9 + 1.6; g.lineCap = "round"; g.stroke(); g.strokeStyle = "#8bd04a"; g.lineWidth = r * 0.9; g.stroke();
      pol(g, [L / 2 - r * 2, -r * 0.85, L / 2 + 1, 0, L / 2 - r * 2, r * 0.85], "#5b6078"); } };
  PV.onda = { dim: function(r) { return [r * 3, r * 3]; }, noSprite: true, orient: "vel",
    live: function(ctx, p, r, t) {
      ctx.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        const o = (k / 3 + t * 1.4) % 1, x = -r * 0.9 + o * r * 1.5, R = r * (0.45 + 0.75 * o), al = Math.min(1, (1 - o) * 1.6);
        ctx.globalAlpha = al * 0.55; ctx.strokeStyle = TINTA; ctx.lineWidth = 7 - o * 3; ctx.beginPath(); ctx.arc(x - R * 0.4, 0, R, -0.95, 0.95); ctx.stroke();
        ctx.globalAlpha = al; ctx.strokeStyle = k % 2 ? "#e6fbff" : "#7ae7ff"; ctx.lineWidth = 4.6 - o * 3; ctx.beginPath(); ctx.arc(x - R * 0.4, 0, R, -0.95, 0.95); ctx.stroke();
      }
    }, gl: 2.2, glc: "#7ae7ff", gla: 0.35 };
  PV.shuriken = { dim: function(r) { return [r * 4.6, r * 4.6]; }, orient: "gira", gira: 24, rt: 0.9, rw: 1.2, ra: 0.35, tr: "#cfd6e4",
    mk: function(g, r) { estrelaShuri(g, r * 2.1); } };
  PV.bumerangue = { dim: function(r) { return [r * 5.6, r * 5.6]; }, orient: "gira", gira: 15,
    mk: function(g, r) { lin(g, [-r * 1.0, -r * 2.2, r * 0.7, 0, -r * 1.0, r * 2.2], r * 1.3, "#ffc233"); g.fillStyle = "#e8403a"; [[-r * 0.4, -r * 1.2], [-r * 0.4, r * 1.2], [r * 0.2, 0]].forEach(function(q) { g.beginPath(); g.arc(q[0], q[1], r * 0.26, 0, TAU); g.fill(); }); },
    rt: 0.7, rw: 1, ra: 0.3, tr: "#ffe29a" };
  PV.flecha = { dim: function(r) { return [r * 9.5 + 6, r * 3 + 6]; }, rt: 1.2, rw: 0.6, ra: 0.5, tr: "#f4f6ff",
    mk: function(g, r) { const L = r * 8.4; pol(g, [-L / 2, 0, -L / 2 - 2.5, -r * 1.3, -L / 2 + r * 2.4, -r * 0.5], "#ff5d73"); pol(g, [-L / 2, 0, -L / 2 - 2.5, r * 1.3, -L / 2 + r * 2.4, r * 0.5], "#ffffff");
      g.beginPath(); g.moveTo(-L / 2 + 1, 0); g.lineTo(L / 2 - r, 0); g.strokeStyle = TINTA; g.lineWidth = 3.2; g.lineCap = "round"; g.stroke(); g.strokeStyle = "#e0a85e"; g.lineWidth = 1.7; g.stroke();
      pol(g, [L / 2 - r * 2, -r * 0.95, L / 2 + r * 0.8, 0, L / 2 - r * 2, r * 0.95], "#d6dcea"); } };
  PV.virote = { dim: function(r) { return [r * 7 + 6, r * 3.4 + 6]; }, rt: 1.6, rw: 0.8, ra: 0.5, tr: "#ffd9a0",
    mk: function(g, r) { const L = r * 6; pol(g, [-L / 2 + 1, -r * 0.4, -L / 2 - 2, -r * 1.4, -L / 2 + r * 1.8, -r * 0.8], "#59627f"); pol(g, [-L / 2 + 1, r * 0.4, -L / 2 - 2, r * 1.4, -L / 2 + r * 1.8, r * 0.8], "#59627f");
      g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2 - r, 0); g.strokeStyle = TINTA; g.lineWidth = r * 0.95 + 1.8; g.lineCap = "round"; g.stroke(); g.strokeStyle = "#a8602b"; g.lineWidth = r * 0.95; g.stroke();
      pol(g, [L / 2 - r * 2, -r * 1.2, L / 2 + r * 0.8, 0, L / 2 - r * 2, r * 1.2], "#c6cde0"); } };
  PV.serra = { dim: function(r) { return [r * 2.6 + 4, r * 2.6 + 4]; }, orient: "gira", gira: 17,
    mk: function(g, r) { lamina(g, 0, 0, r * 1.25, 12, "#d4dcee"); g.strokeStyle = "rgba(75,84,112,.5)"; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.stroke(); cir(g, 0, 0, r * 0.32, "#e8403a"); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, r * 0.95, 3.7, 4.6); g.stroke(); },
    gl: 2.2, glc: "#bcd8ff", gla: 0.3 };
  PV.bola_neve = { dim: function(r) { return [r * 3 + 4, r * 3 + 4]; }, orient: "gira", gira: 5, rt: 1, rw: 1.2, ra: 0.35, tr: "#e6f6ff",
    mk: function(g, r) { cir(g, 0, 0, r * 1.2, "#f2faff", 0.28); g.fillStyle = "rgba(143,200,245,.6)"; g.beginPath(); g.arc(r * 0.35, r * 0.4, r * 0.7, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.arc(-r * 0.4, -r * 0.45, r * 0.34, 0, TAU); g.fill(); g.beginPath(); g.arc(0, 0, r * 1.2, 0, TAU); traco(g, 1.4); } };
  PV.gancho = { dim: function(r) { return [r * 5 + 6, r * 5 + 6]; },
    mk: function(g, r) { g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(-r * 1.4, 0); g.lineTo(0, 0); g.moveTo(0, 0); g.quadraticCurveTo(r * 1.6, 0, r * 1.5, -r * 1.7); g.moveTo(0, 0); g.quadraticCurveTo(r * 1.6, 0, r * 1.5, r * 1.7); g.moveTo(0, 0); g.lineTo(r * 1.9, 0);
      g.strokeStyle = TINTA; g.lineWidth = r * 0.9 + 2; g.stroke(); g.strokeStyle = "#d6dcea"; g.lineWidth = r * 0.9; g.stroke();
      cir(g, -r * 1.5, 0, r * 0.7, "#8892ab"); },
    pre: function(ctx, p) {
      if (p.donoX == null) return;
      ctx.save(); ctx.lineCap = "round";
      ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p.donoX, p.donoY); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.setLineDash([5, 3]); ctx.strokeStyle = "#d9b27a"; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    } };
  PV.foguete = { dim: function(r) { return [r * 6 + 14, r * 3.4 + 12]; }, rt: 2.4, rw: 1.5, ra: 0.5, tr: "#ffb36b", rl: true,
    mk: function(g, r) { foguetinho(g, r * 4.8, r * 1.9, "#ff5d73", "#f4f6ff", "#ff5d73"); cir(g, r * 0.3, 0, r * 0.45, "#7ae7ff"); },
    live: function(ctx, p, r, t) { const L = r * 4.8; chamaTras(ctx, -L / 2 - 1, r * 3.2, r * 1.4, t, "#ff6a2b", "#ffb21f", "#fff3a0"); },
    gl: 3.8, glc: "#ff9a3c", gla: 0.55, glx: -2.6 };
  PV.mini_missil = { dim: function(r) { return [r * 5 + 10, r * 3 + 10]; }, rt: 2, rw: 1.2, ra: 0.5, tr: "#ffb36b", rl: true,
    mk: function(g, r) { foguetinho(g, r * 3.6, r * 1.4, "#ff5d73", "#ffd43b", "#ff5d73"); },
    live: function(ctx, p, r, t) { chamaTras(ctx, -r * 1.8 - 1, r * 2.2, r * 1.1, t, "#ff6a2b", "#ffb21f", "#fff3a0"); },
    gl: 3, glc: "#ff9a3c", gla: 0.5, glx: -1.8 };
  PV.missil = { dim: function(r) { return [r * 7 + 16, r * 4 + 14]; }, rt: 3, rw: 1.8, ra: 0.55, tr: "#e9e4e0", rmax: 90,
    mk: function(g, r) { foguetinho(g, r * 5.4, r * 2.2, "#ff5d73", "#f4f6ff", "#4dabf7"); g.fillStyle = "#4dabf7"; g.fillRect(-r * 0.4, -r * 1.1, r * 0.7, r * 2.2); g.beginPath(); g.rect(-r * 0.4, -r * 1.1, r * 0.7, r * 2.2); g.strokeStyle = TINTA; g.lineWidth = 1; g.stroke(); cir(g, r * 0.9, 0, r * 0.5, "#7ae7ff"); },
    live: function(ctx, p, r, t) { const L = r * 5.4; chamaTras(ctx, -L / 2 - 1, r * 3.6, r * 1.6, t, "#ff6a2b", "#ffb21f", "#fff3a0");
      if (Math.sin(t * 14) > 0) { ctx.globalCompositeOperation = "lighter"; ctx.drawImage(brilho("#ff3b4e"), -r * 1.4 - 4, -4, 8, 8); } },
    gl: 4, glc: "#ff9a3c", gla: 0.5, glx: -3 };
  PV.granada = { dim: function(r) { return [r * 3.4 + 8, r * 3.8 + 8]; }, orient: "gira", gira: 5, gran: true,
    mk: function(g, r) { granadaCorpo(g, 0, r * 0.15, r * 1.05, r * 1.2, "#6aa84f"); } , blink: "#ff3b4e" };
  PV.granada_frag = { dim: function(r) { return [r * 3.6 + 8, r * 3.8 + 8]; }, orient: "gira", gira: 5, gran: true, blink: "#ffd43b",
    mk: function(g, r) { granadaCorpo(g, 0, r * 0.15, r * 1.1, r * 1.2, "#4d5568", "#ffb347"); g.save(); g.beginPath(); g.ellipse(0, r * 0.15, r * 1.1, r * 1.2, 0, 0, TAU); g.clip(); g.fillStyle = "#ffb347"; g.fillRect(-r * 1.2, -r * 0.2, r * 2.4, r * 0.5); g.restore(); g.beginPath(); g.ellipse(0, r * 0.15, r * 1.1, r * 1.2, 0, 0, TAU); traco(g); } };
  PV.granada_gelo = { dim: function(r) { return [r * 3.4 + 8, r * 3.8 + 8]; }, orient: "gira", gira: 5, gran: true, blink: "#7ae7ff", glc: "#7ae7ff",
    mk: function(g, r) { granadaCorpo(g, 0, r * 0.15, r * 1.05, r * 1.2, "#7ad3f5", "#e9f9ff"); g.strokeStyle = "#fff"; g.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const a = i * PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.7, r * 0.15 + Math.sin(a) * r * 0.7); g.lineTo(-Math.cos(a) * r * 0.7, r * 0.15 - Math.sin(a) * r * 0.7); g.stroke(); } } };
  PV.dinamite = { dim: function(r) { return [r * 4 + 12, r * 4 + 24]; }, orient: "gira", gira: 5, dina: true,
    mk: function(g, r) { const L = r * 3.4, w = r * 0.78; [-w, 0, w].forEach(function(y, i) { ret(g, -L / 2, y - w / 2, L, w, w * 0.4, i === 1 ? "#ff6a5a" : "#e8403a"); }); ret(g, -r * 0.35, -w * 1.6, r * 0.7, w * 3.2, 1, "#f7d98a"); } };
  PV.bala_canhao = { dim: function(r) { return [r * 3 + 6, r * 3 + 6]; }, orient: "fixo", rt: 1.8, rw: 1.8, ra: 0.5, tr: "#8c8fa8", rmax: 60,
    mk: function(g, r) { cir(g, 0, 0, r * 1.2, "#3b4160"); g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.5, r * 0.4, r * 0.22, -0.6, 0, TAU); g.fill(); },
    gl: 2.4, glc: "#ff7a2b", gla: 0.3 };
  PV.abelha = { dim: function(r) { return [r * 6, r * 6]; }, flip: true,
    mk: function(g, r) { ell(g, 0, 0, r * 1.5, r * 1.1, "#ffd43b"); g.save(); g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 1.1, 0, 0, TAU); g.clip(); g.fillStyle = TINTA; g.fillRect(-r * 0.5, -r * 1.2, r * 0.45, r * 2.4); g.fillRect(r * 0.3, -r * 1.2, r * 0.45, r * 2.4); g.restore();
      g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 1.1, 0, 0, TAU); traco(g, 1.4); pol(g, [-r * 1.4, 0, -r * 2.1, -r * 0.2, -r * 1.4, r * 0.3], "#3a1a0a"); cir(g, r * 1.05, -r * 0.2, r * 0.5, "#3a1a0a", 0.1); g.fillStyle = "#fff"; g.beginPath(); g.arc(r * 1.2, -r * 0.35, r * 0.18, 0, TAU); g.fill(); },
    live: function(ctx, p, r, t) { const f = Math.sin(t * 60); ctx.fillStyle = "rgba(225,247,255,.85)"; ctx.strokeStyle = "rgba(27,16,48,.7)"; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) { ctx.save(); ctx.translate(-r * 0.1, -r * 0.9); ctx.rotate((i ? -0.5 : -1.0) + f * 0.45); ctx.beginPath(); ctx.ellipse(0, -r * 0.9, r * 0.55, r * 1.05, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); } } };
  PV.bola_fogo = { dim: function(r) { return [r * 3, r * 3]; }, noSprite: true, rt: 2.6, rw: 1.4, ra: 0.6, tr: "#ff7a2b", rl: true, gl: 4.2, glc: "#ff8a2b", gla: 0.6,
    live: function(ctx, p, r, t) {
      const L = r * 3.2, w1 = Math.sin(t * 30) * r * 0.5, w2 = Math.sin(t * 23 + 1) * r * 0.5;
      lingua(ctx, r * 1.05, L, w1, w2); ctx.fillStyle = "#e8403a"; ctx.fill();
      lingua(ctx, r * 0.8, L * 0.75, w2, w1); ctx.fillStyle = "#ff9f43"; ctx.fill();
      lingua(ctx, r * 0.5, L * 0.5, w1, w2); ctx.fillStyle = "#ffd43b"; ctx.fill();
      const gr = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 1.1); gr.addColorStop(0, "#fffbe0"); gr.addColorStop(0.5, "#ffd43b"); gr.addColorStop(1, "#ff9f43");
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = "#b5300f"; ctx.stroke();
    } };
  PV.mina = { dim: function(r) { return [r * 3.6 + 4, r * 2.6 + 4]; }, orient: "fixo", mina: true,
    mk: function(g, r) { g.translate(0, r * 0.55); ell(g, 0, 0, r * 1.5, r * 0.45, "#4b5470"); g.beginPath(); g.moveTo(-r * 1.2, -r * 0.05); g.quadraticCurveTo(0, -r * 2.4, r * 1.2, -r * 0.05); g.closePath(); g.fillStyle = gv(g, -r * 1.2, 0, "#8a93ad"); g.fill(); traco(g, 1.6);
      g.fillStyle = "#ffd43b"; g.fillRect(-r * 0.7, -r * 0.4, r * 0.35, r * 0.4); g.fillRect(r * 0.35, -r * 0.4, r * 0.35, r * 0.4); g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(-r * 0.5, -r * 1.0, r * 0.4, r * 0.15, -0.6, 0, TAU); g.fill(); } };
  PV.gelo = { dim: function(r) { return [r * 6 + 6, r * 3 + 6]; }, rt: 2, rw: 1.4, ra: 0.6, tr: "#8ae8ff", rl: true, gl: 3.4, glc: "#8ae8ff", gla: 0.5,
    mk: function(g, r) { const L = r * 5.4, h = r * 2.2; pol(g, [-L / 2, 0, -L / 2 + r * 1.2, -h / 2, L * 0.15, -h * 0.38, L / 2, 0, L * 0.15, h * 0.38, -L / 2 + r * 1.2, h / 2], "#aeeaff");
      g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-L / 2 + r * 1.2, -h / 2); g.lineTo(0, 0); g.lineTo(L / 2, 0); g.moveTo(0, 0); g.lineTo(-L / 2 + r * 1.2, h / 2); g.stroke(); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(-r * 0.4, -h * 0.25, r * 0.7, r * 0.18, 0, 0, TAU); g.fill(); } };
  PV.bolha = { dim: function(r) { return [r * 2.6 + 4, r * 2.6 + 4]; }, orient: "fixo", wob: true,
    mk: function(g, r) { const gr = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.2); gr.addColorStop(0, "rgba(170,230,255,.08)"); gr.addColorStop(0.75, "rgba(190,235,255,.22)"); gr.addColorStop(1, "rgba(220,245,255,.65)"); g.beginPath(); g.arc(0, 0, r * 1.15, 0, TAU); g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(40,90,150,.75)"; g.lineWidth = 1.3; g.stroke();
      g.lineWidth = 2.2; g.lineCap = "round"; g.strokeStyle = "rgba(255,120,200,.7)"; g.beginPath(); g.arc(0, 0, r * 0.95, 0.3, 1.2); g.stroke(); g.strokeStyle = "rgba(120,255,220,.7)"; g.beginPath(); g.arc(0, 0, r * 0.95, 3.5, 4.4); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 0, r * 0.75, 3.75, 4.7); g.stroke(); g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(r * 0.45, r * 0.5, r * 0.12, 0, TAU); g.fill(); } };
  PV.buraco_negro = { dim: function(r) { return [r * 2.8, r * 2.8]; }, noSprite: true, bn: true };
  PV.chama = { noSprite: true, chama: true };
  PV.vento = { dim: function(r) { return [r * 3, r * 3]; }, vento: true };
  PV.fragmento = { dim: function(r) { return [r * 4 + 4, r * 4 + 4]; }, orient: "gira", gira: 16, rt: 1.6, rw: 1, ra: 0.5, tr: "#ffb347", rl: true, gl: 3, glc: "#ff8a2b", gla: 0.4,
    mk: function(g, r) { pol(g, [-r * 1.2, -r * 0.3, r * 0.2, -r * 1.2, r * 1.4, 0, -r * 0.2, r * 0.9], "#8f95aa"); g.fillStyle = "#ffb347"; g.beginPath(); g.moveTo(r * 0.2, -r * 1.2); g.lineTo(r * 1.4, 0); g.lineTo(r * 0.5, 0.2 * r); g.closePath(); g.fill(); } };

  // sprites de fogo (palette por vida) e buraco negro
  const FOGO = ["#fff6c0", "#ffd43b", "#ff9f2b", "#ff5a1f", "#c23a1a"];
  function hash(p) { const h = Math.sin(p.vx * 127.1 + p.vy * 311.7) * 43758.5453; return h - Math.floor(h); }
  const CONFETES = ["#ff5d73", "#ffd43b", "#4dabf7", "#51cf66", "#cc5de8", "#ff922b", "#22b8cf"];

  function espiral(g, R, c1, c2) {
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      for (let i = 0; i <= 26; i++) { const u = i / 26, a = k * TAU / 3 + u * 3.3, rr = R * (0.28 + 0.72 * u); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.lineCap = "round"; g.strokeStyle = c1; g.lineWidth = R * 0.2; g.stroke(); g.strokeStyle = c2; g.lineWidth = R * 0.08; g.stroke();
    }
  }
  const sBN = {};
  function sprBN(r) {
    const k = Math.round(r / VS);
    if (sBN[k]) return sBN[k];
    const w = r * 5.2, o = {};
    o.halo = psprite("bnH" + k, w, w, function(g) { const gr = g.createRadialGradient(0, 0, r * 0.5, 0, 0, w / 2); gr.addColorStop(0, "rgba(10,4,24,.9)"); gr.addColorStop(0.5, "rgba(30,10,60,.5)"); gr.addColorStop(1, "rgba(30,10,60,0)"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w / 2, 0, TAU); g.fill(); });
    o.esp = psprite("bnE" + k, r * 3.6, r * 3.6, function(g) { espiral(g, r * 1.75, "rgba(150,70,255,.7)", "rgba(255,170,255,.95)"); });
    o.esp2 = psprite("bnF" + k, r * 2.6, r * 2.6, function(g) { espiral(g, r * 1.25, "rgba(255,120,60,.6)", "rgba(255,230,160,.95)"); });
    return (sBN[k] = o);
  }

  function desenharProjetil(ctx, p) {
    const v = PV[p.visual] || PV.bala, r0 = p.raio || 5, r = r0 * VS, t = p.t || 0;
    const vx = p.vx || 0, vy = p.vy || 0, sp = Math.sqrt(vx * vx + vy * vy), ang = Math.atan2(vy, vx);
    if (v.pre) v.pre(ctx, p, r);
    ctx.save();
    ctx.translate(p.x, p.y);

    // casos especiais com desenho próprio
    if (v.chama) {
      const u = Math.min(1, t / 0.45), i = Math.min(4, (u * 4.2) | 0), rr = r * (0.8 + 1.7 * u);
      if (i >= 4) { ctx.globalAlpha = 0.35 * (1 - u) * 3; ctx.drawImage(brilho("#555a70"), -rr, -rr, rr * 2, rr * 2); }
      else { ctx.globalAlpha = Math.min(1, (1 - u) * 1.3 + 0.1); ctx.drawImage(brilho(FOGO[i]), -rr, -rr, rr * 2, rr * 2); ctx.drawImage(brilho(FOGO[i]), -rr * 0.6, -rr * 0.6, rr * 1.2, rr * 1.2); }
      ctx.restore(); return;
    }
    if (v.bn) {
      const s = sBN[Math.round(r0)] || sprBN(Math.round(r)), w = s.halo.w;
      ctx.drawImage(s.halo.c, -w / 2, -w / 2, w, w);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.65; ctx.drawImage(brilho("#9b4dff"), -r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
      ctx.globalAlpha = 1;
      ctx.save(); ctx.rotate(t * 4); pt(ctx, s.esp); ctx.restore();
      ctx.save(); ctx.rotate(-t * 6.5); pt(ctx, s.esp2); ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.fillStyle = "#06020f"; ctx.fill();
      ctx.strokeStyle = "rgba(255,190,255,.95)"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) { const a = t * (3 + i * 0.4) + i * 1.05, rr = r * (2.3 - ((t * 0.9 + i * 0.17) % 1) * 1.75); ctx.globalAlpha = 0.9; ctx.drawImage(brilho("#e6c8ff"), Math.cos(a) * rr - 2.2, Math.sin(a) * rr - 2.2, 4.4, 4.4); }
      ctx.restore(); return;
    }
    if (v.vento) {
      const u = Math.min(1, t / 0.5), s = 0.6 + u * 1.5, w = r * 3;
      ctx.rotate(ang); ctx.scale(s, s); ctx.globalAlpha = (1 - u) * 1;
      pt(ctx, psprite("vento" + r0, w, w, function(g) { for (let k = 0; k < 3; k++) { g.save(); g.translate(-r * 0.3, 0); g.scale(1, 0.9 - k * 0.18); crescente(g, r * (1.1 + k * 0.28), 1.0, r * 0.32 - k * 2 * 0.1, "rgba(255,255,255," + (1 - k * 0.2) + ")", true); g.restore(); } }));
      ctx.restore(); return;
    }
    if (p.visual === "confete") {
      const h = hash(p), c = CONFETES[(h * 7) | 0], f = Math.cos(t * 12 + h * 20);
      ctx.rotate(t * (6 + h * 8) + h * 6); ctx.scale(1, 0.25 + 0.75 * Math.abs(f));
      ctx.fillStyle = c; ctx.fillRect(-r * 0.9, -r * 0.65, r * 1.8, r * 1.3);
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(-r * 0.9, -r * 0.65, r * 1.8, r * 0.4);
      ctx.restore(); return;
    }
    if (v.mina) {
      const arm = !!p.armada, s = psprite("mina" + r0, r * 3.6 + 4, r * 2.6 + 4, function(g) { v.mk(g, r); });
      pt(ctx, s);
      const bl = arm ? (Math.sin(t * 16) > 0 ? 1 : 0.35) : (Math.sin(t * 4) > 0.5 ? 0.9 : 0.15), cor = arm ? "#ff3b4e" : "#ffd43b";
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = bl;
      ctx.drawImage(brilho(cor), -r * 0.45, -r * 0.95, r * 0.9, r * 0.9); ctx.globalAlpha = bl * 0.5; ctx.drawImage(brilho(cor), -r * 1.2, -r * 1.7, r * 2.4, r * 2.4);
      if (arm) { ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 8); ctx.drawImage(brilho("#ff3b4e"), -r * 3, -r * 2.8, r * 6, r * 5); }
      ctx.restore(); return;
    }

    // rastro na direção contrária à velocidade
    if (v.rt && sp > 1.5) {
      const L = Math.min(sp * v.rt * 4.2, v.rmax || 70), cor = v.dono ? (p.cor || "#ffffff") : v.tr;
      const col = v.dono ? mix(cor, "#ffe9a0", 0.5) : cor;
      ctx.rotate(ang);
      if (v.rl) ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = v.ra || 0.8;
      ctx.drawImage(rastro(col), -L, -r * v.rw / 2 - 0.5, L, r * v.rw + 1);
      ctx.rotate(-ang);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
    // brilho (modo lighter)
    if (v.gl) {
      const gc = v.dono ? (p.cor || "#ffd66b") : (v.glc || "#fff"), gr = r * v.gl * (1 + 0.06 * Math.sin(t * 22));
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = v.gla || 0.7;
      const ox = v.glx ? Math.cos(ang) * v.glx * r * 0.3 : 0, oy = v.glx ? Math.sin(ang) * v.glx * r * 0.3 : 0;
      ctx.drawImage(brilho(gc), ox - gr, oy - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
    // sprite principal
    if (v.orient === "gira") ctx.rotate(t * v.gira * (vx < 0 ? -1 : 1));
    else if (v.orient !== "fixo") { ctx.rotate(ang); if (v.flip && vx < 0) ctx.scale(1, -1); }
    if (v.wob) { const w = Math.sin(t * 9) * 0.07; ctx.scale(1 + w, 1 - w); ctx.globalAlpha = 0.95; }
    if (!v.noSprite) {
      const d = v.dim(r), s = psprite(p.visual + "|" + r0, d[0], d[1], function(g) { v.mk(g, r); });
      pt(ctx, s);
    }
    // granadas: luz piscando cada vez mais rápida + brilho vermelho final
    if (v.gran || v.dina) {
      const tm = p.timer01 || 0;
      if (v.gran) {
        const ph = Math.sin(TAU * (t * 3 + 20 * tm * tm)) > 0 ? 1 : 0.15;
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = ph * 0.9;
        ctx.drawImage(brilho(v.blink), -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
        if (tm > 0.7) { ctx.globalAlpha = (tm - 0.7) * 1.8 * (0.5 + 0.5 * Math.sin(t * 40)); ctx.drawImage(brilho("#ff3b2e"), -r * 2.6, -r * 2.6, r * 5.2, r * 5.2); }
      } else {
        // pavio que encurta + fagulha
        const fl = Math.max(2, r * 1.9 * (1 - tm)), x0 = r * 1.7, y0 = 0;
        ctx.lineCap = "round"; ctx.strokeStyle = TINTA; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + fl * 0.4, y0 - fl * 0.2, x0 + fl * 0.7, y0 - fl * 0.8); ctx.stroke();
        ctx.strokeStyle = "#c9a066"; ctx.lineWidth = 1.6; ctx.stroke();
        const fx = x0 + fl * 0.7, fy = y0 - fl * 0.8;
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9; ctx.drawImage(brilho("#ffb347"), fx - r * 1.1, fy - r * 1.1, r * 2.2, r * 2.2);
        ctx.globalAlpha = 1;
        for (let i = 0; i < 4; i++) { const a = t * 25 + i * 1.6, l = r * (0.5 + 0.3 * Math.sin(t * 37 + i)); ctx.strokeStyle = i % 2 ? "#fff6c0" : "#ffd43b"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); ctx.stroke(); }
      }
    }
    if (v.live) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; v.live(ctx, p, r, t); }
    ctx.restore();
  }

  // =========================================================
  // FEIXES (lasers e raios): camadas de traços largos -> finos em modo "lighter"
  // =========================================================
  function caminho(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }
  function camadas(ctx, pts, L) {
    caminho(ctx, pts);
    for (let i = 0; i < L.length; i++) { ctx.lineWidth = L[i][0]; ctx.strokeStyle = L[i][1]; ctx.globalAlpha = L[i][2]; ctx.stroke(); }
  }
  function comprimento(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return s; }
  // ponto a uma distância s do começo da linha quebrada (saída em buffer fixo)
  const PB = { x: 0, y: 0, ux: 1, uy: 0 };
  function pontoEm(pts, s) {
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y, l = Math.hypot(dx, dy) || 1;
      if (s <= l || i === pts.length - 1) { PB.x = pts[i - 1].x + dx / l * s; PB.y = pts[i - 1].y + dy / l * s; PB.ux = dx / l; PB.uy = dy / l; return PB; }
      s -= l;
    }
    return PB;
  }
  // caminho ondulado (seno perpendicular) ao longo da linha quebrada
  function ondaPath(ctx, pts, passo, amp, freq, fase) {
    ctx.beginPath();
    let s = 0, ini = true;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1].x, ay = pts[i - 1].y, dx = pts[i].x - ax, dy = pts[i].y - ay, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      for (let d = 0; d <= l; d += passo) {
        const o = amp * Math.sin((s + d) * freq + fase), x = ax + ux * d - uy * o, y = ay + uy * d + ux * o;
        if (ini) { ctx.moveTo(x, y); ini = false; } else ctx.lineTo(x, y);
      }
      s += l;
    }
  }
  function flares(ctx, pts, cor, r0, r1, rm, a) {
    ctx.drawImage(brilho(cor), pts[0].x - r0, pts[0].y - r0, r0 * 2, r0 * 2);
    for (let i = 1; i < pts.length - 1; i++) ctx.drawImage(brilho(cor), pts[i].x - rm, pts[i].y - rm, rm * 2, rm * 2);
    const q = pts[pts.length - 1]; ctx.drawImage(brilho(cor), q.x - r1, q.y - r1, r1 * 2, r1 * 2);
  }
  // relâmpago em zigue-zague: preenche o buffer ZZ e monta o caminho (sem alocar)
  const ZZ = new Float32Array(260);
  function zigue(ctx, pts, passo, amp, forks) {
    ctx.beginPath();
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1].x, ay = pts[i - 1].y, dx = pts[i].x - ax, dy = pts[i].y - ay, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      const n = Math.max(2, Math.min(60, Math.round(l / passo)));
      ctx.moveTo(ax, ay);
      for (let k = 1; k <= n; k++) {
        const u = k / n, env = k === n ? 0 : Math.sin(u * PI) * 0.6 + 0.4, o = (Math.random() * 2 - 1) * amp * env;
        const x = ax + dx * u - uy * o, y = ay + dy * u + ux * o;
        ctx.lineTo(x, y);
        if (forks && k > 1 && k < n && Math.random() < 0.16) {
          // galho curtinho
          const sg = Math.random() < 0.5 ? -1 : 1, bx = ux * 0.55 - uy * sg * 0.8, by = uy * 0.55 + ux * sg * 0.8, bl = amp * (1.5 + Math.random() * 2);
          ctx.moveTo(x, y); ctx.lineTo(x + bx * bl * 0.5 - by * 4 * sg, y + by * bl * 0.5 + bx * 4 * sg); ctx.lineTo(x + bx * bl, y + by * bl); ctx.moveTo(x, y);
        }
      }
    }
  }
  const ARCO = ["#ff3b3b", "#ff922b", "#ffd43b", "#51cf66", "#4dabf7", "#5c7cfa", "#cc5de8"];

  function desenharFeixe(ctx, pts, visual, vida01, cor) {
    if (!pts || pts.length < 2) return;
    const v = Math.max(0, Math.min(1, vida01 == null ? 1 : vida01)), f = 0.35 + 0.65 * v, tt = relogio();
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter";
    if (visual === "railgun") {
      camadas(ctx, pts, [[30 * f, "#2a8fff", 0.3 * v], [13 * f, "#a8f0ff", 0.9 * v], [5 * f, "#ffffff", 1]]);
      // espiral em volta do feixe
      ctx.globalAlpha = v; ctx.strokeStyle = "#e9fdff"; ctx.lineWidth = 2.4 * f;
      const ph = (1 - v) * 40 + tt * 6;
      ondaPath(ctx, pts, 6, 9 * f, 0.2, ph); ctx.stroke();
      ctx.strokeStyle = "#7ae7ff"; ondaPath(ctx, pts, 6, 9 * f, 0.2, ph + PI); ctx.stroke();
      // anéis de choque ao longo do feixe
      const L = comprimento(pts);
      for (let s = ((1 - v) * 220) % 110; s < L; s += 110) {
        const q = pontoEm(pts, s); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.atan2(q.uy, q.ux)); ctx.globalAlpha = 0.5 * v; ctx.strokeStyle = "#bff3ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 4, 15 * f, 0, 0, TAU); ctx.stroke(); ctx.restore();
      }
      ctx.globalAlpha = v; flares(ctx, pts, "#6ad2ff", 38 * f, 46 * f, 24, 1);
    } else if (visual === "arco_iris") {
      const bw = 3.4 * f, n = pts.length;
      camadas(ctx, pts, [[7 * bw + 20, "#ff9ae8", 0.14 * v], [7 * bw + 8, "#ffe6fb", 0.16 * v]]);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = Math.min(1, v * 1.4);
      for (let i = 1; i < n; i++) {
        const ax = pts[i - 1].x, ay = pts[i - 1].y, bx = pts[i].x, by = pts[i].y, l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l, ny = (bx - ax) / l;
        ctx.lineCap = "butt";
        for (let k = 0; k < 7; k++) { const o = (k - 3) * bw; ctx.strokeStyle = ARCO[k]; ctx.lineWidth = bw + 0.9; ctx.beginPath(); ctx.moveTo(ax + nx * o, ay + ny * o); ctx.lineTo(bx + nx * o, by + ny * o); ctx.stroke(); }
      }
      ctx.lineCap = "round"; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 * v; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4; caminho(ctx, pts); ctx.stroke();
      // estrelinhas correndo
      const L = comprimento(pts);
      for (let j = 0; j < 9; j++) { const q = pontoEm(pts, (j * 131.7 + (1 - v) * 260) % L), w = 7 + (j % 3) * 3; ctx.globalAlpha = v; ctx.drawImage(brilho(ARCO[j % 7]), q.x - w, q.y - w + Math.sin(j * 3 + tt * 8) * 4, w * 2, w * 2); }
      ctx.globalAlpha = v; flares(ctx, pts, "#ffe6fb", 24 * f, 30 * f, 18, 1);
    } else if (visual === "feixe") {
      const ph = tt * 16;
      ctx.globalAlpha = 1;
      ondaPath(ctx, pts, 8, 4.5, 0.045, ph);
      ctx.lineWidth = 14 * f; ctx.strokeStyle = "#a24dff"; ctx.globalAlpha = 0.45 * v; ctx.stroke();
      ctx.lineWidth = 6 * f; ctx.strokeStyle = "#ff7ad9"; ctx.globalAlpha = 0.9 * v; ctx.stroke();
      ctx.lineWidth = 2.4 * f; ctx.strokeStyle = "#ffffff"; ctx.globalAlpha = v; ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = "#ffd6f6"; ondaPath(ctx, pts, 8, 7, 0.07, -ph * 1.4); ctx.globalAlpha = 0.8 * v; ctx.stroke();
      const L = comprimento(pts);
      for (let j = 0; j < 8; j++) { const q = pontoEm(pts, (j * 71 + tt * 260) % L); ctx.globalAlpha = v; ctx.drawImage(brilho("#ffb3ee"), q.x - 7, q.y - 7 + Math.sin(j + tt * 9) * 5, 14, 14); }
      ctx.globalAlpha = (0.8 + 0.2 * Math.sin(tt * 30)) * v; flares(ctx, pts, "#d36bff", 34 * f, 36 * f, 16, 1);
    } else if (visual === "raio") {
      const fl = 0.75 + Math.random() * 0.25;
      zigue(ctx, pts, 20, 11, true);
      ctx.lineWidth = 8 * f; ctx.strokeStyle = "#4aa8ff"; ctx.globalAlpha = 0.8 * v * fl; ctx.stroke();
      ctx.lineWidth = 2.8 * f; ctx.strokeStyle = "#ffffff"; ctx.globalAlpha = v; ctx.stroke();
      ctx.globalAlpha = v * fl; flares(ctx, pts, "#7ae0ff", 26 * f, 30 * f, 18, 1);
    } else if (visual === "relampago") {
      const a = pts[0], b = pts[pts.length - 1], len = Math.hypot(b.x - a.x, b.y - a.y), fl = 0.8 + Math.random() * 0.2;
      // coluna de luz suave
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) - PI / 2);
      ctx.globalAlpha = 0.5 * v; ctx.drawImage(brilho("#b79cff"), -30 * f, -len * 0.04, 60 * f, len * 1.08); ctx.restore();
      zigue(ctx, pts, 26, 20, true);
      ctx.lineWidth = 22 * f; ctx.strokeStyle = "#8f68ff"; ctx.globalAlpha = 0.4 * v * fl; ctx.stroke();
      ctx.lineWidth = 10 * f; ctx.strokeStyle = "#cdb8ff"; ctx.globalAlpha = 0.6 * v * fl; ctx.stroke();
      ctx.lineWidth = 7 * f; ctx.strokeStyle = "#fff3a8"; ctx.globalAlpha = 0.95 * v; ctx.stroke();
      ctx.lineWidth = 3 * f; ctx.strokeStyle = "#fff"; ctx.globalAlpha = v; ctx.stroke();
      ctx.globalAlpha = v; flares(ctx, pts, "#e0d0ff", 40 * f, 78 * f, 20, 1);
    } else { // laser (vermelho) e qualquer outro
      camadas(ctx, pts, [[22 * f, "#ff1f3a", 0.2 * v], [11 * f, "#ff3b4e", 0.5 * v], [5.2 * f, "#ff9aa5", 0.95 * v], [2.2 * f, "#ffffff", 1]]);
      ctx.globalAlpha = v; flares(ctx, pts, "#ff4d5e", 16 * f, 24 * f, 14, 1);
    }
    ctx.restore();
  }

  // =========================================================
  // AVISOS DO CÉU + METEORO CAINDO
  // =========================================================
  function desenharAviso(ctx, x, y, raio, prog, visual) {
    const p = Math.max(0, Math.min(1, prog)), tt = relogio();
    const ry = raio * 0.34, pul = 0.5 + 0.5 * Math.sin(tt * (8 + p * 18));
    ctx.save(); ctx.translate(x, y);
    const rel = visual === "relampago";
    const c1 = rel ? "#ffe066" : "#ff4d3a", c2 = rel ? "#fff8c9" : "#ffb199";
    // sombra que cresce no chão
    const k = 0.2 + 0.8 * p;
    ctx.fillStyle = rel ? "rgba(40,20,90,0.35)" : "rgba(60,5,5,0.4)";
    ctx.globalAlpha = 0.5 + 0.5 * p; ctx.beginPath(); ctx.ellipse(0, 0, raio * k, ry * k, 0, 0, TAU); ctx.fill();
    // anel externo tracejado girando
    ctx.globalAlpha = 0.55 + 0.45 * pul; ctx.lineCap = "round";
    ctx.setLineDash([10, 7]); ctx.lineDashOffset = -tt * 30;
    ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, raio, ry, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = c1; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
    // anel que fecha
    ctx.globalAlpha = 1; ctx.strokeStyle = TINTA; ctx.lineWidth = 5.5; const rr = raio * (1 - 0.7 * p);
    ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.34, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = c2; ctx.lineWidth = 2.6; ctx.stroke();
    // mira
    ctx.strokeStyle = c1; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-raio * 1.15, 0); ctx.lineTo(-raio * 0.55, 0); ctx.moveTo(raio * 0.55, 0); ctx.lineTo(raio * 1.15, 0); ctx.moveTo(0, -ry * 1.5); ctx.lineTo(0, -ry * 0.7); ctx.moveTo(0, ry * 0.7); ctx.lineTo(0, ry * 1.5); ctx.stroke();
    // símbolo de alerta piscando acima
    ctx.globalAlpha = 0.6 + 0.4 * pul; const s = 1 + 0.18 * pul;
    ctx.translate(0, -raio * 0.55 - 14); ctx.scale(s, s);
    if (rel) {
      pol(ctx, [3, -12, -7, 2, -1, 2, -4, 12, 7, -3, 1, -3, 5, -12], "#ffd43b");
    } else {
      pol(ctx, [0, -13, 13, 10, -13, 10], "#ff4d3a");
      ctx.fillStyle = "#fff"; ctx.fillRect(-1.6, -5, 3.2, 8); ctx.beginPath(); ctx.arc(0, 6.2, 1.9, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function rochaMeteoro(g, R) {
    pol(g, [-R * 0.9, -R * 0.3, -R * 0.45, -R * 0.95, R * 0.35, -R * 1.0, R * 0.95, -R * 0.35, R * 0.9, R * 0.4, R * 0.3, R * 1.0, -R * 0.5, R * 0.9], "#6e4a3c");
    g.strokeStyle = "#ffb21f"; g.lineWidth = R * 0.12; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(-R * 0.6, -R * 0.4); g.lineTo(-R * 0.1, -R * 0.05); g.lineTo(-R * 0.25, R * 0.5); g.moveTo(-R * 0.1, -R * 0.05); g.lineTo(R * 0.55, -R * 0.2); g.lineTo(R * 0.6, R * 0.35); g.stroke();
    g.strokeStyle = "#fff3a0"; g.lineWidth = R * 0.04; g.stroke();
    g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.ellipse(-R * 0.3, -R * 0.65, R * 0.3, R * 0.12, -0.4, 0, TAU); g.fill();
    g.fillStyle = "rgba(40,20,20,.35)"; g.beginPath(); g.arc(R * 0.3, R * 0.35, R * 0.16, 0, TAU); g.fill(); g.beginPath(); g.arc(-R * 0.5, R * 0.3, R * 0.1, 0, TAU); g.fill();
  }
  // meteoro caindo em (x,y); ang = direção da queda (padrão: para baixo)
  function desenharMeteoro(ctx, x, y, prog, ang) {
    const a = ang == null ? PI / 2 : ang, tt = relogio(), R = 19;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.globalCompositeOperation = "lighter";
    // rastro de fogo (aponta para trás, -x local)
    ctx.globalAlpha = 0.85; ctx.drawImage(rastro("#ff6a2b"), -150, -R * 1.2, 150, R * 2.4);
    ctx.globalAlpha = 0.9; ctx.drawImage(rastro("#ffd43b"), -95, -R * 0.7, 95, R * 1.4);
    for (let i = 0; i < 6; i++) { const d = 14 + i * 20, rr = R * (1.5 - i * 0.14), w = Math.sin(tt * 25 + i * 1.7) * 5; ctx.globalAlpha = 0.7 - i * 0.08; ctx.drawImage(brilho(i < 2 ? "#ffd43b" : "#ff7a2b"), -d - rr, w - rr, rr * 2, rr * 2); }
    ctx.drawImage(brilho("#ff8a2b"), -R * 2.8, -R * 2.8, R * 5.6, R * 5.6);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    // línguas de fogo coladas na pedra
    const w1 = Math.sin(tt * 28) * 6, w2 = Math.sin(tt * 21 + 1) * 6;
    ctx.save(); ctx.translate(-R * 0.4, 0);
    lingua(ctx, R * 1.05, R * 3.2, w1, w2); ctx.fillStyle = "#e8403a"; ctx.fill();
    lingua(ctx, R * 0.8, R * 2.4, w2, w1); ctx.fillStyle = "#ff9f43"; ctx.fill();
    lingua(ctx, R * 0.5, R * 1.6, w1, w2); ctx.fillStyle = "#ffd43b"; ctx.fill();
    ctx.restore();
    ctx.rotate(-a + tt * 1.2);
    pt(ctx, psprite("rochaM", R * 2.8, R * 2.8, function(g) { rochaMeteoro(g, R); }));
    ctx.restore();
  }

  // =========================================================
  // CAIXAS DE ARMA (por raridade) + paraquedas + selo com o ícone da arma
  // =========================================================
  const RAR = {
    1: { corpo: "#4f86d6", fita: "#e8f1ff", brilho: "#8fc4ff", a: 0.35, r: 40, selo: "#7ab8ff" },
    2: { corpo: "#8a4de0", fita: "#e6d0ff", brilho: "#c07bff", a: 0.5, r: 48, selo: "#c58bff" },
    3: { corpo: "#ffb81f", fita: "#8a4b2b", brilho: "#ffd43b", a: 0.7, r: 60, selo: "#ffd43b" }
  };
  function caixaSpr(rar) {
    const R = RAR[rar] || RAR[1];
    return psprite("caixa" + rar, 52, 52, function(g) {
      g.translate(0, 0);
      // corpo
      rrPath(g, -19, -19, 38, 38, 6); g.fillStyle = gv(g, -19, 19, R.corpo); g.fill(); traco(g, 3);
      // tampa
      ret(g, -21, -21, 42, 12, 4, mix(R.corpo, "#ffffff", 0.2));
      // fitas
      g.save(); rrPath(g, -19, -19, 38, 38, 6); g.clip();
      g.fillStyle = R.fita; g.fillRect(-4.5, -22, 9, 44);
      g.fillStyle = "rgba(27,16,48,.18)"; g.fillRect(2, -22, 2.5, 44);
      g.restore();
      g.strokeStyle = TINTA; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4.5, -9); g.lineTo(-4.5, 19); g.moveTo(4.5, -9); g.lineTo(4.5, 19); g.stroke();
      // laço/placa central
      cir(g, 0, -6, 5, rar === 3 ? "#ff5d73" : (rar === 2 ? "#ffd43b" : "#ffffff"));
      // parafusos
      [[-14, -2], [14, -2], [-14, 13], [14, 13]].forEach(function(p) { cir(g, p[0], p[1], 2, "#f4f6ff", 0.2); });
      g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(-12, 6, 2.5, 6, 0, 0, TAU); g.fill();
      if (rar === 3) { cintila(g, 13, -14, 3.6); }
    });
  }
  function seloSpr(rar) {
    const R = RAR[rar] || RAR[1];
    return psprite("selo" + rar, 44, 44, function(g) {
      g.beginPath(); g.arc(0, 0, 19, 0, TAU); const gr = g.createLinearGradient(0, -19, 0, 19); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, claro(R.selo, 0.45)); g.fillStyle = gr; g.fill();
      g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.strokeStyle = TINTA; g.lineWidth = 3.4; g.stroke();
      g.beginPath(); g.arc(0, 0, 17.4, 0, TAU); g.strokeStyle = R.selo; g.lineWidth = 2.2; g.stroke();
      
    });
  }
  function raiosSpr() {
    return psprite("raios", 128, 128, function(g) {
      for (let i = 0; i < 12; i++) {
        g.save(); g.rotate(i * TAU / 12);
        const gr = g.createLinearGradient(0, 0, 62, 0); gr.addColorStop(0, "rgba(255,240,150,.9)"); gr.addColorStop(1, "rgba(255,210,60,0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(6, -2.5); g.lineTo(62, -(i % 2 ? 4 : 8)); g.lineTo(62, i % 2 ? 4 : 8); g.lineTo(6, 2.5); g.closePath(); g.fill();
        g.restore();
      }
    });
  }
  function paraSpr() {
    return psprite("para", 76, 44, function(g) {
      g.translate(0, 8);
      const n = 5, W = 34, H = 26;
      for (let i = 0; i < n; i++) {
        const a0 = PI + i * PI / n, a1 = a0 + PI / n;
        g.beginPath(); g.moveTo(0, 10); g.ellipse(0, 10, W, H, 0, a0, a1); g.closePath();
        g.fillStyle = i % 2 ? "#ffffff" : "#ff5d73"; g.fill(); g.strokeStyle = TINTA; g.lineWidth = 2; g.lineJoin = "round"; g.stroke();
      }
      g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(-14, -10, 8, 3, -0.5, 0, TAU); g.fill();
    });
  }

  function desenharCaixa(ctx, c) {
    const rar = c.raridade === 3 ? 3 : c.raridade === 2 ? 2 : 1, R = RAR[rar], t = c.t || 0;
    ctx.save(); ctx.translate(c.x, c.y);
    const queda = !!c.paraquedas;
    if (queda) ctx.rotate(Math.sin(t * 3) * 0.06);
    // sombra no chão
    if (!queda) { ctx.fillStyle = "rgba(10,5,30,.28)"; ctx.beginPath(); ctx.ellipse(0, 20, 22, 5, 0, 0, TAU); ctx.fill(); }
    // brilho atrás (modo lighter)
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = R.a * (0.8 + 0.2 * Math.sin(t * 4)); ctx.drawImage(brilho(R.brilho), -R.r, -R.r - 8, R.r * 2, R.r * 2);
    if (rar === 3) {
      ctx.save(); ctx.translate(0, -4); ctx.rotate(t * 0.7); ctx.globalAlpha = 0.65; ctx.drawImage(raiosSpr().c, -66, -66, 132, 132); ctx.restore();
    }
    ctx.restore();
    // paraquedas
    if (queda) {
      ctx.strokeStyle = TINTA; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(-34, -88); ctx.lineTo(-17, -20); ctx.moveTo(-17, -92); ctx.lineTo(-6, -20); ctx.moveTo(17, -92); ctx.lineTo(6, -20); ctx.moveTo(34, -88); ctx.lineTo(17, -20); ctx.stroke();
      ctx.strokeStyle = "#f4f6ff"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.save(); ctx.translate(0, -100); pt(ctx, paraSpr()); ctx.restore();
    }
    pt(ctx, caixaSpr(rar));
    // selo com o ícone da arma flutuando
    const by = -46 + Math.sin(t * 3) * 3;
    ctx.save(); ctx.translate(0, by);
    if (rar > 1) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6); ctx.drawImage(brilho(R.brilho), -26, -26, 52, 52); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; }
    pt(ctx, seloSpr(rar));
    icone(ctx, c.idArma, 0, 0, 27);
    ctx.restore();
    // faíscas das raras e lendárias
    if (rar > 1) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < (rar === 3 ? 4 : 2); i++) {
        const a = t * 1.6 + i * 1.7, ph = (t * 0.9 + i * 0.27) % 1;
        ctx.globalAlpha = Math.sin(ph * PI);
        ctx.drawImage(brilho("#ffffff"), Math.cos(a) * 26 - 5, -8 + Math.sin(a * 1.3) * 22 - 5, 10, 10);
      }
    }
    ctx.restore();
  }

  // pré-aquece todos os caches (opcional, chame no carregamento para evitar travadinha na 1ª vez)
  function aquecer() {
    Object.keys(A).forEach(function(id) { spriteMao(id); spriteIcone(id); });
    [1, 2, 3].forEach(function(r) { caixaSpr(r); seloSpr(r); });
    raiosSpr(); paraSpr();
    Object.keys(A).forEach(function(id) { brilho("#ffffff"); });
  }

  return {
    desenharNaMao: desenharNaMao,
    desenharProjetil: desenharProjetil,
    desenharFeixe: desenharFeixe,
    desenharAviso: desenharAviso,
    desenharMeteoro: desenharMeteoro,
    icone: icone,
    desenharCaixa: desenharCaixa,
    pontaDoCano: pontaDoCano,
    aquecer: aquecer
  };
})();
