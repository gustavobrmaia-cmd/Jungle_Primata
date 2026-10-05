"use strict";

// =========================
// TECLADO, LOOP PRINCIPAL E INÍCIO
// =========================

// tecla -> ação (montado a partir de save.teclas, que dá para trocar na tela "Controles")
let mapaTeclas = {};

function reconstruirMapaTeclas() {
  mapaTeclas = {};
  ACOES.forEach(function(a) {
    (save.teclas[a.id] || []).forEach(function(k) { if (k) mapaTeclas[k] = a.id; });
  });
}

// Troca a tecla de uma ação (a mesma tecla sai de qualquer outra ação)
function definirTecla(acao, slot, k) {
  Object.keys(save.teclas).forEach(function(a) {
    save.teclas[a] = save.teclas[a].map(function(x) { return x === k ? "" : x; });
  });
  const lista = save.teclas[acao] || [];
  while (lista.length < 3) lista.push("");
  lista[slot] = k;
  save.teclas[acao] = lista;
  reconstruirMapaTeclas();
  salvar();
}

reconstruirMapaTeclas();

const MOVIMENTO = { esquerda: true, direita: true, baixo: true, pulo: true };
const ACOES_RAPIDAS = { laco: true, dash: true };

document.addEventListener("keydown", function(e) {
  if (anuncios.aberto) { e.preventDefault(); return; }
  iniciarAudio();
  const k = e.key.toLowerCase();

  // Esperando a tecla nova na tela de controles
  if (capturando) {
    e.preventDefault();
    if (k === "escape") capturando = null;
    else if (k === "delete" || k === "backspace") {
      save.teclas[capturando.acao][capturando.slot] = "";
      reconstruirMapaTeclas();
      salvar();
      capturando = null;
    } else {
      definirTecla(capturando.acao, capturando.slot, k);
      capturando = null;
    }
    renderizarControles();
    return;
  }

  if (k === " " || k.startsWith("arrow") || k === "tab") e.preventDefault();
  const acao = mapaTeclas[k];

  if (estado === "intro") {
    if (intro.t > 30 && !e.repeat) terminarIntro();
    return;
  }
  if (estado === "final") {
    if (final.pronto && !e.repeat) trocarCena(voltarAoMenu);
    return;
  }
  if (acao === "som" && !e.repeat) {
    save.mudo = !save.mudo;
    salvar();
    atualizarTelas();
    return;
  }
  if (controlesAbertos) {
    if (k === "escape" && !e.repeat) fecharControles();
    return;
  }
  if (lojaAberta) {
    if ((k === "escape" || acao === "loja") && !e.repeat) fecharLoja();
    return;
  }
  if (estado === "menu" && telaReiAberta) {
    if ((k === "escape" || k === "enter") && !e.repeat) {
      if (k === "enter" && save.rei.tentativas > 0) enfrentarRei();
      else fecharTelaRei();
    }
    return;
  }
  if (estado === "menu") {
    if (e.repeat) return;
    if (k === "enter" && telaAtual === "menu") jogar();
    else if (acao === "loja") abrirLoja();
    else if (k === "escape" && telaAtual === "mapa") { telaAtual = "menu"; atualizarTelas(); }
    return;
  }

  if (reviverAberto) {
    if (e.repeat) return;
    if (k === "enter") aceitarReviver();
    else if (k === "escape") recusarReviver();
    return;
  }

  // Dentro da fase
  if ((k === "escape" || acao === "pausa") && !e.repeat) { pausar(!pausado); return; }
  if (acao === "loja" && !e.repeat) { abrirLoja(); return; }
  if (pausado || !acao) return;

  if (MOVIMENTO[acao]) {
    teclas[acao] = true;
    if (acao === "pulo" && !e.repeat) apertos.add("pulo");
  } else if (ACOES_RAPIDAS[acao]) {
    if (!e.repeat) apertos.add(acao);
  } else if (acao.indexOf("poder") === 0 && !e.repeat) {
    usarPoder(PODERES[+acao.slice(5) - 1].id);
  }
});

document.addEventListener("keyup", function(e) {
  const acao = mapaTeclas[e.key.toLowerCase()];
  if (acao && MOVIMENTO[acao]) teclas[acao] = false;
});

// Trocar de janela solta as teclas (evita o macaco andar sozinho)
window.addEventListener("blur", function() {
  soltarTeclas();
  if (estado === "jogo" && !pausado && !lojaAberta) pausar(true);
});

window.addEventListener("beforeunload", salvar);

