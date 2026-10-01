"use strict";

// =========================
// ARTE DOS OBJETOS: banana, moedas, coração, placa, gêiser, estalactite, bandeira, cipó, ícones,
// projéteis e obstáculos. Tudo desenhado com o motor de pixelarte.js (luz no canto superior esquerdo).
// =========================

// Cria uma grade, deixa a função desenhar e devolve o canvas (com contorno externo opcional)
function objCanvas(w, h, esc, fn, contorno) {
  const b = pxNovo(w, h);
  fn(b);
  if (contorno !== false) pxContorno(b, contorno || "#2a1608");
  return pxCanvas(b, esc);
}

// ---------- Banana (48x40) ----------

function construirBanana() {
  return objCanvas(24, 20, 2, function(b) {
    const R = ["#8a5408", "#d99a0c", "#ffd43b", "#fff29a"];
    const pts = [[3, 15.5, 1.1], [6, 17.4, 2.4], [10.5, 17.6, 3.5], [15, 15, 3.8], [18.2, 10.6, 3.5], [19.6, 6, 2.7]];
    for (let i = 0; i < pts.length - 1; i++) {
      pxMembro(b, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2], pts[i + 1][2], R, { rim: false, luz: 0.25 });
    }
    // quina da casca (aresta mais escura embaixo) e brilho em cima
    for (let i = 0; i < pts.length - 1; i++) {
      pxLinha(b, pts[i][0] + 1.2, pts[i][1] + pts[i][2] * 0.55, pts[i + 1][0] + 1.2, pts[i + 1][1] + pts[i + 1][2] * 0.55, R[1]);
      pxLinha(b, pts[i][0] - 0.8, pts[i][1] - pts[i][2] * 0.55, pts[i + 1][0] - 0.8, pts[i + 1][1] - pts[i + 1][2] * 0.55, R[3]);
    }
    pxPonto(b, 12, 13.8, "#ffffff");
    pxPonto(b, 13, 13.2, "#ffffff");
    pxPonto(b, 16, 8.6, "#ffffff");
    // cabo e ponta escura
    pxRet(b, 19, 1, 3, 3, "#6b4423");
    pxRet(b, 19, 1, 3, 1, "#9a6a3a");
    pxRet(b, 20, 3, 2, 1, "#4a2c12");
    pxRet(b, 2, 14, 2, 3, "#4a2c12");
    pxPonto(b, 2, 14, "#7a5428");
  }, "#5a3504");
}

// ---------- Corações (28x28) ----------

function construirCoracao(base, vazio) {
  return objCanvas(14, 14, 2, function(b) {
    const R = vazio ? ["#2b2f33", "#3f444a", "#565c63", "#6f767e"] : rampaDe(base, 4);
    pxElipse(b, 4.6, 5.2, 3.9, 3.9, R, { rim: false, luz: 0.1 });
    pxElipse(b, 9.4, 5.2, 3.9, 3.9, R, { rim: false, luz: 0.1 });
    pxPoligono(b, [[0.9, 6.5], [13.1, 6.5], [7, 12.6]], R, { rim: false, curva: 0.5, luz: 0.05 });
    pxRet(b, 3, 5, 8, 3, R[2]);
    // brilho
    if (!vazio) {
      pxRet(b, 2, 2, 2, 1, "#ffe3e3");
      pxPonto(b, 1, 3, "#ffe3e3");
      pxPonto(b, 2, 3, "#ffffff");
      pxPonto(b, 10, 3, R[3]);
      // sombra embaixo
      pxLinha(b, 10, 8, 8, 10.5, R[0]);
      pxLinha(b, 11, 6.5, 12, 6.5, R[1]);
    } else {
      pxRet(b, 2, 2, 2, 1, "#868e96");
      pxPonto(b, 1, 3, "#868e96");
    }
  }, vazio ? "#16181b" : "#3a0508");
}

// ---------- Placa (32x32) ----------

