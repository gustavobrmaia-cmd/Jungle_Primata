"use strict";

// =========================
// TELAS: menu, mapa de fases, pausa e loja
// =========================

const el = function(id) { return document.getElementById(id); };

let telaAtual = "menu";      // no menu: "menu", "mapa" ou "nenhuma" (saindo do menu)
let lojaAberta = false;
let controlesAbertos = false;
let capturando = null;       // { acao, slot } esperando a tecla nova
let lojaDaPausa = false;
let abaAtual = "skin";

function mostrar(elemento, sim) {
  elemento.classList.toggle("aberta", !!sim);
}

function atualizarTelas() {
  const sobreposta = lojaAberta || controlesAbertos;
  mostrar(el("telaMenu"), estado === "menu" && telaAtual === "menu" && !sobreposta);
  mostrar(el("telaMapa"), estado === "menu" && telaAtual === "mapa" && !sobreposta);
  mostrar(el("telaPausa"), estado === "jogo" && pausado && !sobreposta);
  mostrar(el("telaControles"), controlesAbertos);
  mostrar(el("botoesJogo"), estado === "jogo" && !pausado);
  mostrar(el("loja"), lojaAberta);
  el("menuMoedas").textContent = save.moedas;
  el("menuProgresso").textContent = save.zerou ? "Jogo zerado!" : "Próxima: " + nomeFase(save.desbloqueado);
  el("menuNivel").textContent = save.nivel;
  el("menuXp").style.width = Math.round((100 * save.xp) / xpParaSubir(save.nivel)) + "%";
  el("btnSom").textContent = save.mudo ? "Som: desligado (" + teclaDe("som") + ")" : "Som: ligado (" + teclaDe("som") + ")";
  el("menuControles").innerHTML =
    "<b>" + teclaDe("esquerda") + "/" + teclaDe("direita") + "</b> andar · <b>" + teclaDe("pulo") + "</b> pular (segure para ir mais alto) · <b>" +
    teclaDe("baixo") + "</b> deslizar<br><b>" + teclaDe("tiro") + "</b> revólver · <b>" + teclaDe("recarregar") + "</b> recarregar · <b>" +
    teclaDe("laco") + "</b> cipó-laço (puxa o inimigo e chuta pro espaço!)<br><b>" + teclaDe("dash") + "</b> dash (melhoria) · <b>" +
    teclaDe("poder1") + "-" + teclaDe("poder5") + "</b> poderes · <b>" + teclaDe("loja") + "</b> loja · <b>" + teclaDe("pausa") + "</b> pausa";
  if (telaAtual === "mapa") renderizarMapa();
}

function soltarTeclas() {
  teclas.esquerda = teclas.direita = teclas.baixo = teclas.pulo = false;
  apertos.clear();
}

function sairDoMenu(fn) {
  telaAtual = "nenhuma";
  atualizarTelas();
  trocarCena(fn);
}

function jogar() {
  if (!save.viuIntro) sairDoMenu(iniciarIntro);
  else sairDoMenu(function() { iniciarFase(save.desbloqueado); });
}

function voltarAoMenu() {
  estado = "menu";
  telaAtual = "menu";
  pausado = false;
  lojaAberta = false;
  controlesAbertos = false;
  salvar();
  soltarTeclas();
  atualizarTelas();
}

function pausar(sim) {
  if (estado !== "jogo" || mensagemTravada()) return;
  pausado = sim;
  soltarTeclas();
  atualizarTelas();
}

function mensagemTravada() {
  return mensagem && mensagem.congela && !pausado;
}

function abrirLoja() {
  if (estado === "intro" || estado === "final") return;
  if (estado === "jogo" && mensagemTravada()) return;
  lojaDaPausa = estado === "jogo" && pausado;
  lojaAberta = true;
  if (estado === "jogo") pausado = true;
  soltarTeclas();
  renderizarLoja();
  atualizarTelas();
}

