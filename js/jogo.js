"use strict";

// =========================
// NÚCLEO DO JOGO: jogador, inimigos, perigos, poderes e desenho da fase
// =========================

const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Celular em pé: o canvas fica mais alto (o jogo continua nos 700 de cima e embaixo vem o
// painel com os controles grandes). Quem ajusta é o ajustarTela (main.js).
let modoRetrato = false;
let alturaTela = ALTURA;
let zoomRetrato = 1;     // em pé, as fases aparecem ampliadas (o macaco fica maior); chefes não

function zoomJogo() {
  return modoRetrato && estado === "jogo" && fase && !fase.ehChefe ? zoomRetrato : 1;
}

// Largura do mundo que cabe na tela (menor quando ampliado)
function larguraVista() {
  return LARGURA / zoomJogo();
}

// Onde começa o painel de controles (modo em pé)
function topoPainel() {
  return ALTURA * zoomRetrato;
}

const GRAV = 0.7;
const PULO = -14.5;
const SUPER_PULO = -23;
const VEL = 5;
const MAX_QUEDA = 16;

let estado = "menu";      // menu | intro | jogo | final
let pausado = false;      // pausa ou loja aberta durante a fase
let fase = null;
let jogador = null;
let inimigos = [];
let projeteis = [];
let particulas = [];
let chefe = null;
let banana = null;
let mensagem = null;
let cameraX = 0;
let tremor = 0;
let tempo = 0;
let checkpointX = null;
let moedasNaFase = 0;
let flashNuke = 0;
let flashDano = 0;
let sujo = false;          // tem coisa para salvar

const buffs = { velocidade: 0, puloDuplo: 0, escudo: 0, ima: 0 };
const recargas = { velocidade: 0, puloDuplo: 0, escudo: 0, ima: 0, nuke: 0 };

// Teclas seguradas e teclas apertadas (consumidas pela física)
const teclas = { esquerda: false, direita: false, baixo: false, pulo: false };
const apertos = new Set();

function consumir(acao) {
  if (apertos.has(acao)) {
    apertos.delete(acao);
    return true;
  }
  return false;
}

// Padrões de tile (para pintar chão e blocos de qualquer tamanho)
const PADROES = {};
function padrao(nome) {
  const chave = fase.mundo + nome;
  if (!PADROES[chave]) PADROES[chave] = ctx.createPattern(TEMAS[fase.mundo][nome], "repeat");
  return PADROES[chave];
}

function vidasMax() {
  return 3 + (temMelhoria("coracao1") ? 1 : 0) + (temMelhoria("coracao2") ? 1 : 0);
}


// =========================
// COMEÇAR FASE
// =========================

function iniciarFase(indice, doCheckpoint) {
  if (!doCheckpoint) { checkpointX = null; danoNaTentativa = false; }
  resultadoFase = null;
  fase = indice === FASE_REI ? gerarFaseRei() : indice === FASE_TUTORIAL ? gerarTutorial() : gerarFase(indice);
  inimigos = fase.inimigos.map(criarInimigo);
  projeteis = [];
  particulas = [];
  mensagem = null;
  tempo = 0;
  moedasNaFase = 0;
  flashNuke = 0;
  flashDano = 0;
  tremor = 0;
  particulasHud = [];

  if (doCheckpoint && checkpointX !== null) {
    fase.checkpoints.forEach(function(c) { if (c.x <= checkpointX) c.ativo = true; });
  }
  const x0 = doCheckpoint && checkpointX !== null ? checkpointX : fase.inicioX;
  jogador = criarJogador(x0, CHAO - 72);

  chefe = fase.ehChefe ? (fase.secreta ? criarChefeRei() : criarChefe(fase.mundo)) : null;
  banana = criarBananaDaFase();

  cameraX = limitar(jogador.x - larguraVista() * 0.4, 0, Math.max(0, fase.largura - larguraVista()));
  estado = "jogo";
  pausado = false;
  apertos.clear();
  if (!doCheckpoint) mostrarCartaoFase();
  cronInicioFase(indice, doCheckpoint);
  medir("level", nomeNivel(), "start");   // cada tentativa (também ao voltar do checkpoint)
  if (typeof atualizarTelas === "function") atualizarTelas();
}

function mostrarMensagem(titulo, sub, duracao, depois, congela) {
  mensagem = { titulo: titulo, sub: sub || "", t: 0, duracao: duracao, depois: depois, congela: congela !== false };
}

function atualizarMensagem() {
  if (!mensagem) return false;
  mensagem.t++;
  if (mensagem.t >= mensagem.duracao) {
    const depois = mensagem.depois;
    mensagem = null;
    if (depois) depois();
    return false;
  }
  return mensagem.congela;
}


// =========================
// JOGADOR
// =========================

function criarJogador(x, y) {
  return {
    x: x, y: y, w: 48, h: 72, vx: 0, vy: 0, dir: 1,
    noChao: false, chao: null, batidaX: 0, pesAntes: y + 72,
    coyote: 0, bufferPulo: 0, pulouNormal: false, pulosExtras: 1,
    vidas: vidasMax(), invencivel: 0, morto: 0, giro: 0, esticar: 0, passos: 0,
    deslizando: false, noAr: 0,
    cipo: null, cipoR: 0, cipoTh: 0, cipoW: 0, soltouCipo: 0,
    dash: 0, recargaDash: 0, dashNoAr: true,
    laco: null, recargaLaco: 0, chute: 0,

    afundar: 0, sobreGeiser: false, brilho: 0,
    seguro: { x: x, y: y, chao: null },
    travado: 0                      // depois de voltar de um buraco: segura o macaco parado um instante
  };
}

// Volta para o chão seguro LONGE da beirada (antes voltava a 2px dela: segurando pra frente,
// caía de novo em meio segundo e perdia todas as vidas sem conseguir reagir).
// Também segura o macaco parado por um instante, para dar tempo de soltar o direcional.
const FOLGA_BEIRADA = 150;
function voltarProSeguro(j) {
  const s = j.seguro;
  const indoPraDireita = j.x >= s.x;
  let x = s.x;
  const c = s.chao;
  if (c && c.w !== undefined) {
    const min = c.x + 12;
    const max = c.x + c.w - j.w - 12;
    if (max - min < FOLGA_BEIRADA * 2) x = (min + max) / 2;       // chão curto: volta no meio dele
    else if (indoPraDireita) x = Math.min(x, max - FOLGA_BEIRADA);
    else x = Math.max(x, min + FOLGA_BEIRADA);
    x = limitar(x, min, Math.max(min, max));
  }
  j.x = x;
  j.y = s.y;
  j.vx = 0;
  j.vy = 0;
  j.travado = 40;
}

function caixaJogador() {
  const j = jogador;
  return { x: j.x + 6, y: j.y + 6, w: j.w - 12, h: j.h - 8 };
}

// Move um corpo (jogador ou inimigo) batendo nos blocos
function moverCorpo(c, usaPlataformas) {
  const solidos = fase.solidos;

  c.x += c.vx;
  c.batidaX = 0;
  for (let i = 0; i < solidos.length; i++) {
    const s = solidos[i];
    if (encosta(c, s)) {
      if (c.vx > 0) { c.x = s.x - c.w; c.batidaX = 1; }
      else if (c.vx < 0) { c.x = s.x + s.w; c.batidaX = -1; }
      c.vx = 0;
    }
  }

  const pesAntes = c.y + c.h;
  c.y += c.vy;
  c.noChao = false;
  c.chao = null;
  for (let i = 0; i < solidos.length; i++) {
    const s = solidos[i];
    if (encosta(c, s)) {
      if (c.vy > 0) { c.y = s.y - c.h; c.noChao = true; c.chao = s; }
      else if (c.vy < 0) { c.y = s.y + s.h; }
      c.vy = 0;
    }
  }

  if (usaPlataformas && c.vy >= 0) {
    const pl = fase.plataformas;
    for (let i = 0; i < pl.length; i++) {
      const p = pl[i];
      if (p.caiu) continue;
      if (c.x + c.w > p.x && c.x < p.x + p.w && pesAntes <= p.y + 0.5 && c.y + c.h >= p.y) {
        c.y = p.y - c.h;
        c.vy = 0;
        c.noChao = true;
        c.chao = p;
      }
    }
  }
}

function temChao(x, y) {
  const s = fase.solidos;
  for (let i = 0; i < s.length; i++) {
    if (x >= s[i].x && x <= s[i].x + s[i].w && y >= s[i].y && y <= s[i].y + s[i].h) return true;
  }
  const p = fase.plataformas;
  for (let i = 0; i < p.length; i++) {
    if (!p[i].caiu && x >= p[i].x && x <= p[i].x + p[i].w && y >= p[i].y - 2 && y <= p[i].y + 12) return true;
  }
  return false;
}

function solidoNaCaixa(c) {
  const s = fase.solidos;
  for (let i = 0; i < s.length; i++) if (encosta(c, s[i])) return true;
  return false;
}

function atualizarJogador() {
  const j = jogador;
  const apertouPulo = consumir("pulo");
  const apertouLaco = consumir("laco");
  const apertouDash = consumir("dash");

  if (j.morto) {
    j.morto++;
    j.vy = Math.min(j.vy + 0.5, 14);
    j.y += j.vy;
    j.giro += 0.12;
    if (j.morto === 110) perdeuTudo();
    return;
  }
  if (j.saindo) { correrSaindo(j); return; }

  // Temporizadores
  if (j.invencivel > 0) j.invencivel--;
  if (j.recargaDash > 0) j.recargaDash--;
  if (j.recargaLaco > 0) j.recargaLaco--;
  if (j.chute > 0) j.chute--;
  if (j.soltouCipo > 0) j.soltouCipo--;
  if (j.giro > 0) { j.giro += 0.26; if (j.giro >= Math.PI * 2) j.giro = 0; }
  j.esticar *= 0.82;
  if (Math.abs(j.esticar) < 0.02) j.esticar = 0;
  if (j.bufferPulo > 0) j.bufferPulo--;
  if (apertouPulo) j.bufferPulo = 7;

  // Ações
  if (!j.comemorar) {
    if (apertouLaco) lancarLaco();
    if (apertouDash) iniciarDash();
  }
  if (j.laco) atualizarLaco();

  let dir = (teclas.direita ? 1 : 0) - (teclas.esquerda ? 1 : 0);
  if (j.travado > 0) { j.travado--; dir = 0; }

  // Comemorando no fim da fase: pulinhos de alegria
  if (j.comemorar > 0) {
    j.comemorar--;
    dir = 0;
    j.bufferPulo = 0;
    if (j.noChao && j.comemorar % 28 === 0) { j.vy = -8; j.esticar = 1; }
  }

  // Pendurado no cipó
  if (j.cipo) {
    balancar(dir);
    posMovimento();
    return;
  }

  if ((j.laco && j.laco.estado === "puxando") || j.chute > 0) dir = 0;

  const estavaNoChao = j.noChao;
  const emGelo = j.noChao && j.chao && j.chao.gelo;
  const naAreia = j.afundar > 0 && j.noChao;

  // Plataforma móvel carrega o macaco
  if (j.noChao && j.chao && j.chao.dx !== undefined) {
    j.x += j.chao.dx;
    j.y += j.chao.dy;
  }

  if (j.dash > 0) {
    j.dash--;
    j.vx = j.dir * 15;
    j.vy = 0;
    if (j.dash % 2 === 0) fantasma(0.5);
    if (j.dash === 0) j.vx = j.dir * 6;
  } else {

    // ----- Deslizar -----
    if (teclas.baixo && j.noChao && !j.deslizando && Math.abs(j.vx) > 2) iniciarDeslize();

    if (j.deslizando) {
      if (emGelo) {
        if (dir && dir === Math.sign(j.vx)) j.vx = aproximar(j.vx, dir * 9.5, 0.15);
        else if (dir) j.vx = aproximar(j.vx, 0, 0.12);
        if (tempo % 3 === 0) particula({ tipo: "q", x: j.x + j.w / 2 - j.dir * 20, y: j.y + j.h, vx: -j.dir * 2, vy: -1.5, g: 0.1, vida: 18, max: 18, cor: "#e7f5ff", tam: 5 });
      } else {
        j.vx = aproximar(j.vx, 0, j.noChao ? 0.16 : 0.02);
        if (j.noChao && tempo % 4 === 0) poeira(j.x + j.w / 2 - j.dir * 20, j.y + j.h, 1);
      }
      if (Math.abs(j.vx) < 1.5 && dir) j.vx = dir * 2;   // engatinhando
      if (j.vx !== 0) j.dir = Math.sign(j.vx);
      const querLevantar = !teclas.baixo || (Math.abs(j.vx) < 1.5 && !dir);
      if (querLevantar && podeLevantar()) levantar();
      if (!j.noChao) { j.noAr++; if (j.noAr > 12 && podeLevantar()) levantar(); } else j.noAr = 0;
    } else {
      // ----- Andar -----
      let max = VEL * (buffs.velocidade > 0 ? 1.6 : 1);
      if (naAreia) max = 1.8;
      const acel = emGelo ? 0.2 : 0.5;
      const atrito = emGelo ? 0.08 : (j.noChao ? 0.7 : 0.4);
      const vento = ventoNoJogador();
      if (vento && dir === -vento) max *= 0.45;   // andar contra o vento é difícil
      if (dir) {
        if (j.vx * dir > max) j.vx = aproximar(j.vx, dir * max, j.noChao ? 0.3 : 0.04);
        else j.vx = aproximar(j.vx, dir * max, j.vx * dir < 0 ? acel + atrito : acel);
        if (!j.laco) j.dir = dir;
      } else if (vento) {
        j.vx = aproximar(j.vx, vento * 2.2, j.noChao ? 0.15 : 0.06);
      } else {
        j.vx = aproximar(j.vx, 0, Math.abs(j.vx) > VEL && !j.noChao ? 0.05 : atrito);
      }
      if (vento && !j.noChao) j.vx = Math.max(-5, Math.min(5, j.vx + vento * 0.08));
      if (buffs.velocidade > 0 && Math.abs(j.vx) > 4 && tempo % 4 === 0) fantasma(0.35);
    }

    // ----- Pulo -----
    if (j.noChao) j.coyote = 6;
    else if (j.coyote > 0) j.coyote--;

    if (j.bufferPulo > 0) {
      if (j.coyote > 0 && (!j.deslizando || podeLevantar())) {
        if (j.deslizando) levantar();
        if (j.sobreGeiser) superPulo();
        else pular(naAreia ? (j.afundar > 30 ? -8.5 : -10.5) : PULO);
      } else if (!j.noChao && buffs.puloDuplo > 0 && j.pulosExtras > 0) {
        j.pulosExtras--;
        j.vy = -13;
        j.giro = 0.01;
        j.bufferPulo = 0;
        j.pulouNormal = true;
        som("puloDuplo");
        for (let i = 0; i < 8; i++) {
          particula({ tipo: "q", x: j.x + j.w / 2, y: j.y + j.h, vx: Math.cos(i / 8 * Math.PI * 2) * 3, vy: Math.sin(i / 8 * Math.PI * 2) * 1.5 + 1, g: 0, vida: 20, max: 20, cor: "#d0ebff", tam: 6 });
        }
      }
    }

    // Soltar o botão cedo = pulo mais baixo
    if (j.pulouNormal && !teclas.pulo && j.vy < -5) j.vy = -5;
    if (j.vy >= 0) j.pulouNormal = false;

    j.vy = Math.min(j.vy + GRAV, MAX_QUEDA);

    // Redemoinho do deserto
    const cj = caixaJogador();
    for (let i = 0; i < fase.tornados.length; i++) {
      const t = fase.tornados[i];
      if (cj.x + cj.w > t.x + 10 && cj.x < t.x + t.w - 10 && cj.y + cj.h > t.topo && cj.y < CHAO) {
        j.vy = Math.max(j.vy - 1.6, -9);
        j.vx *= 0.8;   // o vento segura o macaco dentro do redemoinho
        j.pulouNormal = false;
        if (tempo % 3 === 0) particula({ tipo: "q", x: t.x + Math.random() * t.w, y: j.y + j.h, vx: 0, vy: -4, g: 0, vida: 20, max: 20, cor: "#e0b062", tam: 5 });
      }
    }
  }

  const vyAntes = j.vy;
  j.pesAntes = j.y + j.h;
  moverCorpo(j, true);

  if (j.x < 0) { j.x = 0; j.vx = 0; }
  if (j.x > fase.largura - j.w) { j.x = fase.largura - j.w; j.vx = 0; }

  if (j.noChao) {
    j.dashNoAr = true;
    j.pulosExtras = 1;
    if (!j.chao.cogumelo) {
      if (!estavaNoChao && vyAntes > 3) aterrissar(vyAntes);
      if (j.chao.cai && !j.chao.tremendo && !j.chao.caiu) j.chao.tremendo = j.chao.fragil ? 28 : 35;
    }
  }

  // Cogumelo: quica também ao andar até ele (não precisa acertar o pulo)
  if (!j.morto && j.vy >= 0) {
    for (let i = 0; i < fase.plataformas.length; i++) {
      const p = fase.plataformas[i];
      const cx = j.x + j.w / 2;
      if (p.cogumelo && cx > p.x + 6 && cx < p.x + p.w - 6 && j.y + j.h >= p.y - 2 && j.y + j.h <= CHAO + 1) {
        j.chao = p;
        j.noChao = true;
      }
    }
  }
  if (j.noChao && j.chao && j.chao.cogumelo) quicarCogumelo(j.chao);

  // Agarra o cipó se passar perto dele no ar
  if (!j.noChao && !j.cipo && j.soltouCipo === 0 && j.dash === 0) {
    const mx = j.x + j.w / 2;
    const my = j.y + 10;
    for (let i = 0; i < fase.cipos.length; i++) {
      const c = fase.cipos[i];
      if (Math.abs(mx - c.x) < 30 && my > c.y + 40 && my < c.y + c.comp + 12) {
        agarrarCipo(c);
        break;
      }
    }
  }

  posMovimento();
}

// Cogumelo pula-pula
function quicarCogumelo(p) {
  const j = jogador;
  if (j.deslizando && podeLevantar()) levantar();
  j.y = Math.min(j.y, p.y - j.h);
  j.vy = -21;
  j.noChao = false;
  j.chao = null;
  j.coyote = 0;
  j.bufferPulo = 0;
  j.pulouNormal = false;
  j.esticar = 1;
  p.amassar = 12;
  som("impulso");
  for (let k = 0; k < 8; k++) {
    particula({ tipo: "q", x: j.x + j.w / 2, y: j.y + j.h, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 3, g: 0.15, vida: 20, max: 20, cor: k % 2 ? "#ffffff" : "#e03131", tam: 6 });
  }
}

function posMovimento() {
  const j = jogador;
  const cx = j.x + j.w / 2;

  if (j.noChao && Math.abs(j.vx) > 0.5 && !j.deslizando) {
    j.passos++;
    if (Math.abs(j.vx) > 3 && j.passos % 4 === 0 && !(j.chao && j.chao.gelo)) poeiraPes(j.x + j.w / 2 - j.dir * 14, j.y + j.h);
  }
  else if (j.noChao) j.passos = 0;

  // Areia movediça
  let naAreia = false;
  if (j.noChao && j.chao && j.chao.tipo === "chao") {
    for (let i = 0; i < fase.areias.length; i++) {
      const a = fase.areias[i];
      if (cx > a.x && cx < a.x + a.w) naAreia = true;
    }
  }
  if (naAreia) {
    j.afundar = Math.min(j.afundar + 0.55, 60);
    if (tempo % 5 === 0) particula({ tipo: "q", x: cx + (Math.random() - 0.5) * 40, y: CHAO - 4, vx: 0, vy: -1, g: 0.05, vida: 15, max: 15, cor: "#c9953f", tam: 4 });
    if (j.afundar >= 60) {
      machucar(cx - j.dir * 10, true);
      j.vy = -12;
      j.afundar = 0;
    }
  } else {
    j.afundar = Math.max(0, j.afundar - 4);
  }

  // Em cima da rocha de magma?
  j.sobreGeiser = false;
  if (j.noChao) {
    for (let i = 0; i < fase.geiseres.length; i++) {
      const g = fase.geiseres[i];
      if (cx > g.x - 6 && cx < g.x + g.w + 6) j.sobreGeiser = true;
    }
  }

  // Último lugar seguro (para voltar quando cair num buraco)
  if (j.noChao && j.chao && j.chao.tipo && !naAreia && j.invencivel === 0 && !j.deslizando) {
    j.seguro.x = j.x;
    j.seguro.y = j.y;
    j.seguro.chao = j.chao;
  }

  if (j.y > ALTURA + 80) caiuNoBuraco();
}

function pular(v) {
  const j = jogador;
  j.vy = v;
  j.coyote = 0;
  j.bufferPulo = 0;
  j.pulouNormal = true;
  j.esticar = 1;
  som("pulo");
  poeira(j.x + j.w / 2, j.y + j.h, 5);
}

function superPulo() {
  const j = jogador;
  j.vy = SUPER_PULO;
  j.coyote = 0;
  j.bufferPulo = 0;
  j.pulouNormal = false;
  j.esticar = 1;
  tremor = 6;
  som("impulso");
  for (let i = 0; i < 24; i++) {
    particula({ tipo: "q", x: j.x + j.w / 2 + (Math.random() - 0.5) * 40, y: CHAO, vx: (Math.random() - 0.5) * 3, vy: -3 - Math.random() * 6,
      g: 0.1, vida: 30, max: 30, cor: Math.random() < 0.5 ? "#ff922b" : "#ffd43b", tam: 7 });
  }
}

function aterrissar(vy) {
  const j = jogador;
  j.esticar = -Math.min(1, vy / 14);
  if (vy > 6) {
    poeira(j.x + 4, j.y + j.h, 3, -1);
    poeira(j.x + j.w - 4, j.y + j.h, 3, 1);
  }
}

function iniciarDeslize() {
  const j = jogador;
  j.deslizando = true;
  j.noAr = 0;
  j.y += 36;
  j.h = 36;
  poeira(j.x + j.w / 2, j.y + j.h, 4);
}

function podeLevantar() {
  const j = jogador;
  return !solidoNaCaixa({ x: j.x, y: j.y - 36, w: j.w, h: 72 });
}

function levantar() {
  const j = jogador;
  j.deslizando = false;
  j.y -= 36;
  j.h = 72;
}

// ----- Cipó de balançar -----

function agarrarCipo(c) {
  const j = jogador;
  const mx = j.x + j.w / 2;
  const my = j.y + 10;
  const r = limitar(Math.hypot(mx - c.x, my - c.y), 80, c.comp);
  const th = Math.atan2(mx - c.x, my - c.y);
  let w = (j.vx * Math.cos(th) - j.vy * Math.sin(th)) / r;
  if (Math.abs(w) < 0.042) w = (j.dir || 1) * 0.042;
  j.cipo = c;
  j.cipoR = r;
  j.cipoTh = th;
  j.cipoW = w;
  j.vx = 0;
  j.vy = 0;
  j.pulosExtras = 1;
  j.dashNoAr = true;
  j.bufferPulo = 0;
  if (j.deslizando) { j.deslizando = false; j.h = 72; }
  som("agarrou");
}

function balancar(dir) {
  const j = jogador;
  let a = -(GRAV / j.cipoR) * Math.sin(j.cipoTh);
  if (dir && Math.sign(j.cipoW) === dir) a += dir * 0.0009;   // dá impulso balançando
  j.cipoW = (j.cipoW + a) * 0.999;
  j.cipoTh += j.cipoW;
  if (Math.abs(j.cipoTh) > 1.3) {
    j.cipoTh = Math.sign(j.cipoTh) * 1.3;
    j.cipoW = 0;
  }
  const hx = j.cipo.x + Math.sin(j.cipoTh) * j.cipoR;
  const hy = j.cipo.y + Math.cos(j.cipoTh) * j.cipoR;
  j.x = hx - j.w / 2;
  j.y = hy - 10;
  if (Math.abs(j.cipoW) > 0.004) j.dir = j.cipoW > 0 ? 1 : -1;

  if (j.bufferPulo > 0) soltarCipo(true);
  else if (teclas.baixo) soltarCipo(false);
}

function soltarCipo(impulso) {
  const j = jogador;
  const v = j.cipoR * j.cipoW;
  j.vx = limitar(v * Math.cos(j.cipoTh), -12, 12);
  j.vy = limitar(-v * Math.sin(j.cipoTh), -14, 14) - (impulso ? 3.5 : 0);
  j.cipo = null;
  j.soltouCipo = 20;
  j.bufferPulo = 0;
  j.pulouNormal = false;
  j.esticar = 1;
  if (impulso) som("pulo");
}

// ----- Dash -----

function iniciarDash() {
  const j = jogador;
  if (!temMelhoria("dash") || j.recargaDash > 0 || j.dash > 0 || j.cipo || j.deslizando) return;
  if (!j.noChao && !j.dashNoAr) return;
  if (!j.noChao) j.dashNoAr = false;
  j.dash = 12;
  j.recargaDash = 45;
  cancelarLaco();
  som("dash");
}

// ----- Cipó-laço: agarra o inimigo, puxa e chuta pro espaço -----

function maoJogador() {
  const j = jogador;
  return { x: j.x + j.w / 2 + j.dir * 32, y: j.y + j.h - 22 };
}

// O cipó-laço é o prêmio do Gorila Rei (chefe da Selva). Depois de usar, recarrega por RECARGA_LACO passos.
const RECARGA_LACO = 100;

function temCipo() {
  return !!save.chefes[0];
}

function lancarLaco() {
  const j = jogador;
  if (!temCipo()) {
    // ainda não tem: avisa de onde vem (sem encher a tela)
    if (!j.avisouCipo) {
      j.avisouCipo = true;
      texto(j.x + j.w / 2, j.y - 20, tr("Vença o Gorila Rei para ganhar o cipó-laço!"), "#ffe066", 18);
    }
    return;
  }
  if (j.recargaLaco > 0 && !j.laco) { som("negado"); return; }
  if (j.laco || j.recargaLaco > 0 || j.cipo || j.deslizando || j.dash > 0) return;
  j.laco = { estado: "indo", comp: 0, alvo: null };
  som("laco");
}

function cancelarLaco() {
  const j = jogador;
  if (j.laco && j.laco.alvo) j.laco.alvo.lacado = false;
  j.laco = null;
}

function atualizarLaco() {
  const j = jogador;
  const l = j.laco;
  const mao = maoJogador();
  const alcance = temMelhoria("cipoLongo") ? 390 : 280;

  if (l.estado === "indo") {
    l.comp += 26;
    const px = mao.x + j.dir * l.comp;
    const caixa = { x: px - 18, y: mao.y - 26, w: 36, h: 52 };
    for (let i = 0; i < inimigos.length; i++) {
      const e = inimigos[i];
      if (e.vivo && !e.lacado && encosta(caixa, e)) {
        l.estado = "puxando";
        l.alvo = e;
        e.lacado = true;
        som("agarrou");
        break;
      }
    }
    if (l.estado === "indo" && chefe && chefe.vivo && !chefe.intangivel && encosta(caixa, chefe.caixa)) {
      danoChefe(2, px);
      l.estado = "voltando";
    }
    if (l.estado === "indo" && (l.comp >= alcance || solidoNaCaixa({ x: px - 4, y: mao.y - 4, w: 8, h: 8 }))) l.estado = "voltando";
  } else if (l.estado === "puxando") {
    const e = l.alvo;
    if (!e.vivo) {
      l.estado = "voltando";
      return;
    }
    const alvoX = j.x + j.w / 2 + j.dir * 46 - e.w / 2;
    const alvoY = j.y + j.h - e.h - 6;
    e.x += limitar(alvoX - e.x, -18, 18);
    e.y += limitar(alvoY - e.y, -16, 16);
    l.comp = Math.abs(e.x + e.w / 2 - mao.x);
    if (Math.abs(alvoX - e.x) < 2 && Math.abs(alvoY - e.y) < 2) {
      j.chute = 22;
      chutarProEspaco(e);
      j.laco = null;
      j.recargaLaco = RECARGA_LACO;
    }
  } else {
    l.comp -= 36;
    if (l.comp <= 0) {
      j.laco = null;
      j.recargaLaco = RECARGA_LACO;
    }
  }
}

// ----- Dano e morte -----

function machucar(origemX, ignorarInvencivel) {
  const j = jogador;
  if (j.morto || j.saindo) return;
  if (j.dash > 0 || buffs.escudo > 0) return;
  if (j.invencivel > 0 && !ignorarInvencivel) return;
  j.vidas--;
  perdeuVida();
  medir("damage", nomeNivel(), "hit");
  j.invencivel = 90;
  tremor = 10;
  flashDano = 20;
  som("dano");
  cancelarLaco();
  j.cipo = null;
  if (j.deslizando && podeLevantar()) levantar();
  j.vx = j.x + j.w / 2 < origemX ? -6 : 6;
  j.vy = -8;
  j.pulouNormal = false;
  for (let i = 0; i < 10; i++) {
    particula({ tipo: "q", x: j.x + j.w / 2, y: j.y + j.h / 2, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, g: 0.2, vida: 25, max: 25, cor: "#ff6b6b", tam: 6 });
  }
  if (j.vidas <= 0) morrer();
}

function caiuNoBuraco() {
  const j = jogador;
  if (temMelhoria("nuvem") && !fase.nuvemUsada && !j.morto) {
    fase.nuvemUsada = true;
    cancelarLaco();
    j.cipo = null;
    if (j.deslizando) { j.deslizando = false; j.h = 72; }
    voltarProSeguro(j);
    j.vy = -6;
    j.invencivel = 60;
    som("poder");
    texto(j.x + j.w / 2, j.y - 20, tr("Nuvem Mágica!"), "#e7f5ff", 24);
    for (let i = 0; i < 14; i++) {
      particula({ tipo: "q", x: j.x + j.w / 2 + (Math.random() - 0.5) * 70, y: j.y + j.h, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.5, g: 0, vida: 40, max: 40, cor: i % 2 ? "#ffffff" : "#d0def0", tam: 12 });
    }
    return;
  }
  j.vidas--;
  perdeuVida();
  medir("damage", nomeNivel(), "hole");
  tremor = 10;
  som("dano");
  if (j.vidas <= 0) {
    j.vidas = 0;
    morrer();
    return;
  }
  cancelarLaco();
  j.cipo = null;
  if (j.deslizando) { j.deslizando = false; j.h = 72; }
  voltarProSeguro(j);
  j.invencivel = 100;
  j.afundar = 0;
  texto(j.x + j.w / 2, j.y - 10, tr("-1 vida"), "#ff6b6b", 22);
}

function morrer() {
  const j = jogador;
  j.morto = 1;
  j.vy = -13;
  j.vx = 0;
  j.giro = 0;
  cancelarLaco();
  j.cipo = null;
  if (j.deslizando) { j.deslizando = false; j.y -= 36; j.h = 72; }
  som("morte");
}

function perdeuTudo() {
  sujo = true;
  save.stats.mortes++;
  if (fase.secreta) reiPerdeu();          // Saru: gasta a tentativa
  else if (podeReviver()) abrirReviver();   // Poki: "assista um anúncio para reviver"
  else voltarDoCheckpoint();
}

function voltarDoCheckpoint() {
  medir("level", nomeNivel(), "fail");
  pausado = false;
  atualizarTelas();
  mostrarMensagem(tr("Você perdeu!"), checkpointX !== null ? tr("Voltando do checkpoint...") : tr("Tentando de novo..."), 90, function() {
    const seguir = function() { trocarCena(function() { iniciarFase(fase.indice, true); }); };
    if (semIntervaloAgora(fase.indice)) seguir();
    else intervaloComercial(seguir);
  });
}


// =========================
// INIMIGOS
// =========================

function criarInimigo(def) {
  const t = TIPOS_INIMIGO[def.tipo];
  const fator = 1 + fase.dificuldade * 0.5;
  return {
    tipo: def.tipo, t: t, x: def.x, y: def.y, w: t.w, h: t.h, x0: def.x, y0: def.y,
    vx: 0, vy: 0, dir: -1, hp: t.hp, vivo: true, morto: false, espaco: false, esmagado: 0, lacado: false,
    timer: 30 + Math.floor(Math.random() * 60), estado: "normal", rot: 0, escala: 1, flash: 0,
    vel: (t.vel || 0) * fator, intervalo: Math.round((t.intervalo || 100) / fator),
    ang: Math.random() * 6, noChao: false, batidaX: 0
  };
}

const COMPORTAMENTO = {
  patrulha: function(e) {
    e.vx = e.dir * e.vel;
    e.vy = Math.min(e.vy + GRAV, MAX_QUEDA);
    moverCorpo(e, true);
    if (e.batidaX) e.dir *= -1;
    else if (e.noChao && !temChao(e.dir > 0 ? e.x + e.w + 2 : e.x - 2, e.y + e.h + 4)) e.dir *= -1;
  },

  aranha: function(e) {
    // Fica pendurada no fio; desce quando o macaco passa embaixo e sobe de novo
    const j = jogador;
    const dx = Math.abs(j.x + j.w / 2 - (e.x + e.w / 2));
    const fundo = CHAO - e.h - 8;
    if (e.estado === "normal") {
      e.y = e.y0 + Math.sin(tempo * 0.05 + e.ang) * 6;
      if (dx < 170 && !j.morto && e.timer <= 0) e.estado = "descendo";
      if (e.timer > 0) e.timer--;
    } else if (e.estado === "descendo") {
      e.y = Math.min(e.y + e.vel * 1.5, fundo);
      if (e.y >= fundo) { e.estado = "esperando"; e.timer = 40; }
    } else if (e.estado === "esperando") {
      if (--e.timer <= 0) e.estado = "subindo";
    } else {
      e.y -= 2.5;
      if (e.y <= e.y0) { e.y = e.y0; e.estado = "normal"; e.timer = 70; }
    }
  },

  voador: function(e) {
    e.timer++;
    e.ang += 0.01 * e.vel;
    const nx = e.x0 + Math.sin(e.ang) * 110;
    e.dir = nx >= e.x ? 1 : -1;
    e.x = nx;
    e.y = e.y0 + Math.sin(e.timer * 0.05) * e.t.amplitude;
  },

  mergulhador: function(e) {
    const j = jogador;
    if (e.estado === "normal") {
      COMPORTAMENTO.voador(e);
      const dx = j.x + j.w / 2 - (e.x + e.w / 2);
      if (e.timer > 120 && Math.abs(dx) < 260 && j.y > e.y && !j.morto) {
        const dy = j.y + j.h / 2 - (e.y + e.h / 2);
        const d = Math.hypot(dx, dy);
        e.vx = (dx / d) * 6;
        e.vy = (dy / d) * 6;
        e.estado = "mergulho";
        e.dir = dx > 0 ? 1 : -1;
        e.timer = 0;
      }
    } else if (e.estado === "mergulho") {
      e.timer++;
      e.x += e.vx;
      e.y += e.vy;
      if (e.t.rastro && tempo % 2 === 0) {
        particula({ tipo: "q", x: e.x + e.w / 2, y: e.y + e.h / 2, vx: 0, vy: -0.5, g: 0, vida: 16, max: 16, cor: e.t.rastro, tam: 8 });
      }
      if (e.y + e.h > CHAO - 6 || e.timer > 70) e.estado = "subindo";
    } else {
      e.y -= 3;
      e.x += e.vx * 0.3;
      if (e.y <= e.y0) {
        e.y = e.y0;
        e.x0 = e.x - Math.sin(e.ang) * 110;
        e.estado = "normal";
        e.timer = 0;
      }
    }
  },

  pulador: function(e) {
    e.vy = Math.min(e.vy + GRAV, MAX_QUEDA);
    if (e.noChao) {
      e.vx = 0;
      e.timer--;
      const dx = jogador.x - e.x;
      e.dir = dx > 0 ? 1 : -1;
      if (e.timer <= 0 && Math.abs(dx) < 520) {
        e.vy = e.t.pulo;
        e.vx = e.dir * e.vel;
        e.timer = 70 + Math.floor(Math.random() * 40);
      }
    }
    moverCorpo(e, true);
    if (e.batidaX) e.vx = 0;
  },

  atirador: function(e) {
    e.vy = Math.min(e.vy + GRAV, MAX_QUEDA);
    e.vx = 0;
    moverCorpo(e, true);
    const dx = jogador.x + jogador.w / 2 - (e.x + e.w / 2);
    e.dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) < 650 && !jogador.morto) {
      e.timer--;
      if (e.timer <= 0) {
        atirarInimigo(e);
        e.timer = e.intervalo;
      }
    }
  },

  investida: function(e) {
    const j = jogador;
    e.vy = Math.min(e.vy + GRAV, MAX_QUEDA);
    const dx = j.x + j.w / 2 - (e.x + e.w / 2);
    if (e.estado === "normal") {
      e.vx = e.dir * e.vel;
      if (Math.abs(dx) < 380 && Math.sign(dx) === e.dir && Math.abs(j.y + j.h - e.y - e.h) < 90 && !j.morto) {
        e.estado = "preparar";
        e.timer = 25;
      }
    } else if (e.estado === "preparar") {
      e.vx = 0;
      if (--e.timer <= 0) { e.estado = "deslizar"; e.timer = 90; }
    } else if (e.estado === "deslizar") {
      e.vx = e.dir * e.t.velInvestida * (1 + fase.dificuldade * 0.3);
      if (tempo % 3 === 0) particula({ tipo: "q", x: e.x + e.w / 2, y: e.y + e.h, vx: -e.dir, vy: -1, g: 0.1, vida: 15, max: 15, cor: "#e7f5ff", tam: 4 });
      if (--e.timer <= 0) { e.estado = "cansado"; e.timer = 60; }
    } else {
      e.vx = aproximar(e.vx, 0, 0.3);
      if (--e.timer <= 0) e.estado = "normal";
    }
    moverCorpo(e, true);
    let virar = !!e.batidaX;
    if (!virar && e.noChao && !temChao(e.dir > 0 ? e.x + e.w + 2 : e.x - 2, e.y + e.h + 4)) virar = true;
    if (virar) {
      e.dir *= -1;
      e.vx = 0;
      if (e.estado === "deslizar") { e.estado = "cansado"; e.timer = 60; }
    }
  }
};

