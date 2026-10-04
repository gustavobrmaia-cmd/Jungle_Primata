"use strict";

// =========================
// CHEFE SECRETO: REI MACACO (aparece no máximo 1 vez por dia)
// - Só para quem está no nível 15 ou mais.
// - Na primeira vez que a pessoa abre o jogo no dia, há uma chance dele aparecer.
// - Cada aparição dá 3 tentativas; acabou, um anúncio premiado dá mais 3 (uma vez).
// - 1ª barra de vida: Rei Macaco (rápido, com bastão). Quando esvazia, cai a noite, nasce a lua cheia
//   e ele vira o Grande Macaco (2ª barra, mais forte).
// - Vencer dá a skin Rei Macaco e a melhoria Nuvem Mágica (na primeira vitória) e moedas.
// =========================

const FASE_REI = 100;          // índice especial da fase (as fases normais vão de 0 a 23)
const CHANCE_REI = 0.4;        // chance de aparecer na primeira entrada do dia
const NIVEL_REI = 15;
const TENTATIVAS_REI = 3;
const MOEDAS_REI = 300;

let reiNoite = 0;              // 0 = dia, 1 = noite de lua cheia (2ª fase)
let telaReiAberta = false;

DEF_CHEFES.reiMacaco = { hp: 36, margem: [24, 20, 24, 0] };
DEF_CHEFES.grandeMacaco = { hp: 60, margem: [26, 34, 26, 0] };
AURA_CHEFE.reiMacaco = { aura: "255,200,60", olho: "255,220,120", contorno: "#ffc83c" };
AURA_CHEFE.grandeMacaco = { aura: "255,40,40", olho: "255,40,40", contorno: "#ff2a2a" };
QUADROS_ATAQUE.reiMacaco = ["pancada", "estocada", "jogar1", "salto", "corre0", "corre1"];
QUADROS_ATAQUE.grandeMacaco = QUADROS_ATAQUE.gorila;
// O Grande Macaco luta como o Gorila Rei, mas sempre furioso
IA_CHEFES.grandeMacaco = function(c) { IA_CHEFES.gorila(c, true); };
QUADRO_CHEFE.grandeMacaco = QUADRO_CHEFE.gorila;


// ---------- Aparição do dia ----------

function hojeTexto() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

// Chamado uma vez quando o jogo abre
function sortearReiDoDia() {
  const hoje = hojeTexto();
  if (save.rei.dia === hoje) return;
  save.rei.dia = hoje;
  save.rei.ativo = save.nivel >= NIVEL_REI && Math.random() < CHANCE_REI;
  save.rei.tentativas = TENTATIVAS_REI;
  save.rei.anuncio = false;
  save.rei.vencido = false;
  salvar();
}

function reiDisponivel() {
  return save.rei.ativo && !save.rei.vencido;
}


// ---------- Aviso discreto no menu ----------

function atualizarAvisoRei() {
  const d = el("avisoRei");
  d.innerHTML = "";
  d.className = "";
  if (save.nivel < NIVEL_REI) {
    d.textContent = tr("Nível {0}+: um macaco lendário pode aparecer 1 vez por dia", NIVEL_REI);
    return;
  }
  if (save.rei.vencido) {
    d.textContent = tr("Você venceu o Rei Macaco hoje! Ele pode voltar amanhã.");
    return;
  }
  if (!save.rei.ativo) {
    d.textContent = tr("Volte amanhã: o Rei Macaco pode aparecer");
    return;
  }
  const b = document.createElement("button");
  b.tabIndex = -1;
  b.className = "botaoRei";
  if (save.rei.tentativas > 0) {
    b.textContent = tr("O Rei Macaco apareceu! Enfrentar ({0})", save.rei.tentativas);
    b.addEventListener("click", function() { iniciarAudio(); enfrentarRei(); });
  } else if (premiadoDisponivel() && !save.rei.anuncio) {
    b.textContent = tr("Rei Macaco: +3 tentativas (anúncio)");
    b.classList.add("anuncio");
    b.addEventListener("click", function() { iniciarAudio(); tentativasComAnuncio(); });
  } else {
    d.textContent = tr("Sem tentativas contra o Rei Macaco hoje. Volte amanhã!");
    return;
  }
  d.appendChild(b);
}


// ---------- Começar / perder / vencer ----------

function enfrentarRei() {
  if (!reiDisponivel()) return;
  if (save.rei.tentativas <= 0) { abrirTelaRei(); return; }
  fecharTelaRei();
  sairDoMenu(function() { iniciarFase(FASE_REI); });
}

