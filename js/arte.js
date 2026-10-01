"use strict";

// =========================
// ARTE EM PIXEL (tudo é desenhado uma vez só em canvas escondidos)
// =========================

// ---------- MACACO (grade 20x20, cada pixel vira 4x4 = 80x80) ----------
// D contorno, F pelo, S pelo na sombra, L pelo com luz, P pele, R bochecha, B barriga, W/E olho, M boca

const CORPO = [
  "....................",
  "....................",
  "....................",
  ".......DDDDDD.......",
  ".....DDLLFFFFDD.....",
  "....DFLLFFFFFFSD....",
  ".DD.DFLFFFFFFFSD.DD.",
  "DPPDFFPPPPPPPPFSDPPD",
  "DPPDFPWEPPPPWEPFDPPD",
  ".DDDFPWEPPPPWEPSDDD.",
  "...DFPRPPPPPPRPSD...",
  "....DFPPMMMMPPSD....",
  ".....DFPPPPPPSD.....",
  "......DDDDDDDD......",
  ".....DFFBBBBFSD.....",
  "....DFFBBBBBBFSD..D.",
  "...DPDFBBBBBBSDPD..D",
  "...DPDFFBBBBFSDPD..D",
  ".....DFFFFFFSSDDDDD.",
  ".....DPPD..DPPD....."
];

// Cada pose troca algumas linhas do corpo
const BRACOS_CIMA = {
  11: "..P.DFPPMMMMPPSD.P..",
  12: "..D..DFPPPPPPSD..D..",
  13: "..DD..DDDDDDDD..DD..",
  14: "...DDDFFBBBBFSDDD...",
  15: "....DFFBBBBBBFSD..D.",
  16: "....DFBBBBBBBBSD...D",
  17: ".....DFFBBBBFSD....D"
};

const POSES = {
  parado: {},
  piscar: { 8: "DPPDFPPPPPPPPPPFDPPD", 9: ".DDDFPDDPPPPDDPSDDD." },
  andar1: { 19: "....DPPD....DPPD...." },
  andar2: { 19: "......DPPDDPPD......" },
  pulo: {
    13: "..PD..DDDDDDDD..DP..",
    14: "...DDDFFBBBBFSDDD...",
    15: "....DFFBBBBBBFSD..D.",
    16: "....DFBBBBBBBBSD...D",
    17: ".....DFFBBBBFSD....D",
    18: "....DPPFFFFFSPPDDDD.",
    19: "...................."
  },
  queda: BRACOS_CIMA,
  vitoria: Object.assign({}, BRACOS_CIMA, { 11: "..P.DFPMMMMMMPSD.P.." }),
  pendurado: {
    1: "...PP..........PP...",
    2: "...DF..........FD...",
    3: "...DF..DDDDDD..FD...",
    4: "...DFDDLLFFFFDDFD...",
    5: "...DFFFFFFFFFFFSD...",
    6: "..DDFFFFFFFFFFFSDD..",
    7: "..DDFFPPPPPPPPFSDD..",
    8: "...DFPWEPPPPWEPFD...",
    9: "...DFPWEPPPPWEPSD...",
    15: ".....DFBBBBBBSD...D.",
    16: ".....DFBBBBBBSD....D",
    17: ".....DFFBBBBFSD....D"
  },
  chute: {
    16: "...DPDFBBBBBBSDPD...",
    17: "...DPDFFBBBBFSDDDDD.",
    18: ".....DFFFFFFSSFFFPPD",
    19: ".....DPPD..........."
  },
  tiro: {
    15: "....DFFBBBBBBFSDDDD.",
    16: "...DPDFBBBBBBSFFFPPD",
    17: "...DPDFFBBBBFSDDDD.."
  }
};

const MAPAS_POSE = {};
Object.keys(POSES).forEach(function(nome) {
  const m = CORPO.slice();
  const mod = POSES[nome];
  Object.keys(mod).forEach(function(k) { m[+k] = mod[k]; });
  MAPAS_POSE[nome] = m;
});

const imgPersonagem = new Image();
let personagemOk = false;

// Cores da skin, com sombra/luz do pelo calculadas sozinhas
function paletaSkin(skin, corPelo) {
  const p = Object.assign({}, CORES_BASE, skin.cores);
  if (corPelo) p.F = corPelo;
  p.S = !corPelo && skin.cores.S ? skin.cores.S : escurecer(p.F, 0.25);
  p.L = !corPelo && skin.cores.L ? skin.cores.L : clarear(p.F, 0.22);
  if (!p.R) p.R = "rgba(255,105,120,0.4)";
  return p;
}

function desenharPrimata(g, equip, escala, pose) {
  const tam = 20 * escala;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, tam, tam);

  const skin = buscarItem("skin", equip.skin) || SKINS[0];

  if (skin.imagem && personagemOk) {
    // Sua imagem, encaixada no quadrado sem esticar
    const s = Math.min(tam / imgPersonagem.naturalWidth, tam / imgPersonagem.naturalHeight);
    const w = imgPersonagem.naturalWidth * s;
    const h = imgPersonagem.naturalHeight * s;
    g.drawImage(imgPersonagem, (tam - w) / 2, tam - h, w, h);
  } else {
    const base = skin.imagem ? buscarItem("skin", "classico") : skin;
    const mapa = MAPAS_POSE[pose || "parado"];
    if (base.faixas) {
      for (let y = 0; y < mapa.length; y++) {
        pintarMapa(g, [mapa[y]], paletaSkin(base, base.faixas[y % base.faixas.length]), escala, 0, y);
      }
    } else {
      pintarMapa(g, mapa, paletaSkin(base), escala);
    }
    if (base.detalhe) pintarMapa(g, base.detalhe.mapa, base.detalhe.cores, escala, 0, base.detalhe.y);
  }

  CAMADAS.forEach(function(tipo) {
    const item = equip[tipo] && buscarItem(tipo, equip[tipo]);
    if (item) pintarMapa(g, item.mapa, item.cores, escala, 0, item.y);
  });
}

const SPRITES_PRIMATA = {};

function montarSprites() {
  Object.keys(POSES).forEach(function(pose) {
    const c = criarCanvas(80, 80);
    desenharPrimata(c.getContext("2d"), save.equip, 4, pose);
    SPRITES_PRIMATA[pose] = { d: c, e: espelhar(c) };
  });
}

const SPR_REVOLVER = spriteDuplo([
  "..GGGGGGG",
  ".GKKKKKKK",
  "GKKKGG...",
  "NNK......",
  "NN......."
], { G: "#adb5bd", K: "#495057", N: "#8a5a2b" }, 3);


// ---------- FERRAMENTAS DE PIXEL LÓGICO (usadas no terreno, nos fundos e na decoração) ----------

// Divide o trecho [a, a+n) dando a volta em [0, max): é isso que faz tudo repetir sem emenda
function recortar(a, n, max) {
  if (n >= max) return [[0, max]];
  a = ((a % max) + max) % max;
  if (a + n <= max) return [[a, n]];
  return [[a, max - a], [0, a + n - max]];
}

// Tela de "pixels lógicos": cada pixel vira esc x esc pixels reais.
// O x sempre dá a volta nas bordas; o y só dá a volta se voltaY. oy é o deslocamento vertical (em pixels lógicos).
function telaPixel(w, h, esc, voltaY, oy) {
  const c = criarCanvas(w * esc, h * esc);
  const g = c.getContext("2d");
  oy = oy || 0;
  const t = { c: c, g: g, w: w, h: h, esc: esc, oy: oy };
  t.ret = function(x, y, rw, rh, cor) {
    x = Math.round(x); y = Math.round(y) - oy; rw = Math.round(rw); rh = Math.round(rh);
    if (rw <= 0 || rh <= 0) return;
    let ys;
    if (voltaY) ys = recortar(y, rh, h);
    else {
      const y0 = Math.max(0, y), y1 = Math.min(h, y + rh);
      if (y1 <= y0) return;
      ys = [[y0, y1 - y0]];
    }
    const xs = recortar(x, rw, w);
    g.fillStyle = cor;
    for (let i = 0; i < xs.length; i++) {
      for (let j = 0; j < ys.length; j++) {
        g.fillRect(xs[i][0] * esc, ys[j][0] * esc, xs[i][1] * esc, ys[j][1] * esc);
      }
    }
  };
  t.px = function(x, y, cor) { t.ret(x, y, 1, 1, cor); };
  return t;
}

// Círculo cheio em pixels lógicos
function circuloPx(t, cx, cy, r, cor) {
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
    const m = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy) + 0.25));
    t.ret(cx - m, cy + dy, m * 2 + 1, 1, cor);
  }
}

// Polígono cheio (varredura por linhas); pts = [[x, y], ...]
function poligonoPx(t, pts, cor) {
  let ymin = Infinity, ymax = -Infinity;
  pts.forEach(function(p) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); });
  for (let y = Math.ceil(ymin - 0.5); y <= Math.floor(ymax - 0.5); y++) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
        xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort(function(p, q) { return p - q; });
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.ceil(xs[i] - 0.5), x1 = Math.floor(xs[i + 1] - 0.5);
      if (x1 >= x0) t.ret(x0, y, x1 - x0 + 1, 1, cor);
    }
  }
}

// Mistura de duas cores "#rrggbb" (k = 0 fica em a, k = 1 vira b)
function mixar(a, b, k) {
  const alvo = [1, 3, 5].map(function(i) { return parseInt(b.slice(i, i + 2), 16); });
  return misturarCor(a, alvo, k);
}

// Manchinhas de 1 a maxLen pixels (dão textura de terra, areia, pedra...)
function manchasPx(t, r, cores, n, maxLen) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * t.w), y = Math.floor(r() * t.h);
    const len = 1 + Math.floor(r() * maxLen);
    const cor = cores[Math.floor(r() * cores.length)];
    t.ret(x, y, len, 1, cor);
    if (r() < 0.4) t.ret(x + 1, y + 1, Math.max(1, len - 1), 1, cor);
  }
}

function pontosPx(t, r, cor, n) {
  for (let i = 0; i < n; i++) t.px(Math.floor(r() * t.w), Math.floor(r() * t.h), cor);
}

// Pedrinha com contorno, luz em cima/esquerda e sombra embaixo/direita
function pedraPx(t, x, y, w, h, c) {
  t.ret(x - 1, y, w + 2, h, c.borda);
  t.ret(x, y - 1, w, h + 2, c.borda);
  t.ret(x, y, w, h, c.cor);
  t.ret(x, y, w - 1, 1, c.luz);
  t.ret(x, y, 1, h - 1, c.luz);
  t.ret(x + 1, y + h - 1, w - 1, 1, c.sombra);
  t.ret(x + w - 1, y + 1, 1, h - 1, c.sombra);
}

// Rachadura que "anda" sorteando passos; dá a volta no tile (some o corte). Devolve os pontos.
function rachadura(t, r, x, y, passos, dirs) {
  const pts = [];
  for (let i = 0; i < passos; i++) {
    pts.push([x, y]);
    const d = dirs[Math.floor(r() * dirs.length)];
    x += d[0]; y += d[1];
  }
  return pts;
}

// Tijolos 2 fileiras x 2 tijolos (7x7 + argamassa), com bisel; p = paleta, extra = detalhes por cima
function tijolosTile(semente, p, extra) {
  const r = criarRng(semente);
  const t = telaPixel(16, 16, 2, true);
  t.ret(0, 0, 16, 16, p.arg);
  for (let fila = 0; fila < 2; fila++) {
    for (let b = 0; b < 2; b++) {
      const x0 = b * 8 + (fila ? 4 : 0), y0 = fila * 8;
      const base = p.cor[Math.floor(r() * p.cor.length)];
      t.ret(x0, y0, 7, 7, base);
      for (let i = 0; i < 7; i++) {
        t.px(x0 + 1 + Math.floor(r() * 5), y0 + 1 + Math.floor(r() * 5), r() < 0.5 ? p.claro : p.escuro);
      }
      t.ret(x0, y0, 7, 1, p.luz);
      t.ret(x0, y0, 1, 7, p.luz);
      t.ret(x0 + 1, y0 + 6, 6, 1, p.sombra);
      t.ret(x0 + 6, y0 + 1, 1, 6, p.sombra);
    }
  }
  if (extra) extra(t, r);
  return t.c;
}

// Plataforma fina de 16x8: topo claro, miolo com veios, sombra embaixo, "pregos" nas pontas
function plataformaTile(semente, p, extra) {
  const r = criarRng(semente);
  const t = telaPixel(16, 8, 2, false);
  t.ret(0, 0, 16, 8, p.cor);
  t.ret(0, 7, 16, 1, p.borda);
  t.ret(0, 6, 16, 1, p.sombra);
  t.ret(0, 0, 16, 1, p.luz);
  t.ret(0, 1, 16, 1, p.luz2);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * 16), y = 2 + Math.floor(r() * 4);
    t.ret(x, y, 2 + Math.floor(r() * 5), 1, i % 2 ? p.veio : p.veio2);
  }
  // emenda entre as tábuas
  t.ret(0, 0, 1, 8, p.borda);
  t.ret(1, 1, 1, 5, p.luz2);
  if (p.prego) {
    t.px(3, 3, p.prego); t.px(3, 4, p.borda);
    t.px(12, 3, p.prego); t.px(12, 4, p.borda);
  }
  if (extra) extra(t, r);
  return t.c;
}

// Espinhos 16x12 (dois espinhos de 8 de largura) com base
function espinhoTile(p, extra) {
  const t = telaPixel(16, 12, 2, false);
  for (let k = 0; k < 2; k++) {
    const x0 = k * 8;
    for (let i = 0; i < 10; i++) {
      const w = Math.min(8, 2 * (1 + Math.floor(i * 4 / 9.5)));
      const xi = x0 + (8 - w) / 2;
      t.ret(xi, i, w, 1, p.cor);
      t.ret(xi, i, w / 2, 1, p.luz);
      t.ret(xi + w / 2, i, w / 2, 1, p.sombra);
      t.px(xi, i, p.borda);
      t.px(xi + w - 1, i, p.borda);
      if (i === 0) { t.ret(xi, i, w, 1, p.ponta || p.luz); }
    }
    t.ret(x0 + 3, 1, 1, 6, p.brilho || p.luz);
  }
  t.ret(0, 10, 16, 2, p.base);
  t.ret(0, 10, 16, 1, p.baseLuz);
  if (extra) extra(t);
  return t.c;
}


// ---------- TERRENO DE CADA MUNDO (tiles de 16x16 pixels lógicos, escala 2 = 32x32) ----------

// Cobre o tile `terra` (copia ele embaixo) para o `topo` herdar a mesma textura nas linhas de baixo
function topoSobre(terra) {
  const t = telaPixel(16, 16, 2, false);
  t.g.drawImage(terra, 0, 0);
  return t;
}

