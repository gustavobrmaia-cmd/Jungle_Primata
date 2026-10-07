"use strict";

// =========================
// SOM (Web Audio, sem arquivos: leve)
// som("tiro") toca um efeito. O áudio só liga depois da primeira interação (regra dos navegadores),
// fica mudo durante anúncios e respeita o botão de som (save.mudo).
// Explosões usam ruído (um buffer criado uma vez). O mesmo som não repete em menos de 45 ms
// (a minigun não vira uma parede de barulho).
// =========================

const Som = (function() {
  let ctxAudio = null;
  let mestre = null;
  let ruido = null;
  let pausadoPorAnuncio = false;
  const ultimo = {};

  function ligar() {
    if (ctxAudio) { if (ctxAudio.state === "suspended" && !pausadoPorAnuncio) ctxAudio.resume(); return; }
    try {
      ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
      mestre = ctxAudio.createGain();
      mestre.gain.value = 0.55;
      // compressor: muitas explosões juntas não estouram o volume
      const comp = ctxAudio.createDynamicsCompressor();
      mestre.connect(comp).connect(ctxAudio.destination);
      ruido = ctxAudio.createBuffer(1, ctxAudio.sampleRate * 0.6, ctxAudio.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctxAudio = null; }
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

  let afinacao = 1;   // multiplicador de tom do som atual (combo)
  function tom(tipo, f1, f2, dur, vol, atraso) {
    const a = ctxAudio;
    f1 *= afinacao; f2 *= afinacao;
    const t0 = a.currentTime + (atraso || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(mestre);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  // ruído filtrado (explosões, sopro, fogo)
  function chiado(freq, dur, vol, atraso, q) {
    const a = ctxAudio;
    const t0 = a.currentTime + (atraso || 0);
    const s = a.createBufferSource();
    s.buffer = ruido;
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(freq, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.15), t0 + dur);
    f.Q.value = q || 0.8;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(mestre);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  // Efeitos: listas de ["tom", onda, f1, f2, dur, vol, atraso] ou ["ruido", freq, dur, vol, atraso]
  const EFEITOS = {
    clique: [["tom", "square", 660, 660, 0.05, 0.05]],
    tiro: [["tom", "square", 520, 180, 0.07, 0.05], ["ruido", 3000, 0.05, 0.08]],
    tiro_pesado: [["tom", "sawtooth", 220, 60, 0.18, 0.09], ["ruido", 1800, 0.22, 0.25]],
    sopro: [["ruido", 1400, 0.08, 0.05]],
    laser: [["tom", "sawtooth", 1400, 200, 0.18, 0.06]],
    choque: [["tom", "square", 90, 70, 0.15, 0.07], ["ruido", 5000, 0.12, 0.08]],
    golpe: [["tom", "triangle", 300, 90, 0.12, 0.1], ["ruido", 900, 0.1, 0.12]],
    carga: [["tom", "sine", 200, 1200, 0.3, 0.05]],
    explosao: [["ruido", 900, 0.7, 0.55], ["tom", "sine", 90, 30, 0.5, 0.35]],
    explosao_peq: [["ruido", 1400, 0.35, 0.3], ["tom", "sine", 140, 50, 0.25, 0.15]],
    acerto: [["tom", "square", 300, 150, 0.06, 0.06]],
    // acerto do jogador: "plim" que sobe de tom no combo
    acerto_meu: [["tom", "triangle", 880, 1320, 0.07, 0.08], ["tom", "square", 320, 160, 0.05, 0.035]],
    dor: [["tom", "sawtooth", 180, 90, 0.1, 0.06]],
    ko: [["ruido", 1100, 0.55, 0.5], ["tom", "sawtooth", 170, 40, 0.5, 0.14], ["tom", "square", 1046, 1046, 0.12, 0.06, 0.18], ["tom", "square", 1568, 1568, 0.3, 0.06, 0.3]],
    moeda: [["tom", "square", 1318, 1318, 0.04, 0.035], ["tom", "square", 1975, 1975, 0.09, 0.035, 0.04]],
    combo: [["tom", "triangle", 660, 990, 0.12, 0.07]],
    estouro: [["ruido", 2200, 0.4, 0.4], ["tom", "square", 880, 220, 0.3, 0.08], ["tom", "square", 660, 1320, 0.25, 0.06, 0.12]],
    pulo: [["tom", "square", 300, 620, 0.1, 0.035]],
    mola: [["tom", "sine", 200, 900, 0.18, 0.1]],
    quique: [["tom", "sine", 500, 300, 0.06, 0.04]],
    pegar: [["tom", "square", 660, 660, 0.06, 0.05], ["tom", "square", 990, 990, 0.1, 0.05, 0.06]],
    carta: [["tom", "triangle", 523, 523, 0.08, 0.07], ["tom", "triangle", 784, 784, 0.08, 0.07, 0.07], ["tom", "triangle", 1046, 1046, 0.15, 0.07, 0.14]],
    reflexo: [["tom", "sine", 1200, 2400, 0.1, 0.05]],
    alarme: [["tom", "square", 880, 880, 0.08, 0.05], ["tom", "square", 660, 660, 0.08, 0.05, 0.1]],
    trovao: [["ruido", 600, 0.8, 0.5]],
    feixe: [["tom", "sawtooth", 180, 200, 0.14, 0.03]],
    rodada: [["tom", "triangle", 392, 392, 0.12, 0.08], ["tom", "triangle", 523, 523, 0.18, 0.08, 0.13]],
    lute: [["tom", "square", 523, 523, 0.08, 0.07], ["tom", "square", 1046, 1046, 0.25, 0.08, 0.08]],
    apito: [["tom", "square", 1500, 1500, 0.35, 0.06]],
    vitoria_rodada: [["tom", "square", 659, 659, 0.1, 0.06], ["tom", "square", 880, 880, 0.2, 0.06, 0.1]],
    vitoria: [["tom", "square", 523, 523, 0.12, 0.07], ["tom", "square", 659, 659, 0.12, 0.07, 0.12], ["tom", "square", 784, 784, 0.12, 0.07, 0.24], ["tom", "square", 1046, 1046, 0.4, 0.07, 0.36]],
    derrota: [["tom", "triangle", 392, 392, 0.2, 0.08], ["tom", "triangle", 311, 311, 0.2, 0.08, 0.2], ["tom", "triangle", 233, 200, 0.5, 0.08, 0.4]]
  };

  function som(nome, tomMult) {
    if (save.mudo || pausadoPorAnuncio || !ctxAudio || ctxAudio.state !== "running") return;
    const agora = ctxAudio.currentTime;
    if (ultimo[nome] && agora - ultimo[nome] < 0.045) return;
    ultimo[nome] = agora;
    afinacao = tomMult || 1;
    (EFEITOS[nome] || []).forEach(function(e) {
      if (e[0] === "tom") tom(e[1], e[2], e[3], e[4], e[5], e[6]);
      else chiado(e[1], e[2], e[3], e[4]);
    });
    afinacao = 1;
  }

  return { som: som };
})();

function som(nome, tomMult) { Som.som(nome, tomMult); }
