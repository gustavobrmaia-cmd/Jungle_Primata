"use strict";

// =========================
// TELAS e o "estado" do jogo
// estado: "menu" | "modo" | "idiomas" | "jogo" | "pausa" | "continuar"
// Fluxo:
//   1ª visita: escolhe o modo (bot / 2 jogadores) e a luta começa na hora (sem anúncio).
//   Fim da partida: volta para o MENU (com o placar). Jogar -> escolhe o modo -> anúncio comum -> luta.
// Anúncios:
//   comum    (Poki.intervalo): antes de cada partida, menos a primeira e menos logo depois de um premiado;
//   premiado (Poki.premiado):  só quando o jogador escolhe:
//     - "Partida Lendária": só armas raras e lendárias, para OS DOIS jogadores (justo no modo 2 jogadores);
//     - "Continuar": perdeu para o bot -> continua a partida (o bot volta um ponto). Uma vez por partida.
// Enquanto está nos menus, uma luta de demonstração (bot contra bot) roda no fundo.
// =========================

let estado = "menu";
let ocupado = false;            // esperando anúncio: ignora cliques repetidos
let lendariaPronta = false;     // assistiu o anúncio da Partida Lendária
let pendente = null;            // partida que acabou e espera a resposta do "continuar"

const TELAS = ["telaMenu", "telaModo", "telaIdiomas", "telaPausa", "telaContinuar"];

function mostrarTela(id) {
  TELAS.forEach(function(t2) { el(t2).classList.toggle("aberta", t2 === id); });
  el("hud").classList.toggle("escondido", estado !== "jogo");
}

function atualizarTextos() {
  traduzirDom();
  const somTxt = save.mudo ? t("som_off") : t("som_on");
  el("btnSom").textContent = somTxt;
  el("btnSomPausa").textContent = somTxt;
  el("listaIdiomas").querySelectorAll("button").forEach(function(b) {
    b.classList.toggle("ativo", b.dataset.idioma === IDIOMA);
  });
  const toque = entrada.toque;
  el("dicaBot").textContent = toque ? t("dica_bot_toque") : t("dica_bot_teclado");
  el("dica2p").textContent = toque ? t("dica_2p_toque") : t("dica_2p_teclado");
  atualizarBotaoLendaria();
}

function atualizarBotaoLendaria() {
  const b = el("btnLendaria");
  if (lendariaPronta) { b.textContent = "✨ " + t("lendaria_ativada"); b.disabled = true; b.classList.remove("escondido"); return; }
  b.disabled = false;
  b.textContent = "▶ " + t("lendaria_anuncio");
  b.classList.toggle("escondido", !Poki.premiadoDisponivel());
}

// ---------- menus ----------
function irParaMenu(textoResultado) {
  estado = "menu";
  entrada.ativa = false;
  Poki.jogando(false);
  if (textoResultado !== undefined) el("menuResultado").textContent = textoResultado;
  garantirDemo();
  atualizarTextos();
  mostrarTela("telaMenu");
}

function abrirModo() {
  estado = "modo";
  garantirDemo();
  atualizarTextos();
  // na 1ª visita não tem "voltar": a pessoa entrou para jogar
  el("btnVoltarModo").classList.toggle("escondido", save.partidas === 0);
  if (Poki.premiadoDisponivel() && !lendariaPronta) Eventos.oferta("legendary", "visible");
  mostrarTela("telaModo");
}

function garantirDemo() {
  if (!jogo || !jogo.demo) novaPartida("demo");
}

// ---------- começar a partida ----------
function comecarPartida(modo) {
  if (ocupado) return;
  ocupado = true;
  const primeira = save.partidas === 0;
  const lendaria = lendariaPronta;
  Eventos.botao(modo === "bot" ? "mode-bot" : "mode-2p");
  mostrarTela(null);
  // sem anúncio comum na 1ª partida e logo depois de um premiado
  (primeira || lendaria ? Promise.resolve() : Poki.intervalo()).then(function() {
    ocupado = false;
    lendariaPronta = false;
    save.partidas++;
    salvar();
    novaPartida(modo, { lendaria: lendaria, nivelBot: save.nivelBot, primeiraVez: primeira });
    estado = "jogo";
    entrada.ativa = true;
    entrada.limparApertos();
    mostrarTela(null);
    Poki.jogando(true);
    Poki.medir("match", modo, "start");
    if (modo === "bot") Poki.medir("bot", "level-" + Math.round(save.nivelBot * 10), "start");
    if (save.partidas <= 10) Eventos.marco("match-" + save.partidas);
  });
}

// ---------- fim da partida (chamado por partida.js) ----------
function aoTerminarPartida(j) {
  entrada.ativa = false;
  Poki.jogando(false);
  if (j.modo === "bot" && j.vencedorPartida === 2 && !j.continuou && Poki.premiadoDisponivel()) {
    // perdeu para o bot: oferece continuar (opcional)
    pendente = j;
    estado = "continuar";
    el("contPlacar").textContent = j.pontos[0] + " – " + j.pontos[1];
    el("contAviso").textContent = "";
    Eventos.oferta("continue", "visible");
    atualizarTextos();
    mostrarTela("telaContinuar");
    return;
  }
  finalizarPartida(j);
}

