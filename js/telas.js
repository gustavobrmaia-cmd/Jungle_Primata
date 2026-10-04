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

// ---------- Ícones em pixel art (só para as telas) ----------
// Cada ícone é um mapa de letras; a paleta diz a cor de cada letra. "." é vazio.

const ICONES_TELA = {
  cadeado: { cor: { K: "#2a1608", G: "#adb5bd", g: "#6c757d", Y: "#ffd43b", y: "#c98f0a" }, mapa: [
    "..KKKKKK..",
    ".KGGGGGGK.",
    ".KGKKKKGK.",
    ".KGK..KGK.",
    "KKKKKKKKKK",
    "KYYYYYYYyK",
    "KYYYKKYYyK",
    "KYYYKKYYyK",
    "KYYYYYYyyK",
    "KKKKKKKKKK" ] },
  estrela: { cor: { K: "#5c3a00", Y: "#ffe066", y: "#f2a900" }, mapa: [
    "....KK....",
    "....KK....",
    "...KYYK...",
    "KKKKYYKKKK",
    "KYYYYYYYYK",
    ".KYYYYYyK.",
    "..KYYYyK..",
    "..KYyKyyK.",
    ".KYyK.KyK.",
    ".KKK..KKK." ] },
  caveira: { cor: { K: "#2a1608", W: "#f8f0e3", w: "#b9a98e" }, mapa: [
    "..KKKKKK..",
    ".KWWWWWWK.",
    "KWWWWWWWWK",
    "KWKKWWKKWK",
    "KWKKWWKKWK",
    "KWWWKKWWWK",
    ".KWWWWWWK.",
    "..KWKWKWK.",
    "..KwKwKwK.",
    "...KKKKK.." ] },
  coroa: { cor: { K: "#5c3a00", Y: "#ffe066", y: "#f2a900", R: "#e03131", B: "#4dabf7" }, mapa: [
    "K...K..K...K",
    "KK..KK.KK..K",
    "KYK.KYKYK.KK",
    "KYYKKYYYKKYK",
    "KYYYYYYYYYYK",
    "KYYYYYYYYYyK",
    "KYRYYBYYYRyK",
    "KyYYYYYYYYyK",
    "KKKKKKKKKKKK" ] }
};

const _iconesCache = {};

// Devolve um <img> pixelado com o ícone, em escala "escala" (cada pixel do mapa vira escala x escala)
function iconeTela(nome, escala) {
  if (!_iconesCache[nome]) {
    const def = ICONES_TELA[nome];
    const h = def.mapa.length;
    const w = def.mapa[0].length;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    def.mapa.forEach(function(linha, y) {
      for (let x = 0; x < w; x++) {
        const ch = linha[x];
        if (ch === "." || !def.cor[ch]) continue;
        g.fillStyle = def.cor[ch];
        g.fillRect(x, y, 1, 1);
      }
    });
    _iconesCache[nome] = { url: c.toDataURL(), w: w, h: h };
  }
  const info = _iconesCache[nome];
  const img = document.createElement("img");
  img.src = info.url;
  img.alt = "";
  img.draggable = false;
  img.className = "icPixel ic-" + nome;
  img.style.width = info.w * escala + "px";
  img.style.height = info.h * escala + "px";
  return img;
}

// Copia a banana pixelada do jogo para os enfeites do título do menu
function desenharBananasMenu() {
  document.querySelectorAll(".bananaDeco").forEach(function(c) {
    if (typeof SPR_BANANA === "undefined") return;
    c.width = SPR_BANANA.width;
    c.height = SPR_BANANA.height;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(SPR_BANANA, 0, 0);
  });
}