function construirPlaca() {
  return objCanvas(16, 16, 2, function(b) {
    const M = rampaDe("#b9843c", 5);
    const P = rampaDe("#6b4220", 4);
    // poste
    pxRet(b, 7, 9, 2, 6, P[2]);
    pxRet(b, 7, 9, 1, 6, P[3]);
    pxRet(b, 8, 9, 1, 6, P[1]);
    pxRet(b, 7, 14, 2, 1, P[0]);
    // tábua com pontas aparafusadas
    pxRet(b, 1, 1, 14, 9, M[2]);
    pxRet(b, 1, 1, 14, 1, M[4]);
    pxRet(b, 1, 2, 14, 1, M[3]);
    pxRet(b, 1, 9, 14, 1, M[0]);
    pxRet(b, 14, 2, 1, 7, M[1]);
    // veios da madeira
    pxLinha(b, 3, 4, 6, 4, M[1]);
    pxLinha(b, 9, 7, 13, 7, M[1]);
    // "texto" riscado e seta
    pxRet(b, 3, 3, 6, 1, "#4a2c12");
    pxRet(b, 3, 5, 9, 1, "#4a2c12");
    pxRet(b, 3, 7, 5, 1, "#4a2c12");
    pxPonto(b, 12, 3, "#4a2c12");
    // pregos
    pxPonto(b, 2, 2, "#e9ecef");
    pxPonto(b, 13, 2, "#e9ecef");
    pxPonto(b, 2, 8, "#adb5bd");
    pxPonto(b, 13, 8, "#adb5bd");
    // mato na base
    pxPonto(b, 6, 14, "#40c057"); pxPonto(b, 5, 15, "#2f9e44"); pxPonto(b, 9, 14, "#69db7c"); pxPonto(b, 10, 15, "#2f9e44");
  }, "#2a1608");
}

// ---------- Gêiser (64x20) ----------

function construirGeiser() {
  return objCanvas(32, 10, 2, function(b) {
    const S = ["#1e1b22", "#3a3641", "#585363", "#7c768a", "#a29cb4"];
    // monte de rocha com a cratera brilhando
    pxElipse(b, 16, 8, 15, 6, S, { rim: "#0c0a0f", tex: pxTexPelo(77, 0.16) });
    pxElipse(b, 16, 3.8, 9.8, 2.8, ["#5a1608", "#c2410c", "#ff7a1a", "#ffd25a"], { rim: "#0c0a0f", pont: 0 });
    pxElipse(b, 16, 3.8, 6, 1.6, ["#ff9a2e", "#ffd25a", "#fff0a0", "#ffffff"], { rim: false, pont: 0 });
    // pedrinhas e rachaduras com brilho de magma
    pxLinha(b, 5, 7, 8, 6, "#ff7a1a");
    pxLinha(b, 25, 7, 23, 6, "#ff7a1a");
    pxPonto(b, 12, 8, "#c2410c");
    pxPonto(b, 20, 8, "#c2410c");
    pxPonto(b, 3, 6, S[4]);
    pxPonto(b, 28, 6, S[3]);
  }, "#0c0a0f");
}

// ---------- Estalactite (24x36) ----------

function construirEstalactite() {
  return objCanvas(12, 18, 2, function(b) {
    const G = ["#2a78b8", "#4dabf7", "#a5d8ff", "#e7f5ff", "#ffffff"];
    pxPoligono(b, [[0.5, 0], [11.5, 0], [10.8, 5], [9.2, 11], [6.6, 17.6], [5.4, 17.6], [2.8, 11], [1.2, 5]], G, { rim: false, curva: 0.7, luz: 0.1 });
    // faces do cristal: lado escuro à direita
    pxPoligono(b, [[11.5, 0], [10.8, 5], [9.2, 11], [6.6, 17.6], [6, 17.6], [6.6, 10], [8, 5], [8.6, 0]], [G[0], G[0], G[1], G[1]], { rim: false, curva: 0, luz: -0.2 });
    // brilho
    pxLinha(b, 2.5, 1, 3, 5, "#ffffff");
    pxLinha(b, 4, 6, 4.8, 10, G[4]);
    pxPonto(b, 9, 2, G[3]);
    // base com neve
    pxRet(b, 0, 0, 12, 2, "#ffffff");
    pxRet(b, 1, 2, 3, 1, "#e7f5ff");
    pxRet(b, 8, 2, 3, 1, "#cfe8ff");
  }, "#1a4a78");
}

// ---------- Bandeira (40x80) ----------

function construirBandeira(cor) {
  return objCanvas(20, 40, 2, function(b) {
    const C = cor ? rampaDe(cor, 4) : ["#4a5057", "#6c747c", "#8d959d", "#b8bfc6"];
    const O = rampaDe("#ffcf2e", 5);
    // mastro de metal com bola dourada
    pxRet(b, 3, 5, 2, 35, "#c8ccd2");
    pxRet(b, 3, 5, 1, 35, "#f1f3f5");
    pxRet(b, 4, 5, 1, 35, "#8f969e");
    pxElipse(b, 4, 3, 2.6, 2.6, O, { rim: "#5c3a06" });
    pxRet(b, 1, 38, 6, 2, "#6c747c");
    // flâmula em duas pontas com dobras
    pxPoligono(b, [[5, 5], [19, 8.5], [14.5, 13], [19, 17.5], [5, 21]], C, { rim: false, curva: 0.4 });
    for (let k = 0; k < 4; k++) pxLinha(b, 7 + k * 3, 6.5 + k * 0.9, 7 + k * 3, 20 - k * 1, C[k % 2]);
    pxLinha(b, 5, 5, 19, 8.5, C[3]);
    pxLinha(b, 5, 21, 19, 17.5, C[0]);
    // emblema (estrelinha)
    pxPonto(b, 9, 13, "#ffffff"); pxPonto(b, 8, 13, "#fff3bf"); pxPonto(b, 10, 13, "#fff3bf"); pxPonto(b, 9, 12, "#fff3bf"); pxPonto(b, 9, 14, "#fff3bf");
  }, "#14181c");
}

