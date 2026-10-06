"use strict";

// =========================
// TELAS (menu, idiomas, pausa, fim) e o "estado" do jogo
// estado: "menu" | "jogo" | "pausa" | "fim"
// Toda volta ao jogo passa por Poki.intervalo() (o Poki decide se mostra anúncio), menos a
// primeiríssima partida de quem acabou de chegar.
// =========================

let estado = "menu";
let ocupado = false;   // esperando anúncio / troca de tela: ignora cliques repetidos

function mostrarTela(id) {
  ["telaMenu", "telaIdiomas", "telaPausa", "telaFim"].forEach(function(t) {
    el(t).classList.toggle("aberta", t === id);
  });
  el("hud").classList.toggle("escondido", estado !== "jogo");
}

function atualizarTextos() {
  traduzirDom();
  const somTxt = save.mudo ? t("som_off") : t("som_on");
  el("btnSom").textContent = somTxt;
  el("btnSomPausa").textContent = somTxt;
  el("menuRecorde").textContent = save.recorde ? t("recorde", save.recorde) : "";
  el("listaIdiomas").querySelectorAll("button").forEach(function(b) {
    b.classList.toggle("ativo", b.dataset.idioma === IDIOMA);
  });
}

function irParaMenu() {
  estado = "menu";
  Poki.jogando(false);
  atualizarTextos();
  mostrarTela("telaMenu");
}

// Começa uma partida (com intervalo comercial antes, menos na primeira de todas)
function comecarPartida() {
  if (ocupado) return;
  ocupado = true;
  mostrarTela(null);
  const primeira = save.partidas === 0;
  (primeira ? Promise.resolve() : Poki.intervalo()).then(function() {
    ocupado = false;
    novaPartida();
    estado = "jogo";
    entrada.limparApertos();
    mostrarTela(null);
    Poki.jogando(true);
  });
}

function pausar() {
  if (estado !== "jogo") return;
  estado = "pausa";
  Poki.jogando(false);
  entrada.soltarTudo();
  atualizarTextos();
  mostrarTela("telaPausa");
}

function continuar() {
  if (estado !== "pausa") return;
  estado = "jogo";
  entrada.soltarTudo();
  mostrarTela(null);
  Poki.jogando(true);
}

// Chamado pelo jogo quando a partida acaba
function abrirFim() {
  estado = "fim";
  Poki.jogando(false);
  entrada.soltarTudo();
  atualizarTextos();
  el("fimPontos").textContent = t("pontos", jogo.pontos);
  el("fimRecorde").textContent = t("recorde", save.recorde);
  el("fimAviso").textContent = "";
  const podeReviver = !jogo.reviveu && Poki.premiadoDisponivel();
  el("btnReviver").classList.toggle("escondido", !podeReviver);
  if (podeReviver) Eventos.oferta("revive", "visible");
  mostrarTela("telaFim");
}

function tentarReviver() {
  if (ocupado) return;
  ocupado = true;
  Eventos.oferta("revive", "interact");
  Poki.premiado("medium").then(function(assistiu) {
    ocupado = false;
    if (!assistiu) {
      el("fimAviso").textContent = t("anuncio_falhou");
      el("btnReviver").classList.add("escondido");
      return;
    }
    reviver();
    estado = "jogo";
    entrada.soltarTudo();
    mostrarTela(null);
    Poki.jogando(true);
  });
}

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
    mostrarTela("telaMenu");
  });
}

function montarTelas() {
  // um botão por idioma, com o nome na própria língua
  IDIOMAS.forEach(function(i) {
    const b = document.createElement("button");
    b.textContent = i.nome;
    b.dataset.idioma = i.id;
    b.addEventListener("click", function() { som("clique"); escolherIdioma(i.id); });
    el("listaIdiomas").appendChild(b);
  });

  const acoes = {
    jogar: comecarPartida,
    denovo: comecarPartida,
    idiomas: function() { mostrarTela("telaIdiomas"); },
    voltar: function() { mostrarTela("telaMenu"); },
    som: trocarSom,
    pausar: pausar,
    continuar: continuar,
    menu: irParaMenu,
    reviver: tentarReviver
  };
  document.querySelectorAll("[data-acao]").forEach(function(b) {
    b.addEventListener("click", function() {
      som("clique");
      const fn = acoes[b.dataset.acao];
      if (fn) fn();
      b.blur();
    });
  });

  // atalhos de teclado nas telas
  window.addEventListener("keydown", function(e) {
    const k = e.key.toLowerCase();
    if (e.repeat) return;
    if (estado === "jogo" && (k === "escape" || k === "p")) pausar();
    else if (estado === "pausa" && (k === "escape" || k === "p")) continuar();
    else if (estado === "menu" && k === "enter" && el("telaMenu").classList.contains("aberta")) comecarPartida();
    else if (estado === "fim" && k === "enter") comecarPartida();
  });

  // aba escondida no meio do jogo: pausa sozinho
  document.addEventListener("visibilitychange", function() { if (document.hidden) pausar(); });
}
