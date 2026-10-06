"use strict";

// =========================
// O JOGO
// Por enquanto um jogo de EXEMPLO bem simples (pegar estrelas e desviar dos blocos), só para
// mostrar a estrutura funcionando: começo, Game Events, fim de jogo, recorde e "continuar" com
// anúncio premiado. Ele é substituído pelo jogo de verdade.
// =========================

const jogo = {
  rodando: false,
  pontos: 0,
  vidas: 1,
  reviveu: false,
  t: 0,
  jogador: null,
  coisas: []
};

function novaPartida() {
  jogo.rodando = true;
  jogo.pontos = 0;
  jogo.reviveu = false;
  jogo.t = 0;
  jogo.coisas = [];
  jogo.jogador = { x: LARGURA_JOGO() / 2 - 30, y: ALTURA_JOGO() - 110, w: 60, h: 60, vx: 0 };
  save.partidas++;
  salvar();
  Eventos.nivel("1", "start");
}

function LARGURA_JOGO() { return CONFIG.largura; }
function ALTURA_JOGO() { return alturaTela; }

function atualizarJogo(dt) {
  if (!jogo.rodando) return;
  jogo.t++;
  const j = jogo.jogador;
  const dir = (entrada.segurando("direita") ? 1 : 0) - (entrada.segurando("esquerda") ? 1 : 0);
  j.vx += (dir * 11 - j.vx) * 0.25;
  j.x = limitar(j.x + j.vx, 0, LARGURA_JOGO() - j.w);

  // a cada meio segundo cai uma estrela (boa) ou um bloco (ruim); fica mais rápido com o tempo
  const ritmo = Math.max(14, 34 - Math.floor(jogo.t / 600) * 3);
  if (jogo.t % ritmo === 0) {
    const ruim = Math.random() < 0.45;
    jogo.coisas.push({ x: aleatorio(20, LARGURA_JOGO() - 60), y: -50, w: 40, h: 40, vy: aleatorio(4, 6) + jogo.t / 1800, ruim: ruim });
  }
  for (let i = jogo.coisas.length - 1; i >= 0; i--) {
    const c = jogo.coisas[i];
    c.y += c.vy;
    if (encosta(c, j)) {
      jogo.coisas.splice(i, 1);
      if (c.ruim) { perdeu(); return; }
      jogo.pontos++;
      som("moeda");
      continue;
    }
    if (c.y > ALTURA_JOGO()) jogo.coisas.splice(i, 1);
  }
}

function perdeu() {
  jogo.rodando = false;
  som("fim");
  Eventos.nivel("1", "fail");
  if (jogo.pontos > save.recorde) { save.recorde = jogo.pontos; salvar(); }
  abrirFim();
}

// Anúncio premiado: continua de onde parou (uma vez por partida)
function reviver() {
  jogo.reviveu = true;
  jogo.coisas = [];
  jogo.rodando = true;
  Eventos.nivel("1", "start");
}

function desenharJogo(ctx) {
  const W = LARGURA_JOGO(), H = ALTURA_JOGO();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1b2140");
  g.addColorStop(1, "#3a2a5c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (!jogo.jogador) return;

  jogo.coisas.forEach(function(c) {
    ctx.fillStyle = c.ruim ? "#ff4d5e" : "#ffd43b";
    if (c.ruim) ctx.fillRect(c.x, c.y, c.w, c.h);
    else { ctx.beginPath(); ctx.arc(c.x + 20, c.y + 20, 20, 0, Math.PI * 2); ctx.fill(); }
  });
  const j = jogo.jogador;
  ctx.fillStyle = "#4dabf7";
  ctx.fillRect(j.x, j.y, j.w, j.h);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(t("pontos", jogo.pontos), 24, 56);
  if (jogo.t < 240) {
    ctx.textAlign = "center";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.fillText(entradaPorToque() ? t("dica_toque") : t("dica_teclado"), W / 2, H / 2);
  }
}

function entradaPorToque() { return "ontouchstart" in window || navigator.maxTouchPoints > 0; }