// A arena é a do Gorila Rei (selva), marcada como secreta
function gerarFaseRei() {
  const f = gerarFase(FASES_POR_MUNDO - 1);
  f.indice = FASE_REI;
  f.secreta = true;
  return f;
}

function criarChefeRei() {
  save.rei.tentativas--;
  salvar();
  reiNoite = 0;
  const c = criarChefe(0);
  virarChefe(c, "reiMacaco", tr("Rei Macaco"));
  c.y = -c.h - 40;
  c.secreto = true;
  return c;
}

function virarChefe(c, tipo, nome) {
  const spr = SPR_CHEFE[tipo];
  const meio = c.x + c.w / 2;
  c.tipo = tipo;
  c.def = DEF_CHEFES[tipo];
  c.nome = nome;
  c.w = spr.w;
  c.h = spr.h;
  c.x = limitar(meio - c.w / 2, 0, LARGURA - c.w);
  c.hp = c.hpMax = c.def.hp;
  c.hpAtraso = c.hp;
  c.pousou = false;
  c.ultimo = "";
  atualizarCaixa(c);
}

function reiPerdeu() {
  mostrarMensagem(tr("O Rei Macaco venceu!"), tr("Tentativas restantes: {0}", save.rei.tentativas), 110, function() {
    intervaloComercial(function() {
      trocarCena(function() { voltarAoMenu(); abrirTelaRei(); });
    });
  });
}

function reiVencido() {
  const primeira = !temCosmetico("reiMacaco");
  save.moedas += MOEDAS_REI;
  save.rei.vencido = true;
  save.rei.vitorias = (save.rei.vitorias || 0) + 1;
  let sub = tr("+{0} moedas", MOEDAS_REI);
  if (primeira) {
    save.comprados.push("reiMacaco");
    if (!temMelhoria("nuvem")) save.melhorias.push("nuvem");
    sub = tr("Nova skin: Rei Macaco  ·  Nova melhoria: Nuvem Mágica  ·  +{0} moedas", MOEDAS_REI);
  }
  ganharXp(500);
  salvar();
  som("vitoria");
  mostrarMensagem(tr("Rei Macaco derrotado!"), sub, 240, function() {
    intervaloComercial(function() { trocarCena(voltarAoMenu); });
  });
}

function tentativasComAnuncio() {
  if (save.rei.anuncio) return;
  anuncioPremiado("medium", function(ok) {
    if (ok) {
      save.rei.anuncio = true;
      save.rei.tentativas += TENTATIVAS_REI;
      salvar();
    }
    atualizarTelas();
    if (telaReiAberta) renderizarTelaRei();
  });
}


// ---------- Tela depois de perder ----------

function abrirTelaRei() {
  telaReiAberta = true;
  renderizarTelaRei();
  atualizarTelas();
}

function fecharTelaRei() {
  telaReiAberta = false;
  atualizarTelas();
}

function renderizarTelaRei() {
  el("reiTentativas").textContent = tr("Tentativas restantes: {0}", save.rei.tentativas);
  el("btnReiDeNovo").style.display = save.rei.tentativas > 0 ? "" : "none";
  el("btnReiAnuncio").style.display = save.rei.tentativas <= 0 && premiadoDisponivel() && !save.rei.anuncio ? "" : "none";
  el("reiAmanha").style.display = save.rei.tentativas <= 0 && (save.rei.anuncio || !premiadoDisponivel()) ? "" : "none";
}


// ---------- Luta: 1ª fase (Rei Macaco) ----------

function reiEmCena() {
  return !!(chefe && chefe.cena);
}

