"use strict";

// =========================
// ARTE DAS BOLINHAS
// Corpo brilhante em cache (um canvas por cor + tamanho); olhos, boca e efeitos
// de estado (escudo, gelo, fogo, fúria, rapidez, fantasma) são desenhados por cima.
// O rosto é desenhado num espaço de raio 22 e escalado para o raio real.
// =========================

const ArteBolinha = (function() {
  var CONTORNO = "#1b1030";
  var ESC = 2; // resolução dos caches (2x para ficar nítido em telas grandes)
  var PI2 = Math.PI * 2;
  var PTS_FANTASMA = new Array(36); // pontos do contorno do fantasma (reaproveitado)

  // ---------- cores ----------
  function hexRgb(h) {
    if (h.charAt(0) === "#") h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // mistura a cor com outra (alvo [r,g,b]) numa proporção 0..1 e devolve "rgb(...)"
  function misturar(rgb, alvo, q) {
    return "rgb(" + Math.round(rgb[0] + (alvo[0] - rgb[0]) * q) + "," +
      Math.round(rgb[1] + (alvo[1] - rgb[1]) * q) + "," +
      Math.round(rgb[2] + (alvo[2] - rgb[2]) * q) + ")";
  }
  function rgba(rgb, a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")"; }
  var BRANCO = [255, 255, 255], PRETO = [27, 16, 48];

  var paletas = {};
  function paleta(cor) {
    var p = paletas[cor];
    if (p) return p;
    var rgb = hexRgb(cor);
    p = paletas[cor] = {
      rgb: rgb,
      luz: misturar(rgb, BRANCO, 0.55),
      base: cor,
      media: misturar(rgb, PRETO, 0.18),
      sombra: misturar(rgb, PRETO, 0.42),
      contorno: misturar(rgb, PRETO, 0.78),
      halo: misturar(rgb, BRANCO, 0.72)
    };
    return p;
  }

  function criarCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    return c;
  }

  // ---------- corpo em cache ----------
  var corpos = {};   // chave cor|raio -> { c, meio }
  var flashes = {};  // versão branca do corpo
  function chaveRaio(r) { return Math.max(4, Math.round(r * 2) / 2); }

  function criarCorpo(cor, r) {
    var p = paleta(cor);
    var pad = 3;
    var tam = (r + pad) * 2 * ESC;
    var c = criarCanvas(tam, tam);
    var g = c.getContext("2d");
    g.scale(ESC, ESC);
    g.translate(r + pad, r + pad);

    var esp = Math.min(3, Math.max(1.8, r * 0.13)); // espessura do contorno
    var ri = r - esp * 0.6;

    // contorno
    g.fillStyle = p.contorno;
    g.beginPath(); g.arc(0, 0, r, 0, PI2); g.fill();

    // corpo com luz vinda de cima-esquerda
    var gr = g.createRadialGradient(-ri * 0.38, -ri * 0.42, ri * 0.05, -ri * 0.1, -ri * 0.1, ri * 1.35);
    gr.addColorStop(0, p.luz);
    gr.addColorStop(0.38, p.base);
    gr.addColorStop(1, p.sombra);
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, r - esp, 0, PI2); g.fill();

    g.save();
    g.beginPath(); g.arc(0, 0, r - esp, 0, PI2); g.clip();

    // luz refletida embaixo (dá volume de "gominha")
    var gb = g.createRadialGradient(ri * 0.25, ri * 0.95, 0, ri * 0.25, ri * 0.95, ri * 0.85);
    gb.addColorStop(0, rgba(p.rgb.map(function(v) { return Math.min(255, v + 70); }), 0.55));
    gb.addColorStop(1, rgba(p.rgb, 0));
    g.fillStyle = gb;
    g.fillRect(-r, -r, r * 2, r * 2);

    // bochechas
    g.fillStyle = "rgba(255,80,120,0.26)";
    g.beginPath(); g.ellipse(-ri * 0.6, ri * 0.28, ri * 0.2, ri * 0.12, 0, 0, PI2); g.fill();
    g.beginPath(); g.ellipse(ri * 0.6, ri * 0.28, ri * 0.2, ri * 0.12, 0, 0, PI2); g.fill();
    g.restore();

    // reflexo especular grande (oval inclinado) + pontinho
    g.save();
    g.translate(-ri * 0.46, -ri * 0.55);
    g.rotate(-0.65);
    var ge = g.createLinearGradient(-ri * 0.3, 0, ri * 0.3, 0);
    ge.addColorStop(0, "rgba(255,255,255,0.95)");
    ge.addColorStop(1, "rgba(255,255,255,0.55)");
    g.fillStyle = ge;
    g.beginPath(); g.ellipse(0, 0, ri * 0.3, ri * 0.15, 0, 0, PI2); g.fill();
    g.restore();
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.beginPath(); g.arc(-ri * 0.1, -ri * 0.78, ri * 0.065, 0, PI2); g.fill();
    // brilhinho de borda embaixo à direita
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.lineWidth = Math.max(1, r * 0.06);
    g.lineCap = "round";
    g.beginPath(); g.arc(0, 0, ri * 0.86, 0.35, 1.05); g.stroke();

    return { c: c, meio: r + pad };
  }

  function corpo(cor, r) {
    var rr = chaveRaio(r);
    var k = cor + "|" + rr;
    return corpos[k] || (corpos[k] = criarCorpo(cor, rr));
  }

  function flashCorpo(cor, r) {
    var rr = chaveRaio(r);
    var k = cor + "|" + rr;
    var f = flashes[k];
    if (f) return f;
    var cp = corpo(cor, r);
    var c = criarCanvas(cp.c.width, cp.c.height);
    var g = c.getContext("2d");
    g.drawImage(cp.c, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(255,255,255,0.88)";
    g.fillRect(0, 0, c.width, c.height);
    return (flashes[k] = { c: c, meio: cp.meio });
  }

  // ---------- sprites de brilho ----------
  var brilhos = {};
  function brilho(cor) {
    var s = brilhos[cor];
    if (s) return s;
    var rgb = hexRgb(cor);
    s = criarCanvas(64, 64);
    var g = s.getContext("2d");
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(rgb, 1));
    gr.addColorStop(0.35, rgba(rgb, 0.55));
    gr.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (brilhos[cor] = s);
  }

  // sombra do chão
  var sprSombra = null;
  function criarSombra() {
    var c = criarCanvas(64, 32);
    var g = c.getContext("2d");
    g.translate(32, 16);
    g.scale(1, 0.5);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    gr.addColorStop(0, "rgba(10,5,25,0.62)");
    gr.addColorStop(0.6, "rgba(10,5,25,0.3)");
    gr.addColorStop(1, "rgba(10,5,25,0)");
    g.fillStyle = gr; g.fillRect(-32, -32, 64, 64);
    return c;
  }

  // casca de gelo (cubo arredondado translúcido) por raio
  var gelos = {};
  function criarGelo(r) {
    var m = r * 1.32, rc = r * 0.42, pad = 3;
    var tam = (m + pad) * 2 * ESC;
    var c = criarCanvas(tam, tam);
    var g = c.getContext("2d");
    g.scale(ESC, ESC);
    g.translate(m + pad, m + pad);
    function caixa(h, canto) {
      g.beginPath();
      g.moveTo(-h + canto, -h);
      g.arcTo(h, -h, h, h, canto); g.arcTo(h, h, -h, h, canto);
      g.arcTo(-h, h, -h, -h, canto); g.arcTo(-h, -h, h, -h, canto);
      g.closePath();
    }
    // contorno azul escuro
    caixa(m, rc);
    g.fillStyle = "#2a5f86"; g.fill();
    caixa(m - 2, rc - 1.5);
    var gr = g.createLinearGradient(-m, -m, m, m);
    gr.addColorStop(0, "rgba(235,252,255,0.78)");
    gr.addColorStop(0.5, "rgba(150,226,255,0.42)");
    gr.addColorStop(1, "rgba(90,180,235,0.62)");
    // recorta o interior para ficar translúcido (mostra a bolinha)
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000"; g.fill();
    g.globalCompositeOperation = "source-over";
    caixa(m - 2, rc - 1.5);
    g.fillStyle = gr; g.fill();
    // borda clara interna
    caixa(m - 3.6, rc - 3);
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1.6; g.stroke();
    // facetas
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 1.4; g.lineCap = "round";
    g.beginPath(); g.moveTo(-m * 0.78, -m * 0.2); g.lineTo(-m * 0.2, -m * 0.78); g.stroke();
    g.beginPath(); g.moveTo(m * 0.25, m * 0.8); g.lineTo(m * 0.8, m * 0.25); g.stroke();
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(-m * 0.62, -m * 0.5); g.lineTo(-m * 0.5, -m * 0.62); g.stroke();
    return { c: c, meio: m + pad };
  }

  // bolha do escudo por raio
  var escudos = {};
  function criarEscudo(r) {
    var R = r * 1.62, pad = 3;
    var tam = (R + pad) * 2 * ESC;
    var c = criarCanvas(tam, tam);
    var g = c.getContext("2d");
    g.scale(ESC, ESC);
    g.translate(R + pad, R + pad);
    var gr = g.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
    gr.addColorStop(0, "rgba(120,200,255,0.05)");
    gr.addColorStop(0.8, "rgba(110,190,255,0.28)");
    gr.addColorStop(1, "rgba(170,225,255,0.62)");
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, R, 0, PI2); g.fill();
    // hexágonos suaves (energia)
    g.strokeStyle = "rgba(190,235,255,0.2)"; g.lineWidth = 1;
    var hr = R * 0.34;
    for (var iy = -2; iy <= 2; iy++) {
      for (var ix = -2; ix <= 2; ix++) {
        var hx = ix * hr * 1.5, hy = iy * hr * 1.732 + (ix & 1 ? hr * 0.866 : 0);
        if (hx * hx + hy * hy > R * R * 0.7) continue;
        g.beginPath();
        for (var k = 0; k < 6; k++) {
          var a = k * Math.PI / 3;
          g[k ? "lineTo" : "moveTo"](hx + Math.cos(a) * hr * 0.92, hy + Math.sin(a) * hr * 0.92);
        }
        g.closePath(); g.stroke();
      }
    }
    g.strokeStyle = "rgba(200,240,255,0.95)"; g.lineWidth = 2.4;
    g.beginPath(); g.arc(0, 0, R - 1.2, 0, PI2); g.stroke();
    g.strokeStyle = "rgba(40,110,200,0.55)"; g.lineWidth = 1.2;
    g.beginPath(); g.arc(0, 0, R + 0.4, 0, PI2); g.stroke();
    // brilho de vidro
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 3.2; g.lineCap = "round";
    g.beginPath(); g.arc(0, 0, R * 0.8, Math.PI * 1.1, Math.PI * 1.42); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, R * 0.8, Math.PI * 1.5, Math.PI * 1.56); g.stroke();
    return { c: c, meio: R + pad, R: R };
  }

  function cacheRaio(mapa, criar, r) {
    var k = chaveRaio(r);
    return mapa[k] || (mapa[k] = criar(k));
  }

  // ---------- pequenos desenhos ----------
  function estrela5(g, x, y, ro, ri, rot) {
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i & 1 ? ri : ro;
      g[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }
  function gota(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y - s * 1.5);
    g.bezierCurveTo(x + s * 0.3, y - s * 0.6, x + s, y - s * 0.2, x + s, y + s * 0.4);
    g.arc(x, y + s * 0.4, s, 0, Math.PI);
    g.bezierCurveTo(x - s, y - s * 0.2, x - s * 0.3, y - s * 0.6, x, y - s * 1.5);
    g.closePath();
  }
  function retArred(g, x, y, w, h, rr) {
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }
  // pseudo-ruído estável
  function ruido(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  // ---------- olhos ----------
  function olho(g, cx, cy, rx, ry, ab, px, py, pr) {
    // olho branco com pupila que acompanha o olhar
    if (ab < 0.14) {
      g.strokeStyle = CONTORNO; g.lineWidth = 2.2; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx - rx * 0.85, cy + ry * 0.1);
      g.quadraticCurveTo(cx, cy + ry * 0.55, cx + rx * 0.85, cy + ry * 0.1); g.stroke();
      return;
    }
    var h = ry * ab;
    g.fillStyle = "#fff";
    g.beginPath(); g.ellipse(cx, cy, rx, h, 0, 0, PI2); g.fill();
    g.save();
    g.beginPath(); g.ellipse(cx, cy, rx, h, 0, 0, PI2); g.clip();
    // sombra suave do topo
    g.fillStyle = "rgba(60,40,100,0.16)";
    g.fillRect(cx - rx, cy - h, rx * 2, h * 0.5);
    var qx = cx + px, qy = cy + py * ab;
    g.fillStyle = CONTORNO;
    g.beginPath(); g.arc(qx, qy, pr, 0, PI2); g.fill();
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(qx - pr * 0.32, qy - pr * 0.36, pr * 0.38, 0, PI2); g.fill();
    g.beginPath(); g.arc(qx + pr * 0.3, qy + pr * 0.34, pr * 0.17, 0, PI2); g.fill();
    g.restore();
    g.strokeStyle = CONTORNO; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(cx, cy, rx, h, 0, 0, PI2); g.stroke();
  }

  // pálpebra/sobrancelha inclinada (lado s: -1 esquerdo, 1 direito); yFora/yDentro são alturas das pontas
  function palpebra(g, pal, cx, cy, rx, ry, s, yFora, yDentro, sobrancelha) {
    var xf = cx + s * rx * 1.15, xd = cx - s * rx * 1.15;
    g.save();
    g.beginPath(); g.ellipse(cx, cy, rx + 0.5, ry + 0.5, 0, 0, PI2); g.clip();
    g.fillStyle = pal.base;
    g.beginPath();
    g.moveTo(xf, cy + yFora); g.lineTo(xd, cy + yDentro);
    g.lineTo(xd, cy - ry - 4); g.lineTo(xf, cy - ry - 4); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = CONTORNO; g.lineWidth = 2.3; g.lineCap = "round";
    g.beginPath(); g.moveTo(xf, cy + yFora); g.lineTo(xd, cy + yDentro); g.stroke();
    if (sobrancelha) {
      g.lineWidth = 2.8;
      g.beginPath(); g.moveTo(xf, cy + yFora - 3.4); g.lineTo(xd, cy + yDentro - 4.6); g.stroke();
    }
  }

  function espiral(g, cx, cy, raio, rot) {
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(cx, cy, raio, 0, PI2); g.fill();
    g.strokeStyle = CONTORNO; g.lineWidth = 1.5; g.stroke();
    g.beginPath();
    for (var i = 0; i <= 28; i++) {
      var a = rot + i * 0.36, rr = (i / 28) * (raio - 1.3);
      g[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.lineWidth = 1.3; g.lineCap = "round"; g.stroke();
  }

  // gotinha de suor (azul claro com brilho)
  function suor(g, x, y, s) {
    gota(g, x, y, s);
    g.fillStyle = "#9be7ff"; g.fill();
    g.strokeStyle = "#2a6f9a"; g.lineWidth = 1.1; g.stroke();
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath(); g.arc(x - s * 0.35, y + s * 0.2, s * 0.25, 0, PI2); g.fill();
  }

  // rosto completo no espaço de raio 22
  function rosto(g, b, pal, t, ab) {
    var ex = b.expressao || "normal";
    var ox = b.olharX || 0, oy = b.olharY || 0;
    var fx = ox * 2.6, fy = oy * 1.7 + 1.2; // o rosto desliza um pouco para onde olha
    var rx = 5.5, ry = 7.2, pr = 3.7;
    var ey = fy - 2.6, ex1 = fx - 7.3, ex2 = fx + 7.3;
    var mx = fx, my = fy + 8.6;
    var tremor = 0;

    g.lineCap = "round"; g.lineJoin = "round";
    var px = ox * 1.9, py = oy * 2.6;

    if (ex === "feliz") {
      // olhos "^ ^"
      g.strokeStyle = CONTORNO; g.lineWidth = 2.8;
      var cxs = [ex1, ex2];
      for (var i = 0; i < 2; i++) {
        g.beginPath(); g.moveTo(cxs[i] - 5, ey + 2.4);
        g.quadraticCurveTo(cxs[i], ey - 6, cxs[i] + 5, ey + 2.4); g.stroke();
      }
      // boca aberta grande com língua
      g.beginPath();
      g.moveTo(mx - 6.6, my - 2.4); g.lineTo(mx + 6.6, my - 2.4);
      g.quadraticCurveTo(mx + 6, my + 8, mx, my + 8); g.quadraticCurveTo(mx - 6, my + 8, mx - 6.6, my - 2.4);
      g.closePath();
      g.fillStyle = "#5a1430"; g.fill();
      g.save(); g.clip();
      g.fillStyle = "#ff7a9a"; g.beginPath(); g.ellipse(mx, my + 6.4, 4.2, 3.2, 0, 0, PI2); g.fill();
      g.fillStyle = "#fff"; g.fillRect(mx - 7, my - 2.6, 14, 2.6);
      g.restore();
      g.strokeStyle = CONTORNO; g.lineWidth = 1.7;
      g.beginPath();
      g.moveTo(mx - 6.6, my - 2.4); g.lineTo(mx + 6.6, my - 2.4);
      g.quadraticCurveTo(mx + 6, my + 8, mx, my + 8); g.quadraticCurveTo(mx - 6, my + 8, mx - 6.6, my - 2.4);
      g.closePath(); g.stroke();
      // bochechas coradas extra
      g.fillStyle = "rgba(255,70,110,0.32)";
      g.beginPath(); g.ellipse(fx - 13, fy + 4.2, 3.4, 2.1, 0, 0, PI2); g.fill();
      g.beginPath(); g.ellipse(fx + 13, fy + 4.2, 3.4, 2.1, 0, 0, PI2); g.fill();
      return;
    }

    if (ex === "dor") {
      // olhos "> <"
      g.strokeStyle = CONTORNO; g.lineWidth = 2.8;
      g.beginPath(); g.moveTo(ex1 - 4.6, ey - 4.6); g.lineTo(ex1 + 3.6, ey); g.lineTo(ex1 - 4.6, ey + 4.6); g.stroke();
      g.beginPath(); g.moveTo(ex2 + 4.6, ey - 4.6); g.lineTo(ex2 - 3.6, ey); g.lineTo(ex2 + 4.6, ey + 4.6); g.stroke();
      // boca aberta gritando, tremendo
      var tr = Math.sin(t * 38) * 0.5;
      g.fillStyle = "#5a1430";
      g.beginPath(); g.ellipse(mx + tr, my + 1.6, 4.8, 5.3, 0, 0, PI2); g.fill();
      g.fillStyle = "#ff7a9a";
      g.beginPath(); g.ellipse(mx + tr, my + 4.3, 3, 2, 0, 0, PI2); g.fill();
      g.strokeStyle = CONTORNO; g.lineWidth = 1.7;
      g.beginPath(); g.ellipse(mx + tr, my + 1.6, 4.8, 5.3, 0, 0, PI2); g.stroke();
      // lágrimas de dor (gotinhas azuis)
      suor(g, fx - 15, fy - 8 + (t * 14 % 6), 1.9);
      return;
    }

    if (ex === "tonto") {
      espiral(g, ex1, ey, 6.1, t * 7);
      espiral(g, ex2, ey, 6.1, -t * 7);
      // boca ondulada
      g.strokeStyle = CONTORNO; g.lineWidth = 2; g.beginPath();
      for (var k = 0; k <= 12; k++) {
        var xx = mx - 6.5 + k, yy = my + 1.2 + Math.sin(k * 1.1 + t * 8) * 1.6;
        g[k ? "lineTo" : "moveTo"](xx, yy);
      }
      g.stroke();
      // estrelinhas girando acima da cabeça
      for (var s2 = 0; s2 < 3; s2++) {
        var a = t * 3.4 + s2 * PI2 / 3;
        var sx = Math.cos(a) * 15, sy = -25 + Math.sin(a) * 4.2;
        g.fillStyle = "#ffd43b"; g.strokeStyle = "#a8720c"; g.lineWidth = 1;
        estrela5(g, sx, sy, 4.4, 1.9, a * 1.5); g.fill(); g.stroke();
      }
      return;
    }

    if (ex === "medo") {
      tremor = Math.sin(t * 46) * 0.45;
      var mrx = 6.1, mry = 8;
      olho(g, ex1 + tremor, ey, mrx, mry, ab, px * 0.6, py * 0.6, 1.9);
      olho(g, ex2 + tremor, ey, mrx, mry, ab, px * 0.6, py * 0.6, 1.9);
      // sobrancelhas preocupadas (pontas de dentro para cima)
      g.strokeStyle = CONTORNO; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(ex1 - 5.5, ey - mry - 1.2); g.lineTo(ex1 + 4.5, ey - mry - 5.4); g.stroke();
      g.beginPath(); g.moveTo(ex2 + 5.5, ey - mry - 1.2); g.lineTo(ex2 - 4.5, ey - mry - 5.4); g.stroke();
      // boca tremida
      g.beginPath();
      for (var m = 0; m <= 6; m++) {
        g[m ? "lineTo" : "moveTo"](mx - 4.8 + m * 1.6 + tremor, my + 3 + (m & 1 ? -1.6 : 0.6));
      }
      g.lineWidth = 2; g.stroke();
      suor(g, fx + 15.5, fy - 9 + ((t * 18) % 7), 2);
      return;
    }

    var piscou = ab < 0.14;
    if (ex === "bravo") {
      olho(g, ex1, ey + 0.8, rx, ry * 0.9, ab, px * 1.2, py * 0.5 + 1, pr);
      olho(g, ex2, ey + 0.8, rx, ry * 0.9, ab, px * 1.2, py * 0.5 + 1, pr);
      if (!piscou) {
        palpebra(g, pal, ex1, ey + 0.8, rx, ry * 0.9, -1, -ry * 0.75, ry * 0.15, true);
        palpebra(g, pal, ex2, ey + 0.8, rx, ry * 0.9, 1, -ry * 0.75, ry * 0.15, true);
      } else {
        g.strokeStyle = CONTORNO; g.lineWidth = 2.8;
        g.beginPath(); g.moveTo(ex1 - 6, ey - 4); g.lineTo(ex1 + 5, ey - 0.5); g.stroke();
        g.beginPath(); g.moveTo(ex2 + 6, ey - 4); g.lineTo(ex2 - 5, ey - 0.5); g.stroke();
      }
      // boca de bravo: dentes cerrados pequenos
      g.fillStyle = "#fff";
      retArred(g, mx - 5.6, my - 0.2, 11.2, 5.4, 2); g.fill();
      g.strokeStyle = CONTORNO; g.lineWidth = 1.7; g.stroke();
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(mx - 5.6, my + 2.5); g.lineTo(mx + 5.6, my + 2.5);
      g.moveTo(mx - 1.9, my - 0.2); g.lineTo(mx - 1.9, my + 5.2);
      g.moveTo(mx + 1.9, my - 0.2); g.lineTo(mx + 1.9, my + 5.2); g.stroke();
      return;
    }

    if (ex === "esforco") {
      var vib = Math.sin(t * 50) * 0.35;
      olho(g, ex1 + vib, ey + 1.4, rx, ry * 0.8, Math.min(ab, 0.9), px, py * 0.4, pr);
      olho(g, ex2 + vib, ey + 1.4, rx, ry * 0.8, Math.min(ab, 0.9), px, py * 0.4, pr);
      if (!piscou) {
        palpebra(g, pal, ex1 + vib, ey + 1.4, rx, ry * 0.72, -1, -ry * 0.28, ry * 0.2, true);
        palpebra(g, pal, ex2 + vib, ey + 1.4, rx, ry * 0.72, 1, -ry * 0.28, ry * 0.2, true);
      }
      // boca de força: dentes à mostra, retângulo largo
      g.fillStyle = "#fff";
      retArred(g, mx - 7.4 + vib, my - 1.6, 14.8, 8, 2.6); g.fill();
      g.strokeStyle = CONTORNO; g.lineWidth = 1.9; g.stroke();
      g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(mx - 7.4 + vib, my + 2.4); g.lineTo(mx + 7.4 + vib, my + 2.4);
      for (var d = -1; d <= 1; d++) { g.moveTo(mx + d * 3.7 + vib, my - 1.6); g.lineTo(mx + d * 3.7 + vib, my + 6.4); }
      g.stroke();
      // veinha de esforço na testa
      g.strokeStyle = "rgba(255,255,255,0.0)";
      suor(g, fx + 15.5, fy - 9 + ((t * 16) % 7), 2.1);
      return;
    }

    // normal
    olho(g, ex1, ey, rx, ry, ab, px, py, pr);
    olho(g, ex2, ey, rx, ry, ab, px, py, pr);
    // sorrisinho
    g.strokeStyle = CONTORNO; g.lineWidth = 2;
    g.beginPath(); g.moveTo(mx - 3.8, my);
    g.quadraticCurveTo(mx, my + 3.8, mx + 3.8, my); g.stroke();
  }

  // ---------- efeitos de estado ----------
  function fogoChamas(g, r, t, pal) {
    // chamas atrás do topo do corpo (espaço de raio real, centro 0,0)
    var n = 5;
    for (var camada = 0; camada < 3; camada++) {
      g.fillStyle = camada === 0 ? "#ff4a1c" : camada === 1 ? "#ff9a1f" : "#ffe14d";
      var esc = camada === 0 ? 1 : camada === 1 ? 0.7 : 0.4;
      for (var i = 0; i < n; i++) {
        var ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.46;
        var bx = Math.cos(ang) * r * 0.82, by = Math.sin(ang) * r * 0.82;
        var seed = i * 1.9 + camada * 0.6;
        var h = r * (0.85 + 0.35 * Math.sin(t * 9 + seed * 3.1)) * esc * (i === 2 ? 1.25 : 1);
        var w = r * 0.3 * (camada === 0 ? 1.1 : 0.85) * (camada === 2 ? 0.8 : 1);
        var sway = Math.sin(t * 6 + seed) * r * 0.16;
        var tx = bx * 0.8 + sway + Math.cos(ang) * 0, ty = by - h;
        g.beginPath();
        g.moveTo(bx - w, by + r * 0.05);
        g.quadraticCurveTo(bx - w * 0.9 + sway * 0.4, by - h * 0.55, tx, ty);
        g.quadraticCurveTo(bx + w * 0.9 + sway * 0.4, by - h * 0.5, bx + w, by + r * 0.05);
        g.closePath(); g.fill();
      }
    }
  }

  function furiaAura(g, r, t) {
    var vermelho = brilho("#ff2a2a");
    var p = 0.62 + 0.22 * Math.sin(t * 9);
    var s = r * (3.4 + 0.25 * Math.sin(t * 7));
    g.save();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = p;
    g.drawImage(vermelho, -s, -s, s * 2, s * 2);
    g.restore();
    // labaredas vermelhas subindo em volta
    g.fillStyle = "#e01919";
    for (var i = 0; i < 8; i++) {
      var ciclo = ((t * 1.7 + i * 0.37) % 1);
      var ang = i * 0.78 + Math.floor(t * 1.7 + i * 0.37) * 1.3;
      var bx = Math.cos(ang) * r * 1.02, by = Math.sin(ang) * r * 1.02;
      var h = r * 0.75 * (1 - ciclo * 0.6), w = r * 0.13 * (1 - ciclo);
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var ox = bx + dx * ciclo * r * 0.7, oy = by + dy * ciclo * r * 0.7 - ciclo * r * 0.45;
      g.globalAlpha = 0.9 * (1 - ciclo);
      g.beginPath();
      g.moveTo(ox - dy * w, oy + dx * w);
      g.lineTo(ox + dx * h, oy + dy * h - ciclo * r * 0.2);
      g.lineTo(ox + dy * w, oy - dx * w);
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }

  // símbolo de raiva (4 arcos) no canto da testa
  function marcaRaiva(g, r, t) {
    var u = r / 22;
    var pulso = 1 + 0.18 * Math.sin(t * 14);
    g.save();
    g.translate(r * 0.62, -r * 0.7);
    g.scale(u * pulso, u * pulso);
    g.lineCap = "round";
    for (var passo = 0; passo < 2; passo++) {
      g.strokeStyle = passo ? "#ff3030" : CONTORNO;
      g.lineWidth = passo ? 2.4 : 4.6;
      for (var k = 0; k < 4; k++) {
        g.save(); g.rotate(k * Math.PI / 2);
        g.beginPath(); g.moveTo(2.2, 2.2); g.quadraticCurveTo(2.2, 7, 7.6, 7.6); g.stroke();
        g.restore();
      }
    }
    g.restore();
  }

  function rapidezRastro(g, r, t, b, cp) {
    // direção do movimento: usa b.vx/b.vy se existirem; senão, oposto ao lado para onde olha
    var dx, dy;
    if (typeof b.vx === "number" && (b.vx * b.vx + (b.vy || 0) * (b.vy || 0)) > 0.04) {
      var vy = b.vy || 0, m = Math.sqrt(b.vx * b.vx + vy * vy);
      dx = -b.vx / m; dy = -vy / m;
    } else {
      dx = (b.olharX || 0) >= 0 ? -1 : 1; dy = 0;
    }
    var nx = -dy, ny = dx;
    // rastros de imagem (a bolinha "esticada" para trás)
    var sz = cp.c.width / ESC;
    g.save();
    for (var i = 3; i >= 1; i--) {
      g.globalAlpha = 0.34 / i;
      var d = i * r * 0.62;
      g.drawImage(cp.c, dx * d - cp.meio, dy * d - cp.meio, sz, sz);
    }
    g.restore();
    // linhas de velocidade
    g.save();
    g.lineCap = "round";
    g.globalCompositeOperation = "lighter";
    for (var k = 0; k < 5; k++) {
      var off = (k - 2) * r * 0.5;
      var fase = (t * 3.2 + k * 0.27) % 1;
      var ini = r * (0.9 + fase * 1.2);
      var len = r * (0.9 + 0.5 * ((k * 7) % 3) / 2);
      g.globalAlpha = 0.85 * (1 - fase);
      g.strokeStyle = k & 1 ? "#fff7b0" : "#ffd43b";
      g.lineWidth = Math.max(1.6, r * 0.11);
      g.beginPath();
      g.moveTo(dx * ini + nx * off, dy * ini + ny * off);
      g.lineTo(dx * (ini + len) + nx * off, dy * (ini + len) + ny * off);
      g.stroke();
    }
    g.restore();
  }

  // ---------- API: desenhar ----------
  function desenhar(ctx, b) {
    var r = b.r || 22;
    var t = b.t || 0;
    var cor = b.cor || "#4dabf7";
    var pal = paleta(cor);
    var fant = b.fantasma || 0;
    var alfa = 1 - 0.85 * fant;
    var sx = b.escalaX || 1, sy = b.escalaY || 1;
    var cp = corpo(cor, r);

    ctx.save();
    ctx.translate(b.x, b.y);

    // --- atrás do corpo: fúria, chamas, rapidez ---
    if (b.furia) {
      ctx.globalAlpha = 1 - 0.7 * fant;
      furiaAura(ctx, r, t);
      ctx.globalAlpha = 1;
    }
    if (b.rapidez) { ctx.globalAlpha = alfa; rapidezRastro(ctx, r, t, b, cp); ctx.globalAlpha = 1; }
    if (b.fogo) {
      ctx.save();
      ctx.globalAlpha = 0.55 * alfa;
      ctx.globalCompositeOperation = "lighter";
      var sg = r * 3;
      ctx.drawImage(brilho("#ff8a1f"), -sg, -sg - r * 0.5, sg * 2, sg * 2);
      ctx.restore();
      ctx.globalAlpha = alfa;
      fogoChamas(ctx, r, t, pal);
      ctx.globalAlpha = 1;
    }

    // --- corpo (com amassar/esticar) ---
    ctx.scale(sx, sy);
    ctx.globalAlpha = alfa;
    var sz = cp.c.width / ESC;
    ctx.drawImage(cp.c, -cp.meio, -cp.meio, sz, sz);

    // --- rosto ---
    var u = r / 22 * (r < 18 ? 1.1 : 1);
    var ab = 1 - Math.min(1, Math.max(0, b.piscar || 0));
    ctx.save();
    ctx.scale(u, u);
    rosto(ctx, b, pal, t, ab);
    ctx.restore();

    if (b.flash > 0.01) {
      var fl = flashCorpo(cor, r);
      ctx.globalAlpha = Math.min(1, b.flash) * alfa;
      ctx.drawImage(fl.c, -fl.meio, -fl.meio, fl.c.width / ESC, fl.c.height / ESC);
    }
    ctx.globalAlpha = 1;

    // --- marca de raiva por cima do corpo ---
    if (b.furia) marcaRaiva(ctx, r, t);

    // --- contorno tremido do fantasma ---
    if (fant > 0.05) {
      var q = Math.floor(t * 14);
      ctx.strokeStyle = pal.halo;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.35 + 0.65 * fant;
      ctx.beginPath();
      var N = 18, pts = PTS_FANTASMA;
      for (var i = 0; i < N; i++) {
        var a = i / N * PI2;
        var rr = r * (1.04 + (ruido(i * 3.1 + q * 7.7) - 0.5) * 0.11 * (0.4 + fant));
        pts[2 * i] = Math.cos(a) * rr; pts[2 * i + 1] = Math.sin(a) * rr;
      }
      // curva suave passando pelos pontos médios
      ctx.moveTo((pts[0] + pts[2 * N - 2]) / 2, (pts[1] + pts[2 * N - 1]) / 2);
      for (i = 0; i < N; i++) {
        var j = (i + 1) % N;
        ctx.quadraticCurveTo(pts[2 * i], pts[2 * i + 1], (pts[2 * i] + pts[2 * j]) / 2, (pts[2 * i + 1] + pts[2 * j + 1]) / 2);
      }
      ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.scale(1 / sx, 1 / sy);

    // --- por cima: gelo e escudo ---
    if (b.congelado) {
      var ge = cacheRaio(gelos, criarGelo, r);
      var gs = ge.c.width / ESC;
      ctx.globalAlpha = alfa < 0.5 ? 0.85 : 1;
      ctx.drawImage(ge.c, -ge.meio, -ge.meio, gs, gs);
      // brilhos piscando nos cantos
      var m = r * 1.32;
      for (var s = 0; s < 3; s++) {
        var pisca = Math.max(0, Math.sin(t * 5 + s * 2.1));
        if (pisca < 0.2) continue;
        var cxs = [-m * 0.7, m * 0.72, m * 0.45][s], cys = [-m * 0.75, -m * 0.2, m * 0.75][s];
        ctx.fillStyle = "#fff";
        var sp = r * 0.2 * pisca + 1;
        ctx.beginPath();
        ctx.moveTo(cxs, cys - sp * 2); ctx.quadraticCurveTo(cxs, cys, cxs + sp * 2, cys);
        ctx.quadraticCurveTo(cxs, cys, cxs, cys + sp * 2); ctx.quadraticCurveTo(cxs, cys, cxs - sp * 2, cys);
        ctx.quadraticCurveTo(cxs, cys, cxs, cys - sp * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (b.escudo) {
      var es = cacheRaio(escudos, criarEscudo, r);
      var pulso = 1 + 0.03 * Math.sin(t * 5);
      var ez = es.c.width / ESC * pulso;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(es.c, -ez / 2, -ez / 2, ez, ez);
      // faixa de luz girando na borda
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = Math.max(1.6, r * 0.1);
      ctx.lineCap = "round";
      var ang = t * 2.2;
      ctx.beginPath(); ctx.arc(0, 0, es.R * pulso * 0.93, ang, ang + 0.55); ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(0, 0, es.R * pulso * 0.93, ang + Math.PI, ang + Math.PI + 0.25); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ---------- API: sombra ----------
  function sombra(ctx, x, chaoY, r, altura) {
    if (!sprSombra) sprSombra = criarSombra();
    var h = Math.max(0, altura || 0);
    var k = Math.max(0.35, 1 / (1 + h / 240));
    var w = r * 2.7 * k, hh = r * 0.95 * k;
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.35 + 0.65 * k);
    ctx.drawImage(sprSombra, x - w / 2, chaoY - hh * 0.35, w, hh);
    ctx.restore();
  }

  return { desenhar: desenhar, sombra: sombra };
})();
