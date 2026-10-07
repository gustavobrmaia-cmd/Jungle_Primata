"use strict";

// =========================
// TELAS e o "estado" do jogo
// estado: "menu" | "modo" | "idiomas" | "opcoes" | "controles" | "missoes" | "skins" | "jogo" | "pausa" | "continuar"
// Fluxo:
//   1ª visita: escolhe o modo (bot / 2 jogadores) e a luta começa na hora (sem anúncio).
//   Fim da partida: volta para o MENU (com o placar). Jogar -> escolhe o modo -> anúncio comum -> luta.
// Anúncios:
//   comum    (Poki.intervalo): antes de cada partida, menos a primeira e menos logo depois de um premiado;
//   premiado (Poki.premiado):  só quando o jogador escolhe:
//     - "Partida Lendária": só armas raras e lendárias, para OS DOIS jogadores (justo no modo 2 jogadores);
//     - "Continuar": perdeu para o bot -> continua a partida (o bot volta um ponto). Uma vez por partida;
//     - "Dobrar moedas": no menu, depois de uma partida (uma vez por partida).
// Enquanto está nos menus, uma luta de demonstração (bot contra bot) roda no fundo.
// =========================

let estado = "menu";
let ocupado = false;            // esperando anúncio: ignora cliques repetidos
let lendariaPronta = false;     // assistiu o anúncio da Partida Lendária
let pendente = null;            // partida que acabou e espera a resposta do "continuar"

const TELAS = ["telaMenu", "telaModo", "telaIdiomas", "telaPausa", "telaContinuar",
  "telaOpcoes", "telaControles", "telaMissoes", "telaSkins", "telaRecompensa", "telaDiaria"];
let diariaVista = false;     // a recompensa diária abre sozinha uma vez por visita

function mostrarTela(id) {
  TELAS.forEach(function(t2) { el(t2).classList.toggle("aberta", t2 === id); });
  el("hud").classList.toggle("escondido", estado !== "jogo");
}

function atualizarTextos() {
  traduzirDom();
  const somTxt = save.mudo ? t("som_off") : t("som_on");
  el("btnSom").textContent = somTxt;
  el("btnSomPausa").textContent = somTxt;
  el("btnQualidade").textContent = t("qualidade_" + save.qualidade);
  document.body.classList.toggle("toque", !!entrada.toque);
  el("listaIdiomas").querySelectorAll("button").forEach(function(b) {
    b.classList.toggle("ativo", b.dataset.idioma === IDIOMA);
  });
  const toque = entrada.toque;
  el("dicaBot").textContent = t("nivel_bot", nivelBotTexto(save.nivelBot)) + "\n" + (toque ? t("dica_bot_toque") : dicaTeclas(true));
  el("dica2p").textContent = toque ? t("dica_2p_toque") : dicaTeclas(false);
  atualizarBotaoLendaria();
  atualizarMenuProgresso();
}

function atualizarBotaoLendaria() {
  const b = el("btnLendaria");
  if (lendariaPronta) { b.textContent = "✨ " + t("lendaria_ativada"); b.disabled = true; b.classList.remove("escondido"); return; }
  b.disabled = false;
  b.textContent = "▶ " + t("lendaria_anuncio");
  b.classList.toggle("escondido", !Poki.premiadoDisponivel());
}

// ---------- menus ----------
// Dica dos controles com as teclas que a pessoa escolheu
function dicaTeclas(solo) {
  const tk = entrada.teclas();
  const n = function(j, a) { return nomeTecla(tk[j][a][0]); };
  const n2 = function(j, a) { return tk[j][a][1] ? " / " + nomeTecla(tk[j][a][1]) : ""; };
  if (solo) return t("dica_bot_v3", n(1, "esquerda") + " " + n(1, "direita"), n(1, "pulo") + n2(1, "pulo"), n(1, "tiro"));
  return t("dica_2p_v3", n(1, "esquerda") + " " + n(1, "direita") + " " + n(1, "pulo") + " + " + n(1, "tiro"),
    n(2, "esquerda") + " " + n(2, "direita") + " " + n(2, "pulo") + " + " + n(2, "tiro"));
}