// ---------- Galho do cipó (48x20) ----------

function construirGalho() {
  return objCanvas(24, 10, 2, function(b) {
    const N = rampaDe("#7a4a26", 5);
    const G = rampaDe("#38b248", 4);
    // galho grosso com nós e casca
    pxMembro(b, 1.5, 5.5, 22.5, 5.5, 2.7, 2.7, N, { rim: "#2a1608", tex: pxTexPelo(8, 0.18) });
    pxElipse(b, 12, 5.5, 1.6, 1.4, N, { rim: "#2a1608" });
    pxRet(b, 3, 3, 4, 1, N[4]);
    // folhas em cima e embaixo
    [[5, 2.6, -0.5], [10, 1.8, 0.6], [16, 2.2, -0.4], [20, 3, 0.7]].forEach(function(f) {
      pxElipse(b, f[0], f[1], 2.8, 1.5, G, { ang: f[2], rim: "#145a22" });
      pxPonto(b, f[0] - 1, f[1] - 0.4, G[3]);
    });
    [[7, 8.2, 0.5], [14, 8.6, -0.5]].forEach(function(f) {
      pxElipse(b, f[0], f[1], 2.6, 1.4, G, { ang: f[2], rim: "#145a22" });
    });
  }, "#1a3a14");
}

// ---------- Ícones dos poderes e melhorias (32x32) ----------