// ===== SELVA =====
function terraSelva() {
  const r = criarRng(1101);
  const t = telaPixel(16, 16, 2, true);
  t.ret(0, 0, 16, 16, "#8a5a2b");
  manchasPx(t, r, ["#7a4d24", "#6f4420"], 16, 3);
  manchasPx(t, r, ["#9b6a37", "#a6743d"], 12, 3);
  pontosPx(t, r, "#5e3a1a", 8);
  pontosPx(t, r, "#b98a55", 5);
  const pedra = { borda: "#4d2f15", cor: "#a39682", luz: "#d4c9b4", sombra: "#6f6556" };
  pedraPx(t, 3, 9, 3, 2, pedra);
  pedraPx(t, 12, 4, 2, 1, { borda: "#4d2f15", cor: "#8f836f", luz: "#c4b9a3", sombra: "#5f5648" });
  // raizinha
  [[7, 11], [8, 11], [9, 12], [10, 12], [6, 11]].forEach(function(p) { t.px(p[0], p[1], "#5a3818"); });
  return t.c;
}

function topoSelva(terra) {
  const r = criarRng(1102);
  const t = topoSobre(terra);
  const verdes = ["#9be85a", "#6fd13f", "#4fb52f", "#3a9a2a", "#2d7a22"];
  for (let x = 0; x < 16; x++) {
    const prof = 4 + (r() < 0.5 ? 0 : 1) + (r() < 0.25 ? 1 : 0);
    // sombra da grama na terra
    t.px(x, prof, "#5a3a1a");
    if (r() < 0.5) t.px(x, prof + 1, "#6f4822");
    for (let y = 0; y < prof; y++) {
      const fundo = y >= prof - 1;
      t.px(x, y, y === 0 ? verdes[0] : y === 1 ? verdes[1] : y === 2 ? verdes[2] : fundo ? verdes[4] : verdes[3]);
    }
    if (r() < 0.2) t.px(x, 0, "#c8f58f");
  }
  // folhinhas para fora da borda (pontinhas mais claras e escuras)
  [2, 6, 11, 14].forEach(function(x) { t.px(x, 1, "#8fe052"); t.px(x + 1, 2, "#7bd444"); });
  [4, 9, 13].forEach(function(x) { t.px(x, 3, "#2d7a22"); t.px(x, 4, "#2d7a22"); });
  t.ret(0, 0, 16, 1, "#9be85a");
  return t.c;
}

function franjaSelva() {
  const r = criarRng(1103);
  const t = telaPixel(16, 4, 2, false);
  const tons = ["#6fd13f", "#4fb52f", "#9be85a"];
  for (let x = 0; x < 16; x++) {
    if (r() < 0.75) {
      const h = 1 + Math.floor(r() * 3);
      for (let k = 0; k < h; k++) t.px(x, 3 - k, k === h - 1 ? tons[2] : tons[(x + k) % 2]);
    }
  }
  // florzinhas: 4 pétalas e miolo amarelo
  [[3, "#ff8fab"], [9, "#fff3bf"], [13, "#ffa94d"]].forEach(function(f) {
    const x = f[0];
    t.px(x, 2, "#3a9a2a"); t.px(x, 3, "#3a9a2a");
    t.px(x, 0, f[1]); t.px(x - 1, 1, f[1]); t.px(x + 1, 1, f[1]);
    t.px(x, 1, "#ffd43b");
  });
  return t.c;
}

// ===== DESERTO =====
function terraDeserto() {
  const r = criarRng(2201);
  const t = telaPixel(16, 16, 2, true);
  const tom = ["#ecc374", "#ecc374", "#e6b862", "#d2a047", "#c48d38", "#a8742c",
    "#dfb35c", "#dfb35c", "#d6a74e", "#d6a74e", "#cb983f", "#bd8734", "#9c6a26",
    "#e9bd69", "#f0c97c", "#ecc374"];
  for (let x = 0; x < 16; x++) {
    const onda = Math.round(1.2 * Math.sin(x * Math.PI * 2 / 16) + 0.7 * Math.sin(x * Math.PI * 4 / 16 + 1));
    for (let y = 0; y < 16; y++) t.px(x, y, tom[(((y + onda) % 16) + 16) % 16]);
  }
  manchasPx(t, r, ["#f3cd80", "#f6d690"], 8, 2);
  manchasPx(t, r, ["#c48d38", "#b9822f"], 6, 2);
  pontosPx(t, r, "#fff0c0", 3);
  // pedrinha de arenito
  pedraPx(t, 10, 8, 2, 1, { borda: "#8d5f1f", cor: "#c9a068", luz: "#efd6a2", sombra: "#9a7338" });
  return t.c;
}

function topoDeserto(terra) {
  const r = criarRng(2202);
  const t = topoSobre(terra);
  for (let x = 0; x < 16; x++) {
    const onda = Math.round(1.1 * Math.sin(x * Math.PI * 2 / 16) + 0.6 * Math.sin(x * Math.PI * 4 / 16 + 2));
    const prof = 5 + onda;
    for (let y = 0; y < prof; y++) {
      t.px(x, y, y === 0 ? "#fff0bd" : y < 3 ? "#f7d880" : "#f0c868");
    }
    t.px(x, prof, "#c48d38");
    t.px(x, prof + 1, r() < 0.5 ? "#d3a049" : "#dcae58");
  }
  // marcas de vento (ondulações)
  [[1, 2, 4], [8, 1, 5], [5, 3, 3], [12, 3, 3]].forEach(function(o) {
    t.ret(o[0], o[1], o[2], 1, "#e2b55b");
    t.ret(o[0] + 1, o[1] - 1, Math.max(1, o[2] - 2), 1, "#fff6d0");
  });
  pontosPx(t, r, "#fffbe6", 3);
  t.ret(0, 0, 16, 1, "#fff6cf");
  return t.c;
}

function franjaDeserto() {
  const r = criarRng(2203);
  const t = telaPixel(16, 4, 2, false);
  // montinhos de areia e pedrinhas
  t.ret(0, 3, 16, 1, "#f0c868");
  t.ret(2, 2, 5, 1, "#f7d880"); t.ret(3, 1, 3, 1, "#fff0bd");
  t.ret(11, 2, 4, 1, "#f7d880"); t.ret(12, 1, 2, 1, "#fff0bd");
  pedraPx(t, 8, 2, 2, 1, { borda: "#8d5f1f", cor: "#b89560", luz: "#e8cf9c", sombra: "#8a6a3a" });
  pedraPx(t, 14, 3, 1, 1, { borda: "#8d5f1f", cor: "#a78250", luz: "#d8bd8a", sombra: "#8a6a3a" });
  // capim seco
  [[1, "#a8742c"], [6, "#c48d38"], [10, "#a8742c"]].forEach(function(c) {
    t.px(c[0], 3, c[1]); t.px(c[0], 2, c[1]); t.px(c[0] + 1, 1, c[1]); t.px(c[0] - 1, 1, c[1]);
  });
  return t.c;
}

// ===== ERA DO GELO =====
function terraGelo() {
  const r = criarRng(3301);
  const t = telaPixel(16, 16, 2, true);
  t.ret(0, 0, 16, 16, "#6fb6f2");
  // camadas de gelo com tons diferentes
  t.ret(0, 4, 16, 2, "#7cc0f6");
  t.ret(0, 10, 16, 3, "#62abeb");
  manchasPx(t, r, ["#8ccbf8", "#95d1fa"], 8, 3);
  manchasPx(t, r, ["#4f9be0", "#5aa3e6"], 8, 3);
  // rachaduras brancas
  rachadura(t, r, 2, 1, 8, [[1, 0], [1, 1], [0, 1]]).forEach(function(p, i) { t.px(p[0], p[1], i % 3 === 2 ? "#e8f7ff" : "#c9ecff"); });
  rachadura(t, r, 10, 8, 7, [[1, 0], [1, -1], [0, 1], [1, 1]]).forEach(function(p) { t.px(p[0], p[1], "#d8f1ff"); });
  // bolhinhas de ar congeladas
  [[12, 3], [5, 12]].forEach(function(b) {
    t.ret(b[0], b[1], 2, 2, "#c9ecff"); t.px(b[0], b[1], "#ffffff"); t.px(b[0] + 1, b[1] + 1, "#9ad0f5");
  });
  pontosPx(t, r, "#ffffff", 2);
  return t.c;
}

function topoGeloNeve(terra) {
  const r = criarRng(3302);
  const t = topoSobre(terra);
  for (let x = 0; x < 16; x++) {
    const prof = 5 + Math.round(1.6 * Math.abs(Math.sin(x * Math.PI / 4 + 0.6)));
    for (let y = 0; y < prof; y++) {
      t.px(x, y, y === 0 ? "#ffffff" : y < 3 ? "#f2f8fe" : y < prof - 1 ? "#d9e9f8" : "#b4d0ee");
    }
    t.px(x, prof, "#4f9be0");
    if (r() < 0.4) t.px(x, prof + 1, "#5aa3e6");
  }
  [[2, 2], [7, 1], [11, 3], [14, 2]].forEach(function(s) { t.px(s[0], s[1], "#cfe3f6"); });
  pontosPx(t, r, "#ffffff", 3);
  return t.c;
}

function topoGeloLiso(terra) {
  const r = criarRng(3303);
  const t = topoSobre(terra);
  t.ret(0, 0, 16, 1, "#f2fcff");
  t.ret(0, 1, 16, 2, "#cdeeff");
  t.ret(0, 3, 16, 2, "#a8dcfb");
  t.ret(0, 5, 16, 1, "#7cc0f6");
  // reflexos diagonais (escorregadio)
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 4; i++) t.px(2 + k * 8 + i, 4 - i, "#ffffff");
    for (let i = 0; i < 3; i++) t.px(5 + k * 8 + i, 4 - i, "#e8f8ff");
  }
  rachadura(t, r, 6, 0, 5, [[1, 1], [0, 1]]).forEach(function(p) { t.px(p[0], p[1] + 1, "#9ad0f5"); });
  pontosPx(t, r, "#ffffff", 3);
  return t.c;
}

function franjaGelo() {
  const t = telaPixel(16, 4, 2, false);
  function monte(x, w, h) {
    for (let i = 0; i < w; i++) {
      const alt = Math.max(1, Math.round(h * Math.sin(Math.PI * (i + 0.5) / w)));
      for (let k = 0; k < alt; k++) {
        t.px(x + i, 3 - k, k === alt - 1 ? "#ffffff" : (k === 0 && i > w / 2) ? "#b4d0ee" : "#eaf4fe");
      }
    }
  }
  monte(0, 7, 3); monte(6, 5, 2); monte(11, 6, 3);
  t.px(3, 2, "#cfe3f6"); t.px(13, 2, "#cfe3f6");
  t.px(4, 0, "#ffffff"); t.px(9, 1, "#ffffff");
  return t.c;
}

// ===== LAVA =====
function terraLava() {
  const r = criarRng(4401);
  const t = telaPixel(16, 16, 2, true);
  t.ret(0, 0, 16, 16, "#2a2430");
  manchasPx(t, r, ["#342c3a", "#38303f"], 14, 3);
  manchasPx(t, r, ["#1e1a24", "#191520"], 14, 3);
  pontosPx(t, r, "#4a4056", 5);
  // rachaduras de magma com brilho em volta
  const veios = [
    rachadura(t, r, 0, 3, 8, [[1, 0], [1, 1], [1, 0], [0, 1]]),
    rachadura(t, r, 8, 3, 6, [[0, 1], [1, 1], [0, 1], [-1, 1]]),
    rachadura(t, r, 7, 11, 9, [[1, 0], [1, -1], [1, 0], [0, 1]])
  ];
  const mapa = {};
  veios.forEach(function(v) { v.forEach(function(p) { mapa[((p[0] % 16) + 16) % 16 + "," + (((p[1] % 16) + 16) % 16)] = 1; }); });
  veios.forEach(function(v) {
    v.forEach(function(p) {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function(d) {
        const x = ((p[0] + d[0]) % 16 + 16) % 16, y = ((p[1] + d[1]) % 16 + 16) % 16;
        if (!mapa[x + "," + y] && r() < 0.7) t.px(x, y, "#7a2a14");
      });
    });
  });
  veios.forEach(function(v) {
    v.forEach(function(p, i) { t.px(p[0], p[1], i % 3 === 0 ? "#ffd25a" : "#ff8a1f"); });
  });
  return t.c;
}

function topoLava(terra) {
  const r = criarRng(4402);
  const t = topoSobre(terra);
  for (let x = 0; x < 16; x++) {
    const prof = 4 + (r() < 0.4 ? 1 : 0);
    for (let y = 0; y < prof; y++) {
      t.px(x, y, y === 0 ? "#7d6f90" : y === 1 ? "#584c68" : y < prof - 1 ? "#3f3549" : "#2f2738");
    }
    t.px(x, prof, "#1a1520");
  }
  pontosPx(t, r, "#9a8cb0", 3);
  // brasinhas e um fiozinho de magma
  t.px(4, 3, "#ff8a1f"); t.px(5, 3, "#ffd25a"); t.px(6, 4, "#e8590c");
  t.px(11, 2, "#ff8a1f"); t.px(12, 3, "#e8590c");
  t.ret(0, 0, 16, 1, "#8d7fa0");
  return t.c;
}

function franjaLava() {
  const r = criarRng(4403);
  const t = telaPixel(16, 4, 2, false);
  // pedacinhos de basalto
  pedraPx(t, 2, 2, 3, 1, { borda: "#120d16", cor: "#3f3549", luz: "#7d6f90", sombra: "#241d2b" });
  pedraPx(t, 10, 3, 2, 1, { borda: "#120d16", cor: "#3f3549", luz: "#7d6f90", sombra: "#241d2b" });
  // brasas
  [[6, 2, "#ff8a1f"], [7, 1, "#ffd25a"], [13, 1, "#ff6b00"], [0, 0, "#ffd25a"], [9, 0, "#ff8a1f"], [15, 2, "#e8590c"]].forEach(function(b) {
    t.px(b[0], b[1], b[2]);
  });
  t.px(6, 3, "#7a2a14"); t.px(7, 3, "#c2410c"); t.px(8, 3, "#7a2a14");
  return t.c;
}

