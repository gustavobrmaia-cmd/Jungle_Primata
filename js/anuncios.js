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

// Chamado no fim do main.js, quando o jogo terminou de carregar (sprites prontos, menu na tela).
// O SDK vem do <script> no <head> do index.html; se faltar, carrega aqui.
function iniciarAnuncios() {
  if (!USAR_POKI) return;
  if (window.PokiSDK) { ligarSdkPoki(); return; }
  const s = document.createElement("script");
  s.src = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
  s.onload = ligarSdkPoki;
  document.head.appendChild(s);
}

function ligarSdkPoki() {
  const sdk = window.PokiSDK;
  if (!sdk || anuncios.sdk) return;
  sdk.init()
    .then(function() { anuncios.premiado = true; })
    .catch(function() { anuncios.premiado = false; })   // bloqueador de anúncio: o jogo segue sem
    .then(function() {
      anuncios.sdk = sdk;
      sdk.gameLoadingFinished();   // o jogo terminou de carregar
    });
}

// O Poki pede o gameplayStart só depois da primeira interação do jogador (nunca ao carregar):
// o tutorial da primeira visita abre sozinho, então espera a primeira tecla, clique ou toque.
let jogadorInteragiu = false;
["keydown", "pointerdown", "touchstart", "mousedown"].forEach(function(ev) {
  window.addEventListener(ev, function() { jogadorInteragiu = true; }, { capture: true, passive: true });
});

// Chamado a cada passo: avisa o Poki quando a gameplay começa ou para (menu, pausa, cenas, fim de fase)
function atualizarAnuncios() {
  if (!anuncios.sdk) return;
  if (controleAtivo) jogadorInteragiu = true;
  const jogando = jogadorInteragiu && estado === "jogo" && !pausado && !reviverAberto && !anuncios.aberto && !(mensagem && mensagem.congela);
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

// Quanto o jogo espera o anúncio COMEÇAR antes de seguir sozinho, e o limite total
const ESPERA_ANUNCIO = 4000;
const ESPERA_PREMIADO = 8000;
const LIMITE_ANUNCIO = 60000;

// Intervalo comercial (entre fases e ao recomeçar). Sem SDK, segue na hora.
// Rede de segurança: se o Poki não começar o anúncio em poucos segundos (ou nunca responder),
// o jogo segue sozinho; antes o menu sumia e o jogo ficava preso esperando.
function intervaloComercial(depois) {
  if (!anuncios.sdk) { depois(); return; }
  abrirAnuncio();
  let seguiu = false;
  let comecou = false;
  function seguir() {
    if (seguiu) return;
    seguiu = true;
    clearTimeout(espera);
    clearTimeout(limite);
    fecharAnuncio();
    depois();
  }
  const espera = setTimeout(function() { if (!comecou) seguir(); }, ESPERA_ANUNCIO);
  const limite = setTimeout(seguir, LIMITE_ANUNCIO);
  let pedido;
  try {
    pedido = anuncios.sdk.commercialBreak(function() {
      comecou = true;
      if (seguiu) abrirAnuncio();   // começou atrasado: congela e cala o jogo até acabar
    });
  } catch (e) { seguir(); return; }
  Promise.resolve(pedido).catch(function() {}).then(function() {
    if (seguiu) { if (anuncios.aberto) fecharAnuncio(); return; }
    seguir();
  });
}

// Anúncio premiado: fim(true) só se a pessoa assistiu até o fim.
// tamanho ("small", "medium", "large") diz ao Poki o valor do prêmio.
// (mesma rede de segurança: se o anúncio não começar, conta como "não assistiu" e o jogo segue)
function anuncioPremiado(tamanho, fim) {
  if (!premiadoDisponivel()) { fim(false); return; }
  abrirAnuncio();
  let acabou = false;
  let comecou = false;
  function terminar(ok) {
    if (acabou) return;
    acabou = true;
    clearTimeout(espera);
    clearTimeout(limite);
    fecharAnuncio();
    fim(ok);
  }
  const espera = setTimeout(function() { if (!comecou) terminar(false); }, ESPERA_PREMIADO);
  const limite = setTimeout(function() { terminar(false); }, LIMITE_ANUNCIO + 30000);
  let pedido;
  try {
    pedido = anuncios.sdk.rewardedBreak({ size: tamanho, onStart: function() {
      comecou = true;
      if (acabou) abrirAnuncio();
    } });
  } catch (e) { terminar(false); return; }
  Promise.resolve(pedido)
    .then(function(ok) { return !!ok; }, function() { return false; })
    .then(function(ok) {
      if (acabou) { if (anuncios.aberto) fecharAnuncio(); return; }
      terminar(ok);
    });
}


function premiadoDisponivel() {
  return !!(anuncios.sdk && anuncios.premiado && !anuncios.aberto);
}


// ---------- Assista para reviver ----------

function podeReviver() {
  return premiadoDisponivel() && !!fase && !fase.reviveu && !fase.secreta && !fase.tutorial;
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
  voltarProSeguro(j);
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

// "L ou Esc para voltar", com a tecla da loja que estiver na aba Controles
function dicaLoja() {
  return toqueAtivo ? "" : tr("{0} ou Esc para voltar", nomeComando("loja"));
}

function avisoLoja(texto, cor) {
  const d = el("lojaDica");
  d.textContent = texto;
  d.style.color = cor || "";
  clearTimeout(avisoLoja.t);
  avisoLoja.t = setTimeout(function() {
    d.textContent = dicaLoja();
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