function atirarInimigo(e) {
  const j = jogador;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h * 0.35;
  const dx = j.x + j.w / 2 - cx;
  const dy = j.y + j.h / 2 - cy;
  if (e.t.tiro === "espinho") {
    projeteis.push({ tipo: "espinho", x: cx - 9, y: cy, w: 18, h: 6, vx: Math.sign(dx) * 5.5, vy: 0, vida: 160 });
  } else if (e.t.tiro === "neve") {
    projeteis.push({ tipo: "neve", x: cx - 10, y: cy - 10, w: 20, h: 20, vx: limitar(dx / 55, -7, 7), vy: -9, g: 0.33, vida: 200 });
  } else if (e.t.tiro === "coco") {
    projeteis.push({ tipo: "coco", x: cx - 12, y: cy - 12, w: 24, h: 24, vx: limitar(dx / 50, -8, 8), vy: -10, g: 0.4, vida: 200 });
  } else if (e.t.tiro === "pedra") {
    projeteis.push({ tipo: "pedrinha", x: cx - 14, y: cy - 14, w: 28, h: 28, vx: limitar(dx / 60, -7, 7), vy: -11, g: 0.38, vida: 220 });
  } else {
    const d = Math.hypot(dx, dy) || 1;
    projeteis.push({ tipo: "fogo", x: cx - 12, y: cy - 12, w: 24, h: 24, vx: (dx / d) * 4.5, vy: (dy / d) * 4.5, vida: 200 });
  }
}

function atualizarInimigos() {
  const centro = cameraX + LARGURA / 2;
  for (let i = 0; i < inimigos.length; i++) {
    const e = inimigos[i];
    if (e.remover) continue;
    if (e.espaco) { voarProEspaco(e); continue; }
    if (e.morto) {
      if (e.esmagado > 0) {
        if (--e.esmagado === 0) e.remover = true;
      } else {
        e.vy += 0.6;
        e.x += e.vx;
        e.y += e.vy;
        e.rot += 0.15;
        if (e.y > ALTURA + 100) e.remover = true;
      }
      continue;
    }
    if (e.lacado) continue;
    if (Math.abs(e.x - centro) > 1000) continue;   // longe da tela: fica parado (economiza)
    if (e.flash > 0) e.flash--;

    COMPORTAMENTO[e.t.comp](e);

    if (e.y > ALTURA + 100) { e.remover = true; continue; }
    for (let k = 0; k < fase.lavas.length; k++) {
      const l = fase.lavas[k];
      if (e.x + e.w > l.x && e.x < l.x + l.w && e.y + e.h > CHAO + 26) matarInimigo(e, "lava");
    }
    if (e.vivo) colisaoInimigoJogador(e);
  }
  removerInimigosMarcados();
}

// Tira da lista quem foi marcado com "remover", só depois de todos andarem neste quadro:
// assim uma morte em cadeia (nuke, chute, lava) nunca faz o loop pular um inimigo.
function removerInimigosMarcados() {
  let n = 0;
  for (let i = 0; i < inimigos.length; i++) {
    if (!inimigos[i].remover) inimigos[n++] = inimigos[i];
  }
  inimigos.length = n;
}

function colisaoInimigoJogador(e) {
  const j = jogador;
  if (j.morto || !e.vivo || e.lacado) return;
  const hb = { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 6 };
  if (!encosta(j, hb)) return;

  if (j.dash > 0 || buffs.escudo > 0) { matarInimigo(e, "pancada"); return; }
  if (j.deslizando && !e.t.voa) { matarInimigo(e, "pancada"); return; }
  const espinhoso = e.t.espinhoso || (e.t.rolaEspinhoso && e.estado === "deslizar");
  if (j.vy > 0 && j.pesAntes <= e.y + 16 && !espinhoso) {
    danificarInimigo(e, 99, "pisao");
    j.vy = teclas.pulo ? -13 : -9;
    j.pulouNormal = false;
    j.pulosExtras = 1;
    return;
  }
  machucar(e.x + e.w / 2);
}

