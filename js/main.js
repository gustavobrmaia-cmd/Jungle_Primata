"use strict";

// =========================
// TECLADO, LOOP PRINCIPAL E INÍCIO
// =========================

const TECLAS_MOVIMENTO = {
  a: "esquerda", arrowleft: "esquerda",
  d: "direita", arrowright: "direita",
  w: "pulo", arrowup: "pulo", " ": "pulo",
  s: "baixo", arrowdown: "baixo"
};

const TECLAS_ACAO = { k: "tiro", j: "laco", shift: "dash", r: "recarregar" };

document.addEventListener("keydown", function(e) {
  iniciarAudio();
  const k = e.key.toLowerCase();
  if (k === " " || k.startsWith("arrow")) e.preventDefault();

  if (estado === "intro") {
    if (intro.t > 30 && !e.repeat) terminarIntro();
    return;
  }
  if (estado === "final") {
    if (final.t > 260 && !e.repeat) voltarAoMenu();
    return;
  }
  if (k === "m" && !e.repeat) {
    save.mudo = !save.mudo;
    salvar();
    atualizarTelas();
    return;
  }
  if (lojaAberta) {
    if ((k === "escape" || k === "l") && !e.repeat) fecharLoja();
    return;
  }
  if (estado === "menu") {
    if (e.repeat) return;
    if (k === "enter") jogar();
    else if (k === "l") abrirLoja();
    else if (k === "escape" && telaAtual === "mapa") { telaAtual = "menu"; atualizarTelas(); }
    return;
  }

  // Dentro da fase
  if ((k === "escape" || k === "p") && !e.repeat) { pausar(!pausado); return; }
  if (k === "l" && !e.repeat) { abrirLoja(); return; }
  if (pausado) return;

  const mov = TECLAS_MOVIMENTO[k];
  if (mov) {
    teclas[mov] = true;
    if (mov === "pulo" && !e.repeat) apertos.add("pulo");
  }
  const acao = TECLAS_ACAO[k];
  if (acao && !e.repeat) apertos.add(acao);
  if (k >= "1" && k <= "5" && k.length === 1 && !e.repeat) usarPoder(PODERES[+k - 1].id);
});

document.addEventListener("keyup", function(e) {
  const mov = TECLAS_MOVIMENTO[e.key.toLowerCase()];
  if (mov) teclas[mov] = false;
});

// Trocar de janela solta as teclas (evita o macaco andar sozinho)
window.addEventListener("blur", function() {
  soltarTeclas();
  if (estado === "jogo" && !pausado && !lojaAberta) pausar(true);
});

window.addEventListener("beforeunload", salvar);


// ---------- Loop: física em passos fixos de 1/60s, desenho a cada quadro ----------

let ultimo = performance.now();
let acumulado = 0;
let contSalvar = 0;

function passo() {
  let mundoClima = 0;
  if (estado === "jogo") mundoClima = fase.mundo;
  else if (estado === "menu") mundoClima = Math.floor(save.desbloqueado / FASES_POR_MUNDO);
  atualizarClima(mundoClima);

  if (estado === "jogo") { if (!pausado) atualizarJogo(); }
  else if (estado === "intro") atualizarIntro();
  else if (estado === "final") atualizarFinal();
  else menuT++;

  if (sujo && ++contSalvar > 120) {
    salvar();
    sujo = false;
    contSalvar = 0;
  }
}

function desenharTudo() {
  if (estado === "jogo") desenharJogo();
  else if (estado === "intro") desenharIntro();
  else if (estado === "final") desenharFinal();
  else desenharMenuFundo();
}

function quadro(agora) {
  let dt = agora - ultimo;
  ultimo = agora;
  if (dt > 100) dt = 100;   // voltou de outra aba: não "pula" o tempo
  acumulado += dt;
  while (acumulado >= PASSO) {
    passo();
    acumulado -= PASSO;
  }
  desenharTudo();
  requestAnimationFrame(quadro);
}


// ---------- Escala o jogo para caber na janela ----------

const jogoEl = document.getElementById("jogo");

function ajustarTela() {
  const escala = Math.min(window.innerWidth / LARGURA, window.innerHeight / ALTURA);
  jogoEl.style.transform = "translate(-50%, -50%) scale(" + escala + ")";
}

window.addEventListener("resize", ajustarTela);
ajustarTela();

atualizarTelas();
requestAnimationFrame(quadro);