function construirIcones() {
  const I = {};
  I.velocidade = objCanvas(16, 16, 2, function(b) {
    const Y = ["#a8680a", "#f2b705", "#ffd43b", "#fff3a0"];
    pxPoligono(b, [[10, 0.5], [3, 9], [7.4, 9.2], [5, 15.5], [13, 5.8], [8.4, 5.6], [11.5, 0.5]], Y, { rim: false, curva: 0.6, luz: 0.2 });
    pxLinha(b, 9, 2, 5.5, 8, "#ffffff");
    pxLinha(b, 11, 6.6, 7, 13, Y[1]);
  }, "#3a2204");
  I.puloDuplo = objCanvas(16, 16, 2, function(b) {
    const B = ["#1a5aa8", "#3f95e8", "#74c0fc", "#d0ebff"];
    [1, 7.5].forEach(function(y, i) {
      pxPoligono(b, [[8, y], [14.5, y + 5.4], [14.5, y + 8], [8, y + 3], [1.5, y + 8], [1.5, y + 5.4]], B, { rim: false, curva: 0.5, luz: i ? 0 : 0.25 });
      pxLinha(b, 8, y + 0.6, 2.5, y + 5.4, "#ffffff");
    });
  }, "#0b2a58");
  I.escudo = objCanvas(16, 16, 2, function(b) {
    const B = ["#123f80", "#2a74cc", "#4dabf7", "#a5d8ff"];
    pxPoligono(b, [[1.5, 1.5], [8, 0.5], [14.5, 1.5], [14.5, 8], [11.5, 12.5], [8, 15.3], [4.5, 12.5], [1.5, 8]], B, { rim: false, curva: 0.7, luz: 0.1 });
    // bordas e emblema
    pxPoligono(b, [[8, 2.8], [12.8, 3.6], [12.8, 8], [10.4, 11.4], [8, 13.2], [5.6, 11.4], [3.2, 8], [3.2, 3.6]], ["#1a56a8", "#2f80d6", "#58b4ff", "#a5d8ff"], { rim: false, curva: 0.5, luz: -0.1 });
    pxRet(b, 7, 4, 2, 7, "#ffffff");
    pxRet(b, 5, 6, 6, 2, "#ffffff");
    pxPonto(b, 7, 4, "#fff3bf");
    pxLinha(b, 2.5, 2.5, 7, 1.7, "#e7f5ff");
  }, "#0a2450");
  I.ima = objCanvas(16, 16, 2, function(b) {
    const R = ["#7a1010", "#c92a2a", "#ff6b6b", "#ffc9c9"];
    const pts = [[3.2, 5, 2.6], [3.4, 8.5, 2.7], [5, 11.8, 2.7], [8, 13.2, 2.7], [11, 11.8, 2.7], [12.6, 8.5, 2.7], [12.8, 5, 2.6]];
    for (let i = 0; i < pts.length - 1; i++) pxMembro(b, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2], pts[i + 1][2], R, { rim: false, luz: 0.2 });
    // pontas de aço
    [[3.2, 1.2], [12.8, 1.2]].forEach(function(p) {
      pxRet(b, p[0] - 2.5, p[1] - 0.5, 5, 4, "#dee2e6");
      pxRet(b, p[0] - 2.5, p[1] - 0.5, 2, 4, "#ffffff");
      pxRet(b, p[0] + 1.5, p[1] - 0.5, 1, 4, "#868e96");
    });
    pxLinha(b, 4, 8, 5, 11.4, "#ffffff");
  }, "#3a0a0a");
  I.nuke = objCanvas(16, 16, 2, function(b) {
    const K = ["#14171a", "#2b3036", "#454c54", "#79828c"];
    pxElipse(b, 7.2, 9.6, 6, 5.8, K, { rim: false });
    pxPonto(b, 4, 7, "#ffffff"); pxPonto(b, 5, 6, "#dee2e6"); pxPonto(b, 4, 8, "#b0b8c0");
    // símbolo de perigo
    pxPonto(b, 7, 10, "#ffd43b"); pxPonto(b, 9, 10, "#ffd43b"); pxPonto(b, 8, 12, "#ffd43b"); pxPonto(b, 8, 10.6, "#ff922b");
    // tampa e pavio com faísca
    pxRet(b, 6, 3, 4, 2.4, "#868e96");
    pxRet(b, 6, 3, 4, 1, "#dee2e6");
    pxLinha(b, 9, 3, 11, 1.5, "#8a5a2b");
    pxLinha(b, 11, 1.5, 12, 1.5, "#8a5a2b");
    pxRet(b, 12, 0, 2, 2, "#ffd43b");
    pxPonto(b, 12, 0, "#ffffff"); pxPonto(b, 14, 1, "#ff922b"); pxPonto(b, 11, 0, "#ff922b"); pxPonto(b, 13, 2, "#ff922b");
  }, "#0a0c0e");
  I.dash = objCanvas(16, 16, 2, function(b) {
    const Y = ["#a8680a", "#f2b705", "#ffd43b", "#fff3a0"];
    [[1, 0], [6.5, 0.2]].forEach(function(o, i) {
      pxPoligono(b, [[o[0], 2.5], [o[0] + 4, 2.5], [o[0] + 8, 8], [o[0] + 4, 13.5], [o[0], 13.5], [o[0] + 4, 8]], Y, { rim: false, curva: 0.5, luz: i ? 0.25 : -0.05 });
    });
    pxLinha(b, 0, 6, 2, 6, Y[1]);
    pxLinha(b, 0, 10, 3, 10, Y[1]);
  }, "#3a2204");
  I.coracao1 = construirCoracao("#e03131", false);
  I.coracao2 = construirCoracao("#d6336c", false);
  I.revolver = SPR_REVOLVER.d;
  I.cipoLongo = objCanvas(16, 16, 2, function(b) {
    const G = ["#145a22", "#2b9a3c", "#51cf66", "#b2f2bb"];
    const pts = [];
    for (let i = 0; i <= 11; i++) {
      const a = 0.5 + (i / 11) * Math.PI * 1.9;
      pts.push([8 + Math.cos(a) * (5.6 - i * 0.12), 7.5 + Math.sin(a) * (5.2 - i * 0.1)]);
    }
    for (let i = 0; i < pts.length - 1; i++) pxMembro(b, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 1.5, 1.5, G, { rim: false, luz: 0.2 });
    // folhas e ponta enrolada
    pxElipse(b, 12.8, 12.5, 2.4, 1.3, G, { ang: -0.7, rim: "#0b3a14" });
    pxElipse(b, 3, 11.5, 2.2, 1.2, G, { ang: 0.7, rim: "#0b3a14" });
    pxMembro(b, pts[11][0], pts[11][1], pts[11][0] + 1.5, pts[11][1] + 3.5, 1.2, 0.5, G, { rim: false });
    pxMembro(b, 8, 13, 8, 15.5, 1.2, 0.8, G, { rim: false });
  }, "#082a10");
  return I;
}

// ---------- Projéteis ----------

// Esfera sombreada
function esferaPx(b, cx, cy, r, rampa, o) {
  pxElipse(b, cx, cy, r, r, rampa, o || { rim: false });
}