function danificarInimigo(e, dano, como) {
  e.hp -= dano;
  e.flash = 8;
  if (e.hp <= 0) matarInimigo(e, como);
  else som("pisao");
}

function matarInimigo(e, como) {
  if (!e.vivo) return;
  e.vivo = false;
  e.morto = true;
  e.lacado = false;
  if (como === "pisao") {
    e.esmagado = 20;
    som("pisao");
    poeira(e.x + e.w / 2, e.y + e.h, 6);
  } else {
    e.vy = -8;
    e.vx = (e.x > jogador.x ? 1 : -1) * 2.5;
    som("inimigo");
  }
  for (let i = 0; i < 8; i++) {
    particula({ tipo: "q", x: e.x + e.w / 2, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.7) * 6, g: 0.2, vida: 25, max: 25, cor: "#ffffff", tam: 5 });
  }
  particula({ tipo: "fumaca", x: e.x + e.w / 2, y: e.y + e.h / 2, vx: 0, vy: -0.5, g: 0, vida: 25, max: 25, cor: "#ffffff", tam: e.w });
  ganharMoedas(1, e.x + e.w / 2, e.y);
  ganharXp(XP.inimigo, e.x + e.w / 2, e.y - 24);
  save.stats.inimigos++;
  // De vez em quando o inimigo solta um power-up
  if (Math.random() < 0.07 && como !== "nuke") {
    fase.powerups.push({ x: e.x + e.w / 2 - 22, y: e.y - 20, base: Math.min(e.y - 20, CHAO - 120), tipo: sorteio(TIPOS_POWERUP), vida: 600 });
  }
}

function chutarProEspaco(e) {
  e.lacado = false;
  e.vivo = false;
  e.espaco = true;
  e.vx = jogador.dir * 6;
  e.vy = -16;
  e.rot = 0;
  e.escala = 1;
  tremor = 12;
  som("chute");
  particula({ tipo: "texto", x: e.x + e.w / 2, y: e.y - 50, vx: 0, vy: -1.5, g: 0, vida: 40, max: 40, texto: "POW!", cor: "#ffd43b", tam: 34 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    particula({ tipo: "q", x: e.x + e.w / 2, y: e.y + e.h / 2, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, g: 0, vida: 18, max: 18, cor: i % 2 ? "#ffffff" : "#ffd43b", tam: 7 });
  }
  ganharMoedas(2, e.x + e.w / 2, e.y);
  ganharXp(XP.chute, e.x + e.w / 2, e.y - 24);
  save.stats.inimigos++;
  save.stats.chutes++;
}

// O inimigo chutado sobe girando, encolhe e vira uma estrelinha lá no céu
function voarProEspaco(e) {
  e.x += e.vx;
  e.y += e.vy;
  e.vy -= 0.25;
  e.vx *= 0.99;
  e.rot += 0.4;
  e.escala = Math.max(0.2, e.escala - 0.015);
  if (tempo % 2 === 0) {
    particula({ tipo: "fumaca", x: e.x + e.w / 2, y: e.y + e.h / 2, vx: 0, vy: 0, g: 0, vida: 30, max: 30, cor: "#dee2e6", tam: 10 * e.escala + 6 });
  }
  if (e.y + e.h < -20) {
    e.remover = true;
    particula({ tipo: "estrela", x: limitar(e.x + e.w / 2, cameraX + 30, cameraX + LARGURA - 30), y: 26, vx: 0, vy: 0, g: 0, vida: 50, max: 50 });
    som("estrela");
  }
}


// =========================
// PROJÉTEIS
// =========================

function atualizarProjeteis() {
  const j = jogador;
  for (let i = projeteis.length - 1; i >= 0; i--) {
    if (estado !== "jogo") return;   // um tiro pode ter derrotado o último chefe (começa a cena final)
    const p = projeteis[i];
    if (!p) continue;                // a lista pode ter sido limpa no meio (chefe derrotado, nuke)
    p.vida--;
    if (p.aviso > 0) { p.aviso--; continue; }   // ainda mostrando a sombra de aviso

    if (p.rola) {
      // Rola pelo chão, cai nos buracos e quebra ao bater numa parede
      p.x += p.vx;
      p.vy = Math.min(p.vy + (p.g || 0.6), MAX_QUEDA);
      p.y += p.vy;
      const sol = fase.solidos;
      for (let k = 0; k < sol.length; k++) {
        if (p.vy > 0 && encosta(p, sol[k]) && p.y + p.h - p.vy <= sol[k].y + 1) { p.y = sol[k].y - p.h; p.vy = 0; }
      }
      p.rot = (p.rot || 0) + p.vx / (p.w / 2);
    } else {
      p.vy += p.g || 0;
      p.x += p.vx;
      p.y += p.vy;
    }
    if (p.rastro && tempo % 2 === 0) {
      particula({ tipo: "q", x: p.x + p.w / 2, y: p.y + p.h / 2, vx: 0, vy: -0.5, g: 0, vida: 16, max: 16, cor: p.rastro, tam: 8 });
    }

    let acabou = p.vida <= 0 || p.y > ALTURA + 60 || p.x < cameraX - 400 || p.x > cameraX + LARGURA + 400;
    if (!acabou && !p.atravessa) {
      const teste = p.rola ? { x: p.x, y: p.y, w: p.w, h: p.h - 10 } : p;
      if (solidoNaCaixa(teste) || (p.quebraNoChao && p.y + p.h >= CHAO)) {
        acabou = true;
        estilhacar(p);
      }
    }
    if (!acabou) {
      if (p.doJogador) {
        if (acertarAlgo(p)) acabou = true;
      } else if (!j.morto && encosta(p, caixaJogador())) {
        machucar(p.x + p.w / 2);
        if (!p.atravessa && !p.rola) { acabou = true; estilhacar(p); }
      }
    }
    if (acabou && projeteis[i] === p) projeteis.splice(i, 1);
  }
}

function acertarAlgo(p) {
  for (let i = 0; i < inimigos.length; i++) {
    const e = inimigos[i];
    if (e.vivo && !e.lacado && encosta(p, e)) {
      danificarInimigo(e, 1, "bala");
      faiscas(p.x + p.w / 2, p.y);
      return true;
    }
  }
  if (chefe && chefe.vivo && !chefe.intangivel && encosta(p, chefe.caixa)) {
    danoChefe(1, p.x);
    faiscas(p.x + p.w / 2, p.y);
    return true;
  }
  return false;
}

function estilhacar(p) {
  const cores = { neve: "#ffffff", bolao: "#ffffff", gelo: "#a5d8ff", coco: "#8a5a2b", fogo: "#ff922b", meteoro: "#ff922b", veneno: "#9c36b5", bala: "#ffd43b", espinho: "#2f9e44" };
  const cor = cores[p.tipo] || "#dee2e6";
  const n = p.w > 40 ? 16 : 6;
  for (let i = 0; i < n; i++) {
    particula({ tipo: "q", x: p.x + p.w / 2, y: p.y + p.h / 2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, g: 0.25, vida: 25, max: 25, cor: cor, tam: 5 });
  }
}


// =========================
// PERIGOS DA FASE
// =========================

function atualizarPlataformas() {
  const pl = fase.plataformas;
  for (let i = 0; i < pl.length; i++) {
    const p = pl[i];
    const ox = p.x;
    const oy = p.y;
    if (p.ax || p.ay) {
      const a = (tempo / p.periodo) * Math.PI * 2 + (p.fase || 0);
      p.x = p.x0 + Math.sin(a) * (p.ax || 0);
      p.y = p.y0 + Math.sin(a) * (p.ay || 0);
    }
    if (p.cai) {
      if (p.tremendo > 0 && !p.caiu) {
        p.tremendo--;
        if (p.tremendo === 0) { p.caiu = true; p.vq = 0; p.volta = 0; }
      }
      if (p.caiu) {
        p.vq += 0.5;
        p.y += p.vq;
        if (++p.volta > 220) { p.caiu = false; p.y = p.y0; p.tremendo = 0; }
      }
    }
    p.dx = p.caiu ? 0 : p.x - ox;
    p.dy = p.caiu ? 0 : p.y - oy;
  }
}

function atualizarPerigos() {
  const j = jogador;
  const cj = caixaJogador();
  const vivo = !j.morto;

  // Espinhos
  for (let i = 0; i < fase.espinhos.length; i++) {
    const s = fase.espinhos[i];
    if (vivo && encosta(cj, { x: s.x + 6, y: s.y + 8, w: s.w - 12, h: s.h })) {
      if (j.invencivel === 0 && j.dash === 0 && buffs.escudo === 0) {
        machucar(s.x + s.w / 2);
        j.vy = -10;
      }
    }
  }

  // Lava: queima e joga o macaco pra cima
  for (let i = 0; i < fase.lavas.length; i++) {
    const l = fase.lavas[i];
    if (vivo && cj.x + cj.w > l.x && cj.x < l.x + l.w && j.y + j.h > CHAO + 26) {
      machucar(j.x + j.w / 2 - j.dir * 20);
      if (!j.morto) {
        j.vy = -17;
        j.pulouNormal = false;
        j.cipo = null;
        for (let k = 0; k < 12; k++) {
          particula({ tipo: "q", x: j.x + j.w / 2, y: CHAO + 26, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 7, g: 0.3, vida: 30, max: 30, cor: k % 2 ? "#ff922b" : "#ffd43b", tam: 6 });
        }
      }
    }
  }

  // Bolas de fogo que pulam da lava
  for (let i = 0; i < fase.fogos.length; i++) {
    const fg = fase.fogos[i];
    if (fg.y === undefined) { fg.y = CHAO + 40; fg.vy = 0; }
    fg.t++;
    if (fg.t % 160 === 0) fg.vy = -15.5;
    if (fg.vy !== 0 || fg.y < CHAO + 40) {
      fg.vy += 0.45;
      fg.y += fg.vy;
      if (fg.y >= CHAO + 40) { fg.y = CHAO + 40; fg.vy = 0; }
      if (tempo % 2 === 0) particula({ tipo: "q", x: fg.x + 16, y: fg.y + 16, vx: 0, vy: 0.5, g: 0, vida: 14, max: 14, cor: "#ff922b", tam: 8 });
    }
    if (vivo && fg.y < CHAO + 24 && encosta(cj, { x: fg.x + 4, y: fg.y + 4, w: 24, h: 24 })) machucar(fg.x + 16);
  }

  // Gêiseres de magma
  for (let i = 0; i < fase.geiseres.length; i++) {
    const g = fase.geiseres[i];
    g.t = (g.t + 1) % 200;
    if (g.t >= 120 && g.t < 150 && tempo % 4 === 0) {
      particula({ tipo: "q", x: g.x + 10 + Math.random() * 44, y: CHAO - 10, vx: 0, vy: -1.5, g: 0, vida: 20, max: 20, cor: "#ff922b", tam: 6 });
    }
    if (g.t >= 150 && g.t < 185) {
      if (vivo && !j.cipo && encosta(cj, { x: g.x, y: CHAO - 430, w: g.w, h: 430 }) && j.vy > -18) {
        j.vy = SUPER_PULO;
        j.pulouNormal = false;
        j.esticar = 1;
        som("impulso");
      }
    }
  }

  // Estalactites que caem quando você chega perto
  for (let i = 0; i < fase.estalactites.length; i++) {
    const s = fase.estalactites[i];
    if (!s.estado) { s.estado = "parada"; s.vy = 0; s.t = 0; }
    if (s.estado === "parada") {
      const dx = s.x + 12 - (j.x + j.w / 2);
      if (dx < 220 && dx > -40 && vivo) { s.estado = "tremendo"; s.t = 22; }
    } else if (s.estado === "tremendo") {
      if (--s.t <= 0) s.estado = "caindo";
    } else if (s.estado === "caindo") {
      s.vy += 0.6;
      s.y += s.vy;
      const caixa = { x: s.x + 2, y: s.y, w: 20, h: 36 };
      if (vivo && encosta(cj, caixa)) {
        machucar(s.x + 12);
        s.estado = "quebrada";
        estilhacar({ tipo: "gelo", x: s.x, y: s.y, w: 24, h: 36 });
      } else if (s.y + 36 >= CHAO) {
        s.estado = "quebrada";
        estilhacar({ tipo: "gelo", x: s.x, y: CHAO - 30, w: 24, h: 36 });
      }
    }
  }
}


// =========================
// MOEDAS, CHECKPOINT E A BANANA
// =========================

function ganharMoedas(n, x, y) {
  save.moedas += n;
  moedasNaFase += n;
  sujo = true;
  texto(x, y, "+" + n, "#ffe066", 20);
  som("moeda");
}

function atualizarMoedas() {
  const j = jogador;
  const lista = fase.moedas;
  for (let i = 0; i < lista.length; i++) {
    const m = lista[i];
    if (m.pega) continue;
    if (buffs.ima > 0) {
      const dx = j.x + j.w / 2 - (m.x + 16);
      const dy = j.y + j.h / 2 - (m.y + 16);
      const d = Math.hypot(dx, dy);
      if (d < 300 && d > 1) { m.x += (dx / d) * 9; m.y += (dy / d) * 9; }
    }
    if (!j.morto && m.x < j.x + j.w && m.x + 32 > j.x && m.y < j.y + j.h && m.y + 32 > j.y) {
      m.pega = true;
      ganharMoedas(1, m.x + 16, m.y);
      j.brilho = 8;
      ganharXp(XP.moeda);
      moedaParaHud(m.x + 16, m.y + 16);
      for (let k = 0; k < 5; k++) {
        particula({ tipo: "q", x: m.x + 16, y: m.y + 16, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, g: 0, vida: 15, max: 15, cor: "#fff3a0", tam: 4 });
      }
    }
  }

  for (let i = 0; i < fase.checkpoints.length; i++) {
    const c = fase.checkpoints[i];
    if (c.ativo && c.sobe < 1) c.sobe = Math.min(1, (c.sobe || 0) + 0.04);
    if (!c.ativo && !j.morto && j.x + j.w > c.x) {
      c.ativo = true;
      c.sobe = 0;
      checkpointX = c.x;
      medir("checkpoint", nomeNivel(), "reached");
      j.vidas = Math.max(j.vidas, Math.min(vidasMax(), j.vidas + 1));
      ganharXp(XP.checkpoint, c.x + 20, CHAO - 140);
      som("checkpoint");
      texto(c.x + 20, CHAO - 110, "Checkpoint!", "#ffffff", 22);
      for (let k = 0; k < 12; k++) {
        particula({ tipo: "q", x: c.x + 20, y: CHAO - 70, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6, g: 0.2, vida: 30, max: 30, cor: MUNDOS[fase.mundo].cor, tam: 6 });
      }
    }
  }
}

// =========================
// A BANANA FUGINDO
// O vento leva a banana na frente do macaco a fase inteira: às vezes ela chega pertinho, às vezes
// dispara para longe (e se o macaco chegar perto demais, uma rajada leva ela). Na reta final ela
// escapa de vez e o macaco sai correndo da tela atrás dela -> próxima fase.
// Nos chefes (menos o Dragão, que já entra com ela nas garras, e o Saru): a banana chega voando,
// o chefe pega no ar e segura a luta inteira; derrotado, ele solta, ela foge e o macaco vai atrás.
// =========================

const BANANA_ALTURA = CHAO - 185;   // um pouco abaixo do meio da tela (y ~ 435)

function criarBananaDaFase() {
  if (fase.secreta) return null;
  if (fase.tutorial) return { x: fase.fimX, y: CHAO - 44, base: CHAO - 44, estado: "parada", t: 0, rot: 0, vy: 0 };
  if (fase.ehChefe) {
    if (fase.mundo === MUNDOS.length - 1) return null;   // o Dragão já está com ela
    if (chefe) prepararBananaChefe(chefe.tipo);
    return { estado: "chegando", x: -90, y: 150, t: 0, rot: 0, vy: 0 };
  }
  return { estado: "fugindo", x: jogador.x + 420, y: BANANA_ALTURA, t: 0, rot: 0, vy: 0, rajada: 0 };
}

// Onde o chefe segura a banana (na mão da frente, em pixels da grade x3 do sprite olhando para a direita)
const MAO_CHEFE = { gorila: [41.5, 30], yeti: [36.5, 32], escorpiaoRei: [49.5, 19] };
function maoDoChefe(c) {
  const m = MAO_CHEFE[c.tipo];
  if (!m) return { x: c.x + c.w / 2 + c.dir * c.w * 0.3, y: c.y + c.h * 0.42 };
  return { x: c.dir > 0 ? c.x + m[0] * 3 : c.x + c.w - m[0] * 3, y: c.y + m[1] * 3 };
}

// O chefe tem o desenho dele segurando a banana? (aí não precisa desenhar a banana solta por cima)
function chefeDesenhaBanana(c) {
  const s = c && SPR_CHEFE[c.tipo];
  return !!(s && s.q && s.q.comBanana);
}

function brilhoBanana(b) {
  if (tempo % 5 === 0) {
    particula({ tipo: "q", x: b.x + 24 + (Math.random() - 0.5) * 30, y: b.y + 20 + (Math.random() - 0.5) * 24,
      vx: -1.5 - Math.random() * 2, vy: (Math.random() - 0.5) * 0.8, g: 0, vida: 26, max: 26, cor: Math.random() < 0.5 ? "#fff3bf" : "#ffd43b", tam: 5 });
  }
}

function atualizarBanana() {
  const b = banana;
  if (!b) return;
  const j = jogador;
  b.t++;
  if (b.estado === "fugindo") {
    const frente = j.x + j.w / 2;
    // a distância "respira": chega perto e se afasta
    let dist = 330 + Math.sin(b.t * 0.011) * 150 + Math.sin(b.t * 0.027 + 1.3) * 70;
    if (b.rajada > 0) {
      b.rajada--;
      dist += 280 * Math.min(1, b.rajada / 30);
    }
    dist = limitar(dist, 140, larguraVista() * 0.58);
    // chegou pertinho: uma rajada de vento leva a banana para longe
    if (!b.rajada && !j.morto && Math.abs(b.x + 24 - frente) < 130 && Math.abs(b.y + 20 - (j.y + j.h / 2)) < 230) {
      b.rajada = 90;
      som("vento");
      for (let k = 0; k < 5; k++) vento();
    }
    const alvoX = frente + dist - 24;
    b.x += (alvoX - b.x) * (alvoX > b.x ? 0.05 : 0.02);
    const alvoY = BANANA_ALTURA + Math.sin(b.t * 0.045) * 30 + Math.sin(b.t * 0.017) * 15;
    b.y += (alvoY - b.y) * 0.05;
    b.rot = Math.sin(b.t * 0.06) * 0.35;
    brilhoBanana(b);
    // reta final: ela escapa de vez e o macaco corre atrás
    if (!j.morto && j.x > fase.fimX - 200) {
      b.estado = "escapando";
      b.t = 0;
      iniciarSaida();
    }
  } else if (b.estado === "escapando" || b.estado === "solta") {
    b.x += 5 + b.t * 0.3;
    b.y -= b.estado === "solta" ? 6 - b.t * 0.06 : 2 - b.t * 0.02;
    b.rot += 0.3;
    if (tempo % 3 === 0) vento();
    brilhoBanana(b);
  } else if (b.estado === "chegando") {
    // chefe: a banana vem voando com o vento e ele pega no ar
    const c = chefe;
    if (!c || !c.pousou) { b.x = -90; return; }
    const p = maoDoChefe(c);
    const dx = p.x - 24 - b.x;
    const dy = p.y - 20 - b.y;
    const d = Math.hypot(dx, dy) || 1;
    const v = Math.min(d, 10 + b.t * 0.08);
    b.x += (dx / d) * v;
    b.y += (dy / d) * v + Math.sin(b.t * 0.2) * 1.5;
    b.rot += 0.25;
    if (tempo % 3 === 0) vento();
    brilhoBanana(b);
    if (d < 16) {
      b.estado = "presa";
      b.t = 0;
      som("poder");
      tremor = 8;
      for (let k = 0; k < 14; k++) {
        particula({ tipo: "q", x: p.x, y: p.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, g: 0.1, vida: 26, max: 26, cor: k % 2 ? "#ffd43b" : "#fff3bf", tam: 6 });
      }
    }
  } else if (b.estado === "presa") {
    const c = chefe;
    if (!c) return;
    const p = maoDoChefe(c);
    b.x = p.x - 24;
    b.y = p.y - 20 + Math.sin(tempo * 0.1) * 3;
    b.rot = c.dir * 0.3;
    // derrotado: o chefe solta e ela foge de novo
    if (!c.vivo) {
      b.estado = "solta";
      b.t = 0;
      som("vento");
    }
  } else if (b.estado === "caindo") {
    b.vy = Math.min(b.vy + 0.3, 9);
    b.y += b.vy;
    b.rot += 0.1;
    if (b.y >= b.base) { b.y = b.base; b.estado = "parada"; b.rot = 0; b.t = 0; }
  } else if (b.estado === "parada") {
    // (só o tutorial ainda usa a banana parada no fim)
    b.y = b.base + Math.sin(b.t * 0.08) * 4;
    if (!j.morto && Math.abs(j.x + j.w / 2 - (b.x + 24)) < 110 && j.y + j.h > CHAO - 160) {
      b.estado = "voando";
      b.t = 0;
      j.comemorar = 45;
      j.vx = 0;
      cancelarLaco();
      som("vento");
    }
  } else if (b.estado === "voando") {
    b.x += 11 + b.t * 0.25;
    b.y -= 6.5 - b.t * 0.08;
    b.rot += 0.35;
    if (tempo % 2 === 0) vento();
    if (b.t === 42) fimDaFase();
  }
}

// Fim da fase: o macaco sai correndo da tela atrás da banana (sem controle, sem levar dano)
function iniciarSaida() {
  const j = jogador;
  if (!j || j.saindo || j.morto) return;
  j.saindo = true;
  j.cipo = null;
  cancelarLaco();
  if (j.deslizando) { j.deslizando = false; j.y -= 36; j.h = 72; }
  j.comemorar = 0;
  j.dir = 1;
}

function correrSaindo(j) {
  j.dir = 1;
  j.vx = 7.5;
  j.x += j.vx;
  // se estava no ar, cai até o chão
  if (j.y + j.h < CHAO) {
    j.vy = Math.min(j.vy + GRAV, MAX_QUEDA);
    j.y = Math.min(j.y + j.vy, CHAO - j.h);
  }
  j.noChao = j.y + j.h >= CHAO;
  if (j.noChao) { j.vy = 0; j.passos++; }
  if (j.noChao && j.passos % 4 === 0) poeiraPes(j.x + j.w / 2 - 14, j.y + j.h);
  if (!j.saiu && j.x > cameraX + larguraVista() + 30) {
    j.saiu = true;
    fimDaFase();
  }
}

function fimDaFase() {
  medir("level", nomeNivel(), "complete");
  if (fase.tutorial) { fimDoTutorial(); return; }
  cronFimFase();
  avaliarFase();
  const i = fase.indice;
  let titulo = tr("Fase completa!");
  if (fase.ehChefe) {
    titulo = tr("{0} completo!", MUNDOS[fase.mundo].nome);
    save.chefes[fase.mundo] = true;
  }
  save.desbloqueado = Math.max(save.desbloqueado, Math.min(i + 1, TOTAL_FASES - 1));
  ganharXp(XP.fase + 15 * fase.mundo);
  const premio = darPremioDaFase(i);
  let sub = tr("A banana escapou de novo! Próximo: {0}", nomeFase(i + 1));
  if (premio) sub = tr("Você ganhou: {0}!  Próximo: {1}", premio.nome, nomeFase(i + 1));
  salvar();
  sujo = false;
  som("vitoria");
  mostrarMensagem(titulo, sub, 115, function() {
    intervaloComercial(function() {
      trocarCena(function() { iniciarFase(i + 1); });
    });
  });
}


// =========================
// PODERES
// =========================

function usarPoder(id) {
  const p = PODERES.find(function(x) { return x.id === id; });
  if (!p || estado !== "jogo" || pausado || !jogador || jogador.morto || (mensagem && mensagem.congela)) return;
  if (save.poderes[id] <= 0 || recargas[id] > 0 || (buffs[id] || 0) > 0) { som("negado"); return; }
  save.poderes[id]--;
  sujo = true;
  recargas[id] = p.recarga;
  som("poder");
  texto(jogador.x + jogador.w / 2, jogador.y - 20, p.nome + "!", "#ffffff", 22);
  if (id === "nuke") nuke();
  else buffs[id] = p.duracao;
}

function nuke(mini) {
  const j = jogador;
  const cx = j.x + j.w / 2;
  const alcance = mini ? 480 : 800;
  flashNuke = mini ? 25 : 40;
  tremor = mini ? 18 : 30;
  som("nuke");
  particula({ tipo: "anel", x: cx, y: j.y + j.h / 2, vx: 0, vy: 0, g: 0, vida: 40, max: 40, raio: alcance + 100 });
  for (let i = 0; i < inimigos.length; i++) {
    const e = inimigos[i];
    if (e.vivo && Math.abs(e.x + e.w / 2 - cx) < alcance) {
      if (e.lacado) cancelarLaco();
      matarInimigo(e, "nuke");
    }
  }
  projeteis = projeteis.filter(function(p) { return p.doJogador; });
  if (chefe && chefe.vivo) danoChefe(mini ? 4 : 8, cx, true);
}

function atualizarBuffs() {
  Object.keys(buffs).forEach(function(k) { if (buffs[k] > 0) buffs[k]--; });
  Object.keys(recargas).forEach(function(k) { if (recargas[k] > 0) recargas[k]--; });
  if (flashNuke > 0) flashNuke--;
}


// =========================
// PARTÍCULAS
// =========================

function particula(o) {
  if (particulas.length > 500) particulas.shift();
  particulas.push(o);
}

function poeira(x, y, n, lado) {
  for (let i = 0; i < n; i++) {
    particula({ tipo: "q", x: x, y: y - 4, vx: (lado ? lado * Math.random() * 2.5 : (Math.random() - 0.5) * 3), vy: -Math.random() * 1.5,
      g: 0.05, vida: 22, max: 22, cor: "#e9e3d5", tam: 7 });
  }
}

// Poeirinha dos pés ao correr (cor do terreno de cada mundo)
const COR_POEIRA = ["#b08a5a", "#f2d28b", "#f1f8ff", "#868e96"];

function poeiraPes(x, y) {
  particula({ tipo: "q", x: x + (Math.random() - 0.5) * 8, y: y - 6, vx: -jogador.dir * (0.3 + Math.random() * 0.6), vy: -0.6 - Math.random() * 0.8,
    g: 0.02, vida: 18, max: 18, cor: COR_POEIRA[fase.mundo], tam: 5 });
  particula({ tipo: "q", x: x + (Math.random() - 0.5) * 6, y: y - 3, vx: -jogador.dir * (0.5 + Math.random() * 0.9), vy: -0.3 - Math.random() * 0.7,
    g: 0.01, vida: 24, max: 24, cor: COR_POEIRA[fase.mundo], tam: 8 });
}

function faiscas(x, y) {
  for (let i = 0; i < 5; i++) {
    particula({ tipo: "q", x: x, y: y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, g: 0.1, vida: 12, max: 12, cor: "#ffe066", tam: 4 });
  }
}

function texto(x, y, txt, cor, tam) {
  particula({ tipo: "texto", x: x, y: y, vx: 0, vy: -1, g: 0, vida: 50, max: 50, texto: txt, cor: cor || "#ffffff", tam: tam || 20 });
}

function vento() {
  particula({ tipo: "vento", x: cameraX - 100 + Math.random() * 300, y: 200 + Math.random() * 400, vx: 22 + Math.random() * 8, vy: -1, g: 0, vida: 60, max: 60, tam: 40 + Math.random() * 60 });
}

// Rastro do macaco (dash e super velocidade): cópia do quadro atual tingida e esticada
const animFantasmas = new WeakMap();

function animTingir(spr, cor) {
  let m = animFantasmas.get(spr);
  if (!m) {
    m = {};
    animFantasmas.set(spr, m);
  }
  if (!m[cor]) {
    const c = criarCanvas(spr.width, spr.height);
    const g = c.getContext("2d");
    g.drawImage(spr, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = 0.65;
    g.fillStyle = cor;
    g.fillRect(0, 0, c.width, c.height);
    m[cor] = c;
  }
  return m[cor];
}

function fantasma(alfa) {
  const j = jogador;
  const spr = (SPRITES_PRIMATA[poseJogador()] || SPRITES_PRIMATA.parado)[j.dir > 0 ? "d" : "e"];
  const img = animTingir(spr, j.dash > 0 ? "#5ec8ff" : "#ffd43b");
  particula({ tipo: "fantasma", img: img, x: Math.round(j.x + j.w / 2 - 48), y: Math.round(j.y + j.h - 80), vx: 0, vy: 0, g: 0, vida: 16, max: 16, alfa: alfa });
}

function atualizarParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    if (--p.vida <= 0) particulas.splice(i, 1);
  }
}