function irParaMenu(textoResultado) {
  estado = "menu";
  entrada.ativa = false;
  Poki.jogando(false);
  if (textoResultado !== undefined) el("menuResultado").textContent = textoResultado;
  garantirDemo();
  atualizarTextos();
  mostrarTela("telaMenu");
  // recompensa diária (depois da 1ª partida, uma vez por visita)
  if (!diariaVista && save.partidas > 0 && Progresso.diaDisponivel()) { diariaVista = true; abrirDiaria(); }
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
  if (!primeira) Eventos.botao("mode-" + (modo === "2p" ? "2p" : modo === "sobrevivencia" ? "survival" : "bot"));
  mostrarTela(null);
  // sem anúncio comum na 1ª partida e logo depois de um premiado
  (primeira || lendaria ? Promise.resolve() : Poki.intervalo()).then(function() {
    ocupado = false;
    lendariaPronta = false;
    save.dobrar = 0;
    save.partidas++;
    salvar();
    novaPartida(modo, { lendaria: lendaria, nivelBot: save.nivelBot, primeiraVez: primeira });
    estado = "jogo";
    entrada.ativa = true;
    entrada.limparApertos();
    mostrarTela(null);
    Poki.jogando(true);
    Poki.medir("match", modo === "sobrevivencia" ? "survival" : modo, "start");
    if (modo === "bot") Poki.medir("bot", "level-" + Math.round(save.nivelBot * 10), "start");
    if (save.partidas <= 10) Eventos.marco("match-" + save.partidas);
  });
}