function construirProjeteis() {
  const P = {};
  // coco: casca marrom com os três "olhos" e fibras
  P.coco = objCanvas(12, 12, 2, function(b) {
    esferaPx(b, 6, 6, 5.4, ["#3a2208", "#6b4220", "#8a5a2b", "#c4915a"], { rim: false, tex: pxTexPelo(3, 0.22) });
    pxPonto(b, 4, 4, "#2a1608"); pxPonto(b, 7, 4, "#2a1608"); pxPonto(b, 5.5, 6.5, "#2a1608");
    pxPonto(b, 3.5, 3, "#e3b88a");
  }, "#2a1608");
  // bola de neve pequena
  P.neve = objCanvas(10, 10, 2, function(b) {
    esferaPx(b, 5, 5, 4.4, ["#7f9fc8", "#b9d2ee", "#eef6ff", "#ffffff"]);
    pxPonto(b, 3, 3, "#ffffff");
  }, "#5a7aa6");
  // bola de fogo
  P.fogo = objCanvas(12, 12, 2, function(b) {
    esferaPx(b, 6, 6, 5.2, ["#a8300a", "#e8590c", "#ff922b", "#ffd43b"], { rim: false, pont: 0.3 });
    esferaPx(b, 5.5, 5.8, 3.2, ["#ff922b", "#ffd43b", "#fff3a0", "#ffffff"], { rim: false });
    pxFiapos(b, 0.5, 4, null, ["#a8300a", "#e8590c"]);
    pxPonto(b, 4, 4, "#ffffff");
  }, "#7a1a04");
  // veneno
  P.veneno = objCanvas(12, 12, 2, function(b) {
    esferaPx(b, 6, 6.4, 5.3, ["#35094a", "#7a24a0", "#b84fd8", "#f0a8ff"]);
    pxRet(b, 3, 3, 2, 1, "#ffffff");
    pxPonto(b, 3, 4, "#f7d0ff");
    pxPonto(b, 8, 8, "#e599f7");
    pxElipse(b, 9, 2.6, 1.2, 1.2, ["#35094a", "#9c36b5", "#d28cf0", "#ffffff"], { rim: false });
  }, "#240638");
  // bolão de neve gigante
  P.bolao = objCanvas(36, 36, 2, function(b) {
    esferaPx(b, 18, 18, 17.2, ["#7494c0", "#a8c2e6", "#dfecfa", "#ffffff"], { rim: false, tex: function(x, y, i) {
      const h = pxHash(Math.floor(x / 2), Math.floor(y / 2), 5);
      return h < 0.13 ? i - 1 : h > 0.9 ? i + 1 : i;
    } });
    // torrões e gravetos presos na bola
    [[10, 12], [24, 22], [14, 26], [26, 10]].forEach(function(p, i) {
      pxRet(b, p[0], p[1], 3, 2, "#7494c0");
      pxRet(b, p[0], p[1], 3, 1, "#b8d0ee");
    });
    pxLinha(b, 20, 8, 25, 12, "#8a6a4a");
    pxLinha(b, 8, 22, 12, 28, "#6a4a30");
  }, "#4a6a96");
  // meteoro: rocha com rachaduras de magma
  P.meteoro = objCanvas(20, 20, 2, function(b) {
    esferaPx(b, 10, 10, 9.2, ["#1c100e", "#3a2a24", "#5a443a", "#8a6a58"], { rim: false, tex: pxTexPelo(11, 0.18) });
    [[4, 8, 8, 11], [8, 11, 7, 15], [8, 11, 13, 12], [13, 12, 15, 8], [12, 5, 10, 8]].forEach(function(l) {
      pxLinha(b, l[0], l[1], l[2], l[3], "#ff7a1a");
      pxPonto(b, (l[0] + l[2]) / 2, (l[1] + l[3]) / 2, "#ffd25a");
    });
    pxFiapos(b, 0.55, 8, null, ["#1c100e", "#3a2a24", "#5a443a"]);
  }, "#7a1a04");
  // podoboo: bola de lava com carinha brava
  P.podoboo = objCanvas(16, 16, 2, function(b) {
    pxPoligono(b, [[4, 5], [5, 0.5], [7, 3], [8.6, 0], [10, 3], [12, 1], [12, 6]], ["#c2410c", "#ff6b00", "#ffa94d", "#ffe066"], { rim: false, curva: 0.4 });
    esferaPx(b, 8, 9, 6.6, ["#c2410c", "#ff6b00", "#ffa94d", "#ffe066"], { rim: false, pont: 0.3 });
    pxRet(b, 4.5, 7.5, 3, 2, "#ffffff"); pxRet(b, 9, 7.5, 3, 2, "#ffffff");
    pxPonto(b, 6, 8.5, "#7a0a0a"); pxPonto(b, 10, 8.5, "#7a0a0a");
    pxLinha(b, 4, 6.5, 7.5, 7.5, "#7a0a0a"); pxLinha(b, 12.5, 6.5, 9, 7.5, "#7a0a0a");
    pxRet(b, 6, 11.5, 4, 1, "#7a0a0a");
  }, "#7a1a04");
  P.pedra = construirPedra(40, 3, true);
  P.pedrinha = construirPedra(14, 9, false);
  P.bolaNeve = objCanvas(28, 28, 2, function(b) {
    esferaPx(b, 14, 14, 13.2, ["#7494c0", "#a8c2e6", "#dfecfa", "#ffffff"], { rim: false, tex: function(x, y, i) {
      const h = pxHash(Math.floor(x / 2), Math.floor(y / 2), 9);
      return h < 0.13 ? i - 1 : h > 0.9 ? i + 1 : i;
    } });
    pxRet(b, 8, 9, 3, 2, "#7494c0"); pxRet(b, 18, 17, 3, 2, "#7494c0");
    pxLinha(b, 15, 6, 19, 9, "#8a6a4a");
  }, "#4a6a96");
  P.bolaFogo = objCanvas(10, 10, 2, function(b) {
    esferaPx(b, 5, 5, 4.2, ["#c2410c", "#ff7a1a", "#ffd25a", "#ffffff"], { rim: false, pont: 0.3 });
    pxFiapos(b, 0.4, 6, null, ["#c2410c", "#ff7a1a"]);
  }, "#7a1a04");
  return P;
}