// Raridade pela forma de ganhar o item: prêmios de fase/nível ou pelo preço
function raridadeDe(item) {
  if (item.especial) return { cls: "lendario", nome: tr("Lendário") };
  if (item.fase !== undefined || item.nivel !== undefined) return { cls: "premio", nome: tr("Prêmio") };
  const p = item.preco || 0;
  if (p >= 800) return { cls: "lendario", nome: tr("Lendário") };
  if (p >= 400) return { cls: "epico", nome: tr("Épico") };
  if (p >= 150) return { cls: "raro", nome: tr("Raro") };
  return { cls: "comum", nome: tr("Comum") };
}

function mostrar(elemento, sim) {
  elemento.classList.toggle("aberta", !!sim);
}

// Uma dica de controle: teclas desenhadas como teclas de teclado + o que elas fazem
function comando(teclasNomes, texto) {
  return '<span class="cmd">' + teclasNomes.map(function(t) { return "<kbd>" + t + "</kbd>"; }).join("") +
    "<span>" + texto + "</span></span>";
}

function atualizarTelas() {
  const sobreposta = lojaAberta || controlesAbertos || (telaReiAberta && estado === "menu");
  mostrar(el("telaMenu"), estado === "menu" && telaAtual === "menu" && !sobreposta);
  mostrar(el("telaMapa"), estado === "menu" && telaAtual === "mapa" && !sobreposta);
  mostrar(el("telaPausa"), estado === "jogo" && pausado && !sobreposta && !reviverAberto);
  mostrar(el("telaReviver"), estado === "jogo" && reviverAberto);
  mostrar(el("telaControles"), controlesAbertos);
  mostrar(el("telaRei"), telaReiAberta && estado === "menu" && !lojaAberta && !controlesAbertos);
  atualizarAvisoRei();
  mostrar(el("botoesJogo"), estado === "jogo" && !pausado);
  mostrar(el("loja"), lojaAberta);
  el("menuMoedas").textContent = save.moedas;
  el("menuProgresso").textContent = (save.zerou ? tr("Zerado! Jogar = nova run") : tr("Próxima: {0}", nomeFase(save.desbloqueado))) +
    (save.cronometro && save.recordes.run ? tr(" · Recorde: {0}", formatarCron(save.recordes.run)) : "");
  el("menuNivel").textContent = save.nivel;
  el("menuEstrelas").textContent = totalEstrelas() + "/" + TOTAL_FASES * 3;
  el("menuXp").style.width = Math.round((100 * save.xp) / xpParaSubir(save.nivel)) + "%";
  el("menuXpTexto").textContent = save.xp + "/" + xpParaSubir(save.nivel) + " XP";
  const txtCron = save.cronometro ? tr("Cronômetro: ligado") : tr("Cronômetro: desligado");
  el("btnCronControles").textContent = txtCron;
  el("btnSomOpcoes").textContent = save.mudo ? tr("Som: desligado ({0})", teclaDe("som")) : tr("Som: ligado ({0})", teclaDe("som"));
  if (controlesAbertos) renderizarOpcoes();
  el("btnSom").textContent = save.mudo ? tr("Som: desligado ({0})", teclaDe("som")) : tr("Som: ligado ({0})", teclaDe("som"));
  el("menuControles").innerHTML = toqueAtivo ? [
    comando(["←", "→"], tr("arraste do lado esquerdo: andar e deslizar")),
    comando([tr("PULO")], tr("pular (segure: mais alto)")),
    comando([tr("TIRO")], tr("revólver")),
    comando([tr("LAÇO")], tr("cipó-laço (puxa o inimigo e chuta pro espaço!)")),
    comando(["DASH"], tr("dash (melhoria)")),
    comando(["1-5"], tr("toque nos poderes para usar"))
  ].join("") : controleAtivo ? [
    comando(["←", "→"], tr("andar")),
    comando(["A"], tr("pular (segure: mais alto)")),
    comando(["↓"], tr("deslizar")),
    comando(["X"], tr("revólver")),
    comando(["LB"], tr("recarregar")),
    comando(["Y"], tr("cipó-laço (puxa o inimigo e chuta pro espaço!)")),
    comando(["B"], tr("dash (melhoria)")),
    comando(["LT"], tr("trocar poder")),
    comando(["RT"], tr("usar poder")),
    comando(["Back"], tr("loja")),
    comando(["Start"], tr("pausa"))
  ].join("") : [
    comando([teclaDe("esquerda"), teclaDe("direita")], tr("andar")),
    comando([teclaDe("pulo")], tr("pular (segure: mais alto)")),
    comando([teclaDe("baixo")], tr("deslizar")),
    comando([teclaDe("tiro")], tr("revólver")),
    comando([teclaDe("recarregar")], tr("recarregar")),
    comando([teclaDe("laco")], tr("cipó-laço (puxa o inimigo e chuta pro espaço!)")),
    comando([teclaDe("dash")], tr("dash (melhoria)")),
    comando([teclaDe("poder1") + "-" + teclaDe("poder5")], tr("poderes")),
    comando([teclaDe("loja")], tr("loja")),
    comando([teclaDe("pausa")], tr("pausa"))
  ].join("");
  if (telaAtual === "mapa") renderizarMapa();
}