// ---------- fim da partida (chamado por partida.js) ----------
function aoTerminarPartida(j) {
  entrada.ativa = false;
  Poki.jogando(false);
  if ((j.modo === "bot" || j.modo === "sobrevivencia") && j.vencedorPartida === 2 && !j.continuou && Poki.premiadoDisponivel()) {
    // perdeu para o bot: oferece continuar (opcional)
    pendente = j;
    estado = "continuar";
    const surv = j.modo === "sobrevivencia";
    el("contPlacar").textContent = surv ? t("onda_n", j.onda) : j.pontos[0] + " – " + j.pontos[1];
    el("contExplica").textContent = surv ? t("continuar_vida") : t("continuar_explica");
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
  let texto, extra = "";
  // progresso: moedas da partida e contadores das missões/conquistas
  const ganho = Progresso.moedasDaPartida(j);
  Progresso.ganharMoedas(ganho);
  save.dobrar = 0;
  let novoRecorde = false;
  if (j.modo === "sobrevivencia" && j.onda > save.recordeOnda) { save.recordeOnda = j.onda; novoRecorde = true; }
  Progresso.registrar("partidas", 1);
  if (j.modo === "2p") Progresso.registrar("partidas2p", 1);
  if (j.lendaria) Progresso.registrar("lendarias", 1);
  if (j.modo === "bot" && j.vencedorPartida === 1) {
    Progresso.registrar("vitorias", 1);
    if (j.pontos[1] === 0 && j.alvo >= 5) Progresso.registrar("placar5x0", 1);
    if (save.nivelBot >= 0.85) Progresso.registrar("botMestre", 1);
    if ((j.piorDiferenca || 0) >= 3) Progresso.registrar("virada", 1);
  }
  if (j.modo === "bot") {
    const venceu = j.vencedorPartida === 1;
    const antes = save.nivelBot;
    // base: entre o nível do começo e o do fim da partida (o bot já se ajustou a cada rodada)
    const base = j.bots[1] ? (save.nivelBot + j.bots[1].nivel) / 2 : save.nivelBot;
    save.nivelBot = proximoNivelBot(base, desempenhoDoJogador(j), venceu);
    if (venceu) save.vitorias++; else save.derrotas++;
    salvar();
    Poki.medir("match", "bot", venceu ? "complete" : "fail");
    Poki.medir("bot", save.nivelBot > antes ? "harder" : "easier", "interact");
    texto = (venceu ? t("voce_venceu") : t("bot_venceu")) + "  " + j.pontos[0] + " – " + j.pontos[1];
    const n0 = nivelBotTexto(antes), n1 = nivelBotTexto(save.nivelBot);
    if (n1 > n0) extra = t("bot_subiu", n1);
    else if (n1 < n0) extra = t("bot_desceu", n1);
  } else if (j.modo === "sobrevivencia") {
    salvar();
    Poki.medir("match", "survival", "complete");
    Poki.medir("survival", "best-" + j.onda, "reached");
    texto = t("fim_sobrevivencia", j.onda);
    extra = novoRecorde ? t("novo_recorde") : t("recorde_onda", save.recordeOnda);
  } else {
    Poki.medir("match", "2p", "complete");
    texto = t("jogador_venceu", j.vencedorPartida) + "  " + j.pontos[0] + " – " + j.pontos[1];
  }
  el("menuResultado").textContent = texto;
  abrirRecompensa(j, texto, "+" + ganho + " 🪙" + (extra ? "   ·   " + extra : ""));
}

function continuarPartida() {
  if (ocupado || !pendente) return;
  ocupado = true;
  const j = pendente;
  Eventos.oferta("continue", "interact");
  Poki.premiado("medium").then(function(assistiu) {
    ocupado = false;
    if (!assistiu) { el("contAviso").textContent = t("anuncio_falhou"); return; }
    // o bot perde o último ponto e a partida continua (na sobrevivência: volta na mesma onda com vida cheia)
    pendente = null;
    j.continuou = true;
    if (j.modo === "sobrevivencia") j.vidaJogador = 100;
    else j.pontos[1] = j.alvo - 1;
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

// moedas no topo, selo de prêmios esperando e o botão de dobrar
function atualizarMenuProgresso() {
  const txt = "🪙 " + save.moedas;
  el("menuMoedas").textContent = txt;
  el("missoesMoedas").textContent = txt;
  el("skinsMoedas").textContent = txt;
  const n = Progresso.pendentes();
  el("seloMissoes").textContent = n;
  el("seloMissoes").classList.toggle("escondido", n === 0);
  el("menuNivelNum").textContent = t("nivel_jogador", save.nivel);
  el("menuXp").style.width = Math.min(100, 100 * save.xp / Progresso.xpParaSubir(save.nivel)) + "%";
  el("dicaSurv").textContent = t("sobrevivencia_dica") + (save.recordeOnda ? "\n" + t("recorde_onda", save.recordeOnda) : "");
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
    abrirOpcoes();
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
    voltar: function() { estado = "menu"; atualizarTextos(); mostrarTela("telaMenu"); },
    voltarOpcoes: abrirOpcoes,
    opcoes: abrirOpcoes,
    controles: abrirControles,
    teclasPadrao: teclasDeFabrica,
    missoes: function() { abrirMissoes("missoes"); },
    skins: function() { abrirSkins("corpo"); },
    modoSurv: function() { comecarPartida("sobrevivencia"); },
    abrirBau: abrirBauDaVez,
    outroBau: outroBau,
    revanche: revanche,
    recMenu: recompensaParaMenu,
    pegarDiaria: pegarDiaria,
    fecharDiaria: fecharDiaria,
    som: trocarSom,
    qualidade: function() {
      const ordem = ["auto", "alta", "leve"];
      save.qualidade = ordem[(ordem.indexOf(save.qualidade) + 1) % ordem.length];
      salvar();
      aplicarQualidade();
      atualizarTextos();
      Poki.medir("button", "quality", save.qualidade);
    },
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