// Pedra: polígono irregular com facetas e rachaduras
function construirPedra(n, sem, rachaduras) {
  return objCanvas(n, n, 2, function(b) {
    const c = n / 2;
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = c * (0.86 + pxHash(i, 3, sem) * 0.14);
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
    }
    pxPoligono(b, pts, ["#2e3238", "#575d66", "#858d98", "#bcc3cc"], { rim: false, curva: 0.9, tex: function(x, y, i) {
      const h = pxHash(Math.floor(x / 2), Math.floor(y / 2), sem);
      return h < 0.15 ? i - 1 : h > 0.92 ? i + 1 : i;
    } });
    if (rachaduras) {
      pxLinha(b, c - 4, c - 6, c, c - 1, "#2e3238");
      pxLinha(b, c, c - 1, c + 4, c + 3, "#2e3238");
      pxLinha(b, c, c - 1, c - 3, c + 5, "#2e3238");
      pxPonto(b, c - 8, c - 8, "#dee2e6"); pxPonto(b, c - 7, c - 8, "#dee2e6");
      // musgo
      pxRet(b, c + 5, c + 7, 4, 2, "#4a7a3a");
    }
  }, "#1a1d21");
}

// ---------- Moeda (frames girando) ----------

function construirMoeda(t, frames) {
  const esc = t / 16;
  const c = criarCanvas(t * frames, t);
  const g = c.getContext("2d");
  const OURO = ["#7a4a06", "#c88a0c", "#ffcf2e", "#fff0a0"];
  const banana = [[-3, 1], [-2, 2], [-1, 3], [0, 3], [1, 3], [2, 2], [3, 0], [3, -1], [3, -2]];
  for (let f = 0; f < frames; f++) {
    const b = pxNovo(16, 16);
    const ang = (f / frames) * Math.PI * 2;
    const cs = Math.cos(ang);
    const w = Math.abs(cs);
    const rx = 7.2 * w;
    if (rx < 1.6) {
      // de lado: uma moeda fininha com a borda reta
      pxRet(b, 6.5, 1.5, 3, 13, OURO[1]);
      pxRet(b, 6.5, 1.5, 1, 13, OURO[3]);
      pxRet(b, 8.5, 1.5, 1, 13, OURO[0]);
      pxRet(b, 7.5, 3, 1, 10, OURO[2]);
    } else {
      pxElipse(b, 8, 8, rx, 7.2, OURO, { rim: OURO[0], rimClaro: OURO[2], pont: 0 });
      // aro interno
      if (rx > 4.5) {
        for (let a = 0; a < 40; a++) {
          const aa = (a / 40) * Math.PI * 2;
          pxPonto(b, 8 + Math.cos(aa) * (rx - 1.8), 8 + Math.sin(aa) * 5.4, OURO[1]);
        }
      }
      // emblema de banana (espelha no verso)
      const s = cs > 0 ? 1 : -1;
      if (rx > 3.6) {
        banana.forEach(function(p) {
          pxPonto(b, 8 + p[0] * s * w * 0.95 + 0.4, 8 + p[1] + 0.5, OURO[0]);
        });
        banana.forEach(function(p) {
          pxPonto(b, 8 + p[0] * s * w * 0.95, 8 + p[1] - 0.2, "#fff6c0");
        });
      }
      // reflexo diagonal (brilho que passa)
      if (f % frames < 3 && rx > 4) {
        pxLinha(b, 8 - rx * 0.6, 4.2, 8 - rx * 0.1, 2.4, "#ffffff");
        pxPonto(b, 8 - rx * 0.7, 5.4, "#ffffff");
      }
    }
    pxContorno(b, "#5a3504");
    g.drawImage(pxCanvas(b, esc), f * t, 0);
  }
  return c;
}

// ---------- Obstáculos ----------

