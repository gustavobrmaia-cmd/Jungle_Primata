"use strict";

// =========================
// ARTE EM PIXEL (tudo é desenhado uma vez só em canvas escondidos)
// =========================

// ---------- MACACO (grade 20x20, cada pixel vira 4x4 = 80x80) ----------
// D contorno, F pelo, S pelo na sombra, L pelo com luz, P pele, Q pele na sombra, R bochecha/língua,
// B barriga, C barriga na sombra, G barriga com luz, W/E olho (W = brilho), M boca
// A cabeça fica nas linhas 3-13 (olhos nas linhas 8-9), o corpo nas 14-18 e os pés na 19:
// os cosméticos e os detalhes das skins são desenhados em cima dessas posições fixas.
// Cada pose é montada em camadas (cauda, braços de trás, tronco, cabeça, pernas, braços da frente).

// Um "bloco" é [linha, coluna, "texto"]; "." é transparente
function mirarBloco(b) {
  const troca = { L: "F", F: "S", S: "F" };
  const t = b[2].split("").reverse().map(function(c) { return troca[c] || c; }).join("");
  return [b[0], 20 - b[1] - b[2].length, t];
}
function espelharBlocos(lista) { return lista.map(mirarBloco); }

const CABECA = [
  [3, 0, ".......DDDDDD......."],
  [4, 0, ".....DDLLLFFSDD....."],
  [5, 0, "....DLLLFFFFFFSD...."],
  [6, 0, ".DD.DLLFFFFFFFSSD.DD."],
  [7, 0, "DPRDFFPPPFFPPPFSDRPD"],
  [8, 0, "DPRDFPPPPPPPPPPSDRPD"],
  [9, 0, ".DDDFPPPPPPPPPPSDDD."],
  [10, 0, "...DFPRPPPPPPRPSD..."],
  [11, 0, "....DFPPPPPPPPSD...."],
  [12, 0, ".....DFPPPPPPSD....."],
  [13, 0, "......DDDDDDDD......"]
];

const TRONCO = [
  [14, 5, "DFFBBBBFSD"],
  [15, 5, "DFGGBBBCSD"],
  [16, 5, "DFBBBBCCSD"],
  [17, 5, "DFFBBBBSSD"]
];

// Olhos (dx desloca o olhar de lado), narizes e bocas
function olhos(tipo, dx) {
  dx = dx || 0;
  const a = 6 + dx;
  const b = 12 + dx;
  switch (tipo) {
    case "fechados": return [[9, a, "DD"], [9, b, "DD"]];
    case "felizes": return [[8, a - 1, ".DD."], [9, a - 1, "D..D"], [8, b - 1, ".DD."], [9, b - 1, "D..D"]];
    case "surpresos": return [[8, a, "WW"], [9, a, "WE"], [8, b, "WW"], [9, b, "WE"]];
    case "dor": return [[7, a - 1, "D"], [8, a, "DD"], [9, a - 1, "D"], [7, b + 2, "D"], [8, b, "DD"], [9, b + 2, "D"]];
    case "x": return [[7, a - 1, "D.D"], [8, a, "D"], [9, a - 1, "D.D"], [7, b, "D.D"], [8, b + 1, "D"], [9, b, "D.D"]];
    case "determinado": return [[7, a, "DD"], [7, b, "DD"], [8, a, "WE"], [9, a, "EE"], [8, b, "WE"], [9, b, "EE"]];
    default: return [[8, a, "WE"], [9, a, "EE"], [8, b, "WE"], [9, b, "EE"]];
  }
}

function boca(tipo, dx) {
  dx = dx || 0;
  switch (tipo) {
    case "reta": return [[11, 8 + dx, "MMMM"]];
    case "aberta": return [[11, 7 + dx, "MWWWWM"], [12, 7 + dx, "MMRRMM"]];
    case "oh": return [[11, 9 + dx, "MM"], [12, 9 + dx, "MM"]];
    case "grito": return [[11, 7 + dx, "MMMMMM"], [12, 7 + dx, "MRRRRM"]];
    case "bocejo": return [[11, 8 + dx, "MMMM"], [12, 8 + dx, "MRRM"]];
    case "lingua": return [[11, 8 + dx, "MMMM"], [12, 10 + dx, "RR"]];
    default: return [[11, 7 + dx, "M"], [11, 12 + dx, "M"], [12, 8 + dx, "MMMM"]];
  }
}

function nariz(dx) { return [[10, 9 + (dx || 0), "QQ"]]; }

// Braços (esquerdo); o direito é o espelho (a luz vem da esquerda)
const BRACOS = {
  baixo: [[14, 3, "DD"], [15, 2, "DLFD"], [16, 2, "DLFD"], [17, 2, "DPPD"], [18, 3, "DD"]],
  tras: [[14, 3, "DD"], [15, 2, "DLFD"], [16, 1, "DLFD"], [17, 0, "DPPD"], [18, 1, "DD"]],
  bomba: [[12, 1, "DD"], [13, 0, "DPPD"], [14, 0, "DLFD"], [15, 0, "DLFFD"], [16, 1, "DDFFD"], [17, 3, "DDD"]],
  cima: [[10, 0, "DD"], [11, 0, "DPPD"], [12, 0, "DLFD"], [13, 1, "DLFD"], [14, 2, "DLFD"], [15, 3, "DFD"]],
  abre: [[14, 2, "DDDD"], [15, 0, "DPPFFD"], [16, 0, "DDDDDD"]],
  // lá em cima, atrás da cabeça (comemoração e espreguiçar)
  alto: [[1, 0, "DDDD"], [2, 0, "DPPD"], [3, 0, "DPPD"], [4, 0, "DLFD"], [5, 0, "DLFD"], [6, 0, "DLFD"], [7, 0, "DLFD"], [8, 0, "DLFD"], [9, 0, "DLFD"], [10, 0, "DLFD"], [11, 0, "DLFD"], [12, 1, "DLFD"], [13, 2, "DLFD"], [14, 3, "DFD"]],
  // segurando o cipó
  pendura: [[0, 0, "DDDD"], [1, 0, "DPPD"], [2, 0, "DPPD"], [3, 0, "DLFD"], [4, 0, "DLFD"], [5, 0, "DLFD"], [6, 0, "DLFD"], [7, 0, "DLFD"], [8, 0, "DLFD"], [9, 0, "DLFD"], [10, 0, "DLFD"], [11, 0, "DLFD"], [12, 1, "DLFD"], [13, 2, "DLFD"], [14, 3, "DFD"]]
};

// Braços só do lado direito (olhando para a direita)
const BRACOS_D = {
  mira: [[14, 14, "DDDDD"], [15, 14, "DFFPPD"], [16, 14, "DSSPPD"], [17, 15, "DDDD"]],
  recuo: [[12, 14, "DDDDD"], [13, 14, "DFFPPD"], [14, 14, "DSSPPD"], [15, 15, "DDDD"]],
  coca2: [[3, 15, "DDDD"], [4, 15, "DPPD"], [5, 16, "DPPD"], [6, 16, "DFSD"], [7, 16, "DFSD"], [8, 16, "DFSD"], [9, 16, "DFSD"], [10, 16, "DFSD"], [11, 16, "DFSD"], [12, 15, "DFSD"], [13, 14, "DFSD"], [14, 14, "DFSD"], [15, 14, "DFSD"]],
  coca: [[3, 14, "DDDD"], [4, 14, "DPPD"], [5, 15, "DPPD"], [6, 16, "DFSD"], [7, 16, "DFSD"], [8, 16, "DFSD"], [9, 16, "DFSD"], [10, 16, "DFSD"], [11, 16, "DFSD"], [12, 15, "DFSD"], [13, 14, "DFSD"], [14, 14, "DFSD"], [15, 14, "DFSD"]]
};

// Pernas
const PERNAS = {
  em_pe: [[18, 5, "DFFDDDDFSD"], [19, 4, "DPPPD..DPPPD"]],
  abrir: [[18, 4, "DFFDDDDDDFSD"], [19, 2, "DPPPD"], [19, 13, "DPPPD"]],
  esq_alta: [[18, 5, "DPPDDDDFSD"], [19, 11, "DPPPD"]],
  dir_alta: [[18, 5, "DFFDDDDPPD"], [19, 4, "DPPPD"]],
  agachar: [[18, 3, "DFFDDDDDDDDFFD"], [19, 1, "DPPPD"], [19, 14, "DPPPD"]],
  encolhe: [[18, 5, "DPPDDDDPPD"]],
  topo: [[18, 4, "DPPD"], [18, 8, "DDDD"], [18, 12, "DPPD"]],
  queda: [[18, 5, "DFFDDDDFSD"], [19, 5, "DPPD..DPPD"]],
  chute: [[16, 14, "DDDDDD"], [17, 14, "DFFFPP"], [18, 14, "DDDDDD"], [18, 5, "DFFDDDDDDD"], [19, 4, "DPPPD"]],
  frente: [[18, 7, "DFFDDDDFSD"], [19, 7, "DPPD..DPPD"]],
  tras: [[18, 3, "DFFDDDDFSD"], [19, 3, "DPPD..DPPD"]]
};

// Grade do macaco: 24 x 20. O corpo fica nas 20 colunas do meio; as 2 de cada lado
// sobram para a cauda fazer a curva (ela fica do lado de trás: à esquerda olhando para a direita).
const LARG_PRIMATA = 24;
const MARGEM_PRIMATA = 2;

// Cauda desenhada pixel a pixel (grade de 24 colunas, a partir da coluna 0).
// Sai de trás do quadril, sobe em S pelo lado de trás e termina num gancho na altura do ombro.
function cauda(linhaInicial, mapa) {
  return mapa.map(function(l, i) { return [linhaInicial + i, 0, l]; });
}
const CAUDA_EM_PE = cauda(10, [
  ".DDD..",
  "DFLFD.",
  "DFDSD.",
  "DFDDD.",
  "DFD...",
  "DFD...",
  "DSFD..",
  ".DSFD.",
  "..DSFD",
  "...DD."
]);
const CAUDAS = {
  repouso: CAUDA_EM_PE,
  alta: CAUDA_EM_PE,
  // correndo e pulando: mais baixa, esticada para trás
  baixa: cauda(13, [
    ".DDD..",
    "DFLFD.",
    "DFDSD.",
    "DFDDD.",
    "DSFD..",
    ".DSFDD",
    "..DDD."
  ]),
  // chutando e atirando: enroladinha embaixo
  enrolada: cauda(14, [
    ".DDD..",
    "DFLFD.",
    "DFDSD.",
    "DSDDD.",
    ".DSFDD",
    "..DDD."
  ])
};

function montarPose(d) {
  const g = [];
  for (let y = 0; y < 20; y++) g.push(new Array(LARG_PRIMATA).fill("."));
  // as partes do corpo foram desenhadas numa grade de 20: entram deslocadas pela margem
  const poe = function(lista, ox) {
    ox = ox === undefined ? MARGEM_PRIMATA : ox;
    lista.forEach(function(b) {
      for (let i = 0; i < b[2].length; i++) {
        const c = b[2][i];
        const x = b[1] + i + ox;
        if (c !== "." && x >= 0 && x < LARG_PRIMATA && b[0] >= 0 && b[0] < 20) g[b[0]][x] = c;
      }
    });
  };
  const dx = d.dx || 0;
  poe(d.cauda || CAUDAS.repouso, 0);
  poe(d.atras || []);
  poe(d.tronco || TRONCO);
  poe(CABECA);
  poe(nariz(dx));
  poe(olhos(d.olhos, dx));
  poe(boca(d.boca, dx));
  poe(d.pernas || PERNAS.em_pe);
  const bE = d.bracoE || BRACOS.baixo;
  poe(bE);
  poe(d.bracoD || espelharBlocos(bE));
  return g.map(function(l) { return l.join(""); });
}

const TRONCO_R = [
  [14, 5, "DFBBBBBSSD"],
  [15, 5, "DFGGBBBCSD"],
  [16, 5, "DFBBBBBCSD"],
  [17, 5, "DFFBBBBSSD"]
];