// ===== TILES PRONTOS =====
function criarTemaSelva() {
  const terra = terraSelva();
  return {
    topo: topoSelva(terra), terra: terra, franja: franjaSelva(),
    bloco: tijolosTile(1111, {
      arg: "#3b4333", cor: ["#8f9a80", "#869175", "#97a287"], claro: "#a3ae94", escuro: "#707b63",
      luz: "#c5cfb4", sombra: "#555f49"
    }, function(t, r) {
      // musgo nas bordas de cima e cipozinho caindo
      t.ret(1, 0, 4, 1, "#4f9a3a"); t.ret(9, 8, 5, 1, "#4f9a3a");
      t.px(2, 1, "#3a7a2a"); t.px(11, 9, "#3a7a2a"); t.px(12, 9, "#3a7a2a"); t.px(12, 10, "#3a7a2a");
      t.px(4, 1, "#69bf4a"); t.px(10, 8, "#69bf4a");
    }),
    plat: plataformaTile(1112, {
      cor: "#9a6532", luz: "#d19a55", luz2: "#b97f40", sombra: "#6e431d", borda: "#3f2410",
      veio: "#7e4f24", veio2: "#b07a3e", prego: "#e8d9b0"
    }, function(t) {
      t.ret(5, 0, 3, 1, "#4fb52f"); t.px(6, 1, "#3a9a2a"); t.px(14, 0, "#4fb52f"); t.px(14, 1, "#3a9a2a");
    }),
    espinho: espinhoTile({
      cor: "#5c940d", luz: "#a9e34b", sombra: "#2f6a14", borda: "#1f4a10", ponta: "#e9fac8", brilho: "#d0f08c",
      base: "#6b4220", baseLuz: "#4fb52f"
    })
  };
}

function criarTemaDeserto() {
  const terra = terraDeserto();
  return {
    topo: topoDeserto(terra), terra: terra, franja: franjaDeserto(),
    bloco: tijolosTile(2211, {
      arg: "#8a5a1e", cor: ["#e2ae5a", "#dba450", "#e8b866"], claro: "#efc577", escuro: "#c28c3c",
      luz: "#ffe4a6", sombra: "#a8721f"
    }, function(t) {
      // hieróglifos riscados
      const c = "#a8721f";
      t.px(2, 3, c); t.px(3, 3, c); t.px(4, 3, c); t.px(2, 4, c); t.px(4, 4, c);
      t.px(11, 11, c); t.px(12, 11, c); t.px(12, 12, c); t.px(13, 12, c);
      t.px(10, 3, c); t.px(11, 3, c); t.px(11, 4, c);
    }),
    plat: plataformaTile(2212, {
      cor: "#a97442", luz: "#dcae72", luz2: "#c28c56", sombra: "#7a4d24", borda: "#4a2c14",
      veio: "#8a5a2e", veio2: "#c28c56", prego: "#f1e3b8"
    }, function(t) {
      // corda amarrando a tábua
      for (let y = 1; y < 7; y++) { t.px(7, y, y % 2 ? "#f1e3b8" : "#cdb882"); t.px(8, y, y % 2 ? "#cdb882" : "#f1e3b8"); }
    }),
    espinho: espinhoTile({
      cor: "#2f9e44", luz: "#74d68a", sombra: "#1b6b2e", borda: "#0f4a1e", ponta: "#fff3bf", brilho: "#a8ecb6",
      base: "#b9822f", baseLuz: "#f0c868"
    }, function(t) {
      // espininhos brancos
      [[3, 5], [4, 7], [11, 5], [12, 7], [2, 8], [13, 8]].forEach(function(p) { t.px(p[0], p[1], "#fff3bf"); });
    })
  };
}

function criarTemaGelo() {
  const terra = terraGelo();
  return {
    topo: topoGeloNeve(terra), terra: terra, topoGelo: topoGeloLiso(terra), franja: franjaGelo(),
    bloco: tijolosTile(3311, {
      arg: "#3d7fc6", cor: ["#b4dcfc", "#a6d3f8", "#c0e4ff"], claro: "#d4eeff", escuro: "#8cc4f0",
      luz: "#f2fbff", sombra: "#6aaae6"
    }, function(t) {
      // reflexos diagonais
      for (let i = 0; i < 3; i++) { t.px(2 + i, 4 - i, "#ffffff"); t.px(10 + i, 12 - i, "#ffffff"); }
      t.px(13, 3, "#ffffff"); t.px(5, 11, "#ffffff");
    }),
    plat: plataformaTile(3312, {
      cor: "#cfe8fb", luz: "#ffffff", luz2: "#eaf6ff", sombra: "#8fc2ec", borda: "#4f8fd0",
      veio: "#e6f4ff", veio2: "#b4d8f5"
    }, function(t) {
      for (let i = 0; i < 3; i++) t.px(10 + i, 4 - i, "#ffffff");
      // pingentes de gelo
      t.px(4, 8, "#8fc2ec");
    }),
    espinho: espinhoTile({
      cor: "#9fd4fa", luz: "#eaf8ff", sombra: "#3f8fd8", borda: "#1c5fa8", ponta: "#ffffff", brilho: "#ffffff",
      base: "#4f9be0", baseLuz: "#bfe3ff"
    })
  };
}

function criarTemaLava() {
  const terra = terraLava();
  return {
    topo: topoLava(terra), terra: terra, franja: franjaLava(),
    bloco: tijolosTile(4411, {
      arg: "#c2410c", cor: ["#43355a", "#3b2e4f", "#4a3b62"], claro: "#55466f", escuro: "#2c2140",
      luz: "#7d6a9a", sombra: "#1d1429"
    }, function(t, r) {
      // magma brilhando na argamassa
      for (let i = 0; i < 9; i++) {
        t.px(7 + (i % 2) * 8 + (i > 4 ? 4 : 0), Math.floor(r() * 16), "#ffb02e");
      }
      t.px(3, 7, "#ff9a3c"); t.px(12, 15, "#ffd25a"); t.px(5, 15, "#ff9a3c"); t.px(13, 7, "#ffd25a");
    }),
    plat: plataformaTile(4412, {
      cor: "#5f666d", luz: "#aeb5bc", luz2: "#868e96", sombra: "#3a4046", borda: "#16191c",
      veio: "#4a5157", veio2: "#7a828a", prego: "#d0d5d9"
    }, function(t) {
      // faixa de metal e brilho de calor embaixo
      t.px(1, 6, "#c2410c"); t.px(2, 6, "#e8590c"); t.px(14, 6, "#e8590c"); t.px(15, 6, "#c2410c");
      t.ret(6, 3, 4, 1, "#3a4046");
    }),
    espinho: espinhoTile({
      cor: "#4a4252", luz: "#8d8399", sombra: "#272230", borda: "#0f0c14", ponta: "#ff8a1f", brilho: "#aaa0b6",
      base: "#2a2430", baseLuz: "#7d6f90"
    }, function(t) {
      // pontas em brasa
      for (let k = 0; k < 2; k++) { t.ret(k * 8 + 3, 1, 2, 1, "#ffd25a"); t.ret(k * 8 + 3, 2, 2, 1, "#ff6b00"); }
    })
  };
}

const TEMAS = [criarTemaSelva(), criarTemaDeserto(), criarTemaGelo(), criarTemaLava()];


// ---------- INIMIGOS (todos olhando para a direita) ----------

const SPR_INIMIGO = {};

function registrarInimigo(tipo, mapa, paleta, escala) {
  const s = spriteDuplo(mapa, paleta, escala);
  SPR_INIMIGO[tipo] = s;
  TIPOS_INIMIGO[tipo].w = s.w;
  TIPOS_INIMIGO[tipo].h = s.h;
}

registrarInimigo("cobra", [
  "...........KKK..",
  "..........KGGGK.",
  "..........KGWEK.",
  "..........KGGGGR",
  "...........KGGK.",
  "...KKKK....KGK..",
  "..KGGGGK..KGGK..",
  ".KGLLLLGKKGGK...",
  "KGLK..KLGGGK....",
  "KGGK...KKKK.....",
  ".KGGKKKKGGK.....",
  "..KKGGGGKK......"
], { K: "#1b4d1b", G: "#40c057", L: "#b2f2bb", W: "#ffffff", E: "#111111", R: "#e03131" }, 3);

registrarInimigo("sapo", [
  "..KKK.....KKK...",
  ".KWEGK...KWEGK..",
  ".KGGGKKKKKGGGK..",
  "KGGGGGGGGGGGGGK.",
  "KGGKKKKKKKKKGGK.",
  "KGGGGGGGGGGGGGGK",
  ".KGLLLLLLLLLLGK.",
  "KGGKLLLLLLLLKGGK",
  "KGGK.KKKKKK.KGGK",
  ".KK..........KK."
], { K: "#1b4d1b", G: "#37b24d", L: "#d8f5a2", W: "#ffffff", E: "#111111" }, 3);

registrarInimigo("abelha", [
  "....WW.WW.....",
  "...WCCWCCW....",
  "....WWWWW.....",
  "...KKKKKKKK...",
  "..KYYKKYYKYK..",
  ".KYYKKYYKYYWEK",
  "KKYYKKYYKYYYYK",
  ".KYYKKYYKYYYK.",
  "..KKKKKKKKKK..",
  "....K..K.K...."
], { K: "#1a1a1a", Y: "#fcc419", W: "#ffffff", C: "#d0ebff", E: "#111111" }, 3);

registrarInimigo("escorpiao", [
  "......KKKK........",
  ".....KOOOOK.......",
  "....KOK..KOK......",
  "....KOK...KRK.....",
  "....KOK....K......",
  "....KOK...........",
  "....KOOKKKKKKKK...",
  "...KOOOOOOOOOOOK..",
  "..KOLLOLLOLLOOWEK.",
  "..KOOOOOOOOOOOOOKK",
  "...KKOKKOKKOKKKOOK",
  "....K..K..K..K..KK"
], { K: "#3d1f00", O: "#c77d2a", L: "#e0a458", R: "#8a1c1c", W: "#ffffff", E: "#111111" }, 3);

registrarInimigo("abutre", [
  "..................",
  "...........KKK....",
  "..........KPPPK...",
  "..........KPWEKYY.",
  "KKKK......KPPPKY..",
  "KLLLKK...KCCCK....",
  ".KLLLLKKKNNNNNKKKK",
  "..KLLLLLNNNNNNLLLK",
  "...KKLLLNNNNNLLKK.",
  ".....KKKNNNNNKK...",
  ".......KKKNNKK....",
  "........Y...Y....."
], { K: "#1a1a1a", N: "#4a3728", L: "#6b5240", P: "#e599a8", Y: "#f2c94c", W: "#ffffff", E: "#111111", C: "#e9ecef" }, 3);

registrarInimigo("cacto", [
  "....KPPK....",
  "...KGGGGK...",
  "...KGLGGK...",
  "...KWEWEK...",
  "...KGMMGK...",
  ".K.KGLGGK.K.",
  "KGKKGLGGKKGK",
  "KGGGGLGGGGGK",
  "KLKKGLGGKKLK",
  ".K.KGLGGK.K.",
  "...KGLGGK...",
  "...KGLGGK...",
  "...KGLGGK...",
  "..KNNNNNNK..",
  "..KNNNNNNK..",
  "...KKKKKK..."
], { K: "#1b4d1b", G: "#2f9e44", L: "#69db7c", P: "#f783ac", W: "#ffffff", E: "#111111", M: "#5c1010", N: "#a0703a" }, 3);

registrarInimigo("pinguim", [
  "...KKKKK....",
  "..KBBBBBK...",
  ".KBBBBWEBK..",
  ".KBBWWWWBYY.",
  ".KBWWWWWWBK.",
  "KBBWWWWWWBBK",
  "KBWWWWWWWWBK",
  "KBWWWWWWWWBK",
  "KBWWWWWWWWBK",
  ".KBWWWWWWBK.",
  ".KBBWWWWBBK.",
  "..KKKKKKKK..",
  "..YYY..YYY.."
], { K: "#111111", B: "#1e2a44", W: "#ffffff", Y: "#ff922b", E: "#111111" }, 4);

const MAPA_MORCEGO = [
  "K......KK......K",
  "KK....KBBK....KK",
  "KLK..KBEEBK..KLK",
  "KLLKKBBBBBBKKLLK",
  "KLLLLKBBBBKLLLLK",
  ".KLLLKKBBKKLLLK.",
  "..KKK..KK..KKK.."
];
registrarInimigo("morcegoGelo", MAPA_MORCEGO, { K: "#1c3d5a", B: "#a5d8ff", L: "#74c0fc", E: "#ffffff" }, 3);
registrarInimigo("morcegoFogo", MAPA_MORCEGO, { K: "#4a1500", B: "#e8590c", L: "#ff922b", E: "#ffe066" }, 3);

registrarInimigo("boneco", [
  "....KKKKKK....",
  "....KKKKKK....",
  "...KKKKKKKK...",
  "....SWWWWS....",
  "...SWKWWKWS...",
  "...SWWWOOOO...",
  "...SWKKKWWS...",
  "....RRRRRRR...",
  "N...SWWWWS...N",
  ".N.SWWKWWWS.N.",
  "..NSWWWWWWWSN.",
  "...SWWKWWWWS..",
  "...SWWWWWWWS..",
  "..SWWWWWWWWWS.",
  ".SWWWWKWWWWWWS",
  ".SWWWWWWWWWWWS",
  ".SWWWWWWWWWWWS",
  ".SWWWWWWWWWWWS",
  "..SWWWWWWWWWS.",
  "...SSSSSSSSS.."
], { K: "#111111", W: "#ffffff", S: "#ced4da", O: "#ff922b", R: "#e03131", N: "#6b4220" }, 3);

registrarInimigo("slime", [
  ".....KKKK.....",
  "...KKOOOOKK...",
  "..KOOYYOOOOK..",
  ".KOOYOOOOOOOK.",
  ".KOOOWEOOWEOK.",
  "KRROOOOOOOOORK",
  "KRRROOKKOOORRK",
  "KRRRRROORRRRRK",
  "KRRRRRRRRRRRRK",
  ".KKKKKKKKKKKK."
], { K: "#2b0a0a", R: "#e8590c", O: "#ff922b", Y: "#ffe066", W: "#ffffff", E: "#111111" }, 4);

registrarInimigo("diabinho", [
  ".H......H...",
  ".HK....KH...",
  "..KRRRRK....",
  ".KRRRRRRK...",
  ".KRYERYERK..",
  ".KRRRRRRK...",
  ".KRRWWWRK...",
  "..KKRRRK....",
  ".KRRRRRRRK.N",
  "KRDRRRRRDRKN",
  "KK.KRRRRK.NN",
  "...KRRRRK..N",
  "...KRK.KRK.N",
  "...KKK.KKK.."
], { K: "#2b0a0a", R: "#e03131", D: "#a51111", Y: "#ffe066", E: "#111111", W: "#ffffff", H: "#f1f3f5", N: "#495057" }, 4);


registrarInimigo("macacoLadrao", [
  "....KKKKKK....",
  "...KGGGGGGK...",
  ".KKGGGGGGGGKK.",
  "KPKKKKKKKKKKPK",
  "KPKKWEKKWEKKPK",
  ".KKPPPPPPPPKK.",
  "...KPPMMPPK...",
  "....KKKKKK....",
  "...KGGGGGGK.NN",
  "..KGGPPPPGGKNN",
  "..KGGPPPPGGK..",
  "...KGGGGGGK...",
  "...KGK..KGK...",
  "...KKK..KKK..."
], { K: "#2b1d14", G: "#6b5a4e", P: "#d9b99b", W: "#ffffff", E: "#111111", M: "#5c1010", N: "#5c3a1a" }, 3);

