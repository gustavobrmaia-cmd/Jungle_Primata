"use strict";

// =========================
// MOTOR DE PIXEL ART (chefes e objetos)
// Desenha formas "volumétricas" em pixels lógicos: cada forma é sombreada por uma luz vinda do canto
// superior esquerdo e vira 3-5 tons de uma rampa de cor, com contorno limpo. Depois a grade vira um canvas.
// Carregado antes de arte.js (que só chama os construtores daqui).
// =========================

// Rampas de cor: do mais escuro ao mais claro
function rampaDe(base, n) {
  const r = [];
  const tons = n === 5 ? [-0.6, -0.32, 0, 0.24, 0.5] : n === 3 ? [-0.5, 0, 0.45] : [-0.55, -0.25, 0.05, 0.45];
  tons.forEach(function(k) { r.push(k < 0 ? escurecer(base, -k) : clarear(base, k)); });
  return r;
}

const PX_LUZ = (function() {
  const x = -0.55, y = -0.62, z = 0.56;
  const n = Math.sqrt(x * x + y * y + z * z);
  return [x / n, y / n, z / n];
})();
const PX_BAYER = [[0, 2], [3, 1]];
// Limiares de luz para escolher o tom (n tons => n-1 limiares)
const PX_LIMIARES = { 3: [0.05, 0.62], 4: [-0.15, 0.3, 0.75], 5: [-0.3, 0.12, 0.58, 0.88] };

function pxHash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
}

function pxNovo(w, h) {
  return { w: w, h: h, d: new Array(w * h).fill(null) };
}

function pxPonto(b, x, y, cor) {
  x = Math.floor(x); y = Math.floor(y);
  if (cor && x >= 0 && y >= 0 && x < b.w && y < b.h) b.d[y * b.w + x] = cor;
}

function pxLeitura(b, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null;
  return b.d[y * b.w + x];
}

function pxRet(b, x, y, w, h, cor) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pxPonto(b, x + i, y + j, cor);
}

function pxLinha(b, x1, y1, x2, y2, cor) {
  x1 = Math.round(x1); y1 = Math.round(y1); x2 = Math.round(x2); y2 = Math.round(y2);
  const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= n; i++) pxPonto(b, x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, cor);
}

// Escolhe o tom da rampa pela luz (l entre -1 e 1), com pontilhado leve entre os tons
function pxTom(l, n, x, y, pont) {
  if (pont) l += (PX_BAYER[y & 1][x & 1] / 4 - 0.375) * pont;
  const lim = PX_LIMIARES[n];
  let i = 0;
  while (i < n - 1 && l > lim[i]) i++;
  return i;
}

// Pinta uma forma: teste(x, y) devolve null (fora) ou a normal {nx, ny, nz}
// o: rim (cor do contorno interno), rimClaro (contorno nas bordas voltadas pra luz), pont (pontilhado),
//    tex(lx, ly, idx) => idx (textura), ox/oy (origem para a textura), luz (soma na luz)
function pxForma(b, x0, y0, x1, y1, teste, rampa, o) {
  o = o || {};
  const n = rampa.length;
  const pont = o.pont === undefined ? 0 : o.pont;
  const ox = o.ox || 0;
  const oy = o.oy || 0;
  const mudas = [];
  const dentro = {};
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const nm = teste(x + 0.5, y + 0.5);
      if (!nm) continue;
      mudas.push([x, y, nm]);
      dentro[x + "," + y] = 1;
    }
  }
  const rimEscuro = o.rim === undefined ? rampa[0] : o.rim;
  mudas.forEach(function(m) {
    const x = m[0], y = m[1], nm = m[2];
    const borda = !dentro[(x - 1) + "," + y] || !dentro[(x + 1) + "," + y] || !dentro[x + "," + (y - 1)] || !dentro[x + "," + (y + 1)];
    if (borda && rimEscuro) {
      const luzBorda = nm.nx + nm.ny < -0.3;
      pxPonto(b, x, y, luzBorda && o.rimClaro ? o.rimClaro : rimEscuro);
      return;
    }
    let l = nm.nx * PX_LUZ[0] + nm.ny * PX_LUZ[1] + nm.nz * PX_LUZ[2];
    if (o.luz) l += o.luz;
    let i = pxTom(l, n, x, y, pont);
    if (o.tex) i = limitar(o.tex(x - ox, y - oy, i), 0, n - 1);
    pxPonto(b, x, y, rampa[i]);
  });
}

// Elipsoide (rx, ry), com rotação opcional (o.ang em radianos)
function pxElipse(b, cx, cy, rx, ry, rampa, o) {
  o = o || {};
  const ang = o.ang || 0;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const m = Math.max(rx, ry) + 2;
  o.ox = o.ox === undefined ? Math.round(cx) : o.ox;
  o.oy = o.oy === undefined ? Math.round(cy) : o.oy;
  pxForma(b, cx - m, cy - m, cx + m, cy + m, function(x, y) {
    const dx = x - cx, dy = y - cy;
    const u = (dx * ca + dy * sa) / rx;
    const v = (-dx * sa + dy * ca) / ry;
    const d2 = u * u + v * v;
    if (d2 > 1) return null;
    const nz = Math.sqrt(1 - d2);
    // normal de volta ao espaço da tela
    return { nx: u * ca - v * sa, ny: u * sa + v * ca, nz: nz };
  }, rampa, o);
}