function desenharEstrela4(x, y, r, cor) {
  ctx.fillStyle = cor;
  const s = Math.max(2, Math.round(r / 4));
  ctx.fillRect(x - s / 2, y - r, s, r * 2);
  ctx.fillRect(x - r, y - s / 2, r * 2, s);
  ctx.fillRect(x - s, y - s, s * 2, s * 2);
}

function desenharParticulas() {
  for (let i = 0; i < particulas.length; i++) {
    const p = particulas[i];
    const k = p.vida / p.max;
    if (p.tipo === "q") {
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = p.cor;
      const t = Math.max(1, Math.round(p.tam * (0.4 + 0.6 * k)));
      ctx.fillRect(Math.round(p.x - t / 2), Math.round(p.y - t / 2), t, t);
    } else if (p.tipo === "fumaca") {
      ctx.globalAlpha = k * 0.6;
      ctx.fillStyle = p.cor;
      const t = Math.round(p.tam * (1.6 - k));
      ctx.fillRect(Math.round(p.x - t / 2), Math.round(p.y - t / 2), t, t);
    } else if (p.tipo === "texto") {
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = "bold " + p.tam + "px " + FONTE;
      ctx.textAlign = "center";
      textoSombra(p.texto, Math.round(p.x), Math.round(p.y), p.cor, p.tam > 40 ? 3 : 2);
    } else if (p.tipo === "estrela") {
      const fase01 = 1 - k;
      const r = 6 + Math.sin(fase01 * Math.PI) * 22;
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(fase01 * 2);
      desenharEstrela4(0, 0, Math.round(r), "#fff3bf");
      desenharEstrela4(0, 0, Math.round(r * 0.5), "#ffffff");
      ctx.restore();
      if (p.vida % 6 < 3) desenharEstrela4(p.x + 26, p.y + 14, 5, "#ffe066");
    } else if (p.tipo === "anel") {
      const r = (1 - k) * (p.raio || 900);
      ctx.globalAlpha = k;
      ctx.strokeStyle = "#fff3bf";
      ctx.lineWidth = 24 * k + 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.tipo === "fantasma") {
      ctx.globalAlpha = k * p.alfa;
      ctx.drawImage(p.img, p.x, p.y);
    } else if (p.tipo === "vento") {
      ctx.globalAlpha = Math.min(1, k * 2) * 0.8;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.tam), 3);
    }
  }
  ctx.globalAlpha = 1;
}

// =========================
// EFEITOS VISUAIS: contorno de texto, painéis, brilhos, sombras, vinheta e ambiente
// Tudo que é estático é pré-renderizado uma vez e guardado em VIS_CACHE.
// =========================

const VIS_CACHE = {};
const VIS_SIL = new Map();

function cacheVis(chave, criar) {
  let c = VIS_CACHE[chave];
  if (!c) {
    c = criar();
    VIS_CACHE[chave] = c;
  }
  return c;
}

// Animações: entra suave e "quica" um pouquinho no fim
function suavizar(k) {
  k = limitar(k, 0, 1);
  return k * k * (3 - 2 * k);
}

function saltitar(k) {
  k = limitar(k, 0, 1);
  return 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
}

// Texto com contorno de verdade: o texto preto deslocado nas 8 direções e depois a cor por cima.
// A cor pode ser uma lista [topo, base] (degradê vertical). Chamar depois de ajustar ctx.font e ctx.textAlign.
// Com transparência (globalAlpha < 1) o texto é pré-renderizado, senão os contornos se acumulariam.
const VIS_TEXTOS = new Map();

function pintarTextoContorno(g, txt, x, y, cor, e, tam) {
  g.fillStyle = "#000000";
  for (let dy = -e; dy <= e; dy += e) {
    for (let dx = -e; dx <= e; dx += e) {
      if (dx || dy) g.fillText(txt, x + dx, y + dy);
    }
  }
  g.fillText(txt, x, y + e + 1);
  if (Array.isArray(cor)) {
    const gr = g.createLinearGradient(0, y - tam * 0.85, 0, y + tam * 0.1);
    gr.addColorStop(0, cor[0]);
    gr.addColorStop(1, cor[1]);
    g.fillStyle = gr;
  } else {
    g.fillStyle = cor || "#ffffff";
  }
  g.fillText(txt, x, y);
}

function textoSombra(txt, x, y, cor, esp) {
  const e = esp || 2;
  const m = /(\d+)px/.exec(ctx.font);
  const tam = m ? +m[1] : 16;
  if (ctx.globalAlpha > 0.995) {
    pintarTextoContorno(ctx, txt, x, y, cor, e, tam);
    return;
  }
  const chave = ctx.font + "|" + ctx.textAlign + "|" + txt + "|" + (Array.isArray(cor) ? cor.join() : cor) + "|" + e;
  let c = VIS_TEXTOS.get(chave);
  if (!c) {
    if (VIS_TEXTOS.size > 250) VIS_TEXTOS.clear();
    const larg = Math.ceil(ctx.measureText(txt).width);
    const pad = e + 3;
    const y0 = pad + Math.ceil(tam);
    const cv = criarCanvas(larg + pad * 2, y0 + Math.ceil(tam * 0.45) + pad + e);
    const g = cv.getContext("2d");
    g.font = ctx.font;
    g.textAlign = "left";
    pintarTextoContorno(g, txt, pad, y0, cor, e, tam);
    c = { cv: cv, larg: larg, pad: pad, y0: y0 };
    VIS_TEXTOS.set(chave, c);
  }
  const ax = ctx.textAlign === "center" ? -c.larg / 2 : ctx.textAlign === "right" ? -c.larg : 0;
  ctx.drawImage(c.cv, Math.round(x + ax - c.pad), Math.round(y - c.y0));
}

// Silhueta de um sprite numa cor só (guardada, para não recriar a cada quadro)
function silhuetaDe(img, cor) {
  let m = VIS_SIL.get(img);
  if (!m) {
    m = {};
    VIS_SIL.set(img, m);
  }
  if (!m[cor]) m[cor] = silhueta(img, cor);
  return m[cor];
}

// Sprite com contorno de pixel (a silhueta deslocada nas 4 direções por baixo)
function desenharContorno(img, sx, sy, sw, sh, x, y, w, h, cor, esp) {
  const s = silhuetaDe(img, cor);
  const e = esp || 2;
  ctx.drawImage(s, sx, sy, sw, sh, x - e, y, w, h);
  ctx.drawImage(s, sx, sy, sw, sh, x + e, y, w, h);
  ctx.drawImage(s, sx, sy, sw, sh, x, y - e, w, h);
  ctx.drawImage(s, sx, sy, sw, sh, x, y + e, w, h);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function retanguloCortado(g, x, y, w, h, n) {
  for (let i = 0; i <= n / 2; i++) {
    const ins = n - 2 * i;
    g.fillRect(x + ins, y + 2 * i, w - 2 * ins, h - 4 * i);
  }
}

// Painel em pixel art: fundo escuro translúcido, borda clara de 2px com bisel e cantos recortados
function criarPainel(w, h, cor, fundo) {
  const c = criarCanvas(w + 6, h + 6);
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0.35)";
  retanguloCortado(g, 3, 6, w, h, 4);
  g.fillStyle = "#0d0704";
  retanguloCortado(g, 3, 3, w, h, 4);
  g.fillStyle = escurecer(cor, 0.5);
  retanguloCortado(g, 4, 4, w - 2, h - 2, 4);
  g.fillStyle = cor;
  g.fillRect(9, 4, w - 12, 2);
  g.fillRect(4, 9, 2, h - 12);
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000000";
  retanguloCortado(g, 6, 6, w - 6, h - 6, 2);
  g.globalCompositeOperation = "source-over";
  g.fillStyle = fundo;
  retanguloCortado(g, 6, 6, w - 6, h - 6, 2);
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.fillRect(8, 6, w - 10, 3);
  g.fillStyle = "rgba(255,255,255,0.07)";
  g.fillRect(8, h - 2, w - 10, 2);
  return c;
}

function painelPixel(x, y, w, h, cor, fundo) {
  w = Math.round(w);
  h = Math.round(h);
  cor = cor || "#e8cf9a";
  fundo = fundo || "rgba(22,13,8,0.78)";
  const c = cacheVis("painel" + w + "x" + h + cor + fundo, function() { return criarPainel(w, h, cor, fundo); });
  ctx.drawImage(c, Math.round(x) - 3, Math.round(y) - 3);
}

// Quadradinho dos poderes: moldura marrom com bisel (ou verde e brilhando quando o poder está ativo)
function slotPixel(x, y, ativo) {
  const c = cacheVis("slot" + (ativo ? 1 : 0), function() {
    const s = criarCanvas(64, 64);
    const g = s.getContext("2d");
    const claro = ativo ? "#b2f2bb" : "#c99a5b";
    const meio = ativo ? "#51cf66" : "#8a5a2b";
    const escuro = ativo ? "#2b8a3e" : "#4a2f12";
    g.fillStyle = "rgba(0,0,0,0.4)";
    retanguloCortado(g, 3, 5, 58, 58, 2);
    g.fillStyle = "#0d0704";
    retanguloCortado(g, 3, 3, 58, 58, 2);
    g.fillStyle = escuro;
    retanguloCortado(g, 4, 4, 56, 56, 2);
    g.fillStyle = meio;
    g.fillRect(6, 6, 52, 52);
    g.fillStyle = claro;
    g.fillRect(6, 4, 52, 2);
    g.fillRect(4, 6, 2, 52);
    g.fillStyle = "#1b110a";
    g.fillRect(8, 8, 48, 48);
    const gr = g.createLinearGradient(0, 8, 0, 56);
    gr.addColorStop(0, ativo ? "#1f4d2a" : "#33210f");
    gr.addColorStop(1, "#150d07");
    g.fillStyle = gr;
    g.fillRect(8, 8, 48, 48);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(8, 8, 48, 3);
    g.fillRect(8, 8, 3, 48);
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(8, 53, 48, 3);
    return s;
  });
  ctx.drawImage(c, x - 3, y - 3);
}

// Brilho aditivo (globalCompositeOperation "lighter"): usado em lava, fogo, moedas e poderes
function spriteLuz(rgb) {
  return cacheVis("luz" + rgb, function() {
    const c = criarCanvas(64, 64);
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(" + rgb + ",1)");
    gr.addColorStop(0.3, "rgba(" + rgb + ",0.55)");
    gr.addColorStop(0.65, "rgba(" + rgb + ",0.16)");
    gr.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  });
}

function luzAditiva(x, y, raio, rgb, alfa) {
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alfa;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(spriteLuz(rgb), x - raio, y - raio, raio * 2, raio * 2);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// Degradê vertical de 1 pixel de largura, pré-renderizado para esticar com drawImage
function degradeVertical(chave, altura, paradas) {
  return cacheVis("dv" + chave, function() {
    const c = criarCanvas(1, altura);
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, altura);
    paradas.forEach(function(p) { gr.addColorStop(p[0], p[1]); });
    g.fillStyle = gr;
    g.fillRect(0, 0, 1, altura);
    return c;
  });
}

function preencherDegrade(grad, x, y, w, h) {
  ctx.drawImage(grad, 0, 0, 1, grad.height, x, y, w, h);
}


// ---------- Sombras no chão ----------

const SUP = { y: 0, x0: 0, x1: 0 };

// Acha a superfície (chão, bloco ou plataforma) logo abaixo de um ponto; preenche SUP
function superficieAbaixo(x, y) {
  let melhor = 1e9;
  const s = fase.solidos;
  for (let i = 0; i < s.length; i++) {
    const b = s[i];
    if (x >= b.x && x <= b.x + b.w && b.y >= y - 8 && b.y < melhor) {
      melhor = b.y;
      SUP.x0 = b.x;
      SUP.x1 = b.x + b.w;
    }
  }
  const p = fase.plataformas;
  for (let i = 0; i < p.length; i++) {
    const b = p[i];
    if (b.caiu || b.cogumelo) continue;
    if (x >= b.x && x <= b.x + b.w && b.y >= y - 8 && b.y < melhor) {
      melhor = b.y;
      SUP.x0 = b.x;
      SUP.x1 = b.x + b.w;
    }
  }
  SUP.y = melhor;
  return melhor < 1e9;
}

function fatiaSombra(x, y, w, h) {
  const a = Math.max(x, SUP.x0);
  const b = Math.min(x + w, SUP.x1);
  if (b > a) ctx.fillRect(a, y, b - a, h);
}

// Sombra elíptica pixelada projetada no chão/plataforma de baixo; encolhe e clareia com a altura
function sombraSprite(cx, pe, larg, alfa) {
  if (superficieAbaixo(cx, pe)) desenharSombraEm(cx, pe, larg, alfa);
}

// Desenha a sombra na superfície já guardada em SUP (as cenas sem fase usam um chão fixo)
function desenharSombraEm(cx, pe, larg, alfa) {
  const dist = Math.max(0, SUP.y - pe);
  if (dist > 400) return;
  const k = Math.max(0.3, 1 - dist / 400);
  const w = Math.max(8, Math.round((larg * k) / 4) * 4);
  const a = (alfa || 0.34) * (0.45 + 0.55 * k);
  ctx.fillStyle = "rgba(0,0,0," + a.toFixed(3) + ")";
  const y = SUP.y;
  const m = Math.round((w * 0.64) / 4) * 4;
  fatiaSombra(Math.round(cx - m / 2), y - 2, m, 3);
  fatiaSombra(Math.round(cx - w / 2), y + 1, w, 4);
  fatiaSombra(Math.round(cx - m / 2), y + 5, m, 3);
}