registrarInimigo("aranha", [
  "..K..KKKK..K..",
  ".K..KKKKKK..K.",
  "K..KKRKKRKK..K",
  "K.KKKKKKKKKK.K",
  ".KKKKKKKKKKKK.",
  "K.KKKKKKKKKK.K",
  "K..KKVKKVKK..K",
  ".K..KKKKKK..K.",
  "..K..KKKK..K..",
  ".K....KK....K."
], { K: "#1a1a1a", R: "#e03131", V: "#7048e8" }, 3);

registrarInimigo("mumia", [
  "...SWWWWS...",
  "..SWWSWWWS..",
  "..WKEWWKEW..",
  "..SWWWWWWS..",
  "..WWSSWWWW..",
  "...SWWWWS...",
  "..SWWWWWS...",
  ".SWWSWWWWWWW",
  ".SWWWWWSWWWS",
  ".SWWWSWWW...",
  ".SWWWWWWS...",
  "..WWSWWWS...",
  "..SWWWWWW...",
  "..WW.SWW....",
  "..SW..WS....",
  "..WW..WW....",
  ".SWW..WWS..."
], { W: "#e9e4d4", S: "#b8ae94", K: "#2b2620", E: "#ffd43b" }, 3);

registrarInimigo("tatu", [
  "....KKKKKK......",
  "...KAAABAAK.....",
  "..KAAABAAABK....",
  ".KAAABAAABAAK...",
  ".KAABAAABAAABKK.",
  "KAAABAAABAAABPEK",
  "KAAABAAABAAABPPN",
  ".KKKKKKKKKKKKKK.",
  "..KP..KP..KP.KP.",
  "................"
], { K: "#3b2a1a", A: "#a68a64", B: "#7a6040", P: "#d9b99b", E: "#111111", N: "#5c3a1a" }, 3);

registrarInimigo("foca", [
  "..........KKK...",
  ".........KGGGK..",
  ".........KGWEGK.",
  "........KGGGGGNK",
  "...KKKKKGGGGGK..",
  "..KGGGGGGGLLGK..",
  ".KGGGGGGGLLLGK..",
  "KGGKGGGGLLLLGK..",
  "KKK.KKGGGGGGKK..",
  ".....KKK..KKK..."
], { K: "#1c2a3a", G: "#8ba3b8", L: "#d0dde8", W: "#ffffff", E: "#111111", N: "#111111" }, 3);

registrarInimigo("lobo", [
  ".............K.K..",
  "............KGKGK.",
  "...........KGGGGGK",
  "...........KGWEGGK",
  "K........KGGGGLLLN",
  "GK.....KKKGGGGGKK.",
  ".GKKKKKGGGGGGGGK..",
  "..KGGGGGGGGGLLGK..",
  "..KGGGGGGGGGLLGK..",
  "..KGGKKKKKKGGGK...",
  "..KGK......KGK....",
  "..KKK......KKK...."
], { K: "#2b3440", G: "#adb5bd", L: "#f1f3f5", W: "#ffd43b", E: "#111111", N: "#111111" }, 3);

registrarInimigo("golem", [
  "....KKKKKKKK....",
  "...KRRRRRRRRK...",
  "..KRRrRRRRrRRK..",
  "..KRROORROORRK..",
  "..KRRRRRRRRRRK..",
  "...KRRKKKKRRK...",
  ".KKKRRRRRRRRKKK.",
  "KRRRKRRrRRRKRRRK",
  "KRrRKRRRRRrKRrRK",
  "KRRRKRRRRRRKRRRK",
  "KRRRKRRORRRKRRRK",
  "KKKKKRRRRRRKKKKK",
  "KRRK.KRRRRK.KRRK",
  "KKKK.KRRRRK.KKKK",
  ".....KRRKRRK....",
  "....KRRK.KRRK...",
  "....KKKK.KKKK..."
], { K: "#1a1d20", R: "#6c6f73", r: "#8a8d91", O: "#ff922b" }, 3);

registrarInimigo("fenix", [
  "...........Y.Y....",
  "...........YRRK...",
  "..........KRRWEK..",
  "Y........KRRRRRYY.",
  "YR.....KKRRRRRK...",
  ".YRR.KROOORRRK....",
  "..YRRROOOOOORK....",
  "...YRRYYOOOORK....",
  "..YYRRRRYYOOK.....",
  ".Y..YRRRRRKK......",
  "......YY.Y........",
  ".......K..K......."
], { K: "#5c1a03", R: "#e8590c", O: "#ff922b", Y: "#ffd43b", W: "#ffffff", E: "#111111" }, 3);


// ---------- OBSTÁCULOS ----------

const SPR_COGUMELO = spriteDeMapa([
  "....RRRRRRRR....",
  "..RRWWRRRRWWRR..",
  ".RRWWWRRRRRWWRR.",
  "RRRRRRRWWRRRRRRR",
  "KKKKKKKKKKKKKKKK",
  ".....SSSSSS.....",
  ".....SSSSSS....."
], { R: "#e03131", W: "#ffffff", K: "#a51111", S: "#f1e3c8" }, 4);

const SPR_TRONCO = spriteDeMapa([
  "..KKKKKK..",
  ".KNNNNNNK.",
  "KNNLLLLNNK",
  "KNLNNNNLNK",
  "KNLNKKNLNK",
  "KNLNKKNLNK",
  "KNLNNKNLNK",
  "KNNLLLLNNK",
  ".KNNNNNNK.",
  "..KKKKKK.."
], { K: "#3b2412", N: "#8a5a2b", L: "#c4915a" }, 4);

const SPR_PLANTA = spriteDeMapa([
  "...RRRRRR...",
  ".RRWRRRRWRR.",
  "RRRRRRRRRRRR",
  "RWRWRWRWRWRW",
  "KKKKKKKKKKKK",
  "WRWRWRWRWRWR",
  "RRRRRRRRRRRR",
  ".RRRRRRRRRR.",
  "...RRRRRR...",
  ".....GG.....",
  "..GG.GG.GG..",
  ".GGGGGGGGGG.",
  "..GG.GG.GG..",
  ".....GG.....",
  ".....GG.....",
  ".....GG....."
], { R: "#e03131", W: "#ffffff", K: "#5c1010", G: "#2f9e44" }, 4);

const SPR_ARMADILHA = spriteDeMapa([
  "MMMMMMMM",
  "MLLLLLLM",
  "MLKKKKLM",
  "MLKDDKLM",
  "MLKDDKLM",
  "MLKKKKLM",
  "MLLLLLLM",
  "MMMMMMMM"
], { M: "#8a6420", L: "#d9a648", K: "#3b2a1a", D: "#000000" }, 4);

const SPR_BOLHA = bolaPixel(11, "rgba(255,255,255,0.18)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0.85)", 2);


// ---------- CHEFES ----------

const SPR_CHEFE = {};

function registrarChefe(nome, mapa, paleta, escala) {
  const s = spriteDuplo(mapa, paleta, escala);
  s.flashD = silhueta(s.d);
  s.flashE = silhueta(s.e);
  SPR_CHEFE[nome] = s;
}

registrarChefe("gorila", [
  "...........Y.Y.Y........",
  "...........YYRYY........",
  "..........KKKKKKK.......",
  ".........KGGGGGGGK......",
  "........KGGGGGGGGGK.....",
  "........KGGPPPPPPPK.....",
  "........KGPWEPPWEPK.....",
  "....KKKKKGPPPPPPPPKKK...",
  "...KGGGGGGPPMMMMPPKGGK..",
  "..KGGGGGGGKPPPPPPKGGGGK.",
  ".KGGLLGGGGGKKKKKKGGGGGGK",
  ".KGLLGGGCCCCCCCCGGGLLGGK",
  "KGGLGGGCCCCCCCCCCGGGLGGK",
  "KGGLGGGCCCCCCCCCCGGGLGGK",
  "KGGGGGGCCCCCCCCCCGGGGGGK",
  "KGGGGGGGCCCCCCCCGGGGGGGK",
  "KGGGKGGGGGGGGGGGGGGKGGGK",
  "KGGGKKGGGGGGGGGGGGKKGGGK",
  "KPPPK.KGGGGKKGGGGK.KPPPK",
  ".KKK..KGGGK..KGGGK..KKK.",
  "......KPPPK..KPPPK......",
  "......KKKKK..KKKKK......"
], { K: "#141414", G: "#3d3d3d", L: "#5c5c5c", C: "#7a7a7a", P: "#a07a5a", W: "#ffffff", E: "#c92a2a",
     M: "#2b0f0f", Y: "#ffd43b", R: "#e03131" }, 6);

const MAPA_ESCORPIAO_REI = [
  "......KKKK........",
  ".....KOOOOK.......",
  "....KOK..KOK......",
  "....KOK...KRK.....",
  "....KOK....K......",
  "....KOK...........",
  "....KOOKKKKKKKK...",
  "...KOOOOOOOOOOOK..",
  "..KOLLOLLOLLOOWEK.",
  "..KOOOOOOOOOOOOOKK",
  "...KKOKKOKKOKKKOOK",
  "....K..K..K..K..KK"
];
registrarChefe("escorpiaoRei", MAPA_ESCORPIAO_REI,
  { K: "#3d2600", O: "#e0a526", L: "#ffe066", R: "#5f3dc4", W: "#ffffff", E: "#c92a2a" }, 9);

const SPR_COROA_PEQ = spriteDuplo([
  "Y.YY.Y",
  "YYRRYY",
  "YYYYYY"
], { Y: "#ffd43b", R: "#e03131" }, 6);

registrarChefe("yeti", [
  "........BBBBBB........",
  "......BBWWWWWWBB......",
  ".....BWWWWWWWWWWB.....",
  "....BWWWWWWWWWWWWB....",
  "....BWWFFFFFFFFWWB....",
  "....BWFFEFFFFEFFWB....",
  "....BWFFFFFFFFFFWB....",
  "....BWFMTMTMTMTFWB....",
  "..BBBWFMMMMMMMMFWBBB..",
  ".BWWWWWFFFFFFFFWWWWWB.",
  "BWWSWWWWWWWWWWWWWWSWWB",
  "BWWSWWWWWWWWWWWWWWSWWB",
  "BWSSWWWWWWWWWWWWWWSSWB",
  "BWSWWWWWWWWWWWWWWWWSWB",
  "BWWWBWWWWWWWWWWWWBWWWB",
  "BWWWBWWWWWWWWWWWWBWWWB",
  "BFFFBWWWWWWWWWWWWBFFFB",
  ".BBB.BWWWWWWWWWWB.BBB.",
  ".....BWWWWWWWWWWB.....",
  ".....BWWWWBBWWWWB.....",
  ".....BWWWB..BWWWB.....",
  "....BWWWWB..BWWWWB....",
  "....BFFFFB..BFFFFB....",
  "....BBBBBB..BBBBBB...."
], { B: "#1c3d5a", W: "#f8f9fa", S: "#a5d8ff", F: "#9fb3c8", E: "#c92a2a", M: "#2b0f2f", T: "#ffffff" }, 6);

registrarChefe("dragao", [
  "................................",
  "................................",
  "................................",
  "...........................HH...",
  "..........................KKKK..",
  ".........................KRRRRK.",
  "........................KRRWERK.",
  ".......................KRRRRRRRK",
  ".....................KKRRRRRYYK.",
  "......KRRRRRRRRRRKKKKRRRRRKKKK..",
  ".....KRRRRRRRRRRRRRRRRRRRK......",
  "KK..KRROOOOOOOOOOOORRRRK........",
  "KRKKRRROOOOOOOOOOOORRRK.........",
  ".KRRRRRROOOOOOOOOORRRK..........",
  "..KKKKKRRRRRRRRRRRRK............",
  ".......KRRK...KRRK..............",
  ".......KYYK...KYYK..............",
  ".......KKKK...KKKK.............."
], { K: "#2b0a0a", R: "#c92a2a", O: "#ff922b", Y: "#ffd43b", W: "#ffffff", E: "#111111", H: "#f1f3f5" }, 6);

const SPR_ASA = spriteDuplo([
  "........KK......",
  ".......KDDK.....",
  "......KDDDDK....",
  ".....KDDDDDDK...",
  "....KDDDDDDDDK..",
  "...KDDDKDDDDDK..",
  "..KDDK.KDDDDDDK.",
  ".KDK...KDDDDDDDK",
  "KK.....KKDDDDDDK"
], { K: "#2b0a0a", D: "#862e2e" }, 6);


// ---------- OBJETOS ----------

const SPR_BANANA = spriteDeMapa([
  "..........N.",
  ".........KN.",
  "........KYK.",
  ".......KYYK.",
  "......KYYYK.",
  "....KKYyYK..",
  "KKKKYYYyK...",
  "KYYYYYyK....",
  ".KyyyKK.....",
  "..KKK......."
], { K: "#7a4f05", Y: "#ffe066", y: "#f2b705", N: "#5c3a1a" }, 4);

const MAPA_CORACAO = [
  ".RR.RR.",
  "RWRRRRR",
  "RRRRRRR",
  "RRRRRRR",
  ".RRRRR.",
  "..RRR..",
  "...R..."
];
const SPR_CORACAO = spriteDeMapa(MAPA_CORACAO, { R: "#e03131", W: "#ffc9c9" }, 4);
const SPR_CORACAO_VAZIO = spriteDeMapa(MAPA_CORACAO, { R: "#495057", W: "#868e96" }, 4);

const SPR_PLACA = spriteDeMapa([
  "DDDDDDDD",
  "DLLLLLLD",
  "DLKKKLLD",
  "DLLLLLLD",
  "DLKKLKLD",
  "DDDDDDDD",
  "...DD...",
  "...DD..."
], { D: "#6b4220", L: "#c99a5b", K: "#6b4220" }, 4);

const SPR_GEISER = spriteDeMapa([
  "..KKKKKKKKKKKK..",
  ".KBBBOOOOOOBBBK.",
  "KBBBOYYYYYYOBBBK",
  "KBBBBOOOOOOBBBBK",
  "KKKKKKKKKKKKKKKK"
], { K: "#1a1d20", B: "#495057", O: "#ff6b00", Y: "#ffd43b" }, 4);

const SPR_ESTALACTITE = spriteDeMapa([
  "WIIIID",
  "WIIIID",
  ".WIID.",
  ".WIID.",
  ".WIID.",
  "..WD..",
  "..WD..",
  "..WD..",
  "...D.."
], { W: "#e7f5ff", I: "#a5d8ff", D: "#4dabf7" }, 4);