// Membro / cápsula afunilada de (x1,y1) até (x2,y2), com raios r1 e r2
function pxMembro(b, x1, y1, x2, y2, r1, r2, rampa, o) {
  o = o || {};
  const vx = x2 - x1, vy = y2 - y1;
  const L2 = Math.max(0.0001, vx * vx + vy * vy);
  const m = Math.max(r1, r2) + 2;
  o.ox = o.ox === undefined ? Math.round(x1) : o.ox;
  o.oy = o.oy === undefined ? Math.round(y1) : o.oy;
  pxForma(b, Math.min(x1, x2) - m, Math.min(y1, y2) - m, Math.max(x1, x2) + m, Math.max(y1, y2) + m, function(x, y) {
    let t = ((x - x1) * vx + (y - y1) * vy) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = x1 + vx * t, cy = y1 + vy * t;
    const r = r1 + (r2 - r1) * t;
    const dx = x - cx, dy = y - cy;
    const d2 = (dx * dx + dy * dy) / (r * r);
    if (d2 > 1) return null;
    const dd = Math.sqrt(d2);
    return { nx: dd ? dx / r : 0, ny: dd ? dy / r : 0, nz: Math.sqrt(1 - d2) };
  }, rampa, o);
}

// Polígono com gradiente suave na direção da luz (chifres, asas, coroas, espinhos)
function pxPoligono(b, pts, rampa, o) {
  o = o || {};
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(function(p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const raio = Math.max(x1 - x0, y1 - y0) / 2 + 0.01;
  const curva = o.curva === undefined ? 0.8 : o.curva;
  o.ox = o.ox === undefined ? Math.round(x0) : o.ox;
  o.oy = o.oy === undefined ? Math.round(y0) : o.oy;
  pxForma(b, x0 - 1, y0 - 1, x1 + 1, y1 + 1, function(x, y) {
    let dentro = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    if (!dentro) return null;
    // "normal" inclinada em direção à luz conforme a posição dentro da forma
    const gx = ((x - cx) / raio) * curva;
    const gy = ((y - cy) / raio) * curva;
    return { nx: gx, ny: gy, nz: Math.sqrt(Math.max(0.05, 1 - gx * gx - gy * gy)) };
  }, rampa, o);
}

// Contorno externo (pixels vazios colados na silhueta) — cor fixa ou função (cor do vizinho) => cor
function pxContorno(b, cor) {
  const novos = [];
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (b.d[y * b.w + x]) continue;
      const viz = [pxLeitura(b, x - 1, y), pxLeitura(b, x + 1, y), pxLeitura(b, x, y - 1), pxLeitura(b, x, y + 1)];
      let c = null;
      for (let i = 0; i < 4; i++) if (viz[i]) { c = viz[i]; break; }
      if (c) novos.push([x, y, typeof cor === "function" ? cor(c) : cor]);
    }
  }
  novos.forEach(function(n) { b.d[n[1] * b.w + n[0]] = n[2]; });
}

// Fiapos: pixels colados na silhueta que "desfiam" a borda (pelo, chamas, espinhos). Use antes do contorno.
function pxFiapos(b, dens, sem, so, cores) {
  const novos = [];
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (b.d[y * b.w + x]) continue;
      if (so === "cima" && !pxLeitura(b, x, y + 1)) continue;
      const viz = [pxLeitura(b, x - 1, y), pxLeitura(b, x + 1, y), pxLeitura(b, x, y - 1), pxLeitura(b, x, y + 1)];
      let c = null;
      for (let i = 0; i < 4; i++) if (viz[i]) { c = viz[i]; break; }
      if (c && (!cores || cores.indexOf(c) >= 0) && pxHash(x, y, sem) < dens) novos.push([x, y, c]);
    }
  }
  novos.forEach(function(n) { b.d[n[1] * b.w + n[0]] = n[2]; });
}

// Grade -> canvas (cada pixel lógico vira esc x esc pixels)
function pxCanvas(b, esc) {
  const c = criarCanvas(b.w * esc, b.h * esc);
  const g = c.getContext("2d");
  for (let y = 0; y < b.h; y++) {
    let x = 0;
    while (x < b.w) {
      const cor = b.d[y * b.w + x];
      let fim = x + 1;
      while (fim < b.w && b.d[y * b.w + fim] === cor) fim++;
      if (cor) {
        g.fillStyle = cor;
        g.fillRect(x * esc, y * esc, (fim - x) * esc, esc);
      }
      x = fim;
    }
  }
  return c;
}

// Sprite com versão virada pra esquerda e silhuetas brancas (piscar de dano)
function pxSprite(c) {
  const e = espelhar(c);
  return { d: c, e: e, w: c.width, h: c.height, flashD: silhueta(c), flashE: silhueta(e) };
}

// Textura de pelo: pontinhos mais escuros/claros espalhados
function pxTexPelo(sem, dens) {
  dens = dens || 0.12;
  return function(x, y, i) {
    const h = pxHash(x, y >> 1, sem);
    if (h < dens) return i - 1;
    if (h > 1 - dens * 0.5) return i + 1;
    return i;
  };
}
