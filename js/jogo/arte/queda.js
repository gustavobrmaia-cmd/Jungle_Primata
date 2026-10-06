"use strict";

// =========================
// QUEDA DE BRAÇO (v2): cena própria que cobre a tela.
// Arena pré-renderizada (parede, plateia, luzes, mesa, almofadas) em 1 canvas por tamanho + cores.
// Por quadro: sombras, braços (sprites rotacionados/esticados), mãos entrelaçadas (1 sprite), as 2 bolinhas com
// faixa na cabeça (ArteBolinha), barra de força e textos (sprites em cache). Sem gradiente/blur por quadro.
// Depende de ArteBolinha (carregar bolinhas.js antes).
// =========================

const ArteQueda = (function() {
  var PI = Math.PI, PI2 = Math.PI * 2, SS = 1, SSM = 2;   // SS: sprites dos braços (1:1); SSM: molde das mãos (2x, depois assado em ângulos)
  var TINTA = "#15123c";

  // geometria do mundo 1280x720
  var BOLA_R = 80, CX1 = 552, CX2 = 728, CY = 360;      // rostos quase encostando
  var ELB1 = 440, ELB2 = 840, ELB_Y = 548;               // cotovelos na mesa
  var MAO_X = 640, MAO_Y = 496, HS = 1.5;                          // centro das mãos entrelaçadas
  var L_ANTE = 128, L_BRACO = 150;                       // comprimentos de referência (antebraço e braço)
  var MESA_FUNDO = 456, MESA_FRENTE = 612;

  function criarCanvas(w, h) { var c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hexRgb(h) {
    if (h.charAt(0) === "#") h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, q) {
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * q) + "," + Math.round(a[1] + (b[1] - a[1]) * q) + "," + Math.round(a[2] + (b[2] - a[2]) * q) + ")";
  }
  function lumin(cor) { var c = hexRgb(cor); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function pal(cor) { return ArteBolinha.paleta(cor); }
  function retArred(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function capsula(g, x1, y1, x2, y2, w) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    g.beginPath(); g.arc(x2, y2, w / 2, a - PI / 2, a + PI / 2); g.arc(x1, y1, w / 2, a + PI / 2, a + PI * 1.5); g.closePath();
  }
  // pintura cel-shading: sombra de fundo, base deslocada para cima/esquerda, contorno fino da própria cor
  function cel(g, trace, p, dx, dy, lw) {
    g.save(); trace(); g.fillStyle = p.sombra; g.fill(); g.clip();
    g.translate(dx, dy); trace(); g.fillStyle = p.base; g.fill(); g.restore();
    trace(); g.strokeStyle = p.contorno; g.lineWidth = lw; g.lineJoin = "round"; g.stroke();
  }
  function semente(s) { return function() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

  // ---------- textos em cache (sprite 1:1: 1 drawImage por texto) ----------
  var textosC = {}, nTextos = 0;
  function texto(txt, fill, borda, px) {
    var k = txt + "|" + fill + "|" + borda + "|" + px, s = textosC[k];
    if (s) return s;
    if (nTextos > 160) { textosC = {}; nTextos = 0; }
    var pad = 5, fonte = "800 " + px + "px system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    var m = criarCanvas(4, 4).getContext("2d"); m.font = fonte;
    var w = Math.ceil(m.measureText(txt).width) + pad * 2, h = px + pad * 2 + 4;
    var c = criarCanvas(w, h), g = c.getContext("2d");
    g.font = fonte; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = Math.max(3.5, px * 0.14); g.strokeStyle = borda; g.strokeText(txt, w / 2, h / 2 + 1);
    g.fillStyle = fill; g.fillText(txt, w / 2, h / 2 + 1);
    nTextos++;
    return (textosC[k] = { c: c, w: w, h: h });
  }
  function poeTexto(ctx, s, x, y, esc) {
    if (!esc || esc === 1) ctx.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h / 2));
    else ctx.drawImage(s.c, x - s.w * esc / 2, y - s.h * esc / 2, s.w * esc, s.h * esc);
  }

  // ---------- braços (sprites) ----------
  // paleta da pele dos braços: um tico mais clara que a bolinha (separa do corpo) e sombra mais funda
  var peles = {};
  function pele(cor) {
    if (peles[cor]) return peles[cor];
    var p = pal(cor), o = {}; for (var k in p) o[k] = p[k];
    o.base = mix(p.rgb, [255, 255, 255], 0.07);
    o.sombra = mix(p.rgb, [48, 28, 120], 0.5);
    return (peles[cor] = o);
  }
  // traço fino de definição muscular
  function linha(g, p, a, lw) { g.globalAlpha = a; g.strokeStyle = p.contorno; g.lineWidth = lw; g.lineCap = "round"; g.stroke(); g.globalAlpha = 1; }

  // antebraço apontando para +x (ou -x com lado = -1), origem no cotovelo. Munhequeira perto da ponta.
  var antebracos = {};
  function antebraco(cor, lado, faixaCor, listra) {
    var k = cor + "|" + lado + "|" + faixaCor;
    if (antebracos[k]) return antebracos[k];
    var p = pele(cor), pf = pal(faixaCor), ox = 52, oy = 64, w = 202, h = 120;
    var c = criarCanvas(w * SS, h * SS), g = c.getContext("2d");
    g.scale(SS, SS); g.translate(lado > 0 ? ox : w - ox, oy); g.scale(lado, 1);
    var L = L_ANTE, lw = 2.5;
    function forma() {
      g.beginPath();
      g.moveTo(-42, 4);
      g.bezierCurveTo(-50, -30, -18, -54, 16, -56);
      g.bezierCurveTo(54, -60, 90, -42, L + 14, -27);
      g.lineTo(L + 14, 27);
      g.bezierCurveTo(92, 33, 56, 48, 16, 48);
      g.bezierCurveTo(-20, 48, -40, 32, -42, 4);
      g.closePath();
    }
    cel(g, forma, p, -6 * lado, -8, lw);
    g.save(); forma(); g.clip();
    // ventre do músculo de cima (extensores): luz + contorno na borda de baixo
    g.beginPath(); g.moveTo(-8, -34); g.bezierCurveTo(22, -66, 64, -46, 96, -16); g.bezierCurveTo(66, -30, 24, -22, -8, -34); g.closePath();
    g.fillStyle = p.luz; g.globalAlpha = 0.45; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(96, -16); g.bezierCurveTo(66, -30, 24, -22, -8, -34); linha(g, p, 0.75, 2);
    // músculo de baixo (flexores): sombra e contorno na borda de cima
    g.beginPath(); g.moveTo(-2, 22); g.bezierCurveTo(28, 44, 72, 40, 100, 14); g.bezierCurveTo(70, 24, 30, 22, -2, 22); g.closePath();
    g.fillStyle = p.sombra; g.globalAlpha = 0.4; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(100, 14); g.bezierCurveTo(70, 24, 30, 22, -2, 22); linha(g, p, 0.7, 2);
    // brilho e dobra do cotovelo
    g.fillStyle = "#fff"; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(26, -45, 20, 5.5, -0.22, 0, PI2); g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(-30, -6); g.bezierCurveTo(-24, 6, -14, 12, -2, 12); linha(g, p, 0.6, 1.8);
    g.beginPath(); g.moveTo(98, -8); g.lineTo(L + 4, -6); linha(g, p, 0.4, 1.5);
    g.beginPath(); g.moveTo(98, 4); g.lineTo(L + 4, 6); linha(g, p, 0.4, 1.5);
    g.strokeStyle = p.rim; g.lineWidth = 2.2; g.globalAlpha = 0.95; g.lineCap = "round";
    g.beginPath(); g.moveTo(-36, 24); g.bezierCurveTo(-24, 38, -6, 44, 16, 44); g.stroke(); g.globalAlpha = 1;
    g.restore();
    forma(); g.strokeStyle = p.contorno; g.lineWidth = lw; g.lineJoin = "round"; g.stroke();
    // munhequeira
    var bx = L - 38, bw = 20;
    retArred(g, bx, -33, bw, 66, 6); g.fillStyle = pf.base; g.fill();
    g.save(); g.clip(); g.fillStyle = pf.sombra; g.fillRect(bx + bw * 0.62, -40, bw, 80); g.fillStyle = pf.luz; g.globalAlpha = 0.7; g.fillRect(bx + 2, -40, 4, 80); g.globalAlpha = 0.95; g.fillStyle = listra; g.fillRect(bx + 8.5, -40, 3.5, 80); g.restore();
    retArred(g, bx, -33, bw, 66, 6); g.strokeStyle = pf.contorno; g.lineWidth = lw * 0.9; g.stroke();
    return (antebracos[k] = { c: c, ox: lado > 0 ? ox : w - ox, oy: oy, w: w, h: h });
  }

  // braço (ombro -> cotovelo) com deltoide e bíceps grandes; origem no ombro
  var bracos = {};
  function braco(cor, lado) {
    var k = cor + "|" + lado;
    if (bracos[k]) return bracos[k];
    var p = pele(cor), ox = 40, oy = 90, w = 214, h = 158;
    var c = criarCanvas(w * SS, h * SS), g = c.getContext("2d");
    g.scale(SS, SS); g.translate(lado > 0 ? ox : w - ox, oy); g.scale(lado, 1);
    var lw = 2.5;
    function forma() {
      g.beginPath();
      g.moveTo(-32, -6);
      g.bezierCurveTo(-36, -44, -6, -60, 26, -58);
      g.bezierCurveTo(54, -56, 70, -84, 108, -76);
      g.bezierCurveTo(136, -70, 152, -52, 170, -42);
      g.lineTo(170, 42);
      g.bezierCurveTo(142, 52, 104, 68, 66, 62);
      g.bezierCurveTo(30, 56, -26, 50, -32, -6);
      g.closePath();
    }
    cel(g, forma, p, -6 * lado, -9, lw);
    g.save(); forma(); g.clip();
    // deltoide (cabeça do ombro)
    g.beginPath(); g.arc(-4, -8, 36, 0, PI2); g.fillStyle = p.luz; g.globalAlpha = 0.28; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.arc(-4, -8, 36, -0.5, 1.1); linha(g, p, 0.65, 2);
    // bíceps: pico com luz e contorno inferior
    g.beginPath(); g.ellipse(88, -46, 42, 28, -0.2, 0, PI2); g.fillStyle = p.luz; g.globalAlpha = 0.42; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(46, -34); g.bezierCurveTo(70, -14, 112, -14, 140, -34); linha(g, p, 0.75, 2.2);
    g.fillStyle = "#fff"; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(80, -64, 21, 6.5, -0.2, 0, PI2); g.fill(); g.globalAlpha = 1;
    // tríceps e veia
    g.beginPath(); g.moveTo(40, 34); g.bezierCurveTo(78, 46, 112, 40, 146, 24); linha(g, p, 0.65, 2);
    g.beginPath(); g.moveTo(66, 4); g.bezierCurveTo(88, -2, 112, 2, 136, -4); linha(g, p, 0.35, 1.6);
    g.strokeStyle = p.rim; g.lineWidth = 2.2; g.lineCap = "round"; g.globalAlpha = 0.95;
    g.beginPath(); g.moveTo(10, 50); g.bezierCurveTo(50, 62, 100, 62, 160, 44); g.stroke(); g.globalAlpha = 1;
    g.restore();
    forma(); g.strokeStyle = p.contorno; g.lineWidth = lw; g.lineJoin = "round"; g.stroke();
    return (bracos[k] = { c: c, ox: lado > 0 ? ox : w - ox, oy: oy, w: w, h: h });
  }

  // ---------- mãos entrelaçadas (1 sprite por par de cores) ----------
  var maosC = {};
  function maos(c1, c2) {
    var k = c1 + "|" + c2;
    if (maosC[k]) return maosC[k];
    var pa = pele(c1), pb = pele(c2), w = 230, h = 180, ox = 115, oy = 114;
    var c = criarCanvas(w * SSM, h * SSM), g = c.getContext("2d");
    g.scale(SSM, SSM); g.translate(ox, oy);
    var lw = 2.5;
    function sombraSob(trace, dx, dy) { g.save(); g.translate(dx, dy); trace(); g.fillStyle = "rgba(24,12,60,0.34)"; g.fill(); g.restore(); }
    function peca(trace, p, dx, dy, brilho) {
      cel(g, trace, p, dx, dy, lw);
      if (brilho) { g.save(); trace(); g.clip(); brilho(p); g.restore(); }
    }
    // dorso de cada mão: afunila no pulso e alarga nos nós dos dedos
    function bloco(lado) {
      return function() {
        var s = lado;
        g.beginPath();
        g.moveTo(s * -76, -2);
        g.bezierCurveTo(s * -52, -6, s * -34, -34, s * -6, -36);
        g.bezierCurveTo(s * 18, -37, s * 28, -18, s * 28, 4);
        g.bezierCurveTo(s * 28, 30, s * 24, 52, s * 2, 52);
        g.bezierCurveTo(s * -26, 52, s * -52, 38, s * -76, 30);
        g.closePath();
      };
    }
    function luzBloco(sx, lado) {
      return function(p) {
        g.fillStyle = p.luz; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(sx, -20, 20, 6.5, 0, 0, PI2); g.fill();
        g.fillStyle = "#fff"; g.globalAlpha = 0.65; g.beginPath(); g.ellipse(sx - 4 * lado, -23, 8, 2.6, 0, 0, PI2); g.fill(); g.globalAlpha = 1;
        // tendões no dorso e nós dos dedos
        g.beginPath(); g.moveTo(sx - 26 * lado, -4); g.lineTo(sx + 6 * lado, -8); linha(g, p, 0.35, 1.6);
        g.beginPath(); g.moveTo(sx - 26 * lado, 8); g.lineTo(sx + 6 * lado, 6); linha(g, p, 0.35, 1.6);
      };
    }
    // polegar: cápsula grossa, nó e unha
    function polegar(x1, y1, x2, y2, p) {
      function t() { capsula(g, x1, y1, x2, y2, 25); }
      sombraSob(t, 2, 3);
      peca(t, p, -3, -4, function(pp) {
        var a = Math.atan2(y2 - y1, x2 - x1), mx = x1 + (x2 - x1) * 0.42, my = y1 + (y2 - y1) * 0.42;
        g.save(); g.translate(x2 - Math.cos(a) * 8, y2 - Math.sin(a) * 8); g.rotate(a);
        g.fillStyle = pp.brilho; g.globalAlpha = 0.95; g.beginPath(); g.ellipse(0, 0, 7.5, 6.5, 0, 0, PI2); g.fill(); g.restore(); g.globalAlpha = 1;
        g.save(); g.translate(mx, my); g.rotate(a); g.beginPath(); g.moveTo(0, -9); g.quadraticCurveTo(3, 0, 0, 9); linha(g, pp, 0.5, 1.7); g.restore();
        g.fillStyle = "#fff"; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(x1 + (x2 - x1) * 0.3 - 3, y1 + (y2 - y1) * 0.3 - 4, 8, 2.8, a, 0, PI2); g.fill(); g.globalAlpha = 1;
      });
    }
    // dedo: cápsula com 2 juntas e brilho
    function dedo(x1, y, x2, p, wd) {
      function t() { capsula(g, x1, y, x2, y, wd); }
      sombraSob(t, 1.5, 3.2);
      peca(t, p, -2, -3.4, function(pp) {
        var m = (x1 + x2) / 2, d = Math.abs(x2 - x1);
        g.fillStyle = "#fff"; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(m, y - 5.5, d * 0.28, 2.4, 0, 0, PI2); g.fill(); g.globalAlpha = 1;
        var j1 = x1 + (x2 - x1) * 0.38, j2 = x1 + (x2 - x1) * 0.72;
        g.beginPath(); g.moveTo(j1, y - 7); g.lineTo(j1, y + 7); linha(g, pp, 0.5, 1.5);
        g.beginPath(); g.moveTo(j2, y - 6); g.lineTo(j2, y + 6); linha(g, pp, 0.5, 1.5);
      });
    }
    // ordem: mão B (trás) -> polegar B -> mão A -> dedos de A sobre B -> dedos de B sobre A -> polegar A (por cima)
    peca(bloco(-1), pb, -4, -5, luzBloco(46, -1));
    polegar(34, -24, 16, -58, pb);
    peca(bloco(1), pa, -4, -5, luzBloco(-46, 1));
    dedo(-10, -23, 46, pa, 24);
    dedo(-10, -1, 50, pa, 24);
    dedo(10, 21, -46, pb, 21);
    dedo(10, 40, -42, pb, 18);
    polegar(-34, -24, -14, -60, pa);
    return (maosC[k] = { c: c, ox: ox, oy: oy, w: w, h: h });
  }

  // mãos já giradas e na escala final (HS), em NR ângulos: por quadro é 1 drawImage 1:1 (girar em tempo real é caro)
  var NR = 15, RMIN = -0.5, RMAX = 0.5, maosRot = {};
  function maoRot(c1, c2, th) {
    var k = c1 + "|" + c2, arr = maosRot[k] || (maosRot[k] = []);
    var i = clamp(Math.round((th - RMIN) / (RMAX - RMIN) * (NR - 1)), 0, NR - 1);
    if (arr[i]) return arr[i];
    var m = maos(c1, c2), ang = RMIN + i * (RMAX - RMIN) / (NR - 1), ca = Math.cos(ang), sa = Math.sin(ang);
    // limites do retângulo girado em torno do centro (m.ox, m.oy)
    var xs = [-m.ox, m.w - m.ox], ys = [-m.oy, m.h - m.oy], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) {
      var px = (xs[a] * ca - ys[b] * sa) * HS, py = (xs[a] * sa + ys[b] * ca) * HS;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1;
    var c = criarCanvas(Math.ceil(x1 - x0) + 2, Math.ceil(y1 - y0) + 2), g = c.getContext("2d");
    g.translate(-x0, -y0); g.rotate(ang); g.scale(HS, HS);
    g.drawImage(m.c, -m.ox, -m.oy, m.w, m.h);
    return (arr[i] = { c: c, ox: -x0, oy: -y0 });
  }

  // coroa dourada do vencedor
  var coroaS = null;
  function coroa() {
    if (coroaS) return coroaS;
    var c = criarCanvas(100 * SS, 76 * SS), g = c.getContext("2d");
    g.scale(SS, SS); g.translate(50, 40);
    function forma() {
      g.beginPath(); g.moveTo(-34, 24); g.lineTo(-40, -22); g.lineTo(-18, -4); g.lineTo(0, -32); g.lineTo(18, -4); g.lineTo(40, -22); g.lineTo(34, 24); g.closePath();
    }
    cel(g, forma, { sombra: "#e0961b", base: "#ffd23f", contorno: "#7a4a0c" }, -5, -4, 2.4);
    g.fillStyle = "#fff3a6"; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(-18, 8, 6, 2.4, -0.4, 0, PI2); g.fill(); g.globalAlpha = 1;
    [[-40, -22], [0, -32], [40, -22]].forEach(function(q) { g.beginPath(); g.arc(q[0], q[1], 5, 0, PI2); g.fillStyle = "#ff5d73"; g.fill(); g.strokeStyle = "#7a4a0c"; g.lineWidth = 2; g.stroke(); });
    g.fillStyle = "#e0961b"; g.fillRect(-34, 16, 68, 8);
    forma(); g.strokeStyle = "#7a4a0c"; g.lineWidth = 2.4; g.stroke();
    return (coroaS = c);
  }

  // ---------- arena (pré-renderizada) ----------
  var fundoC = {};
  function criarFundo(W, H, c1, c2) {
    var dy = Math.round((H - 720) / 2), cv = criarCanvas(W, H), g = cv.getContext("2d");
    var p1 = pal(c1), p2 = pal(c2), i, r = semente(11);
    // parede
    var gr = g.createLinearGradient(0, 0, 0, dy + 500);
    gr.addColorStop(0, "#100e2b"); gr.addColorStop(0.6, "#25205a"); gr.addColorStop(1, "#322c6e");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.translate(0, dy);
    // chão
    var gf = g.createLinearGradient(0, 490, 0, 720 + dy);
    gf.addColorStop(0, "#3a3278"); gf.addColorStop(1, "#1b1744");
    g.fillStyle = gf; g.fillRect(0, 490, W, 240 + dy);
    g.strokeStyle = "rgba(255,255,255,0.05)"; g.lineWidth = 2;                   // linhas do piso em perspectiva
    for (i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(640 + i * 60, 492); g.lineTo(640 + i * 230, 720 + dy); g.stroke(); }
    // painéis da parede (listras suaves)
    g.fillStyle = "rgba(255,255,255,0.025)";
    for (i = 0; i < 9; i++) g.fillRect(i * 160 + 20, -dy, 70, 520 + dy);
    // faixas de cor dos dois lados (bandeiras penduradas)
    function bandeira(x, p) {
      g.beginPath(); g.moveTo(x - 38, -dy); g.lineTo(x + 38, -dy); g.lineTo(x + 38, 250); g.lineTo(x, 218); g.lineTo(x - 38, 250); g.closePath();
      g.fillStyle = p.fundo; g.fill(); g.strokeStyle = TINTA; g.lineWidth = 2.5; g.lineJoin = "round"; g.stroke();
      g.fillStyle = p.base; g.globalAlpha = 0.9; g.fillRect(x - 38, 60, 76, 12); g.fillRect(x - 38, 82, 76, 5); g.globalAlpha = 1;
      g.beginPath(); for (var j = 0; j < 10; j++) { var a = -PI / 2 + j * PI / 5, rr = j % 2 ? 7 : 17; g.lineTo(x + Math.cos(a) * rr, 150 + Math.sin(a) * rr); } g.closePath();
      g.fillStyle = p.luz; g.fill();
    }
    bandeira(96, p1); bandeira(1184, p2);
    // refletores e cones de luz
    var lamps = [190, 420, 640, 860, 1090];
    for (i = 0; i < lamps.length; i++) {
      var lx = lamps[i], alvo = 640 + (lx - 640) * 0.3;
      g.beginPath(); g.moveTo(lx - 12, 6 - dy); g.lineTo(lx + 12, 6 - dy); g.lineTo(alvo + 150, 580); g.lineTo(alvo - 150, 580); g.closePath();
      g.fillStyle = "rgba(255,240,205,0.045)"; g.fill();
      g.beginPath(); g.moveTo(lx - 6, 6 - dy); g.lineTo(lx + 6, 6 - dy); g.lineTo(alvo + 70, 580); g.lineTo(alvo - 70, 580); g.closePath();
      g.fillStyle = "rgba(255,240,205,0.04)"; g.fill();
    }
    g.fillStyle = "#0e0c28"; g.fillRect(0, -dy, W, 12);                             // barra do teto (no topo da tela)
    g.fillStyle = "#1e1a4d"; g.fillRect(0, 6 - dy + 6, W, 3);
    for (i = 0; i < lamps.length; i++) {
      retArred(g, lamps[i] - 20, 4 - dy, 40, 16, 5); g.fillStyle = "#171440"; g.fill(); g.strokeStyle = "#08061c"; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.ellipse(lamps[i], 21 - dy, 14, 4, 0, 0, PI2); g.fillStyle = "#fff0c0"; g.fill();
    }
    // plateia: 3 fileiras de silhuetas (mais ao fundo = mais clara e menor)
    function fileira(y, rad, passo, cor, cor2, seed, bracos) {
      var rr = semente(seed), x = -10 + rr() * 10;
      while (x < W + 20) {
        var hy = y + (rr() - 0.5) * 8, hr = rad * (0.9 + rr() * 0.2);
        g.fillStyle = cor;
        g.beginPath(); g.ellipse(x, hy + hr * 2.1, hr * 1.5, hr * 1.5, 0, PI, PI2); g.fill();               // ombros
        g.beginPath(); g.arc(x, hy, hr, 0, PI2); g.fill();                                                       // cabeça
        g.fillStyle = cor2; g.globalAlpha = 0.5; g.beginPath(); g.arc(x - hr * 0.25, hy - hr * 0.3, hr * 0.55, PI * 0.9, PI * 1.7); g.lineTo(x - hr * 0.25, hy - hr * 0.3); g.fill(); g.globalAlpha = 1;
        if (bracos && rr() < 0.22) {
          var lado = rr() < 0.5 ? -1 : 1, ax = x + lado * hr * 1.2, ay = hy + hr * 1.4, bx = ax + lado * hr * 0.5, by = hy - hr * 2.1;
          g.strokeStyle = cor; g.lineWidth = hr * 0.8; g.lineCap = "round"; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          if (rr() < 0.55) { g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + lado * hr * 2.2, by + hr * 0.5); g.lineTo(bx, by + hr * 1.3); g.closePath(); g.fillStyle = rr() < 0.5 ? p1.fundo : p2.fundo; g.fill(); }
        }
        x += passo * (0.85 + rr() * 0.3);
      }
    }
    fileira(370, 11, 27, "#2f2a69", "#4a4590", 3, true);
    fileira(402, 15, 36, "#231f57", "#38337c", 7, true);
    // mureta com neon dos dois times
    g.fillStyle = "#16133a"; g.fillRect(0, 434, W, 24);
    g.fillStyle = "#0d0b26"; g.fillRect(0, 454, W, 4);
    function neon(x0, x1, p) { g.fillStyle = p.base; g.fillRect(x0, 440, x1 - x0, 5); g.fillStyle = p.luz; g.globalAlpha = 0.8; g.fillRect(x0, 440, x1 - x0, 2); g.globalAlpha = 1; }
    neon(0, 640, p1); neon(640, W, p2);
    // holofote no chão e sombra da mesa
    g.fillStyle = "rgba(255,238,205,0.06)"; g.beginPath(); g.ellipse(640, 625, 560, 80, 0, 0, PI2); g.fill();
    g.fillStyle = "rgba(255,238,205,0.06)"; g.beginPath(); g.ellipse(640, 625, 380, 50, 0, 0, PI2); g.fill();
    g.fillStyle = "rgba(10,6,30,0.45)"; g.beginPath(); g.ellipse(640, 676, 520, 30, 0, 0, PI2); g.fill();
    // mesa: pernas, frente, tampo
    g.fillStyle = "#17143f"; g.fillRect(214, 600, 40, 78); g.fillRect(1026, 600, 40, 78);
    g.strokeStyle = TINTA; g.lineWidth = 2.5; g.strokeRect(214, 600, 40, 78); g.strokeRect(1026, 600, 40, 78);
    g.beginPath(); g.moveTo(150, MESA_FRENTE); g.lineTo(1130, MESA_FRENTE); g.lineTo(1112, 666); g.lineTo(168, 666); g.closePath();
    g.fillStyle = "#2d2a72"; g.fill(); g.strokeStyle = TINTA; g.lineJoin = "round"; g.stroke();
    g.fillStyle = "#24215e"; g.fillRect(170, 650, 940, 15);
    g.fillStyle = "#5b58b8"; g.fillRect(152, MESA_FRENTE + 1, 976, 3);
    function neonMesa(x0, x1, p) { retArred(g, x0, 628, x1 - x0, 7, 3.5); g.fillStyle = p.base; g.fill(); g.fillStyle = p.luz; g.globalAlpha = 0.7; g.fillRect(x0 + 4, 629, x1 - x0 - 8, 2); g.globalAlpha = 1; }
    neonMesa(200, 626, p1); neonMesa(654, 1080, p2);
    g.beginPath(); g.moveTo(205, MESA_FUNDO); g.lineTo(1075, MESA_FUNDO); g.lineTo(1130, MESA_FRENTE); g.lineTo(150, MESA_FRENTE); g.closePath();
    g.fillStyle = "#5855b0"; g.fill();
    g.save(); g.clip();
    g.fillStyle = "#4a47a0"; g.fillRect(100, MESA_FUNDO, 1100, 18);                                           // faixa de trás (sombra)
    g.fillStyle = "#6663c4"; g.beginPath(); g.moveTo(236, 478); g.lineTo(1044, 478); g.lineTo(1096, 600); g.lineTo(184, 600); g.closePath(); g.fill();   // feltro
    g.strokeStyle = "rgba(255,255,255,0.10)"; g.lineWidth = 2.5; g.beginPath(); g.ellipse(640, 540, 96, 30, 0, 0, PI2); g.stroke();   // marca central
    g.fillStyle = "rgba(255,255,255,0.05)"; g.beginPath(); g.moveTo(236, 478); g.lineTo(420, 478); g.lineTo(380, 600); g.lineTo(184, 600); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(860, 478); g.lineTo(1044, 478); g.lineTo(1096, 600); g.lineTo(900, 600); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 3; g.beginPath(); g.moveTo(640, 482); g.lineTo(640, 598); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.16)"; g.beginPath(); g.ellipse(640, 540, 16, 5, 0, 0, PI2); g.fill();
    g.restore();
    g.beginPath(); g.moveTo(205, MESA_FUNDO); g.lineTo(1075, MESA_FUNDO); g.lineTo(1130, MESA_FRENTE); g.lineTo(150, MESA_FRENTE); g.closePath();
    g.strokeStyle = TINTA; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = "#9d9bef"; g.lineWidth = 3; g.beginPath(); g.moveTo(151, MESA_FRENTE - 1.5); g.lineTo(1129, MESA_FRENTE - 1.5); g.stroke();
    ArteBolinha.sombra(g, CX1, MESA_FUNDO + 6, BOLA_R * 0.95, 0); ArteBolinha.sombra(g, CX2, MESA_FUNDO + 6, BOLA_R * 0.95, 0);   // sombra das bolinhas na mesa
    // almofadas dos cotovelos (cor de cada jogador)
    function almofada(x, p) {
      g.fillStyle = "rgba(10,6,30,0.35)"; g.beginPath(); g.ellipse(x + 3, 562, 70, 15, 0, 0, PI2); g.fill();
      g.beginPath(); g.ellipse(x, 558, 66, 14, 0, 0, PI2); g.fillStyle = p.sombra; g.fill();
      g.save(); g.clip(); g.beginPath(); g.ellipse(x - 3, 555, 62, 12, 0, 0, PI2); g.fillStyle = p.base; g.fill(); g.restore();
      g.fillStyle = "#fff"; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(x - 22, 552, 20, 3, 0, 0, PI2); g.fill(); g.globalAlpha = 1;
      g.beginPath(); g.ellipse(x, 558, 66, 14, 0, 0, PI2); g.strokeStyle = p.contorno; g.lineWidth = 2.4; g.stroke();
    }
    almofada(ELB1, p1); almofada(ELB2, p2);
    return cv;
  }
  function fundo(W, H, c1, c2) {
    var k = W + "|" + H + "|" + c1 + "|" + c2;
    if (fundoC.k !== k) { fundoC.k = k; fundoC.c = criarFundo(W, H, c1, c2); }
    return fundoC.c;
  }

  // ---------- estado das animações (pulsos de toque) ----------
  var ult1 = -1, ult2 = -1, tp1 = -9, tp2 = -9, tAnt = 0, posVis = null;
  function agora() { return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000; }

  // faixa com contraste para cada bolinha
  var FAIXAS = ["#ffffff", "#ffd43b", "#2c2680", "#ff4d4d"];
  function escolherFaixa(cor, evitar) {
    var l = lumin(cor), melhor = null, mv = -1, ci = hexRgb(cor);
    for (var i = 0; i < FAIXAS.length; i++) {
      var f = FAIXAS[i]; if (f === evitar) continue;
      var cf = hexRgb(f), d = Math.abs(cf[0] - ci[0]) + Math.abs(cf[1] - ci[1]) + Math.abs(cf[2] - ci[2]);
      if (d > mv) { mv = d; melhor = f; }
    }
    return melhor;
  }

  // descritores reaproveitados (sem alocar por quadro)
  var D1 = {}, D2 = {}, DI1 = {}, DI2 = {};
  function copiar(d, s) { for (var k in s) d[k] = s[k]; return d; }

  // ---------- barra de força (2 sprites com a moldura; por quadro só recorta e cola) ----------
  var BW = 700, BH = 34, BX = 290, barras = {}, divS = null;
  function barraSpr(cor) {
    if (barras[cor]) return barras[cor];
    var p = pal(cor), c = criarCanvas(BW + 8, BH + 8), g = c.getContext("2d");
    g.translate(4, 4);
    retArred(g, -4, -4, BW + 8, BH + 8, 21); g.fillStyle = "#0d0b29"; g.fill(); g.strokeStyle = "#04030f"; g.lineWidth = 2.5; g.stroke();
    g.save(); retArred(g, 0, 0, BW, BH, 17); g.clip();
    g.fillStyle = p.base; g.fillRect(0, 0, BW, BH);
    g.fillStyle = p.sombra; g.fillRect(0, BH * 0.66, BW, BH * 0.34);
    g.fillStyle = p.luz; g.globalAlpha = 0.6; g.fillRect(0, 3, BW, 5); g.globalAlpha = 1;
    g.restore();
    retArred(g, 0, 0, BW, BH, 17); g.strokeStyle = "#04030f"; g.lineWidth = 2; g.stroke();
    return (barras[cor] = c);
  }
  function divisor() {
    if (divS) return divS;
    var c = criarCanvas(14, 50), g = c.getContext("2d");
    retArred(g, 3, 2, 8, 46, 4); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = TINTA; g.lineWidth = 2; g.stroke();
    return (divS = c);
  }
  function barra(ctx, q, c1, c2, f1, pul1, pul2, y0, tt, venc) {
    var L = barraSpr(c1), R = barraSpr(c2), xr = clamp(Math.round(BW * f1) + 4, 4, BW + 4), yy = Math.round(y0) - 4;
    ctx.drawImage(L, 0, 0, xr, BH + 8, BX - 4, yy, xr, BH + 8);
    ctx.drawImage(R, xr, 0, BW + 8 - xr, BH + 8, BX - 4 + xr, yy, BW + 8 - xr, BH + 8);
    var pul = Math.max(pul1, pul2);
    if (pul > 0.05) ctx.drawImage(divisor(), BX - 4 + xr - 7 - pul * 2, yy - 1 - pul * 2, 14 + pul * 4, 50 + pul * 4);
    else ctx.drawImage(divisor(), BX - 4 + xr - 7, yy - 1);
    // nomes
    var t1 = texto(q.nome1 || "", "#fff", "#1a1550", 19), t2 = texto(q.nome2 || "", "#fff", "#1a1550", 19);
    poeTexto(ctx, t1, BX + 16 + t1.w / 2, y0 + BH / 2 + 1);
    poeTexto(ctx, t2, BX + BW - 16 - t2.w / 2, y0 + BH / 2 + 1);
    // carinhas nas pontas
    var s1 = DI1, s2 = DI2;
    s1.cor = c1; s2.cor = c2; s1.r = s2.r = 25; s1.cache = s2.cache = true;
    s1.x = BX - 38; s2.x = BX + BW + 38; s1.y = s2.y = Math.round(y0 + BH / 2);
    s1.olharX = 0.7; s2.olharX = -0.7; s1.olharY = s2.olharY = 0; s1.vira = 0.4; s2.vira = -0.4;
    s1.escalaX = s1.escalaY = 1 + 0.16 * pul1; s2.escalaX = s2.escalaY = 1 + 0.16 * pul2;
    s1.t = s2.t = tt; s1.piscar = s2.piscar = 0;
    s1.expressao = venc ? (venc === 1 ? "feliz" : "dor") : (f1 > 0.6 ? "smirk" : f1 < 0.4 ? "medo" : "bravo");
    s2.expressao = venc ? (venc === 2 ? "feliz" : "dor") : (f1 < 0.4 ? "smirk" : f1 > 0.6 ? "medo" : "bravo");
    ArteBolinha.desenhar(ctx, s1); ArteBolinha.desenhar(ctx, s2);
  }

  // ---------- desenhar ----------
  function desenhar(ctx, q, largura, altura) {
    var W = largura || 1280, H = altura || 720;
    var dy = Math.max(0, Math.round((H - 720) / 2));
    var c1 = q.b1.cor || "#ff5d73", c2 = q.b2.cor || "#4dabf7";
    var posAlvo = clamp(q.pos || 0, -1, 1), t = q.t || 0, venc = q.vencedor | 0;
    if (posVis === null || Math.abs(posAlvo - posVis) > 0.3) posVis = posAlvo; else posVis += (posAlvo - posVis) * 0.35;   // os braços deslizam em vez de pular a cada toque
    var pos = posVis;
    var tr = agora();
    // pulsos de toque (relógio próprio: o t do motor reinicia na vitória)
    if (q.toques1 < ult1 || q.toques2 < ult2) { ult1 = -1; ult2 = -1; }
    if (q.toques1 !== ult1) { if (ult1 >= 0 || q.toques1 > 0) tp1 = tr; ult1 = q.toques1; }
    if (q.toques2 !== ult2) { if (ult2 >= 0 || q.toques2 > 0) tp2 = tr; ult2 = q.toques2; }
    var pul1 = clamp(1 - (tr - tp1) / 0.22, 0, 1), pul2 = clamp(1 - (tr - tp2) / 0.22, 0, 1);
    pul1 *= pul1; pul2 *= pul2;

    ctx.save();
    ctx.drawImage(fundo(W, H, c1, c2), 0, 0, W, H);
    ctx.translate((W - 1280) / 2, dy);

    // ----- pose -----
    var lose1 = pos > 0 ? pos : 0, lose2 = pos < 0 ? -pos : 0, a = Math.abs(pos);
    var esf1 = venc ? 0 : 0.5 + 1.1 * lose1 + 0.8 * pul1, esf2 = venc ? 0 : 0.5 + 1.1 * lose2 + 0.8 * pul2;
    var vt = venc ? 0 : t;
    var sh1x = Math.sin(vt * 57) * esf1 * 2.6, sh1y = Math.cos(vt * 49) * esf1 * 1.2;
    var sh2x = Math.sin(vt * 61 + 1.7) * esf2 * 2.6, sh2y = Math.cos(vt * 53 + 0.8) * esf2 * 1.2;
    var salto1 = venc === 1 ? -Math.abs(Math.sin(t * 6.5)) * 22 : 0, salto2 = venc === 2 ? -Math.abs(Math.sin(t * 6.5)) * 22 : 0;
    var x1 = CX1 - 32 * lose1 + 12 * lose2 + sh1x + 5 * pul1, y1 = CY + 10 * lose1 + sh1y + salto1;
    var x2 = CX2 + 32 * lose2 - 12 * lose1 + sh2x - 5 * pul2, y2 = CY + 10 * lose2 + sh2y + salto2;
    var rot1 = 0.09 + 0.07 * lose2 - 0.15 * lose1, rot2 = -(0.09 + 0.07 * lose1 - 0.15 * lose2);
    var cx = MAO_X - 55 * pos + (sh1x + sh2x) * 0.35, cy = MAO_Y + 34 * Math.pow(a, 1.2) + (sh1y + sh2y) * 0.35;
    var th = -0.4 * pos + Math.sin(t * 50) * 0.01 * (esf1 + esf2);
    var cth = Math.cos(th), sth = Math.sin(th), wx = 60 * HS, wy = 14 * HS;
    var w1x = cx + (-wx * cth - wy * sth), w1y = cy + (-wx * sth + wy * cth);
    var w2x = cx + (wx * cth - wy * sth), w2y = cy + (wx * sth + wy * cth);
    var e1x = ELB1 - 40 * lose1 + 40 * lose2, e1y = ELB_Y + 6 * lose1 - 14 * lose2;
    var e2x = ELB2 + 40 * lose2 - 40 * lose1, e2y = ELB_Y + 6 * lose2 - 14 * lose1;
    var ombro1x = x1 + (-0.78 * BOLA_R) * Math.cos(rot1) - (0.42 * BOLA_R) * Math.sin(rot1), ombro1y = y1 + (-0.78 * BOLA_R) * Math.sin(rot1) + (0.42 * BOLA_R) * Math.cos(rot1);
    var ombro2x = x2 + (0.78 * BOLA_R) * Math.cos(rot2) - (0.42 * BOLA_R) * Math.sin(rot2), ombro2y = y2 + (0.78 * BOLA_R) * Math.sin(rot2) + (0.42 * BOLA_R) * Math.cos(rot2);

    // ----- sombras na mesa -----
    ArteBolinha.sombra(ctx, e1x, ELB_Y + 18, 38, (ELB_Y - e1y) * 2);
    ArteBolinha.sombra(ctx, e2x, ELB_Y + 18, 38, (ELB_Y - e2y) * 2);

    // ----- peça de braço: sprite girado/esticado entre dois pontos -----
    function peca(sp, ax, ay, bx, by, L0, flex, lado, esp) {
      var dx = bx - ax, dyy = by - ay, len = Math.sqrt(dx * dx + dyy * dyy) || 1;
      var sx = clamp(len / L0, 0.7, 1.5), sy = esp / Math.sqrt(sx) * (1 + flex);
      var ang = Math.atan2(dyy, dx) - (lado < 0 ? PI : 0);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.scale(sx, sy);
      ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
      ctx.restore();
    }
    // ----- bolinhas (faixa na cabeça, olhar intenso, rostos colados) -----
    var f1c = escolherFaixa(c1, ""), f2c = escolherFaixa(c2, f1c);
    var lado1 = -pos, lado2 = pos;
    var ex1 = venc ? (venc === 1 ? "feliz" : "dor") : (lado1 > 0.28 ? "smirk" : lado1 < -0.12 ? "esforco" : "bravo");
    var ex2 = venc ? (venc === 2 ? "feliz" : "dor") : (lado2 > 0.28 ? "smirk" : lado2 < -0.12 ? "esforco" : "bravo");
    var d1 = D1, d2 = D2;
    d1.cache = d2.cache = true;
    d1.x = x1; d1.y = y1; d1.r = BOLA_R; d1.cor = c1; d1.expressao = ex1; d1.olharX = 1; d1.olharY = 0.12; d1.vira = lose1 > 0.5 ? 0.55 : 0.8; d1.t = t * (1 + esf1 * 0.4);
    d1.faixa = f1c; d1.faixaLado = -1; d1.faixaListra = f1c === "#ffffff" ? c1 : "#fff"; d1.faixaFase = 0; d1.faixaInc = 0.03;
    d1.escalaX = d1.escalaY = 1; d1.piscar = (!venc && (t * 0.37 % 1) > 0.985) ? 1 : 0;
    d2.x = x2; d2.y = y2; d2.r = BOLA_R; d2.cor = c2; d2.expressao = ex2; d2.olharX = -1; d2.olharY = 0.12; d2.vira = lose2 > 0.5 ? -0.55 : -0.8; d2.t = t * (1 + esf2 * 0.4);
    d2.faixa = f2c; d2.faixaLado = 1; d2.faixaListra = f2c === "#ffffff" ? c2 : "#fff"; d2.faixaFase = 2; d2.faixaInc = -0.03;
    d2.escalaX = d2.escalaY = 1; d2.piscar = (!venc && ((t * 0.37 + 0.5) % 1) > 0.985) ? 1 : 0;
    ArteBolinha.desenhar(ctx, d1); ArteBolinha.desenhar(ctx, d2);

    // ----- braços (bíceps na frente das bolinhas) -----
    peca(braco(c1, 1), ombro1x, ombro1y, e1x, e1y, L_BRACO, 0.1 * pul1, 1, 0.76);
    peca(braco(c2, -1), ombro2x, ombro2y, e2x, e2y, L_BRACO, 0.1 * pul2, -1, 0.76);

    // ----- mãos entrelaçadas, depois antebraços por cima (munhequeira cobre o punho) -----
    var mn = maoRot(c1, c2, th);
    ctx.drawImage(mn.c, Math.round(cx - mn.ox + (pul1 - pul2) * 3), Math.round(cy - mn.oy));

    peca(antebraco(c1, 1, f1c, f1c === "#ffffff" ? c1 : "#fff"), e1x, e1y, w1x, w1y, L_ANTE, 0.1 * pul1, 1, 0.68);
    peca(antebraco(c2, -1, f2c, f2c === "#ffffff" ? c2 : "#fff"), e2x, e2y, w2x, w2y, L_ANTE, 0.1 * pul2, -1, 0.68);

    // ----- impacto do toque: traços de força em volta das mãos -----
    var pm = Math.max(pul1, pul2);
    if (pm > 0.2) {
      ctx.globalAlpha = pm;
      var rr = 70 + (1 - pm) * 40;
      ctx.strokeStyle = pul1 > pul2 ? pal(c1).luz : pal(c2).luz; ctx.lineWidth = 2 + 4 * pm; ctx.lineCap = "round";
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var aa = i / 10 * PI2 + 0.3, r0 = rr, r1 = rr + 16 + 16 * pm;
        ctx.moveTo(cx + Math.cos(aa) * r0, cy - 8 + Math.sin(aa) * r0 * 0.8); ctx.lineTo(cx + Math.cos(aa) * r1, cy - 8 + Math.sin(aa) * r1 * 0.8);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    }

    // ----- vencedor: coroa e confete -----
    if (venc) {
      var vx = venc === 1 ? x1 : x2, vy = (venc === 1 ? y1 : y2) - BOLA_R - 34 + Math.sin(t * 5) * 4, cs = 1 + 0.06 * Math.sin(t * 8);
      ctx.save(); ctx.translate(vx, vy); ctx.rotate(venc === 1 ? 0.1 : -0.1); ctx.scale(cs, cs);
      ctx.drawImage(coroa(), -50, -40, 100, 76); ctx.restore();
      var cores = [pal(venc === 1 ? c1 : c2).base, "#ffd43b", "#ffffff", pal(venc === 1 ? c1 : c2).luz];
      for (var ci = 0; ci < 4; ci++) {
        ctx.fillStyle = cores[ci]; ctx.beginPath();
        for (var j = ci; j < 44; j += 4) {
          var hx = (Math.sin(j * 91.7) * 0.5 + 0.5), hy2 = (Math.sin(j * 37.3 + 2) * 0.5 + 0.5), vel = 110 + hy2 * 160;
          var px = hx * 1280 + Math.sin(t * 2 + j) * 24, py = ((t * vel + hy2 * (H + 80)) % (H + 80)) - 40 - dy;
          var rt = t * 4 + j, ca = Math.cos(rt) * 7, sa = Math.sin(rt) * 7, fl = Math.abs(Math.cos(t * 5 + j)) + 0.2;
          ctx.moveTo(px - ca, py - sa * fl); ctx.lineTo(px + ca, py + sa * fl); ctx.lineTo(px + ca + 3, py + sa * fl + 5); ctx.lineTo(px - ca + 3, py - sa * fl + 5); ctx.closePath();
        }
        ctx.fill();
      }
    }

    // ----- barra de força (no topo da tela) e contadores -----
    barra(ctx, q, c1, c2, (1 - pos) / 2, pul1, pul2, 24 - dy, t, venc);
    var n1 = texto(String(q.toques1 | 0), "#ffffff", pal(c1).contorno, 46), n2 = texto(String(q.toques2 | 0), "#ffffff", pal(c2).contorno, 46);
    poeTexto(ctx, n1, 330, 636, pul1 > 0.03 ? 1 + 0.35 * pul1 : 1);
    poeTexto(ctx, n2, 950, 636, pul2 > 0.03 ? 1 + 0.35 * pul2 : 1);
    dica(ctx, q.dica1, 330, 694, c1, pul1);
    dica(ctx, q.dica2, 950, 694, c2, pul2);
    ctx.restore();
  }

  // etiqueta com a dica (pílula escura com borda da cor do jogador), em sprite
  var pilulas = {};
  function dica(ctx, txt, x, y, cor, pul) {
    if (!txt) return;
    var k = txt + "|" + cor, sp = pilulas[k];
    if (!sp) {
      var p = pal(cor), s = texto(txt, "#ffffff", "#150f38", 20), w = Math.ceil(s.w + 22), h = 38;
      var c = criarCanvas(w, h), g = c.getContext("2d");
      retArred(g, 2, 2, w - 4, h - 4, 17); g.fillStyle = "rgba(14,10,44,0.88)"; g.fill(); g.strokeStyle = p.base; g.lineWidth = 2.5; g.stroke();
      g.drawImage(s.c, (w - s.w) / 2, (h - s.h) / 2 - 0.5);
      sp = pilulas[k] = { c: c, w: w, h: h };
    }
    poeTexto(ctx, sp, x, y, pul > 0.03 ? 1 + 0.08 * pul : 1);
  }

  // pré-aquece os caches (opcional): chame com as cores antes da cena para evitar engasgo no 1º quadro
  function preparar(c1, c2, largura, altura) {
    fundo(largura || 1280, altura || 720, c1, c2);
    var f1 = escolherFaixa(c1, ""), f2 = escolherFaixa(c2, f1);
    braco(c1, 1); braco(c2, -1); antebraco(c1, 1, f1, "#fff"); antebraco(c2, -1, f2, "#fff"); maos(c1, c2); coroa();
    for (var i = 0; i < NR; i++) maoRot(c1, c2, RMIN + i * (RMAX - RMIN) / (NR - 1));
    var ex = ['bravo', 'smirk', 'esforco'], dd = { x: -999, y: -999, r: BOLA_R, cache: true, olharY: 0.12, faixaInc: 0.03, t: 0 };
    var cv = criarCanvas(4, 4).getContext('2d');
    for (var e = 0; e < ex.length; e++) for (var v = 0; v < 2; v++) for (var lado = 0; lado < 2; lado++) {   // rostos principais (fora da tela) para não engasgar no 1º uso
      dd.expressao = ex[e]; dd.cor = lado ? c2 : c1; dd.faixa = lado ? f2 : f1; dd.faixaListra = dd.faixa === '#ffffff' ? dd.cor : '#fff'; dd.faixaLado = lado ? 1 : -1; dd.olharX = lado ? -1 : 1; dd.vira = (lado ? -1 : 1) * (v ? 0.55 : 0.8); dd.piscar = 0;
      ArteBolinha.desenhar(cv, dd);
    }
  }

  return { desenhar: desenhar, preparar: preparar };
})();