function fecharLoja() {
  lojaAberta = false;
  if (estado === "jogo" && !lojaDaPausa) pausado = false;
  salvar();
  soltarTeclas();
  atualizarTelas();
}

function aoMudarVisual() {
  if (lojaAberta) renderizarLoja();
}


// ---------- Controles (trocar as teclas) ----------

function abrirControles() {
  controlesAbertos = true;
  capturando = null;
  if (estado === "jogo") pausado = true;
  soltarTeclas();
  renderizarControles();
  atualizarTelas();
}

function fecharControles() {
  controlesAbertos = false;
  capturando = null;
  atualizarTelas();
}

function renderizarControles() {
  const box = el("listaControles");
  box.innerHTML = "";
  ACOES.forEach(function(a) {
    const nome = document.createElement("div");
    nome.className = "acao";
    nome.textContent = a.nome;
    box.appendChild(nome);
    for (let slot = 0; slot < 3; slot++) {
      const b = document.createElement("button");
      b.tabIndex = -1;
      const esperando = capturando && capturando.acao === a.id && capturando.slot === slot;
      const k = (save.teclas[a.id] || [])[slot];
      b.textContent = esperando ? "aperte..." : nomeDaTecla(k);
      if (esperando) b.className = "esperando";
      else if (!k) b.className = "vazia";
      b.dataset.acaoTecla = a.id;
      b.dataset.slot = slot;
      box.appendChild(b);
    }
  });
}

el("listaControles").addEventListener("click", function(e) {
  const b = e.target.closest("button");
  if (!b) return;
  capturando = { acao: b.dataset.acaoTecla, slot: +b.dataset.slot };
  renderizarControles();
});


// ---------- Mapa de fases ----------

function renderizarMapa() {
  const box = el("mundos");
  box.innerHTML = "";
  MUNDOS.forEach(function(m, mi) {
    const card = document.createElement("div");
    card.className = "mundo";
    card.style.borderColor = m.cor;
    const titulo = document.createElement("h3");
    titulo.textContent = (mi + 1) + ". " + m.nome + (save.chefes[mi] ? "  ★" : "");
    titulo.style.color = m.cor;
    card.appendChild(titulo);

    const linha = document.createElement("div");
    linha.className = "fases";
    for (let e = 0; e < FASES_POR_MUNDO; e++) {
      const i = mi * FASES_POR_MUNDO + e;
      const b = document.createElement("button");
      b.tabIndex = -1;
      const chefeFase = e === FASES_POR_MUNDO - 1;
      b.textContent = i > save.desbloqueado ? "🔒" : chefeFase ? "Chefe" : (mi + 1) + "-" + (e + 1);
      b.disabled = i > save.desbloqueado;
      if (chefeFase) b.classList.add("chefe");
      if (!b.disabled && (i < save.desbloqueado || (chefeFase && save.chefes[mi]))) b.classList.add("feita");
      b.dataset.fase = i;
      linha.appendChild(b);
    }
    card.appendChild(linha);
    const nomeChefe = document.createElement("div");
    nomeChefe.className = "nomeChefe";
    nomeChefe.textContent = "Chefe: " + m.nomeChefe;
    card.appendChild(nomeChefe);
    box.appendChild(card);
  });
}

el("mundos").addEventListener("click", function(e) {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  const i = +b.dataset.fase;
  sairDoMenu(function() { iniciarFase(i); });
});


// ---------- Loja ----------

function iconeCanvas(id) {
  const c = criarCanvas(32, 32);
  const g = c.getContext("2d");
  const img = ICONES[id];
  g.drawImage(img, Math.round((32 - img.width) / 2), Math.round((32 - img.height) / 2));
  return c;
}

function novoCartao(classe) {
  const card = document.createElement("div");
  card.className = "item" + (classe ? " " + classe : "");
  return card;
}

function linhaTexto(card, classe, texto) {
  const d = document.createElement("div");
  d.className = classe;
  d.textContent = texto;
  card.appendChild(d);
  return d;
}

