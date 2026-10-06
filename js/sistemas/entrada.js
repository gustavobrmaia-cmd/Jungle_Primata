"use strict";

// =========================
// ENTRADA: teclado, toque e controle (gamepad) viram as mesmas AÇÕES.
// O jogo só pergunta: entrada.segurando("esquerda") e entrada.apertou("acao") (vale 1 vez por toque).
// Toque: arrastar no lado esquerdo da tela = andar; tocar no lado direito = ação.
// =========================

const TECLAS = {
  esquerda: ["arrowleft", "a"],
  direita: ["arrowright", "d"],
  cima: ["arrowup", "w"],
  baixo: ["arrowdown", "s"],
  acao: [" ", "enter", "j"],
  pausa: ["escape", "p"]
};

const entrada = (function() {
  const seg = {};          // ação -> está segurando
  const apertos = new Set();
  const mapa = {};
  Object.keys(TECLAS).forEach(function(a) { TECLAS[a].forEach(function(k) { mapa[k] = a; }); });

  // ---- teclado ----
  window.addEventListener("keydown", function(e) {
    const a = mapa[e.key.toLowerCase()];
    if (!a) return;
    e.preventDefault();
    if (!seg[a]) apertos.add(a);
    seg[a] = true;
  });
  window.addEventListener("keyup", function(e) {
    const a = mapa[e.key.toLowerCase()];
    if (a) seg[a] = false;
  });
  window.addEventListener("blur", soltarTudo);

  // ---- toque ----
  const toque = { stick: null, x0: 0, dx: 0 };
  function noCanvas(t) {
    const r = document.getElementById("canvas").getBoundingClientRect();
    return { x: (t.clientX - r.left) / r.width, y: (t.clientY - r.top) / r.height };
  }
  function tocou(e) {
    for (const t of e.changedTouches) {
      const p = noCanvas(t);
      if (p.x < 0.5 && toque.stick === null) { toque.stick = t.identifier; toque.x0 = t.clientX; toque.dx = 0; }
      else if (p.x >= 0.5) { apertos.add("acao"); seg.acaoToque = (seg.acaoToque || 0) + 1; }
    }
  }
  function moveu(e) {
    for (const t of e.changedTouches) if (t.identifier === toque.stick) toque.dx = t.clientX - toque.x0;
  }
  function soltou(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === toque.stick) { toque.stick = null; toque.dx = 0; }
      else if (seg.acaoToque) seg.acaoToque--;
    }
  }
  const canvas = document.getElementById("canvas");
  canvas.addEventListener("touchstart", tocou, { passive: true });
  canvas.addEventListener("touchmove", moveu, { passive: true });
  canvas.addEventListener("touchend", soltou, { passive: true });
  canvas.addEventListener("touchcancel", soltou, { passive: true });

  // ---- controle (gamepad) ----
  let padAntes = {};
  function lerPad() {
    const lista = navigator.getGamepads ? navigator.getGamepads() : [];
    let g = null;
    for (let i = 0; i < lista.length; i++) if (lista[i] && lista[i].connected) { g = lista[i]; break; }
    if (!g) return {};
    const b = function(i) { return !!(g.buttons[i] && g.buttons[i].pressed); };
    const ax = g.axes[0] || 0;
    const ay = g.axes[1] || 0;
    return {
      esquerda: ax < -0.4 || b(14), direita: ax > 0.4 || b(15),
      cima: ay < -0.5 || b(12), baixo: ay > 0.5 || b(13),
      acao: b(0) || b(1), pausa: b(9)
    };
  }

  function atualizar() {
    const pad = lerPad();
    Object.keys(pad).forEach(function(a) { if (pad[a] && !padAntes[a]) apertos.add(a); });
    padAntes = pad;
    entrada.pad = pad;
  }

  function soltarTudo() {
    Object.keys(seg).forEach(function(a) { seg[a] = false; });
    apertos.clear();
    toque.stick = null;
    toque.dx = 0;
  }

  return {
    pad: {},
    atualizar: atualizar,
    soltarTudo: soltarTudo,
    segurando: function(a) {
      if (seg[a] || this.pad[a]) return true;
      if (a === "esquerda") return toque.dx < -18;
      if (a === "direita") return toque.dx > 18;
      if (a === "acao") return (seg.acaoToque || 0) > 0;
      return false;
    },
    apertou: function(a) {
      if (apertos.has(a)) { apertos.delete(a); return true; }
      return false;
    },
    limparApertos: function() { apertos.clear(); }
  };
})();