const MAPA_BANDEIRA = [
  ".PFFFFF.", ".PFFFFF.", ".PFFFF..", ".PFFF...", ".PFF....",
  ".P......", ".P......", ".P......", ".P......", ".P......",
  ".P......", ".P......", ".P......", ".P......", ".P......", ".P......"
];
const SPR_BANDEIRA_OFF = spriteDeMapa(MAPA_BANDEIRA, { P: "#d8d8d8", F: "#868e96" }, 5);
const SPR_BANDEIRA_ON = MUNDOS.map(function(m) { return spriteDeMapa(MAPA_BANDEIRA, { P: "#d8d8d8", F: m.cor }, 5); });

const SPR_GALHO = spriteDeMapa([
  "..GG..GGG...",
  ".GgGGGGgGG..",
  "NNNNNNNNNNNN",
  ".GGgGGNGgGG.",
  "..GG..N.GG.."
], { G: "#2f9e44", g: "#69db7c", N: "#6b4220" }, 4);

// Decoração em cima do chão (um por mundo). A base fica rente ao topo do chão (y = CHAO).
function decorSelva() {
  const r = criarRng(901);
  const t = telaPixel(46, 26, 2, false);
  const c = { sombra: "#1b6b2c", cor: "#2f9e44", luz: "#74d85c" };
  t.ret(3, 24, 40, 2, "rgba(20,50,10,0.35)");
  // matinhos fora do arbusto
  [[1, 3], [3, 4], [43, 4], [41, 3], [44, 2]].forEach(function(m) {
    for (let k = 0; k < m[1]; k++) t.px(m[0], 25 - k, k === m[1] - 1 ? "#74d85c" : "#2f9e44");
  });
  copaPx(t, r, 11, 17, 8, c);
  copaPx(t, r, 35, 17, 8, c);
  copaPx(t, r, 23, 12, 11, c);
  copaPx(t, r, 17, 19, 7, c);
  copaPx(t, r, 29, 19, 7, c);
  t.ret(8, 24, 31, 2, "#1b6b2c");
  // florzinhas
  [[9, 12, "#ff6b8b"], [20, 6, "#fff3bf"], [30, 11, "#ffa94d"], [37, 15, "#ff8fab"], [14, 17, "#ff8fab"], [26, 18, "#fff3bf"], [24, 9, "#ff6b8b"]].forEach(function(f) {
    t.px(f[0], f[1] - 1, f[2]); t.px(f[0] - 1, f[1], f[2]); t.px(f[0] + 1, f[1], f[2]); t.px(f[0], f[1] + 1, f[2]);
    t.px(f[0], f[1], "#ffd43b");
  });
  return t.c;
}

function decorDeserto() {
  const t = telaPixel(32, 42, 2, false);
  const c = { cor: "#2f9e44", luz: "#7ee08f", sombra: "#1b6b2e", borda: "#0f4a1e", costela: "#25863a" };
  // sombra projetada no chão
  t.ret(6, 40, 24, 2, "rgba(60,30,0,0.3)");
  t.ret(14, 38, 16, 2, "rgba(60,30,0,0.2)");
  function tubo(x, y, w, h) {
    t.ret(x, y, w, h, c.borda);
    t.ret(x + 1, y + 1, w - 2, h - 2, c.cor);
    t.ret(x + 1, y + 1, 1, h - 2, c.luz);
    t.ret(x + w - 2, y + 1, 1, h - 2, c.sombra);
    t.ret(x + 2, y + 1, 1, h - 3, "#4fbe66");
  }
  // braços (por trás)
  t.ret(5, 18, 9, 5, c.borda); t.ret(6, 19, 9, 3, c.cor); t.ret(6, 19, 9, 1, c.luz); t.ret(6, 21, 9, 1, c.sombra);
  tubo(4, 9, 5, 14);
  t.ret(17, 24, 9, 5, c.borda); t.ret(17, 25, 9, 3, c.cor); t.ret(17, 25, 9, 1, c.luz); t.ret(17, 27, 9, 1, c.sombra);
  tubo(23, 15, 5, 14);
  // tronco
  t.ret(12, 4, 8, 3, c.borda); t.ret(13, 3, 6, 2, c.borda);
  tubo(11, 5, 10, 35);
  t.ret(13, 3, 6, 1, c.borda);
  t.ret(14, 4, 4, 1, c.cor); t.ret(13, 5, 6, 1, c.cor);
  [14, 16].forEach(function(x) { for (let y = 6; y < 39; y++) if (y % 4 !== 0) t.px(x, y, c.costela); });
  // espinhos e flor
  [[11, 10], [20, 14], [11, 20], [20, 24], [11, 30], [20, 33], [4, 13], [27, 19], [8, 19], [24, 26]].forEach(function(e) { t.px(e[0] - 1, e[1], "#fff3bf"); });
  t.ret(15, 0, 2, 3, "#ff6b8b"); t.ret(14, 1, 4, 1, "#ff6b8b"); t.px(15, 1, "#ffd43b"); t.px(16, 1, "#ffd43b");
  return t.c;
}

function decorGelo() {
  const t = telaPixel(36, 50, 2, false);
  const c = { tronco: "#4a3328", cor: "#1f5f6e", sombra: "#144552", neve: "#f4faff", neveSombra: "#a9c8e8" };
  // monte de neve na base
  t.ret(2, 47, 32, 3, "#eaf4fe"); t.ret(5, 45, 26, 3, "#f8fcff"); t.ret(10, 44, 16, 2, "#ffffff");
  t.ret(2, 49, 32, 1, "#a9c8e8"); t.ret(21, 47, 13, 1, "#c5daf0");
  pinheiroPx(t, 17, 47, 44, c);
  // pingentes de gelo e neve caindo dos galhos
  [[7, 31], [29, 31], [10, 21], [26, 21]].forEach(function(p) { t.px(p[0], p[1], "#cfe8ff"); t.px(p[0], p[1] + 1, "#9fd0f5"); });
  [[3, 10], [32, 18], [6, 38]].forEach(function(p) { t.px(p[0], p[1], "#ffffff"); });
  return t.c;
}

function decorLava() {
  const r = criarRng(904);
  const t = telaPixel(38, 32, 2, false);
  // brilho do cristal em volta
  for (let i = 4; i >= 1; i--) circuloPx(t, 19, 16, 5 + i * 3, "rgba(255,120,30,0.08)");
  t.ret(2, 30, 34, 2, "rgba(0,0,0,0.3)");
  // pedra de obsidiana em facetas
  poligonoPx(t, [[1, 32], [3, 21], [9, 14], [19, 11], [29, 14], [35, 21], [37, 32]], "#241a38");
  poligonoPx(t, [[1, 32], [3, 21], [9, 14], [15, 13], [13, 32]], "#4a3a68");
  poligonoPx(t, [[9, 14], [19, 11], [29, 14], [22, 19], [15, 19]], "#6d5a90");
  poligonoPx(t, [[29, 14], [35, 21], [37, 32], [27, 32], [22, 19]], "#170f27");
  // arestas com luz
  [[3, 21, 9, 14], [9, 14, 19, 11], [19, 11, 29, 14]].forEach(function(l) {
    const n = Math.max(Math.abs(l[2] - l[0]), Math.abs(l[3] - l[1]));
    for (let i = 0; i <= n; i++) t.px(l[0] + (l[2] - l[0]) * i / n, l[1] + (l[3] - l[1]) * i / n, "#a994c8");
  });
  for (let i = 0; i < 6; i++) t.px(5 + Math.floor(r() * 28), 22 + Math.floor(r() * 9), "#3a2d52");
  // rachadura de magma na pedra
  [[26, 24], [26, 25], [25, 26], [25, 27], [24, 28], [24, 29]].forEach(function(p, i) { t.px(p[0], p[1], i % 2 ? "#ff8a1f" : "#ffd25a"); });
  // cristal grande e dois pequenos
  function cristal(x, topo, w, h, inclina) {
    const base = topo + h;
    const m = w / 2;
    poligonoPx(t, [[x + inclina, topo - 1], [x + m, topo + 3], [x + m, base], [x - m, base], [x - m, topo + 3]], "#ff7a1a");
    poligonoPx(t, [[x + inclina, topo - 1], [x - m, topo + 3], [x - m, base], [x, base], [x, topo + 2]], "#ffd25a");
    poligonoPx(t, [[x + inclina, topo - 1], [x + m, topo + 3], [x + m, base], [x + m - 1, base]], "#c2410c");
    t.px(x + inclina, topo - 1, "#fff6c8");
    t.ret(x - m + 1, topo + 4, 1, Math.max(1, h - 8), "#fff0a0");
  }
  cristal(19, 1, 7, 15, 0);
  cristal(11, 7, 5, 8, -1);
  cristal(27, 8, 5, 7, 1);
  return t.c;
}

const SPR_DECOR = [decorSelva(), decorDeserto(), decorGelo(), decorLava()];

// Ícones dos poderes e melhorias (8x8)
const ICONES = {
  velocidade: spriteDeMapa(["....YY..", "...YY...", "..YY....", ".YYYYYY.", "....YY..", "...YY...", "..YY....", ".Y......"],
    { Y: "#ffd43b" }, 4),
  puloDuplo: spriteDeMapa(["...WW...", "..WWWW..", ".WW..WW.", "...WW...", "..WWWW..", ".WW..WW.", "........", "........"],
    { W: "#74c0fc" }, 4),
  escudo: spriteDeMapa([".BBBBBB.", "BWWBBBBB", "BWBBBBBB", "BBBBBBBB", ".BBBBBB.", ".BBBBBB.", "..BBBB..", "...BB..."],
    { B: "#4dabf7", W: "#d0ebff" }, 4),
  ima: spriteDeMapa(["GG....GG", "RR....RR", "RR....RR", "RR....RR", "RRR..RRR", ".RRRRRR.", "..RRRR..", "........"],
    { R: "#e03131", G: "#ced4da" }, 4),
  nuke: spriteDeMapa(["......Y.", ".....Y..", "...KKK..", "..KKKKK.", ".KKWKKKK", ".KWKKKKK", ".KKKKKKK", "..KKKKK."],
    { K: "#343a40", W: "#868e96", Y: "#ff922b" }, 4),
  dash: spriteDeMapa(["........", "WW..WW..", ".WW..WW.", "..WW..WW", ".WW..WW.", "WW..WW..", "........", "........"],
    { W: "#ffd43b" }, 4),
  coracao1: spriteDeMapa(MAPA_CORACAO, { R: "#e03131", W: "#ffc9c9" }, 4),
  coracao2: spriteDeMapa(MAPA_CORACAO, { R: "#c2255c", W: "#ffc9c9" }, 4),
  revolver: SPR_REVOLVER.d,
  cipoLongo: spriteDeMapa(["..GGGG..", ".G....G.", "G......G", "G......G", ".G....G.", "..GGGG..", "...G....", "..G....."],
    { G: "#40c057" }, 4)
};

// Projéteis
const SPR_PROJ = {
  coco: bolaPixel(6, "#8a5a2b", "#4a2f12", "#c4915a", 2),
  neve: bolaPixel(5, "#ffffff", "#adb5bd", "#ffffff", 2),
  fogo: bolaPixel(6, "#ff922b", "#e8590c", "#ffe066", 2),
  veneno: bolaPixel(6, "#9c36b5", "#5f1a73", "#e599f7", 2),
  bolao: bolaPixel(18, "#f8f9fa", "#adb5bd", "#ffffff", 2),
  meteoro: bolaPixel(10, "#6b4220", "#2b1a0a", "#ff922b", 2),
  podoboo: bolaPixel(8, "#ff6b00", "#c92a2a", "#ffe066", 2),
  pedra: bolaPixel(20, "#868e96", "#343a40", "#ced4da", 2),
  pedrinha: bolaPixel(7, "#868e96", "#343a40", "#ced4da", 2),
  bolaNeve: bolaPixel(14, "#f8f9fa", "#adb5bd", "#ffffff", 2),
  bolaFogo: bolaPixel(5, "#ff922b", "#e8590c", "#ffe066", 2)
};

// Moeda pixelada (6 quadros girando)
function criarMoedaPixelada(t) {
  const larguras = [8, 6, 4, 2, 4, 6];
  const linhas = [4, 6, 8, 8, 8, 8, 6, 4];
  const e = t / 8;
  const c = criarCanvas(t * larguras.length, t);
  const g = c.getContext("2d");

  larguras.forEach(function(w, f) {
    linhas.forEach(function(lw, y) {
      const l = Math.min(lw, w);
      const x = f * 8 + (8 - l) / 2;
      g.fillStyle = "#b8740a";
      g.fillRect(x * e, y * e, l * e, e);
      if (l >= 4 && y > 0 && y < 7) {
        g.fillStyle = "#ffcf2e";
        g.fillRect((x + 1) * e, y * e, (l - 2) * e, e);
      }
    });
    if (w >= 6) {
      g.fillStyle = "#fff3a0";
      g.fillRect((f * 8 + 2) * e, 2 * e, e, 2 * e);
    }
  });
  return c;
}

let moedaFonte = { img: criarMoedaPixelada(MOEDA.tamanho), fw: MOEDA.tamanho, fh: MOEDA.tamanho };

if (MOEDA.imagem) {
  const imgMoeda = new Image();
  imgMoeda.onload = function() {
    moedaFonte = { img: imgMoeda, fw: imgMoeda.naturalWidth / MOEDA.frames, fh: imgMoeda.naturalHeight };
  };
  imgMoeda.src = MOEDA.imagem;
}


// ---------- FUNDOS COM PARALAXE ----------
// Cada mundo tem: um céu fixo (1200x700) e camadas largas (2400 px) que repetem sem emenda e andam
// com a câmera em velocidades diferentes (longe devagar, perto mais rápido). Tudo é desenhado uma
// vez só, em blocos de 4 px (1 pixel lógico), e por quadro só há drawImage.

const ESC_FUNDO = 4;
const LARG_CAMADA = 600;   // em pixels lógicos (600 * 4 = 2400 px)
const ALT_LOGICA = 175;    // 700 / 4

function rgbaDe(hex, a) {
  return "rgba(" + [1, 3, 5].map(function(i) { return parseInt(hex.slice(i, i + 2), 16); }).join(",") + "," + a + ")";
}

function ampliarCanvas(c, k) {
  const e = criarCanvas(c.width * k, c.height * k);
  const g = e.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(c, 0, 0, e.width, e.height);
  return e;
}

// Camada de paralaxe: tela lógica de 600 de largura cobrindo as linhas lógicas y0..y1 da tela
function novaCamada(y0, y1) { return telaPixel(LARG_CAMADA, y1 - y0, 1, false, y0); }
function fecharCamada(t, f) { return { c: ampliarCanvas(t.c, ESC_FUNDO), y: (t.oy === undefined ? 0 : t.oy) * ESC_FUNDO, f: f }; }