function construirCogumelo() {
  return objCanvas(32, 14, 2, function(b) {
    const R = ["#7a0e0e", "#c92a2a", "#ee4a3e", "#ff8a7a"];
    const T = ["#8a6a48", "#c9a574", "#ecd9b8", "#fff5e0"];
    // caule
    pxRet(b, 11, 8, 10, 6, T[2]);
    pxRet(b, 11, 8, 3, 6, T[3]);
    pxRet(b, 18, 8, 3, 6, T[1]);
    pxRet(b, 10, 13, 12, 1, T[0]);
    pxRet(b, 14, 10, 1, 2, T[1]);
    // chapéu em cúpula (parte de cima de uma elipse)
    pxForma(b, 0, 0, 32, 14, function(x, y) {
      const dx = (x - 16) / 15.8;
      const dy = (y - 8.6) / 8.6;
      if (y > 9.4 || dx * dx + dy * dy > 1) return null;
      return { nx: dx, ny: dy, nz: Math.sqrt(Math.max(0.02, 1 - dx * dx - dy * dy)) };
    }, R, { rim: "#4a0808", pont: 0 });
    // sombra por baixo do chapéu
    pxRet(b, 2, 9, 28, 1, "#4a0808");
    pxRet(b, 4, 10, 24, 1, "rgba(0,0,0,0.0)");
    // bolinhas brancas
    [[8, 4, 2.4], [16, 2.5, 2.8], [24, 4.4, 2.2], [12, 6.6, 1.5], [21, 7, 1.5], [4.5, 7, 1.2]].forEach(function(p) {
      pxElipse(b, p[0], p[1], p[2], p[2] * 0.8, ["#c9ced6", "#e9ecef", "#ffffff", "#ffffff"], { rim: false, pont: 0 });
    });
  }, "#2a0606");
}

function construirTronco() {
  return objCanvas(20, 20, 2, function(b) {
    const casca = ["#2a1608", "#4a2c12", "#6b4220", "#8a5a2b"];
    const miolo = ["#8a5a2b", "#b8844a", "#d9a868", "#f0cd96"];
    pxElipse(b, 10, 10, 9.6, 9.6, casca, { rim: false, tex: pxTexPelo(2, 0.25) });
    pxForma(b, 0, 0, 20, 20, function(x, y) {
      const dx = (x - 10) / 7.4, dy = (y - 10) / 7.4;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) return null;
      // anéis do tronco: bandas concêntricas
      const k = Math.sqrt(d2);
      const anel = Math.floor(k * 3.4) % 2;
      return { nx: dx * 0.3, ny: dy * 0.3, nz: anel ? 0.35 : 0.8 };
    }, miolo, { rim: casca[1], pont: 0 });
    // coração do tronco, nó e rachadura
    pxElipse(b, 10, 10, 1.4, 1.4, ["#6b4220", "#8a5a2b", "#a67540", "#c49660"], { rim: false });
    pxLinha(b, 10, 10, 15, 7, "#6b4220");
    pxPonto(b, 6, 6, "#f0cd96"); pxPonto(b, 7, 5, "#f0cd96");
  }, "#1a0e04");
}

// Planta carnívora: boca = 0 (fechada) a 1 (escancarada), 24x32
function construirPlanta(boca) {
  return objCanvas(24, 32, 2, function(b) {
    const V = ["#0f4a1c", "#1f8a34", "#3fbf57", "#8ce99a"];
    const R = ["#6a0a14", "#c2182a", "#ee3b4a", "#ff8a95"];
    const abre = boca * 5.5;
    // caule e folhas
    pxMembro(b, 12, 31, 12, 17, 1.9, 1.9, V, { rim: "#06260d" });
    pxElipse(b, 5.5, 25, 5, 2.2, V, { ang: -0.45, rim: "#06260d" });
    pxElipse(b, 18.5, 22, 5, 2.2, V, { ang: 0.45, rim: "#06260d" });
    pxLinha(b, 3, 25, 8, 24, V[3]);
    // mandíbula de baixo
    pxElipse(b, 12, 15 + abre * 0.5, 10.4, 4.6, R, { rim: "#3a0408", pont: 0 });
    // garganta escura
    pxElipse(b, 12, 11.5, 8.4, 3 + abre * 0.7, ["#14040a", "#2a0810", "#3a0c18", "#5a1428"], { rim: false, pont: 0 });
    // dentes de baixo (triângulos apontando para cima)
    const dentesY = 12.5 + abre * 0.2;
    for (let k = 0; k < 4; k++) {
      const x = 5.5 + k * 4.3;
      pxRet(b, x - 1, dentesY, 3, 1, "#ffffff");
      pxPonto(b, x, dentesY - 1, "#ffffff");
      pxPonto(b, x - 1, dentesY, "#dee2e6");
    }
    // língua
    if (boca > 0.3) pxRet(b, 10, 12 + abre * 0.3, 4, 1, "#ff6b8b");
    // mandíbula de cima (tampa) com pintas
    const topoY = 8.5 - abre;
    pxForma(b, 0, 0, 24, 20, function(x, y) {
      const dx = (x - 12) / 11, dy = (y - (topoY + 2.5)) / 6.2;
      if (y > topoY + 3.4 || dx * dx + dy * dy > 1) return null;
      return { nx: dx, ny: dy, nz: Math.sqrt(Math.max(0.02, 1 - dx * dx - dy * dy)) };
    }, R, { rim: "#3a0408", pont: 0 });
    [[6, 0.8], [12, -0.6], [17.5, 1.2]].forEach(function(p) { pxElipse(b, p[0], topoY + 2.2 + p[1], 1.8, 1.3, ["#e9ecef", "#ffffff", "#ffffff", "#ffffff"], { rim: false, pont: 0 }); });
    // dentes de cima (triângulos apontando para baixo)
    for (let k = 0; k < 4; k++) {
      const x = 7.5 + k * 3.4;
      pxRet(b, x - 1, topoY + 3.2, 3, 1, "#ffffff");
      pxPonto(b, x, topoY + 4.2, "#ffffff");
      pxPonto(b, x + 1, topoY + 3.2, "#dee2e6");
    }
  }, "#06260d");
}