// Clique do mouse também pula a abertura e volta do final (quem joga no Poki usa muito o mouse)
canvas.addEventListener("mousedown", function() {
  iniciarAudio();
  if (estado === "intro" && intro.t > 30) terminarIntro();
  else if (estado === "final" && final.pronto) trocarCena(voltarAoMenu);
});

// Aba escondida (trocou de app no celular, minimizou): pausa e cala o som
document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    soltarTeclas();
    if (estado === "jogo" && !pausado && !lojaAberta && !reviverAberto) pausar(true);
    if (audioCtx && audioCtx.state === "running") audioCtx.suspend();
    salvar();
  } else if (audioCtx && audioCtx.state === "suspended" && !anuncios.aberto) {
    audioCtx.resume();
  }
});


// ---------- Loop: física em passos fixos de 1/60s, desenho a cada quadro ----------

let ultimo = performance.now();
let acumulado = 0;
let contSalvar = 0;

// Vigia: se o menu ficar escondido sem anúncio nem troca de cena (algo travou no caminho),
// ele volta sozinho depois de 3 segundos
let menuSumido = 0;
function vigiarMenu() {
  if (estado === "menu" && telaAtual === "nenhuma" && !anuncios.aberto && !transicao) {
    if (++menuSumido > 180) {
      menuSumido = 0;
      telaAtual = "menu";
      atualizarTelas();
    }
  } else {
    menuSumido = 0;
  }
}

function passo() {
  atualizarAnuncios();
  if (anuncios.aberto) return;   // anúncio na tela: tudo parado
  vigiarMenu();
  atualizarControle();
  atualizarToque();
  let mundoClima = 0;
  if (estado === "jogo" || estado === "final") mundoClima = fase.mundo;
  else if (estado === "menu") mundoClima = Math.floor(save.desbloqueado / FASES_POR_MUNDO);
  atualizarClima(mundoClima);

  // Pausa, loja ou controles abertos: nenhum comando chega na física (teclado ou controle)
  if (estado !== "jogo" || pausado || reiEmCena()) soltarTeclas();
  else cronPasso();
  const fechando = atualizarTransicao();
  if (!fechando) {
    if (estado === "jogo") {
      if (!pausado) {
        atualizarJogo();
        save.stats.tempo++;
        tempoJogadoSessao++;
      }
    } else if (estado === "intro") atualizarIntro();
    else if (estado === "final") atualizarFinal();
    else menuT++;
  }

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
  desenharTransicao();
  desenharPainelRetrato();
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

// Deitado: o jogo (1200x700) cabe inteiro no meio da tela.
// Em pé (tela bem mais alta que larga): o jogo ocupa a largura toda no topo e o canvas cresce
// para baixo, onde fica o painel com os controles grandes (toque.js).
function ajustarTela() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const retrato = h > w * 1.15;
  const escala = retrato ? w / LARGURA : Math.min(w / LARGURA, h / ALTURA);
  const alt = retrato ? Math.max(ALTURA, Math.floor(h / escala)) : ALTURA;
  modoRetrato = retrato;
  alturaTela = alt;
  // amplia as fases só se sobrar espaço para os controles embaixo (celular; tablet em pé não)
  zoomRetrato = retrato && alt - ALTURA * 1.5 >= 1100 ? 1.5 : 1;
  if (canvas.height !== alt) {
    canvas.height = alt;                 // mudar o tamanho zera o contexto
    ctx.imageSmoothingEnabled = false;
  }
  jogoEl.style.height = alt + "px";
  jogoEl.style.top = retrato ? "0px" : "50%";
  jogoEl.style.transformOrigin = retrato ? "50% 0" : "50% 50%";
  jogoEl.style.transform = retrato ? "translate(-50%, 0) scale(" + escala + ")" : "translate(-50%, -50%) scale(" + escala + ")";
  document.body.classList.toggle("retrato", retrato);
  layoutToque();
}

window.addEventListener("resize", ajustarTela);
window.addEventListener("orientationchange", function() { setTimeout(ajustarTela, 150); });
ajustarTela();

traduzirDom();
atualizarTelas();
// acabou de trocar o idioma: reabre as Opções na aba Idioma
try {
  if (sessionStorage.getItem("primata-abrir-idioma")) {
    sessionStorage.removeItem("primata-abrir-idioma");
    abrirControles();
    abaOpcoes = "idioma";
    renderizarOpcoes();
  }
} catch (e) { /* sem sessionStorage */ }
// Primeira visita: a história do começo abre sozinha (sem menu) e emenda na fase 1.
// O menu só aparece a partir da segunda visita.
if (!save.viuIntro) {
  telaAtual = "nenhuma";
  iniciarIntro();
}
iniciarAnuncios();
requestAnimationFrame(quadro);
