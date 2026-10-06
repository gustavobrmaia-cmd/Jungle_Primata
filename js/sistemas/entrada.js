"use strict";

// =========================
// ENTRADA: teclado, toque e controle (gamepad) viram as mesmas AÇÕES, para 2 jogadores.
// O jogo pergunta: entrada.segurando(1, "esquerda"), entrada.apertou(2, "tiro") (vale 1 vez por toque).
// Ações: esquerda, direita, pulo, baixo, tiro.  As teclas são pela posição física (e.code), então o WASD
// funciona igual no teclado francês (ZQSD).
//   Jogador 1: A D andar, W pular, S descer, F / G / Espaço atirar
//   Jogador 2: setas andar/pular/descer, L / K / Enter / 0 do teclado numérico atirar
//   Contra o bot (entrada.solo = true) o jogador 1 usa qualquer um dos dois jeitos.
// Toque: cada jogador tem a sua metade da tela (contra o bot, a tela toda é do jogador 1):
//   na parte de fora fica o analógico (arrastar = andar, puxar para cima = pular, para baixo = descer)
//   e na parte de dentro segurar = atirar.
// Gamepad: o 1º controle é o jogador 1, o 2º é o jogador 2.
// =========================

const TECLAS = {
  1: { esquerda: ["KeyA"], direita: ["KeyD"], pulo: ["KeyW"], baixo: ["KeyS"], tiro: ["KeyF", "KeyG", "Space"] },
  2: { esquerda: ["ArrowLeft"], direita: ["ArrowRight"], pulo: ["ArrowUp"], baixo: ["ArrowDown"],
       tiro: ["KeyL", "KeyK", "Enter", "Numpad0", "NumpadEnter"] }
};
const ACOES = ["esquerda", "direita", "pulo", "baixo", "tiro"];