// Armadilha de dardos: bloco de pedra entalhado com o buraco do dardo virado para a esquerda (16x16)
function construirArmadilha() {
  return objCanvas(16, 16, 2, function(b) {
    const S = ["#3a2a1a", "#6b4a26", "#a8782e", "#d9a648", "#f1c978"];
    pxRet(b, 0, 0, 16, 16, S[2]);
    pxRet(b, 0, 0, 16, 2, S[4]);
    pxRet(b, 0, 0, 2, 16, S[3]);
    pxRet(b, 14, 0, 2, 16, S[1]);
    pxRet(b, 0, 14, 16, 2, S[0]);
    // moldura entalhada
    pxRet(b, 3, 3, 10, 10, S[1]);
    pxRet(b, 4, 4, 8, 8, S[2]);
    pxRet(b, 4, 4, 8, 1, S[3]);
    // cano do dardo (a esquerda), preto com borda de metal
    pxRet(b, 0, 6, 6, 4, "#2a2e33");
    pxRet(b, 0, 6, 6, 1, "#868e96");
    pxRet(b, 0, 9, 6, 1, "#16181b");
    pxRet(b, 0, 7, 3, 2, "#000000");
    // olho entalhado que acende antes de disparar
    pxRet(b, 8, 5, 3, 2, "#3a2a1a");
    pxPonto(b, 9, 6, "#e03131");
    pxRet(b, 7, 9, 5, 1, "#3a2a1a");
    // parafusos e símbolo
    [[1.5, 1.5], [14, 1.5], [1.5, 14], [14, 14]].forEach(function(p) { pxPonto(b, p[0], p[1], "#e9ecef"); });
    pxLinha(b, 8, 11, 11, 11, S[0]);
  }, "#1e140a");
}

// Bolha de power-up: anel iridescente com brilhos, quase transparente por dentro (44x44)
function construirBolha() {
  const n = 22;
  const c = criarCanvas(n * 2, n * 2);
  const g = c.getContext("2d");
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - n / 2, dy = y + 0.5 - n / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > n / 2) continue;
      const borda = n / 2 - d;
      const ang = Math.atan2(dy, dx);
      let cor;
      if (borda < 1.2) cor = "rgba(255,255,255,0.95)";
      else if (borda < 2.4) {
        // iridescência: rosa embaixo à direita, ciano em cima à esquerda
        const k = (Math.cos(ang - Math.PI / 4) + 1) / 2;
        cor = k > 0.62 ? "rgba(255,170,220,0.55)" : k < 0.38 ? "rgba(140,230,255,0.55)" : "rgba(255,255,255,0.3)";
      } else cor = "rgba(190,225,255," + (0.1 + Math.max(0, dx * 0.012 + dy * 0.012)).toFixed(3) + ")";
      g.fillStyle = cor;
      g.fillRect(x * 2, y * 2, 2, 2);
    }
  }
  // reflexos
  g.fillStyle = "rgba(255,255,255,0.95)";
  [[5, 4], [6, 4], [7, 4], [4, 5], [4, 6], [4, 7]].forEach(function(p) { g.fillRect(p[0] * 2, p[1] * 2, 2, 2); });
  g.fillStyle = "rgba(255,255,255,0.7)";
  [[16, 17], [17, 16], [17, 15]].forEach(function(p) { g.fillRect(p[0] * 2, p[1] * 2, 2, 2); });
  return c;
}