IA_CHEFES.reiMacaco = function(c, raiva) {
  const j = jogador;
  switch (c.estado) {
    case "parado":
      olharProJogador(c);
      c.vx = aproximar(c.vx, 0, 0.4);
      // pulinhos no lugar
      if (c.noChao && c.t % 40 === 20) c.vy = -5;
      fisicaChefe(c);
      if (c.t > (raiva ? 34 : 54)) proximoAtaque(c, ["corrida", "salto", "estocada", "pessegos"]);
      break;

    case "corrida":
      if (c.t === 1) { olharProJogador(c); som("dash"); }
      if (c.t < 22) c.vx = 0;
      else {
        c.vx = c.dir * (raiva ? 12 : 10);
        if (tempo % 3 === 0) poeira(c.x + c.w / 2 - c.dir * 30, CHAO, 1);
      }
      fisicaChefe(c);
      if (c.t > 22 && c.batidaX) {
        irPara(c, "tonto");
        tremor = 14;
        som("pancada");
        c.vx = -c.dir * 3;
        c.vy = -6;
      } else if (c.t > 90) irPara(c, "parado");
      break;

    case "salto":
      if (c.t === 1) {
        olharProJogador(c);
        c.vy = -17;
        c.vx = limitar((alvoX(c) - c.x) / 44, -9, 9);
        som("pulo");
      }
      fisicaChefe(c);
      if (c.t > 5 && c.noChao) {
        c.vx = 0;
        tremor = 12;
        som("pancada");
        const meio = c.x + c.w / 2;
        projeteis.push({ tipo: "onda", x: meio - 50, y: CHAO - 30, w: 34, h: 30, vx: -7, vy: 0, vida: 240 });
        projeteis.push({ tipo: "onda", x: meio + 16, y: CHAO - 30, w: 34, h: 30, vx: 7, vy: 0, vida: 240 });
        poeira(meio, CHAO, 8);
        irPara(c, "aterrissou");
      }
      break;

    case "aterrissou":
      fisicaChefe(c);
      if (c.t > 18) irPara(c, "parado");
      break;

    // bastão que estica pela arena (dá para pular por cima)
    case "estocada":
      c.vx = 0;
      if (c.t === 1) olharProJogador(c);
      fisicaChefe(c);
      if (c.t === 24) som("laco");
      if (c.t >= 24 && c.t < 70) {
        const k = c.t < 44 ? (c.t - 24) / 20 : 1 - (c.t - 54) / 16;
        c.bastao = Math.max(0, Math.min(1, k)) * 520;
        const y = c.y + 19 * 3 - 6;
        const x0 = c.dir > 0 ? c.x + c.w - 6 : c.x + 6 - c.bastao;
        c.caixaBastao = { x: x0, y: y, w: c.bastao, h: 14 };
        if (!j.morto && c.bastao > 10 && encosta(j, c.caixaBastao)) machucar(c.x + c.w / 2);
      } else {
        c.bastao = 0;
        c.caixaBastao = null;
      }
      if (c.t > 76) irPara(c, "parado");
      break;

    case "pessegos":
      c.vx = 0;
      olharProJogador(c);
      fisicaChefe(c);
      if (c.t > 0 && c.t % 14 === 0 && c.t <= (raiva ? 70 : 42)) {
        const p = jogarNoJogador(c.x + c.w / 2 + c.dir * 30, c.y + 20, -11, 0.42, "pessego");
        p.vx += (Math.random() - 0.5) * 3;
        som("tiro");
      }
      if (c.t > 90) irPara(c, "parado");
      break;

    case "tonto":
      c.vx = aproximar(c.vx, 0, 0.25);
      fisicaChefe(c);
      if (c.t > 100) irPara(c, "parado");
      break;

    // ----- cutscene: cai a noite, nasce a lua cheia e ele vira o Grande Macaco -----
    case "lua":
      c.vx = 0;
      fisicaChefe(c);
      reiNoite = Math.min(1, c.t / 70);
      j.invencivel = Math.max(j.invencivel, 30);
      if (c.t === 1) {
        projeteis = projeteis.filter(function(p) { return p.doJogador; });
        cancelarLaco();
        som("vento");
      }
      if (c.t > 130) { irPara(c, "transforma"); som("rugido"); }
      break;

    case "transforma":
      c.vx = 0;
      fisicaChefe(c);
      j.invencivel = Math.max(j.invencivel, 30);
      tremor = Math.max(tremor, 4);
      c.flash = c.t % 10 < 4 ? 6 : 0;
      if (c.t % 12 === 0) {
        for (let i = 0; i < 10; i++) {
          particula({ tipo: "q", x: c.x + c.w / 2, y: c.y + c.h / 2, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9, g: 0, vida: 24, max: 24, cor: i % 2 ? "#ff3b3b" : "#ffd43b", tam: 7 });
        }
      }
      if (c.t > 110) {
        virarChefe(c, "grandeMacaco", tr("Grande Macaco"));
        c.y = CHAO - c.h - 120;
        c.vy = 0;
        c.cena = false;
        c.flash = 0;
        c.fase2 = true;
        tremor = 30;
        som("rugido");
        irPara(c, "entrada");
      }
      break;
  }
};

// Primeira barra esvaziou: começa a transformação (chamado pelo danoChefe)
function reiTransformar(c) {
  c.hp = 0;
  c.cena = true;
  c.bastao = 0;
  c.caixaBastao = null;
  irPara(c, "lua");
}