// Sombra no chão fixo das cenas (abertura, final, menu)
function sombraCena(cx, pe, larg, alfa) {
  SUP.y = CHAO;
  SUP.x0 = -9999;
  SUP.x1 = 9999;
  desenharSombraEm(cx, pe, larg, alfa);
}

// Pedaço de sombra só em cima dos pedaços de chão (não atravessa buracos)
function sombraNoChao(x, y, w, h) {
  const s = fase.solidos;
  for (let i = 0; i < s.length; i++) {
    const b = s[i];
    if (b.tipo !== "chao" || b.x > x + w || b.x + b.w < x) continue;
    const a = Math.max(x, b.x);
    const f = Math.min(x + w, b.x + b.w);
    if (f > a) ctx.fillRect(a, y, f - a, h);
  }
}

// Sombras que blocos e plataformas jogam no chão
function desenharSombrasMundo(cam) {
  const s = fase.solidos;
  for (let i = 0; i < s.length; i++) {
    const b = s[i];
    if (b.tipo === "chao" || !visivel(b.x, b.w + 60, cam) || b.y > CHAO) continue;
    if (b.y + b.h >= CHAO - 2) {
      // parede apoiada no chão: sombra comprida do lado direito
      const d = Math.min(68, 18 + b.h * 0.3);
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      sombraNoChao(b.x + b.w, CHAO, d, 7);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      sombraNoChao(b.x + b.w, CHAO + 7, d * 0.6, 7);
      sombraNoChao(b.x + b.w, CHAO, d * 1.35, 3);
    } else {
      const a = Math.max(0.07, 0.24 - (CHAO - b.y - b.h) / 1500);
      ctx.fillStyle = "rgba(0,0,0," + a.toFixed(3) + ")";
      sombraNoChao(b.x + 6, CHAO, b.w - 4, 6);
    }
  }
  const p = fase.plataformas;
  for (let i = 0; i < p.length; i++) {
    const b = p[i];
    if (b.caiu || b.cogumelo || !visivel(b.x, b.w, cam) || b.y > CHAO - 30) continue;
    const a = Math.max(0.06, 0.22 - (CHAO - b.y) / 1700);
    ctx.fillStyle = "rgba(0,0,0," + a.toFixed(3) + ")";
    sombraNoChao(b.x + 8, CHAO, b.w - 8, 5);
  }
}

// Sombra do macaco, dos inimigos e do chefe
function desenharSombras(cam) {
  const j = jogador;
  if (!j.morto && !j.cipo) sombraSprite(j.x + j.w / 2, j.y + j.h, j.deslizando ? 72 : 66, 0.5);
  for (let i = 0; i < inimigos.length; i++) {
    const e = inimigos[i];
    if (!e.vivo || e.espaco || e.lacado || !visivel(e.x, e.w, cam)) continue;
    if (e.t.comp === "aranha") continue;
    sombraSprite(e.x + e.w / 2, e.y + e.h, Math.min(e.w, 96) * 0.9, e.t.voa ? 0.26 : 0.34);
  }
  if (chefe && !chefe.intangivel && !(chefe.estado === "derrotado" && chefe.t > 80)) {
    sombraSprite(chefe.x + chefe.w / 2, chefe.y + chefe.h, Math.min(chefe.w, 220) * 0.85, 0.36);
  }
}


// ---------- Vinheta, ambiente de cada mundo ----------

const VIS_MUNDO = [
  { vin: "4,20,8", forca: 0.55 },
  { vin: "58,26,4", forca: 0.5 },
  { vin: "6,20,56", forca: 0.55 },
  { vin: "28,0,0", forca: 0.74 }
];

// Vinheta suave nas bordas: uma canvas 1200x700 pré-renderizada por mundo
function vinhetaDe(mundo) {
  return cacheVis("vin" + mundo, function() {
    const m = VIS_MUNDO[mundo] || VIS_MUNDO[0];
    const c = criarCanvas(LARGURA, ALTURA);
    const g = c.getContext("2d");
    g.translate(LARGURA / 2, ALTURA / 2);
    g.scale(1, 0.82);
    const gr = g.createRadialGradient(0, 0, 250, 0, 0, 760);
    gr.addColorStop(0, "rgba(" + m.vin + ",0)");
    gr.addColorStop(0.4, "rgba(" + m.vin + "," + (m.forca * 0.15).toFixed(3) + ")");
    gr.addColorStop(0.75, "rgba(" + m.vin + "," + (m.forca * 0.55).toFixed(3) + ")");
    gr.addColorStop(1, "rgba(" + m.vin + "," + m.forca + ")");
    g.fillStyle = gr;
    g.fillRect(-LARGURA, -ALTURA, LARGURA * 2, ALTURA * 2);
    return c;
  });
}

// Raios de luz atravessando a copa das árvores (Selva)
function raiosDeLuz() {
  return cacheVis("raios", function() {
    const c = criarCanvas(LARGURA, ALTURA);
    const g = c.getContext("2d");
    const rng = criarRng(11);
    for (let i = 0; i < 8; i++) {
      const x0 = 270 + i * 110 + rng() * 40;
      const w = 34 + rng() * 54;
      const a = 0.1 + rng() * 0.1;
      const gr = g.createLinearGradient(0, 0, 0, ALTURA * 0.92);
      gr.addColorStop(0, "rgba(255,248,190," + a.toFixed(3) + ")");
      gr.addColorStop(1, "rgba(255,248,190,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x0, 0);
      g.lineTo(x0 + w, 0);
      g.lineTo(x0 + w - 240, ALTURA * 0.92);
      g.lineTo(x0 - 240, ALTURA * 0.92);
      g.fill();
    }
    return c;
  });
}

// Faixa de neblina (Gelo e Vulcão)
function neblina(rgb) {
  return cacheVis("neb" + rgb, function() {
    const c = criarCanvas(640, 64);
    const g = c.getContext("2d");
    g.translate(320, 32);
    g.scale(5, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    gr.addColorStop(0, "rgba(" + rgb + ",0.5)");
    gr.addColorStop(0.6, "rgba(" + rgb + ",0.18)");
    gr.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gr;
    g.fillRect(-64, -32, 128, 64);
    return c;
  });
}

// Correção de cor, clima de luz e vinheta de cada mundo (por cima da cena, embaixo do HUD)
function ambienteMundo(mundo, cam, t) {
  const W = LARGURA;
  if (mundo === 0) {
    // Selva: raios de luz que balançam devagar
    const o = Math.round((cam * 0.1 + t * 0.15) % W);
    const r = raiosDeLuz();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55 + Math.sin(t * 0.017) * 0.25;
    ctx.drawImage(r, -o, 0);
    ctx.drawImage(r, W - o, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255,240,150,0.04)";
    ctx.fillRect(0, 0, W, ALTURA);
  } else if (mundo === 1) {
    // Deserto: sol forte, calor e poeira no horizonte
    ctx.fillStyle = "rgba(255,170,60,0.07)";
    ctx.fillRect(0, 0, W, ALTURA);
    luzAditiva(1020, 40, 520, "255,205,120", 0.2 + Math.sin(t * 0.02) * 0.03);
    preencherDegrade(degradeVertical("calor", 64, [[0, "rgba(255,205,120,0)"], [0.62, "rgba(255,205,120,0.2)"], [1, "rgba(255,190,100,0.08)"]]), 0, 0, W, ALTURA);
    const neb = neblina("240,200,130");
    ctx.globalAlpha = 0.5;
    for (let k = 0; k < 3; k++) {
      const x = ((k * 520 + t * (1.2 + k * 0.4) - cam * 0.5) % 1700 + 1700) % 1700 - 400;
      ctx.drawImage(neb, Math.round(x), 520 + k * 34 + Math.round(Math.sin(t * 0.03 + k) * 4), 640, 64);
    }
    ctx.globalAlpha = 1;
  } else if (mundo === 2) {
    // Gelo: tom frio e neblina baixa
    ctx.fillStyle = "rgba(110,170,255,0.08)";
    ctx.fillRect(0, 0, W, ALTURA);
    preencherDegrade(degradeVertical("gelo", 64, [[0, "rgba(160,205,255,0.1)"], [0.35, "rgba(160,205,255,0)"], [0.75, "rgba(225,240,255,0)"], [1, "rgba(225,240,255,0.2)"]]), 0, 0, W, ALTURA);
    const neb = neblina("235,245,255");
    ctx.globalAlpha = 0.55;
    for (let k = 0; k < 3; k++) {
      const x = ((k * 560 + t * (0.5 + k * 0.2) - cam * 0.35) % 1700 + 1700) % 1700 - 400;
      ctx.drawImage(neb, Math.round(x), 500 + k * 40, 640, 64);
    }
    ctx.globalAlpha = 1;
  } else {
    // Vulcão: brilho quente pulsando de baixo e fumaça avermelhada
    ctx.fillStyle = "rgba(150,20,0,0.07)";
    ctx.fillRect(0, 0, W, ALTURA);
    const pulso = 0.34 + Math.sin(t * 0.05) * 0.1 + Math.sin(t * 0.23) * 0.04;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = pulso;
    preencherDegrade(degradeVertical("vulcao", 64, [[0, "rgba(255,90,10,0)"], [0.5, "rgba(255,80,10,0)"], [0.82, "rgba(255,90,10,0.45)"], [1, "rgba(255,130,30,0.85)"]]), 0, 0, W, ALTURA);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const neb = neblina("120,30,10");
    ctx.globalAlpha = 0.45;
    for (let k = 0; k < 3; k++) {
      const x = ((k * 560 + t * (0.7 + k * 0.3) - cam * 0.4) % 1700 + 1700) % 1700 - 400;
      ctx.drawImage(neb, Math.round(x), 440 + k * 46, 640, 64);
    }
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(vinhetaDe(mundo), 0, 0);
}


// ---------- Acabamento do terreno ----------

const CONTORNO_MUNDO = ["#14210b", "#4a2f0a", "#16294a", "#0d0707"];

// Contorno escuro no topo do chão, sombra sob a grama, degradê da terra e a franja do tema (se existir)
function acabamentoChao(mundo, x0, x1) {
  const w = x1 - x0;
  if (w <= 0) return;
  ctx.fillStyle = CONTORNO_MUNDO[mundo];
  ctx.fillRect(x0, CHAO - 2, w, 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x0, CHAO + 32, w, 4);
  preencherDegrade(degradeVertical("terra", 48, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.5)"]]), x0, CHAO + 36, w, ALTURA - CHAO - 36);
  const franja = TEMAS[mundo].franja;
  if (franja) {
    const pat = cacheVis("franja" + mundo, function() { return ctx.createPattern(franja, "repeat"); });
    ctx.save();
    ctx.translate(0, CHAO - 8);
    ctx.fillStyle = pat;
    ctx.fillRect(x0, 0, w, 8);
    ctx.restore();
  }
}

// Lateral exposta de um pedaço de chão ou bloco: contorno escuro, luz de um lado e sombra do outro
function bordaLateral(mundo, x, lado, yTopo, yBase) {
  const h = yBase - yTopo;
  ctx.fillStyle = CONTORNO_MUNDO[mundo];
  ctx.fillRect(lado < 0 ? x - 2 : x, yTopo - 2, 2, h + 2);
  if (lado < 0) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x, yTopo, 2, h);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + 2, yTopo, 4, h);
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.fillRect(x - 2, yTopo, 2, h);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x - 6, yTopo, 4, h);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(x - 10, yTopo, 4, h);
  }
}

// Buracos entre os pedaços de chão (calculados uma vez por fase)
function buracosDaFase() {
  if (!fase.buracos) {
    const chaos = fase.solidos.filter(function(s) { return s.tipo === "chao"; }).sort(function(a, b) { return a.x - b.x; });
    fase.buracos = [];
    for (let i = 0; i < chaos.length; i++) {
      const s = chaos[i];
      const ant = chaos[i - 1];
      const prox = chaos[i + 1];
      s.exposE = !ant || ant.x + ant.w < s.x - 1;
      s.exposD = !prox || prox.x > s.x + s.w + 1;
      if (prox && prox.x > s.x + s.w + 1) fase.buracos.push({ x: s.x + s.w, w: prox.x - (s.x + s.w) });
    }
  }
  return fase.buracos;
}

// Clima de cada mundo (folhas, poeira, neve, brasas) - fica na tela, não no mundo
const clima = [];

function atualizarClima(mundo) {
  while (clima.length < 46) clima.push(novoClima(mundo, true));
  for (let i = 0; i < clima.length; i++) {
    const c = clima[i];
    c.t++;
    let balanco = 0;
    if (c.tipo === "folha") balanco = Math.sin(c.t * 0.05 + c.fase) * 0.7;
    else if (c.tipo === "neve") balanco = Math.sin(c.t * 0.03 + c.fase) * 0.45;
    else if (c.tipo === "brasa") balanco = Math.sin(c.t * 0.07 + c.fase) * 0.5;
    else if (c.tipo === "poeira") c.y += Math.sin(c.t * 0.05 + c.fase) * 0.3;
    c.x += c.vx + balanco;
    c.y += c.vy;
    if (c.mundo !== mundo || c.y > ALTURA + 10 || c.y < -20 || c.x < -40 || c.x > LARGURA + 40) clima[i] = novoClima(mundo, false);
  }
}

function novoClima(mundo, qualquerLugar) {
  const r = Math.random;
  const c = { mundo: mundo, t: r() * 100, fase: r() * 6.28, x: r() * LARGURA, y: qualquerLugar ? r() * ALTURA : -10, prof: r(), tipo: "", cor: "#ffffff", cor2: "#ffffff", tam: 4, alfa: 1 };
  if (mundo === 0) {
    // folhas de duas cores que giram caindo
    const paletas = [["#8ce99a", "#2f9e44"], ["#51cf66", "#2b8a3e"], ["#b2f2bb", "#37b24d"], ["#ffd43b", "#e67700"]];
    const p = paletas[Math.floor(r() * (r() < 0.12 ? 4 : 3))];
    c.tipo = "folha";
    c.cor = p[0];
    c.cor2 = p[1];
    c.vx = -0.3;
    c.vy = 0.7 + r() * 0.7;
    c.tam = 8 + Math.floor(r() * 3) * 2;
    c.giro = 0.07 + r() * 0.12;
  } else if (mundo === 1) {
    // poeira e areia levadas pelo vento
    c.tipo = "poeira";
    c.vx = -3.5 - r() * 4;
    c.vy = 0.1 + r() * 0.3;
    c.x = qualquerLugar ? c.x : LARGURA + 10;
    c.y = r() * ALTURA;
    c.grande = r() < 0.15;
    c.tam = c.grande ? 5 : 2 + Math.floor(r() * 2);
    c.alfa = c.grande ? 0.12 : 0.25 + r() * 0.4;
    c.cor = "rgb(" + (r() < 0.5 ? "238,206,142" : "255,236,176") + ")";
  } else if (mundo === 2) {
    // flocos de neve: os maiores estão mais perto (mais rápidos e mais opacos)
    c.tipo = "neve";
    c.tam = [2, 2, 3, 3, 4, 6][Math.floor(c.prof * 5.99)];
    c.vy = 0.5 + c.prof * 1.4;
    c.vx = -0.2 - c.prof * 0.6;
    c.alfa = 0.45 + c.prof * 0.55;
  } else {
    // brasas que sobem brilhando
    c.tipo = "brasa";
    c.vx = 0.2;
    c.vy = -0.6 - r() * 1.2;
    c.tam = 2 + Math.floor(r() * 3);
    c.cor = r() < 0.5 ? "#ff922b" : "#ffd43b";
    c.y = qualquerLugar ? c.y : ALTURA + 5;
  }
  return c;
}

function desenharClima() {
  for (let i = 0; i < clima.length; i++) {
    const c = clima[i];
    const x = Math.round(c.x);
    const y = Math.round(c.y);
    if (c.tipo === "folha") {
      // gira de lado (a escala em x vira) mostrando uma cor e depois a outra
      const gira = Math.cos(c.t * c.giro + c.fase);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(c.t * 0.04 + c.fase) * 0.7);
      ctx.scale(gira, 1);
      const t = c.tam;
      ctx.fillStyle = c.cor;
      ctx.fillRect(-t / 2, -t / 4, t / 2, t / 2);
      ctx.fillStyle = c.cor2;
      ctx.fillRect(0, -t / 4, t / 2, t / 2);
      ctx.fillRect(t / 2, -1, 2, 2);
      ctx.fillStyle = "rgba(10,40,10,0.55)";
      ctx.fillRect(-t / 2, -1, t, 2);
      ctx.restore();
    } else if (c.tipo === "poeira") {
      ctx.globalAlpha = c.alfa;
      ctx.fillStyle = c.cor;
      if (c.grande) ctx.fillRect(x, y, 18 + c.tam * 2, c.tam);
      else ctx.fillRect(x, y, c.tam * 2 + Math.round(-c.vx * 2), c.tam);
    } else if (c.tipo === "neve") {
      ctx.globalAlpha = c.alfa;
      ctx.fillStyle = c.tam >= 4 ? "#f1f8ff" : "#ffffff";
      if (c.tam >= 6) {
        ctx.fillRect(x - 2, y - 6, 4, 12);
        ctx.fillRect(x - 6, y - 2, 12, 4);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 4, y - 4, 8, 8);
      } else {
        ctx.fillRect(x, y, c.tam, c.tam);
      }
    } else {
      const piscar = 0.65 + Math.sin(c.t * 0.3 + c.fase) * 0.35;
      const fade = limitar(c.y / 160, 0, 1);
      luzAditiva(x, y, c.tam * 4 + 6, "255,110,20", 0.4 * piscar * fade);
      ctx.globalAlpha = piscar * fade;
      ctx.fillStyle = c.cor;
      ctx.fillRect(x, y, c.tam, c.tam);
    }
    ctx.globalAlpha = 1;
  }
}


// =========================
// ATUALIZAÇÃO DA FASE (1 passo)
// =========================

function atualizarJogo() {
  tempo++;
  if (fase.tutorial) atualizarTutorial();
  if (tremor > 0) tremor--;
  atualizarExtrasHud();

  if (atualizarMensagem()) {
    atualizarParticulas();
    return;
  }

  atualizarPlataformas();
  atualizarJogador();
  atualizarInimigos();
  if (chefe) atualizarChefe();
  atualizarProjeteis();
  atualizarPerigos();
  atualizarObstaculos();
  atualizarMoedas();
  atualizarBanana();
  atualizarBuffs();
  atualizarParticulas();
  if (jogador.brilho > 0) jogador.brilho--;

  // Câmera segue o macaco olhando um pouco para frente
  const j = jogador;
  const alvo = j.x + j.w / 2 - larguraVista() * 0.4 + j.dir * 80;
  if (!j.saindo) cameraX += (alvo - cameraX) * 0.1;   // saindo: a câmera para e o macaco sai da tela
  cameraX = limitar(cameraX, 0, Math.max(0, fase.largura - larguraVista()));
}


// =========================
// DESENHO DA FASE
// =========================

function desenharFundo(mundo, cam, t) {
  const tt = t === undefined ? tempo : t;
  // O fundo completo (céu e camadas com paralaxe) vem de js/arte.js quando ele existir
  if (typeof desenharFundoMundo === "function") {
    desenharFundoMundo(ctx, mundo, cam, tt);
    return;
  }
  const fx = Math.round(cam * 0.3) % LARGURA;
  ctx.drawImage(FUNDOS[mundo], -fx, 0);
  ctx.drawImage(FUNDOS[mundo], LARGURA - fx, 0);
}

function visivel(x, w, cam) {
  return x + w > cam - 20 && x < cam + LARGURA + 20;
}

