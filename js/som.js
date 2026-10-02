"use strict";

// =========================
// SONS (gerados na hora, sem arquivos)
// =========================

let audioCtx = null;
let bufferRuido = null;

function iniciarAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const n = audioCtx.sampleRate;
    bufferRuido = audioCtx.createBuffer(1, n, n);
    const d = bufferRuido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) {
    audioCtx = null;
  }
}

function tom(tipo, f1, f2, dur, vol, atraso) {
  const t = audioCtx.currentTime + (atraso || 0);
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f1, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function ruido(dur, vol, freq, atraso) {
  const t = audioCtx.currentTime + (atraso || 0);
  const s = audioCtx.createBufferSource();
  s.buffer = bufferRuido;
  const f = audioCtx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(audioCtx.destination);
  s.start(t);
  s.stop(t + dur + 0.02);
}

const SONS = {
  pulo:      function() { tom("square", 280, 560, 0.12, 0.05); },
  puloDuplo: function() { tom("square", 420, 900, 0.14, 0.05); },
  impulso:   function() { ruido(0.4, 0.2, 900); tom("sawtooth", 120, 600, 0.35, 0.05); },
  moeda:     function() { tom("square", 990, 990, 0.05, 0.04); tom("square", 1320, 1320, 0.1, 0.04, 0.05); },
  tiro:      function() { ruido(0.12, 0.25, 3000); tom("square", 180, 60, 0.08, 0.06); },
  recarga:   function() { tom("square", 300, 300, 0.04, 0.04); tom("square", 450, 450, 0.04, 0.04, 0.1); },
  vazio:     function() { tom("square", 120, 100, 0.05, 0.04); },
  laco:      function() { ruido(0.15, 0.12, 1800); tom("sine", 600, 300, 0.15, 0.04); },
  agarrou:   function() { tom("square", 200, 400, 0.08, 0.05); },
  chute:     function() { ruido(0.2, 0.35, 700); tom("square", 160, 40, 0.2, 0.08); },
  estrela:   function() { tom("sine", 1568, 1568, 0.12, 0.06); tom("sine", 2093, 2093, 0.3, 0.06, 0.1); },
  pisao:     function() { tom("square", 220, 80, 0.12, 0.07); },
  inimigo:   function() { tom("square", 330, 110, 0.15, 0.05); },
  dano:      function() { tom("sawtooth", 320, 90, 0.3, 0.08); },
  morte:     function() { tom("square", 500, 60, 0.9, 0.07); },
  dash:      function() { ruido(0.2, 0.2, 2500); },
  poder:     function() { tom("square", 523, 523, 0.08, 0.05); tom("square", 659, 659, 0.08, 0.05, 0.08); tom("square", 784, 784, 0.15, 0.05, 0.16); },
  nuke:      function() { ruido(1.4, 0.5, 400); tom("sawtooth", 200, 30, 1.2, 0.1); },
  negado:    function() { tom("square", 150, 150, 0.12, 0.05); },
  vento:     function() { ruido(1.2, 0.15, 600); },
  checkpoint:function() { tom("square", 660, 660, 0.08, 0.05); tom("square", 880, 880, 0.15, 0.05, 0.08); },
  pancada:   function() { ruido(0.35, 0.45, 300); tom("sine", 90, 35, 0.4, 0.15); },
  rugido:    function() { ruido(0.9, 0.3, 500); tom("sawtooth", 110, 70, 0.9, 0.08); },
  vitoria:   function() { [523, 659, 784, 1047].forEach(function(f, i) { tom("square", f, f, 0.18, 0.05, i * 0.14); }); },
  compra:    function() { tom("square", 880, 880, 0.06, 0.05); tom("square", 1175, 1175, 0.12, 0.05, 0.06); },
  nham:      function() { ruido(0.12, 0.2, 1200); tom("square", 300, 200, 0.08, 0.04); }
};

let somBloqueado = false;   // anúncio na tela

function som(nome) {
  if (save.mudo || somBloqueado || !audioCtx || !SONS[nome]) return;
  try { SONS[nome](); } catch (e) { /* sem som */ }
}