QUADRO_CHEFE.reiMacaco = function(c, raiva) {
  const t = c.t;
  const resp = Math.floor(tempo / 26) % 2 ? "parado1" : "parado0";
  switch (c.estado) {
    case "entrada":
      return c.pousou ? (t < 70 ? "pancada" : resp) : "salto";
    case "parado":
      return c.noChao ? resp : "salto";
    case "corrida":
      return t < 22 ? "pancada" : Math.floor(tempo / 5) % 2 ? "corre1" : "corre0";
    case "salto":
      return c.vy < 0 ? "salto" : "pancada";
    case "aterrissou":
      return "pancada";
    case "estocada":
      return t < 24 ? "parado1" : "estocada";
    case "pessegos": {
      const ph = t % 14;
      return ph < 5 && t > 0 ? "jogar1" : "jogar0";
    }
    case "tonto":
      return "tonto";
    case "lua":
      return "lua";
    case "transforma":
      return "transforma";
  }
  return "parado0";
};


// ---------- Desenho: bastão esticado, noite e lua cheia ----------

function desenharBastaoRei() {
  const c = chefe;
  if (!c || !c.caixaBastao || c.bastao <= 0) return;
  const b = c.caixaBastao;
  ctx.fillStyle = "#3a0606";
  ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, Math.round(b.w) + 4, b.h + 4);
  ctx.fillStyle = "#b52020";
  ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.round(b.w), b.h);
  ctx.fillStyle = "#e85a4a";
  ctx.fillRect(Math.round(b.x), Math.round(b.y) + 2, Math.round(b.w), 3);
  // ponta dourada
  const px = c.dir > 0 ? b.x + b.w - 14 : b.x;
  ctx.fillStyle = "#5c3a06";
  ctx.fillRect(Math.round(px) - 2, Math.round(b.y) - 4, 18, b.h + 8);
  ctx.fillStyle = "#f2b705";
  ctx.fillRect(Math.round(px), Math.round(b.y) - 2, 14, b.h + 4);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(Math.round(px), Math.round(b.y) - 2, 14, 3);
}

// Lua cheia (atrás do cenário da frente)
function desenharLuaRei() {
  if (!fase.secreta || reiNoite <= 0) return;
  ctx.fillStyle = "rgba(8,12,40," + (0.62 * reiNoite) + ")";
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  const y = 150 + (1 - reiNoite) * 120;
  luzAditiva(880, y, 220, "255,250,210", 0.35 * reiNoite);
  ctx.globalAlpha = reiNoite;
  ctx.fillStyle = "#fff8dc";
  ctx.beginPath();
  ctx.arc(880, y, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#efe2b4";
  [[862, y - 18, 12], [900, y + 10, 16], [872, y + 26, 8], [906, y - 24, 7]].forEach(function(m) {
    ctx.beginPath();
    ctx.arc(m[0], m[1], m[2], 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Noite por cima de tudo (menos o HUD), com faixas de cinema durante a transformação
function desenharNoiteRei() {
  if (!fase.secreta) return;
  if (reiNoite > 0) {
    ctx.fillStyle = "rgba(10,14,50," + (0.3 * reiNoite) + ")";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }
  if (reiEmCena()) {
    const k = Math.min(1, chefe.t / 20 + (chefe.estado === "transforma" ? 1 : 0));
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, LARGURA, Math.round(60 * k));
    ctx.fillRect(0, ALTURA - Math.round(60 * k), LARGURA, Math.round(60 * k));
    if (chefe.estado === "lua" && chefe.t > 40) {
      ctx.globalAlpha = Math.min(1, (chefe.t - 40) / 20);
      ctx.font = "bold 34px " + FONTE;
      ctx.textAlign = "center";
      textoSombra(tr("A lua cheia nasceu..."), LARGURA / 2, ALTURA - 18, ["#fff9c4", "#ffd43b"], 3);
      ctx.globalAlpha = 1;
    }
  }
}


// ---------- Telas e botões ----------

document.querySelectorAll("[data-acao-rei]").forEach(function(b) {
  b.tabIndex = -1;
  b.addEventListener("click", function() {
    iniciarAudio();
    const a = b.dataset.acaoRei;
    if (a === "deNovo") enfrentarRei();
    else if (a === "anuncio") tentativasComAnuncio();
    else if (a === "fechar") fecharTelaRei();
  });
});

sortearReiDoDia();