function desenharSolidos(cam) {
  const tema = TEMAS[fase.mundo];
  const mundo = fase.mundo;
  const buracos = buracosDaFase();

  // Abismo: escurece em degradê dentro dos buracos
  const abismo = degradeVertical("abismo", 80, [[0, "rgba(4,2,10,0)"], [0.25, "rgba(4,2,10,0.45)"], [0.7, "rgba(4,2,10,0.82)"], [1, "rgba(2,1,6,0.95)"]]);
  for (let i = 0; i < buracos.length; i++) {
    const b = buracos[i];
    if (!visivel(b.x, b.w, cam)) continue;
    preencherDegrade(abismo, b.x, CHAO, b.w, ALTURA - CHAO);
  }

  // Chão
  for (let i = 0; i < fase.solidos.length; i++) {
    const s = fase.solidos[i];
    if (s.tipo !== "chao" || !visivel(s.x, s.w, cam)) continue;
    const x0 = Math.max(s.x, cam - 32);
    const x1 = Math.min(s.x + s.w, cam + LARGURA + 32);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = padrao(s.gelo && tema.topoGelo ? "topoGelo" : "topo");
    ctx.fillRect(x0 - s.x, 0, x1 - x0, 32);
    ctx.fillStyle = padrao("terra");
    ctx.fillRect(x0 - s.x, 32, x1 - x0, ALTURA + 40 - s.y - 32);
    ctx.restore();
    acabamentoChao(mundo, x0, x1);
    if (s.exposE) bordaLateral(mundo, s.x, -1, s.y, ALTURA);
    if (s.exposD) bordaLateral(mundo, s.x + s.w, 1, s.y, ALTURA);
  }

  // Blocos (paredes, escadas, degraus)
  for (let i = 0; i < fase.solidos.length; i++) {
    const s = fase.solidos[i];
    if (s.tipo === "chao" || !visivel(s.x, s.w, cam)) continue;
    const x0 = Math.max(s.x, cam - 32);
    const x1 = Math.min(s.x + s.w, cam + LARGURA + 32);
    const y0 = Math.max(0, -s.y);
    const y1 = Math.min(s.h, ALTURA + 40 - s.y);
    if (y1 <= y0) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = padrao("bloco");
    ctx.fillRect(x0 - s.x, y0, x1 - x0, y1 - y0);
    ctx.restore();
    // contorno escuro, luz em cima e sombra embaixo
    const cor = CONTORNO_MUNDO[mundo];
    ctx.fillStyle = cor;
    ctx.fillRect(x0, s.y - 2, x1 - x0, 2);
    if (s.y + s.h < CHAO - 2) ctx.fillRect(x0, s.y + s.h, x1 - x0, 2);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x0, s.y, x1 - x0, 2);
    if (s.x >= cam - 32) bordaLateral(mundo, s.x, -1, s.y, s.y + s.h);
    if (s.x + s.w <= cam + LARGURA + 32) bordaLateral(mundo, s.x + s.w, 1, s.y, s.y + s.h);
    if (s.y + s.h < CHAO - 2) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x0, s.y + s.h - 4, x1 - x0, 4);
    }
  }
}

function desenharPlataformas(cam) {
  const pl = fase.plataformas;
  const cor = CONTORNO_MUNDO[fase.mundo];
  for (let i = 0; i < pl.length; i++) {
    const p = pl[i];
    if (!visivel(p.x, p.w, cam) || p.y > ALTURA) continue;
    const tx = p.tremendo > 0 && !p.caiu ? Math.round((Math.random() - 0.5) * 4) : 0;
    if (p.cogumelo) {
      // Cogumelo amassa quando o macaco quica nele
      const sq = p.amassar > 0 ? 1 - Math.sin((p.amassar / 12) * Math.PI) * 0.35 : 1;
      const cx = Math.round(p.x + p.w / 2);
      ctx.fillStyle = "rgba(0,0,0,0.26)";
      sombraNoChao(cx - 48, CHAO, 96, 4);
      ctx.save();
      ctx.translate(cx, CHAO);
      ctx.scale(1 + (1 - sq) * 0.5, sq);
      ctx.drawImage(SPR_COGUMELO, -SPR_COGUMELO.width / 2, -SPR_COGUMELO.height);
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.translate(Math.round(p.x) + tx, Math.round(p.y));
    if (p.caiu) ctx.globalAlpha = 0.7;
    // contorno e sombra por baixo
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(3, 18, p.w - 6, 4);
    ctx.fillStyle = cor;
    ctx.fillRect(-2, -2, p.w + 4, 20);
    if (p.fragil) {
      ctx.fillStyle = "#d0ebff";
      ctx.fillRect(0, 0, p.w, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, p.w, 4);
      ctx.fillStyle = "#74c0fc";
      ctx.fillRect(0, 12, p.w, 4);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(6, 6, 10, 2);
      ctx.fillRect(p.w - 22, 7, 8, 2);
      if (p.tremendo > 0 || p.caiu) {
        ctx.fillStyle = "#1c7ed6";
        ctx.fillRect(20, 4, 4, 8);
        ctx.fillRect(24, 8, 12, 4);
        ctx.fillRect(60, 2, 4, 10);
        ctx.fillRect(52, 6, 8, 4);
      }
    } else {
      ctx.fillStyle = padrao("plat");
      ctx.fillRect(0, 0, p.w, 16);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(0, 0, p.w, 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 14, p.w, 2);
      if (p.cai) {
        // plataforma que cai: rachaduras em brasa
        ctx.fillStyle = "rgba(255,107,0,0.6)";
        ctx.fillRect(16, 6, 6, 4);
        ctx.fillRect(p.w - 30, 4, 8, 4);
      }
    }
    ctx.restore();
    if (p.cai && !p.fragil && fase.mundo === 3) {
      luzAditiva(p.x + tx + 19, p.y + 8, 22, "255,107,0", 0.25 + (p.tremendo > 0 ? 0.25 : 0));
      luzAditiva(p.x + tx + p.w - 26, p.y + 6, 22, "255,107,0", 0.25 + (p.tremendo > 0 ? 0.25 : 0));
    }
  }
}

function desenharEspinhos(cam) {
  const mundo = fase.mundo;
  const contorno = cacheVis("espContorno" + mundo, function() { return ctx.createPattern(silhueta(TEMAS[mundo].espinho, CONTORNO_MUNDO[mundo]), "repeat"); });
  for (let i = 0; i < fase.espinhos.length; i++) {
    const s = fase.espinhos[i];
    if (!visivel(s.x, s.w, cam)) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    // sombra no chão e contorno escuro
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(-2, 22, s.w + 4, 4);
    ctx.fillStyle = contorno;
    ctx.fillRect(-2, 0, s.w, 24);
    ctx.fillRect(2, 0, s.w, 24);
    ctx.fillRect(0, -2, s.w, 24);
    ctx.fillStyle = padrao("espinho");
    ctx.fillRect(0, 0, s.w, 24);
    ctx.restore();
  }
}

function desenharCorda(x1, y1, x2, y2, cor, corFolha) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.floor(d / 5));
  ctx.fillStyle = cor;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.fillRect(Math.round(x1 + (x2 - x1) * t) - 3, Math.round(y1 + (y2 - y1) * t) - 3, 6, 6);
  }
  if (corFolha) {
    ctx.fillStyle = corFolha;
    for (let i = 1; i * 34 < d; i++) {
      const t = (i * 34) / d;
      const lado = i % 2 ? 1 : -1;
      ctx.fillRect(Math.round(x1 + (x2 - x1) * t) + (lado > 0 ? 3 : -11), Math.round(y1 + (y2 - y1) * t) - 3, 8, 6);
    }
  }
}

function desenharCipos(cam) {
  for (let i = 0; i < fase.cipos.length; i++) {
    const c = fase.cipos[i];
    if (!visivel(c.x - 350, 700, cam)) continue;
    let px, py;
    if (jogador.cipo === c) {
      px = jogador.x + jogador.w / 2;
      py = jogador.y + 6;
    } else {
      const a = Math.sin(tempo * 0.03 + c.fase) * 0.08;
      px = c.x + Math.sin(a) * c.comp;
      py = c.y + Math.cos(a) * c.comp;
    }
    desenharCorda(c.x, c.y, px, py, "#2b8a3e", "#69db7c");
    ctx.drawImage(SPR_GALHO, c.x - 24, c.y - 12);
  }
}

function desenharRedemoinho(x, y, w, h, cor) {
  ctx.fillStyle = cor;
  for (let yy = 0; yy < h; yy += 10) {
    const k = yy / h;
    const larg = w * (1 - k * 0.55);
    const off = Math.sin(tempo * 0.25 + yy * 0.08) * w * 0.18;
    ctx.fillRect(Math.round(x + w / 2 + off - larg / 2), Math.round(y + yy), Math.round(larg), 6);
  }
}

function desenharTornados(cam) {
  for (let i = 0; i < fase.tornados.length; i++) {
    const t = fase.tornados[i];
    if (!visivel(t.x, t.w, cam)) continue;
    desenharRedemoinho(t.x - 10, t.topo, t.w + 20, CHAO - t.topo, "rgba(224,176,98,0.55)");
  }
}

function desenharGeiseres(cam) {
  for (let i = 0; i < fase.geiseres.length; i++) {
    const g = fase.geiseres[i];
    if (!visivel(g.x, g.w, cam)) continue;
    const brilho = g.t >= 120 && g.t < 185;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    sombraNoChao(g.x - 2, CHAO - 1, g.w + 6, 5);
    if (brilho) luzAditiva(g.x + g.w / 2, CHAO - 8, 50 + (g.t >= 150 ? 20 : 0), "255,110,20", 0.35 + (tempo % 6 < 3 ? 0.1 : 0));
    ctx.drawImage(SPR_GEISER, g.x, CHAO - 12 + (brilho && tempo % 4 < 2 ? -2 : 0));
  }
}