const BD = BRACOS_D;
const ESP = espelharBlocos;
const POSES = {
  // ----- parado e divertimentos -----
  parado: {},
  respira: { tronco: TRONCO_R },
  piscar: { olhos: "fechados" },
  olhar1: { dx: -1 },
  olhar2: { dx: 1 },
  coca1: { olhos: "felizes", bracoD: BD.coca },
  coca2: { olhos: "felizes", boca: "aberta", bracoD: BD.coca2 },
  bocejo: { olhos: "fechados", boca: "bocejo", bracoE: [], bracoD: [], atras: BRACOS.alto.concat(ESP(BRACOS.alto)) },
  // ----- andar / correr -----
  andar1: { bracoE: BRACOS.tras, bracoD: ESP(BRACOS.bomba), pernas: PERNAS.esq_alta },
  andar2: { bracoE: BRACOS.bomba, bracoD: ESP(BRACOS.tras), pernas: PERNAS.dir_alta },
  corre1: { bracoE: BRACOS.tras, bracoD: ESP(BRACOS.bomba), pernas: PERNAS.abrir },
  corre2: { bracoE: BRACOS.bomba, bracoD: ESP(BRACOS.bomba), pernas: PERNAS.esq_alta, cauda: CAUDAS.baixa },
  corre3: { bracoE: BRACOS.bomba, bracoD: ESP(BRACOS.tras), pernas: PERNAS.abrir },
  corre4: { bracoE: BRACOS.bomba, bracoD: ESP(BRACOS.bomba), pernas: PERNAS.dir_alta, cauda: CAUDAS.baixa },
  // ----- ar -----
  pulo: { olhos: "determinado", boca: "oh", bracoE: BRACOS.cima, pernas: PERNAS.encolhe, cauda: CAUDAS.baixa },
  impulso: { olhos: "determinado", boca: "oh", bracoE: BRACOS.tras, pernas: PERNAS.queda, cauda: CAUDAS.baixa },
  topo: { olhos: "felizes", bracoE: BRACOS.abre, pernas: PERNAS.topo },
  queda: { olhos: "surpresos", boca: "oh", bracoE: BRACOS.cima, pernas: PERNAS.queda, cauda: CAUDAS.alta },
  aterrissa: { bracoE: BRACOS.abre, pernas: PERNAS.agachar, cauda: CAUDAS.baixa },
  deslizar: { olhos: "determinado", boca: "aberta", bracoE: BRACOS.tras, pernas: PERNAS.queda },
  dash: { olhos: "determinado", boca: "grito", bracoE: BRACOS.tras, pernas: PERNAS.tras, cauda: CAUDAS.baixa },
  // ----- cipó -----
  pendurado: { bracoE: BRACOS.pendura, pernas: PERNAS.queda, cauda: CAUDAS.baixa },
  balancoF: { bracoE: BRACOS.pendura, pernas: PERNAS.frente, boca: "aberta", cauda: CAUDAS.alta },
  balancoT: { bracoE: BRACOS.pendura, pernas: PERNAS.tras, boca: "aberta", cauda: CAUDAS.baixa },
  // ----- ação -----
  chute: { olhos: "determinado", boca: "grito", bracoE: BRACOS.abre, pernas: PERNAS.chute, cauda: CAUDAS.enrolada },
  chute2: { olhos: "determinado", boca: "reta", bracoE: BRACOS.bomba, pernas: PERNAS.chute, cauda: CAUDAS.enrolada },
  tiro: { olhos: "determinado", boca: "reta", bracoD: BD.mira, cauda: CAUDAS.enrolada },
  tiro2: { olhos: "determinado", boca: "reta", bracoD: BD.recuo, cauda: CAUDAS.enrolada },
  laco: { olhos: "determinado", boca: "aberta", bracoD: BD.mira, cauda: CAUDAS.enrolada },
  // ----- emoções -----
  vitoria: { olhos: "felizes", boca: "aberta", bracoE: [], bracoD: [], atras: BRACOS.alto.concat(ESP(BRACOS.alto)) },
  vitoria2: { olhos: "felizes", boca: "aberta", bracoE: BRACOS.cima, bracoD: ESP(BRACOS.bomba), pernas: PERNAS.abrir },
  dano: { olhos: "dor", boca: "grito", bracoE: BRACOS.bomba, pernas: PERNAS.abrir, cauda: CAUDAS.alta },
  morte: { olhos: "x", boca: "lingua", bracoE: BRACOS.abre, pernas: PERNAS.abrir }
};

const MAPAS_POSE = {};
Object.keys(POSES).forEach(function(nome) { MAPAS_POSE[nome] = montarPose(POSES[nome]); });

const imgPersonagem = new Image();
let personagemOk = false;

// Cores da skin, com sombra/luz do pelo calculadas sozinhas
function paletaSkin(skin, corPelo) {
  const p = Object.assign({}, CORES_BASE, skin.cores);
  if (corPelo) p.F = corPelo;
  p.S = !corPelo && skin.cores.S ? skin.cores.S : escurecer(p.F, 0.25);
  p.L = !corPelo && skin.cores.L ? skin.cores.L : clarear(p.F, 0.22);
  p.Q = escurecer(p.P, 0.14);
  p.C = escurecer(p.B, 0.14);
  p.G = clarear(p.B, 0.3);
  // bochecha opaca (mistura rosada sobre a pele), senão o fundo aparece pelo buraco
  p.R = skin.cores.R || misturarCor(p.P, [255, 105, 120], 0.4);
  return p;
}

// Desenha o macaco centralizado e com os pés na borda de baixo do canvas
function desenharPrimata(g, equip, escala, pose) {
  const W = g.canvas.width;
  const H = g.canvas.height;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);
  const ox = Math.round((W / escala - LARG_PRIMATA) / 2);   // em pixels da grade
  const oy = Math.round(H / escala - 20);
  const oc = ox + MARGEM_PRIMATA;                          // onde começa o corpo (grade de 20)

  const skin = buscarItem("skin", equip.skin) || SKINS[0];

  if (skin.imagem && personagemOk) {
    // Sua imagem, encaixada no quadrado do corpo sem esticar
    const tam = 20 * escala;
    const s = Math.min(tam / imgPersonagem.naturalWidth, tam / imgPersonagem.naturalHeight);
    const w = imgPersonagem.naturalWidth * s;
    const h = imgPersonagem.naturalHeight * s;
    g.drawImage(imgPersonagem, oc * escala + (tam - w) / 2, oy * escala + tam - h, w, h);
  } else {
    const base = skin.imagem ? buscarItem("skin", "classico") : skin;
    const mapa = MAPAS_POSE[pose || "parado"];
    if (base.faixas) {
      for (let y = 0; y < mapa.length; y++) {
        pintarMapa(g, [mapa[y]], paletaSkin(base, base.faixas[y % base.faixas.length]), escala, ox, oy + y);
      }
    } else {
      pintarMapa(g, mapa, paletaSkin(base), escala, ox, oy);
    }
    if (base.detalhe) pintarMapa(g, base.detalhe.mapa, base.detalhe.cores, escala, oc, oy + base.detalhe.y);
  }

  CAMADAS.forEach(function(tipo) {
    const item = equip[tipo] && buscarItem(tipo, equip[tipo]);
    if (item) pintarMapa(g, item.mapa, item.cores, escala, oc, oy + item.y);
  });
}

const SPRITES_PRIMATA = {};

function montarSprites() {
  Object.keys(POSES).forEach(function(pose) {
    const c = criarCanvas(LARG_PRIMATA * 4, 80);   // 96 x 80
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
// Cada inimigo tem vários quadros de animação, todos do MESMO tamanho (a caixa de colisão sai desse tamanho).
// SPR_INIMIGO[tipo] = { d, e, w, h,            primeiro quadro (direita / esquerda), como sempre
//                       quadros: [{ d, e }],   todos os quadros
//                       poses: { nome: { q: [índices], v: ticks por quadro } },
//                       morto: { d, e } }      mesmo desenho com olhos de "X" (morto, esmagado, chutado)
// Os desenhos são feitos por código numa grade de letras (g*) e ganham contorno automático.

const SPR_INIMIGO = {};

function gGrade(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill("."));
  return g;
}

function gPonto(g, x, y, ch) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch;
}

function gRet(g, x, y, w, h, ch) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) gPonto(g, x + i, y + j, ch);
}

// Elipse cheia; ch pode ser uma letra ou uma função (u, v, x, y) com u,v de -1 a 1 dentro da elipse
function gElipse(g, cx, cy, rx, ry, ch) {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) gPonto(g, x, y, typeof ch === "function" ? ch(u, v, x, y) : ch);
    }
  }
}

// Bola com luz de cima: tons = "base luz sombra brilho"
function gBola(g, cx, cy, rx, ry, tons) {
  const b = tons[0], l = tons[1], d = tons[2], h = tons[3] || tons[1];
  const grande = rx * ry > 10;
  gElipse(g, cx, cy, rx, ry, function(u, v) {
    if (grande && Math.hypot(u + 0.38, v + 0.52) < 0.2) return h;
    const t = -(0.28 * u + 0.82 * v);
    if (t > 0.36) return l;
    if (t < -0.42) return d;
    return b;
  });
}

// Bloco de pedra/caixa com cantos cortados: luz em cima e à esquerda, sombra embaixo e à direita
function gBloco(g, x, y, w, h, tons) {
  const b = tons[0], l = tons[1], d = tons[2];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue;
      let c = b;
      if (j === 0 || (i === 0 && j < h - 1)) c = l;
      else if (j === h - 1 || i === w - 1) c = d;
      gPonto(g, x + i, y + j, c);
    }
  }
}

// Traço grosso com raio que vai de r0 a r1 (cobra, rabos, penas, patas)
function gFio(g, x0, y0, x1, y1, r0, r1, ch) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = Math.max(0.5, r0 + (r1 - r0) * t);
    gElipse(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, ch);
  }
}

// Linha de 1 pixel
function gLinha(g, x0, y0, x1, y1, ch) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    gPonto(g, x0, y0, ch);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

// Polígono cheio (pontos [x, y])
function gPoli(g, pts, ch) {
  let ymin = 1e9, ymax = -1e9;
  for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
  for (let y = Math.floor(ymin); y <= Math.ceil(ymax); y++) {
    const yy = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort(function(p, q) { return p - q; });
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
        gPonto(g, x, y, typeof ch === "function" ? ch(x, y) : ch);
      }
    }
  }
}

// Cola um pedaço de mapa de letras ("." = transparente, "_" = apaga)
function gPeca(g, x, y, mapa) {
  for (let j = 0; j < mapa.length; j++) {
    for (let i = 0; i < mapa[j].length; i++) {
      const c = mapa[j][i];
      if (c === ".") continue;
      gPonto(g, x + i, y + j, c === "_" ? "." : c);
    }
  }
}

// Borda de luz em cima e de sombra embaixo de uma região de uma letra só (formas livres)
function gBorda(g, base, luz, sombra, grossura) {
  const copia = g.map(function(l) { return l.slice(); });
  const vaza = function(x, y) { return y < 0 || y >= g.length || x < 0 || x >= g[0].length || copia[y][x] === "."; };
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if (copia[y][x] !== base) continue;
      if (luz !== "." && vaza(x, y - 1)) g[y][x] = luz;
      else if (sombra !== "." && (vaza(x, y + 1) || (grossura > 1 && vaza(x, y + 2)))) g[y][x] = sombra;
    }
  }
}

// Troca uma letra por outra só onde a condição vale
function gTroca(g, de, para, cond) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (g[y][x] === de && (!cond || cond(x, y))) g[y][x] = para;
}

// Pontinhos de textura (rochas, pelos) sempre iguais para a mesma semente
function gRuido(g, semente, de, para, prob) {
  const r = criarRng(semente);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (g[y][x] === de && r() < prob) g[y][x] = para;
}

// Contorno de 1 pixel em volta de tudo; sel muda a cor do contorno conforme a letra vizinha
function gContorno(g, ch, sel) {
  const h = g.length, w = g[0].length;
  const copia = g.map(function(l) { return l.slice(); });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (copia[y][x] !== ".") continue;
      const viz = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (const v of viz) {
        if (v[0] < 0 || v[0] >= w || v[1] < 0 || v[1] >= h) continue;
        const c = copia[v[1]][v[0]];
        if (c !== ".") { g[y][x] = (sel && sel[c]) || ch; break; }
      }
    }
  }
}

function gMapa(g) {
  return g.map(function(l) { return l.join(""); });
}

function gCurva(p0, p1, p2, t) {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
}

// Registra um inimigo: quadros = lista de mapas (ou um mapa só); opc.poses, opc.olhos (centros dos olhos para o "X")
function registrarInimigo(tipo, quadros, paleta, escala, opc) {
  opc = opc || {};
  if (typeof quadros[0] === "string") quadros = [quadros];
  const lista = quadros.map(function(q) { return spriteDuplo(q, paleta, escala); });
  const s = { d: lista[0].d, e: lista[0].e, w: lista[0].w, h: lista[0].h, quadros: lista, poses: opc.poses || {} };
  // quadro "morto": olhos de X
  const base = lista[opc.quadroMorto || 0].d;
  const m = criarCanvas(base.width, base.height);
  const g = m.getContext("2d");
  g.drawImage(base, 0, 0);
  (opc.olhos || []).forEach(function(o) {
    g.fillStyle = "#1a1018";
    g.fillRect((o[0] - 1) * escala, (o[1] - 1) * escala, escala * 3, escala * 3);
    g.fillStyle = "#ffffff";
    [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]].forEach(function(p) {
      g.fillRect((o[0] - 1 + p[0]) * escala, (o[1] - 1 + p[1]) * escala, escala, escala);
    });
  });
  s.morto = { d: m, e: espelhar(m) };
  SPR_INIMIGO[tipo] = s;
  TIPOS_INIMIGO[tipo].w = s.w;
  TIPOS_INIMIGO[tipo].h = s.h;
}

// atalho para descrever uma animação: P(ticks por quadro, ...quadros)
function P(v) { return { v: v, q: Array.prototype.slice.call(arguments, 1) }; }


// ---------- Selva ----------

// Cobra 24x18: corpo ondulando no chão, pescoço erguido, capelo e língua
function quadroCobra(f, lingua) {
  const g = gGrade(24, 18);
  const fase = f * Math.PI / 2;
  const N = 36;
  // corpo, do rabo até o pescoço
  const corpo = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = 1.5 + t * 12.5;
    const amp = 0.4 + 1.0 * t;
    const y = 13.1 + Math.sin(x * 0.7 - fase) * amp * 0.9;
    corpo.push([x, y, 0.8 + 1.5 * Math.pow(t, 0.7)]);
  }
  corpo.forEach(function(p) { gElipse(g, p[0], p[1], p[2], p[2], "B"); });
  // pescoço levantado
  for (let i = 0; i <= 14; i++) {
    const p = gCurva([13.5, 13], [17.2, 12.8], [16.2, 6.6], i / 14);
    gElipse(g, p[0], p[1], 2.3 - i * 0.02, 2.3 - i * 0.02, "B");
  }
  // losangos escuros nas costas
  corpo.forEach(function(p, i) { if (i % 6 === 2 && i > 3) gElipse(g, p[0], p[1] - 0.2, 1.1, 1.1, "M"); });
  gBorda(g, "B", "L", "D", 1);
  // capelo e cabeça
  gBola(g, 16, 6.4, 3.4, 4.4, "BLDH");
  gElipse(g, 16, 6.4, 1.6, 2.6, "M");
  gBola(g, 18.6, 4.8, 3.2, 2.5, "BLDH");
  // garganta clara
  for (let y = 5; y < 13; y++) for (let x = 12; x < 22; x++) if (g[y][x] !== "." && g[y][x + 1] === "." && x > 15 && (g[y][x] === "B" || g[y][x] === "D" || g[y][x] === "L")) g[y][x] = "P";
  gPonto(g, 20, 6, "P"); gPonto(g, 19, 6, "P"); gPonto(g, 21, 5, "P");
  // olho (amarelo com pupila vertical)
  gPonto(g, 18, 3, "Y"); gPonto(g, 19, 3, "Y"); gPonto(g, 18, 4, "Y"); gPonto(g, 19, 4, "E");
  gPonto(g, 19, 3, "E");
  // narina
  gPonto(g, 21, 4, "K");
  // língua
  if (lingua === 1) { gPonto(g, 22, 6, "R"); gPonto(g, 23, 6, "R"); }
  if (lingua === 2) { gPonto(g, 22, 6, "R"); gPonto(g, 23, 6, "R"); gPonto(g, 24 - 1, 5, "R"); gPonto(g, 23, 7, "R"); }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("cobra", [
  quadroCobra(0, 0), quadroCobra(1, 1), quadroCobra(2, 2), quadroCobra(3, 0)
], { K: "#12361c", D: "#1f7a35", B: "#40c057", L: "#8ce99a", H: "#d3f9d8", M: "#2b8a3e", P: "#f3e9a8", Y: "#ffd43b", E: "#111111", R: "#e03131" }, 2, {
  poses: { parado: P(8, 0, 1, 2, 3), andar: P(7, 0, 1, 2, 3) },
  olhos: [[18, 4]]
});

