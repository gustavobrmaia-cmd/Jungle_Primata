"use strict";

// =========================
// EFEITOS: sistema de partículas com pool fixo (sem alocar no quadro)
// Tudo desenhado com sprites em cache (brilho/fumaça/fogo/estrela) ou formas simples.
// =========================

const Efeitos = (function() {
  var MAX = 800;
  var PI2 = Math.PI * 2;
  var CONTORNO = "#1b1030";

  // tipos de partícula
  var T_BRILHO = 0, T_SUAVE = 1, T_FOGO = 2, T_ESTRELA = 3, T_FLARE = 4, T_CONFETE = 5,
      T_CACO = 6, T_FAISCA = 7, T_ANEL = 8, T_PEDACO = 9, T_CRISTAL = 10;
  // quais desenham com "lighter" (brilho aditivo)
  var ADITIVO = [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0];
  // quanto rápido some no fim da vida (alfa = alfa * min(1, vida01 * k))
  var FADE = [1.2, 2.2, 2.4, 3, 2, 3, 3, 1.6, 1.4, 3, 3];

  // ---------- pool em arrays (struct of arrays) ----------
  var X = new Float32Array(MAX), Y = new Float32Array(MAX);
  var VX = new Float32Array(MAX), VY = new Float32Array(MAX);
  var VIDA = new Float32Array(MAX), VMAX = new Float32Array(MAX);
  var TAM = new Float32Array(MAX), TAMF = new Float32Array(MAX);
  var ROT = new Float32Array(MAX), VROT = new Float32Array(MAX);
  var GRAV = new Float32Array(MAX), ARR = new Float32Array(MAX), ALFA = new Float32Array(MAX);
  var EST = new Float32Array(MAX), EXTRA = new Float32Array(MAX);
  var TIPO = new Uint8Array(MAX);
  var CID = new Uint16Array(MAX), CID2 = new Uint16Array(MAX);
  var n = 0;

  // ---------- cores: id numérico por string ----------
  var nomesCor = [], idsCor = {};
  function cid(cor) {
    var i = idsCor[cor];
    if (i === undefined) { i = nomesCor.length; nomesCor.push(cor); idsCor[cor] = i; }
    return i;
  }
  function hexRgb(h) {
    if (h.charAt(0) === "#") h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function mix(cor, alvo, q) {
    var a = hexRgb(cor);
    return "rgb(" + Math.round(a[0] + (alvo[0] - a[0]) * q) + "," + Math.round(a[1] + (alvo[1] - a[1]) * q) +
      "," + Math.round(a[2] + (alvo[2] - a[2]) * q) + ")";
  }
  function paraHex(cor) {
    // garante hex (mix devolve rgb()); só usado em cores de partículas derivadas
    var m = /rgb\((\d+),(\d+),(\d+)\)/.exec(cor);
    if (!m) return cor;
    return "#" + [m[1], m[2], m[3]].map(function(v) { return ("0" + (+v).toString(16)).slice(-2); }).join("");
  }
  var luz = function(c) { return paraHex(mix(c, [255, 255, 255], 0.5)); };
  var escura = function(c) { return paraHex(mix(c, [27, 16, 48], 0.55)); };

  var C_BRANCO = cid("#ffffff"), C_AMARELO = cid("#ffe066"), C_LARANJA = cid("#ff9a1f"),
      C_VERMELHO = cid("#ff4a1c"), C_CINZA = cid("#8d8698"), C_CINZA_ESC = cid("#4a4452"),
      C_BEGE = cid("#d9c3a0"), C_CONTORNO = cid(CONTORNO), C_GELO = cid("#bff4ff"),
      C_GELO_ESC = cid("#2e7aa6"), C_CREME = cid("#fff3b0"), C_MARROM = cid("#7a5238"),
      C_MARROM_ESC = cid("#2c1a14"), C_CINZA_PED = cid("#6d6676");

  // ---------- sprites em cache ----------
  function criarCanvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  var sprBrilho = [], sprSuave = [], sprEstrela = [];
  function brilhoSpr(i) {
    var s = sprBrilho[i];
    if (s) return s;
    var rgb = hexRgb(nomesCor[i]);
    s = criarCanvas(64, 64);
    var g = s.getContext("2d");
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.18, "rgba(" + Math.min(255, rgb[0] + 90) + "," + Math.min(255, rgb[1] + 90) + "," + Math.min(255, rgb[2] + 90) + ",0.95)");
    gr.addColorStop(0.45, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.5)");
    gr.addColorStop(1, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (sprBrilho[i] = s);
  }
  function suaveSpr(i) {
    var s = sprSuave[i];
    if (s) return s;
    var rgb = hexRgb(nomesCor[i]);
    s = criarCanvas(64, 64);
    var g = s.getContext("2d");
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.95)");
    gr.addColorStop(0.55, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.55)");
    gr.addColorStop(1, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (sprSuave[i] = s);
  }
  // estrela de 5 pontas fofa (contorno escuro + miolo claro)
  function estrelaSpr(i) {
    var s = sprEstrela[i];
    if (s) return s;
    var cor = nomesCor[i];
    s = criarCanvas(48, 48);
    var g = s.getContext("2d");
    function ponta(ro, ri) {
      g.beginPath();
      for (var k = 0; k < 10; k++) {
        var a = k * Math.PI / 5 - Math.PI / 2, rr = k & 1 ? ri : ro;
        g[k ? "lineTo" : "moveTo"](24 + Math.cos(a) * rr, 25 + Math.sin(a) * rr);
      }
      g.closePath();
    }
    g.lineJoin = "round";
    ponta(21, 9.5); g.fillStyle = CONTORNO; g.fill(); g.strokeStyle = CONTORNO; g.lineWidth = 3; g.stroke();
    ponta(18, 8); g.fillStyle = cor; g.fill();
    ponta(10, 4.5); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill();
    return (sprEstrela[i] = s);
  }
  // clarão em cruz (4 pontas finas), branco
  var sprFlare = null;
  function flareSpr() {
    if (sprFlare) return sprFlare;
    var c = criarCanvas(96, 96), g = c.getContext("2d");
    g.translate(48, 48);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 16, 0, PI2); g.fill();
    g.fillStyle = "#fff";
    for (var k = 0; k < 4; k++) {
      g.save(); g.rotate(k * Math.PI / 2);
      g.beginPath(); g.moveTo(-3.6, 0); g.quadraticCurveTo(-1.8, -1.8, 0, -46);
      g.quadraticCurveTo(1.8, -1.8, 3.6, 0); g.closePath(); g.fill();
      g.restore();
    }
    return (sprFlare = c);
  }
  // 4 sprites de bola de fogo: amarelo, laranja, vermelho, fumaça
  var sprFogo = null;
  function fogoSprs() {
    if (sprFogo) return sprFogo;
    var cores = [
      ["#fffbd0", "#ffd24a", "#ff9a1f"],
      ["#ffc440", "#ff7a1c", "#d8401a"],
      ["#e05a22", "#a42f1c", "#4d2422"],
      ["#7c7482", "#524b59", "#2f2a36"]
    ];
    sprFogo = cores.map(function(c, idx) {
      var s = criarCanvas(64, 64), g = s.getContext("2d");
      var gr = g.createRadialGradient(28, 27, 0, 32, 32, 31);
      gr.addColorStop(0, c[0]); gr.addColorStop(0.45, c[1]); gr.addColorStop(0.8, c[2]);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return s;
    });
    return sprFogo;
  }

  // ---------- spawn ----------
  var rnd = Math.random;
  function entre(a, b) { return a + (b - a) * rnd(); }

  function nova(tipo, x, y, vx, vy, vida, tam, tamf, c, grav, arr, alfa) {
    if (n >= MAX) return -1;
    var i = n++;
    TIPO[i] = tipo; X[i] = x; Y[i] = y; VX[i] = vx; VY[i] = vy;
    VIDA[i] = vida; VMAX[i] = vida; TAM[i] = tam; TAMF[i] = tamf;
    CID[i] = c; CID2[i] = C_CONTORNO; GRAV[i] = grav; ARR[i] = arr; ALFA[i] = alfa;
    ROT[i] = 0; VROT[i] = 0; EST[i] = 0; EXTRA[i] = 0;
    return i;
  }

  // atalhos
  function brilhoP(x, y, vida, tam, tamf, c, alfa) { return nova(T_BRILHO, x, y, 0, 0, vida, tam, tamf, c, 0, 0, alfa); }
  function anelP(x, y, vida, r0, r1, c, larg, alfa) {
    var i = nova(T_ANEL, x, y, 0, 0, vida, r0, r1, c, 0, 0, alfa);
    if (i >= 0) EXTRA[i] = larg;
  }
  function faiscaP(x, y, ang, vel, vida, tam, c, grav) {
    nova(T_FAISCA, x, y, Math.cos(ang) * vel, Math.sin(ang) * vel, vida, tam, tam * 0.4, c, grav, 0.7, 1);
  }
  function estrelaP(x, y, ang, vel, vida, tam, c, grav) {
    var i = nova(T_ESTRELA, x, y, Math.cos(ang) * vel, Math.sin(ang) * vel, vida, tam, tam * 0.5, c, grav, 1.2, 1);
    if (i >= 0) { ROT[i] = rnd() * PI2; VROT[i] = entre(-8, 8); }
  }
  function flareP(x, y, vida, tam, rot, alfa) {
    var i = nova(T_FLARE, x, y, 0, 0, vida, tam, tam * 0.4, C_BRANCO, 0, 0, alfa);
    if (i >= 0) ROT[i] = rot;
  }
  function suaveP(x, y, vx, vy, vida, tam, tamf, c, alfa, grav, arr) {
    nova(T_SUAVE, x, y, vx, vy, vida, tam, tamf, c, grav || 0, arr || 0, alfa);
  }
  function fogoP(x, y, vx, vy, vida, tam, tamf, est, alfa, grav, arr) {
    var i = nova(T_FOGO, x, y, vx, vy, vida, tam, tamf, 0, grav || 0, arr || 0, alfa);
    if (i >= 0) EST[i] = est;
  }

  // ---------- tremor de câmera ----------
  var tremorA = 0;
  var desloc = { x: 0, y: 0 };
  function tremer(forca) {
    forca = Math.min(26, forca || 0);
    if (forca > tremorA) tremorA = forca;
  }
  function deslocamento() { return desloc; }

  // ---------- textos flutuantes (poucos, lista própria) ----------
  var NT = 28;
  var textos = [];
  for (var ti = 0; ti < NT; ti++) textos.push({ vivo: false, txt: "", cor: "#fff", x: 0, y: 0, vida: 0, vmax: 1, vy: 0, esc: 1 });
  var proxTexto = 0;
  function texto(x, y, txt, cor, escala) {
    var tx = null;
    for (var k = 0; k < NT; k++) { if (!textos[k].vivo) { tx = textos[k]; break; } }
    if (!tx) { tx = textos[proxTexto]; proxTexto = (proxTexto + 1) % NT; } // reaproveita o mais antigo
    tx.vivo = true; tx.txt = String(txt); tx.cor = cor || "#fff";
    tx.x = x; tx.y = y; tx.vmax = tx.vida = 1.0; tx.vy = 95; tx.esc = escala || 1;
  }

  // ---------- efeitos prontos ----------
  function explosao(x, y, raio) {
    var R = Math.max(18, raio || 60);
    var k = R / 80;
    tremer(Math.min(16, R * 0.13));

    // clarão branco-amarelo + halo laranja
    brilhoP(x, y, 0.16, R * 0.8, R * 1.8, C_CREME, 0.75);
    brilhoP(x, y, 0.4, R * 0.8, R * 1.5, C_LARANJA, 0.4);
    flareP(x, y, 0.18, R * 1.5, rnd() * 3, 0.7);

    // núcleo da bola de fogo + bolhas de fogo que viram fumaça
    fogoP(x, y, 0, 0, 0.55, R * 0.5, R * 1.0, 2.6, 1, 0, 0);
    var nf = Math.round(5 + R / 14);
    for (var i = 0; i < nf; i++) {
      var a = rnd() * PI2, d = rnd() * R * 0.5, v = entre(40, 160) * k;
      fogoP(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v - 25 * k,
        entre(0.5, 0.95), R * entre(0.35, 0.55), R * entre(0.55, 0.85), 3, 1, -30, 1.6);
    }
    // anéis de choque
    anelP(x, y, 0.36, R * 0.25, R * 1.3, C_CREME, 3 + R / 28, 0.85);
    anelP(x, y, 0.5, R * 0.2, R * 1.0, C_LARANJA, 2 + R / 40, 0.7);
    // fumaça escura subindo
    var ns = Math.round(3 + R / 28);
    for (i = 0; i < ns; i++) {
      suaveP(x + entre(-R, R) * 0.4, y + entre(-R, R) * 0.3, entre(-30, 30) * k, entre(-70, -25) * k,
        entre(1.0, 1.7), R * entre(0.25, 0.4), R * entre(0.6, 0.9), C_CINZA_ESC, 0.5, -20, 0.8);
    }
    // faíscas
    var nfa = Math.round(10 + R / 5);
    var cs = [C_AMARELO, C_LARANJA, C_BRANCO, C_CREME];
    for (i = 0; i < nfa; i++) {
      faiscaP(x, y, rnd() * PI2, entre(220, 780) * (0.55 + 0.45 * k), entre(0.35, 0.95), entre(1.8, 3.2), cs[(rnd() * 4) | 0], 650);
    }
    // pedacinhos (terra/pedra)
    var np = Math.round(5 + R / 13);
    for (i = 0; i < np; i++) {
      var ap = rnd() * PI2, vp = entre(160, 480) * (0.6 + 0.4 * k);
      var j = nova(T_PEDACO, x, y, Math.cos(ap) * vp, Math.sin(ap) * vp - 160, entre(0.7, 1.3), entre(2.5, 5.5) * (0.7 + 0.3 * k), 0,
        rnd() < 0.5 ? C_MARROM : C_CINZA_PED, 950, 0.2, 1);
      if (j >= 0) { CID2[j] = C_MARROM_ESC; ROT[j] = rnd() * PI2; VROT[j] = entre(-12, 12); }
    }
  }

  function impacto(x, y, ang, cor) {
    var base = ang + Math.PI;
    var c = cid(cor || "#ffe08a");
    brilhoP(x, y, 0.12, 14, 38, c, 0.9);
    for (var i = 0; i < 7; i++) {
      faiscaP(x, y, base + entre(-0.95, 0.95), entre(120, 440), entre(0.22, 0.5), entre(1.4, 2.4), i % 3 ? c : C_BRANCO, 520);
    }
    suaveP(x, y, Math.cos(base) * 30, Math.sin(base) * 30 - 10, 0.45, 5, 15, C_CINZA, 0.5, -10, 2);
    anelP(x, y, 0.14, 3, 15, C_BRANCO, 2.2, 0.8);
  }

  function acerto(x, y, cor) {
    var c = cid(cor || "#ffffff"), cl = cid(luz(cor || "#ffffff"));
    tremer(1.2);
    brilhoP(x, y, 0.14, 18, 54, C_BRANCO, 1);
    flareP(x, y, 0.16, 34, rnd() * 3, 0.95);
    for (var i = 0; i < 5; i++) {
      estrelaP(x, y, rnd() * PI2, entre(90, 260), entre(0.4, 0.7), entre(3.6, 6.4), i % 2 ? C_BRANCO : (i === 2 ? C_AMARELO : c), 380);
    }
    for (i = 0; i < 8; i++) faiscaP(x, y, rnd() * PI2, entre(160, 420), entre(0.2, 0.45), entre(1.6, 2.6), i & 1 ? cl : C_BRANCO, 300);
    anelP(x, y, 0.22, 4, 30, c, 3.2, 0.9);
  }

  function estouro(x, y, cor) {
    var base = cor || "#ff5d73";
    var c = cid(base), cl = cid(luz(base)), ce = cid(escura(base));
    tremer(7);
    brilhoP(x, y, 0.3, 40, 120, c, 0.8);
    brilhoP(x, y, 0.14, 26, 80, C_BRANCO, 0.7);
    flareP(x, y, 0.2, 80, rnd() * 3, 0.7);
    anelP(x, y, 0.5, 14, 85, cl, 5, 0.9);
    anelP(x, y, 0.35, 8, 55, C_BRANCO, 2.5, 0.7);
    suaveP(x, y, 0, 0, 0.55, 25, 60, c, 0.7, 0, 0);
    // confete (retângulos coloridos que giram)
    var pal = [c, cl, ce, C_BRANCO, c, cl, C_AMARELO];
    var i, j;
    for (i = 0; i < 38; i++) {
      var a = rnd() * PI2, v = entre(130, 560);
      j = nova(T_CONFETE, x, y, Math.cos(a) * v, Math.sin(a) * v - 140, entre(0.9, 1.8), entre(4, 8.5), 0, pal[i % 7], 620, 1.0, 1);
      if (j >= 0) { ROT[j] = rnd() * PI2; VROT[j] = entre(-14, 14); EXTRA[j] = rnd() * PI2; }
    }
    // cacos brilhantes
    for (i = 0; i < 9; i++) {
      var a2 = rnd() * PI2, v2 = entre(120, 430);
      j = nova(T_CACO, x, y, Math.cos(a2) * v2, Math.sin(a2) * v2 - 120, entre(0.9, 1.4), entre(6, 11), 0, i & 1 ? c : cl, 780, 0.5, 1);
      if (j >= 0) { CID2[j] = ce; ROT[j] = rnd() * PI2; VROT[j] = entre(-10, 10); EXTRA[j] = (rnd() * 3) | 0; }
    }
    for (i = 0; i < 7; i++) estrelaP(x, y, rnd() * PI2, entre(90, 330), entre(0.7, 1.1), entre(4.5, 8), i % 3 === 0 ? C_AMARELO : (i & 1 ? cl : C_BRANCO), 300);
    for (i = 0; i < 14; i++) faiscaP(x, y, rnd() * PI2, entre(200, 600), entre(0.3, 0.7), entre(1.8, 3), i & 1 ? cl : C_BRANCO, 500);
  }

  function fumaca(x, y) {
    suaveP(x + entre(-3, 3), y, entre(-12, 12), entre(-55, -30), entre(0.8, 1.2), 8, 28, C_CINZA, 0.45, -8, 0.5);
  }

  function poeira(x, y) {
    for (var i = 0; i < 6; i++) {
      var s = i < 3 ? -1 : 1;
      suaveP(x + s * entre(2, 10), y - entre(0, 3), s * entre(25, 95), -entre(4, 26), entre(0.35, 0.65), entre(5, 8), entre(14, 22), C_BEGE, 0.6, -20, 2.2);
    }
  }

  function fagulhas(x, y, cor, qtd) {
    var c = cid(cor || "#ffd43b"), q = qtd || 8;
    for (var i = 0; i < q; i++) {
      faiscaP(x, y, rnd() * PI2, entre(80, 340), entre(0.3, 0.8), entre(1.5, 2.8), i % 3 === 0 ? C_BRANCO : c, 420);
    }
  }

  function disparo(x, y, ang, tamanho) {
    var s = tamanho || 18;
    if (s <= 4) s *= 18; // aceita multiplicador
    var cx = Math.cos(ang), cy = Math.sin(ang);
    brilhoP(x + cx * s * 0.3, y + cy * s * 0.3, 0.1, s * 0.9, s * 2.1, C_CREME, 0.95);
    flareP(x + cx * s * 0.2, y + cy * s * 0.2, 0.1, s * 1.7, ang + Math.PI / 4, 1);
    // cone de faíscas para frente
    for (var i = 0; i < 4; i++) {
      faiscaP(x, y, ang + entre(-0.35, 0.35), entre(260, 560), entre(0.1, 0.22), entre(1.6, 2.4), i & 1 ? C_AMARELO : C_BRANCO, 0);
    }
  }

  function anel(x, y, cor, raio) {
    var R = raio || 40;
    var c = cid(cor || "#ffffff"), cl = cid(luz(cor || "#ffffff"));
    brilhoP(x, y, 0.35, R * 0.8, R * 2, c, 0.9);
    anelP(x, y, 0.5, R * 0.25, R, cl, 5, 1);
    anelP(x, y, 0.38, R * 0.15, R * 0.7, C_BRANCO, 2.5, 0.9);
    for (var i = 0; i < 7; i++) {
      var a = rnd() * PI2;
      var j = nova(T_FLARE, x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7 - 20,
        entre(0.35, 0.6), entre(8, 15), 3, C_BRANCO, 0, 2, 1);
      if (j >= 0) ROT[j] = rnd();
    }
    estrelaP(x, y - R * 0.3, -Math.PI / 2 + entre(-0.6, 0.6), entre(60, 120), 0.7, 5.5, cl, 90);
  }

  function congelar(x, y) {
    tremer(2);
    brilhoP(x, y, 0.3, 30, 90, C_GELO, 0.9);
    anelP(x, y, 0.4, 8, 56, C_GELO, 4, 1);
    for (var i = 0; i < 12; i++) {
      var a = rnd() * PI2, v = entre(60, 260);
      var j = nova(T_CRISTAL, x, y, Math.cos(a) * v, Math.sin(a) * v - 60, entre(0.7, 1.2), entre(3.5, 6.5), 0, C_GELO, 420, 0.8, 1);
      if (j >= 0) { CID2[j] = C_GELO_ESC; ROT[j] = rnd() * PI2; VROT[j] = entre(-9, 9); }
    }
    for (i = 0; i < 4; i++) flareP(x + entre(-18, 18), y + entre(-18, 18), entre(0.25, 0.5), entre(14, 26), rnd(), 1);
    for (i = 0; i < 4; i++) suaveP(x + entre(-10, 10), y + entre(-10, 10), entre(-40, 40), entre(-40, 10), 0.7, 12, 34, C_GELO, 0.4, 0, 1.5);
  }

  function fogo(x, y) {
    fogoP(x + entre(-7, 7), y + entre(-4, 6), entre(-14, 14), entre(-110, -55), entre(0.32, 0.55), entre(6, 10), entre(2.5, 4.5), 2.2, 0.95, -60, 0.4);
    if (rnd() < 0.45) {
      faiscaP(x + entre(-6, 6), y, -Math.PI / 2 + entre(-0.7, 0.7), entre(70, 190), entre(0.3, 0.6), 1.6, rnd() < 0.5 ? C_AMARELO : C_LARANJA, -80);
    }
    if (rnd() < 0.25) suaveP(x + entre(-6, 6), y - 10, entre(-10, 10), entre(-45, -25), 0.7, 5, 16, C_CINZA, 0.3, 0, 0.5);
  }

  function teleporte(x, y, cor) {
    var base = cor || "#cc5de8";
    var c = cid(base), cl = cid(luz(base));
    brilhoP(x, y, 0.4, 50, 130, c, 0.9);
    brilhoP(x, y, 0.2, 20, 70, C_BRANCO, 1);
    anelP(x, y, 0.45, 12, 70, cl, 5, 1);
    anelP(x, y, 0.3, 5, 40, C_BRANCO, 2.5, 0.9);
    // partículas subindo em coluna + espiral entrando
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * PI2;
      var d = 46;
      var j = nova(T_BRILHO, x + Math.cos(a) * d, y + Math.sin(a) * d, -Math.cos(a) * d / 0.3, -Math.sin(a) * d / 0.3 - 20, 0.3, 14, 4, i & 1 ? cl : c, 0, 0, 1);
      if (j < 0) break;
    }
    for (i = 0; i < 8; i++) {
      faiscaP(x + entre(-16, 16), y + entre(-8, 14), -Math.PI / 2 + entre(-0.15, 0.15), entre(160, 420), entre(0.4, 0.8), entre(1.8, 2.8), i & 1 ? cl : C_BRANCO, 0);
    }
    for (i = 0; i < 4; i++) estrelaP(x, y, rnd() * PI2, entre(60, 200), 0.6, 4.5, cl, 0);
  }

  // ---------- atualizar ----------
  function atualizar(dtMs) {
    var dt = (dtMs === undefined ? 16.667 : dtMs) / 1000;
    if (dt > 0.1) dt = 0.1;
    var i = 0;
    while (i < n) {
      var v = VIDA[i] - dt;
      if (v <= 0) {
        // remove trocando com a última (sem alocar)
        var u = --n;
        if (i !== u) {
          X[i] = X[u]; Y[i] = Y[u]; VX[i] = VX[u]; VY[i] = VY[u]; VIDA[i] = VIDA[u]; VMAX[i] = VMAX[u];
          TAM[i] = TAM[u]; TAMF[i] = TAMF[u]; ROT[i] = ROT[u]; VROT[i] = VROT[u]; GRAV[i] = GRAV[u];
          ARR[i] = ARR[u]; ALFA[i] = ALFA[u]; EST[i] = EST[u]; EXTRA[i] = EXTRA[u];
          TIPO[i] = TIPO[u]; CID[i] = CID[u]; CID2[i] = CID2[u];
        }
        continue;
      }
      VIDA[i] = v;
      var ar = 1 - ARR[i] * dt;
      if (ar < 0) ar = 0;
      VX[i] *= ar; VY[i] = VY[i] * ar + GRAV[i] * dt;
      X[i] += VX[i] * dt; Y[i] += VY[i] * dt;
      ROT[i] += VROT[i] * dt;
      i++;
    }
    // textos
    for (var k = 0; k < NT; k++) {
      var tx = textos[k];
      if (!tx.vivo) continue;
      tx.vida -= dt;
      if (tx.vida <= 0) { tx.vivo = false; continue; }
      tx.y -= tx.vy * dt;
      tx.vy *= Math.max(0, 1 - 2.4 * dt);
    }
    // tremor
    if (tremorA > 0) {
      tremorA *= Math.pow(0.86, dt * 60);
      if (tremorA < 0.12) tremorA = 0;
    }
    if (tremorA > 0) {
      desloc.x = (rnd() * 2 - 1) * tremorA;
      desloc.y = (rnd() * 2 - 1) * tremorA;
    } else { desloc.x = 0; desloc.y = 0; }
  }

  // ---------- desenhar ----------
  function desenharTipo(ctx, i, tipo) {
    var v01 = VIDA[i] / VMAX[i];
    var f = 1 - v01;
    var tam = TAM[i] + (TAMF[i] - TAM[i]) * f;
    var a = ALFA[i] * Math.min(1, v01 * FADE[tipo]);
    if (a <= 0.01) return;
    var x = X[i], y = Y[i], c, s, e, st, fr, spr;

    switch (tipo) {
      case T_BRILHO:
        s = tam; ctx.globalAlpha = a;
        ctx.drawImage(brilhoSpr(CID[i]), x - s, y - s, s * 2, s * 2);
        break;
      case T_SUAVE:
        s = tam; ctx.globalAlpha = a;
        ctx.drawImage(suaveSpr(CID[i]), x - s, y - s, s * 2, s * 2);
        break;
      case T_FOGO:
        s = tam; spr = fogoSprs();
        e = EST[i] * f;
        if (EST[i] <= 0) e = 0;
        st = Math.floor(e); if (st > 2) st = 2;
        fr = e - st; if (e >= 3) { st = 2; fr = 1; }
        ctx.globalAlpha = a * (1 - fr * 0.5);
        ctx.drawImage(spr[st], x - s, y - s, s * 2, s * 2);
        if (fr > 0) {
          ctx.globalAlpha = a * fr;
          ctx.drawImage(spr[st + 1], x - s, y - s, s * 2, s * 2);
        }
        break;
      case T_ESTRELA:
        s = tam * (0.6 + 0.4 * Math.min(1, v01 * 3));
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ROT[i]);
        ctx.drawImage(estrelaSpr(CID[i]), -s, -s, s * 2, s * 2);
        ctx.restore();
        break;
      case T_FLARE:
        s = tam; ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ROT[i]);
        ctx.drawImage(flareSpr(), -s, -s, s * 2, s * 2);
        ctx.restore();
        break;
      case T_CONFETE:
        ctx.globalAlpha = a;
        ctx.fillStyle = nomesCor[CID[i]];
        ctx.save(); ctx.translate(x, y); ctx.rotate(ROT[i]);
        var fl = Math.cos(EXTRA[i] + f * 18); // vira de lado como confete de verdade
        ctx.fillRect(-tam / 2, -tam * 0.28 * fl, tam, tam * 0.56 * fl);
        ctx.restore();
        break;
      case T_CACO:
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ROT[i]);
        ctx.beginPath();
        if (EXTRA[i] < 1) { ctx.moveTo(0, -tam); ctx.lineTo(tam * 0.9, tam * 0.6); ctx.lineTo(-tam * 0.7, tam * 0.5); }
        else if (EXTRA[i] < 2) { ctx.moveTo(-tam * 0.8, -tam * 0.5); ctx.lineTo(tam * 0.8, -tam * 0.7); ctx.lineTo(tam * 0.5, tam * 0.7); ctx.lineTo(-tam * 0.6, tam * 0.4); }
        else { ctx.moveTo(-tam, 0); ctx.lineTo(0, -tam * 0.8); ctx.lineTo(tam, tam * 0.2); ctx.lineTo(-tam * 0.2, tam * 0.7); }
        ctx.closePath();
        ctx.fillStyle = nomesCor[CID[i]]; ctx.fill();
        ctx.lineJoin = "round"; ctx.lineWidth = 2; ctx.strokeStyle = nomesCor[CID2[i]]; ctx.stroke();
        // reflexo
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(-tam * 0.2, -tam * 0.25, tam * 0.16, 0, PI2); ctx.fill();
        ctx.restore();
        break;
      case T_FAISCA:
        var vx = VX[i], vy = VY[i];
        var sp = Math.sqrt(vx * vx + vy * vy) + 0.001;
        var len = Math.min(34, 3 + sp * 0.05);
        ctx.globalAlpha = a;
        ctx.strokeStyle = nomesCor[CID[i]];
        ctx.lineWidth = tam;
        ctx.beginPath();
        ctx.moveTo(x - vx / sp * len, y - vy / sp * len);
        ctx.lineTo(x, y);
        ctx.stroke();
        break;
      case T_ANEL:
        var eo = 1 - f * f * f;                 // sai rápido e desacelera
        var rr = TAM[i] + (TAMF[i] - TAM[i]) * (1 - (1 - f) * (1 - f) * (1 - f));
        ctx.globalAlpha = a * (v01 < 0.5 ? v01 * 2 : 1);
        ctx.strokeStyle = nomesCor[CID[i]];
        ctx.lineWidth = Math.max(0.6, EXTRA[i] * eo);
        ctx.beginPath(); ctx.arc(x, y, rr, 0, PI2); ctx.stroke();
        break;
      case T_PEDACO:
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ROT[i]);
        ctx.fillStyle = nomesCor[CID[i]]; ctx.strokeStyle = nomesCor[CID2[i]]; ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(-tam, -tam * 0.6); ctx.lineTo(tam * 0.9, -tam * 0.8); ctx.lineTo(tam, tam * 0.5); ctx.lineTo(-tam * 0.4, tam);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        break;
      case T_CRISTAL:
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ROT[i]);
        ctx.beginPath(); ctx.moveTo(0, -tam * 1.6); ctx.lineTo(tam * 0.75, 0); ctx.lineTo(0, tam * 1.6); ctx.lineTo(-tam * 0.75, 0);
        ctx.closePath();
        ctx.fillStyle = nomesCor[CID[i]]; ctx.fill();
        ctx.lineJoin = "round"; ctx.lineWidth = 1.8; ctx.strokeStyle = nomesCor[CID2[i]]; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath(); ctx.moveTo(0, -tam * 1.3); ctx.lineTo(-tam * 0.4, -tam * 0.1); ctx.lineTo(0, -tam * 0.2); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
    }
  }

  function desenhar(ctx) {
    if (n === 0 && !textosAtivos()) return;
    ctx.save();
    // camada normal
    for (var i = 0; i < n; i++) {
      var tp = TIPO[i];
      if (!ADITIVO[tp]) desenharTipo(ctx, i, tp);
    }
    // camada de brilho aditivo
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < n; i++) {
      tp = TIPO[i];
      if (ADITIVO[tp]) desenharTipo(ctx, i, tp);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";

    // textos
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (var k = 0; k < NT; k++) {
      var tx = textos[k];
      if (!tx.vivo) continue;
      var idade = 1 - tx.vida / tx.vmax;
      var pop = idade < 0.16 ? (idade / 0.16) : 1;
      var esc = tx.esc * (idade < 0.16 ? 0.4 + 0.8 * pop + 0.3 * Math.sin(pop * Math.PI) : 1.2 - 0.2 * Math.min(1, (idade - 0.16) * 4));
      ctx.globalAlpha = Math.min(1, tx.vida / tx.vmax * 3.2);
      ctx.save();
      ctx.translate(tx.x, tx.y); ctx.scale(esc, esc);
      ctx.font = "900 24px 'Arial Rounded MT Bold','Trebuchet MS',system-ui,Arial,sans-serif";
      ctx.lineWidth = 6; ctx.strokeStyle = CONTORNO; ctx.strokeText(tx.txt, 0, 0);
      ctx.fillStyle = tx.cor; ctx.fillText(tx.txt, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function textosAtivos() {
    for (var k = 0; k < NT; k++) if (textos[k].vivo) return true;
    return false;
  }

  function limpar() {
    n = 0;
    for (var k = 0; k < NT; k++) textos[k].vivo = false;
    tremorA = 0; desloc.x = 0; desloc.y = 0;
  }

  return {
    explosao: explosao, impacto: impacto, acerto: acerto, estouro: estouro,
    fumaca: fumaca, poeira: poeira, fagulhas: fagulhas, disparo: disparo, anel: anel,
    texto: texto, congelar: congelar, fogo: fogo, teleporte: teleporte,
    tremer: tremer, deslocamento: deslocamento,
    atualizar: atualizar, desenhar: desenhar, limpar: limpar
  };
})();
