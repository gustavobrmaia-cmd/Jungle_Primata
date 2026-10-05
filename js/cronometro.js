"use strict";

// =========================
// CRONÔMETRO DE SPEEDRUN (opcional: liga na pausa ou na tela de Controles)
// Conta em quadros de 1/60s e só com a fase rodando: pausa, loja e cenas não contam.
// A run começa ao entrar na fase 1-1 e termina quando o Dragão de Magma cai.
// =========================

const cron = {
  fase: 0,             // quadros da tentativa atual da fase (morrer não zera)
  faseRodando: false,
  run: null,           // { t: quadros } enquanto a run está valendo
  split: null,         // resultado da última fase: { t, delta, recorde, vida }
  fim: null            // run terminada: { t, delta, recorde }
};

function doisDigitos(n) {
  return (n < 10 ? "0" : "") + n;
}

// 0:31.82  ·  12:43.59  ·  1:02:03.04
function formatarCron(frames) {
  const cs = Math.round((Math.abs(frames) * 100) / 60);
  const seg = Math.floor(cs / 100);
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return (h ? h + ":" + doisDigitos(m) : m) + ":" + doisDigitos(seg % 60) + "." + doisDigitos(cs % 100);
}

// Diferença para o recorde: -1.20  ·  +0.85  ·  +1:05.10
function formatarDelta(frames) {
  const cs = Math.round((Math.abs(frames) * 100) / 60);
  const txt = cs >= 6000 ? formatarCron(frames) : Math.floor(cs / 100) + "." + doisDigitos(cs % 100);
  return (frames < 0 ? "-" : "+") + txt;
}

function cronInicioFase(indice, doCheckpoint) {
  if (indice === FASE_TUTORIAL) { cron.faseRodando = false; return; }
  if (doCheckpoint) return;   // voltou do checkpoint: o tempo da fase continua
  cron.fase = 0;
  cron.faseRodando = true;
  if (indice === 0) {
    cron.run = { t: 0 };
    cron.fim = null;
  }
}

function cronFimFase() {
  if (!cron.faseRodando) return;
  cron.faseRodando = false;
  const i = fase.indice;
  const t = cron.fase;
  const antes = save.recordes.fases[i] || 0;
  const recorde = !antes || t < antes;
  if (recorde) save.recordes.fases[i] = t;
  cron.split = { t: t, delta: antes ? t - antes : null, recorde: recorde, vida: 300 };
}

function cronFimRun() {
  if (!cron.run) return;
  const t = cron.run.t;
  const antes = save.recordes.run || 0;
  const recorde = !antes || t < antes;
  if (recorde) save.recordes.run = t;
  cron.fim = { t: t, delta: antes ? t - antes : null, recorde: recorde };
  cron.run = null;
  salvar();
}

// Saiu para o menu no meio: a run não vale mais
function cronCancelarRun() {
  cron.run = null;
  cron.faseRodando = false;
  cron.split = null;
}

// Chamado a cada passo de 1/60s com a fase rodando (sem pausa)
function cronPasso() {
  if (cron.split && --cron.split.vida <= 0) cron.split = null;
  if (cron.faseRodando) cron.fase++;
  if (cron.run) cron.run.t++;
}

function textoDoSplit(s) {
  if (s.delta === null) return tr("Primeiro tempo!");
  return s.recorde ? tr("{0}  Recorde!", formatarDelta(s.delta)) : formatarDelta(s.delta);
}

// Painel no canto de cima à direita (embaixo dos botões de pausa e loja)
function desenharCron() {
  if (!save.cronometro || !fase) return;
  const w = 226;
  const x = LARGURA - w - 18;
  let y = 66;
  const rec = save.recordes.fases[fase.indice] || 0;
  const h = cron.run ? 104 : 72;

  painelPixel(x, y, w, h, "#e8cf9a", "rgba(14,8,18,0.82)");
  ctx.textAlign = "left";

  if (cron.run) {
    ctx.font = "bold 14px " + FONTE;
    textoSombra("TOTAL", x + 12, y + 30, "#bac8ff");
    ctx.font = "bold 28px " + FONTE;
    ctx.textAlign = "right";
    textoSombra(formatarCron(cron.run.t), x + w - 12, y + 33, "#ffffff");
    ctx.textAlign = "left";
    y += 34;
  }

  const parada = !cron.faseRodando;
  ctx.font = "bold 14px " + FONTE;
  textoSombra(tr("FASE"), x + 12, y + 28, "#bac8ff");
  ctx.font = "bold 22px " + FONTE;
  ctx.textAlign = "right";
  const corFase = parada && cron.split ? (cron.split.recorde ? "#ffd43b" : "#ff8787") : "#ffffff";
  textoSombra(formatarCron(cron.fase), x + w - 12, y + 30, corFase);

  ctx.font = "bold 13px " + FONTE;
  ctx.textAlign = "left";
  textoSombra(tr("Recorde da fase"), x + 12, y + 54, "#868e96");
  ctx.textAlign = "right";
  textoSombra(rec ? formatarCron(rec) : "--", x + w - 12, y + 54, "#ced4da");

  // Resultado da fase que acabou de terminar
  const s = cron.split;
  if (s) {
    ctx.globalAlpha = Math.min(1, s.vida / 30);
    const sy = 66 + h + 8;
    painelPixel(x, sy, w, 34, s.recorde ? "#ffd43b" : "#ff8787", "rgba(14,8,18,0.82)");
    ctx.font = "bold 18px " + FONTE;
    ctx.textAlign = "center";
    const cor = s.delta === null || s.recorde ? "#ffd43b" : "#ff8787";
    textoSombra(textoDoSplit(s), x + w / 2, sy + 24, cor);
    ctx.globalAlpha = 1;
  }
}

// Linha para o placar da cena final
function linhaCronFinal() {
  if (!save.cronometro || !cron.fim) return null;
  const f = cron.fim;
  let txt = "Speedrun: " + formatarCron(f.t);
  if (f.delta === null) txt += tr("  (primeira run!)");
  else if (f.recorde) txt += tr("  NOVO RECORDE! ({0})", formatarDelta(f.delta));
  else txt += tr("  (recorde: {0})", formatarCron(save.recordes.run));
  return txt;
}