// Sapo 24x15: sentado, coaxando, agachado, no ar
function quadroSapo(pose) {
  const g = gGrade(24, 15);
  const T = "BLDH";
  const pul = pose === "pulo", qda = pose === "queda", ag = pose === "agachar";
  if (pul || qda) {
    // pernas esticadas para trás (pulo) ou abertas (queda)
    if (pul) { gFio(g, 8, 7, 1.5, 11.5, 2, 1.2, "B"); gElipse(g, 2.5, 12, 2.4, 1, "D"); }
    else { gFio(g, 8, 8, 3, 10, 2.2, 1.4, "B"); gFio(g, 3, 10, 5, 12.5, 1.4, 1, "B"); gElipse(g, 6, 13, 2.8, 1, "D"); }
    gBola(g, 12, 7, 7.5, 4, T);
    gBola(g, 17.5, 6.2, 4.6, 3.4, T);
    if (pul) { gFio(g, 17, 9, 22, 10, 1.2, 1, "B"); gElipse(g, 22, 10.4, 1.6, 1, "D"); }
    else { gFio(g, 17, 9, 20, 12, 1.5, 1.1, "B"); gElipse(g, 21, 12.6, 2, 0.9, "D"); }
    gElipse(g, 12, 9.5, 5, 1.6, "P");
    gElipse(g, 18, 3.8, 2.4, 2.3, "B"); gElipse(g, 18.5, 3.8, 1.8, 1.8, "W");
    gRet(g, 19, 3, 2, 2, "E"); gPonto(g, 19, 3, "W");
    // boca aberta ao cair
    if (qda) { gRet(g, 18, 8, 5, 1, "M"); gPonto(g, 22, 8, "R"); }
    else { gRet(g, 19, 7, 4, 1, "M"); }
  } else {
    const dy = ag ? 2 : 0;       // agachado: tudo desce
    const alto = ag ? 3.3 : 4.4;
    // pata de trás
    gBola(g, 6.5, 10.4 + dy * 0.5, 4.6, ag ? 3.2 : 3.4, T);
    gElipse(g, 10, 12.7, 3.6, 1.1, "D"); gPonto(g, 12, 12, "B");
    // corpo
    gBola(g, 11.5, 8.4 + dy, 8.2, alto, T);
    gBola(g, 17, 7.6 + dy, 5.2, 3.7, T);
    // barriga e papo
    gElipse(g, 13, 11.2 + dy * 0.2, 5.6, 1.5, "P");
    if (pose === "coaxar") { gBola(g, 19.2, 10.2, 2.9, 2.3, "PQQQ"); gElipse(g, 19.2, 10.2, 2.9, 2.3, function(u, v) { return v < 0.2 ? "Q" : "P"; }); }
    // pata da frente
    gBola(g, 17, 11.6, 2.2, 1.7, T);
    gElipse(g, 19.4, 12.8, 2.2, 0.9, "D");
    // olho
    const ey = 3.7 + dy;
    gElipse(g, 14, ey + 0.6, 1.8, 1.8, "D");
    gElipse(g, 17.8, ey, 2.7, 2.6, "B");
    gElipse(g, 18.3, ey, 2.1, 2.1, "W");
    gRet(g, 18, ey - 1, 2, 3, "E"); gPonto(g, 18, ey - 1, "W");
    // boca
    gRet(g, 18, 8 + dy, 5, 1, "M");
    gPonto(g, 23 - 1, 7 + dy, "B");
    // manchas
    gPonto(g, 8, 6 + dy, "S"); gPonto(g, 9, 6 + dy, "S"); gPonto(g, 11, 5 + dy, "S"); gPonto(g, 12, 5 + dy, "S"); gPonto(g, 10, 7 + dy, "S");
  }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("sapo", [
  quadroSapo("parado"), quadroSapo("coaxar"), quadroSapo("agachar"), quadroSapo("pulo"), quadroSapo("queda")
], { K: "#143d1f", D: "#2b8a3e", B: "#51cf66", L: "#9be8a3", H: "#e0fbd5", P: "#e9fac8", Q: "#f4a8b5", S: "#2f9e44", M: "#7a1f1f", R: "#e03131", W: "#ffffff", E: "#111111" }, 2, {
  poses: { parado: P(40, 0, 1), agachar: P(1, 2), pulo: P(1, 3), queda: P(1, 4) },
  olhos: [[18, 4]]
});

// Abelha 21x15: asas batendo rápido
function quadroAbelha(f) {
  const g = gGrade(22, 15);
  // asas (duas, uma atrás da outra): no alto, meio, para baixo, meio
  const A = [[3.2, 3.4], [4.6, 3], [7.4, 2.2], [4.6, 3]][f];
  gElipse(g, 7.2, A[0] + 0.6, 2.4, A[1] - 0.2, "C");
  gElipse(g, 11.4, A[0], 3.2, A[1], "C");
  gElipse(g, 11.2, A[0] - 0.8, 1.4, Math.max(1, A[1] - 2), "W");
  // corpo: abdômen listrado, tórax e cabeça
  gBola(g, 8.4, 9.8, 5.2, 3.7, "YLOH");
  for (const x0 of [5, 9]) for (let y = 5; y < 14; y++) for (let x = x0; x < x0 + 2; x++) if ("YLOH".indexOf(g[y][x]) >= 0) g[y][x] = "S";
  gBola(g, 13.6, 9.6, 3.3, 3.2, "YLOH");
  gBola(g, 16.8, 9.4, 3.2, 3, "FLOH");
  // olho grande
  gElipse(g, 18.2, 9, 1.6, 2, "E");
  gPonto(g, 17, 8, "W"); gPonto(g, 18, 8, "W"); gPonto(g, 18, 10, "H");
  // sorriso
  gPonto(g, 19, 12, "M"); gPonto(g, 20, 11, "M");
  // ferrão
  gPoli(g, [[3.6, 8.9], [0.8, 10.4], [3.6, 10.9]], "T");
  // perninhas
  gPonto(g, 8, 13, "K"); gPonto(g, 11, 13, "K"); gPonto(g, 14, 13, "K");
  gContorno(g, "K", { C: "N", W: "N" });
  // antenas (depois do contorno, para ficarem finas)
  gLinha(g, 16, 5, 17, 3, "K"); gLinha(g, 17, 3, 19, 2, "K"); gPonto(g, 20, 2, "O"); gPonto(g, 20, 1, "K");
  gLinha(g, 14, 6, 14, 3, "K"); gPonto(g, 13, 2, "K"); gPonto(g, 14, 2, "K");
  return gMapa(g);
}

registrarInimigo("abelha", [0, 1, 2, 3].map(quadroAbelha),
  { K: "#2a1a00", T: "#8a6200", N: "#4a7dbf", S: "#2a1a00", Y: "#ffd43b", L: "#ffe680", O: "#e8a300", H: "#fff7c2", F: "#ffe27a", W: "#ffffff", C: "#cfe8ff", E: "#1b1b1b", M: "#7a3b00" }, 2, {
  poses: { voar: P(2, 0, 1, 2, 3), parado: P(2, 0, 1, 2, 3) },
  olhos: [[18, 9]]
});

// Macaco Ladrão 21x21: máscara de bandido, rabo enrolado, joga cocos
function quadroMacaco(pose) {
  const g = gGrade(21, 21);
  const T = "BLDH";
  const respira = pose === "respira" ? 1 : 0;
  const carrega = pose === "carregar", atira = pose === "atirar";
  // rabo
  for (let i = 0; i <= 14; i++) {
    const p = gCurva([5.5, 17.5], [-1.5, 17], [1.2, 9.5], i / 14);
    gElipse(g, p[0] + 1.2, p[1], 1.3, 1.3, "B");
  }
  gBorda(g, "B", "L", "D", 1);
  gElipse(g, 2.6, 10.4, 1.4, 1.4, "L");
  // pernas e pés
  gBola(g, 8, 18, 2.4, 1.6, T); gBola(g, 13.4, 18, 2.4, 1.6, T);
  gElipse(g, 8.8, 19.3, 2.8, 1, "F"); gElipse(g, 14.2, 19.3, 2.8, 1, "F");
  // braço de trás
  gFio(g, 7.2, 12.6 + respira, 6.2, 16.6, 1.4, 1.3, "D");
  gElipse(g, 6.2, 17, 1.4, 1.2, "F");
  // corpo e barriga
  gBola(g, 10.5, 14.4 + respira * 0.5, 4.8, 4.6, T);
  gElipse(g, 11.4, 15 + respira * 0.5, 2.8, 3.4, "F");
  gElipse(g, 11.4, 16.3 + respira * 0.5, 2.4, 1.6, "f");
  gElipse(g, 11.4, 14.4 + respira * 0.5, 2.5, 2.6, "F");
  // cabeça
  const hy = 6.2 + respira;
  gBola(g, 5.2, hy - 0.4, 2.1, 2.1, T); gElipse(g, 5.6, hy - 0.4, 1.1, 1.2, "F");
  gBola(g, 16.4, hy - 0.4, 2.1, 2.1, T); gElipse(g, 16, hy - 0.4, 1.1, 1.2, "F");
  gBola(g, 10.8, hy, 5.4, 4.7, T);
  gElipse(g, 9.2, hy + 1.5, 2.7, 2.3, "F"); gElipse(g, 12.6, hy + 1.5, 2.7, 2.3, "F");
  gElipse(g, 11.2, hy + 3, 3.3, 1.9, "F");
  gElipse(g, 11.2, hy + 3.8, 2.8, 1.1, "f");
  // máscara
  gRet(g, 6, hy - 1, 10, 3, "M"); gPonto(g, 5, hy, "M"); gPonto(g, 16, hy, "M");
  gRet(g, 7, hy - 1, 3, 3, "W"); gRet(g, 12, hy - 1, 3, 3, "W");
  gRet(g, 9, hy - 1, 1, 3, "E"); gRet(g, 14, hy - 1, 1, 3, "E");
  gPonto(g, 7, hy - 1, "H"); gPonto(g, 12, hy - 1, "H");
  gPonto(g, 11, hy + 1, "M"); gPonto(g, 12, hy + 1, "M");   // nariz
  // boca
  if (atira) { gRet(g, 9, hy + 3, 5, 2, "R"); gRet(g, 9, hy + 3, 5, 1, "W"); gRet(g, 10, hy + 4, 3, 1, "S"); }
  else if (carrega) { gRet(g, 9, hy + 3, 5, 1, "R"); gPonto(g, 8, hy + 2, "R"); gPonto(g, 14, hy + 2, "R"); }
  else { gRet(g, 9, hy + 3, 4, 1, "R"); gPonto(g, 13, hy + 2, "R"); }
  // braço da frente
  if (atira) {
    gFio(g, 14, 12, 18.6, 10.2, 1.4, 1.3, "B");
    gElipse(g, 19.4, 10, 1.5, 1.6, "F"); gPonto(g, 20, 8, "F"); gPonto(g, 20, 12, "F");
  } else if (carrega) {
    gFio(g, 14.4, 12, 17.6, 8, 1.5, 1.3, "B");
    gBola(g, 17.6, 3.4, 2.8, 2.8, "QqOh");
    gPonto(g, 16, 3, "o"); gPonto(g, 17, 3, "o"); gPonto(g, 16.5, 4.5, "o");
    gElipse(g, 17.6, 6, 1.6, 1.5, "F");
  } else {
    gFio(g, 14.4, 12.6 + respira, 15.4, 17, 1.4, 1.3, "B");
    gElipse(g, 15.6, 17.4, 1.5, 1.3, "F");
  }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("macacoLadrao", [
  quadroMacaco("parado"), quadroMacaco("respira"), quadroMacaco("carregar"), quadroMacaco("atirar")
], { K: "#2a1810", D: "#5a3a22", B: "#8a5a36", L: "#b98652", H: "#dcb27a", F: "#f1cfa3", f: "#d5a979", M: "#241c2e", W: "#ffffff", E: "#111111", R: "#d6336c", S: "#7a1d3d",
     Q: "#6d4a2b", q: "#a9794a", O: "#432a14", h: "#d9a86f", o: "#2a1808" }, 2, {
  poses: { parado: P(34, 0, 1), carregar: P(1, 2), atirar: P(1, 3) },
  olhos: [[9, 7], [14, 7]]
});

// Aranha 21x15: vista de frente, pendurada no fio; as pernas mexem
function quadroAranha(pose) {
  const g = gGrade(21, 15);
  const T = "BLDH";
  const alerta = pose === "alerta";
  // corpo
  gBola(g, 10.5, 9, 4.8, 4.6, T);
  gPoli(g, [[8.4, 6.4], [12.6, 6.4], [11.4, 9], [12.6, 11.6], [8.4, 11.6], [9.6, 9]], "R");   // ampulheta
  gElipse(g, 10.5, 9, 0.9, 0.9, "r");
  gBola(g, 10.5, 4.6, 3.6, 2.9, T);
  // olhos
  gRet(g, 8, 3, 2, 3, "W"); gRet(g, 11, 3, 2, 3, "W");
  gRet(g, 9, 4, 1, 2, "E"); gRet(g, 11, 4, 1, 2, "E");
  gPonto(g, 8, 3, "H");
  gPonto(g, 7, 2, "R"); gPonto(g, 14, 2, "R"); gPonto(g, 9, 2, "R"); gPonto(g, 12, 2, "R");
  // presas
  gPonto(g, 9, 7, "F"); gPonto(g, 12, 7, "F");
  if (alerta) { gPonto(g, 9, 8, "F"); gPonto(g, 12, 8, "F"); gPonto(g, 8, 7, "F"); gPonto(g, 13, 7, "F"); }
  gContorno(g, "K");
  // pernas (depois do contorno, finas): âncora, joelho, pé
  const A = pose === "a" ? 1 : pose === "b" ? -1 : 0;
  const pernas = [
    [[7, 5], [3, 1.5 - (alerta ? 1 : 0) + A], [0.5, 5 + A]],
    [[6.3, 7], [2, 4 + (alerta ? -1 : 0) - A], [0.5, 9]],
    [[6, 9], [1.5, 7 + A * 0.5], [0.5, 12.6 + (alerta ? 1 : 0)]],
    [[6.7, 10.6], [3, 10.4 - A], [2, 14]]
  ];
  pernas.forEach(function(p, i) {
    const lado = i % 2 === 0 ? A : -A;
    const k = [p[1][0] + lado * 0.5, p[1][1] + (lado > 0 ? -1 : lado < 0 ? 1 : 0) * 0.5];
    for (const s of [1, -1]) {
      const X = function(x) { return s > 0 ? x : 20 - x; };
      gLinha(g, X(p[0][0]), p[0][1], X(k[0]), k[1], "Z");
      gLinha(g, X(k[0]), k[1], X(p[2][0]), p[2][1], "Z");
      gPonto(g, X(k[0]), k[1], "z");
    }
  });
  return gMapa(g);
}

registrarInimigo("aranha", [
  quadroAranha("a"), quadroAranha("m"), quadroAranha("b"), quadroAranha("m"), quadroAranha("alerta")
], { K: "#140f1f", D: "#2a2040", B: "#4a3b6b", L: "#6e5a9a", H: "#a190d1", R: "#e03131", r: "#ff8787", W: "#ffffff", E: "#111111", F: "#f1e9d2", Z: "#54428a", z: "#9c88d8" }, 2, {
  poses: { parado: P(8, 0, 1, 2, 1), descendo: P(1, 4), subindo: P(5, 0, 1, 2, 1) },
  olhos: [[8, 4], [12, 4]]
});

// ---------- Deserto ----------

// Escorpião 27x18: anda balançando o ferrão, pinças abrindo e fechando
function quadroEscorpiao(f) {
  const g = gGrade(27, 18);
  const T = "BLDH";
  const bal = [0, 1, 0, -1][f];          // balanço do rabo
  const pinca = [0, 1, 1, 0][f];         // pinça aberta
  // rabo em contas, curvado por cima do corpo
  const cauda = [[6.2, 11.6], [3.8, 9.6], [3.2, 6.6 + bal * 0.4], [4.6, 3.8 + bal * 0.6], [7.8, 2.6 + bal], [10.6, 3.8 + bal]];
  const seg = [];
  for (let i = 0; i < cauda.length - 1; i++) {
    for (let t = 0; t < 1; t += 0.4) seg.push([cauda[i][0] + (cauda[i + 1][0] - cauda[i][0]) * t, cauda[i][1] + (cauda[i + 1][1] - cauda[i][1]) * t]);
  }
  seg.forEach(function(p, i) { gBola(g, p[0], p[1], 1.55, 1.55, i % 2 ? "LHBH" : "BLDH"); });
  // ferrão: bulbo e gancho
  const fim = cauda[cauda.length - 1];
  gBola(g, fim[0] + 1.6, fim[1] + 1.4, 1.9, 1.9, "CcnH");
  gPoli(g, [[fim[0] + 0.8, fim[1] + 2.8], [fim[0] + 2.4, fim[1] + 2.8], [fim[0] + 1.6, fim[1] + 5.2]], "R");
  // abdômen em placas e carapaça
  gBola(g, 8.4, 12.4, 3.2, 2.7, T);
  gBola(g, 11.8, 12.2, 3.3, 2.9, T);
  gBola(g, 17.2, 11.8, 4.7, 3.3, "DBdL");
  gBola(g, 17.4, 11.2, 3.6, 2.2, T);
  gRet(g, 10, 10, 1, 4, "D"); gRet(g, 13, 10, 1, 4, "D");
  // pinças: braço, palma e dois dedos que abrem e fecham
  gFio(g, 20, 12.8, 21.6, 12, 1.2, 1.2, "D");
  gBola(g, 22.2, 11, 2.2, 2.2, "CcCh");
  gPoli(g, [[23, 8.6 - pinca], [26, 8.2 - pinca], [25.6, 9.4 - pinca * 0.6], [24.2, 10.2]], "C");
  gPoli(g, [[24, 11.8], [25.6, 11.8 + pinca * 1.4], [26, 13.6 + pinca], [24, 13], [22.8, 12.8]], "n");
  gPonto(g, 25, 8.6 - pinca, "c");
  // olhos
  gPonto(g, 19, 9, "E"); gPonto(g, 21, 10, "E"); gPonto(g, 18, 8, "H");
  gContorno(g, "K");
  // pernas finas (depois do contorno)
  const alt = f % 2 === 0;
  [[8, 14.5], [11.4, 14.8], [14.8, 15], [18, 15]].forEach(function(p, i) {
    const par = (i % 2 === 0) === alt;
    const fx = p[0] + (par ? 1.8 : -0.6);
    const fy = par ? 17 : 16;
    gLinha(g, p[0], p[1], p[0] + (par ? 1.2 : -0.5), p[1] + 1.2, "G");
    gLinha(g, p[0] + (par ? 1.2 : -0.5), p[1] + 1.2, fx, fy, "G");
  });
  return gMapa(g);
}

registrarInimigo("escorpiao", [0, 1, 2, 3].map(quadroEscorpiao),
  { K: "#3a1c05", D: "#a2601c", B: "#dd8f2e", L: "#f2b866", H: "#ffe0a8", R: "#c92a2a", r: "#ff8787", C: "#d9561e", c: "#f08a4b", n: "#9c3410", E: "#111111", G: "#6e3c0f" }, 2, {
  poses: { andar: P(7, 0, 1, 2, 3), parado: P(14, 0, 1, 2, 3) },
  olhos: [[20, 9]]
});

// Abutre 27x18: asas batendo; quadro 4 = mergulho
function asaAbutre(g, pts, sombra, raiz) {
  gPoli(g, pts, function(x, y) {
    const d = Math.hypot(x - raiz[0], y - raiz[1]);
    if (sombra) return "d";
    return d < 4.5 ? "L" : d < 7.5 ? "N" : "d";
  });
  // penas: linhas da raiz até as pontas
  for (let i = 1; i < pts.length - 1; i++) gLinha(g, raiz[0], raiz[1], pts[i][0], pts[i][1], sombra ? "K" : "D");
  // borda da asa
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; gLinha(g, a[0], a[1], b[0], b[1], "K"); }
}

function quadroAbutre(f) {
  const g = gGrade(27, 18);
  const T = "dNDH";
  const mergulho = f === 4;
  const raiz = [12.5, 9.2];
  const asas = [
    [[9, 9.5], [5.5, 4.2], [7.2, 1], [11, 0.2], [15.5, 1.2], [17.5, 4.5], [16.5, 9]],
    [[9, 9.5], [2.5, 6.6], [3.2, 3.8], [7, 3], [12, 3], [17, 5.5], [16.5, 9]],
    [[9, 9.5], [3.5, 13.6], [6.5, 16.6], [11, 17], [16, 15.4], [18, 12], [16.5, 9.5]],
    [[9, 9.5], [1.5, 10.5], [2.4, 13], [7, 13.4], [12, 13.4], [17, 12], [16.5, 9.5]]
  ];
  if (mergulho) {
    // rabo, corpo esticado, asas coladas para trás
    gPoli(g, [[8, 11], [1.5, 12.2], [2, 14.4], [8.6, 14.4]], "d");
    gLinha(g, 8, 12, 2.5, 13, "K");
    gBola(g, 12.5, 11, 6.5, 3.3, T);
    gPoli(g, [[16, 9.2], [2.5, 10.2], [1.5, 12.6], [7, 13.2], [15, 12.4]], function(x, y) { return Math.hypot(x - 14, y - 11) < 5 ? "L" : "N"; });
    gLinha(g, 15, 10, 3, 11, "D"); gLinha(g, 14, 11.5, 3, 12.3, "D");
  } else {
    // asa de trás (mais escura) e rabo
    const p = asas[f];
    asaAbutre(g, p.map(function(q) { return [q[0] - 2, q[1] - 0.6]; }), true, [raiz[0] - 2, raiz[1]]);
    gPoli(g, [[8, 10], [1.5, 11.6], [2.4, 14], [8.6, 13.4]], "d");
    gLinha(g, 8, 11, 2.5, 12.6, "K"); gLinha(g, 8, 12, 3.4, 13.6, "K");
    gBola(g, 12.5, 11.2, 5.8, 3.6, T);
    // patas
    gLinha(g, 11.5, 14.5, 11, 16.5, "Y"); gLinha(g, 14, 14.5, 14.5, 16.5, "Y");
    gPonto(g, 10, 17, "Y"); gPonto(g, 15.5, 17, "Y");
    asaAbutre(g, p, false, raiz);
  }
  // pescoço com gola branca, cabeça pelada e bico
  const hx = mergulho ? 1.5 : 0;
  gBola(g, 17.6 + hx, 9 - (mergulho ? 0.5 : 0), 3.1, 2.9, "CVSC");
  gBola(g, 21.6 + hx, 7.4 + (mergulho ? 1.5 : 0), 2.4, 2.3, "PQqH");
  const hy = mergulho ? 1.5 : 0;
  gPoli(g, [[23.2 + hx, 6.4 + hy], [25.6 + hx, 7.6 + hy], [25 + hx, 9.4 + hy], [23.8 + hx, 8.6 + hy]], "Y");
  gPonto(g, 25 + hx, 8.6 + hy, "y"); gPonto(g, 24 + hx, 8.6 + hy, "y");
  gPonto(g, 22.2 + hx, 6.6 + hy, "E"); gPonto(g, 21.4 + hx, 6.6 + hy, "G");
  gLinha(g, 20.6 + hx, 5.2 + hy, 23.2 + hx, 6 + hy, "K");
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("abutre", [0, 1, 2, 3, 4].map(quadroAbutre),
  { K: "#1d130c", D: "#3a281c", d: "#4a3427", N: "#8b6a4b", L: "#b3916b", H: "#d2b48c", C: "#f1ece0", V: "#c9c0ad", S: "#9c9582", P: "#e69aa6", Q: "#c9707e", q: "#f5bcc4", Y: "#f2c94c", y: "#9c7a14", E: "#111111", G: "#fff0a0" }, 2, {
  poses: { voar: P(4, 0, 1, 2, 3), parado: P(4, 0, 1, 2, 3), subindo: P(3, 0, 1, 2, 3), mergulho: P(1, 4) },
  olhos: [[22, 7]]
});

// Cacto Atirador 18x24: vaso, braços, flor na cabeça
function quadroCacto(pose) {
  const g = gGrade(18, 24);
  const T = "BLDH";
  const car = pose === "carregar", ati = pose === "atirar", resp = pose === "respira";
  const dy = resp ? 0.5 : 0;
  // vaso
  gRet(g, 4, 18, 10, 2, "T"); gRet(g, 4, 18, 10, 1, "t");
  gRet(g, 5, 20, 8, 3, "T"); gRet(g, 5, 22, 8, 1, "u"); gRet(g, 11, 20, 2, 3, "u");
  gPonto(g, 6, 20, "t"); gPonto(g, 7, 20, "t");
  // braços
  const bE = car ? 3 : 8.2, bD = car ? 3 : 6.6;
  gRet(g, 2, 13, 4, 3, "B"); gBola(g, 3, (bE + 13) / 2, 1.8, (13 - bE) / 2 + 1.9, T);
  gRet(g, 12, 11, 4, 3, "B"); gBola(g, 15, (bD + 11) / 2, 1.8, (11 - bD) / 2 + 1.9, T);
  // corpo
  gBola(g, 9, 11 + dy * 0.5, 4.2, 8.2 - dy * 0.3, T);
  gRet(g, 7, 6, 1, 11, "D"); gRet(g, 11, 6, 1, 11, "D"); gRet(g, 9, 5, 1, 12, "L");
  gTroca(g, "L", "L");
  // rosto (limpa uma faixa)
  gRet(g, 6, 8, 7, 4, "B");
  gRet(g, 6, 8, 7, 1, "L");
  // olhos bravos
  gRet(g, 7, 9, 2, 2, "W"); gRet(g, 11, 9, 2, 2, "W");
  gRet(g, 8, 9, 1, 2, "E"); gRet(g, 12, 9, 1, 2, "E");
  gPonto(g, 6, 8, "K"); gPonto(g, 7, 8, "K"); gPonto(g, 8, 8, "D"); gPonto(g, 13, 8, "K"); gPonto(g, 12, 8, "K"); gPonto(g, 11, 8, "D");
  // bochechas e boca
  gPonto(g, 6, 11, "Z"); gPonto(g, 13, 11, "Z");
  if (car || ati) { gRet(g, 8, 12, 4, 2, "M"); gRet(g, 9, 12, 2, 1, "W"); }
  else { gRet(g, 8, 12, 4, 1, "M"); gPonto(g, 7, 11, "M"); gPonto(g, 12, 11, "M"); }
  // flor
  const fy = 2.2 + dy;
  [[-2, 0], [2, 0], [0, -1.6], [-1.4, 1.2], [1.4, 1.2]].forEach(function(o) { gElipse(g, 9 + o[0], fy + o[1] + 0.5, 1.3, 1.3, "P"); });
  gElipse(g, 9, fy + 0.5, 1.2, 1.2, "Y");
  gPonto(g, 9, fy - 1, "p"); gPonto(g, 7, fy, "p");
  gContorno(g, "K");
  // espinhos claros (depois do contorno)
  const esp = car || ati ? [[4, 7], [14, 5], [5, 15], [13, 15], [3, 11], [15, 9], [8, 4], [10, 17]] : [[4, 7], [14, 6], [5, 16]];
  esp.forEach(function(p) { gPonto(g, p[0], p[1], "S"); gPonto(g, p[0] + (p[0] < 9 ? -1 : 1), p[1] - 1, "S"); });
  return gMapa(g);
}

registrarInimigo("cacto", [
  quadroCacto("parado"), quadroCacto("respira"), quadroCacto("carregar"), quadroCacto("atirar")
], { K: "#123a1a", D: "#1f7a36", B: "#34a84b", L: "#6fdc87", H: "#c1f5c9", S: "#fff3bf", P: "#f06595", p: "#ffa8c5", Y: "#ffd43b", W: "#ffffff", E: "#111111", M: "#6b1414", Z: "#f783ac", T: "#b5683a", t: "#d89a62", u: "#7a4220" }, 2, {
  poses: { parado: P(36, 0, 1), carregar: P(1, 2), atirar: P(1, 3) },
  olhos: [[8, 10], [12, 10]]
});

// Múmia 18x26: anda arrastando os pés, braços esticados, bandagem solta balançando
function quadroMumia(f) {
  const g = gGrade(18, 26);
  const T = "WLSH";
  const pas = [[-1.5, 1.5], [0, 0.5], [1.5, -1.5], [0.5, 0]][f];      // posição dos pés (trás, frente)
  const bob = [0, 1, 0, 1][f];                                      // sobe e desce
  const braco = [0, 1, 0, -1][f];
  const perna = function(x, dx, escura) {
    gFio(g, x, 18 + bob, x + dx * 0.6, 22, 1.7, 1.5, escura ? "S" : "W");
    gElipse(g, x + dx + 1.2, 23.4, 2.5, 1.3, escura ? "S" : "W");
  };
  perna(6.2, pas[0], true);
  perna(11, pas[1], false);
  // braço de trás
  gFio(g, 10.5, 11.8 + bob, 15.4, 10.8 + bob + braco * 0.5, 1.5, 1.3, "S");
  // tronco
  gBola(g, 8.8, 13.6 + bob, 4.7, 5.6, T);
  // braço da frente
  gFio(g, 11, 12.8 + bob, 15.8, 12.8 + bob - braco, 1.7, 1.5, "W");
  gElipse(g, 16.4, 12.8 + bob - braco, 1.5, 1.5, "L");
  // cabeça
  gBola(g, 9.4, 5.8 + bob, 4.7, 4.5, T);
  // faixas de ataduras (diagonais finas) em tudo
  const faixa = function(x, y) { return Math.floor((y + x * 0.5) / 3); };
  const dobra = function(x, y) { return faixa(x, y) !== faixa(x, y - 1); };
  gTroca(g, "W", "S", dobra);
  gTroca(g, "L", "W", dobra);
  // faixa escura dos olhos com brilho
  gRet(g, 6, 4 + bob, 8, 3, "M");
  gRet(g, 7, 5 + bob, 2, 1, "Y"); gRet(g, 11, 5 + bob, 2, 1, "Y");
  gPonto(g, 7, 4 + bob, "y"); gPonto(g, 11, 4 + bob, "y");
  // cinto de ataduras na cintura
  gRet(g, 4, 17 + bob, 10, 1, "S");
  // fita solta nas costas
  const fx = [[0, 0, -1, -1], [0, -1, -1, 0], [0, -1, 0, 1], [0, 0, 1, 1]][f];
  gRet(g, 3, 7 + bob, 2, 1, "W");
  for (let i = 0; i < 4; i++) gRet(g, 3 - (i > 1 ? 1 : 0) + fx[i], 8 + i + bob, 2, 1, i % 2 ? "S" : "W");
  // ponta solta no cotovelo
  gPonto(g, 12, 14 + bob, "S"); gPonto(g, 12, 15 + bob, "W");
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("mumia", [0, 1, 2, 3].map(quadroMumia),
  { K: "#2a2217", W: "#eadfc3", L: "#f7f0dc", S: "#b2a27c", H: "#ffffff", M: "#2a1d12", Y: "#ffe45c", y: "#ff9f1c" }, 2, {
  poses: { andar: P(10, 0, 1, 2, 3), parado: P(20, 0, 1) },
  olhos: [[7, 5], [12, 5]]
});

// Tatu-bola 24x15: anda, enrola e vira bola (quadro 5 gira no jogo)
function quadroTatu(pose) {
  const g = gGrade(24, 15);
  const T = "BLDH";
  const idx = { a: 0, b: 1, c: 2, d: 3 }[pose];
  const placas = function(cx, cy, rx, ry, n) {
    const larg = 3.2;
    const ind = function(x, y) { return Math.floor((x + 0.45 * (y - cy)) / larg); };
    gElipse(g, cx, cy, rx, ry, function(u, v, x, y) {
      const topo = -(0.28 * u + 0.82 * v);
      if (ind(x, y) !== ind(x - 1, y)) return "D";
      if (Math.hypot(u + 0.38, v + 0.5) < 0.16) return "H";
      if (topo > 0.42) return "L";
      if (topo < -0.5) return "D";
      return ind(x, y) % 2 ? "A" : "B";
    });
  };
  if (pose === "bola") {
    const cx = 12, cy = 7.5, R = 6.6;
    gElipse(g, cx, cy, R, R, function(u, v) {
      const ang = Math.atan2(v, u) + Math.PI * 2;
      const t = ang / (Math.PI / 3);
      const fr = t - Math.floor(t);
      const raio = Math.hypot(u, v);
      if (raio < 0.2) return "H";
      if (fr < 0.14 + 0.1 * raio) return "D";
      if (raio > 0.8) return "D";
      return Math.floor(t) % 2 ? "A" : "L";
    });
    gPonto(g, cx + 5, cy + 1, "P"); gPonto(g, cx + 5, cy + 2, "P"); gPonto(g, cx + 6, cy + 2, "p");
  } else if (pose === "enrola") {
    placas(11, 8.2, 7.8, 5.8, 4.5);
    gBola(g, 18.8, 11.8, 2.4, 1.9, "PQpq");
    gPonto(g, 20, 11, "E");
    gElipse(g, 15.4, 13.4, 2, 1, "Q"); gElipse(g, 8, 13.4, 2, 1, "Q");
    gPoli(g, [[3, 11], [0.8, 12.6], [3, 13]], "P");
  } else {
    const bob = idx % 2;
    // rabo
    gPoli(g, [[4, 8.4 + bob], [0.8, 11.4], [1.6, 12.4], [5, 11]], "P");
    gPonto(g, 1, 12, "p");
    // patas (alternando)
    const pa = idx === 0 || idx === 3;
    gElipse(g, 7 + (pa ? 1 : -1), 12.9, 1.8, 1.4, "Q");
    gElipse(g, 15 + (pa ? -1 : 1), 12.9, 1.8, 1.4, "Q");
    // carapaça em placas
    placas(10, 7.8 + bob, 8.4, 5.4, 5.2);
    gRet(g, 3, 11 + bob, 14, 1, "D");
    // cabeça pontuda
    gElipse(g, 18.6, 10.6 + bob, 2.6, 2.4, "P");
    gPoli(g, [[19.6, 9.4 + bob], [23.4, 11.6 + bob], [22.8, 13 + bob], [19.2, 12.8 + bob]], "P");
    gRet(g, 18, 12 + bob, 5, 1, "Q");
    gPoli(g, [[16.4, 8 + bob], [17.6, 4.8 + bob], [19.8, 8.2 + bob]], "Q");
    gPonto(g, 17.6, 6.2 + bob, "p");
    gPonto(g, 22.6, 11.6 + bob, "E");
    gRet(g, 20, 9 + bob, 1, 2, "E"); gPonto(g, 20, 9 + bob, "H");
    gPonto(g, 17, 14, "Y"); gPonto(g, 8, 14, "Y");
  }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("tatu", ["a", "b", "c", "d", "enrola", "bola"].map(quadroTatu),
  { K: "#3a2616", D: "#6e4f32", B: "#a8825a", A: "#bf9a70", L: "#d3b088", H: "#f0dab2", P: "#ecae9f", Q: "#d98878", p: "#b86a5e", E: "#111111", Y: "#fff0c2" }, 2, {
  poses: { andar: P(6, 0, 1, 2, 3), parado: P(14, 0, 1), preparar: P(1, 4), deslizar: P(1, 5), cansado: P(12, 0, 1) },
  olhos: [[20, 10]]
});

// ---------- Era do Gelo ----------

// Pinguim 24x26: anda gingando, se prepara e escorrega de barriga (quadro 5)
function quadroPinguim(pose, f) {
  const g = gGrade(24, 26);
  const T = "BLDH";
  if (pose === "barriga") {
    // deitado de barriga, deslizando para a direita
    gFio(g, 8, 18, 2, 13.4, 2.4, 1.6, "Y");
    gPonto(g, 1, 12, "Y"); gPonto(g, 2, 12, "Y");
    gFio(g, 13, 19.4, 4, 22, 1.8, 1, "D");
    gBola(g, 10.4, 19, 8.8, 5, T);
    gElipse(g, 11.6, 21.4, 7.6, 2.4, function(u, v) { return v > 0.3 ? "S" : "W"; });
    gBola(g, 17.6, 17.2, 4.4, 3.8, T);
    gElipse(g, 19, 18, 3, 2.4, "W");
    gRet(g, 19, 16, 2, 2, "E"); gPonto(g, 19, 16, "W");
    gPoli(g, [[21.4, 17.4], [24, 18.6], [21.4, 19.6]], "Y"); gRet(g, 21, 19, 3, 1, "y");
    gRet(g, 13, 15, 2, 7, "R"); gPonto(g, 14, 15, "Q");
    gFio(g, 13, 15.6, 6, 14, 0.9, 0.9, "R"); gFio(g, 12, 16.4, 7, 15.4, 0.9, 0.9, "r");
    gFio(g, 12, 20.4, 5, 24, 1.8, 0.9, "B");
  } else {
    const prep = pose === "preparar";
    const dx = pose === "andar" ? [-1, 0, 1, 0][f] : 0;
    const cx = 12 + dx + (prep ? 1.5 : 0);
    const bh = prep ? 1.5 : 0;
    // pés
    const pa = pose === "andar" ? f % 2 === 0 : true;
    gElipse(g, 8.4, pa ? 24.3 : 23.4, 3, 1.3, "Y"); gElipse(g, 15.8, pa ? 23.4 : 24.3, 3, 1.3, "Y");
    gRet(g, 6, pa ? 24 : 23, 5, 1, "y"); gRet(g, 14, pa ? 23 : 24, 5, 1, "y");
    // flipper de trás e corpo
    gFio(g, cx + 4.6, 12 + bh, cx + (prep ? 7 : 6.4), 17.4, 1.7, 1.1, "D");
    gBola(g, cx, 15.8 + bh * 0.5, 7.8, 8.6 - bh * 0.4, T);
    gBola(g, cx, 7.8 + bh, 5.8, 5.5, T);
    gElipse(g, cx + 1.4, 17 + bh * 0.4, 4.8, 6.6, function(u, v) { return v > 0.55 ? "S" : "W"; });
    // rosto branco, olho, bico
    gElipse(g, cx + 3.2, 8.8 + bh, 3.4, 3, "W");
    gElipse(g, cx + 3.2, 9.8 + bh, 3, 1.8, "S");
    gElipse(g, cx + 3.2, 8.6 + bh, 3.4, 2.5, "W");
    gRet(g, cx + 3, 7 + bh, 2, 2, "E"); gPonto(g, cx + 3, 7 + bh, "W");
    if (prep) { gLinha(g, cx + 2, 6 + bh, cx + 6, 7 + bh, "K"); }
    gPonto(g, cx + 1, 10 + bh, "Q"); gPonto(g, cx + 2, 10 + bh, "Q");
    gPoli(g, [[cx + 5.4, 9 + bh], [cx + 10, 10.2 + bh], [cx + 5.4, 11.4 + bh]], "Y");
    gRet(g, cx + 5, 11 + bh, 4, 1, "y");
    // cachecol vermelho
    gElipse(g, cx, 12.6 + bh, 6.3, 1.5, function(u, v) { return v > 0.2 ? "r" : "R"; });
    gRet(g, cx - 6, 13 + bh, 2, 4, "R"); gRet(g, cx - 6, 16 + bh, 2, 1, "r");
    gPonto(g, cx - 6, 13 + bh, "Q");
    // flipper da frente
    const sw = pose === "andar" ? [1.5, 0, -1.5, 0][f] : 0;
    gFio(g, cx - 5.4, 13 + bh, cx - 7.8 - (prep ? 1 : 0) + sw, 18.6 - (prep ? 1 : 0), 1.8, 1, "B");
  }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("pinguim", [
  quadroPinguim("andar", 0), quadroPinguim("andar", 1), quadroPinguim("andar", 2), quadroPinguim("andar", 3),
  quadroPinguim("preparar", 0), quadroPinguim("barriga", 0)
], { K: "#0b1220", D: "#16203b", B: "#26356a", L: "#41579e", H: "#7088c8", W: "#ffffff", S: "#c3d2e8", Y: "#ff9f2e", y: "#d9650a", E: "#111111", R: "#e8343a", r: "#a8161e", Q: "#ffa0a8" }, 2, {
  poses: { andar: P(7, 0, 1, 2, 3), parado: P(20, 0, 2), preparar: P(1, 4), deslizar: P(1, 5), cansado: P(14, 0, 2) },
  olhos: [[15, 8]]
});

// Morcegos 24x12 (gelo e fogo): vista de frente, asas batendo
function quadroMorcego(f, fogo) {
  const g = gGrade(24, 12);
  const u = [1, 0.4, -0.9, -0.2][f];
  const asa = function(s) {
    const X = function(x) { return s > 0 ? x : 23 - x; };
    const pts = [[14.2, 5.2], [18, 4.2 - 3.2 * u], [22.8, 6 - 5 * u], [21, 8.4 - 3 * u], [19.6, 7 - 2.4 * u], [18.6, 9.8 - 2 * u], [17.2, 8.2 - 1.4 * u], [15.6, 10 - u], [14.2, 8.6]].map(function(p) { return [X(p[0]), p[1]]; });
    gPoli(g, pts, function(x, y) { return Math.abs(x - 11.5) > 8 ? "L" : "M"; });
    [[18, 4.2 - 3.2 * u], [22.8, 6 - 5 * u], [18.6, 9.8 - 2 * u]].forEach(function(p) { gLinha(g, X(14.4), 5.6, X(p[0]), p[1], "D"); });
    gLinha(g, X(14.4), 5.6, X(21), 8.4 - 3 * u, "D");
  };
  asa(1); asa(-1);
  // corpo e cabeça
  gBola(g, 11.6, 8, 2.6, 3.3, "BLDH");
  if (!fogo) { gElipse(g, 11.6, 9, 1.2, 1.4, "W"); } else { gElipse(g, 11.6, 9, 1.3, 1.5, "Y"); }
  gBola(g, 11.6, 5, 3, 2.7, "BLDH");
  // orelhas
  gPoli(g, [[8.6, 4.4], [8.4, 0.6], [10.8, 3]], "B"); gPoli(g, [[14.4, 4.4], [14.8, 0.6], [12.4, 3]], "B");
  gPonto(g, 9, 2.6, "I"); gPonto(g, 14, 2.6, "I");
  // olhos e presas
  gRet(g, 9, 4, 2, 2, "E"); gRet(g, 13, 4, 2, 2, "E");
  gPonto(g, 9, 4, "G"); gPonto(g, 13, 4, "G");
  gPonto(g, 10, 7, "W"); gPonto(g, 13, 7, "W");
  gContorno(g, "K");
  if (fogo) { gPonto(g, 11, 0, "Y"); gPonto(g, 12, 1 - (f % 2), "O"); gPonto(g, 12, 0, "Y"); }
  return gMapa(g);
}

registrarInimigo("morcegoGelo", [0, 1, 2, 3].map(function(f) { return quadroMorcego(f, false); }),
  { K: "#0f2a4a", D: "#1f5fa8", B: "#8fd0ff", L: "#2f7fd0", M: "#3f93e6", H: "#eaf6ff", W: "#ffffff", E: "#16243a", G: "#8be9ff", I: "#7cc4fb" }, 2, {
  poses: { voar: P(3, 0, 1, 2, 3), parado: P(3, 0, 1, 2, 3) },
  olhos: [[10, 5], [14, 5]]
});
registrarInimigo("morcegoFogo", [0, 1, 2, 3].map(function(f) { return quadroMorcego(f, true); }),
  { K: "#3a0a10", D: "#8a1730", B: "#ffb347", L: "#c2304a", M: "#e0485a", H: "#fff0b0", W: "#fff3bf", E: "#ffffff", G: "#ff3b3b", I: "#ffd27a", Y: "#ffd43b", O: "#ff922b" }, 2, {
  poses: { voar: P(3, 0, 1, 2, 3), parado: P(3, 0, 1, 2, 3) },
  olhos: [[10, 5], [14, 5]]
});

// Boneco de Neve 21x30: chapéu, cenoura, cachecol; arremessa bolas de neve
function quadroBoneco(pose) {
  const g = gGrade(21, 30);
  const T = "WLDH";
  const resp = pose === "respira" ? 0.5 : 0;
  const car = pose === "carregar", ati = pose === "atirar";
  // braço da frente fica por trás do corpo? (desenha depois)
  gBola(g, 10.5, 23.4, 8.4, 5.4, T);
  gBola(g, 10.5, 16.4 + resp, 6.6, 5.2, T);
  gBola(g, 10.5, 9.4 + resp, 5.5, 4.9, T);
  // chapéu
  const hy = resp;
  gRet(g, 7, 1 + hy, 7, 4, "C"); gRet(g, 7, 1 + hy, 1, 4, "c");
  gRet(g, 7, 3.6 + hy, 7, 1, "R");
  gRet(g, 4.5, 5 + hy, 12, 1, "C"); gRet(g, 4.5, 5 + hy, 12, 1, "C"); gRet(g, 5, 5 + hy, 2, 1, "c");
  // olhos de carvão e sobrancelhas
  gRet(g, 8, 8 + resp, 2, 2, "E"); gRet(g, 13, 8 + resp, 2, 2, "E");
  gPonto(g, 8, 8 + resp, "W");  gPonto(g, 13, 8 + resp, "W");
  if (car || ati) { gLinha(g, 7, 7 + resp, 10, 8 + resp, "E"); gLinha(g, 15, 7 + resp, 13, 8 + resp, "E"); }
  // cenoura
  gPoli(g, [[11.4, 10 + resp], [17.4, 11.2 + resp], [11.4, 12.4 + resp]], "O");
  gRet(g, 11, 10 + resp, 6, 1, "o"); gPonto(g, 17, 11 + resp, "n");
  // bochechas e sorriso de carvão
  gPonto(g, 6, 11 + resp, "Q"); gPonto(g, 7, 11 + resp, "Q"); gPonto(g, 15, 12 + resp, "Q");
  [[7, 12.6], [8, 13.4], [10, 13.8], [12, 13.6], [13.4, 13]].forEach(function(p) { gPonto(g, p[0], p[1] + resp, "E"); });
  // cachecol
  gElipse(g, 10.5, 14.6 + resp, 5.8, 1.4, function(u, v) { return v > 0.1 ? "r" : "R"; });
  gRet(g, 5, 15 + resp, 2, 5, "R"); gRet(g, 5, 19 + resp, 2, 1, "r"); gPonto(g, 5, 15 + resp, "Q");
  // botões
  gRet(g, 10, 17 + resp, 2, 2, "E"); gRet(g, 10, 21, 2, 2, "E"); gRet(g, 10, 25, 2, 2, "E");
  gPonto(g, 10, 17 + resp, "W"); gPonto(g, 10, 21, "W"); gPonto(g, 10, 25, "W");
  // flocos de sombra azulada
  gPonto(g, 5, 24, "D"); gPonto(g, 6, 26, "D");
  // bola de neve nas mãos
  if (car) gBola(g, 18, 3.4, 2.9, 2.9, "WLDH");
  gContorno(g, "K");
  // braços de galho (depois do contorno)
  gLinha(g, 4.6, 16 + resp, 0.8, 12.6 + resp, "N"); gLinha(g, 2.4, 14.4 + resp, 0.6, 14.2 + resp, "N"); gLinha(g, 2.6, 14 + resp, 2, 11.6 + resp, "N");
  if (car) {
    gLinha(g, 16.4, 15, 18, 8, "N"); gLinha(g, 17.6, 10, 15.4, 8.6, "N"); gLinha(g, 17.8, 9, 20, 8, "N");
  } else if (ati) {
    gLinha(g, 16.4, 15.4, 20.4, 15.8, "N"); gLinha(g, 19.2, 15.6, 20.4, 13.4, "N"); gLinha(g, 19.4, 15.8, 20.4, 18, "N");
  } else {
    gLinha(g, 16.4, 16 + resp, 20.2, 12.8 + resp, "N"); gLinha(g, 18.4, 14.4 + resp, 20.4, 14.6 + resp, "N"); gLinha(g, 18.4, 14.4 + resp, 18.4, 12 + resp, "N");
  }
  return gMapa(g);
}

registrarInimigo("boneco", [
  quadroBoneco("parado"), quadroBoneco("respira"), quadroBoneco("carregar"), quadroBoneco("atirar")
], { K: "#2c3a58", W: "#eef4fc", L: "#ffffff", D: "#b3c3dc", H: "#ffffff", C: "#1d1d26", c: "#4a4a5c", R: "#e03131", r: "#a51d1d", Q: "#ffa8b4", E: "#16161c", O: "#ff922b", o: "#ffc078", n: "#c2560a", N: "#7a4a22" }, 2, {
  poses: { parado: P(36, 0, 1), carregar: P(1, 2), atirar: P(1, 3) },
  olhos: [[9, 9], [14, 9]]
});

// Foca 24x15: pula com a barriga, cabeça redonda, bigodes
function quadroFoca(pose) {
  const g = gGrade(24, 15);
  const T = "BLDH";
  // corpo: [cx, cy, rx, ry] da cauda até o peito; cab = centro da cabeça
  const forma = {
    parado:  { corpo: [[7.4, 10.4, 5.6, 3.2], [11.8, 9.8, 5.2, 3.7], [15, 8.6, 4.2, 4]], cab: [17.6, 5.6], rab: [[1.2, 8.6], [4, 8.8], [3.6, 12], [1.2, 12.4]], nad: [14.4, 12.2] },
    agachar: { corpo: [[7.6, 11.6, 6, 2.7], [12, 11, 5.2, 3], [15.4, 10.4, 4, 3]], cab: [18, 8.6], rab: [[1.2, 10.4], [4, 10.8], [3.6, 13.4], [1.2, 13.4]], nad: [15, 13.2] },
    pulo:    { corpo: [[6.4, 9, 4.8, 2.9], [10.6, 8.2, 5, 3.4], [14.4, 7.2, 4.2, 3.6]], cab: [17.8, 4.8], rab: [[0.8, 4], [3.4, 5.4], [3.8, 8.4], [1, 7.4]], nad: [10.6, 10.6] },
    queda:   { corpo: [[6.4, 6.4, 4.8, 2.9], [10.6, 7.4, 5, 3.4], [14.4, 8.4, 4.2, 3.6]], cab: [17.8, 9.4], rab: [[0.8, 2.6], [3.4, 3.8], [3.8, 6.6], [1, 5.6]], nad: [17.6, 12.2] }
  }[pose];
  gPoli(g, forma.rab, "D");
  forma.corpo.forEach(function(c) { gBola(g, c[0], c[1], c[2], c[3], T); });
  // barriga clara
  const c1 = forma.corpo[1];
  gElipse(g, c1[0] + 0.8, c1[1] + c1[3] * 0.66, c1[2] - 0.8, c1[3] * 0.4, "P");
  // manchas das costas
  const cc = forma.corpo[0];
  [[0, -1.6], [1, -1.6], [4, -2.6], [5, -2.6], [3, -0.6], [7, -2.8]].forEach(function(o) { gPonto(g, cc[0] + o[0], cc[1] + o[1], "S"); });
  // cabeça grande e clara, com focinho, nariz e olhão
  const h = forma.cab;
  gElipse(g, h[0] + 0.5, h[1] + 3.2, 3.6, 2.4, "B");
  gBola(g, h[0], h[1], 4.4, 4, "LHBH");
  gElipse(g, h[0] + 2.8, h[1] + 1.8, 3.1, 2.3, "P");
  gElipse(g, h[0] + 2.8, h[1] + 2.9, 2.5, 1.1, "Q");
  gRet(g, h[0] + 4.4, h[1] + 0.6, 2, 2, "E");                 // nariz
  gPonto(g, h[0] + 2, h[1] + 2.4, "S"); gPonto(g, h[0] + 3, h[1] + 3, "S");
  gRet(g, h[0] - 0.6, h[1] - 2, 3, 3, "E");                   // olhão
  gPonto(g, h[0] - 0.6, h[1] - 2, "W"); gPonto(g, h[0] + 0.4, h[1] - 1, "H");
  gPoli(g, [[h[0] - 3.4, h[1] - 0.6], [h[0] - 2.4, h[1] - 3.2], [h[0] - 1, h[1] - 3.6]], "L");   // topo da cabeça
  if (pose === "queda" || pose === "pulo") gRet(g, h[0] + 2.4, h[1] + 3.2, 3, 1, "M");
  // nadadeira da frente
  gFio(g, forma.nad[0], forma.nad[1] - 1.4, forma.nad[0] + (pose === "queda" ? 2.6 : -1.6), forma.nad[1] + (pose === "queda" ? 0.4 : 0.8), 1.7, 1.1, "D");
  gContorno(g, "K");
  // bigodes (depois do contorno)
  gLinha(g, h[0] + 5, h[1] + 2.6, h[0] + 6.6, h[1] + 3.4, "W"); gLinha(g, h[0] + 4.6, h[1] + 3, h[0] + 5.6, h[1] + 4.4, "W");
  return gMapa(g);
}

registrarInimigo("foca", ["parado", "agachar", "pulo", "queda"].map(quadroFoca),
  { K: "#14202e", D: "#3d5a78", B: "#648aa8", L: "#9dbbd2", H: "#dcebf6", P: "#e4eef6", Q: "#b4cce0", S: "#41607e", E: "#101820", W: "#ffffff", M: "#4a1a22" }, 2, {
  poses: { parado: P(1, 0), agachar: P(1, 1), pulo: P(1, 2), queda: P(1, 3) },
  olhos: [[18, 5]]
});

// Lobo do Gelo 27x18: corre (4 quadros), rosna agachado, ofega
function quadroLobo(pose) {
  const g = gGrade(27, 18);
  const T = "BLDH";
  const idx = { c0: 0, c1: 1, c2: 2, c3: 3 }[pose];
  const corre = idx !== undefined;
  const rosna = pose === "rosna", ofega = pose === "ofega";
  const by = rosna ? 1.8 : (corre ? [-0.4, 0.4, -0.2, 0.6][idx] : 0);
  // pernas: [ombro/quadril, pé]
  const patas = {
    c0: { fn: [[19, 11], [24.4, 15.4]], ff: [[17.4, 11], [22, 14.6]], hn: [[8.6, 11.4], [3.4, 15.2]], hf: [[10.4, 11.4], [6, 15.8]] },
    c1: { fn: [[18.6, 11.4], [17.4, 15.6]], ff: [[17.2, 11.4], [15, 15.2]], hn: [[9.4, 11.6], [11.6, 15.6]], hf: [[10.8, 11.6], [13.6, 15]] },
    c2: { fn: [[19, 11], [21.4, 15.8]], ff: [[17.4, 11], [24, 14]], hn: [[8.6, 11.4], [6, 15.8]], hf: [[10.4, 11.4], [2.8, 14.6]] },
    c3: { fn: [[18.6, 11.4], [20, 15.6]], ff: [[17.2, 11.4], [18.4, 14.8]], hn: [[9.4, 11.6], [8, 15.6]], hf: [[10.8, 11.6], [9.4, 15]] },
    rosna: { fn: [[19, 12], [20.4, 16]], ff: [[17.4, 12], [16.4, 15.6]], hn: [[8.6, 12.4], [6.6, 16]], hf: [[10.4, 12.4], [9.6, 15.6]] },
    ofega: { fn: [[19, 11.4], [19.4, 16]], ff: [[17.4, 11.4], [16.6, 15.8]], hn: [[8.6, 11.8], [7.4, 16]], hf: [[10.4, 11.8], [10.2, 15.8]] }
  }[pose];
  const perna = function(p, cor, fina) {
    const mx = (p[0][0] + p[1][0]) / 2 + 0.6, my = (p[0][1] + p[1][1]) / 2 + 0.4;
    gFio(g, p[0][0], p[0][1] + by, mx, my + by * 0.5, fina ? 1.4 : 1.8, fina ? 1.1 : 1.4, cor);
    gFio(g, mx, my + by * 0.5, p[1][0], p[1][1], 1.2, 1.1, cor);
    gElipse(g, p[1][0] + 0.8, p[1][1] + 0.4, 1.6, 0.9, cor === "D" ? "d" : "Q");
  };
  perna(patas.hf, "D", true); perna(patas.ff, "D", true);
  // rabo felpudo
  const ry = rosna ? 5 : ofega ? 10 : 4 + by;
  gFio(g, 5.6, 9 + by, 2, ry + 1.4, 2.2, 1.4, "B"); gElipse(g, 1.8, ry + 0.8, 1.5, 1.5, "H");
  // corpo
  gBola(g, 9.6, 9.6 + by, 5.2, 4.4, T);
  gBola(g, 14.4, 9.2 + by, 5.2, 3.8, T);
  gBola(g, 18.4, 8.8 + by, 4.6, 4.2, T);
  gElipse(g, 14.4, 12 + by, 7.4, 1.4, "P");
  gElipse(g, 19, 10.4 + by, 2.6, 2.2, "P");
  perna(patas.hn, "B", false); perna(patas.fn, "B", false);
  // cabeça
  const hx = rosna ? 1 : 0, hy = rosna ? 2.4 : ofega ? 3 : 0;
  gBola(g, 22.4 + hx, 6.6 + by + hy, 3.2, 3, T);
  gElipse(g, 25 + hx, 8.2 + by + hy, 2, 1.5, "L");
  gPonto(g, 26 + hx, 7.4 + by + hy, "E"); gPonto(g, 25.6 + hx, 7.4 + by + hy, "E");
  // orelhas
  gPoli(g, [[19.8 + hx, 4.2 + by + hy], [20.4 + hx, 0.8 + by + hy], [22.6 + hx, 3.4 + by + hy]], "B");
  gPoli(g, [[22.2 + hx, 3.6 + by + hy], [24.2 + hx, 1 + by + hy], [24.6 + hx, 4.2 + by + hy]], "D");
  gPonto(g, 20.8 + hx, 3 + by + hy, "I");
  // olho amarelo bravo
  gRet(g, 22.6 + hx, 5.4 + by + hy, 2, 1, "Y"); gPonto(g, 24 + hx, 5.4 + by + hy, "E");
  gLinha(g, 22 + hx, 4.4 + by + hy, 25 + hx, 5.4 + by + hy, "D");
  // pelos da bochecha
  gPoli(g, [[19.8 + hx, 8 + by + hy], [21.6 + hx, 10 + by + hy], [22.4 + hx, 8.6 + by + hy]], "H");
  // boca
  if (rosna) { gRet(g, 23 + hx, 9.2 + by + hy, 4, 1, "M"); gPonto(g, 23 + hx, 10 + by + hy, "W"); gPonto(g, 25 + hx, 10 + by + hy, "W"); gPonto(g, 24 + hx, 9 + by + hy, "W"); gPonto(g, 26 + hx, 9 + by + hy, "W"); }
  else if (ofega) { gRet(g, 23 + hx, 9.4 + by + hy, 3, 1, "M"); gRet(g, 24 + hx, 10.4 + by + hy, 2, 2, "R"); }
  else { gRet(g, 23 + hx, 9.4 + by + hy, 3, 1, "M"); }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("lobo", ["c0", "c1", "c2", "c3", "rosna", "ofega"].map(quadroLobo),
  { K: "#1a2230", D: "#5a6573", d: "#434d5a", Q: "#2f3846", B: "#8c96a4", L: "#c4cbd4", H: "#eef1f5", P: "#e6eaef", I: "#e8a0b0", Y: "#ffd43b", E: "#111111", W: "#ffffff", M: "#5a1620", R: "#e8445a" }, 2, {
  poses: { andar: P(4, 0, 1, 2, 3), parado: P(20, 1), preparar: P(1, 4), deslizar: P(3, 0, 1, 2, 3), cansado: P(10, 5, 1) },
  olhos: [[23, 6]]
});

// ---------- Mundo de Lava ----------

// Slime de Magma 28x20: pulsa, amassa, estica; espinhos de obsidiana nas costas
function quadroSlime(pose) {
  const g = gGrade(28, 20);
  const P_ = {
    a:      { rx: 11.4, ry: 8.2, cx: 14 },
    b:      { rx: 10.8, ry: 9.0, cx: 14 },
    agachar:{ rx: 13, ry: 6.2, cx: 14 },
    esticar:{ rx: 8.4, ry: 9.6, cx: 14 },
    pouso:  { rx: 13.4, ry: 5, cx: 14 }
  }[pose];
  const chao = 19;                      // primeira linha abaixo do slime
  const cy = chao - P_.ry + 1.6;
  const cx = P_.cx;
  // gotas e poças ao lado quando amassa
  if (pose === "pouso") { gElipse(g, 1.8, 17.4, 1.4, 1.4, "B"); gElipse(g, 26.2, 17.2, 1.4, 1.4, "B"); gPonto(g, 2, 14, "L"); gPonto(g, 25, 13, "L"); }
  // corpo de lava
  gBola(g, cx, cy, P_.rx, P_.ry, "BLDH");
  const topo = cy - P_.ry;
  // espinhos de obsidiana (cravados nas costas)
    [[-5.2, 1.6], [0, 3.6], [5.2, 2]].forEach(function(s) {
    const x = cx + s[0] * (P_.rx / 11.4);
    const ty = topo + 2.4 + Math.abs(s[0]) * 0.16;
    const alt = Math.min(s[1] * 1.5 * (pose === "pouso" || pose === "agachar" ? 0.7 : 1), ty - 1.2);
    gPoli(g, [[x - 1.9, ty + 1.2], [x + 1.9, ty + 1.2], [x + 0.4, ty - alt - 0.6]], "O");
    gPoli(g, [[x - 0.6, ty + 1.2], [x + 1.9, ty + 1.2], [x + 0.6, ty - alt]], "o");
    gPonto(g, x, ty - alt, "Y");
  });
  for (let y = chao; y < 20; y++) for (let x = 0; x < 28; x++) if (g[y][x] !== "." && !(pose === "pouso" && 0)) g[y][x] = ".";
  // brilho do miolo e bolhas
  gElipse(g, cx - 2, cy + 1.2, P_.rx * 0.45, P_.ry * 0.38, function(u, v) { return v < -0.2 ? "L" : "B"; });
  [[-4.5, -0.5], [5.2, 1.6], [1.2, 3]].forEach(function(b) {
    if (cy + b[1] > chao - 1.2) return;
    gPonto(g, cx + b[0], cy + b[1], "H"); gPonto(g, cx + b[0] + 1, cy + b[1], "L"); gPonto(g, cx + b[0], cy + b[1] + 1, "L");
  });
  // rachaduras brilhantes na base
  gPonto(g, cx - 6, chao - 2, "Y"); gPonto(g, cx - 5, chao - 2, "Y"); gPonto(g, cx + 4, chao - 1.6, "Y"); gPonto(g, cx + 5, chao - 1.6, "Y");
  // olhos bravos e boca
  const ey = cy - P_.ry * 0.12;
  const exs = cx + 1.4;
  gRet(g, exs - 5, ey - 1.4, 4, 4, "W"); gRet(g, exs + 1.5, ey - 1.4, 4, 4, "W");
  gRet(g, exs - 3, ey - 0.4, 2, 3, "E"); gRet(g, exs + 3.5, ey - 0.4, 2, 3, "E");
  gPonto(g, exs - 3, ey - 0.4, "W"); gPonto(g, exs + 3.5, ey - 0.4, "W");
  gLinha(g, exs - 6, ey - 3, exs - 1, ey - 1.6, "D"); gLinha(g, exs + 6.4, ey - 3, exs + 1.6, ey - 1.6, "D");
  gLinha(g, exs - 6, ey - 2.6, exs - 1, ey - 1.2, "D"); gLinha(g, exs + 6.4, ey - 2.6, exs + 1.6, ey - 1.2, "D");
  const my = ey + 4.4;
  if (pose === "esticar") { gRet(g, exs - 1, my, 4, 2, "M"); gRet(g, exs, my, 2, 1, "Y"); }
  else { gRet(g, exs - 2.4, my, 7, 1, "M"); gPonto(g, exs - 2.4, my - 1, "M"); gPonto(g, exs + 4.4, my - 1, "M"); gPonto(g, exs - 1, my + 1, "Y"); gPonto(g, exs + 1, my + 1, "Y"); gPonto(g, exs - 1, my, "W"); gPonto(g, exs + 3, my, "W"); }
  gContorno(g, "K");
  // escorre uma gotinha
  if (pose === "a" || pose === "b") { gPonto(g, cx - 9, chao, "B"); }
  return gMapa(g);
}

registrarInimigo("slime", ["a", "b", "agachar", "esticar", "pouso"].map(quadroSlime),
  { K: "#3a0d06", D: "#c2330a", B: "#f76c0b", L: "#ffa11f", H: "#ffe08a", Y: "#ffd43b", O: "#2c2128", o: "#5b4655", W: "#ffffff", E: "#1a0a0a", M: "#3a0d06" }, 2, {
  poses: { parado: P(16, 0, 1), agachar: P(1, 2), pulo: P(1, 3), queda: P(1, 3), pouso: P(1, 4) },
  olhos: [[11, 9], [18, 9]]
});

// Diabinho 24x28: asinhas, rabo de seta, bola de fogo nas mãos
function quadroDiabinho(pose, f) {
  const g = gGrade(24, 28);
  const T = "BLDH";
  const car = pose === "carregar", ati = pose === "atirar";
  const bat = f ? 1 : 0;
  // asa de trás
  const wy = bat ? -1 : 0;
  gPoli(g, [[9, 14], [2.4, 9.6 + wy], [3.6, 12.6 + wy], [1.8, 14.6 + wy], [4.8, 15.4], [4, 18.4], [9, 18.4]], "I");
  gLinha(g, 9, 15, 2.6, 10 + wy, "V"); gLinha(g, 9, 16, 2.2, 14.8 + wy, "V"); gLinha(g, 9, 17, 4.2, 18, "V");
  // rabo com ponta de seta
  const tipo = [[8, 22], [1.4, 24], [1.8 + bat, 17]];
  for (let i = 0; i <= 12; i++) { const p = gCurva(tipo[0], tipo[1], tipo[2], i / 12); gElipse(g, p[0], p[1], 0.9, 0.9, "B"); }
  gPoli(g, [[1.8 + bat - 1.8, 17.4], [1.8 + bat + 1.8, 17.4], [1.8 + bat, 14.6]], "D");
  // pernas e cascos
  gBola(g, 9.4, 23.6, 2.1, 2.6, T); gBola(g, 14.4, 23.6, 2.1, 2.6, T);
  gRet(g, 7, 25, 4, 2, "N"); gRet(g, 12, 25, 4, 2, "N");
  gRet(g, 7, 26, 4, 1, "n"); gRet(g, 12, 26, 4, 1, "n");
  // corpo
  gBola(g, 12, 18.8, 4.8, 5.4, T);
  gElipse(g, 12.8, 19.8, 2.8, 3.8, "Q");
  // cabeça e orelhas
  gPoli(g, [[6.8, 8.6], [2, 5.8], [7.2, 11.6]], "B"); gPoli(g, [[17.2, 8.6], [22, 5.8], [16.8, 11.6]], "B");
  gPoli(g, [[6.8, 9], [3.8, 7.2], [7, 10.6]], "I"); gPoli(g, [[17.2, 9], [20.2, 7.2], [17, 10.6]], "I");
  gBola(g, 12, 9.2, 6, 5.3, T);
  // chifres
  gFio(g, 8.2, 5.4, 6.6, 1.2, 1.5, 0.6, "N"); gFio(g, 15.8, 5.4, 17.6, 1.2, 1.5, 0.6, "N");
  gPonto(g, 8, 4, "n"); gPonto(g, 16, 4, "n");
  // olhos bravos
  gRet(g, 8.6, 8, 3, 2, "Y"); gRet(g, 13.4, 8, 3, 2, "Y");
  gRet(g, 10.4, 8, 1, 2, "E"); gRet(g, 15.4, 8, 1, 2, "E");
  gLinha(g, 8, 6.4, 11.4, 7.8, "D"); gLinha(g, 16.6, 6.4, 13, 7.8, "D");
  gLinha(g, 8, 6.8, 11.4, 8.2, "D"); gLinha(g, 16.6, 6.8, 13, 8.2, "D");
  // sorriso com dentes
  if (ati || car) { gRet(g, 9.4, 11.4, 6, 2, "M"); gRet(g, 9.4, 11.4, 6, 1, "W"); }
  else { gRet(g, 9.4, 11.8, 6, 1, "M"); gPonto(g, 8.4, 11, "M"); gPonto(g, 15.4, 11, "M"); gPonto(g, 10, 12.8, "W"); gPonto(g, 14, 12.8, "W"); gPonto(g, 10, 11.8, "W"); gPonto(g, 14, 11.8, "W"); }
  // braços
  if (ati) {
    gFio(g, 15.6, 15.6, 20.6, 16.6, 1.5, 1.3, "B"); gFio(g, 8.6, 15.6, 6, 20, 1.5, 1.3, "D");
    gElipse(g, 21.4, 16.6, 1.4, 1.6, "D"); gPonto(g, 22.6, 14.6, "N"); gPonto(g, 22.8, 18.4, "N");
  } else if (car) {
    gFio(g, 15.6, 15.6, 18.4, 15.8, 1.5, 1.3, "B"); gFio(g, 9, 15.8, 16, 17.6, 1.5, 1.3, "D");
    // bola de fogo nas mãos
    gPoli(g, [[18.2, 12.6], [19.4, 8.2], [20.6, 11.6], [22.6, 9.4], [22.2, 13]], "F");
    gBola(g, 20.2, 15.6, 3, 3, "OYFW");
    gElipse(g, 20.2, 15.8, 1.2, 1.2, "W");
  } else {
    gFio(g, 15.8, 15.4, 18.4, 20.4, 1.5, 1.3, "B"); gFio(g, 8.4, 15.4, 5.8, 20.2, 1.5, 1.3, "D");
    gPonto(g, 18.6, 21.4, "N"); gPonto(g, 19.6, 21.4, "N"); gPonto(g, 5.4, 21.4, "N"); gPonto(g, 6.4, 21.4, "N");
  }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("diabinho", [
  quadroDiabinho("parado", 0), quadroDiabinho("parado", 1), quadroDiabinho("carregar", 0), quadroDiabinho("atirar", 0)
], { K: "#2e0707", D: "#a31515", B: "#e03a2e", L: "#ff6b57", H: "#ffa8a0", Q: "#ff8a6e", I: "#7a1010", V: "#4a0a0a", W: "#ffffff", N: "#f4ead4", n: "#c7b88f", Y: "#ffe45c", E: "#1a0505", M: "#4a0a0a", O: "#ff922b", F: "#e8590c" }, 2, {
  poses: { parado: P(20, 0, 1), carregar: P(1, 2), atirar: P(1, 3) },
  olhos: [[10, 9], [15, 9]]
});

// Golem de Pedra 24x26: bloco de rocha com musgo e o coração de lava no peito
function quadroGolem(pose) {
  const g = gGrade(24, 26);
  const T = "BLD";
  const car = pose === "carregar", ati = pose === "atirar", resp = pose === "respira";
  const sh = resp ? 1 : 0;
  // pernas
  gBloco(g, 6, 18, 5, 6, T); gBloco(g, 13, 18, 5, 6, T);
  gBloco(g, 5, 23, 7, 2, T); gBloco(g, 12, 23, 7, 2, T);
  // braços e punhos
  const braco = function(x, esq) {
    if (car) {
      gBloco(g, x, 4, 3, 10, T);
      gBola(g, x + 1.5, 3.2, 3.2, 3, "BLDL");
    } else if (ati && !esq) {
      gBloco(g, 17, 11, 6, 3, T);
      gBola(g, 22, 12.6, 2.2, 3, "BLDL");
    } else {
      gBloco(g, x, 12 - sh, 3, 8, T);
      gBola(g, x + 1.5, 21 - sh, 3.2, 2.8, "BLDL");
    }
  };
  braco(1.5, true); braco(19.5, false);
  // tronco
  gBloco(g, 6, 10 - sh, 12, 10, T);
  gBloco(g, 4, 10 - sh, 16, 4, T);
  // ombros arredondados
  gBola(g, 4.2, 11.4 - sh, 3.6, 3, "BLDH"); gBola(g, 19.8, 11.4 - sh, 3.6, 3, "BLDH");
  // cabeça
  const hy = car ? 3 : 0;
  gBloco(g, 8, 3 + hy - sh, 8, 7, T);
  gRet(g, 8, 6 + hy - sh, 8, 1, "D");
  // olhos de lava
  gRet(g, 9, 7 + hy - sh, 2, 2, "O"); gRet(g, 13, 7 + hy - sh, 2, 2, "O");
  gPonto(g, 9, 7 + hy - sh, "Y"); gPonto(g, 13, 7 + hy - sh, "Y");
  gRet(g, 10, 5 + hy - sh, 5, 1, "k");
  // coração de lava e rachaduras
  const cy = 15 - sh;
  gPoli(g, [[12, cy - 3], [14.6, cy], [12, cy + 3], [9.4, cy]], resp ? "Y" : "O");
  gPoli(g, [[12, cy - 1.4], [13.2, cy], [12, cy + 1.4], [10.8, cy]], resp ? "W" : "Y");
  gLinha(g, 9, cy, 7, cy - 2, "O"); gLinha(g, 15, cy, 17, cy + 2, "O"); gLinha(g, 12, cy + 3, 11, cy + 5, "O");
  gLinha(g, 7, cy - 2, 6, cy - 4, "k"); gLinha(g, 17, cy + 2, 18, cy + 4, "k");
  // pedra jogada no alto
  if (car) gBola(g, 12, 2.6, 4.8, 2.8, "BLDH");
  // textura e musgo
  gRuido(g, 7, "B", "L", 0.10); gRuido(g, 11, "B", "D", 0.08);
  [[9, 3], [10, 3], [15, 10], [16, 10], [5, 9], [6, 9], [7, 10]].forEach(function(p) { if (g[p[1] - sh] && "BLD".indexOf(g[p[1] - sh][p[0]]) >= 0) gPonto(g, p[0], p[1] - sh, "G"); });
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("golem", [
  quadroGolem("parado"), quadroGolem("respira"), quadroGolem("carregar"), quadroGolem("atirar")
], { K: "#181b1f", D: "#4c525a", B: "#7b838c", L: "#a6aeb7", H: "#d3d8dd", O: "#ff922b", Y: "#ffe066", W: "#ffffff", k: "#2b2f35", G: "#5ea04c" }, 2, {
  poses: { parado: P(26, 0, 1), carregar: P(1, 2), atirar: P(1, 3) },
  olhos: [[10, 8], [14, 8]]
});

// Fênix 27x18: penas de fogo, crista e cauda flamejante; quadro 4 = mergulho
function quadroFenix(f) {
  const g = gGrade(27, 18);
  const T = "ROdH";
  const mergulho = f === 4;
  const flick = f % 2;
  const raiz = mergulho ? [14, 10.4] : [12.6, 8.8];
  const centro = [-105, -150, 125, 170][f];
  // pena: do ombro até a ponta, em 3 cores (vermelho, laranja, amarelo)
  const pena = function(x0, y0, ang, comp, cores, r0) {
    const a = ang * Math.PI / 180;
    const x1 = x0 + Math.cos(a) * comp, y1 = y0 + Math.sin(a) * comp;
    const p1 = [x0 + (x1 - x0) * 0.45, y0 + (y1 - y0) * 0.45], p2 = [x0 + (x1 - x0) * 0.78, y0 + (y1 - y0) * 0.78];
    gFio(g, x0, y0, p1[0], p1[1], r0, r0 * 0.8, cores[0]);
    gFio(g, p1[0], p1[1], p2[0], p2[1], r0 * 0.8, r0 * 0.5, cores[1]);
    gFio(g, p2[0], p2[1], x1, y1, r0 * 0.5, 0.4, cores[2]);
  };
  // cauda flamejante (atrás de tudo)
  const cauda = mergulho ? [[2, 11 + flick], [0.6, 13], [3, 15]] : [[2, 8 + flick], [1, 11.4 - flick], [2.4, 14.6]];
  cauda.forEach(function(c, i) { pena(8, 10.6, Math.atan2(c[1] - 10.6, c[0] - 8) * 180 / Math.PI, Math.hypot(c[0] - 8, c[1] - 10.6), i % 2 ? ["O", "Y", "Y"] : ["R", "O", "Y"], 1.5); });
  // asas: leque de penas pontudas (triângulos) com degradê de fogo
  const leque = function(sx, sy, ang, comp, larg, sombra) {
    const a = ang * Math.PI / 180;
    const tx = sx + Math.cos(a) * comp, ty = sy + Math.sin(a) * comp;
    const nx = -Math.sin(a) * larg, ny = Math.cos(a) * larg;
    gPoli(g, [[sx + nx, sy + ny], [tx, ty], [sx - nx, sy - ny]], function(x, y) {
      if (sombra) return "d";
      const d = Math.hypot(x - sx, y - sy) / comp;
      return d < 0.38 ? "R" : d < 0.7 ? "O" : "Y";
    });
    gLinha(g, sx, sy, tx, ty, sombra ? "K" : "d");
  };
  if (mergulho) {
    [[172, 12.5, 1.6], [186, 13.5, 1.7], [160, 10.5, 1.5]].forEach(function(p) { leque(raiz[0], raiz[1], p[0], p[1], p[2], false); });
  } else {
    // asa de trás, escura, um pouco deslocada
    [-2, 0, 2].forEach(function(i) { leque(raiz[0] - 2.2, raiz[1] - 0.6, centro + i * 20, 10 - Math.abs(i) * 0.4, 1.7, true); });
  }
  const asaPerto = function() {
    [-2, -1, 0, 1, 2].forEach(function(i) { leque(raiz[0], raiz[1], centro + i * 17, 11.4 - Math.abs(i) * 0.9, 2.1, false); });
  };
  if (!mergulho && (f === 0 || f === 1)) asaPerto();
  // corpo
  gElipse(g, 13.6, 10, 6.5, 4.3, "K");
  gBola(g, 13.6, 10, 5.6, 3.4, "CRsH");
  gElipse(g, 14.8, 11.4, 3.8, 1.6, function(u, v) { return v < 0 ? "Y" : "O"; });
  // pescoço e cabeça
  gElipse(g, 19, 7, 3.9, 3.8, "K");
  gBola(g, 19, 7, 3, 2.9, "CRsH");
  gElipse(g, 19.6, 8, 1.8, 1.2, "Y");
  // crista de chamas
  [[18.4, 4.4, -118, 4], [19.8, 4.2, -88 + flick * 8, 4.6], [21, 4.8, -52, 3.6]].forEach(function(c, i) { pena(c[0], c[1], c[2], c[3], i === 1 ? ["O", "Y", "Y"] : ["R", "O", "Y"], 1.2); });
  // bico dourado
  gPoli(g, [[21.6, 6.2], [25, 7.4], [21.8, 8.8]], "G");
  gPoli(g, [[21.8, 7.6], [24.6, 7.6], [21.8, 8.8]], "g");
  gPonto(g, 24, 8, "g");
  // olho
  gRet(g, 19.6, 5.8, 2, 2, "W"); gPonto(g, 20.4, 6.4, "E"); gPonto(g, 20.4, 5.8, "E"); gPonto(g, 21, 6.4, "E");
  gLinha(g, 19, 5, 22, 5.6, "d");
  if (!mergulho && (f === 2 || f === 3)) { gElipse(g, raiz[0], raiz[1], 2.2, 1.6, "K"); asaPerto(); }
  // patas
  if (!mergulho) { gLinha(g, 12.6, 12.8, 12, 15, "G"); gLinha(g, 15, 12.8, 15.6, 15, "G"); gPonto(g, 11, 15, "G"); gPonto(g, 16.6, 15, "G"); }
  gContorno(g, "K");
  return gMapa(g);
}

registrarInimigo("fenix", [0, 1, 2, 3, 4].map(quadroFenix),
  { K: "#5a1a05", R: "#e8431a", O: "#ff8a1f", Y: "#ffd43b", d: "#b42d10", C: "#c42a0c", s: "#8f1a08", H: "#ffe9a8", G: "#ffcf3a", g: "#b8860b", W: "#ffffff", E: "#16080a" }, 2, {
  poses: { voar: P(4, 0, 1, 2, 3), parado: P(4, 0, 1, 2, 3), subindo: P(3, 0, 1, 2, 3), mergulho: P(1, 4) },
  olhos: [[20, 6]]
});


// ---------- OBSTÁCULOS ----------

// Desenhados com o motor de pixel art (js/pixelarte.js e js/arte_objetos.js)
const SPR_COGUMELO = construirCogumelo();
const SPR_TRONCO = construirTronco();
// Planta carnívora: três quadros da boca (escancarada, meio aberta, fechada mordendo)
const SPR_PLANTA_Q = [construirPlanta(1), construirPlanta(0.5), construirPlanta(0)];
const SPR_PLANTA = SPR_PLANTA_Q[1];
const SPR_ARMADILHA = construirArmadilha();
const SPR_BOLHA = construirBolha();


// ---------- CHEFES ----------
// Os chefes são desenhados por js/arte_chefes.js (motor de pixel art em js/pixelarte.js).
// Cada um tem vários quadros de animação em SPR_CHEFE[nome].q; d/e/flashD/flashE são o quadro de descanso.

const SPR_CHEFE = {};

function registrarChefe(nome, quadros, padrao) {
  const s = Object.assign({}, quadros[padrao]);
  s.q = quadros;
  SPR_CHEFE[nome] = s;
}

registrarChefe("gorila", gorilaQuadros(), "parado0");
registrarChefe("escorpiaoRei", escorpiaoQuadros(), "parado0");
registrarChefe("yeti", yetiQuadros(), "parado0");
registrarChefe("dragao", dragaoQuadros(), "voar0");

// Asas do dragão: vários quadros de batida (do alto até embaixo) e uma versão dobrada
const SPR_ASA = dragaoAsas();

const SPR_COROA_PEQ = spriteDuplo([
  "Y.YY.Y",
  "YYRRYY",
  "YYYYYY"
], { Y: "#ffd43b", R: "#e03131" }, 6);


// ---------- OBJETOS ----------

const SPR_BANANA = construirBanana();

const SPR_CORACAO = construirCoracao("#e03131", false);
const SPR_CORACAO_VAZIO = construirCoracao("#e03131", true);

const SPR_PLACA = construirPlaca();

const SPR_GEISER = construirGeiser();

const SPR_ESTALACTITE = construirEstalactite();

const SPR_BANDEIRA_OFF = construirBandeira(null);
const SPR_BANDEIRA_ON = MUNDOS.map(function(m) { return construirBandeira(m.cor); });

const SPR_GALHO = construirGalho();

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

// Ícones dos poderes e melhorias (32x32)
const ICONES = construirIcones();

// Projéteis
const SPR_PROJ = construirProjeteis();

// Moeda pixelada girando (MOEDA.frames quadros lado a lado, cada um t x t)
function criarMoedaPixelada(t) {
  return construirMoeda(t, MOEDA.frames);
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
    // a base vai até 162 (o mesmo topo de antes): fica sempre enterrada nas dunas, nunca "flutua"
    piramidePx(meio, 150, 162, 60, c);
    piramidePx(meio, 215, 162, 42, c);
    piramidePx(meio, 420, 162, 50, c);
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
if (FUNDO_SELVA_URL) imgFundoSelva.src = FUNDO_SELVA_URL;


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
