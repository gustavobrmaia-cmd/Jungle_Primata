"use strict";

// =========================
// ESTRELAS: até 3 por fase (motivo para jogar de novo)
//   1ª: terminar a fase   2ª: sem perder nenhuma vida   3ª: abaixo da meta de tempo
// Cada estrela nova vale moedas. As estrelas aparecem no mapa e no menu.
// =========================

const ESTRELA_FEITA = 1;
const ESTRELA_SEM_DANO = 2;
const ESTRELA_TEMPO = 4;
const MOEDAS_POR_ESTRELA = 30;
const META_CHEFE = [60, 70, 80, 90];    // segundos para cada chefe

let danoNaTentativa = false;   // perdeu alguma vida desde que começou a fase (checkpoint não zera)
let resultadoFase = null;      // painel com as estrelas no fim da fase

// Meta de tempo da fase atual, em segundos (arredondada para 5)
function metaDaFase() {
  if (fase.ehChefe) return META_CHEFE[fase.mundo];
  return Math.ceil(((fase.fimX - fase.inicioX) / VEL) * 1.35 / 60 / 5) * 5;
}

function contarEstrelas(bits) {
  return (bits & 1) + ((bits >> 1) & 1) + ((bits >> 2) & 1);
}

function totalEstrelas() {
  let n = 0;
  for (let i = 0; i < TOTAL_FASES; i++) n += contarEstrelas(save.estrelas[i] || 0);
  return n;
}

function perdeuVida() {
  danoNaTentativa = true;
}

// Chamado quando a fase termina (depois do cronômetro parar)
function avaliarFase() {
  const i = fase.indice;
  const meta = metaDaFase();
  let bits = ESTRELA_FEITA;
  if (!danoNaTentativa) bits |= ESTRELA_SEM_DANO;
  if (cron.fase <= meta * 60) bits |= ESTRELA_TEMPO;
  const antes = save.estrelas[i] || 0;
  const novas = contarEstrelas(bits & ~antes);
  save.estrelas[i] = antes | bits;
  if (novas) {
    save.moedas += novas * MOEDAS_POR_ESTRELA;
    sujo = true;
  }
  resultadoFase = { bits: bits, antes: antes, novas: novas, tempo: cron.fase, meta: meta,
    recorde: save.recordes.fases[i] || 0 };
}


// ---------- Painel no fim da fase ----------

const SPR_ESTRELA = (function() {
  const def = ICONES_TELA.estrela;
  const c = criarCanvas(def.mapa[0].length, def.mapa.length);
  const g = c.getContext("2d");
  def.mapa.forEach(function(linha, y) {
    for (let x = 0; x < linha.length; x++) {
      const cor = def.cor[linha[x]];
      if (cor) { g.fillStyle = cor; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
})();

function desenharResultadoFase() {
  const r = resultadoFase;
  if (!r || !mensagem) return;
  const m = mensagem;
  const resta = m.duracao - m.t;
  const alfa = Math.min(1, m.t / 12) * (resta < 14 ? suavizar(resta / 14) : 1);
  if (alfa <= 0) return;
  ctx.save();
  ctx.globalAlpha = alfa;
  const w = 560;
  const h = 150;
  const x = LARGURA / 2 - w / 2;
  const y = ALTURA / 2 + 96;
  painelPixel(x, y, w, h, "#ffd43b", "rgba(20,12,6,0.88)");

  const rotulos = [tr("Completa"), tr("Sem perder vida"), tr("Até {0}", formatarCron(r.meta * 60).replace(/\.00$/, ""))];
  ctx.textAlign = "center";
  for (let k = 0; k < 3; k++) {
    const cx = LARGURA / 2 + (k - 1) * 170;
    const tem = (r.bits >> k) & 1;
    const nova = tem && !((r.antes >> k) & 1);
    // cada estrela entra uma depois da outra, com um pulinho
    const t0 = 16 + k * 14;
    const kt = m.t < t0 ? 0 : saltitar(Math.min(1, (m.t - t0) / 14));
    const tam = 40 * (tem ? kt : 1);
    if (tam > 1) {
      if (nova) luzAditiva(cx, y + 42, 46, "255,215,70", 0.45 * alfa);
      ctx.globalAlpha = tem ? alfa : alfa * 0.3;
      ctx.drawImage(tem ? SPR_ESTRELA : silhuetaDe(SPR_ESTRELA, "#6b5a45"), Math.round(cx - tam / 2), Math.round(y + 42 - tam / 2), Math.round(tam), Math.round(tam));
      ctx.globalAlpha = alfa;
    }
    ctx.font = "bold 15px " + FONTE;
    textoSombra(rotulos[k], cx, y + 86, tem ? "#fff3bf" : "#868e96");
    if (nova && m.t > t0 + 8) {
      ctx.font = "bold 13px " + FONTE;
      textoSombra(tr("NOVA!"), cx + 30, y + 22, "#69db7c");
    }
  }

  ctx.font = "bold 17px " + FONTE;
  let linha = tr("Tempo {0}", formatarCron(r.tempo));
  if (r.recorde) linha += "   ·   " + tr("Recorde {0}", formatarCron(r.recorde));
  if (r.novas) linha += "   ·   " + tr("+{0} moedas", r.novas * MOEDAS_POR_ESTRELA);
  textoSombra(linha, LARGURA / 2, y + 124, "#ffffff");
  ctx.restore();
}


// ---------- Menu: total de estrelas ----------

el("menuEstrelaIc").appendChild(iconeTela("estrela", 2));