function desenharCamada(g, c, y, f, cam) {
  const w = c.width;
  const d = ((Math.round(cam * f) % w) + w) % w;
  g.drawImage(c, -d, y);
  if (w - d < LARGURA) g.drawImage(c, w - d, y);
}

// Gradiente do céu com degraus e tramado (dither), como em pixel art de verdade
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function amostrarCor(paradas, u) {
  for (let i = 0; i < paradas.length - 1; i++) {
    const a = paradas[i], b = paradas[i + 1];
    if (u <= b[0]) return mixar(a[1], b[1], limitar((u - a[0]) / (b[0] - a[0] || 1), 0, 1));
  }
  return paradas[paradas.length - 1][1];
}

function ceuDegrade(t, paradas, yFim, n) {
  n = n || 12;
  const cores = [];
  for (let i = 0; i < n; i++) cores.push(amostrarCor(paradas, i / (n - 1)));
  for (let y = 0; y < t.h; y++) {
    const p = Math.min(1, y / yFim) * (n - 1);
    const i0 = Math.min(n - 2, Math.floor(p)), fr = p - i0;
    let ini = 0, atual = null;
    for (let x = 0; x <= t.w; x++) {
      const c = x < t.w ? (fr > (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? cores[i0 + 1] : cores[i0]) : null;
      if (c !== atual) {
        if (atual) t.ret(ini, y, x - ini, 1, atual);
        atual = c; ini = x;
      }
    }
  }
}

// Perfis periódicos (número inteiro de ciclos em w, então a camada fecha sem emenda)
function perfilSeno(r, w, harm) {
  const fs = harm.map(function(h) { return { c: h[0], a: h[1], f: r() * Math.PI * 2 }; });
  return function(x) {
    let v = 0;
    for (let i = 0; i < fs.length; i++) v += fs[i].a * Math.sin(Math.PI * 2 * fs[i].c * x / w + fs[i].f);
    return v;
  };
}

// Perfil de picos pontudos, de 0 a 1
function perfilPico(r, w, harm) {
  const fs = harm.map(function(h) { return { c: h[0], a: h[1], f: r() * Math.PI * 2 }; });
  let soma = 0;
  fs.forEach(function(f) { soma += f.a; });
  return function(x) {
    let v = 0;
    for (let i = 0; i < fs.length; i++) v += fs[i].a * (1 - Math.abs(Math.sin(Math.PI * fs[i].c * x / w + fs[i].f)));
    return v / soma;
  };
}

// Névoa: vai cobrindo de cor entre y0 e y1 (em degraus)
function nevoaPx(t, y0, y1, cor, amax) {
  for (let y = y0; y < y1; y++) {
    const a = Math.round(amax * ((y - y0) / (y1 - y0)) * 12) / 12;
    if (a > 0) t.ret(0, y, t.w, 1, rgbaDe(cor, a));
  }
}

// Montanhas pontudas com luz de um lado, sombra do outro e (opcional) neve
// p: base, alt, harm, cor, luz, sombra, luzDir (1 = sol à direita), neve: {linha, cor, sombra}
function montanhasPx(t, r, p) {
  const f = perfilPico(r, t.w, p.harm);
  const h = function(x) { return Math.round(p.alt * (0.22 + 0.78 * f(x))); };
  const yFim = t.oy + t.h;
  for (let x = 0; x < t.w; x++) {
    const alt = h(x), topo = p.base - alt;
    const dir = (h(x + 2) - h(x - 2)) * (p.luzDir || 1);
    const face = dir < 0 ? p.luz : dir === 0 ? p.cor : p.sombra;
    const prof = Math.round(alt * 0.6);
    t.ret(x, topo, 1, yFim - topo, p.cor);
    t.ret(x, topo, 1, prof, face);
    // a luz some aos poucos, em degraus tramados
    for (let k = 0; k < 8; k++) {
      if ((BAYER4[((k * 2) & 3) * 4 + (x & 3)] + 0.5) / 16 > k / 8) t.px(x, topo + prof + k, face);
    }
    if (face === p.sombra && p.fenda) {
      for (let y = topo + 3; y < topo + prof; y++) if ((y + x * 2) % 9 === 0) t.px(x, y, p.fenda);
    }
    if (p.neve && topo < p.base - p.neve.linha) {
      const linha = p.base - p.neve.linha;
      const dn = Math.round((linha - topo) * 0.85 + ((x * 7) % 3));
      t.ret(x, topo, 1, dn, dir < 0 ? p.neve.cor : p.neve.sombra);
      t.px(x, topo, p.neve.topo || p.neve.cor);
    }
  }
}

// Dunas / montes arredondados com crista pontuda: lado da luz e lado da sombra
function dunasPx(t, r, p) {
  const f = perfilSeno(r, t.w, p.harm);
  const yFim = t.oy + t.h;
  const topo = function(x) { return Math.round(p.base - p.amp * (1 - Math.abs(Math.sin(f(x))))); };
  for (let x = 0; x < t.w; x++) {
    const y = topo(x);
    const dir = topo(x + 3) - topo(x - 3);
    t.ret(x, y, 1, yFim - y, dir > 0 ? p.sombra : p.luz);
    if (p.rim && dir <= 0) t.px(x, y, p.rim);
  }
}

// Copa de árvore redonda
function copaPx(t, r, cx, cy, rad, c) {
  circuloPx(t, cx, cy, rad, c.sombra);
  circuloPx(t, cx - 1, cy - 1, rad - 1.5, c.cor);
  circuloPx(t, cx - rad * 0.3, cy - rad * 0.35, rad * 0.5, c.luz);
  for (let i = 0; i < rad * 1.4; i++) {
    const a = r() * Math.PI * 2, d = r() * rad * 0.8;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    t.px(x, y, y < cy - rad * 0.2 ? c.luz : y > cy + rad * 0.3 ? c.sombra : c.cor);
  }
}

// Pinheiro em camadas, com neve em cima de cada galho
function pinheiroPx(t, cx, base, alt, c) {
  const n = Math.max(3, Math.round(alt / 6));
  const th = alt / n;
  t.ret(cx, base - 3, 2, 3, c.tronco);
  for (let k = 0; k < n; k++) {
    const yt = base - alt + k * th * 0.82;
    const yb = yt + th * 1.5;
    const hw = 1.6 + (k + 1) * (alt * 0.36 / n);
    poligonoPx(t, [[cx + 1, yt], [cx + 1 + hw, yb], [cx + 1 - hw, yb]], c.cor);
    poligonoPx(t, [[cx + 1, yt], [cx + 1 + hw, yb], [cx + 1, yb]], c.sombra);
    if (c.neve) {
      const yn = yt + (yb - yt) * 0.55, hn = hw * 0.58;
      poligonoPx(t, [[cx + 1, yt - 0.4], [cx + 1 + hn, yn], [cx + 1 - hn, yn]], c.neve);
      poligonoPx(t, [[cx + 1, yt], [cx + 1 + hn, yn], [cx + 1, yn]], c.neveSombra);
      t.ret(cx + 1 - hw + 1, yb - 1, 2, 1, c.neve);
    }
  }
}

// Nuvem em pixel (devolve um canvas já ampliado). cores = do topo para baixo
function nuvemSprite(r, w, h, cores, plana) {
  const t = telaPixel(w, h, 1, false);
  const mascara = [];
  for (let y = 0; y < h; y++) mascara.push(new Array(w).fill(false));
  const n = Math.max(3, Math.round(w / 7));
  const r0 = h * 0.5;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const rad = r0 * (0.55 + 0.55 * Math.sin(Math.PI * u) + r() * 0.25);
    const cx = rad * 0.6 + u * (w - rad * 1.2);
    const cy = plana ? h - 1 - rad * 0.55 : h * 0.5 + (r() - 0.5) * h * 0.25;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * (plana ? 1 : 1.15);
        if (dx * dx + dy * dy <= rad * rad) mascara[y][x] = true;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let topo = -1, fundo = -1;
    for (let y = 0; y < h; y++) if (mascara[y][x]) { if (topo < 0) topo = y; fundo = y; }
    if (topo < 0) continue;
    for (let y = topo; y <= fundo; y++) {
      if (!mascara[y][x]) continue;
      const d = (y - topo) / (fundo - topo + 1);
      let cor = cores[Math.min(cores.length - 1, Math.floor(d * cores.length))];
      if (y === fundo) cor = cores[cores.length - 1];
      t.px(x, y, cor);
    }
  }
  return ampliarCanvas(t.c, ESC_FUNDO);
}

// Lista de nuvens que andam: { c, x, y, v (px por quadro), f (paralaxe) }
function fnNuvens(lista, alfa) {
  return function(g, cam, t) {
    g.globalAlpha = alfa || 1;
    for (let i = 0; i < lista.length; i++) {
      const n = lista[i];
      const span = LARGURA + n.c.width;
      const x = ((((n.x + t * n.v - cam * n.f) % span) + span) % span) - n.c.width;
      g.drawImage(n.c, Math.round(x), n.y);
    }
    g.globalAlpha = 1;
  };
}

function astroPx(t, cx, cy, raio, cores, halo, haloCor) {
  for (let i = 8; i >= 1; i--) circuloPx(t, cx, cy, raio + i * 3, rgbaDe(haloCor, halo));
  circuloPx(t, cx, cy, raio, cores[0]);
  circuloPx(t, cx, cy, raio - 1.5, cores[1]);
  circuloPx(t, cx - raio * 0.15, cy - raio * 0.15, raio * 0.6, cores[2]);
}


// ===== SELVA =====
function montarFundoSelva() {
  const haze = "#cdeff5";
  const ceuT = telaPixel(300, ALT_LOGICA, 1, false);
  ceuDegrade(ceuT, [[0, "#2b86e6"], [0.45, "#5fb6f3"], [0.8, "#a9e3fb"], [1, "#e2f8ff"]], 140);
  astroPx(ceuT, 232, 26, 7, ["#fff0a0", "#fff7c4", "#ffffff"], 0.05, "#fff6b0");

  // nuvens fofas
  const rn = criarRng(501);
  const cores = ["#ffffff", "#f4f9ff", "#e0eefc", "#c3d9f1"];
  const nuvens = [
    { c: nuvemSprite(rn, 46, 15, cores, true), x: 100, y: 70, v: 0.12, f: 0.04 },
    { c: nuvemSprite(rn, 34, 12, cores, true), x: 520, y: 150, v: 0.2, f: 0.06 },
    { c: nuvemSprite(rn, 56, 18, cores, true), x: 880, y: 40, v: 0.09, f: 0.03 },
    { c: nuvemSprite(rn, 28, 10, cores, true), x: 300, y: 250, v: 0.16, f: 0.08 },
    { c: nuvemSprite(rn, 40, 13, cores, true), x: 1050, y: 210, v: 0.1, f: 0.05 }
  ];

  // montanhas distantes azul-esverdeadas
  const longe = novaCamada(60, 160);
  {
    const r = criarRng(502);
    const M = function(c) { return mixar(c, haze, 0.42); };
    montanhasPx(longe, r, {
      base: 150, alt: 80, harm: [[4, 0.6], [6, 0.45], [9, 0.3], [15, 0.2], [23, 0.1]],
      cor: M("#4a9a94"), luz: M("#7fcdbf"), sombra: M("#33787a"), luzDir: 1, fenda: M("#2c6a70")
    });
    nevoaPx(longe, 124, 156, haze, 0.8);
  }

  // colinas com copas redondas
  const meio = novaCamada(80, 175);
  {
    const r = criarRng(503);
    const colina = perfilSeno(r, LARG_CAMADA, [[2, 6], [5, 3.5], [11, 1.5]]);
    const topo = function(x) { return Math.round(132 + colina(x)); };
    const M = function(c) { return mixar(c, haze, 0.16); };
    for (let x = 0; x < LARG_CAMADA; x++) meio.ret(x, topo(x), 1, 175 - topo(x), M("#1a5a32"));
    [0, 1].forEach(function(fila) {
      const k = fila === 0 ? 0.3 : 0;
      const c = {
        cor: mixar(M("#2a8a42"), haze, k), luz: mixar(M("#6fd062"), haze, k), sombra: mixar(M("#195830"), haze, k)
      };
      for (let x = r() * 6; x < LARG_CAMADA; x += 7 + r() * 8) {
        const rad = 6 + r() * 5;
        copaPx(meio, r, x, topo(x) - rad * 0.2 - (fila === 0 ? 7 : 0), rad, c);
      }
    });
    // tronquinhos aparecendo entre as copas
    for (let x = 4; x < LARG_CAMADA; x += 23 + Math.floor(r() * 10)) {
      meio.ret(x, topo(x) - 1, 2, 5, M("#4a3a22"));
    }
    nevoaPx(meio, 138, 160, "#0c2e16", 0.55);
  }

  // folhagem escura na frente
  const perto = novaCamada(112, 175);
  {
    const r = criarRng(504);
    const c = { sombra: "#0c2e16", cor: "#124a22", luz: "#1f7a34" };
    perto.ret(0, 156, LARG_CAMADA, 19, "#0c2e16");
    for (let x = 6; x < LARG_CAMADA; x += 26 + Math.floor(r() * 24)) {
      const folhas = 8 + Math.floor(r() * 4);
      for (let i = 0; i < folhas; i++) {
        const ang = Math.PI * (0.1 + 0.8 * (i / (folhas - 1)));
        const comp = 16 + r() * 16;
        for (let s = 0; s < comp; s++) {
          const fx = x + Math.cos(ang) * s * 1.3, fy = 162 - Math.sin(ang) * s + (s * s) / (comp * 3.2);
          const larg = s < comp * 0.45 ? 3 : s < comp * 0.8 ? 2 : 1;
          perto.ret(fx, fy, larg + 1, larg, c.cor);
          perto.px(fx, fy - 1, i % 2 ? c.luz : c.cor);
          if (s % 3 === 0) perto.px(fx, fy + larg, c.sombra);
        }
      }
      copaPx(perto, r, x + 1, 163, 6 + r() * 3, c);
    }
  }

  // copa do teto e cipós pendurados
  const cipos = novaCamada(0, 70);
  {
    const r = criarRng(505);
    const c = { sombra: "#0c2e16", cor: "#124a22", luz: "#1f7a34" };
    for (let x = 0; x < LARG_CAMADA; x += 6 + Math.floor(r() * 6)) {
      copaPx(cipos, r, x, 0, 5 + r() * 5, c);
    }
    for (let x = 8; x < LARG_CAMADA; x += 14 + Math.floor(r() * 26)) {
      const len = 12 + Math.floor(r() * 44);
      const lado = r() < 0.5 ? 1 : -1;
      for (let y = 4; y < len; y++) {
        const vx = x + Math.round(Math.sin(y / 6 + x) * 1.2);
        cipos.px(vx, y, "#1b5a2a");
        cipos.px(vx + 1, y, "#0f3a1c");
        if (y % 7 === 3) {
          cipos.ret(vx + lado, y, 2 * lado > 0 ? 3 : -2, 2, "#237a35");
          cipos.px(vx + lado * 2, y - 1, "#34a047");
        }
      }
      if (r() < 0.6) {
        const fx = x + Math.round(Math.sin(len / 6 + x) * 1.2);
        cipos.ret(fx - 1, len, 3, 2, "#ff8fab");
        cipos.px(fx, len + 1, "#ffd43b");
      } else {
        cipos.ret(x - 1, len, 3, 3, "#237a35");
      }
    }
  }

  // raios de sol
  const raios = novaCamada(0, 160);
  {
    const r = criarRng(506);
    for (let i = 0; i < 9; i++) {
      const x0 = i * 68 + r() * 28, w0 = 4 + r() * 7;
      for (let y = 0; y < 150; y++) {
        const a = Math.round(0.2 * (1 - y / 150) * (0.6 + 0.4 * ((i * 5) % 3) / 2) * 40) / 40;
        if (a > 0) raios.ret(x0 - y * 0.55, y, w0 + y * 0.05, 1, "rgba(255,250,200," + a + ")");
      }
    }
  }
  const camRaios = fecharCamada(raios, 0.35);

  return {
    ceu: ampliarCanvas(ceuT.c, ESC_FUNDO),
    itens: [
      { fn: fnNuvens(nuvens), sobraImg: true },
      Object.assign(fecharCamada(longe, 0.1), { sobraImg: true }),
      Object.assign(fecharCamada(meio, 0.25), { sobraImg: true }),
      { fn: function(g, cam, t) {
        g.globalAlpha = 0.75 + 0.25 * Math.sin(t / 90);
        desenharCamada(g, camRaios.c, camRaios.y, camRaios.f, cam);
        g.globalAlpha = 1;
      } },
      fecharCamada(perto, 0.5),
      fecharCamada(cipos, 0.5)
    ]
  };
}


