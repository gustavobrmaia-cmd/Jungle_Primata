"use strict";

// =========================
// QUEDA DE BRAÇO: cena própria que cobre a tela.
// Fundo (arena, plateia, bandeirinhas, palco, mesa) em cache; por quadro só desenha
// as 2 bolinhas, os braços, a barra de força, os números e os efeitos de esforço.
// Depende de ArteBolinha (carregar bolinhas.js antes).
// =========================

const ArteQueda = (function() {
  var CONTORNO = "#1b1030";
  var PI2 = Math.PI * 2;
  var FONTE = "'Arial Rounded MT Bold','Trebuchet MS',system-ui,Arial,sans-serif";

  // geometria do mundo 1280x720
  var CX = 640;
  var BOLA_R = 84, BOLA1_X = 300, BOLA2_X = 980, BOLA_Y = 408;
  var MESA_TOPO = 498, MESA_FRENTE = 550, MESA_FIM = 612;
  var COTOVELO_Y = 524, COT1_X = 500, COT2_X = 780;

  // ---------- utilidades de cor ----------
  function hexRgb(h) {
    if (h.charAt(0) === "#") h = h.slice(1);
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mist(rgb, alvo, q) {
    return "rgb(" + Math.round(rgb[0] + (alvo[0] - rgb[0]) * q) + "," + Math.round(rgb[1] + (alvo[1] - rgb[1]) * q) +
      "," + Math.round(rgb[2] + (alvo[2] - rgb[2]) * q) + ")";
  }
  var BR = [255, 255, 255], PR = [27, 16, 48];
  function criarCanvas(w, h) { var c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  function retArred(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // gerador pseudo-aleatório com semente (a plateia é sempre a mesma)
  function semente(s) { return function() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function hash(n) { var s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); }

  // ---------- sprites ----------
  var sprFeixes = {};
  function feixe(cor) { // cone de luz de holofote
    var s = sprFeixes[cor];
    if (s) return s;
    var rgb = hexRgb(cor);
    s = criarCanvas(150, 520);
    var g = s.getContext("2d");
    var gr = g.createLinearGradient(0, 0, 0, 520);
    gr.addColorStop(0, "rgba(" + rgb.join(",") + ",0.55)");
    gr.addColorStop(1, "rgba(" + rgb.join(",") + ",0)");
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(68, 0); g.lineTo(82, 0); g.lineTo(150, 520); g.lineTo(0, 520); g.closePath(); g.fill();
    return (sprFeixes[cor] = s);
  }
  var sprBrilhos = {};
  function brilho(cor) {
    var s = sprBrilhos[cor];
    if (s) return s;
    var rgb = hexRgb(cor);
    s = criarCanvas(64, 64);
    var g = s.getContext("2d");
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(" + rgb.join(",") + ",1)");
    gr.addColorStop(0.4, "rgba(" + rgb.join(",") + ",0.5)");
    gr.addColorStop(1, "rgba(" + rgb.join(",") + ",0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (sprBrilhos[cor] = s);
  }

  // ---------- fundo em cache ----------
  var fundoCache = null, fundoChave = "";
  var fileiras = null; // plateia (duas fileiras separadas, para balançarem)

  function desenharPlateia(g, W, base, cor, raioCab, passo, seed, brilhoCor) {
    var rnd = semente(seed);
    g.fillStyle = cor;
    var x = -20;
    while (x < W + 40) {
      var cx = x + rnd() * 10, cy = base - rnd() * raioCab * 0.9;
      // corpo
      g.beginPath(); g.ellipse(cx, cy + raioCab * 1.9, raioCab * 1.5, raioCab * 1.6, 0, 0, PI2); g.fill();
      // cabeça
      g.beginPath(); g.arc(cx, cy, raioCab, 0, PI2); g.fill();
      // braço levantado com mão (alguns)
      if (rnd() < 0.34) {
        var lado = rnd() < 0.5 ? -1 : 1, alto = raioCab * (1.8 + rnd() * 1.2);
        g.strokeStyle = cor; g.lineWidth = raioCab * 0.55; g.lineCap = "round";
        g.beginPath(); g.moveTo(cx + lado * raioCab * 1.1, cy + raioCab * 1.2);
        g.lineTo(cx + lado * raioCab * 1.7, cy - alto); g.stroke();
        g.beginPath(); g.arc(cx + lado * raioCab * 1.7, cy - alto, raioCab * 0.45, 0, PI2); g.fill();
        // bastão luminoso / bandeirinha colorida
        if (rnd() < 0.6) {
          var cb = brilhoCor[(rnd() * brilhoCor.length) | 0];
          g.strokeStyle = cb; g.lineWidth = 3;
          g.beginPath(); g.moveTo(cx + lado * raioCab * 1.7, cy - alto);
          g.lineTo(cx + lado * raioCab * 1.7 + lado * 5, cy - alto - raioCab * 1.5); g.stroke();
        }
      }
      // luz de borda (rim) colorida na cabeça
      g.fillStyle = brilhoCor[(rnd() * brilhoCor.length) | 0];
      g.globalAlpha = 0.28;
      g.beginPath(); g.arc(cx - raioCab * 0.2, cy - raioCab * 0.3, raioCab * 0.85, Math.PI * 1.05, Math.PI * 1.75); g.lineTo(cx, cy); g.fill();
      g.globalAlpha = 1; g.fillStyle = cor;
      x += passo * (0.8 + rnd() * 0.45);
    }
  }

  function criarFundo(W, H) {
    var oy = (H - 720) / 2;
    var c = criarCanvas(W, H), g = c.getContext("2d");
    var ox = (W - 1280) / 2;

    // céu da arena: roxo profundo com um núcleo mais claro no meio
    var gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#150a33"); gr.addColorStop(0.45, "#35154f"); gr.addColorStop(1, "#1a0b30");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var rg = g.createRadialGradient(W / 2, oy + 330, 20, W / 2, oy + 330, 560);
    rg.addColorStop(0, "rgba(255,120,190,0.32)"); rg.addColorStop(0.5, "rgba(140,70,220,0.14)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, W, H);

    // parede de luzes ao fundo (lâmpadas coloridas em arcos)
    var cores = ["#ff5d9e", "#ffd43b", "#4dd2ff", "#8cff6b", "#ff9a3b", "#b57bff"];
    g.save(); g.translate(ox, oy);
    for (var fila = 0; fila < 3; fila++) {
      var yy = 150 + fila * 34;
      for (var i = 0; i < 28; i++) {
        var x = 28 + i * 45 + (fila & 1) * 22;
        var cc = cores[(i + fila * 2) % 6];
        g.globalAlpha = 0.9;
        g.drawImage(brilho(cc), x - 14, yy - 14, 28, 28);
        g.globalAlpha = 1;
        g.fillStyle = "#fff"; g.beginPath(); g.arc(x, yy, 2.4, 0, PI2); g.fill();
      }
    }
    g.restore();

    // plateia em silhueta (duas fileiras em canvases separados, para balançarem)
    var f1 = criarCanvas(W + 80, 420), f2 = criarCanvas(W + 80, 420);
    desenharPlateia(f1.getContext("2d"), W + 80, 120, "#2a1550", 17, 44, 7, cores);
    desenharPlateia(f2.getContext("2d"), W + 80, 150, "#1b0c38", 23, 62, 21, cores);
    fileiras = [f1, f2];

    // bandeirinhas de festa no alto
    g.save(); g.translate(ox, oy);
    for (var fio = 0; fio < 2; fio++) {
      var y0 = 4 + fio * 26;
      g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-10, y0 + 8);
      g.quadraticCurveTo(640, y0 + 72, 1290, y0 + 8); g.stroke();
      for (var k = 0; k <= 30; k++) {
        var tt = k / 30;
        var bx = -10 + 1300 * tt, by = (1 - tt) * (1 - tt) * (y0 + 8) + 2 * tt * (1 - tt) * (y0 + 72) + tt * tt * (y0 + 8);
        g.fillStyle = cores[(k + fio * 3) % 6];
        g.strokeStyle = CONTORNO; g.lineWidth = 1.6; g.lineJoin = "round";
        g.beginPath(); g.moveTo(bx - 11, by); g.lineTo(bx + 11, by); g.lineTo(bx, by + 24); g.closePath(); g.fill(); g.stroke();
      }
    }
    g.restore();

    // palco: piso de madeira em perspectiva (do topo da mesa para baixo), num canvas à parte
    var topo = oy + 486;
    var pisoCanvas = criarCanvas(W, H - topo);
    pisoCache = { c: pisoCanvas, y: topo };
    g = pisoCanvas.getContext("2d");
    g.translate(0, -topo);
    var gp = g.createLinearGradient(0, topo, 0, H);
    gp.addColorStop(0, "#6a3a22"); gp.addColorStop(0.35, "#4c2818"); gp.addColorStop(1, "#2a140e");
    g.fillStyle = gp; g.fillRect(0, topo, W, H - topo);
    g.fillStyle = "rgba(255,200,140,0.1)"; g.fillRect(0, topo, W, 3);
    // tábuas
    g.strokeStyle = "rgba(20,8,5,0.55)"; g.lineWidth = 2;
    for (var ti = -14; ti <= 14; ti++) {
      g.beginPath(); g.moveTo(W / 2 + ti * 46, topo); g.lineTo(W / 2 + ti * 150, H); g.stroke();
    }
    for (var li = 0; li < 5; li++) {
      var ly = topo + Math.pow(li / 5, 1.6) * (H - topo) + 12 + li * 6;
      g.beginPath(); g.moveTo(0, ly); g.lineTo(W, ly); g.stroke();
    }
    // piscina de luz no piso (elipse achatada)
    g.save();
    g.translate(W / 2, oy + 590); g.scale(1, 0.32);
    var pl = g.createRadialGradient(0, 0, 10, 0, 0, 560);
    pl.addColorStop(0, "rgba(255,210,150,0.42)"); pl.addColorStop(1, "rgba(255,210,150,0)");
    g.fillStyle = pl; g.fillRect(-W, -700, W * 2, 1400);
    g.restore();
    return c;
  }

  var pisoCache = null;
  function fundo(W, H) {
    var k = W + "x" + H;
    if (fundoChave !== k) { fundoCache = criarFundo(W, H); fundoChave = k; }
    return fundoCache;
  }

  // ---------- mesa em cache (por par de cores) ----------
  var mesas = {};
  function mesa(cor1, cor2) {
    var k = cor1 + "|" + cor2;
    if (mesas[k]) return mesas[k];
    var c = criarCanvas(900, 190), g = c.getContext("2d");
    g.translate(450, -480); // o canvas guarda o mundo de y=480 a y=670
    g.lineJoin = "round"; g.lineCap = "round";
    var xb = 285, xf = 392; // meia largura atrás e na frente
    var yt = MESA_TOPO, yf = MESA_FRENTE, ye = MESA_FIM;
    // sombra no piso
    g.fillStyle = "rgba(10,4,20,0.4)";
    g.beginPath(); g.ellipse(0, ye + 6, xf + 20, 16, 0, 0, PI2); g.fill();
    // frente (saia da mesa) com faixa nas cores dos dois lados
    g.fillStyle = CONTORNO;
    retArred(g, -xf - 3, yf - 3, xf * 2 + 6, ye - yf + 6, 12); g.fill();
    var gf = g.createLinearGradient(0, yf, 0, ye);
    gf.addColorStop(0, "#8c4e2a"); gf.addColorStop(1, "#5a2e19");
    g.fillStyle = gf; retArred(g, -xf, yf, xf * 2, ye - yf, 10); g.fill();
    // faixa colorida (cada metade na cor do jogador)
    g.save(); retArred(g, -xf, yf, xf * 2, ye - yf, 10); g.clip();
    var rgb1 = hexRgb(cor1), rgb2 = hexRgb(cor2);
    g.fillStyle = cor1; g.fillRect(-xf, yf + 10, xf, 22);
    g.fillStyle = cor2; g.fillRect(0, yf + 10, xf, 22);
    g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(-xf, yf + 10, xf * 2, 7);
    g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(-xf, yf + 26, xf * 2, 6);
    // estrelinhas decorativas na faixa
    g.fillStyle = "rgba(255,255,255,0.8)";
    for (var i = -3; i <= 3; i++) {
      if (!i) continue;
      g.beginPath(); g.arc(i * 100 - Math.sign(i) * 20, yf + 21, 3.2, 0, PI2); g.fill();
    }
    g.restore();
    g.strokeStyle = CONTORNO; g.lineWidth = 3; retArred(g, -xf, yf, xf * 2, ye - yf, 10); g.stroke();
    // tampo trapezoidal (perspectiva)
    g.beginPath(); g.moveTo(-xb, yt); g.lineTo(xb, yt); g.lineTo(xf, yf); g.lineTo(-xf, yf); g.closePath();
    var gt = g.createLinearGradient(0, yt, 0, yf);
    gt.addColorStop(0, "#d9944d"); gt.addColorStop(1, "#b9692f");
    g.fillStyle = gt; g.fill();
    g.strokeStyle = CONTORNO; g.lineWidth = 3.4; g.stroke();
    // veios de madeira
    g.save(); g.beginPath(); g.moveTo(-xb, yt); g.lineTo(xb, yt); g.lineTo(xf, yf); g.lineTo(-xf, yf); g.closePath(); g.clip();
    g.strokeStyle = "rgba(90,40,10,0.22)"; g.lineWidth = 1.6;
    for (i = 0; i < 7; i++) {
      var yy = yt + 5 + i * 6.5;
      g.beginPath(); g.moveTo(-xf, yy); g.bezierCurveTo(-200, yy - 3, 150, yy + 4, xf, yy - 1); g.stroke();
    }
    var gl = g.createLinearGradient(-xf, 0, xf, 0);
    gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, "rgba(255,240,200,0.28)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(-xf, yt, xf * 2, 12);
    g.restore();
    // almofadinhas dos cotovelos
    var ey = COTOVELO_Y;
    var pads = [COT1_X - CX, COT2_X - CX];
    for (i = 0; i < 2; i++) {
      g.fillStyle = CONTORNO; g.beginPath(); g.ellipse(pads[i], ey + 2, 46, 15, 0, 0, PI2); g.fill();
      g.fillStyle = i ? mist(rgb2, PR, 0.35) : mist(rgb1, PR, 0.35);
      g.beginPath(); g.ellipse(pads[i], ey, 43, 12.5, 0, 0, PI2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.ellipse(pads[i] - 8, ey - 3, 24, 4.5, 0, 0, PI2); g.fill();
    }
    // linha central e marcas de "vitória" nas pontas
    g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 2; g.setLineDash([5, 6]);
    g.beginPath(); g.moveTo(0, yt + 3); g.lineTo(0, yf - 3); g.stroke(); g.setLineDash([]);
    return (mesas[k] = { c: c, x: -450, y: 480 });
  }

  // ---------- peças dinâmicas ----------
  function gota(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y - s * 1.5);
    g.bezierCurveTo(x + s * 0.3, y - s * 0.6, x + s, y - s * 0.2, x + s, y + s * 0.4);
    g.arc(x, y + s * 0.4, s, 0, Math.PI);
    g.bezierCurveTo(x - s, y - s * 0.2, x - s * 0.3, y - s * 0.6, x, y - s * 1.5);
    g.closePath();
  }

  // braço grosso com contorno, passando pelo cotovelo
  function braco(g, sx, sy, ex, ey, hx, hy, cor) {
    var rgb = hexRgb(cor);
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = mist(rgb, PR, 0.78); g.lineWidth = 36;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = mist(rgb, PR, 0.15); g.lineWidth = 29;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = cor; g.lineWidth = 22;
    g.beginPath(); g.moveTo(sx, sy - 1); g.lineTo(ex, ey - 1); g.lineTo(hx, hy - 1); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.38)"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(sx, sy - 6); g.lineTo(ex, ey - 6); g.lineTo(hx, hy - 6); g.stroke();
    // munhequeira branca perto da mão
    var dx = hx - ex, dy = hy - ey, d = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= d; dy /= d;
    var px = hx - dx * 36, py = hy - dy * 36, qx = hx - dx * 26, qy = hy - dy * 26;
    g.strokeStyle = CONTORNO; g.lineWidth = 34;
    g.beginPath(); g.moveTo(px, py); g.lineTo(qx, qy); g.stroke();
    g.strokeStyle = "#fff"; g.lineWidth = 27;
    g.beginPath(); g.moveTo(px, py); g.lineTo(qx, qy); g.stroke();
    g.strokeStyle = cor; g.lineWidth = 27;
    g.beginPath(); g.moveTo(px + dx * 3.5, py + dy * 3.5); g.lineTo(px + dx * 6.5, py + dy * 6.5); g.stroke();
  }

  function luva(g, x, y, ang, escala) {
    g.save();
    g.translate(x, y); g.rotate(ang); g.scale(escala, escala);
    g.lineJoin = "round";
    // punho
    g.fillStyle = "#fff"; g.strokeStyle = CONTORNO; g.lineWidth = 3.4;
    g.beginPath(); g.arc(0, 0, 25, 0, PI2); g.fill(); g.stroke();
    // sombra por baixo
    g.save(); g.beginPath(); g.arc(0, 0, 23.5, 0, PI2); g.clip();
    g.fillStyle = "rgba(120,110,170,0.35)"; g.beginPath(); g.arc(6, 10, 26, 0, PI2); g.fill();
    g.restore();
    // dedos
    g.strokeStyle = "rgba(27,16,48,0.7)"; g.lineWidth = 2.2; g.lineCap = "round";
    for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 8 + 2, -4); g.lineTo(i * 8 + 2, 10); g.stroke(); }
    // brilho
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath(); g.ellipse(-9, -12, 6, 3.5, -0.6, 0, PI2); g.fill();
    g.restore();
  }

  function coroa(g, x, y, s, rot) {
    g.save();
    g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(-26, 12); g.lineTo(-30, -16); g.lineTo(-14, -2); g.lineTo(0, -22); g.lineTo(14, -2); g.lineTo(30, -16); g.lineTo(26, 12);
    g.closePath();
    var gr = g.createLinearGradient(0, -22, 0, 12);
    gr.addColorStop(0, "#fff08a"); gr.addColorStop(1, "#ffb21f");
    g.fillStyle = gr; g.fill();
    g.strokeStyle = CONTORNO; g.lineWidth = 3.4; g.stroke();
    g.fillStyle = "#ff4d6d"; g.beginPath(); g.arc(0, 2, 4.4, 0, PI2); g.fill();
    g.fillStyle = "#4dabf7"; g.beginPath(); g.arc(-15, 3, 3, 0, PI2); g.fill();
    g.beginPath(); g.arc(15, 3, 3, 0, PI2); g.fill();
    g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(-8, -2, 6, 2.5, -0.7, 0, PI2); g.fill();
    g.fillStyle = "#fff"; g.strokeStyle = CONTORNO; g.lineWidth = 1.4;
    g.restore();
  }

  // explosão de linhas de impacto (estilo gibi) no ponto de encontro das mãos
  function impactoMaos(g, x, y, t, forca) {
    g.save();
    g.translate(x, y);
    g.globalCompositeOperation = "lighter";
    var s = 70 + forca * 36;
    g.globalAlpha = 0.55 + 0.2 * Math.sin(t * 22);
    g.drawImage(brilho("#ffb347"), -s, -s, s * 2, s * 2);
    g.globalAlpha = 1;
    g.lineCap = "round";
    var n = 9, q = Math.floor(t * 18);
    for (var i = 0; i < n; i++) {
      var a = i / n * PI2 + hash(q * 3 + i) * 0.5;
      var l0 = 34, l1 = 46 + hash(i * 3.3 + q) * 30 * (0.6 + forca);
      g.strokeStyle = i & 1 ? "#fff3a8" : "#ffc233";
      g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(Math.cos(a) * l0, Math.sin(a) * l0 - 8); g.lineTo(Math.cos(a) * l1, Math.sin(a) * l1 - 8); g.stroke();
    }
    g.restore();
  }

  function textoCaixa(g, txt, x, y, tam, cor, esc) {
    g.save();
    g.translate(x, y); g.scale(esc, esc);
    g.font = "900 " + tam + "px " + FONTE;
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = tam * 0.2; g.strokeStyle = CONTORNO; g.strokeText(txt, 0, 0);
    g.fillStyle = cor; g.fillText(txt, 0, 0);
    g.restore();
  }

  // cartela com a dica de controle
  var largTxt = {};
  function dica(g, txt, x, y, cor, pulso, t) {
    if (!txt) return;
    g.save();
    g.font = "700 21px " + FONTE;
    var w = largTxt[txt];
    if (!w) w = largTxt[txt] = g.measureText(txt).width;
    var larg = Math.min(430, w + 76), alt = 38;
    g.translate(x, y); g.scale(1 + 0.06 * pulso, 1 + 0.06 * pulso);
    g.fillStyle = "rgba(20,10,40,0.78)"; retArred(g, -larg / 2, -alt / 2, larg, alt, 19); g.fill();
    g.strokeStyle = cor; g.lineWidth = 3; g.stroke();
    // ícone de toque (dedinho com ondas)
    var ix = -larg / 2 + 24, k = (t * 1.8) % 1;
    g.strokeStyle = cor; g.globalAlpha = 1 - k; g.lineWidth = 2.4;
    g.beginPath(); g.arc(ix, 0, 5 + k * 10, 0, PI2); g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(ix, 0, 4.6 + pulso * 1.5, 0, PI2); g.fill();
    g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle";
    g.fillText(txt, ix + 18, 1.5, larg - 56);
    g.restore();
  }

  // ---------- estado interno (pulsos e suavização) ----------
  var ult1 = 0, ult2 = 0, p1 = -9, p2 = -9, tAnt = 0, posS = 0;
  var esc1 = {}, esc2 = {}; // descritores de bolinha reaproveitados
  function copiar(dest, src) { for (var k in src) dest[k] = src[k]; return dest; }

  // ---------- API ----------
  function desenhar(ctx, q, largura, altura) {
    var W = largura || 1280, H = altura || 720;
    var t = q.t || 0;
    var ox = (W - 1280) / 2, oy = (H - 720) / 2;

    // pulsos nos toques e suavização da posição
    if (t < tAnt - 0.5) { ult1 = q.toques1 | 0; ult2 = q.toques2 | 0; p1 = p2 = -9; posS = q.pos || 0; }
    var dt = Math.min(0.1, Math.max(0, t - tAnt)); tAnt = t;
    if ((q.toques1 | 0) !== ult1) { ult1 = q.toques1 | 0; p1 = t; }
    if ((q.toques2 | 0) !== ult2) { ult2 = q.toques2 | 0; p2 = t; }
    var alvo = Math.max(-1, Math.min(1, q.pos || 0));
    posS += (alvo - posS) * Math.min(1, dt * 14 + 0.001);
    var pos = posS;
    var pul1 = Math.max(0, 1 - (t - p1) / 0.28), pul2 = Math.max(0, 1 - (t - p2) / 0.28);
    var venc = q.vencedor | 0;

    ctx.save();
    var b1 = copiar(esc1, q.b1), b2 = copiar(esc2, q.b2);
    var cor1 = b1.cor || "#ff5d73", cor2 = b2.cor || "#4dabf7";

    // 1. fundo em cache
    ctx.drawImage(fundo(W, H), 0, 0, W, H);

    // plateia (balança), holofotes
    var f = fileiras;
    ctx.drawImage(f[0], -40, oy + 250 + Math.sin(t * 3.2) * 4 - 0, W + 80, 420);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var fcores = ["#ff5d9e", "#4dd2ff", "#ffd43b"];
    for (var i = 0; i < 3; i++) {
      var ang = Math.sin(t * 0.9 + i * 2.1) * 0.28 + (i - 1) * 0.28;
      ctx.save();
      ctx.translate(ox + 240 + i * 400, oy - 6);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.5 + 0.1 * Math.sin(t * 2 + i);
      ctx.drawImage(feixe(fcores[i]), -75, 0, 150, 520);
      ctx.restore();
    }
    ctx.restore();
    ctx.drawImage(f[1], -40, oy + 276 + Math.sin(t * 3.6 + 1.3) * 6, W + 80, 420);
    // palco por cima da plateia
    ctx.drawImage(pisoCache.c, 0, pisoCache.y);

    ctx.translate(ox, oy);

    // 2. esforço: quem está perdendo sua, quem está ganhando faz força
    var lado1 = -pos, lado2 = pos;                      // positivo = ganhando
    var esf1 = 0.45 + 0.4 * (lado1 > 0 ? lado1 : 0) + pul1 * 0.4;
    var esf2 = 0.45 + 0.4 * (lado2 > 0 ? lado2 : 0) + pul2 * 0.4;
    if (venc) { esf1 = esf2 = 0; }

    // holofote no vencedor (aditivo, cresce ao longo do tempo)
    if (venc) {
      var vx = venc === 1 ? BOLA1_X - pos * 30 : BOLA2_X - pos * 30;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      var gs = 260 + 20 * Math.sin(t * 6);
      ctx.globalAlpha = 0.65;
      ctx.drawImage(brilho(venc === 1 ? cor1 : cor2), vx - gs, BOLA_Y - gs + 10, gs * 2, gs * 2);
      ctx.restore();
    }

    // 3. posições das bolinhas
    var pulo1 = 0, pulo2 = 0;
    if (venc === 1) pulo1 = -Math.abs(Math.sin(t * 6.5)) * 34;
    if (venc === 2) pulo2 = -Math.abs(Math.sin(t * 6.5)) * 34;
    var x1 = BOLA1_X - pos * 34 + Math.sin(t * 57) * esf1 * 2.6;
    var x2 = BOLA2_X - pos * 34 + Math.sin(t * 61 + 1.7) * esf2 * 2.6;
    var y1 = BOLA_Y + Math.cos(t * 49) * esf1 * 1.8 + pulo1 + (lado1 < 0 ? -lado1 * 10 : 0);
    var y2 = BOLA_Y + Math.cos(t * 53 + 0.8) * esf2 * 1.8 + pulo2 + (lado2 < 0 ? -lado2 * 10 : 0);
    var rot1 = venc ? 0 : 0.1 + lado1 * 0.15;
    var rot2 = venc ? 0 : -(0.1 + lado2 * 0.15);

    // expressões
    function expr(lado, v, eu) {
      if (v) return v === eu ? "feliz" : "tonto";
      if (lado < -0.55) return "medo";
      if (lado > 0.55) return "bravo";
      return "esforco";
    }
    b1.expressao = expr(lado1, venc, 1); b2.expressao = expr(lado2, venc, 2);
    var tt = t;
    b1.t = tt; b2.t = tt + 0.7;
    b1.r = b2.r = BOLA_R;
    b1.piscar = b1.expressao === "feliz" ? 0 : (b1.piscar || 0);
    b2.piscar = b2.expressao === "feliz" ? 0 : (b2.piscar || 0);
    b1.olharX = 0.85; b1.olharY = 0.15; b2.olharX = -0.85; b2.olharY = 0.15;
    var s1 = 1 + 0.1 * pul1, s2 = 1 + 0.1 * pul2;
    b1.escalaX = s1 * (1 + 0.04 * esf1 * Math.sin(t * 40)); b1.escalaY = s1 * (1 - 0.04 * esf1 * Math.sin(t * 40));
    b2.escalaX = s2 * (1 + 0.04 * esf2 * Math.sin(t * 43)); b2.escalaY = s2 * (1 - 0.04 * esf2 * Math.sin(t * 43));
    b1.flash = Math.max(b1.flash || 0, 0); b2.flash = Math.max(b2.flash || 0, 0);

    // sombras no palco
    ArteBolinha.sombra(ctx, x1, MESA_TOPO + 14, BOLA_R, -pulo1 * 2 + 0);
    ArteBolinha.sombra(ctx, x2, MESA_TOPO + 14, BOLA_R, -pulo2 * 2 + 0);

    // 4. bolinhas (atrás da mesa), inclinadas
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(rot1); b1.x = 0; b1.y = 0; ArteBolinha.desenhar(ctx, b1); ctx.restore();
    ctx.save(); ctx.translate(x2, y2); ctx.rotate(rot2); b2.x = 0; b2.y = 0; ArteBolinha.desenhar(ctx, b2); ctx.restore();

    // gotas de suor (só as com cor azul clara, sem sangue)
    function suor(xc, yc, dir, intens, fase) {
      ctx.save();
      var n = intens > 0.8 ? 4 : 2;
      for (var k = 0; k < n; k++) {
        var ph = (t * 1.35 + k / n + fase) % 1;
        var gx = xc + dir * (BOLA_R * 0.72 + ph * 62), gy = yc - BOLA_R * 0.62 - 26 * Math.sin(ph * Math.PI) + 150 * ph * ph;
        ctx.globalAlpha = Math.min(1, (1 - ph) * 2.2);
        gota(ctx, gx, gy, 6.5 - ph * 2);
        ctx.fillStyle = "#9be7ff"; ctx.fill();
        ctx.strokeStyle = "#2a6f9a"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(gx - 2, gy + 1, 1.8, 0, PI2); ctx.fill();
      }
      ctx.restore();
    }
    if (!venc) {
      suor(x1, y1, -1, 0.5 + Math.max(0, -lado1) * 0.9, 0);
      suor(x2, y2, 1, 0.5 + Math.max(0, -lado2) * 0.9, 0.31);
    }

    // 5. mesa
    var m = mesa(cor1, cor2);
    ctx.drawImage(m.c, CX + m.x, m.y);

    // 6. braços: ombro -> cotovelo -> mão (a mão vai para o lado de quem perde)
    var cot1x = COT1_X - pos * 40 + (venc ? 0 : Math.sin(t * 45) * esf1 * 1.5);
    var cot2x = COT2_X - pos * 40 + (venc ? 0 : Math.sin(t * 47 + 1) * esf2 * 1.5);
    var forte = Math.pow(Math.abs(pos), 1.7);
    var hx = CX - pos * 118, hy = COTOVELO_Y - 150 * (1 - forte) - 10 * forte;
    var vib = venc ? 0 : (1 - forte) * 2.5;
    hx += Math.sin(t * 51) * vib; hy += Math.cos(t * 44) * vib;
    // um ombro de cada lado (um pouco abaixo do centro da bolinha)
    braco(ctx, x1 + BOLA_R * 0.62, y1 + BOLA_R * 0.5, cot1x, COTOVELO_Y, hx - 4, hy, cor1);
    braco(ctx, x2 - BOLA_R * 0.62, y2 + BOLA_R * 0.5, cot2x, COTOVELO_Y, hx + 4, hy, cor2);

    // mãos entrelaçadas
    var angMao = -pos * 0.35;
    luva(ctx, hx - 9, hy, angMao - 0.1, 1);
    luva(ctx, hx + 9, hy, angMao + 0.1, 0.96);

    // faíscas/linhas de impacto onde as mãos se encontram (mais forte quando equilibrado)
    if (!venc) impactoMaos(ctx, hx, hy - 16, t, 1 - forte);

    // 7. barra de força no topo
    var share1 = (1 - pos) / 2;
    var bx0 = 250, bw = 780, byy = 44, bh = 32;
    ctx.save();
    ctx.lineJoin = "round";
    // moldura
    ctx.fillStyle = CONTORNO; retArred(ctx, bx0 - 5, byy - 5, bw + 10, bh + 10, 21); ctx.fill();
    ctx.save(); retArred(ctx, bx0, byy, bw, bh, 16); ctx.clip();
    ctx.fillStyle = cor2; ctx.fillRect(bx0, byy, bw, bh);
    var xm = bx0 + bw * share1;
    ctx.fillStyle = cor1; ctx.fillRect(bx0, byy, xm - bx0, bh);
    // listras animadas
    ctx.globalAlpha = 0.13; ctx.fillStyle = "#fff";
    var off = (t * 24) % 28;
    for (var sx = bx0 - 28 + off; sx < bx0 + bw; sx += 28) {
      ctx.beginPath(); ctx.moveTo(sx, byy + bh); ctx.lineTo(sx + 14, byy + bh); ctx.lineTo(sx + 30, byy); ctx.lineTo(sx + 16, byy); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // brilho de vidro
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(bx0, byy, bw, bh * 0.38);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(bx0, byy + bh * 0.72, bw, bh * 0.28);
    ctx.restore();
    // marcador no ponto de encontro
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9;
    ctx.drawImage(brilho("#ffffff"), xm - 26, byy + bh / 2 - 26, 52, 52);
    ctx.restore();
    ctx.fillStyle = CONTORNO; retArred(ctx, xm - 7, byy - 9, 14, bh + 18, 7); ctx.fill();
    ctx.fillStyle = "#fff"; retArred(ctx, xm - 4.2, byy - 6, 8.4, bh + 12, 4); ctx.fill();
    // linha do meio
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(bx0 + bw / 2 - 1, byy + bh + 2, 2, 6);
    // nomes dentro da barra
    ctx.font = "900 20px " + FONTE; ctx.textBaseline = "middle"; ctx.lineWidth = 4; ctx.strokeStyle = CONTORNO;
    ctx.textAlign = "left"; ctx.strokeText(q.nome1 || "", bx0 + 18, byy + bh / 2 + 1); ctx.fillStyle = "#fff"; ctx.fillText(q.nome1 || "", bx0 + 18, byy + bh / 2 + 1);
    ctx.textAlign = "right"; ctx.strokeText(q.nome2 || "", bx0 + bw - 18, byy + bh / 2 + 1); ctx.fillText(q.nome2 || "", bx0 + bw - 18, byy + bh / 2 + 1);
    ctx.restore();
    // carinhas nas pontas da barra
    var ic1 = copiar({}, b1);
    ic1.x = bx0 - 34; ic1.y = byy + bh / 2; ic1.r = 24; ic1.escalaX = ic1.escalaY = 1 + 0.14 * pul1;
    ic1.expressao = lado1 > 0.1 ? "feliz" : lado1 < -0.1 ? "medo" : "normal"; ic1.olharX = 0.6; ic1.olharY = 0;
    if (venc) ic1.expressao = venc === 1 ? "feliz" : "tonto";
    var ic2 = copiar({}, b2);
    ic2.x = bx0 + bw + 34; ic2.y = byy + bh / 2; ic2.r = 24; ic2.escalaX = ic2.escalaY = 1 + 0.14 * pul2;
    ic2.expressao = lado2 > 0.1 ? "feliz" : lado2 < -0.1 ? "medo" : "normal"; ic2.olharX = -0.6; ic2.olharY = 0;
    if (venc) ic2.expressao = venc === 2 ? "feliz" : "tonto";
    ic1.flash = ic2.flash = 0; ic1.fogo = ic2.fogo = false; ic1.escudo = ic2.escudo = false;
    ic1.congelado = ic2.congelado = false; ic1.furia = ic2.furia = false; ic1.rapidez = ic2.rapidez = false; ic1.fantasma = ic2.fantasma = 0;
    ArteBolinha.desenhar(ctx, ic1);
    ArteBolinha.desenhar(ctx, ic2);

    // 8. números de toques e dicas
    textoCaixa(ctx, String(q.toques1 | 0), BOLA1_X, 652, 52, "#fff", 1 + 0.35 * pul1 * pul1 + 0.1 * pul1);
    textoCaixa(ctx, String(q.toques2 | 0), BOLA2_X, 652, 52, "#fff", 1 + 0.35 * pul2 * pul2 + 0.1 * pul2);
    // tira de cor atrás do número
    dica(ctx, q.dica1, BOLA1_X, 695, cor1, pul1, t);
    dica(ctx, q.dica2, BOLA2_X, 695, cor2, pul2, t);

    // 9. vencedor: coroa e confete
    if (venc) {
      var cx = venc === 1 ? x1 : x2, cy = (venc === 1 ? y1 : y2) - BOLA_R - 30 + Math.sin(t * 5) * 4;
      coroa(ctx, cx, cy, 1.5, Math.sin(t * 3) * 0.12);
      var cores = ["#ff5d9e", "#ffd43b", "#4dd2ff", "#8cff6b", cor1, cor2];
      for (i = 0; i < 46; i++) {
        var hx0 = hash(i * 1.7), hv = 0.6 + hash(i * 3.9) * 0.7;
        var px = hx0 * 1280 + Math.sin(t * 2 + i) * 22;
        var py = ((t * 110 * hv + hash(i * 7.1) * 800) % 800) - 40;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(t * (3 + hv * 4) + i);
        ctx.fillStyle = cores[i % 6];
        ctx.fillRect(-5, -2.5 * Math.cos(t * 6 + i), 10, 5 * Math.cos(t * 6 + i));
        ctx.restore();
      }
    }
    ctx.restore();
  }

  return { desenhar: desenhar };
})();