function desenharErupcoes(cam) {
  for (let i = 0; i < fase.geiseres.length; i++) {
    const g = fase.geiseres[i];
    if (!visivel(g.x, g.w, cam) || g.t < 150 || g.t >= 185) continue;
    const k = Math.min(1, (g.t - 150) / 6) * Math.min(1, (185 - g.t) / 8);
    const alt = 430 * k;
    luzAditiva(g.x + g.w / 2, CHAO - alt / 2, 90, "255,110,20", 0.28 * k);
    for (let yy = 0; yy < alt; yy += 12) {
      const larg = 40 + Math.sin(tempo * 0.6 + yy * 0.1) * 10 - (yy / 430) * 16;
      ctx.fillStyle = (Math.floor(yy / 12) + tempo) % 3 === 0 ? "#ffd43b" : "#ff6b00";
      ctx.globalAlpha = 0.85 - (yy / 430) * 0.5;
      ctx.fillRect(Math.round(g.x + g.w / 2 - larg / 2), Math.round(CHAO - 12 - yy - 12), Math.round(larg), 12);
      if ((Math.floor(yy / 12) + tempo) % 4 === 0) {
        ctx.fillStyle = "#fff3a8";
        ctx.fillRect(Math.round(g.x + g.w / 2 - larg / 4), Math.round(CHAO - 12 - yy - 12), Math.round(larg / 2), 6);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function desenharEstalactites(cam) {
  for (let i = 0; i < fase.estalactites.length; i++) {
    const s = fase.estalactites[i];
    if (s.estado === "quebrada" || !visivel(s.x, 24, cam)) continue;
    const tx = s.estado === "tremendo" ? (tempo % 4 < 2 ? -2 : 2) : 0;
    ctx.drawImage(SPR_ESTALACTITE, Math.round(s.x + tx), Math.round(s.y));
  }
}

function desenharAreias(cam) {
  for (let i = 0; i < fase.areias.length; i++) {
    const a = fase.areias[i];
    if (!visivel(a.x, a.w, cam)) continue;
    preencherDegrade(degradeVertical("areia", 64, [[0, "#d9a648"], [0.5, "#c9953f"], [1, "#9a6c24"]]), a.x, CHAO - 8, a.w, 72);
    ctx.fillStyle = "#e0b062";
    for (let x = 0; x < a.w - 8; x += 16) {
      const y = CHAO - 4 + ((x * 7 + tempo) % 56);
      ctx.fillRect(a.x + x + Math.floor((tempo / 4 + x) % 8), y, 6, 4);
    }
    // ondulações que se espalham pela superfície
    ctx.fillStyle = "rgba(90,50,10,0.35)";
    for (let x = 0; x < a.w - 24; x += 48) {
      const k = ((tempo * 0.6 + x) % 60) / 60;
      ctx.fillRect(a.x + x + 8, CHAO - 6 + Math.round(k * 6), 24 + Math.round(k * 10), 2);
    }
    ctx.fillStyle = "#f2c66d";
    ctx.fillRect(a.x, CHAO - 10, a.w, 4);
    ctx.fillStyle = "#fff0bf";
    ctx.fillRect(a.x, CHAO - 10, a.w, 2);
    ctx.fillStyle = CONTORNO_MUNDO[1];
    ctx.fillRect(a.x - 2, CHAO - 10, 2, 74);
    ctx.fillRect(a.x + a.w, CHAO - 10, 2, 74);
  }
}

function desenharLavas(cam) {
  const t = tempo;
  const corpo = degradeVertical("lavaCorpo", 64, [[0, "#ffb42e"], [0.12, "#ff8a1f"], [0.35, "#f0560c"], [0.7, "#c52f06"], [1, "#7a1604"]]);
  const luz = degradeVertical("lavaLuz", 64, [[0, "rgba(255,110,20,0)"], [0.6, "rgba(255,110,20,0.25)"], [1, "rgba(255,140,40,0.7)"]]);
  for (let i = 0; i < fase.lavas.length; i++) {
    const l = fase.lavas[i];
    if (!visivel(l.x, l.w, cam)) continue;
    const topo = CHAO + 24;

    // Brilho quente no ar, pulsando (também ilumina um pouco as bordas do chão)
    const pulso = 0.62 + Math.sin(t * 0.06 + l.x * 0.01) * 0.2 + Math.sin(t * 0.19 + l.x) * 0.05;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = pulso;
    preencherDegrade(luz, l.x, topo - 130, l.w, 130);
    for (let k = 1; k <= 3; k++) {
      ctx.globalAlpha = pulso * (1 - k / 4);
      preencherDegrade(luz, l.x - 14 * k, topo - 130, 14, 130);
      preencherDegrade(luz, l.x + l.w + 14 * (k - 1), topo - 130, 14, 130);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Corpo em degradê e superfície ondulando
    preencherDegrade(corpo, l.x, topo, l.w, ALTURA - topo);
    for (let x = 0; x < l.w; x += 8) {
      const wx = l.x + x;
      const w8 = Math.min(8, l.w - x);
      const onda = Math.sin(t * 0.07 + wx * 0.045) + Math.sin(t * 0.11 - wx * 0.09) * 0.6;
      const h = 6 + Math.round(onda * 3);
      ctx.fillStyle = "#ffb42e";
      ctx.fillRect(wx, topo + 4 - h, w8, h);
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(wx, topo + 4 - h, w8, 4);
      if (h >= 8) {
        ctx.fillStyle = "#fff3a8";
        ctx.fillRect(wx + 2, topo + 4 - h, Math.max(2, w8 - 4), 2);
      }
    }

    // Crostas escuras boiando devagar
    const n = Math.max(2, Math.floor(l.w / 110));
    for (let k = 0; k < n; k++) {
      const px = l.x + ((k * 173 + t * 0.25) % Math.max(40, l.w - 20));
      const py = topo + 12 + (k * 17) % 22;
      ctx.fillStyle = "#6e1404";
      ctx.fillRect(Math.round(px), py, 18, 6);
      ctx.fillStyle = "#a02207";
      ctx.fillRect(Math.round(px) + 2, py, 14, 2);
    }

    // Bolhas subindo; ao chegar na superfície estouram em faíscas
    const nb = Math.max(2, Math.floor(l.w / 80));
    for (let k = 0; k < nb; k++) {
      const semente = k * 7919 + Math.floor(l.x);
      const u = ((t + (semente % 90)) % 90) / 90;
      const bx = l.x + 10 + (((semente * 13) % 1000) / 1000) * Math.max(10, l.w - 24);
      if (u < 0.9) {
        const by = ALTURA - 4 - (u / 0.9) * (ALTURA - topo - 4);
        const s = 4 + Math.floor(u * 3) * 2;
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(Math.round(bx), Math.round(by), s, s);
        ctx.fillStyle = "#fff3a8";
        ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      } else {
        const q = (u - 0.9) / 0.1;
        ctx.globalAlpha = 1 - q;
        ctx.fillStyle = "#ffe066";
        ctx.fillRect(Math.round(bx - 8 - q * 8), Math.round(topo - 6 - q * 12), 4, 4);
        ctx.fillRect(Math.round(bx + 6 + q * 8), Math.round(topo - 6 - q * 12), 4, 4);
        ctx.fillRect(Math.round(bx), Math.round(topo - 12 - q * 18), 4, 4);
        ctx.globalAlpha = 1;
      }
    }

    // Fagulhas flutuando acima da lava
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < n; k++) {
      const u = ((t * 0.7 + k * 53) % 100) / 100;
      const fx = l.x + (((k * 271) % 1000) / 1000) * l.w + Math.sin(t * 0.05 + k) * 8;
      ctx.globalAlpha = (1 - u) * 0.9;
      ctx.fillStyle = k % 2 ? "#ffb02e" : "#ffe066";
      const s = u < 0.5 ? 4 : 2;
      ctx.fillRect(Math.round(fx), Math.round(topo - 4 - u * 130), s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

function desenharFogos(cam) {
  for (let i = 0; i < fase.fogos.length; i++) {
    const fg = fase.fogos[i];
    if (fg.y === undefined || fg.y >= CHAO + 30 || !visivel(fg.x, 32, cam)) continue;
    luzAditiva(fg.x + 16, fg.y + 16, 44, "255,120,20", 0.55 + Math.sin(tempo * 0.4) * 0.1);
    ctx.drawImage(SPR_PROJ.podoboo, Math.round(fg.x), Math.round(fg.y));
  }
}

function desenharDecoracoes(cam) {
  for (let i = 0; i < fase.decoracoes.length; i++) {
    const d = fase.decoracoes[i];
    const spr = SPR_DECOR[d.spr];
    if (!visivel(d.x, spr.width, cam)) continue;
    if (!temChao(d.x + spr.width / 2, CHAO + 4)) continue;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    sombraNoChao(d.x + 4, CHAO - 1, spr.width - 4, 5);
    ctx.drawImage(spr, d.x, CHAO - spr.height);
  }
}

function desenharPlacas(cam) {
  const j = jogador;
  for (let i = 0; i < fase.placas.length; i++) {
    const p = fase.placas[i];
    if (!visivel(p.x - 200, 432, cam)) continue;
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    sombraNoChao(p.x - 2, CHAO - 1, 36, 5);
    ctx.drawImage(SPR_PLACA, p.x, CHAO - 32);
    if (Math.abs(j.x + j.w / 2 - (p.x + 16)) < 260) {
      const linhas = p.texto.replace(/\{(\w+)\}/g, function(m, a) { return nomeComando(a); }).split("\n");
      ctx.font = "bold 16px " + FONTE;
      let w = 0;
      linhas.forEach(function(l) { w = Math.max(w, ctx.measureText(l).width); });
      w = Math.ceil((w + 32) / 8) * 8;
      const h = linhas.length * 22 + 18;
      const bx = Math.round(p.x + 16 - w / 2);
      const by = CHAO - 56 - h;
      painelPixel(bx, by, w, h, "#8a5a2b", "rgba(255,248,231,0.97)");
      // pontinha do balão
      ctx.fillStyle = "#0d0704";
      ctx.fillRect(p.x + 8, by + h, 16, 2);
      ctx.fillRect(p.x + 10, by + h + 2, 12, 2);
      ctx.fillRect(p.x + 12, by + h + 4, 8, 2);
      ctx.fillStyle = "rgba(255,248,231,0.97)";
      ctx.fillRect(p.x + 10, by + h, 12, 2);
      ctx.fillRect(p.x + 12, by + h + 2, 8, 2);
      ctx.fillRect(p.x + 14, by + h + 4, 4, 2);
      ctx.fillStyle = "#3b2412";
      ctx.textAlign = "center";
      linhas.forEach(function(l, k) { ctx.fillText(l, bx + w / 2, by + 28 + k * 22); });
    }
  }
}

function desenharCheckpoints(cam) {
  const rgb = function(hex) { return parseInt(hex.slice(1, 3), 16) + "," + parseInt(hex.slice(3, 5), 16) + "," + parseInt(hex.slice(5, 7), 16); };
  for (let i = 0; i < fase.checkpoints.length; i++) {
    const c = fase.checkpoints[i];
    if (!visivel(c.x, 60, cam)) continue;
    const cor = MUNDOS[fase.mundo].cor;
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    sombraNoChao(c.x - 4, CHAO - 1, 26, 5);
    // pedra de base e mastro com contorno
    ctx.fillStyle = "#0d0704";
    ctx.fillRect(c.x - 2, CHAO - 10, 22, 10);
    ctx.fillStyle = "#8d949b";
    ctx.fillRect(c.x, CHAO - 8, 18, 8);
    ctx.fillStyle = "#c1c7cc";
    ctx.fillRect(c.x, CHAO - 8, 18, 2);
    ctx.fillStyle = "#0d0704";
    ctx.fillRect(c.x + 3, CHAO - 82, 9, 76);
    ctx.fillStyle = "#d8d8d8";
    ctx.fillRect(c.x + 5, CHAO - 80, 5, 74);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(c.x + 5, CHAO - 80, 2, 74);
    ctx.fillStyle = "#0d0704";
    ctx.fillRect(c.x + 1, CHAO - 88, 13, 10);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(c.x + 3, CHAO - 86, 9, 6);
    ctx.fillStyle = "#fff6b0";
    ctx.fillRect(c.x + 3, CHAO - 86, 3, 2);

    // bandeira em formato de flâmula, ondulando quando ativa
    const sobe = c.ativo ? (c.sobe === undefined ? 1 : c.sobe) : 0;
    const fy = Math.round(CHAO - 26 - sobe * 52);
    const base = c.ativo ? cor : "#868e96";
    for (let k = 0; k < 8; k++) {
      const h = 22 - k * 2;
      const onda = c.ativo ? Math.round(Math.sin(tempo * 0.15 + k * 0.7) * 2) : 0;
      const x = c.x + 10 + k * 4;
      ctx.fillStyle = "#0d0704";
      ctx.fillRect(x, fy + onda - 2 + k, 4, h + 4);
      ctx.fillStyle = base;
      ctx.fillRect(x, fy + onda + k, 4, h);
      ctx.fillStyle = c.ativo ? clarear(cor, 0.4) : "#adb5bd";
      ctx.fillRect(x, fy + onda + k, 4, 3);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x, fy + onda + k + h - 3, 4, 3);
    }
    if (c.ativo) luzAditiva(c.x + 26, fy + 12, 46, rgb(cor), 0.3 + Math.sin(tempo * 0.1) * 0.08);
  }
}

function desenharMoedas(cam) {
  const t = MOEDA.tamanho;
  const quadro = Math.floor(tempo / 8) % MOEDA.frames;
  const lista = fase.moedas;

  // Brilho dourado por trás (aditivo)
  for (let i = 0; i < lista.length; i++) {
    const m = lista[i];
    if (m.pega || !visivel(m.x, t, cam)) continue;
    luzAditiva(m.x + t / 2, m.y + t / 2, 26, "255,205,60", 0.3 + Math.sin(tempo * 0.1 + i) * 0.08);
  }
  for (let i = 0; i < lista.length; i++) {
    const m = lista[i];
    if (m.pega || !visivel(m.x, t, cam)) continue;
    ctx.drawImage(moedaFonte.img, quadro * moedaFonte.fw, 0, moedaFonte.fw, moedaFonte.fh, Math.round(m.x), Math.round(m.y), t, t);
    // cintilar de vez em quando
    const ciclo = (tempo + i * 37) % 130;
    if (ciclo < 16) desenharEstrela4(Math.round(m.x + t - 6), Math.round(m.y + 6), Math.round(2 + Math.sin((ciclo / 16) * Math.PI) * 6), "#ffffff");
  }
}

function desenharBanana(naMao) {
  const b = banana;
  if (!b) return;
  if ((b.estado === "presa") !== !!naMao) return;   // na mão do chefe: desenhada por cima dele
  if (naMao && chefeDesenhaBanana(chefe)) return;    // ...ou já faz parte do desenho do chefe
  const cx = Math.round(b.x + 24);
  const cy = Math.round(b.y + 20);
  if (b.estado === "parada" || b.estado === "fugindo") {
    if (b.estado === "parada") sombraSprite(cx, b.base + 44, 44, 0.3);
    luzAditiva(cx, cy, 78, "255,215,70", 0.5 + Math.sin(tempo * 0.1) * 0.15);
    for (let k = 0; k < 3; k++) {
      const a = tempo * 0.04 + k * 2.1;
      const r = 5 + Math.abs(Math.sin(tempo * 0.12 + k * 1.7)) * 5;
      desenharEstrela4(Math.round(cx + Math.cos(a) * 42), Math.round(cy + Math.sin(a * 1.3) * 30), Math.round(r), k % 2 ? "#fff3bf" : "#ffffff");
    }
  } else {
    luzAditiva(cx, cy, 52, "255,215,70", 0.35);
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(b.rot);
  ctx.drawImage(SPR_BANANA, -24, -20);
  ctx.restore();
}

// ----- Animação dos inimigos -----
// Cada tipo tem quadros e poses em SPR_INIMIGO (js/arte.js); aqui se escolhe a pose pelo que o inimigo está fazendo.

// Guarda o que mudou desde o último desenho (pouso, tiro) para o squash e a pose de recuo
function animInimigoRastrear(e) {
  if (e.animOff === undefined) {
    e.animOff = Math.floor(Math.abs(e.x0)) % 23;
    e.animNoChao = e.noChao;
    e.animTimerAnt = e.timer;
    e.animPouso = -99;
    e.animTiroT = -99;
  }
  if (e.noChao && !e.animNoChao) e.animPouso = tempo;
  e.animNoChao = e.noChao;
  if (e.timer > e.animTimerAnt + 5) e.animTiroT = tempo;
  e.animTimerAnt = e.timer;
}

// Nome da pose do inimigo vivo
function animInimigoPose(e) {
  const c = e.t.comp;
  const j = jogador;
  const perto = Math.abs(j.x + j.w / 2 - (e.x + e.w / 2));
  if (e.lacado) return "lacado";
  if (c === "pulador") {
    if (!e.noChao) return e.vy < 0 ? "pulo" : "queda";
    if (tempo - e.animPouso < 6) return "pouso";
    if (e.timer < 14 && perto < 520) return "agachar";
    return "parado";
  }
  if (c === "atirador") {
    if (tempo - e.animTiroT < 9) return "atirar";
    if (e.timer < 20 && perto < 650 && !j.morto) return "carregar";
    return "parado";
  }
  if (c === "investida") {
    if (e.estado === "preparar") return "preparar";
    if (e.estado === "deslizar") return "deslizar";
    if (e.estado === "cansado") return "cansado";
    return Math.abs(e.vx) > 0.1 ? "andar" : "parado";
  }
  if (c === "mergulhador") return e.estado === "mergulho" ? "mergulho" : e.estado === "subindo" ? "subindo" : "voar";
  if (c === "aranha") return e.estado === "descendo" ? "descendo" : e.estado === "subindo" ? "subindo" : "parado";
  if (c === "voador") return "voar";
  return Math.abs(e.vx) > 0.1 ? "andar" : "parado";
}

// Pose que o tipo realmente tem (com alternativas quando falta)
const ANIM_INIMIGO_ALT = {
  pouso: ["agachar"], queda: ["pulo"], lacado: ["andar", "voar"], subindo: ["voar"], mergulho: ["voar"],
  descendo: [], cansado: [], preparar: [], atirar: [], carregar: []
};

function animInimigoQuadro(spr, nome, e) {
  const lista = [nome].concat(ANIM_INIMIGO_ALT[nome] || [], ["parado", "andar", "voar"]);
  let p = null;
  for (let i = 0; i < lista.length && !p; i++) p = spr.poses[lista[i]];
  if (!p) p = { v: 1, q: [0] };
  const v = nome === "lacado" ? 3 : p.v;
  const k = Math.floor((tempo + e.animOff) / v) % p.q.length;
  return spr.quadros[p.q[k]];
}

function desenharInimigos(cam) {
  for (let i = 0; i < inimigos.length; i++) {
    const e = inimigos[i];
    if (!visivel(e.x, e.w, cam) && !e.espaco) continue;
    const spr = SPR_INIMIGO[e.tipo];
    animInimigoRastrear(e);
    const dir = e.dir > 0 ? 1 : -1;
    const lado = dir > 0 ? "d" : "e";
    if (e.t.comp === "aranha" && e.vivo) {
      ctx.fillStyle = "#dee2e6";
      ctx.fillRect(Math.round(e.x + e.w / 2) - 1, 0, 2, Math.round(e.y) + 4);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(Math.round(e.x + e.w / 2) + 1, 0, 1, Math.round(e.y) + 4);
    }
    ctx.save();

    // Chutado para o espaço ou derrubado: gira com olhos de X
    if (e.espaco || (e.morto && !e.esmagado)) {
      const img = spr.morto[lado];
      ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h / 2));
      ctx.rotate(e.espaco ? e.rot : Math.PI + e.rot * 0.2);
      ctx.scale(e.escala, e.escala);
      ctx.drawImage(img, -e.w / 2, -e.h / 2);
      ctx.restore();
      continue;
    }

    // Esmagado: achatado, olhos de X e estrelinhas girando
    if (e.esmagado) {
      const img = spr.morto[lado];
      const dw = Math.round(e.w * 1.3), dh = Math.max(4, Math.round(e.h * 0.3));
      ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h));
      ctx.drawImage(img, -Math.round(dw / 2), -dh, dw, dh);
      ctx.globalAlpha = Math.min(1, e.esmagado / 10);
      for (let k = 0; k < 3; k++) {
        const a = tempo * 0.25 + k * 2.094;
        const px = Math.round(Math.cos(a) * 12), py = Math.round(-dh - 8 - (20 - e.esmagado) * 0.6 + Math.sin(a) * 3);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(px - 3, py - 1, 6, 2); ctx.fillRect(px - 1, py - 3, 2, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      ctx.restore();
      continue;
    }

    const pose = animInimigoPose(e);
    const q = animInimigoQuadro(spr, pose, e);
    const img = q[lado];
    let sx = 1, sy = 1, dx = 0, dy = 0, rot = 0;
    const c = e.t.comp;

    if (pose === "lacado") {
      // se debatendo preso no laço
      rot = Math.sin(tempo * 0.8) * 0.3;
      sx = 1 + Math.sin(tempo * 1.1) * 0.06;
      sy = 1 - Math.sin(tempo * 1.1) * 0.06;
    } else if (c === "pulador") {
      const t = tempo - e.animPouso;
      if (!e.noChao) {
        const f = Math.min(1, Math.abs(e.vy) / 12);
        sx = 1 - 0.1 * f; sy = 1 + 0.14 * f;
      } else if (t < 8) {
        const k = 1 - t / 8;
        sx = 1 + 0.2 * k; sy = 1 - 0.2 * k;
      } else if (pose === "agachar") {
        dx = tempo % 4 < 2 ? -1 : 1;
      }
    } else if (c === "atirador") {
      if (pose === "carregar") {
        dx = tempo % 4 < 2 ? -1 : 1;
        const k = 1 - e.timer / 20;
        sx = 1 + 0.05 * k; sy = 1 - 0.04 * k;
      } else if (pose === "atirar") {
        const k = 1 - (tempo - e.animTiroT) / 9;
        dx = -dir * Math.round(4 * k);
        sx = 1 - 0.06 * k; sy = 1 + 0.05 * k;
      }
    } else if (c === "mergulhador" && pose === "mergulho") {
      rot = dir * Math.atan2(e.vy, Math.abs(e.vx) + 0.001);
    } else if (c === "voador" || pose === "voar" || pose === "subindo") {
      rot = Math.sin(tempo * 0.12 + e.animOff) * 0.05;
    } else if (c === "investida") {
      if (pose === "deslizar" && e.t.rolaEspinhoso) rot = tempo * 0.5 * dir;
      else if (pose === "preparar") dx = tempo % 4 < 2 ? -1 : 1;
      else if (pose === "cansado") sy = 1 + Math.sin(tempo * 0.4) * 0.03;
      else if (pose === "deslizar") rot = dir * 0.05;
    } else if (c === "aranha") {
      rot = Math.sin(tempo * 0.07 + e.animOff) * 0.05;
    }

    const dw = Math.round(e.w * sx), dh = Math.round(e.h * sy);
    ctx.translate(Math.round(e.x + e.w / 2) + dx, Math.round(e.y + e.h) + dy);
    if (rot) {
      ctx.translate(0, -e.h / 2);
      ctx.rotate(rot);
      ctx.translate(0, e.h / 2);
    }
    const ox = -Math.round(dw / 2);
    ctx.drawImage(img, ox, -dh, dw, dh);
    // piscar branco ao levar dano
    if (e.flash > 0 && e.flash % 4 < 2) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(silhuetaDe(img, "#ffffff"), ox, -dh, dw, dh);
    } else if (e.lacado) {
      // brilho verde do cipó
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(tempo * 0.5);
      ctx.drawImage(silhuetaDe(img, "#b2f2bb"), ox, -dh, dw, dh);
    }
    ctx.restore();
  }
}

// ---------- ANIMAÇÃO DO MACACO (só visual: não mexe na física) ----------

const animJog = { ref: null, t: 0, fase: 0, parado: 0, pousou: 0, noAr: 0, vyMax: 0, noChaoAntes: true, bal: 0 };
const CICLO_CORRIDA = ["corre1", "corre2", "corre3", "corre4"];

// Guarda o que a animação precisa lembrar (fase da corrida, tempo parado, aterrissagem...).
// Roda uma vez por passo do jogo, mesmo que seja chamada várias vezes.
function animJogadorAtualizar() {
  const j = jogador;
  const a = animJog;
  if (a.ref !== j || tempo < a.t) {
    a.ref = j;
    a.t = tempo;
    a.fase = 0;
    a.parado = 0;
    a.pousou = 0;
    a.noAr = 0;
    a.vyMax = 0;
    a.bal = 0;
    a.noChaoAntes = j.noChao;
    return;
  }
  let dt = tempo - a.t;
  if (dt <= 0) return;
  if (dt > 3) dt = 3;
  a.t = tempo;

  const vel = Math.abs(j.vx);
  const solo = j.noChao && !j.cipo && !j.morto;

  // Corrida: o ciclo anda mais depressa quanto maior a velocidade
  if (solo && !j.deslizando && vel > 0.5) a.fase = (a.fase + dt * (0.04 + vel * 0.042)) % 4;
  else if (solo) a.fase = 0;

  // Tempo parado (para piscar, olhar em volta, coçar a cabeça...)
  const quieto = solo && vel < 0.5 && !j.deslizando && j.chute === 0 && !j.laco && j.dash === 0 && !j.comemorar && j.invencivel < 74;
  a.parado = quieto ? a.parado + dt : 0;

  // Aterrissagem: lembra a velocidade da queda para agachar na hora do pouso
  if (!j.noChao) {
    a.noAr += dt;
    a.vyMax = Math.max(a.vyMax, j.vy);
    a.pousou = 0;
  } else {
    if (!a.noChaoAntes) a.pousou = a.vyMax > 9 ? 11 : a.vyMax > 4.5 ? 6 : 0;
    else if (a.pousou > 0) a.pousou -= dt;
    a.vyMax = 0;
    a.noAr = 0;
  }
  a.noChaoAntes = j.noChao;

  // Balanço no cipó (velocidade suavizada)
  a.bal = j.cipo ? a.bal + (Math.abs(j.cipoW) - a.bal) * 0.2 : 0;
}

// Parado: respira, pisca e, depois de uns segundos, olha em volta, coça a cabeça e boceja
function poseParadoJogador(p) {
  if (p >= 240) {
    const u = (p - 240) % 900;
    if (u < 36) return "olhar2";
    if (u >= 50 && u < 90) return "olhar1";
    if (u >= 110 && u < 230) return Math.floor(u / 9) % 2 ? "coca2" : "coca1";
    if (u >= 420 && u < 500) return "bocejo";
  }
  if (p % 170 < 6) return "piscar";
  return Math.floor(p / 40) % 2 ? "respira" : "parado";
}

function poseJogador() {
  const j = jogador;
  const a = animJog;
  animJogadorAtualizar();
  if (j.morto) return "morte";
  if (j.comemorar > 0) return j.noChao && Math.floor(tempo / 7) % 2 ? "vitoria2" : "vitoria";
  if (j.invencivel > 74) return "dano";
  if (j.cipo) return a.bal > 0.022 ? "balancoT" : a.bal < 0.012 ? "balancoF" : "pendurado";
  if (j.dash > 0) return "dash";
  if (j.deslizando) return "deslizar";
  if (j.chute > 0) return j.chute > 11 ? "chute" : "chute2";
  if (j.laco) return "laco";
  if (!j.noChao) {
    if (j.giro > 0) return "pulo";
    if (j.vy < -9 && a.noAr < 4) return "impulso";
    if (j.vy < -3.5) return "pulo";
    if (j.vy < 2.5) return "topo";
    return "queda";
  }
  const vel = Math.abs(j.vx);
  if (a.pousou > 0 && vel < 2.5) return "aterrissa";
  if (vel > 0.5) return CICLO_CORRIDA[Math.floor(a.fase) % 4];
  return poseParadoJogador(a.parado);
}

function desenharJogador() {
  const j = jogador;
  const pose = poseJogador();
  const dano = j.invencivel > 74 && !j.morto;
  // Depois do dano o macaco pisca ficando meio transparente
  const alfa = !dano && !j.morto && j.invencivel > 0 && Math.floor(j.invencivel / 4) % 2 ? 0.3 : 1;
  const spr = (SPRITES_PRIMATA[pose] || SPRITES_PRIMATA.parado)[j.dir > 0 ? "d" : "e"];
  const cx = Math.round(j.x + j.w / 2);
  const base = Math.round(j.y + j.h + j.afundar);
  const vel = Math.abs(j.vx);

  // Contorno e clarão branco rápidos quando pega moeda ou power-up
  const kb = (j.brilho || 0) / 10;
  const desenharSpr = function(x, y) {
    if (kb > 0) {
      const s = silhuetaDe(spr, "#fff6a8");
      ctx.globalAlpha = kb * alfa;
      ctx.drawImage(s, x - 4, y);
      ctx.drawImage(s, x + 4, y);
      ctx.drawImage(s, x, y - 4);
      ctx.drawImage(s, x, y + 4);
    }
    ctx.globalAlpha = alfa;
    ctx.drawImage(spr, x, y);
    if (kb > 0) {
      ctx.globalAlpha = kb * 0.35 * alfa;
      ctx.drawImage(silhuetaDe(spr, "#ffffff"), x, y);
    }
    // Clarão vermelho piscando logo depois de levar dano
    if (dano && Math.floor(tempo / 3) % 2 === 0) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(silhuetaDe(spr, "#ff8a8a"), x, y);
    }
    ctx.globalAlpha = 1;
  };

  // Escudo: bolha pixelada com brilho
  if (buffs.escudo > 0 && !j.morto) {
    const bolha = cacheVis("escudo", function() { return bolaPixel(24, "rgba(116,192,252,0.2)", "rgba(208,235,255,0.9)", "rgba(255,255,255,0.8)", 2); });
    const piscar = buffs.escudo < 90 && Math.floor(buffs.escudo / 6) % 2;
    ctx.globalAlpha = piscar ? 0.35 : 0.8 + Math.sin(tempo * 0.2) * 0.15;
    ctx.drawImage(bolha, cx - 48, base - 92);
    ctx.globalAlpha = 1;
    luzAditiva(cx, base - 44, 70, "90,170,255", piscar ? 0.12 : 0.28);
  }

  // Riscos de velocidade atrás do macaco (dash e super velocidade)
  if (!j.morto && !j.cipo && (j.dash > 0 || (buffs.velocidade > 0 && vel > 4))) {
    ctx.fillStyle = j.dash > 0 ? "rgba(214,243,255,0.6)" : "rgba(255,232,130,0.5)";
    for (let i = 0; i < 4; i++) {
      const len = 24 + (tempo * 7 + i * 31) % 40;
      const yy = base - 10 - i * 17 - (i % 2) * 5;
      ctx.fillRect(j.dir > 0 ? cx - 30 - len : cx + 30, yy, len, 3);
    }
  }

  ctx.save();

  if (j.morto) {
    ctx.translate(cx, base - 40);
    ctx.rotate(j.giro);
    desenharSpr(-48, -40);
    ctx.restore();
    return;
  }

  // Pendurado: o corpo acompanha o balanço do cipó, preso pela cabeça
  if (j.cipo) {
    ctx.translate(cx, Math.round(j.y + 6));
    ctx.rotate(-j.cipoTh * 0.85);
    desenharSpr(-48, -10);
    ctx.restore();
    return;
  }

  // Deslizando: deitado de costas, pés para a frente
  if (j.deslizando) {
    ctx.translate(cx, base - 26);
    ctx.rotate(-j.dir * 1.4);
    ctx.scale(0.78, 0.78);
    desenharSpr(-48, -40);
    ctx.restore();
    return;
  }

  // Estica no pulo, amassa na aterrissagem
  const e = j.esticar;
  let sx = 1;
  let sy = 1;
  let bob = 0;
  let incl = 0;
  if (e > 0) { sx = 1 - 0.15 * e; sy = 1 + 0.2 * e; }
  else if (e < 0) {
    // correndo, o impacto da aterrissagem é mais leve
    const forca = pose.indexOf("corre") === 0 ? 0.14 : 0.24;
    sx = 1 - forca * e;
    sy = 1 + forca * e;
  }

  if (pose === "dash") {
    // dash: lança o corpo para a frente
    sx *= 1.08;
    sy *= 0.94;
    incl = j.dir * 0.24;
  } else if (!j.noChao) {
    // no ar: estica um pouco conforme a velocidade e inclina para o lado em que vai
    const k = limitar(Math.abs(j.vy) / 22, 0, 0.1);
    sy *= 1 + k;
    sx *= 1 - k * 0.7;
    incl = limitar(j.vx * 0.012, -0.12, 0.12);
  } else if (pose.indexOf("corre") === 0) {
    // corrida: corpo quica a cada passo e se inclina para a frente
    const passagem = Math.floor(animJog.fase) % 2 === 1;
    bob = passagem ? -4 : 0;
    sy *= passagem ? 1.03 : 0.97;
    sx *= passagem ? 0.98 : 1.03;
    incl = limitar(j.vx / VEL, -1.7, 1.7) * 0.09;
  } else if (pose === "parado" || pose === "respira" || pose === "piscar") {
    sy *= 1 + Math.sin(tempo * 0.08) * 0.02;
  }

  ctx.translate(cx, base + bob);
  if (incl) ctx.rotate(incl);
  if (j.giro > 0) {
    ctx.translate(0, -40);
    ctx.rotate(j.giro * j.dir);
    ctx.translate(0, 40);
  }
  ctx.scale(sx, sy);
  const sprY = -80;
  desenharSpr(-48, sprY);

  ctx.restore();

  // Cipó-laço
  if (j.laco) {
    const mao = maoJogador();
    let px = mao.x + j.dir * j.laco.comp;
    let py = mao.y;
    if (j.laco.estado === "puxando" && j.laco.alvo) {
      px = j.laco.alvo.x + j.laco.alvo.w / 2;
      py = j.laco.alvo.y + j.laco.alvo.h / 2;
    }
    const onda = j.laco.estado === "indo" ? Math.sin(tempo * 0.9) * 6 : 0;
    desenharCorda(mao.x, mao.y, px, py + onda, "#2b8a3e", "#69db7c");
    ctx.strokeStyle = "#2b8a3e";
    ctx.lineWidth = 5;
    ctx.strokeRect(Math.round(px) - 10, Math.round(py + onda) - 10, 20, 20);
  }
}

function desenharAvisos() {
  for (let i = 0; i < projeteis.length; i++) {
    const p = projeteis[i];
    if (!p.marcar || p.y > CHAO - 40) continue;
    const pulso = tempo % 10 < 5 ? 1 : 0.65;
    // feixe vermelho subindo do chão e faixa de aviso com brilho
    ctx.globalAlpha = pulso;
    preencherDegrade(degradeVertical("aviso", 64, [[0, "rgba(255,60,40,0)"], [1, "rgba(255,60,40,0.4)"]]), Math.round(p.x - 6), CHAO - 150, p.w + 12, 150);
    ctx.fillStyle = "#7a1010";
    ctx.fillRect(Math.round(p.x - 8), CHAO - 10, p.w + 16, 10);
    ctx.fillStyle = "#e03131";
    ctx.fillRect(Math.round(p.x - 6), CHAO - 8, p.w + 12, 8);
    ctx.fillStyle = "#ff8787";
    ctx.fillRect(Math.round(p.x - 6), CHAO - 8, p.w + 12, 2);
    ctx.globalAlpha = 1;
    luzAditiva(Math.round(p.x + p.w / 2), CHAO - 4, 40 + p.w / 2, "255,60,40", 0.3 * pulso);
  }
}

// Brilho aditivo de cada tipo de projétil: [cor rgb, raio, intensidade]
const LUZ_PROJETIL = {
  fogo: ["255,140,40", 38, 0.6],
  chama: ["255,130,30", 34, 0.55],
  meteoro: ["255,120,30", 54, 0.6],
  veneno: ["190,80,240", 32, 0.5],
  bala: ["255,220,90", 26, 0.5],
  gelo: ["150,210,255", 28, 0.3],
  neve: ["200,230,255", 18, 0.25]
};

function desenharProjeteis() {
  for (let i = 0; i < projeteis.length; i++) {
    const p = projeteis[i];
    if (p.aviso > 0) continue;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const lz = LUZ_PROJETIL[p.tipo];
    if (lz) luzAditiva(x + p.w / 2, y + p.h / 2, lz[1], lz[0], lz[2] * (0.85 + Math.sin(tempo * 0.5 + i) * 0.15));
    switch (p.tipo) {
      case "bala":
        ctx.fillStyle = "rgba(255,212,59,0.35)";
        ctx.fillRect(p.vx > 0 ? x - 16 : x + p.w, y + 1, 16, p.h - 2);
        ctx.fillStyle = "#b8740a";
        ctx.fillRect(x - 1, y - 1, p.w + 2, p.h + 2);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(x, y, p.w, p.h);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(p.vx > 0 ? x + p.w - 4 : x, y, 4, p.h);
        break;
      case "espinho":
        ctx.fillStyle = "#1b5e20";
        ctx.fillRect(x, y + 1, p.w, 4);
        ctx.fillStyle = "#8ce99a";
        ctx.fillRect(p.vx > 0 ? x + p.w - 6 : x, y + 2, 6, 2);
        break;
      case "onda":
        ctx.fillStyle = MUNDOS[fase.mundo].id === "selva" ? "#8a5a2b" : "#e0b062";
        ctx.fillRect(x, y + 18, p.w, 12);
        ctx.fillRect(x + 6, y + 8, p.w - 12, 10);
        ctx.fillRect(x + 12, y, p.w - 24, 8);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(x + 12, y, p.w - 24, 3);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x, y + 26, p.w, 4);
        break;
      case "tornado":
        desenharRedemoinho(p.x, p.y, p.w, p.h, "rgba(224,176,98,0.75)");
        break;
      case "gelo":
        ctx.drawImage(SPR_ESTALACTITE, x, y);
        break;
      case "bolao":
      case "bolaNeve":
      case "pedra":
      case "tronco":
        if (p.y + p.h >= CHAO - 12) {
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          sombraNoChao(x + 4, CHAO - 1, p.w - 8, 5);
        }
        ctx.save();
        ctx.translate(x + p.w / 2, y + p.h / 2);
        ctx.rotate(p.rot || 0);
        ctx.drawImage(p.tipo === "tronco" ? SPR_TRONCO : SPR_PROJ[p.tipo], -p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        break;
      case "dardo":
        ctx.fillStyle = "#6b4220";
        ctx.fillRect(x + 4, y + 2, p.w - 4, 2);
        ctx.fillStyle = "#ced4da";
        ctx.fillRect(x, y + 1, 6, 4);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(x + p.w - 6, y, 6, 6);
        break;
      case "chama":
        ctx.fillStyle = "#c92a2a";
        ctx.fillRect(x - 2, y - 2, p.w + 4, p.h + 4);
        ctx.fillStyle = tempo % 4 < 2 ? "#ffd43b" : "#ff6b00";
        ctx.fillRect(x, y, p.w, p.h);
        ctx.fillStyle = "#fff3a8";
        ctx.fillRect(x + p.w / 4, y + p.h / 4, p.w / 2, p.h / 2);
        break;
      default:
        if (SPR_PROJ[p.tipo]) ctx.drawImage(SPR_PROJ[p.tipo], x, y, p.w, p.h);
    }
  }
}

// Ícone do cipó-laço embaixo das moedas: aceso quando pronto, com a recarga enchendo
function desenharCipoHud(j) {
  if (!temCipo() || toqueAtivo) return;   // no celular a recarga aparece no próprio botão
  const pronto = j.recargaLaco <= 0 && !j.laco;
  painelPixel(140, 56, 40, 36);
  ctx.save();
  ctx.globalAlpha = pronto ? 1 : 0.4;
  desenharIconeCipo(160, 74, 13);
  ctx.restore();
  if (!pronto && !j.laco) {
    const k = 1 - j.recargaLaco / RECARGA_LACO;
    ctx.fillStyle = "#0d0704";
    ctx.fillRect(146, 86, 28, 4);
    ctx.fillStyle = "#69db7c";
    ctx.fillRect(146, 86, Math.round(28 * k), 4);
  }
}

// Desenho simples de um laço de cipó (usado no HUD e no botão de toque)
function desenharIconeCipo(x, y, r) {
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1d3a12";
  ctx.lineWidth = r * 0.5;
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, y - r * 0.2, r * 0.75, r * 0.55, -0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.15); ctx.quadraticCurveTo(x - r * 0.9, y + r * 0.7, x - r * 0.3, y + r); ctx.stroke();
  ctx.strokeStyle = "#69b34c";
  ctx.lineWidth = r * 0.28;
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, y - r * 0.2, r * 0.75, r * 0.55, -0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.15); ctx.quadraticCurveTo(x - r * 0.9, y + r * 0.7, x - r * 0.3, y + r); ctx.stroke();
  ctx.fillStyle = "#3f8f2a";
  ctx.beginPath(); ctx.ellipse(x + r * 0.75, y - r * 0.75, r * 0.32, r * 0.18, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = "butt";
}

// Quadradinhos dos poderes e do dash (canto de baixo do HUD; o modo em pé desenha ampliado no painel)
function desenharPoderesHud(j) {
  PODERES.forEach(function(p, i) {
    const x = 20 + i * 66;
    const y = ALTURA - 74;
    const n = save.poderes[p.id];
    const ativo = buffs[p.id] > 0;
    slotPixel(x, y, ativo);
    if (ativo) luzAditiva(x + 29, y + 29, 50, "105,219,124", 0.28 + Math.sin(tempo * 0.15) * 0.1);
    ctx.globalAlpha = n > 0 || ativo ? 1 : 0.3;
    desenharContorno(ICONES[p.id], 0, 0, 32, 32, x + 13, y + 12, 32, 32, "#0d0704", 2);
    ctx.globalAlpha = 1;
    if (recargas[p.id] > 0) {
      const k = recargas[p.id] / p.recarga;
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(x + 6, y + 6, 46, Math.round(46 * k));
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + 6, y + 6 + Math.round(46 * k) - 2, 46, 2);
    }
    if (ativo) {
      ctx.fillStyle = "#0d0704";
      ctx.fillRect(x + 5, y + 46, 48, 7);
      ctx.fillStyle = "#69db7c";
      ctx.fillRect(x + 6, y + 47, Math.round(46 * (buffs[p.id] / p.duracao)), 5);
      ctx.fillStyle = "#d3f9d8";
      ctx.fillRect(x + 6, y + 47, Math.round(46 * (buffs[p.id] / p.duracao)), 2);
    }
    // no controle: o poder escolhido (LT troca, RT usa) ganha moldura branca
    const escolhido = controleAtivo && i === poderSelecionado;
    if (escolhido) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 2, y - 2, 62, 3);
      ctx.fillRect(x - 2, y + 57, 62, 3);
      ctx.fillRect(x - 2, y - 2, 3, 62);
      ctx.fillRect(x + 57, y - 2, 3, 62);
    }
    ctx.font = "bold 13px " + FONTE;
    ctx.textAlign = "left";
    textoSombra(controleAtivo ? (escolhido ? "RT" : "") : toqueAtivo ? "" : teclaDe("poder" + (i + 1)), x + 8, y + 19, "#ffe066");
    ctx.textAlign = "right";
    textoSombra("x" + n, x + 53, y + 51, n > 0 ? "#ffffff" : "#868e96");
  });

  if (temMelhoria("dash")) {
    const x = 20 + PODERES.length * 66 + 10;
    const y = ALTURA - 74;
    slotPixel(x, y, j.dash > 0);
    desenharContorno(ICONES.dash, 0, 0, 32, 32, x + 13, y + 12, 32, 32, "#0d0704", 2);
    if (j.recargaDash > 0) {
      const k = j.recargaDash / 45;
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(x + 6, y + 6, 46, Math.round(46 * k));
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + 6, y + 6 + Math.round(46 * k) - 2, 46, 2);
    } else {
      luzAditiva(x + 29, y + 29, 36, "255,212,59", 0.12 + Math.sin(tempo * 0.1) * 0.04);
    }
    ctx.font = "bold 12px " + FONTE;
    ctx.textAlign = "left";
    textoSombra(nomeComando("dash"), x + 8, y + 19, "#ffe066");
  }
}

