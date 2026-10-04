"use strict";

// =========================
// CHEFE SECRETO: SARU (aparece no máximo 1 vez por dia)
// - Só para quem está no nível 15 ou mais.
// - Na primeira vez que a pessoa abre o jogo no dia, há uma chance dele aparecer.
// - Cada aparição dá 3 tentativas; acabou, um anúncio premiado dá mais 3 (uma vez).
// - 1ª barra de vida: Saru (teleporte com voadora, rajada de energia, nuvem voadora, bastão que estica).
//   Quando esvazia, cai a noite, nasce a lua cheia e ele vira o Saru Gigante (2ª barra, mais forte:
//   raio pela boca que explode o chão, pisão com chuva de pedras, palmas com ondas de choque e varrida).
// - Vencer dá a skin Saru e a melhoria Nuvem Mágica (na primeira vitória) e moedas.
// (Os ids internos continuam "reiMacaco" / "grandeMacaco".)
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
QUADROS_ATAQUE.reiMacaco = ["chute", "carrega", "rajada", "estocada", "corre0", "corre1"];
QUADROS_ATAQUE.grandeMacaco = ["rugido", "sopro", "pisao2", "palmas1", "varrida1"];


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
    d.textContent = tr("Você venceu o Saru hoje! Ele pode voltar amanhã.");
    return;
  }
  if (!save.rei.ativo) {
    d.textContent = tr("Volte amanhã: o Saru pode aparecer");
    return;
  }
  const b = document.createElement("button");
  b.tabIndex = -1;
  b.className = "botaoRei";
  if (save.rei.tentativas > 0) {
    b.textContent = tr("O Saru apareceu! Enfrentar ({0})", save.rei.tentativas);
    b.addEventListener("click", function() { iniciarAudio(); enfrentarRei(); });
  } else if (premiadoDisponivel() && !save.rei.anuncio) {
    b.textContent = tr("Saru: +3 tentativas (anúncio)");
    b.classList.add("anuncio");
    b.addEventListener("click", function() { iniciarAudio(); tentativasComAnuncio(); });
  } else {
    d.textContent = tr("Sem tentativas contra o Saru hoje. Volte amanhã!");
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
  // plataformas: ajudam a desviar e a pular na cabeça do gigante
  fPlat(f, 150, 440, 160);
  fPlat(f, 890, 440, 160);
  fPlat(f, 520, 320, 160);
  return f;
}