function finalizarPartida(j) {
  pendente = null;
  let texto;
  if (j.modo === "bot") {
    const venceu = j.vencedorPartida === 1;
    const antes = save.nivelBot;
    save.nivelBot = proximoNivelBot(save.nivelBot, desempenhoDoJogador(j));
    if (venceu) save.vitorias++; else save.derrotas++;
    salvar();
    Poki.medir("match", "bot", venceu ? "complete" : "fail");
    Poki.medir("bot", save.nivelBot > antes ? "harder" : "easier", "interact");
    texto = (venceu ? t("voce_venceu") : t("bot_venceu")) + "  " + j.pontos[0] + " – " + j.pontos[1];
  } else {
    Poki.medir("match", "2p", "complete");
    texto = t("jogador_venceu", j.vencedorPartida) + "  " + j.pontos[0] + " – " + j.pontos[1];
  }
  irParaMenu(texto);
}

function continuarPartida() {
  if (ocupado || !pendente) return;
  ocupado = true;
  const j = pendente;
  Eventos.oferta("continue", "interact");
  Poki.premiado("medium").then(function(assistiu) {
    ocupado = false;
    if (!assistiu) { el("contAviso").textContent = t("anuncio_falhou"); return; }
    // o bot perde o último ponto e a partida continua
    pendente = null;
    j.continuou = true;
    j.pontos[1] = j.alvo - 1;
    j.vencedorPartida = 0;
    if (typeof Efeitos !== "undefined") Efeitos.limpar();
    iniciarRodada();
    estado = "jogo";
    entrada.ativa = true;
    entrada.limparApertos();
    mostrarTela(null);
    Poki.jogando(true);
  });
}

function naoContinuar() {
  if (ocupado || !pendente) return;
  finalizarPartida(pendente);
}

function ativarLendaria() {
  if (ocupado || lendariaPronta) return;
  ocupado = true;
  Eventos.oferta("legendary", "interact");
  Poki.premiado("medium").then(function(assistiu) {
    ocupado = false;
    if (assistiu) lendariaPronta = true;
    atualizarTextos();
  });
}

// ---------- pausa ----------
function pausar() {
  if (estado !== "jogo") return;
  estado = "pausa";
  entrada.ativa = false;
  Poki.jogando(false);
  entrada.soltarTudo();
  atualizarTextos();
  mostrarTela("telaPausa");
}

function continuar() {
  if (estado !== "pausa") return;
  estado = "jogo";
  entrada.ativa = true;
  entrada.soltarTudo();
  mostrarTela(null);
  Poki.jogando(true);
}

function sairDaPartida() {
  if (jogo && !jogo.demo) Poki.medir("match", jogo.modo, "quit");
  irParaMenu("");
}

// ---------- opções ----------
function trocarSom() {
  save.mudo = !save.mudo;
  salvar();
  Eventos.botao(save.mudo ? "sound-off" : "sound-on");
  atualizarTextos();
}

function escolherIdioma(id) {
  if (!idiomaValido(id)) return;
  save.idioma = id;
  salvar();
  Poki.medir("settings", "lang-" + id, "interact");
  carregarIdioma(id).then(function() {
    atualizarTextos();
    estado = "menu";
    mostrarTela("telaMenu");
  });
}

function montarTelas() {
  IDIOMAS.forEach(function(i) {
    const b = document.createElement("button");
    b.textContent = i.nome;
    b.dataset.idioma = i.id;
    b.addEventListener("click", function() { som("clique"); escolherIdioma(i.id); });
    el("listaIdiomas").appendChild(b);
  });

  const acoes = {
    jogar: abrirModo,
    modoBot: function() { comecarPartida("bot"); },
    modo2p: function() { comecarPartida("2p"); },
    lendaria: ativarLendaria,
    idiomas: function() { estado = "idiomas"; mostrarTela("telaIdiomas"); },
    voltar: function() { estado = "menu"; mostrarTela("telaMenu"); },
    som: trocarSom,
    pausar: pausar,
    continuar: continuar,
    sair: sairDaPartida,
    continuarPartida: continuarPartida,
    naoContinuar: naoContinuar
  };
  document.querySelectorAll("[data-acao]").forEach(function(b) {
    b.addEventListener("click", function() {
      som("clique");
      const fn = acoes[b.dataset.acao];
      if (fn) fn();
      b.blur();
    });
  });

  // atalhos de teclado nos menus
  window.addEventListener("keydown", function(e) {
    if (e.repeat) return;
    if (estado === "pausa" && (e.code === "Escape" || e.code === "KeyP")) continuar();
    else if (estado === "menu" && e.code === "Enter") abrirModo();
  });

  // aba escondida no meio da partida: pausa sozinho
  document.addEventListener("visibilitychange", function() { if (document.hidden) pausar(); });
}