function precoHtml(card, preco) {
  const d = document.createElement("div");
  d.className = "preco";
  d.innerHTML = '<span class="ic-moeda"></span>' + preco;
  card.appendChild(d);
}

function botao(card, texto, desativado, dados) {
  const b = document.createElement("button");
  b.tabIndex = -1;
  b.textContent = texto;
  b.disabled = !!desativado;
  Object.keys(dados).forEach(function(k) { b.dataset[k] = dados[k]; });
  card.appendChild(b);
}

function renderizarLoja() {
  el("lojaMoedas").textContent = save.moedas;
  desenharPrimata(el("previa").getContext("2d"), save.equip, 8, "parado");

  const abas = el("abas");
  abas.innerHTML = "";
  ABAS.forEach(function(aba) {
    const b = document.createElement("button");
    b.tabIndex = -1;
    b.textContent = aba.nome;
    b.dataset.aba = aba.tipo;
    if (aba.tipo === abaAtual) b.className = "ativa";
    abas.appendChild(b);
  });

  const frag = document.createDocumentFragment();

  if (abaAtual === "poder") {
    PODERES.forEach(function(p) {
      const card = novoCartao("poder");
      const cv = iconeCanvas(p.id);
      cv.className = "icone";
      card.appendChild(cv);
      linhaTexto(card, "nome", p.nome);
      linhaTexto(card, "desc", p.desc + ". Tecla " + teclaDe("poder" + (PODERES.indexOf(p) + 1)) + ".");
      linhaTexto(card, "qtd", "Você tem: " + save.poderes[p.id]);
      precoHtml(card, p.preco);
      botao(card, save.moedas >= p.preco ? "Comprar" : "Faltam " + (p.preco - save.moedas), save.moedas < p.preco, { poder: p.id });
      frag.appendChild(card);
    });
  } else if (abaAtual === "melhoria") {
    MELHORIAS.forEach(function(m) {
      const tem = temMelhoria(m.id);
      const card = novoCartao("poder" + (tem ? " equipado" : ""));
      const cv = iconeCanvas(m.id);
      cv.className = "icone";
      card.appendChild(cv);
      linhaTexto(card, "nome", m.nome);
      linhaTexto(card, "desc", m.desc + " (permanente)");
      if (tem) {
        linhaTexto(card, "preco", "Comprado");
        botao(card, "Comprado", true, { melhoria: m.id });
      } else {
        precoHtml(card, m.preco);
        const falta = m.requer && !temMelhoria(m.requer);
        const nomeRequer = falta ? MELHORIAS.find(function(x) { return x.id === m.requer; }).nome : "";
        botao(card, falta ? "Precisa: " + nomeRequer : save.moedas >= m.preco ? "Comprar" : "Faltam " + (m.preco - save.moedas),
          falta || save.moedas < m.preco, { melhoria: m.id });
      }
      frag.appendChild(card);
    });
  } else {
    const lista = abaAtual === "skin" ? SKINS : ITENS.filter(function(i) { return i.tipo === abaAtual; });
    lista.forEach(function(item) {
      const tem = save.comprados.indexOf(item.id) >= 0;
      const equipado = save.equip[abaAtual] === item.id;
      const card = novoCartao(equipado ? "equipado" : "");

      const cv = criarCanvas(80, 80);
      const teste = Object.assign({}, save.equip);
      teste[abaAtual] = item.id;
      desenharPrimata(cv.getContext("2d"), teste, 4, "parado");
      card.appendChild(cv);

      linhaTexto(card, "nome", item.nome);
      const premio = item.fase !== undefined || item.nivel !== undefined;
      if (tem) linhaTexto(card, "preco", equipado ? "Equipado" : "Seu");
      else if (item.fase !== undefined) linhaTexto(card, "preco", "Passe a fase " + nomeFase(item.fase));
      else if (item.nivel !== undefined) linhaTexto(card, "preco", "Chegue ao nível " + item.nivel);
      else precoHtml(card, item.preco);

      let texto;
      let desativado = false;
      if (!tem && premio) {
        texto = "Bloqueado";
        desativado = true;
      } else if (!tem) {
        texto = save.moedas >= item.preco ? "Comprar" : "Faltam " + (item.preco - save.moedas);
        desativado = save.moedas < item.preco;
      } else if (equipado) {
        texto = abaAtual === "skin" ? "Equipado" : "Tirar";
        desativado = abaAtual === "skin";
      } else {
        texto = "Equipar";
      }
      botao(card, texto, desativado, { id: item.id });
      frag.appendChild(card);
    });
  }

  const itens = el("itens");
  itens.innerHTML = "";
  itens.appendChild(frag);
}