function soltarTeclas() {
  teclas.esquerda = teclas.direita = teclas.baixo = teclas.pulo = false;
  apertos.clear();
}

function sairDoMenu(fn) {
  telaAtual = "nenhuma";
  atualizarTelas();
  // o Poki pede um intervalo antes de cada começo de gameplay (ele decide se mostra)
  intervaloComercial(function() { trocarCena(fn); });
}

function jogar() {
  if (!save.viuIntro) sairDoMenu(iniciarIntro);
  else if (save.zerou) sairDoMenu(function() { iniciarFase(0); });   // depois de zerar: nova run desde o começo
  else sairDoMenu(function() { iniciarFase(save.desbloqueado); });
}

function voltarAoMenu() {
  cronCancelarRun();
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
  if (estado !== "jogo" || mensagemTravada() || reviverAberto) return;
  pausado = sim;
  soltarTeclas();
  atualizarTelas();
}

function mensagemTravada() {
  return mensagem && mensagem.congela && !pausado;
}

function abrirLoja() {
  if (estado === "intro" || estado === "final" || reviverAberto) return;
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

let abaOpcoes = "controles";

function abrirControles() {
  controlesAbertos = true;
  abaOpcoes = "controles";
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

// Mostra só a aba escolhida da tela de Opções
function renderizarOpcoes() {
  [["controles", "opcControles"], ["idioma", "opcIdioma"], ["adicionais", "opcAdicionais"]].forEach(function(a) {
    el(a[1]).style.display = abaOpcoes === a[0] ? "" : "none";
  });
  document.querySelectorAll("[data-aba-opcoes]").forEach(function(b) {
    b.className = b.dataset.abaOpcoes === abaOpcoes ? "ativa" : "sec";
  });
  el("btnPadraoControles").style.display = abaOpcoes === "controles" ? "" : "none";
  el("btnIdiomaPt").className = IDIOMA === "pt" ? "ativa" : "sec";
  el("btnIdiomaEn").className = IDIOMA === "en" ? "ativa" : "sec";
}

document.querySelectorAll("[data-aba-opcoes]").forEach(function(b) {
  b.tabIndex = -1;
  b.addEventListener("click", function() {
    abaOpcoes = b.dataset.abaOpcoes;
    capturando = null;
    renderizarOpcoes();
  });
});

function renderizarControles() {
  const box = el("listaControles");
  box.innerHTML = "";
  const metade = Math.ceil(ACOES.length / 2);
  [ACOES.slice(0, metade), ACOES.slice(metade)].forEach(function(grupo) {
    const tabela = document.createElement("div");
    tabela.className = "tabelaCtl";
    const cab = document.createElement("div");
    cab.className = "linha cab";
    [tr("Ação"), tr("Tecla 1"), tr("Tecla 2"), tr("Tecla 3")].forEach(function(t) {
      const c = document.createElement("span");
      c.textContent = t;
      cab.appendChild(c);
    });
    tabela.appendChild(cab);
    grupo.forEach(function(a) {
      const linha = document.createElement("div");
      linha.className = "linha";
      const nome = document.createElement("div");
      nome.className = "acao";
      nome.textContent = a.nome;
      linha.appendChild(nome);
      for (let slot = 0; slot < 3; slot++) {
        const b = document.createElement("button");
        b.tabIndex = -1;
        const esperando = capturando && capturando.acao === a.id && capturando.slot === slot;
        const k = (save.teclas[a.id] || [])[slot];
        b.textContent = esperando ? tr("aperte...") : nomeDaTecla(k);
        b.classList.add("tecla");
        if (esperando) b.classList.add("esperando");
        else if (!k) b.classList.add("vazia");
        b.dataset.acaoTecla = a.id;
        b.dataset.slot = slot;
        linha.appendChild(b);
      }
      tabela.appendChild(linha);
    });
    box.appendChild(tabela);
  });
}

el("listaControles").addEventListener("click", function(e) {
  const b = e.target.closest("button");
  if (!b) return;
  capturando = { acao: b.dataset.acaoTecla, slot: +b.dataset.slot };
  renderizarControles();
});


// ---------- Mapa de fases ----------

// Três estrelinhas embaixo do número da fase (apagadas as que faltam)
function estrelasDoBotao(bits) {
  const d = document.createElement("span");
  d.className = "estrelasFase";
  for (let k = 0; k < 3; k++) {
    const img = iconeTela("estrela", 1.5);
    if (!((bits >> k) & 1)) img.classList.add("apagada");
    d.appendChild(img);
  }
  return d;
}

function renderizarMapa() {
  const box = el("mundos");
  box.innerHTML = "";
  MUNDOS.forEach(function(m, mi) {
    const card = document.createElement("div");
    card.className = "mundo";
    card.style.setProperty("--cor", m.cor);

    // Faixa de cabeçalho na cor do mundo
    let feitas = 0;
    for (let e = 0; e < FASES_POR_MUNDO; e++) {
      const i = mi * FASES_POR_MUNDO + e;
      const chefeFase = e === FASES_POR_MUNDO - 1;
      if (chefeFase ? save.chefes[mi] : i < save.desbloqueado) feitas++;
    }
    const faixa = document.createElement("div");
    faixa.className = "faixa";
    const titulo = document.createElement("h3");
    titulo.textContent = (mi + 1) + ". " + m.nome;
    faixa.appendChild(titulo);
    if (save.chefes[mi]) faixa.appendChild(iconeTela("estrela", 2));
    const prog = document.createElement("span");
    prog.className = "prog";
    prog.textContent = feitas + "/" + FASES_POR_MUNDO;
    faixa.appendChild(prog);
    card.appendChild(faixa);

    const linha = document.createElement("div");
    linha.className = "fases";
    for (let e = 0; e < FASES_POR_MUNDO; e++) {
      const i = mi * FASES_POR_MUNDO + e;
      const b = document.createElement("button");
      b.tabIndex = -1;
      const chefeFase = e === FASES_POR_MUNDO - 1;
      const bloqueada = i > save.desbloqueado;
      const feita = !bloqueada && (i < save.desbloqueado || (chefeFase && save.chefes[mi]));
      b.disabled = bloqueada;
      b.classList.add("fase");
      if (chefeFase) b.classList.add("chefe");
      if (bloqueada) b.classList.add("bloqueada");
      else if (feita) b.classList.add("feita");
      else b.classList.add("liberada");
      if (i === save.desbloqueado && !save.zerou) b.classList.add("atual");
      b.title = nomeFase(i);

      if (bloqueada) {
        b.appendChild(iconeTela("cadeado", 3));
      } else if (chefeFase) {
        b.appendChild(iconeTela(feita ? "coroa" : "caveira", 3));
        const t = document.createElement("span");
        t.className = "rotulo";
        t.textContent = tr("Chefe");
        b.appendChild(t);
      } else {
        const n = document.createElement("span");
        n.className = "num";
        n.textContent = (mi + 1) + "-" + (e + 1);
        b.appendChild(n);
      }
      if (feita || (save.estrelas[i] || 0)) b.appendChild(estrelasDoBotao(save.estrelas[i] || 0));
      b.dataset.fase = i;
      linha.appendChild(b);
    }
    card.appendChild(linha);
    const nomeChefe = document.createElement("div");
    nomeChefe.className = "nomeChefe";
    nomeChefe.innerHTML = tr("Chefe: ") + "<b></b>";
    nomeChefe.querySelector("b").textContent = m.nomeChefe;
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

function novoCartao(classe, raridade) {
  const card = document.createElement("div");
  card.className = "item" + (classe ? " " + classe : "") + (raridade ? " r-" + raridade.cls : "");
  if (raridade) {
    const selo = document.createElement("span");
    selo.className = "selo";
    selo.textContent = raridade.nome;
    card.appendChild(selo);
  }
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
  // Prêmio opcional por anúncio (só aparece com o SDK do Poki e sem bloqueador)
  const btnAnuncio = el("btnMoedasAnuncio");
  btnAnuncio.style.display = premiadoDisponivel() ? "" : "none";
  btnAnuncio.textContent = tr("Assistir anúncio: +{0} moedas", moedasDoAnuncio());
  desenharPrimata(el("previa").getContext("2d"), save.equip, 7, "parado");

  const abas = el("abas");
  abas.innerHTML = "";
  ABAS.forEach(function(aba) {
    const b = document.createElement("button");
    b.tabIndex = -1;
    b.textContent = aba.nome;
    b.dataset.aba = aba.tipo;
    b.className = aba.tipo === abaAtual ? "ativa" : "sec";
    abas.appendChild(b);
  });

  const frag = document.createDocumentFragment();

  if (abaAtual === "poder") {
    PODERES.forEach(function(p) {
      const card = novoCartao("poder", raridadeDe(p));
      const cv = iconeCanvas(p.id);
      cv.className = "icone";
      card.appendChild(cv);
      linhaTexto(card, "nome", p.nome);
      linhaTexto(card, "desc", tr("{0}. Tecla {1}.", p.desc, teclaDe("poder" + (PODERES.indexOf(p) + 1))));
      linhaTexto(card, "qtd", tr("Você tem: {0}", save.poderes[p.id]));
      precoHtml(card, p.preco);
      botao(card, save.moedas >= p.preco ? tr("Comprar") : tr("Faltam {0}", p.preco - save.moedas), save.moedas < p.preco, { poder: p.id });
      if (premiadoDisponivel()) {
        botao(card, tr("Grátis (anúncio)"), false, { poderAnuncio: p.id });
        card.lastChild.classList.add("anuncio");
      }
      frag.appendChild(card);
    });
  } else if (abaAtual === "melhoria") {
    MELHORIAS.forEach(function(m) {
      const tem = temMelhoria(m.id);
      const card = novoCartao("poder" + (tem ? " equipado" : ""), raridadeDe(m));
      const cv = iconeCanvas(m.id);
      cv.className = "icone";
      card.appendChild(cv);
      linhaTexto(card, "nome", m.nome);
      linhaTexto(card, "desc", tr("{0} (permanente)", m.desc));
      if (tem) {
        linhaTexto(card, "preco", tr("Comprado"));
        botao(card, tr("Comprado"), true, { melhoria: m.id });
      } else if (m.especial) {
        linhaTexto(card, "preco", tr("Derrote o Rei Macaco"));
        botao(card, tr("Bloqueado"), true, { melhoria: m.id });
      } else {
        precoHtml(card, m.preco);
        const falta = m.requer && !temMelhoria(m.requer);
        const nomeRequer = falta ? MELHORIAS.find(function(x) { return x.id === m.requer; }).nome : "";
        botao(card, falta ? tr("Precisa: {0}", nomeRequer) : save.moedas >= m.preco ? tr("Comprar") : tr("Faltam {0}", m.preco - save.moedas),
          falta || save.moedas < m.preco, { melhoria: m.id });
      }
      frag.appendChild(card);
    });
  } else {
    const lista = abaAtual === "skin" ? SKINS : ITENS.filter(function(i) { return i.tipo === abaAtual; });
    lista.forEach(function(item) {
      const tem = save.comprados.indexOf(item.id) >= 0;
      const equipado = save.equip[abaAtual] === item.id;
      const card = novoCartao(equipado ? "equipado" : "", raridadeDe(item));

      const cv = criarCanvas(96, 96);
      const teste = Object.assign({}, save.equip);
      teste[abaAtual] = item.id;
      desenharPrimata(cv.getContext("2d"), teste, 4, "parado");
      card.appendChild(cv);

      linhaTexto(card, "nome", item.nome);
      const premio = item.fase !== undefined || item.nivel !== undefined || !!item.especial;
      if (tem) linhaTexto(card, "preco", equipado ? tr("Equipado") : tr("Seu"));
      else if (item.especial) linhaTexto(card, "preco", tr("Derrote o Rei Macaco"));
      else if (item.fase !== undefined) linhaTexto(card, "preco", tr("Passe a fase {0}", nomeFase(item.fase)));
      else if (item.nivel !== undefined) linhaTexto(card, "preco", tr("Chegue ao nível {0}", item.nivel));
      else precoHtml(card, item.preco);

      let texto;
      let desativado = false;
      if (!tem && premio) {
        texto = tr("Bloqueado");
        desativado = true;
      } else if (!tem) {
        texto = save.moedas >= item.preco ? tr("Comprar") : tr("Faltam {0}", item.preco - save.moedas);
        desativado = save.moedas < item.preco;
      } else if (equipado) {
        texto = abaAtual === "skin" ? tr("Equipado") : tr("Tirar");
        desativado = abaAtual === "skin";
      } else {
        texto = tr("Equipar");
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
  if (!m || m.especial || temMelhoria(id) || save.moedas < m.preco) return;
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
  el("itens").scrollTop = 0;
});

el("itens").addEventListener("click", function(e) {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.poderAnuncio) poderComAnuncio(b.dataset.poderAnuncio);
  else if (b.dataset.poder) comprarPoder(b.dataset.poder);
  else if (b.dataset.melhoria) comprarMelhoria(b.dataset.melhoria);
  else usarCosmetico(abaAtual, b.dataset.id);
});

el("fecharLoja").addEventListener("click", fecharLoja);


// ---------- Botões das telas ----------

desenharBananasMenu();

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
    else if (acao === "reiniciar" && fase && fase.secreta && save.rei.tentativas <= 0) {
      voltarAoMenu();
      abrirTelaRei();
    }
    else if (acao === "reiniciar") {
      pausado = false;
      atualizarTelas();
      intervaloComercial(function() { trocarCena(function() { iniciarFase(fase.indice); }); });
    }
    else if (acao === "reviver") aceitarReviver();
    else if (acao === "naoReviver") recusarReviver();
    else if (acao === "menu") voltarAoMenu();
    else if (acao === "som") { save.mudo = !save.mudo; salvar(); atualizarTelas(); }
    else if (acao === "cronometro") { save.cronometro = !save.cronometro; salvar(); atualizarTelas(); }
    else if (acao === "idiomaPt") { if (IDIOMA !== "pt") trocarIdioma(); }
    else if (acao === "idiomaEn") { if (IDIOMA !== "en") trocarIdioma(); }
    else if (acao === "moedasAnuncio") moedasComAnuncio();
  });
});