function criarChefeRei() {
  save.rei.tentativas--;
  salvar();
  reiNoite = 0;
  const c = criarChefe(0);
  virarChefe(c, "reiMacaco", tr("Saru"));
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
  mostrarMensagem(tr("O Saru venceu!"), tr("Tentativas restantes: {0}", save.rei.tentativas), 110, function() {
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
    sub = tr("Nova skin: Saru  ·  Nova melhoria: Nuvem Mágica  ·  +{0} moedas", MOEDAS_REI);
  }
  ganharXp(500);
  salvar();
  som("vitoria");
  mostrarMensagem(tr("Saru derrotado!"), sub, 240, function() {
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


// ---------- Luta: 1ª fase (Saru) ----------

function reiEmCena() {
  return !!(chefe && chefe.cena);
}

// Ponto da mão da frente (em pixels da tela) no quadro atual
function maoDoSaru(c, quadro) {
  const fr = SPR_CHEFE.reiMacaco.q[quadro] || SPR_CHEFE.reiMacaco;
  const m = fr.maos ? fr.maos[1] : [24, 20];
  return { x: c.x + (c.dir > 0 ? m[0] * 3 : c.w - m[0] * 3), y: c.y + m[1] * 3 };
}

IA_CHEFES.reiMacaco = function(c, raiva) {
  const j = jogador;
  switch (c.estado) {
    case "parado":
      olharProJogador(c);
      c.vx = aproximar(c.vx, 0, 0.4);
      if (c.noChao && c.t % 40 === 20) c.vy = -5;
      fisicaChefe(c);
      if (c.t > (raiva ? 34 : 54)) proximoAtaque(c, ["teleporte", "rajada", "nuvem", "estocada"]);
      break;

    // some, reaparece atrás do jogador e dá uma voadora
    case "teleporte":
      c.vx = 0;
      if (c.t <= 12) {
        c.alfa = 1 - c.t / 12;
        c.sumido = c.t > 4;
        if (c.t === 1) som("dash");
      }
      if (c.t === 12) {
        const atras = j.dir > 0 ? -1 : 1;
        c.x = limitar(j.x + j.w / 2 + atras * 150 - c.w / 2, 0, LARGURA - c.w);
        olharProJogador(c);
        for (let i = 0; i < 10; i++) {
          particula({ tipo: "q", x: c.x + c.w / 2, y: c.y + c.h / 2, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, g: 0, vida: 18, max: 18, cor: "#a5d8ff", tam: 6 });
        }
      }
      if (c.t > 12 && c.t <= 24) {
        c.alfa = (c.t - 12) / 12;
        c.sumido = c.t < 18;
      }
      if (c.t > 24) {
        c.alfa = 1;
        c.sumido = false;
        c.vx = c.dir * (raiva ? 13 : 11);
        if (tempo % 3 === 0) poeira(c.x + c.w / 2 - c.dir * 30, CHAO, 1);
      }
      fisicaChefe(c);
      if (c.t > 26 && c.batidaX) {
        irPara(c, "tonto");
        tremor = 14;
        som("pancada");
        c.vx = -c.dir * 3;
        c.vy = -6;
      } else if (c.t > 50) irPara(c, "parado");
      break;

    // junta energia nas mãos e solta uma rajada que atravessa a arena (pule por cima)
    case "rajada": {
      c.vx = 0;
      fisicaChefe(c);
      const carga = raiva ? 38 : 52;
      if (c.t === 1) { olharProJogador(c); som("poder"); }
      if (c.t < carga) {
        c.carga = c.t / carga;
        if (c.t % 4 === 0) {
          const m = maoDoSaru(c, "carrega");
          const a = Math.random() * Math.PI * 2;
          particula({ tipo: "q", x: m.x + Math.cos(a) * 40, y: m.y + Math.sin(a) * 40, vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 3, g: 0, vida: 13, max: 13, cor: "#a5d8ff", tam: 5 });
        }
      } else if (c.t === carga) {
        c.carga = 0;
        const m = maoDoSaru(c, "rajada");
        c.feixe = { x0: m.x, y: m.y - 17, h: 34, t: 0 };
        tremor = 10;
        som("nuke");
      }
      if (c.feixe) {
        const f = c.feixe;
        f.t++;
        const alcance = Math.min(1, f.t / 6) * LARGURA;
        f.x = c.dir > 0 ? f.x0 : f.x0 - alcance;
        f.w = alcance;
        if (!j.morto && f.t > 2 && f.t < 34 && encosta(j, { x: f.x, y: f.y + 4, w: f.w, h: f.h - 8 })) machucar(c.x + c.w / 2);
        if (f.t > 40) c.feixe = null;
      }
      if (c.t > carga + 40) irPara(c, "cansado");
      break;
    }

    case "cansado":
      c.vx = aproximar(c.vx, 0, 0.3);
      fisicaChefe(c);
      if (c.t > 46) irPara(c, "parado");
      break;

    // sobe numa nuvem dourada, cruza a arena e solta esferas de energia
    case "nuvem": {
      if (c.t === 1) { c.voando = true; c.vy = 0; som("vento"); }
      const alto = 120;
      if (c.t < 40) {
        c.y += (alto - c.y) * 0.08;
      } else if (c.t < 230) {
        if (!c.vx) c.vx = (c.x + c.w / 2 < LARGURA / 2 ? 1 : -1) * 3.6;
        c.x += c.vx;
        if (c.x < 10 || c.x > LARGURA - c.w - 10) c.vx = -c.vx;
        c.dir = c.vx > 0 ? 1 : -1;
        c.y = alto + Math.sin(c.t * 0.08) * 8;
        if (c.t % (raiva ? 22 : 30) === 0) {
          projeteis.push({ tipo: "esfera", x: c.x + c.w / 2 - 12, y: c.y + c.h, w: 24, h: 24, vx: limitar((j.x - c.x) / 120, -2, 2), vy: 1, g: 0.22, vida: 300, quebraNoChao: true });
          som("tiro");
        }
      } else {
        c.vx = 0;
        c.voando = false;
        fisicaChefe(c);
        if (c.noChao) irPara(c, "parado");
      }
      break;
    }

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

    case "tonto":
      c.vx = aproximar(c.vx, 0, 0.25);
      fisicaChefe(c);
      if (c.t > 100) irPara(c, "parado");
      break;

    // ----- cutscene: cai a noite, nasce a lua cheia e ele vira o Saru Gigante -----
    case "lua":
      c.vx = 0;
      c.voando = false;
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
        virarChefe(c, "grandeMacaco", tr("Saru Gigante"));
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
  c.feixe = null;
  c.carga = 0;
  c.alfa = 1;
  c.sumido = false;
  irPara(c, "lua");
}

QUADRO_CHEFE.reiMacaco = function(c, raiva) {
  const t = c.t;
  const resp = Math.floor(tempo / 26) % 2 ? "parado1" : "parado0";
  switch (c.estado) {
    case "entrada":
      return c.pousou ? (t < 70 ? "rajada" : resp) : "salto";
    case "parado":
      return c.noChao ? resp : "salto";
    case "teleporte":
      return t > 24 ? "chute" : resp;
    case "rajada":
      return c.feixe ? "rajada" : "carrega";
    case "cansado":
      return Math.floor(tempo / 12) % 2 ? "parado1" : "carrega";
    case "nuvem":
      return c.voando ? "nuvem" : "salto";
    case "estocada":
      return t < 24 ? "parado1" : "estocada";
    case "tonto":
      return "tonto";
    case "lua":
      return "lua";
    case "transforma":
      return "transforma";
  }
  return "parado0";
};


// ---------- Luta: 2ª fase (Saru Gigante) ----------

function bocaDoGigante(c) {
  const fr = SPR_CHEFE.grandeMacaco.q.sopro;
  return { x: c.x + (c.dir > 0 ? fr.boca[0] * 3 : c.w - fr.boca[0] * 3), y: c.y + fr.boca[1] * 3 };
}

IA_CHEFES.grandeMacaco = function(c, raiva) {
  const j = jogador;
  switch (c.estado) {
    case "parado":
      olharProJogador(c);
      c.vx = Math.abs(alvoX(c) - c.x) > 220 ? aproximar(c.vx, c.dir * 1.3, 0.15) : aproximar(c.vx, 0, 0.3);
      fisicaChefe(c);
      if (c.t > (raiva ? 38 : 58)) proximoAtaque(c, ["sopro", "pisao", "palmas", "varrida"]);
      break;

    // raio pela boca: acerta o chão perto dele e a explosão vai correndo até a parede (pule por cima)
    case "sopro": {
      c.vx = 0;
      fisicaChefe(c);
      if (c.t === 1) { olharProJogador(c); som("rugido"); }
      const carga = raiva ? 34 : 46;
      if (c.t === carga) {
        c.rastro = { x: c.x + c.w / 2 + c.dir * 120, dir: c.dir };
        tremor = 12;
        som("nuke");
      }
      if (c.rastro) {
        const r = c.rastro;
        r.x += r.dir * (raiva ? 10 : 8.5);
        if (tempo % 2 === 0) {
          particula({ tipo: "q", x: r.x + (Math.random() - 0.5) * 30, y: CHAO - Math.random() * 30, vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 4, g: 0.3, vida: 26, max: 26, cor: Math.random() < 0.5 ? "#ff6b6b" : "#ffd43b", tam: 9 });
        }
        if (!j.morto && encosta(j, { x: r.x - 28, y: CHAO - 80, w: 56, h: 80 })) machucar(r.x);
        if (r.x < -40 || r.x > LARGURA + 40) c.rastro = null;
      }
      if (c.t > carga && !c.rastro) irPara(c, "parado");
      break;
    }

    // pisão: o chão treme e caem pedras do céu
    case "pisao":
      c.vx = 0;
      fisicaChefe(c);
      if (c.t === 1) olharProJogador(c);
      if (c.t === 30) {
        tremor = 26;
        som("pancada");
        poeira(c.x + c.w / 2, CHAO, 12);
        chuvaDoCeu(raiva ? 6 : 4, "pedra", 44, 44);
      }
      if (c.t > 76) irPara(c, "parado");
      break;

    // palmas: onda de choque alta (deslize por baixo) e, furioso, uma baixa (pule)
    case "palmas":
      c.vx = 0;
      fisicaChefe(c);
      if (c.t === 1) olharProJogador(c);
      if (c.t === 30 || (raiva && c.t === 70)) {
        const baixa = c.t === 70;
        const y = baixa ? CHAO - 46 : CHAO - 104;
        c.ondas = c.ondas || [];
        c.ondas.push({ x: c.x + c.w / 2, y: y, h: 46, dir: 1, vida: 140 });
        c.ondas.push({ x: c.x + c.w / 2, y: y, h: 46, dir: -1, vida: 140 });
        tremor = 12;
        som("pancada");
      }
      if (c.t > (raiva ? 104 : 64)) irPara(c, "parado");
      break;

    // varrida rente ao chão: depois o punho fica preso e ele fica tonto
    case "varrida":
      c.vx = 0;
      fisicaChefe(c);
      if (c.t === 1) { olharProJogador(c); som("rugido"); }
      if (c.t >= 26 && c.t < 44) {
        const alc = 150 + (c.t - 26) * 14;
        const x = c.dir > 0 ? c.x + c.w * 0.55 : c.x + c.w * 0.45 - alc;
        c.caixaVarrida = { x: x, y: CHAO - 56, w: alc, h: 56 };
        if (!j.morto && encosta(j, c.caixaVarrida)) machucar(c.x + c.w / 2);
        if (tempo % 2 === 0) poeira(c.dir > 0 ? x + alc : x, CHAO, 2);
      } else {
        c.caixaVarrida = null;
      }
      if (c.t === 44) {
        tremor = 18;
        som("pancada");
        irPara(c, "tonto");
      }
      break;

    case "tonto":
      c.vx = 0;
      fisicaChefe(c);
      if (c.t > 90) irPara(c, "parado");
      break;
  }

  // ondas de choque das palmas andam pela arena
  if (c.ondas) {
    c.ondas = c.ondas.filter(function(o) {
      o.x += o.dir * 8;
      o.vida--;
      if (!j.morto && encosta(j, { x: o.x - 18, y: o.y, w: 36, h: o.h })) machucar(o.x);
      return o.vida > 0 && o.x > -60 && o.x < LARGURA + 60;
    });
  }
};

QUADRO_CHEFE.grandeMacaco = function(c, raiva) {
  const t = c.t;
  const resp = Math.floor(tempo / 26) % 2 ? "parado1" : "parado0";
  switch (c.estado) {
    case "entrada":
      return c.pousou ? (t < 80 ? "rugido" : resp) : "pisao";
    case "parado":
      if (Math.abs(c.vx) > 0.5) return Math.floor(tempo / 9) % 2 ? "andar1" : "andar0";
      return resp;
    case "sopro":
      return c.rastro || t < 10 ? "sopro" : "rugido";
    case "pisao":
      return t < 30 ? "pisao" : t < 44 ? "pisao2" : resp;
    case "palmas":
      return (t >= 26 && t < 40) || (t >= 66 && t < 80) ? "palmas1" : "palmas0";
    case "varrida":
      return t < 26 ? "varrida0" : "varrida1";
    case "tonto":
      return "tonto";
  }
  return "parado0";
};


// ---------- Desenho: efeitos das duas fases, noite e lua cheia ----------

function desenharExtrasRei() {
  const c = chefe;
  if (!c || !fase.secreta) return;

  // nuvem dourada debaixo do Saru
  if (c.voando) {
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h - 6;
    luzAditiva(cx, cy, 90, "255,215,90", 0.3);
    ctx.fillStyle = "#c78a12";
    [[-40, 6, 22], [-12, 0, 28], [20, 4, 24], [44, 8, 16]].forEach(function(n) { ctx.beginPath(); ctx.arc(cx + n[0], cy + n[1], n[2] + 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#ffd43b";
    [[-40, 6, 22], [-12, 0, 28], [20, 4, 24], [44, 8, 16]].forEach(function(n) { ctx.beginPath(); ctx.arc(cx + n[0], cy + n[1], n[2], 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#fff3bf";
    [[-16, -6, 12], [16, -3, 9]].forEach(function(n) { ctx.beginPath(); ctx.arc(cx + n[0], cy + n[1], n[2], 0, Math.PI * 2); ctx.fill(); });
  }

  // energia juntando nas mãos
  if (c.carga > 0) {
    const m = maoDoSaru(c, "carrega");
    const r = 8 + c.carga * 22 + Math.sin(tempo * 0.6) * 3;
    luzAditiva(m.x, m.y, r * 3, "120,190,255", 0.5);
    ctx.fillStyle = "#a5d8ff";
    ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(m.x, m.y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  // rajada de energia
  if (c.feixe && c.feixe.w > 0) {
    const f = c.feixe;
    const some = f.t > 30 ? 1 - (f.t - 30) / 10 : 1;
    const h = f.h * (0.8 + Math.sin(tempo * 0.8) * 0.12) * some;
    const yc = f.y + f.h / 2;
    luzAditiva(f.x + f.w / 2, yc, Math.max(120, f.w / 2), "90,170,255", 0.35 * some);
    ctx.fillStyle = "rgba(28,110,230," + (0.9 * some) + ")";
    ctx.fillRect(Math.round(f.x), Math.round(yc - h / 2 - 4), Math.round(f.w), Math.round(h + 8));
    ctx.fillStyle = "rgba(165,216,255," + some + ")";
    ctx.fillRect(Math.round(f.x), Math.round(yc - h / 2), Math.round(f.w), Math.round(h));
    ctx.fillStyle = "rgba(255,255,255," + some + ")";
    ctx.fillRect(Math.round(f.x), Math.round(yc - h / 4), Math.round(f.w), Math.round(h / 2));
  }

  // bastão esticado
  if (c.caixaBastao && c.bastao > 0) {
    const b = c.caixaBastao;
    ctx.fillStyle = "#3a0606";
    ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, Math.round(b.w) + 4, b.h + 4);
    ctx.fillStyle = "#b52020";
    ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.round(b.w), b.h);
    ctx.fillStyle = "#e85a4a";
    ctx.fillRect(Math.round(b.x), Math.round(b.y) + 2, Math.round(b.w), 3);
    const px = c.dir > 0 ? b.x + b.w - 14 : b.x;
    ctx.fillStyle = "#5c3a06";
    ctx.fillRect(Math.round(px) - 2, Math.round(b.y) - 4, 18, b.h + 8);
    ctx.fillStyle = "#f2b705";
    ctx.fillRect(Math.round(px), Math.round(b.y) - 2, 14, b.h + 4);
  }

  // raio da boca do gigante até a explosão no chão
  if (c.estado === "sopro") {
    const boca = bocaDoGigante(c);
    const carga = c.rastro ? 1 : Math.min(1, c.t / 40);
    luzAditiva(boca.x, boca.y, 30 + carga * 40, "255,70,50", 0.45 * carga);
    if (c.rastro) {
      const r = c.rastro;
      ctx.strokeStyle = "rgba(255,90,60,0.85)";
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(boca.x, boca.y); ctx.lineTo(r.x, CHAO - 10); ctx.stroke();
      ctx.strokeStyle = "rgba(255,240,200,0.95)";
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(boca.x, boca.y); ctx.lineTo(r.x, CHAO - 10); ctx.stroke();
      luzAditiva(r.x, CHAO - 30, 90, "255,120,40", 0.55);
      ctx.fillStyle = "#ff6b00";
      ctx.fillRect(Math.round(r.x - 26), CHAO - 50, 52, 50);
      ctx.fillStyle = "#ffd43b";
      ctx.fillRect(Math.round(r.x - 16), CHAO - 40, 32, 40);
      ctx.fillStyle = "#fff3bf";
      ctx.fillRect(Math.round(r.x - 8), CHAO - 30, 16, 30);
    }
  }

  // ondas de choque das palmas: meia-lua de ar brilhante andando para os lados
  if (c.ondas) {
    c.ondas.forEach(function(o) {
      const a = Math.min(1, o.vida / 30);
      const cy = o.y + o.h / 2;
      const ini = o.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const fim = o.dir > 0 ? Math.PI / 2 : Math.PI * 1.5;
      luzAditiva(o.x, cy, 50, "170,210,255", 0.35 * a);
      ctx.fillStyle = "rgba(200,230,255," + (0.28 * a) + ")";
      ctx.beginPath(); ctx.ellipse(o.x, cy, 24, o.h / 2 + 4, 0, ini, fim); ctx.fill();
      ctx.strokeStyle = "rgba(240,250,255," + (0.95 * a) + ")";
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(o.x, cy, 24, o.h / 2 + 4, 0, ini, fim); ctx.stroke();
      ctx.strokeStyle = "rgba(120,180,255," + (0.8 * a) + ")";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(o.x - o.dir * 14, cy, 16, o.h / 2 - 4, 0, ini, fim); ctx.stroke();
    });
  }

  // varrida: rastro de poeira rente ao chão
  if (c.caixaVarrida) {
    const v = c.caixaVarrida;
    ctx.fillStyle = "rgba(233,227,213,0.35)";
    ctx.fillRect(Math.round(v.x), CHAO - 24, Math.round(v.w), 24);
  }
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

// Saru sumindo/reaparecendo no teleporte: pisca enquanto está meio transparente
function chefeVisivel() {
  const c = chefe;
  if (!c || c.alfa === undefined || c.alfa >= 1) return true;
  if (c.alfa < 0.15) return false;
  return Math.floor(tempo / 2) % 2 === 0;
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