// ===== DESERTO =====
function mesaPx(t, cx, base, w, h, c) {
  const th = Math.round(h / 3);
  // talude de pedras caídas
  poligonoPx(t, [[cx - w / 2 - 12, base], [cx - w / 2 + 1, base - th * 1.6], [cx + w / 2 - 1, base - th * 1.6], [cx + w / 2 + 12, base]], c.sombra);
  poligonoPx(t, [[cx + 1, base], [cx + 1, base - th * 1.6], [cx + w / 2 - 1, base - th * 1.6], [cx + w / 2 + 12, base]], c.cor);
  for (let k = 0; k < 3; k++) {
    const wk = Math.round(w * (0.55 + 0.225 * k));
    const y = base - h + k * th;
    const x = cx - wk / 2;
    t.ret(x, y, wk, th + 2, c.cor);
    t.ret(x, y, wk * 0.35, th + 2, c.sombra);
    t.ret(x + wk * 0.8, y, wk * 0.2, th + 2, c.luz);
    t.ret(x, y, wk, 1, c.luz);
    t.ret(x, y + th + 1, wk, 1, c.sombra);
  }
}

function piramidePx(t, cx, base, alt, c) {
  for (let i = 0; i < alt; i++) {
    const hw = Math.round(i * 1.15);
    const y = base - alt + i;
    t.ret(cx - hw, y, hw, 1, c.sombra);
    t.ret(cx, y, hw + 1, 1, c.luz);
    if (i % 4 === 3) {
      t.ret(cx - hw, y, hw, 1, c.sombraLinha);
      t.ret(cx, y, hw + 1, 1, c.luzLinha);
    }
  }
  t.px(cx, base - alt, c.ponta);
  t.px(cx - 1, base - alt + 1, c.ponta);
}

function saguaroPx(t, x, base, h, c) {
  t.ret(x - 1, base - h + 1, 3, h, c.cor);
  t.px(x, base - h, c.cor);
  t.ret(x + 1, base - h + 1, 1, h, c.luz);
  const ya = base - Math.round(h * 0.55);
  t.ret(x - 6, ya, 6, 2, c.cor);
  t.ret(x - 6, ya - 6, 2, 8, c.cor);
  t.px(x - 6, ya - 7, c.cor);
  t.ret(x - 5, ya - 6, 1, 8, c.luz);
  const yb = base - Math.round(h * 0.4);
  t.ret(x + 2, yb, 5, 2, c.cor);
  t.ret(x + 5, yb - 4, 2, 6, c.cor);
  t.px(x + 5, yb - 5, c.cor);
  t.ret(x + 6, yb - 4, 1, 6, c.luz);
}

function ossosPx(t, x, base, c, fundo) {
  // costelas de um bicho grande
  t.ret(x, base - 1, 15, 1, c);
  for (let k = 0; k < 5; k++) {
    const xk = x + 1 + k * 3;
    t.ret(xk, base - 5, 1, 4, c);
    t.px(xk + 1, base - 6, c);
  }
  // crânio com chifre
  t.ret(x + 16, base - 3, 5, 3, c);
  t.px(x + 17, base - 2, fundo);
  t.px(x + 20, base - 4, c); t.px(x + 21, base - 5, c);
  t.px(x + 16, base - 4, c); t.px(x + 15, base - 5, c);
}

function montarFundoDeserto() {
  const haze = "#ffb689";
  const ceuT = telaPixel(300, ALT_LOGICA, 1, false);
  ceuDegrade(ceuT, [[0, "#3b2a78"], [0.22, "#8a3f86"], [0.48, "#e0597a"], [0.74, "#ff9658"], [1, "#ffd27a"]], 140, 14);
  astroPx(ceuT, 205, 112, 16, ["#ffe27a", "#fff0a8", "#fffbe0"], 0.05, "#ffd27a");

  const rn = criarRng(601);
  const cs = ["#ffc4b0", "#ff9aa2", "#e0657f", "#9a3f7a"];
  const nuvens = [
    { c: nuvemSprite(rn, 60, 7, cs, true), x: 150, y: 120, v: 0.1, f: 0.03 },
    { c: nuvemSprite(rn, 44, 6, cs, true), x: 700, y: 200, v: 0.07, f: 0.04 },
    { c: nuvemSprite(rn, 70, 8, cs, true), x: 980, y: 80, v: 0.05, f: 0.02 },
    { c: nuvemSprite(rn, 36, 5, cs, true), x: 420, y: 280, v: 0.09, f: 0.05 }
  ];

  // mesas distantes
  const longe = novaCamada(90, 165);
  {
    const M = function(c) { return mixar(c, haze, 0.52); };
    const c = { cor: M("#b4566a"), luz: M("#d88079"), sombra: M("#8a3f66") };
    mesaPx(longe, 70, 150, 54, 26, c);
    mesaPx(longe, 190, 150, 30, 36, c);
    mesaPx(longe, 330, 150, 70, 22, c);
    mesaPx(longe, 470, 150, 40, 30, c);
    mesaPx(longe, 560, 150, 24, 20, c);
    // dunas bem longe
    dunasPx(longe, criarRng(602), {
      base: 150, amp: 7, harm: [[3, 1.3], [7, 0.5]], sombra: M("#a04a68"), luz: M("#cf7078"), rim: M("#f0a080")
    });
  }

  // pirâmides e dunas
  const meio = novaCamada(90, 175);
  {
    const r = criarRng(603);
    const M = function(c) { return mixar(c, haze, 0.3); };
    const c = {
      sombra: M("#a84a62"), luz: M("#f08a5a"), sombraLinha: M("#963e58"), luzLinha: M("#dc7448"), ponta: "#ffd9a0"
    };
    piramidePx(meio, 150, 142, 40, c);
    piramidePx(meio, 215, 142, 22, c);
    piramidePx(meio, 420, 142, 30, c);
    dunasPx(meio, r, { base: 148, amp: 9, harm: [[2, 0.9], [4, 0.7], [9, 0.25]], sombra: M("#9a3f5c"), luz: M("#e87c58"), rim: M("#ffb078") });
    dunasPx(meio, r, { base: 160, amp: 8, harm: [[3, 0.8], [5, 0.5], [10, 0.2]], sombra: M("#842f50"), luz: M("#d4644e"), rim: M("#f59a68") });
  }

  // dunas escuras com cactos e ossos
  const perto = novaCamada(110, 175);
  {
    const r = criarRng(604);
    dunasPx(perto, r, { base: 156, amp: 12, harm: [[2, 0.8], [4, 0.6], [9, 0.2]], sombra: "#5e2b4e", luz: "#8a3f58", rim: "#c25c5a" });
    const sil = { cor: "#3a1a40", luz: "#6c3448" };
    [40, 150, 270, 340, 470, 560].forEach(function(x, i) {
      saguaroPx(perto, x, 156 + (i % 2) * 2, 13 + (i % 3) * 4, sil);
    });
    ossosPx(perto, 95, 158, "#6c3448", "#5e2b4e");
    ossosPx(perto, 405, 160, "#6c3448", "#5e2b4e");
  }

  return {
    ceu: ampliarCanvas(ceuT.c, ESC_FUNDO),
    itens: [
      { fn: fnNuvens(nuvens, 0.9), sobraImg: false },
      fecharCamada(longe, 0.1),
      fecharCamada(meio, 0.25),
      fecharCamada(perto, 0.5)
    ]
  };
}


// ===== ERA DO GELO =====
function montarFundoGelo() {
  const haze = "#a6cdee";
  const ceuT = telaPixel(300, ALT_LOGICA, 1, false);
  ceuDegrade(ceuT, [[0, "#081433"], [0.35, "#143676"], [0.7, "#4a86c8"], [1, "#c3e3f7"]], 140);
  const rs = criarRng(701);
  const estrelas = [];
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rs() * 300), y = Math.floor(rs() * rs() * 95);
    ceuT.px(x, y, rgbaDe("#ffffff", 0.3 + 0.4 * (1 - y / 95)));
    if (i < 8) estrelas.push([x * 4, y * 4, rs() * 6]);
  }
  astroPx(ceuT, 60, 30, 7, ["#e6efff", "#f4f8ff", "#ffffff"], 0.045, "#c0d8ff");
  [[58, 28, 2], [63, 33, 1.5], [57, 34, 1]].forEach(function(c) { circuloPx(ceuT, c[0], c[1], c[2], "#c6d6ee"); });

  // aurora boreal: duas faixas largas que correm devagar pela tela
  function faixaAurora(semente, yBase, cores, fase) {
    const t = novaCamada(5, 105);
    const r = criarRng(semente);
    for (let x = 0; x < LARG_CAMADA; x++) {
      const u = (x / LARG_CAMADA) * Math.PI * 2;
      const yc = yBase + 9 * Math.sin(3 * u + fase) + 5 * Math.sin(7 * u + fase * 2) + 3 * Math.sin(13 * u);
      const esp = 17 + 5 * Math.sin(4 * u + 1);
      const raio = 0.62 + 0.38 * Math.sin(23 * u + fase) * Math.sin(5 * u + 2);
      for (let y = Math.floor(yc - esp); y <= yc + 3; y++) {
        const k = (y - (yc - esp)) / (esp + 3);
        if (k <= 0) continue;
        let a = Math.pow(k, 1.7) * (k < 0.88 ? 1 : (1 - k) / 0.12) * raio * 0.6;
        a = Math.round(a * 16) / 16;
        if (a <= 0) continue;
        t.px(x, y, rgbaDe(k > 0.65 ? cores[0] : k > 0.35 ? cores[1] : cores[2], a));
      }
    }
    return fecharCamada(t, 0);
  }
  const auroraA = faixaAurora(702, 40, ["#5dffb0", "#33e0c8", "#7a8cff"], 0.4);
  const auroraB = faixaAurora(703, 56, ["#b58cff", "#6fa8ff", "#5dffd0"], 2.3);

  // montanhas nevadas com sombra azul
  const longe = novaCamada(55, 165);
  {
    const r = criarRng(704);
    const M = function(c) { return mixar(c, haze, 0.5); };
    montanhasPx(longe, r, {
      base: 150, alt: 88, harm: [[4, 0.6], [6, 0.45], [9, 0.3], [15, 0.2], [23, 0.1]],
      cor: M("#52709f"), luz: M("#7d9fcf"), sombra: M("#33497d"), luzDir: -1, fenda: M("#2a3f72"),
      neve: { linha: 36, cor: "#f6fbff", sombra: M("#a9c4e8"), topo: "#ffffff" }
    });
    nevoaPx(longe, 118, 156, haze, 0.8);
  }

  // morros de neve com fileira de pinheiros longe
  const meio = novaCamada(95, 175);
  {
    const r = criarRng(705);
    const M = function(c) { return mixar(c, haze, 0.32); };
    dunasPx(meio, r, { base: 140, amp: 8, harm: [[2, 0.8], [5, 0.5], [9, 0.25]], sombra: M("#9dbde4"), luz: M("#e6f1fc"), rim: "#ffffff" });
    const c = { tronco: M("#3a3f55"), cor: M("#2f6a8a"), sombra: M("#24506e"), neve: M("#eaf6ff"), neveSombra: M("#a6c4e4") };
    for (let x = 4; x < LARG_CAMADA; x += 9 + Math.floor(r() * 10)) {
      pinheiroPx(meio, x, 146, 12 + Math.floor(r() * 8), c);
    }
    dunasPx(meio, r, { base: 156, amp: 8, harm: [[3, 0.7], [6, 0.4], [11, 0.2]], sombra: M("#8fb2dd"), luz: M("#dcecfa"), rim: "#ffffff" });
    nevoaPx(meio, 128, 160, haze, 0.35);
  }

  // pinheiros grandes nevados e montes de neve na frente
  const perto = novaCamada(105, 175);
  {
    const r = criarRng(706);
    const c = { tronco: "#3a2f3c", cor: "#1f4d66", sombra: "#163a50", neve: "#f0f8ff", neveSombra: "#a9c6e6" };
    [30, 128, 205, 322, 440, 530].forEach(function(x, i) {
      pinheiroPx(perto, x, 160, 32 + (i % 3) * 7, c);
    });
    dunasPx(perto, r, { base: 166, amp: 10, harm: [[2, 0.8], [5, 0.5], [9, 0.2]], sombra: "#aac8e8", luz: "#f4faff", rim: "#ffffff" });
  }

  return {
    ceu: ampliarCanvas(ceuT.c, ESC_FUNDO),
    itens: [
      { fn: function(g, cam, t) {
        for (let i = 0; i < estrelas.length; i++) {
          const e = estrelas[i];
          const a = Math.max(0, Math.sin(t / 22 + e[2] * 3));
          if (a < 0.2) continue;
          g.fillStyle = "rgba(255,255,255," + (a * 0.8).toFixed(2) + ")";
          g.fillRect(e[0] - 4, e[1], 12, 4);
          g.fillRect(e[0], e[1] - 4, 4, 12);
        }
      } },
      { fn: function(g, cam, t) {
        g.globalAlpha = 0.75 + 0.25 * Math.sin(t / 70);
        let d = ((Math.round(t * 0.35 + cam * 0.02) % 2400) + 2400) % 2400;
        g.drawImage(auroraA.c, -d, auroraA.y + Math.round(Math.sin(t / 110) * 8));
        g.drawImage(auroraA.c, 2400 - d, auroraA.y + Math.round(Math.sin(t / 110) * 8));
        g.globalAlpha = 0.65 + 0.35 * Math.sin(t / 95 + 2);
        d = ((Math.round(2400 - t * 0.22 + cam * 0.03) % 2400) + 2400) % 2400;
        g.drawImage(auroraB.c, -d, auroraB.y + Math.round(Math.sin(t / 130 + 1) * 8));
        g.drawImage(auroraB.c, 2400 - d, auroraB.y + Math.round(Math.sin(t / 130 + 1) * 8));
        g.globalAlpha = 1;
      } },
      fecharCamada(longe, 0.1),
      fecharCamada(meio, 0.25),
      fecharCamada(perto, 0.5)
    ]
  };
}