function desenharHud() {
  const j = jogador;
  const mundoCor = MUNDOS[fase.mundo].cor;

  // Corações
  const max = vidasMax();
  painelPixel(10, 8, 34 * max + 14, 44);
  for (let i = 0; i < max; i++) {
    const x = 20 + i * 34;
    if (i < j.vidas) {
      // o último coração bate quando falta pouco para perder
      const bate = j.vidas === 1 && i === 0 ? Math.round(Math.max(0, Math.sin(tempo * 0.22)) * 4) : 0;
      desenharContorno(SPR_CORACAO, 0, 0, 28, 28, x - bate / 2, 16 - bate / 2, 28 + bate, 28 + bate, "#2a0606", 2);
    } else {
      ctx.drawImage(SPR_CORACAO_VAZIO, x, 16);
    }
  }

  // Moedas (pulsam quando uma moeda chega voando)
  const pulso = hudPulso * 0.5;
  ctx.font = "bold 22px " + FONTE;
  ctx.textAlign = "left";
  const txtMoedas = String(save.moedas);
  painelPixel(10, 56, Math.max(88, Math.ceil((48 + ctx.measureText(txtMoedas).width + 14) / 8) * 8), 36);
  desenharContorno(moedaFonte.img, 0, 0, moedaFonte.fw, moedaFonte.fh, 20 - pulso, 60 - pulso, 28 + pulso * 2, 28 + pulso * 2, "#3b2108", 2);
  textoSombra(txtMoedas, 56, 83);

  desenharCipoHud(j);

  desenharBarraXp(20, 101, 110);

  // Nome da fase e progresso até a banana
  ctx.textAlign = "center";
  if (!chefe) {
    painelPixel(LARGURA / 2 - 210, 6, 420, 58, mundoCor);
    ctx.font = "bold 20px " + FONTE;
    textoSombra(fase.tutorial ? tr("Tutorial") : nomeFase(fase.indice), LARGURA / 2, 31);
    const bx = LARGURA / 2 - 150;
    const k = limitar(j.x / fase.fimX, 0, 1);
    ctx.fillStyle = "#0d0704";
    ctx.fillRect(bx - 3, 38, 306, 14);
    ctx.fillStyle = "#2a1d12";
    ctx.fillRect(bx, 40, 300, 10);
    const largura = Math.round(300 * k);
    if (largura > 0) {
      ctx.fillStyle = mundoCor;
      ctx.fillRect(bx, 40, largura, 10);
      ctx.fillStyle = clarear(mundoCor, 0.45);
      ctx.fillRect(bx, 40, largura, 3);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(bx, 47, largura, 3);
    }
    // marcas dos checkpoints
    for (let i = 0; i < fase.checkpoints.length; i++) {
      const c = fase.checkpoints[i];
      ctx.fillStyle = c.ativo ? "#ffffff" : "#868e96";
      ctx.fillRect(bx + Math.round(300 * limitar(c.x / fase.fimX, 0, 1)) - 1, 38, 2, 14);
    }
    // a cabecinha do macaco anda pela barra
    const hx = bx + largura;
    ctx.drawImage(silhuetaDe(SPRITES_PRIMATA.parado.d, "#0d0704"), 8, 12, 80, 48, hx - 15, 33, 30, 18);
    ctx.drawImage(SPRITES_PRIMATA.parado.d, 8, 12, 80, 48, hx - 14, 34, 28, 17);
    const perto = k > 0.85;
    if (perto) luzAditiva(bx + 306, 42, 26, "255,215,70", 0.4 + Math.sin(tempo * 0.15) * 0.15);
    ctx.drawImage(SPR_BANANA, bx + 300 - 6, 32, 24, 20);
  } else {
    desenharVidaChefe();
  }

  // Poderes (teclas 1 a 5): no modo em pé ficam no painel de baixo, maiores
  if (!modoRetrato) desenharPoderesHud(j);
}

// Faixa decorada da mensagem central: bordas douradas com rebites e pontas que somem (pré-renderizada)
function faixaMensagem(tom) {
  return cacheVis("faixa" + tom, function() {
    const H = 176;
    const c = criarCanvas(LARGURA, H);
    const g = c.getContext("2d");
    const claro = tom === "ruim" ? "#ffc9c9" : "#fff3a8";
    const meio = tom === "ruim" ? "#ff6b6b" : "#ffd43b";
    const escuro = tom === "ruim" ? "#8f1a1a" : "#b8740a";
    g.fillStyle = "rgba(14,8,18,0.88)";
    g.fillRect(0, 0, LARGURA, H);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.06)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, LARGURA, H);
    const borda = function() {
      g.fillStyle = "#0d0704";
      g.fillRect(0, 0, LARGURA, 16);
      g.fillStyle = escuro;
      g.fillRect(0, 3, LARGURA, 10);
      g.fillStyle = meio;
      g.fillRect(0, 4, LARGURA, 6);
      g.fillStyle = claro;
      g.fillRect(0, 4, LARGURA, 2);
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(0, 10, LARGURA, 3);
      for (let x = 24; x < LARGURA; x += 48) {
        g.fillStyle = "#0d0704";
        g.fillRect(x - 1, 0, 14, 16);
        g.fillStyle = claro;
        g.fillRect(x, 1, 12, 14);
        g.fillStyle = meio;
        g.fillRect(x + 2, 3, 8, 10);
        g.fillStyle = escuro;
        g.fillRect(x + 4, 5, 4, 6);
      }
      g.fillStyle = "rgba(255,224,102,0.4)";
      g.fillRect(0, 22, LARGURA, 2);
    };
    borda();
    g.save();
    g.translate(0, H);
    g.scale(1, -1);
    borda();
    g.restore();
    // as pontas somem nas laterais
    g.globalCompositeOperation = "destination-out";
    const fe = g.createLinearGradient(0, 0, 170, 0);
    fe.addColorStop(0, "rgba(0,0,0,1)");
    fe.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = fe;
    g.fillRect(0, 0, 170, H);
    const fd = g.createLinearGradient(LARGURA - 170, 0, LARGURA, 0);
    fd.addColorStop(0, "rgba(0,0,0,0)");
    fd.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = fd;
    g.fillRect(LARGURA - 170, 0, 170, H);
    return c;
  });
}

function desenharMensagem() {
  if (!mensagem) return;
  const m = mensagem;
  const tom = /perdeu/i.test(m.titulo) ? "ruim" : "bom";
  const resta = m.duracao - m.t;
  const saida = resta < 14 ? suavizar(resta / 14) : 1;
  const abre = suavizar(m.t / 12);
  const cy = ALTURA / 2 - 5;
  const H = 176;

  // a faixa abre do meio para as bordas
  const hh = Math.max(2, Math.round(H * abre));
  ctx.globalAlpha = saida;
  ctx.drawImage(faixaMensagem(tom), 0, 0, LARGURA, H, 0, Math.round(cy - hh / 2), LARGURA, hh);

  // título entra com um quiquezinho
  if (m.t > 5) {
    const kt = saltitar((m.t - 5) / 18);
    ctx.save();
    ctx.globalAlpha = saida * Math.min(1, (m.t - 5) / 8);
    ctx.translate(LARGURA / 2, cy - 2);
    const esc = 0.55 + 0.45 * kt;
    ctx.scale(esc, esc);
    ctx.textAlign = "center";
    ctx.font = "bold 52px " + FONTE;
    textoSombra(m.titulo, 0, 0, tom === "ruim" ? ["#ffe3e3", "#ff6b6b"] : ["#fff9c4", "#ffc21a"], 3);
    if (m.t < 90) {
      const tw = ctx.measureText(m.titulo).width / 2;
      const pos = [[-tw - 26, -22], [tw + 26, -34], [-tw * 0.55, -66], [tw * 0.5, 14]];
      for (let k = 0; k < pos.length; k++) {
        const r = Math.abs(Math.sin((m.t + k * 11) * 0.12)) * 8;
        if (r > 2) desenharEstrela4(Math.round(pos[k][0]), Math.round(pos[k][1]), Math.round(r), "#fff6bf");
      }
    }
    ctx.restore();
  }
  // subtítulo sobe e aparece
  if (m.t > 14 && m.sub) {
    const ks = suavizar((m.t - 14) / 12);
    ctx.globalAlpha = saida * ks;
    ctx.textAlign = "center";
    ctx.font = "bold 22px " + FONTE;
    textoSombra(m.sub, LARGURA / 2, cy + 50 + Math.round((1 - ks) * 12));
  }
  ctx.globalAlpha = 1;
}

function desenharJogo() {
  const cam = Math.round(cameraX);
  const tx = tremor > 0 ? Math.round((Math.random() - 0.5) * Math.min(tremor, 14)) : 0;
  const ty = tremor > 0 ? Math.round((Math.random() - 0.5) * Math.min(tremor, 14)) : 0;

  // em pé o mundo é desenhado ampliado (o HUD não)
  const zoom = zoomJogo();
  ctx.save();
  if (zoom !== 1) ctx.scale(zoom, zoom);

  desenharFundo(fase.mundo, cam);
  desenharLuaRei();

  ctx.save();
  ctx.translate(-cam + tx, ty);
  desenharDecoracoes(cam);
  desenharLancadores(cam);
  desenharTornados(cam);
  desenharCipos(cam);
  desenharSolidos(cam);
  desenharSombrasMundo(cam);
  desenharPlataformas(cam);
  desenharEspinhos(cam);
  desenharGeiseres(cam);
  desenharEstalactites(cam);
  desenharPlacas(cam);
  desenharCheckpoints(cam);
  desenharSombras(cam);
  desenharMoedas(cam);
  desenharPowerups(cam);
  desenharBanana();
  desenharAvisos();
  desenharPlantas(cam);
  desenharInimigos(cam);
  if (chefe) { if (chefeVisivel()) { desenharChefe(); desenharBanana(true); } desenharExtrasRei(); }
  desenharAura();
  desenharJogador();
  desenharProjeteis();
  desenharBarras(cam);
  desenharAreias(cam);
  desenharLavas(cam);
  desenharAguas(cam);
  desenharFogos(cam);
  desenharErupcoes(cam);
  desenharParticulas();
  ctx.restore();

  desenharClima();
  ambienteMundo(fase.mundo, cam, tempo);

  if (flashNuke > 0) {
    ctx.fillStyle = "rgba(255,255,240," + (flashNuke / 40) * 0.8 + ")";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }

  desenharNoiteRei();
  ctx.restore();

  desenharHud();
  desenharExtrasHud();
  desenharMensagem();
  desenharResultadoFase();
  desenharCron();
  if (!modoRetrato) desenharToque();
}