const entrada = (function() {
  const seg = { 1: {}, 2: {} };            // segurando pelo teclado (por conjunto de teclas)
  const apertos = { 1: new Set(), 2: new Set() };
  const mapa = {};                          // código da tecla -> [conjunto, ação]
  [1, 2].forEach(function(j) {
    ACOES.forEach(function(a) { TECLAS[j][a].forEach(function(c) { mapa[c] = [j, a]; }); });
  });
  let pausaApertada = false;
  let usouToque = false;

  // contra o bot, as teclas do jogador 2 também mandam no jogador 1
  function quem(j) { return api.solo ? 1 : j; }

  // ---- teclado ----
  window.addEventListener("keydown", function(e) {
    if (!api.ativa) return;                 // nos menus as teclas ficam livres
    if (e.code === "Escape" || e.code === "KeyP") { if (!e.repeat) pausaApertada = true; return; }
    const m = mapa[e.code];
    if (!m) return;
    e.preventDefault();
    if (!seg[m[0]][m[1]] && !e.repeat) apertos[quem(m[0])].add(m[1]);
    seg[m[0]][m[1]] = true;
  });
  window.addEventListener("keyup", function(e) {
    const m = mapa[e.code];
    if (m) seg[m[0]][m[1]] = false;
  });
  window.addEventListener("blur", soltarTudo);

  // ---- toque ----
  // dedos: id -> { jogador, tipo: "stick" | "tiro", x0, y0, dx, dy, pulou, escala }
  const dedos = new Map();
  function canvasEl() { return document.getElementById("canvas"); }

  // Divide a tela: contra o bot, esquerda = analógico, direita = tiro.
  // 2 jogadores: [analógico J1 | tiro J1 | tiro J2 | analógico J2]
  function zona(x) {
    if (api.solo) return x < 0.5 ? [1, "stick"] : [1, "tiro"];
    if (x < 0.27) return [1, "stick"];
    if (x < 0.5) return [1, "tiro"];
    if (x < 0.73) return [2, "tiro"];
    return [2, "stick"];
  }

  let ultimoToque = 0;
  function tocou(e) {
    usouToque = true;
    ultimoToque = performance.now();
    if (!api.ativa || e.target !== canvasEl()) return;   // toque em botão (pausa) não vira comando
    const r = canvasEl().getBoundingClientRect();
    for (const t of e.changedTouches) {
      const fx = (t.clientX - r.left) / r.width;
      const fy = (t.clientY - r.top) / r.height;
      const z = zona(fx);
      const d = { jogador: z[0], tipo: z[1], x0: t.clientX, y0: t.clientY, dx: 0, dy: 0, pulou: false,
                  escala: r.width / CONFIG.largura, fx: fx, fy: fy };
      dedos.set(t.identifier, d);
      apertos[d.jogador].add(d.tipo === "tiro" ? "tiro" : "toque");
    }
  }
  function moveu(e) {
    for (const t of e.changedTouches) {
      const d = dedos.get(t.identifier);
      if (!d || d.tipo !== "stick") continue;
      d.dx = (t.clientX - d.x0) / d.escala;
      d.dy = (t.clientY - d.y0) / d.escala;
      // puxou para cima: pula (de novo só depois de voltar um pouco)
      if (d.dy < -55 && !d.pulou) { d.pulou = true; apertos[d.jogador].add("pulo"); }
      if (d.dy > -25) d.pulou = false;
      // o centro do analógico acompanha o dedo se ele for longe demais
      const lim = 90;
      if (Math.abs(d.dx) > lim) { d.x0 += (d.dx - Math.sign(d.dx) * lim) * d.escala; d.dx = Math.sign(d.dx) * lim; }
      if (d.dy > lim) { d.y0 += (d.dy - lim) * d.escala; d.dy = lim; }
      if (d.dy < -lim) { d.y0 += (d.dy + lim) * d.escala; d.dy = -lim; }
    }
  }
  function soltou(e) {
    for (const t of e.changedTouches) dedos.delete(t.identifier);
  }
  window.addEventListener("touchstart", tocou, { passive: true });
  window.addEventListener("touchmove", moveu, { passive: true });
  window.addEventListener("touchend", soltou, { passive: true });
  window.addEventListener("touchcancel", soltou, { passive: true });

  // clique do mouse no canvas (serve para a queda de braço)
  window.addEventListener("mousedown", function(e) {
    if (!api.ativa || e.target !== canvasEl()) return;
    if (performance.now() - ultimoToque < 1000) return;   // clique "fantasma" que o celular gera depois do toque
    apertos[1].add("toque");
  });

  // ---- controle (gamepad) ----
  const padAntes = { 1: {}, 2: {} };
  const pad = { 1: {}, 2: {} };
  let startAntes = false;
  function lerPads() {
    const lista = navigator.getGamepads ? navigator.getGamepads() : [];
    pad[1] = {}; pad[2] = {};
    let n = 0, start = false;
    for (let i = 0; i < lista.length && n < 2; i++) {
      const g = lista[i];
      if (!g || !g.connected) continue;
      n++;
      const b = function(k) { return !!(g.buttons[k] && g.buttons[k].pressed); };
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      const alvo = pad[quem(n)];
      const v = {
        esquerda: ax < -0.35 || b(14), direita: ax > 0.35 || b(15),
        pulo: b(0) || b(12) || ay < -0.75, baixo: ay > 0.6 || b(13),
        tiro: b(2) || b(1) || b(5) || b(7) || b(6) || b(4)
      };
      Object.keys(v).forEach(function(a) { alvo[a] = alvo[a] || v[a]; });
      start = start || b(9);
    }
    if (start && !startAntes && api.ativa) pausaApertada = true;
    startAntes = start;
  }

  function atualizar() {
    lerPads();
    [1, 2].forEach(function(j) {
      ACOES.forEach(function(a) { if (pad[j][a] && !padAntes[j][a] && api.ativa) apertos[j].add(a === "tiro" ? "tiro" : a); });
      padAntes[j] = Object.assign({}, pad[j]);
    });
  }

  function soltarTudo() {
    [1, 2].forEach(function(j) {
      Object.keys(seg[j]).forEach(function(a) { seg[j][a] = false; });
      apertos[j].clear();
    });
    dedos.clear();
    pausaApertada = false;
  }

  function segurando(j, a) {
    if (seg[j][a] || pad[j][a]) return true;
    if (api.solo && j === 1 && seg[2][a]) return true;
    for (const d of dedos.values()) {
      if (d.jogador !== j) continue;
      if (d.tipo === "tiro") { if (a === "tiro") return true; continue; }
      if (a === "esquerda" && d.dx < -16) return true;
      if (a === "direita" && d.dx > 16) return true;
      if (a === "baixo" && d.dy > 55) return true;
      if (a === "pulo" && d.dy < -55) return true;
    }
    return false;
  }

  // Analógicos de toque abertos agora (para desenhar): lista de dedos do tipo "stick"
  function analogicos() {
    const lista = [];
    for (const d of dedos.values()) if (d.tipo === "stick") lista.push(d);
    return lista;
  }

  const api = {
    solo: true,        // contra o bot
    ativa: false,      // true durante a partida (fora dela as teclas não são capturadas)
    atualizar: atualizar,
    soltarTudo: soltarTudo,
    segurando: segurando,
    // apertou(j, "tiro") também aceita "toque" (qualquer toque/clique daquele jogador: queda de braço)
    apertou: function(j, a) {
      if (apertos[j].has(a)) { apertos[j].delete(a); return true; }
      return false;
    },
    pausa: function() { const p = pausaApertada; pausaApertada = false; return p; },
    limparApertos: function() { apertos[1].clear(); apertos[2].clear(); pausaApertada = false; },
    analogicos: analogicos,
    get toque() { return usouToque || ("ontouchstart" in window && navigator.maxTouchPoints > 0); }
  };
  return api;
})();