function usarCosmetico(tipo, id) {
  const item = buscarItem(tipo, id);
  if (!item) return;
  if (save.comprados.indexOf(id) < 0) {
    if (item.preco === undefined || save.moedas < item.preco) return;
    save.moedas -= item.preco;
    save.comprados.push(id);
    save.equip[tipo] = id;
    som("compra");
  } else if (save.equip[tipo] === id) {
    if (tipo !== "skin") save.equip[tipo] = null;
  } else {
    save.equip[tipo] = id;
  }
  salvar();
  montarSprites();
  renderizarLoja();
}

function comprarPoder(id) {
  const p = PODERES.find(function(x) { return x.id === id; });
  if (!p || save.moedas < p.preco) return;
  save.moedas -= p.preco;
  save.poderes[id]++;
  som("compra");
  salvar();
  renderizarLoja();
}

function comprarMelhoria(id) {
  const m = MELHORIAS.find(function(x) { return x.id === id; });
  if (!m || temMelhoria(id) || save.moedas < m.preco) return;
  if (m.requer && !temMelhoria(m.requer)) return;
  save.moedas -= m.preco;
  save.melhorias.push(id);
  som("compra");
  salvar();
  if (jogador && estado === "jogo") {
    if (id === "coracao1" || id === "coracao2") jogador.vidas++;
    if (id === "revolver") jogador.balas = maxBalas();
  }
  renderizarLoja();
}

el("abas").addEventListener("click", function(e) {
  const b = e.target.closest("button");
  if (!b) return;
  abaAtual = b.dataset.aba;
  renderizarLoja();
});

el("itens").addEventListener("click", function(e) {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.poder) comprarPoder(b.dataset.poder);
  else if (b.dataset.melhoria) comprarMelhoria(b.dataset.melhoria);
  else usarCosmetico(abaAtual, b.dataset.id);
});

el("fecharLoja").addEventListener("click", fecharLoja);


// ---------- Botões das telas ----------

document.querySelectorAll("[data-acao]").forEach(function(b) {
  b.tabIndex = -1;
  b.addEventListener("click", function() {
    iniciarAudio();
    const acao = b.dataset.acao;
    if (acao === "jogar") jogar();
    else if (acao === "mapa") { telaAtual = "mapa"; atualizarTelas(); }
    else if (acao === "voltar") { telaAtual = "menu"; atualizarTelas(); }
    else if (acao === "loja") abrirLoja();
    else if (acao === "historia") sairDoMenu(iniciarIntro);
    else if (acao === "controles") abrirControles();
    else if (acao === "fecharControles") fecharControles();
    else if (acao === "padraoControles") { save.teclas = copiaTeclasPadrao(); reconstruirMapaTeclas(); salvar(); renderizarControles(); atualizarTelas(); }
    else if (acao === "continuar") pausar(false);
    else if (acao === "pausar") pausar(true);
    else if (acao === "reiniciar") { pausado = false; atualizarTelas(); trocarCena(function() { iniciarFase(fase.indice); }); }
    else if (acao === "menu") voltarAoMenu();
    else if (acao === "som") { save.mudo = !save.mudo; salvar(); atualizarTelas(); }
  });
});
