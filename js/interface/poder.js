"use strict";

// =========================
// PAINEL DE PODER (v13): os 3 cartões de melhoria (Força, Vida, Velocidade) com nível, efeito e preço.
// Aparece na tela de fim de partida (contra máquina, ao lado do baú) e na tela "Melhorar" do menu.
// Comprar: as moedas saem, o nível sobe, o cartão brilha e o PODER pula. O cartão que dá para comprar pulsa.
// Regras e números: js/jogo/progresso/poder.js
// =========================

function montarPainelPoder(alvo, aoComprar) {
  alvo.innerHTML = "";
  const topo = document.createElement("div");
  topo.className = "poderTopo";
  ["poderValor", "poderDica", "poderMoedas"].forEach(function(c) {
    const s = document.createElement("span"); s.className = c; topo.appendChild(s);
  });
  const cartas = document.createElement("div");
  cartas.className = "poderCartas";
  MELHORIAS.forEach(function(m) {
    const b = document.createElement("button");
    b.className = "poderCarta";
    b.dataset.melhoria = m.id;
    ["pcNivel", "pcIcone", "pcNome", "pcEfeito", "pcPreco"].forEach(function(c) {
      const s = document.createElement("span"); s.className = c; b.appendChild(s);
    });
    b.querySelector(".pcIcone").textContent = m.icone;
    b.addEventListener("click", function() {
      b.blur();
      if (!Poder.comprar(m.id)) { som("clique"); reanimar(b, "sem"); return; }
      som("carta");
      reanimar(b, "comprou");
      reanimar(topo.querySelector(".poderValor"), "pulou");
      atualizarPainelPoder(alvo);
      atualizarMenuProgresso();
      if (aoComprar) aoComprar(m.id);
    });
    cartas.appendChild(b);
  });
  alvo.appendChild(topo);
  alvo.appendChild(cartas);
  atualizarPainelPoder(alvo);
}

// recomeça uma animação de CSS (a mesma classe de novo)
function reanimar(elemento, classe) {
  elemento.classList.remove(classe);
  void elemento.offsetWidth;
  elemento.classList.add(classe);
}

function atualizarPainelPoder(alvo) {
  if (!alvo || !alvo.firstChild) return;
  const pode = Poder.algumaPossivel();
  alvo.querySelector(".poderValor").textContent = t("poder_n", Poder.valor(Poder.doJogador()));
  alvo.querySelector(".poderMoedas").textContent = "🪙 " + save.moedas;
  // dica curta: depois de perder ("melhore e volte mais forte") ou para quem ainda não comprou quase nada
  alvo.querySelector(".poderDica").textContent = !pode ? "" : alvo.dataset.perdeu === "1" ? t("poder_dica") :
    (save.stats.melhorias || 0) < 3 ? t("poder_gaste") : "";
  alvo.querySelectorAll(".poderCarta").forEach(function(b) {
    const id = b.dataset.melhoria, n = Poder.nivel(id), max = Poder.noMax(id);
    b.querySelector(".pcNome").textContent = t("mel_" + id);
    b.querySelector(".pcNivel").textContent = t("mel_nivel", n);
    // o que tem agora -> o que o próximo nível dá
    b.querySelector(".pcEfeito").textContent = max ? Poder.efeito(id, n) : (n ? Poder.efeito(id, n) : "0%") + " → " + Poder.efeito(id, n + 1);
    b.querySelector(".pcPreco").textContent = max ? t("mel_max") : "🪙 " + Poder.custo(id);
    b.classList.toggle("pode", Poder.podeComprar(id));
    b.classList.toggle("max", max);
  });
}

// tela "Melhorar" do menu
function abrirTelaPoder() {
  estado = "poder";
  const alvo = el("menuPoder");
  if (!alvo.firstChild) montarPainelPoder(alvo, null);
  alvo.dataset.perdeu = "0";
  atualizarPainelPoder(alvo);
  Eventos.botao("upgrades");
  mostrarTela("telaPoder");
}