// ===== VULCÃO DE LAVA =====
function vulcaoPx(t, cx, apexY, hwCratera, hwBase, baseY, c) {
  const topo = function(a) {
    if (a <= hwCratera) return apexY;
    return apexY + Math.pow((a - hwCratera) / (hwBase - hwCratera), 0.72) * (baseY - apexY);
  };
  for (let dx = -hwBase; dx <= hwBase; dx++) {
    const a = Math.abs(dx);
    const y = Math.round(topo(a));
    t.ret(cx + dx, y, 1, baseY + 12 - y, dx < 0 ? c.sombra : c.cor);
    if (a > hwCratera) t.px(cx + dx, y, dx < 0 ? c.cor : c.luz);
  }
  // cratera brilhando
  t.ret(cx - hwCratera, apexY - 1, hwCratera * 2 + 1, 1, c.luz);
  t.ret(cx - hwCratera + 1, apexY, hwCratera * 2 - 1, 1, "#ffd25a");
  t.ret(cx - hwCratera + 2, apexY + 1, hwCratera * 2 - 3, 1, "#ff8a1f");
  // rios de lava
  [[-0.35, 0], [0.45, 7], [0.05, 14]].forEach(function(rio, i) {
    for (let y = apexY + 1; y < baseY; y++) {
      const p = (y - apexY) / (baseY - apexY);
      if (p < rio[1] / 100) continue;
      const a = hwCratera * 0.7 + Math.pow(p, 1.3) * (hwBase - hwCratera) * 0.85;
      const x = Math.round(cx + Math.sign(rio[0] || 1) * a * Math.abs(rio[0]) * 1.4 + Math.sin(y * 0.5 + i) * 1.5);
      const larg = p < 0.5 ? 1 : 2;
      t.px(x - 1, y, "#8a2a10");
      t.ret(x, y, larg, 1, "#e8590c");
      if ((y + i * 3) % 5 === 0) t.px(x, y, "#ffb02e");
    }
  });
}

function pinaculoPx(t, r, cx, base, w, h, c) {
  let hw = 1;
  for (let i = 0; i < h; i++) {
    const alvo = (w / 2) * Math.pow((i + 1) / h, 0.7);
    hw = Math.max(1, Math.round(alvo + (r() < 0.35 ? (r() < 0.5 ? 1 : -1) : 0)));
    const y = base - h + i;
    const k = Math.max(0, (i / h - 0.5) / 0.5);
    t.ret(cx - hw, y, hw * 2, 1, mixar(c.cor, c.brasa, k * 0.45));
    t.px(cx - hw, y, c.sombra);
    t.px(cx + hw - 1, y, c.rim);
    t.px(cx + hw - 2, y, c.rim2);
    if (r() < 0.1) t.px(cx - hw + 2, y, c.sombra);
    if (r() < 0.05) t.px(cx + 1, y, c.rim2);
  }
}

function rochaPx(t, r, cx, base, w, h, c) {
  const rr = [];
  for (let x = 0; x < w; x++) {
    const u = x / (w - 1);
    rr.push(Math.round(h * Math.pow(Math.sin(Math.PI * u), 0.6) + (r() < 0.25 ? 1 : 0)));
  }
  for (let x = 0; x < w; x++) {
    const y = base - rr[x];
    t.ret(cx - w / 2 + x, y, 1, rr[x] + 1, c.cor);
    t.px(cx - w / 2 + x, y, c.luz);
    if (x < w - 1 && rr[x] > rr[x + 1]) t.px(cx - w / 2 + x, y + 1, c.luz);
    t.px(cx - w / 2 + x + (x > w / 2 ? 0 : 0), base, c.sombra);
  }
  // rachaduras brilhando
  for (let k = 0; k < 2; k++) {
    let x = cx - w / 2 + 3 + r() * (w - 6), y = base - 1;
    const alto = 3 + r() * (h - 3);
    for (let s = 0; s < alto; s++) {
      t.px(x, y, s % 3 === 0 ? "#ffd25a" : "#ff7a1a");
      t.px(x + 1, y, "#8a2a10");
      y -= 1; x += Math.floor(r() * 3) - 1;
    }
  }
}

function montarFundoLava() {
  const haze = "#8a2c1a";
  const ceuT = telaPixel(300, ALT_LOGICA, 1, false);
  ceuDegrade(ceuT, [[0, "#0c0309"], [0.4, "#2a0912"], [0.75, "#6b1a10"], [1, "#d0501a"]], 140);

  // nuvens de fumaça iluminadas por baixo
  const rn = criarRng(801);
  const cs = ["#241014", "#321519", "#471b1a", "#7a2c18", "#d4601e"];
  const nuvens = [
    { c: nuvemSprite(rn, 56, 16, cs, false), x: 80, y: 90, v: 0.06, f: 0.04 },
    { c: nuvemSprite(rn, 44, 12, cs, false), x: 520, y: 180, v: 0.08, f: 0.05 },
    { c: nuvemSprite(rn, 64, 18, cs, false), x: 900, y: 40, v: 0.05, f: 0.03 },
    { c: nuvemSprite(rn, 36, 10, cs, false), x: 300, y: 270, v: 0.07, f: 0.06 },
    { c: nuvemSprite(rn, 50, 14, cs, false), x: 1040, y: 220, v: 0.09, f: 0.05 }
  ];

  // vulcão enorme com rio de lava, outro menor e cadeia de montanhas
  const longe = novaCamada(40, 170);
  const cratera = { x: 190, y: 62 };
  {
    const r = criarRng(802);
    const M = function(c) { return mixar(c, haze, 0.4); };
    montanhasPx(longe, r, {
      base: 150, alt: 38, harm: [[4, 0.6], [7, 0.4], [12, 0.2]],
      cor: M("#3a1620"), luz: M("#582830"), sombra: M("#26101a"), luzDir: -1
    });
    vulcaoPx(longe, 480, 100, 6, 62, 150, { cor: M("#4a1c26"), sombra: M("#2c1019"), luz: M("#7a3434") });
    vulcaoPx(longe, cratera.x, cratera.y, 13, 118, 150, { cor: "#431a24", sombra: "#2a0f18", luz: "#8a3a30" });
    // lago de lava na base
    for (let x = 0; x < LARG_CAMADA; x++) {
      const y = 148 + Math.round(Math.sin(x * 0.3) * 0.5);
      longe.ret(x, y, 1, 22, "#c2410c");
      longe.px(x, y, "#ff9a2e");
      if (x % 7 === 0) longe.px(x, y + 2, "#ffd25a");
    }
    nevoaPx(longe, 138, 150, "#c2410c", 0.5);
  }

  // pináculos de rocha com borda iluminada
  const meio = novaCamada(90, 175);
  {
    const r = criarRng(803);
    const c = { cor: "#26111c", sombra: "#140910", rim: "#ff7a1a", rim2: "#b8380f", brasa: "#9a2c10" };
    [[30, 58, 24], [95, 38, 18], [170, 68, 22], [240, 44, 20], [310, 60, 26], [385, 34, 16], [450, 64, 22], [520, 46, 20], [575, 54, 22]].forEach(function(p) {
      pinaculoPx(meio, r, p[0], 150, p[2], p[1], c);
    });
    // chão de rocha com brilho de lava
    for (let x = 0; x < LARG_CAMADA; x++) {
      const y = 148 + Math.round(2 * Math.sin(x * 0.21) + Math.sin(x * 0.07));
      meio.ret(x, y, 1, 175 - y, "#1e0f18");
      meio.px(x, y, "#7a2a16");
    }
    nevoaPx(meio, 135, 160, "#9a2c10", 0.35);
  }

  // rochas escuras com rachaduras brilhando
  const perto = novaCamada(120, 175);
  {
    const r = criarRng(804);
    const c = { cor: "#180c13", luz: "#6a3a44", sombra: "#0a0508" };
    perto.ret(0, 156, LARG_CAMADA, 19, "#0e070b");
    for (let x = 12; x < LARG_CAMADA; x += 28 + Math.floor(r() * 24)) {
      rochaPx(perto, r, x, 160, 22 + Math.floor(r() * 16), 14 + Math.floor(r() * 14), c);
    }
  }

  const brilho = telaPixel(300, 90, 1, false);
  for (let y = 0; y < 90; y++) {
    const a = Math.round(Math.pow(y / 90, 1.5) * 0.55 * 24) / 24;
    if (a > 0) brilho.ret(0, y, 300, 1, "rgba(255,90,10," + a + ")");
  }
  const brilhoC = ampliarCanvas(brilho.c, ESC_FUNDO);

  // brilho redondo da cratera
  const halo = criarCanvas(400, 300);
  {
    const g = halo.getContext("2d");
    const gr = g.createRadialGradient(200, 150, 5, 200, 150, 190);
    gr.addColorStop(0, "rgba(255,170,60,0.75)");
    gr.addColorStop(0.35, "rgba(255,90,20,0.32)");
    gr.addColorStop(1, "rgba(255,60,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 400, 300);
  }

  const camLonge = fecharCamada(longe, 0.1);
  const brasas = [];
  for (let i = 0; i < 18; i++) brasas.push({ x: (i * 211) % 1200, v: 0.5 + (i % 5) * 0.22, f: (i * 137) % 600, s: i % 3 === 0 ? 6 : 4 });

  return {
    ceu: ampliarCanvas(ceuT.c, ESC_FUNDO),
    itens: [
      { fn: fnNuvens(nuvens, 0.95) },
      Object.assign(camLonge, {}),
      { fn: function(g, cam, t) {
        // brilho pulsando em volta da cratera
        const span = 2400;
        const x = ((((cratera.x * 4) - cam * 0.1) % span) + span) % span;
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 0.75 + 0.25 * Math.sin(t / 40) * Math.sin(t / 97);
        g.drawImage(halo, Math.round(x - 200), cratera.y * 4 - 150);
        g.drawImage(halo, Math.round(x - 200 - span), cratera.y * 4 - 150);
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";
      } },
      fecharCamada(meio, 0.25),
      { fn: function(g, cam, t) {
        // brasas subindo
        for (let i = 0; i < brasas.length; i++) {
          const b = brasas[i];
          const y = 660 - ((t * b.v + b.f) % 560);
          const x = ((b.x + Math.sin(t / 50 + i) * 14 - cam * 0.35) % 1200 + 1200) % 1200;
          const a = Math.min(1, (y - 100) / 200);
          g.fillStyle = (i % 2 ? "rgba(255,176,46," : "rgba(255,107,0,") + a.toFixed(2) + ")";
          g.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, b.s, b.s);
        }
      } },
      fecharCamada(perto, 0.5),
      { fn: function(g, cam, t) {
        g.globalAlpha = 0.8 + 0.2 * Math.sin(t / 55);
        g.drawImage(brilhoC, 0, 700 - brilhoC.height);
        g.globalAlpha = 1;
      } }
    ]
  };
}


// ---------- DESENHO DO FUNDO ----------

const FUNDO_MUNDO = [montarFundoSelva(), montarFundoDeserto(), montarFundoGelo(), montarFundoLava()];

// Imagem opcional da Selva (FUNDO_SELVA_URL): se carregar, entra no lugar do céu e das camadas de longe
let imgFundoSelvaOk = null;

// Desenha o fundo inteiro do mundo (1200x700) no contexto g.
// cam = posição horizontal da câmera no mundo (px), t = contador de quadros (60 por segundo)
function desenharFundoMundo(g, mundo, cam, t) {
  const F = FUNDO_MUNDO[mundo];
  cam = cam || 0;
  t = t || 0;
  const imagem = mundo === 0 ? imgFundoSelvaOk : null;
  if (imagem) {
    const fx = Math.round(cam * 0.3) % LARGURA;
    g.drawImage(imagem, -fx, 0);
    g.drawImage(imagem, LARGURA - fx, 0);
  } else {
    g.drawImage(F.ceu, 0, 0);
  }
  for (let i = 0; i < F.itens.length; i++) {
    const it = F.itens[i];
    if (imagem && it.sobraImg) continue;
    if (it.fn) it.fn(g, cam, t);
    else desenharCamada(g, it.c, it.y, it.f, cam);
  }
}

// "Foto" estática de cada fundo (1200x700), caso algum lugar precise
const FUNDOS = MUNDOS.map(function(m, i) {
  const c = criarCanvas(LARGURA, ALTURA);
  desenharFundoMundo(c.getContext("2d"), i, 0, 0);
  return c;
});

const imgFundoSelva = new Image();
imgFundoSelva.onload = function() {
  const c = criarCanvas(LARGURA, ALTURA);
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(imgFundoSelva, 0, 0, LARGURA, ALTURA);
  imgFundoSelvaOk = c;
  const f = FUNDOS[0].getContext("2d");
  f.clearRect(0, 0, LARGURA, ALTURA);
  desenharFundoMundo(f, 0, 0, 0);
};
imgFundoSelva.src = FUNDO_SELVA_URL;


// Imagem do jogador (skin "Original")
if (IMAGEM_PERSONAGEM) {
  imgPersonagem.onload = function() {
    personagemOk = true;
    montarSprites();
    if (typeof aoMudarVisual === "function") aoMudarVisual();
  };
  imgPersonagem.onerror = function() {
    const i = SKINS.findIndex(function(s) { return s.imagem; });
    if (i >= 0) SKINS.splice(i, 1);
    if (save.equip.skin === "original") save.equip.skin = SKINS[0].id;
    montarSprites();
    if (typeof aoMudarVisual === "function") aoMudarVisual();
  };
  imgPersonagem.src = IMAGEM_PERSONAGEM;
}

montarSprites();
