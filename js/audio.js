"use strict";

// =========================
// SOM (Web Audio, sem arquivos: leve)
// som("moeda") toca um efeito. O áudio só liga depois da primeira interação (regra dos navegadores),
// fica mudo durante anúncios e respeita o botão de som (save.mudo).
// =========================

const Som = (function() {
  let ctxAudio = null;
  let pausadoPorAnuncio = false;

  function ligar() {
    if (ctxAudio) { if (ctxAudio.state === "suspended" && !pausadoPorAnuncio) ctxAudio.resume(); return; }
    try { ctxAudio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctxAudio = null; }
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function(ev) {
    window.addEventListener(ev, ligar, { capture: true, passive: true });
  });

  // Anúncio na tela: tudo mudo
  Poki.aoAnuncio(function(aberto) {
    pausadoPorAnuncio = aberto;
    if (!ctxAudio) return;
    if (aberto && ctxAudio.state === "running") ctxAudio.suspend();
    else if (!aberto && ctxAudio.state === "suspended") ctxAudio.resume();
  });

  function tom(tipo, f1, f2, dur, vol, atraso) {
    const a = ctxAudio;
    const t0 = a.currentTime + (atraso || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  // Efeitos: [tipo de onda, freq. inicial, freq. final, duração (s), volume, atraso]
  const EFEITOS = {
    clique: [["square", 660, 660, 0.05, 0.05]],
    moeda: [["square", 990, 990, 0.05, 0.05], ["square", 1320, 1320, 0.1, 0.05, 0.05]],
    pulo: [["square", 300, 700, 0.12, 0.06]],
    dano: [["sawtooth", 220, 60, 0.3, 0.08]],
    fim: [["triangle", 440, 110, 0.6, 0.1]],
    vitoria: [["square", 523, 523, 0.1, 0.06], ["square", 659, 659, 0.1, 0.06, 0.1], ["square", 784, 784, 0.2, 0.06, 0.2]]
  };

  function som(nome) {
    if (save.mudo || pausadoPorAnuncio || !ctxAudio || ctxAudio.state !== "running") return;
    (EFEITOS[nome] || []).forEach(function(e) { tom(e[0], e[1], e[2], e[3], e[4], e[5]); });
  }

  return { som: som };
})();

function som(nome) { Som.som(nome); }
