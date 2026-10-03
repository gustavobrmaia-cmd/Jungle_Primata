"use strict";

// =========================
// ANÚNCIOS (SDK do Poki)
// Com USAR_POKI = false (em dados.js) nada daqui carrega: o jogo segue igual, sem anúncios.
// Com true: avisa o Poki quando a gameplay começa/para, mostra um intervalo entre as fases
// e oferece "assista para reviver" quando o macaco perde todas as vidas.
// =========================

const anuncios = {
  sdk: null,           // window.PokiSDK depois de iniciar
  premiado: false,     // dá para pedir anúncio premiado (falso com bloqueador de anúncio)
  aberto: false,       // anúncio na tela: jogo congelado e mudo
  jogando: false       // último aviso mandado (gameplayStart / gameplayStop)
};

let reviverAberto = false;   // tela "Assista para reviver"

function iniciarAnuncios() {
  if (!USAR_POKI) return;
  const s = document.createElement("script");
  s.src = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
  s.onload = function() {
    const sdk = window.PokiSDK;
    if (!sdk) return;
    sdk.init()
      .then(function() { anuncios.premiado = true; })
      .catch(function() { anuncios.premiado = false; })   // bloqueador de anúncio: o jogo segue sem
      .then(function() {
        anuncios.sdk = sdk;
        sdk.gameLoadingFinished();
      });
  };
  document.head.appendChild(s);
}

// Chamado a cada passo: avisa o Poki quando a gameplay começa ou para (menu, pausa, cenas, fim de fase)
function atualizarAnuncios() {
  if (!anuncios.sdk) return;
  const jogando = estado === "jogo" && !pausado && !reviverAberto && !anuncios.aberto && !(mensagem && mensagem.congela);
  if (jogando === anuncios.jogando) return;
  anuncios.jogando = jogando;
  if (jogando) anuncios.sdk.gameplayStart();
  else anuncios.sdk.gameplayStop();
}

function abrirAnuncio() {
  anuncios.aberto = true;
  if (anuncios.jogando) {
    anuncios.jogando = false;
    anuncios.sdk.gameplayStop();
  }
  soltarTeclas();
  somBloqueado = true;
  if (audioCtx && audioCtx.state === "running") audioCtx.suspend();
}

function fecharAnuncio() {
  anuncios.aberto = false;
  somBloqueado = false;
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

// Intervalo comercial (entre fases e ao recomeçar). Sem SDK, segue na hora.
function intervaloComercial(depois) {
  if (!anuncios.sdk) { depois(); return; }
  abrirAnuncio();
  anuncios.sdk.commercialBreak(function() { /* começou: o jogo já está mudo e parado */ })
    .catch(function() {})
    .then(function() {
      fecharAnuncio();
      depois();
    });
}

// Anúncio premiado: fim(true) só se a pessoa assistiu até o fim.
// tamanho ("small", "medium", "large") diz ao Poki o valor do prêmio.
function anuncioPremiado(tamanho, fim) {
  if (!premiadoDisponivel()) { fim(false); return; }
  abrirAnuncio();
  anuncios.sdk.rewardedBreak({ size: tamanho, onStart: function() { /* começou: jogo já parado e mudo */ } })
    .then(function(ok) { return !!ok; }, function() { return false; })
    .then(function(ok) {
      fecharAnuncio();
      fim(ok);
    });
}


function premiadoDisponivel() {
  return !!(anuncios.sdk && anuncios.premiado && !anuncios.aberto);
}


// ---------- Assista para reviver ----------

function podeReviver() {
  return premiadoDisponivel() && !!fase && !fase.reviveu;
}

function abrirReviver() {
  reviverAberto = true;
  pausado = true;
  soltarTeclas();
  atualizarTelas();
}

function aceitarReviver() {
  if (!reviverAberto) return;
  reviverAberto = false;
  atualizarTelas();
  anuncioPremiado("medium", function(ok) {
    if (ok) reviverJogador();
    else voltarDoCheckpoint();
  });
}

function recusarReviver() {
  if (!reviverAberto) return;
  reviverAberto = false;
  voltarDoCheckpoint();
}

// Volta no último chão seguro, com todas as vidas e um tempinho invencível
function reviverJogador() {
  const j = jogador;
  fase.reviveu = true;
  j.x = j.seguro.x;
  j.y = j.seguro.y;
  j.vx = 0;
  j.vy = 0;
  j.morto = 0;
  j.giro = 0;
  j.afundar = 0;
  j.vidas = vidasMax();
  j.invencivel = 180;
  pausado = false;
  soltarTeclas();
  atualizarTelas();
  som("poder");
  texto(j.x + j.w / 2, j.y - 20, tr("Reviveu!"), "#69db7c", 26);
}


// ---------- Loja: prêmios opcionais por anúncio ----------

// Moedas grátis crescem com o nível do jogador
function moedasDoAnuncio() {
  return Math.min(300, 40 + 10 * save.nivel);
}

function avisoLoja(texto, cor) {
  const d = el("lojaDica");
  d.textContent = texto;
  d.style.color = cor || "";
  clearTimeout(avisoLoja.t);
  avisoLoja.t = setTimeout(function() {
    d.textContent = tr("L ou Esc para voltar");
    d.style.color = "";
  }, 2500);
}

function moedasComAnuncio() {
  const n = moedasDoAnuncio();
  anuncioPremiado("medium", function(ok) {
    if (ok) {
      save.moedas += n;
      som("compra");
      salvar();
      avisoLoja(tr("+{0} moedas!", n), "#ffe066");
    } else {
      avisoLoja(tr("O anúncio não terminou, nada ganho."), "#ff8787");
    }
    renderizarLoja();
  });
}

function poderComAnuncio(id) {
  const p = PODERES.find(function(x) { return x.id === id; });
  if (!p) return;
  anuncioPremiado("small", function(ok) {
    if (ok) {
      save.poderes[id]++;
      som("compra");
      salvar();
      avisoLoja(tr("+1 {0}!", p.nome), "#69db7c");
    } else {
      avisoLoja(tr("O anúncio não terminou, nada ganho."), "#ff8787");
    }
    renderizarLoja();
  });
}
