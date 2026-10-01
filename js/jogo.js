"use strict";

// =========================
// NÚCLEO DO JOGO: jogador, inimigos, perigos, poderes e desenho da fase
// =========================

const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

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

function maxBalas() {
  return temMelhoria("revolver") ? 8 : 6;
}


// =========================
// COMEÇAR FASE
// =========================

function iniciarFase(indice, doCheckpoint) {
  if (!doCheckpoint) checkpointX = null;
  fase = gerarFase(indice);
  inimigos = fase.inimigos.map(criarInimigo);
  projeteis = [];
  particulas = [];
  mensagem = null;
  tempo = 0;
  moedasNaFase = 0;
  flashNuke = 0;
  tremor = 0;

  if (doCheckpoint && checkpointX !== null) {
    fase.checkpoints.forEach(function(c) { if (c.x <= checkpointX) c.ativo = true; });
  }
  const x0 = doCheckpoint && checkpointX !== null ? checkpointX : fase.inicioX;
  jogador = criarJogador(x0, CHAO - 72);

  chefe = fase.ehChefe ? criarChefe(fase.mundo) : null;
  banana = fase.ehChefe ? null : { x: fase.fimX, y: CHAO - 44, base: CHAO - 44, estado: "parada", t: 0, rot: 0, vy: 0 };

  cameraX = limitar(jogador.x - LARGURA * 0.4, 0, Math.max(0, fase.largura - LARGURA));
  estado = "jogo";
  pausado = false;
  apertos.clear();
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
    balas: maxBalas(), recargaTiro: 0, recarregando: 0, poseTiro: 0,
    afundar: 0, sobreGeiser: false,
    seguro: { x: x, y: y }
  };
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
  const apertouTiro = consumir("tiro");
  const apertouLaco = consumir("laco");
  const apertouDash = consumir("dash");
  const apertouRecarga = consumir("recarregar");

  if (j.morto) {
    j.morto++;
    j.vy = Math.min(j.vy + 0.5, 14);
    j.y += j.vy;
    j.giro += 0.12;
    if (j.morto === 110) perdeuTudo();
    return;
  }

  // Temporizadores
  if (j.invencivel > 0) j.invencivel--;
  if (j.recargaDash > 0) j.recargaDash--;
  if (j.recargaLaco > 0) j.recargaLaco--;
  if (j.poseTiro > 0) j.poseTiro--;
  if (j.recargaTiro > 0) j.recargaTiro--;
  if (j.chute > 0) j.chute--;
  if (j.soltouCipo > 0) j.soltouCipo--;
  if (j.giro > 0) { j.giro += 0.26; if (j.giro >= Math.PI * 2) j.giro = 0; }
  j.esticar *= 0.82;
  if (Math.abs(j.esticar) < 0.02) j.esticar = 0;
  if (j.recarregando > 0) {
    j.recarregando--;
    if (j.recarregando === 0) { j.balas = maxBalas(); som("recarga"); }
  }
  if (j.bufferPulo > 0) j.bufferPulo--;
  if (apertouPulo) j.bufferPulo = 7;

  // Ações
  if (apertouTiro) atirar();
  if (apertouRecarga) recarregar();
  if (apertouLaco) lancarLaco();
  if (apertouDash) iniciarDash();
  if (j.laco) atualizarLaco();

  let dir = (teclas.direita ? 1 : 0) - (teclas.esquerda ? 1 : 0);

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
      if (dir) {
        if (j.vx * dir > max) j.vx = aproximar(j.vx, dir * max, j.noChao ? 0.3 : 0.04);
        else j.vx = aproximar(j.vx, dir * max, j.vx * dir < 0 ? acel + atrito : acel);
        if (!j.laco) j.dir = dir;
      } else {
        j.vx = aproximar(j.vx, 0, Math.abs(j.vx) > VEL && !j.noChao ? 0.05 : atrito);
      }
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
    if (!estavaNoChao && vyAntes > 3) aterrissar(vyAntes);
    if (j.chao.cai && !j.chao.tremendo && !j.chao.caiu) j.chao.tremendo = 35;
  }

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

function posMovimento() {
  const j = jogador;
  const cx = j.x + j.w / 2;

  if (j.noChao && Math.abs(j.vx) > 0.5 && !j.deslizando) j.passos++;
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

// ----- Revólver -----

function atirar() {
  const j = jogador;
  if (j.cipo || j.deslizando || j.recargaTiro > 0) return;
  if (j.recarregando > 0) { som("vazio"); return; }
  if (j.balas <= 0) { recarregar(); return; }
  j.balas--;
  j.recargaTiro = temMelhoria("revolver") ? 9 : 14;
  j.poseTiro = 14;
  const mx = j.x + j.w / 2 + j.dir * 54;
  const my = j.y + j.h - 23;
  projeteis.push({ tipo: "bala", x: mx - 7, y: my - 3, w: 14, h: 6, vx: j.dir * 15, vy: 0, vida: 50, doJogador: true });
  particula({ tipo: "q", x: mx, y: my, vx: 0, vy: 0, g: 0, vida: 4, max: 4, cor: "#fff3bf", tam: 16 });
  particula({ tipo: "q", x: j.x + j.w / 2 + j.dir * 30, y: my - 6, vx: -j.dir * 1.5, vy: -3, g: 0.3, vida: 30, max: 30, cor: "#fab005", tam: 4 });
  som("tiro");
  if (j.balas === 0) recarregar();
}

function recarregar() {
  const j = jogador;
  if (j.recarregando > 0 || j.balas === maxBalas()) return;
  j.recarregando = temMelhoria("revolver") ? 40 : 70;
}

// ----- Cipó-laço: agarra o inimigo, puxa e chuta pro espaço -----

function maoJogador() {
  const j = jogador;
  return { x: j.x + j.w / 2 + j.dir * 32, y: j.y + j.h - 22 };
}

function lancarLaco() {
  const j = jogador;
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
      j.recargaLaco = 20;
    }
  } else {
    l.comp -= 36;
    if (l.comp <= 0) {
      j.laco = null;
      j.recargaLaco = 12;
    }
  }
}

// ----- Dano e morte -----

function machucar(origemX, ignorarInvencivel) {
  const j = jogador;
  if (j.morto) return;
  if (j.dash > 0 || buffs.escudo > 0) return;
  if (j.invencivel > 0 && !ignorarInvencivel) return;
  j.vidas--;
  j.invencivel = 90;
  tremor = 10;
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
  j.vidas--;
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
  j.x = j.seguro.x;
  j.y = j.seguro.y;
  j.vx = 0;
  j.vy = 0;
  j.invencivel = 100;
  j.afundar = 0;
  texto(j.x + j.w / 2, j.y - 10, "-1 vida", "#ff6b6b", 22);
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
  mostrarMensagem("Você perdeu!", checkpointX !== null ? "Voltando do checkpoint..." : "Tentando de novo...", 100, function() {
    iniciarFase(fase.indice, true);
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
  } else {
    const d = Math.hypot(dx, dy) || 1;
    projeteis.push({ tipo: "fogo", x: cx - 12, y: cy - 12, w: 24, h: 24, vx: (dx / d) * 4.5, vy: (dy / d) * 4.5, vida: 200 });
  }
}

function atualizarInimigos() {
  const centro = cameraX + LARGURA / 2;
  for (let i = inimigos.length - 1; i >= 0; i--) {
    const e = inimigos[i];
    if (e.remover) { inimigos.splice(i, 1); continue; }
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
}

function colisaoInimigoJogador(e) {
  const j = jogador;
  if (j.morto || !e.vivo || e.lacado) return;
  const hb = { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 6 };
  if (!encosta(j, hb)) return;

  if (j.dash > 0 || buffs.escudo > 0) { matarInimigo(e, "pancada"); return; }
  if (j.deslizando && !e.t.voa) { matarInimigo(e, "pancada"); return; }
  if (j.vy > 0 && j.pesAntes <= e.y + 16 && !e.t.espinhoso) {
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
  ganharMoedas(1, e.x + e.w / 2, e.y);
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
    const p = projeteis[i];
    p.vida--;
    if (p.aviso > 0) { p.aviso--; continue; }   // ainda mostrando a sombra de aviso

    p.vy += p.g || 0;
    p.x += p.vx;
    p.y += p.vy;
    if (p.rola) {
      if (p.y + p.h > CHAO) { p.y = CHAO - p.h; p.vy = 0; }
      p.rot = (p.rot || 0) + p.vx / (p.w / 2);
    }
    if (p.rastro && tempo % 2 === 0) {
      particula({ tipo: "q", x: p.x + p.w / 2, y: p.y + p.h / 2, vx: 0, vy: -0.5, g: 0, vida: 16, max: 16, cor: p.rastro, tam: 8 });
    }

    let acabou = p.vida <= 0 || p.y > ALTURA + 60 || p.x < cameraX - 400 || p.x > cameraX + LARGURA + 400;
    if (!acabou && !p.atravessa) {
      const teste = p.rola ? { x: p.x, y: p.y, w: p.w, h: p.h - 6 } : p;
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
    if (acabou) projeteis.splice(i, 1);
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
      for (let k = 0; k < 5; k++) {
        particula({ tipo: "q", x: m.x + 16, y: m.y + 16, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, g: 0, vida: 15, max: 15, cor: "#fff3a0", tam: 4 });
      }
    }
  }

  for (let i = 0; i < fase.checkpoints.length; i++) {
    const c = fase.checkpoints[i];
    if (!c.ativo && !j.morto && j.x + j.w > c.x) {
      c.ativo = true;
      checkpointX = c.x;
      j.vidas = Math.max(j.vidas, Math.min(vidasMax(), j.vidas + 1));
      som("checkpoint");
      texto(c.x + 20, CHAO - 110, "Checkpoint!", "#ffffff", 22);
      for (let k = 0; k < 12; k++) {
        particula({ tipo: "q", x: c.x + 20, y: CHAO - 70, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6, g: 0.2, vida: 30, max: 30, cor: MUNDOS[fase.mundo].cor, tam: 6 });
      }
    }
  }
}

function soltarBananaDoCeu() {
  banana = { x: LARGURA / 2 - 24, y: -60, base: CHAO - 44, estado: "caindo", t: 0, rot: 0, vy: 0 };
}

function atualizarBanana() {
  const b = banana;
  if (!b) return;
  const j = jogador;
  b.t++;
  if (b.estado === "caindo") {
    b.vy = Math.min(b.vy + 0.3, 9);
    b.y += b.vy;
    b.rot += 0.1;
    if (b.y >= b.base) { b.y = b.base; b.estado = "parada"; b.rot = 0; b.t = 0; }
  } else if (b.estado === "parada") {
    b.y = b.base + Math.sin(b.t * 0.08) * 4;
    if (!j.morto && Math.abs(j.x + j.w / 2 - (b.x + 24)) < 110 && j.y + j.h > CHAO - 160) {
      if (fase.ehChefe && fase.mundo === MUNDOS.length - 1) {
        iniciarFinal();
        return;
      }
      b.estado = "voando";
      b.t = 0;
      som("vento");
    }
  } else if (b.estado === "voando") {
    b.x += 8 + b.t * 0.1;
    b.y -= 5 - b.t * 0.05;
    b.rot += 0.25;
    if (tempo % 2 === 0) vento();
    if (b.t === 75) fimDaFase();
  }
}

function fimDaFase() {
  const i = fase.indice;
  let titulo = "Fase completa!";
  if (fase.ehChefe) {
    titulo = MUNDOS[fase.mundo].nome + " completo!";
    if (!save.chefes[fase.mundo]) {
      save.chefes[fase.mundo] = true;
    }
  }
  save.desbloqueado = Math.max(save.desbloqueado, Math.min(i + 1, TOTAL_FASES - 1));
  salvar();
  sujo = false;
  som("vitoria");
  mostrarMensagem(titulo, "A banana escapou de novo! Próximo: " + nomeFase(i + 1), 170, function() {
    iniciarFase(i + 1);
  });
}


// =========================
// PODERES
// =========================

function usarPoder(id) {
  const p = PODERES.find(function(x) { return x.id === id; });
  if (!p || estado !== "jogo" || pausado || !jogador || jogador.morto || mensagem) return;
  if (save.poderes[id] <= 0 || recargas[id] > 0 || (buffs[id] || 0) > 0) { som("negado"); return; }
  save.poderes[id]--;
  sujo = true;
  recargas[id] = p.recarga;
  som("poder");
  texto(jogador.x + jogador.w / 2, jogador.y - 20, p.nome + "!", "#ffffff", 22);
  if (id === "nuke") nuke();
  else buffs[id] = p.duracao;
}

function nuke() {
  const j = jogador;
  const cx = j.x + j.w / 2;
  flashNuke = 40;
  tremor = 30;
  som("nuke");
  particula({ tipo: "anel", x: cx, y: j.y + j.h / 2, vx: 0, vy: 0, g: 0, vida: 40, max: 40 });
  for (let i = 0; i < inimigos.length; i++) {
    const e = inimigos[i];
    if (e.vivo && Math.abs(e.x + e.w / 2 - cx) < 800) {
      if (e.lacado) cancelarLaco();
      matarInimigo(e, "nuke");
    }
  }
  projeteis = projeteis.filter(function(p) { return p.doJogador; });
  if (chefe && chefe.vivo) danoChefe(8, cx, true);
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

function fantasma(alfa) {
  const j = jogador;
  const spr = SPRITES_PRIMATA[poseJogador()][j.dir > 0 ? "d" : "e"];
  particula({ tipo: "fantasma", img: spr, x: Math.round(j.x + j.w / 2 - 40), y: Math.round(j.y + j.h - 80), vx: 0, vy: 0, g: 0, vida: 14, max: 14, alfa: alfa });
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
      ctx.font = "bold " + p.tam + "px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.fillText(p.texto, p.x + 2, p.y + 2);
      ctx.fillStyle = p.cor;
      ctx.fillText(p.texto, p.x, p.y);
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
      const r = (1 - k) * 900;
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

// Clima de cada mundo (folhas, poeira, neve, brasas) - fica na tela, não no mundo
const clima = [];

function atualizarClima(mundo) {
  while (clima.length < 40) clima.push(novoClima(mundo, true));
  for (let i = 0; i < clima.length; i++) {
    const c = clima[i];
    c.t++;
    c.x += c.vx + (mundo === 0 ? Math.sin(c.t * 0.05) * 0.6 : 0);
    c.y += c.vy;
    if (c.mundo !== mundo || c.y > ALTURA + 10 || c.y < -20 || c.x < -20 || c.x > LARGURA + 20) clima[i] = novoClima(mundo, false);
  }
}

function novoClima(mundo, qualquerLugar) {
  const c = { mundo: mundo, t: Math.random() * 100, x: Math.random() * LARGURA, y: qualquerLugar ? Math.random() * ALTURA : -10 };
  if (mundo === 0) { c.vx = -0.3; c.vy = 0.8 + Math.random() * 0.6; c.cor = Math.random() < 0.5 ? "#69db7c" : "#2f9e44"; c.tam = 6; }
  else if (mundo === 1) { c.vx = -4 - Math.random() * 3; c.vy = 0.3; c.cor = "rgba(255,232,163,0.7)"; c.tam = 3; c.x = qualquerLugar ? c.x : LARGURA + 10; c.y = Math.random() * ALTURA; }
  else if (mundo === 2) { c.vx = -0.4; c.vy = 1 + Math.random() * 1.2; c.cor = "#ffffff"; c.tam = 4 + Math.round(Math.random() * 2); }
  else { c.vx = 0.2; c.vy = -0.8 - Math.random(); c.cor = Math.random() < 0.5 ? "#ff922b" : "#ffd43b"; c.tam = 4; c.y = qualquerLugar ? c.y : ALTURA + 5; }
  return c;
}

function desenharClima() {
  for (let i = 0; i < clima.length; i++) {
    const c = clima[i];
    ctx.fillStyle = c.cor;
    ctx.fillRect(Math.round(c.x), Math.round(c.y), c.tam, c.tam);
  }
}


// =========================
// ATUALIZAÇÃO DA FASE (1 passo)
// =========================

function atualizarJogo() {
  tempo++;
  if (tremor > 0) tremor--;

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
  atualizarMoedas();
  atualizarBanana();
  atualizarBuffs();
  atualizarParticulas();

  // Câmera segue o macaco olhando um pouco para frente
  const j = jogador;
  const alvo = j.x + j.w / 2 - LARGURA * 0.4 + j.dir * 80;
  cameraX += (alvo - cameraX) * 0.1;
  cameraX = limitar(cameraX, 0, Math.max(0, fase.largura - LARGURA));
}


// =========================
// DESENHO DA FASE
// =========================

function desenharFundo(mundo, cam) {
  const fx = Math.round(cam * 0.3) % LARGURA;
  ctx.drawImage(FUNDOS[mundo], -fx, 0);
  ctx.drawImage(FUNDOS[mundo], LARGURA - fx, 0);
}

function visivel(x, w, cam) {
  return x + w > cam - 20 && x < cam + LARGURA + 20;
}

function desenharSolidos(cam) {
  const tema = TEMAS[fase.mundo];
  for (let i = 0; i < fase.solidos.length; i++) {
    const s = fase.solidos[i];
    if (!visivel(s.x, s.w, cam)) continue;
    const x0 = Math.max(s.x, cam - 32);
    const x1 = Math.min(s.x + s.w, cam + LARGURA + 32);
    const y0 = Math.max(0, -s.y);
    const y1 = Math.min(s.h, ALTURA + 40 - s.y);
    if (y1 <= y0) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    if (s.tipo === "chao") {
      ctx.fillStyle = padrao(s.gelo && tema.topoGelo ? "topoGelo" : "topo");
      ctx.fillRect(x0 - s.x, 0, x1 - x0, 32);
      ctx.fillStyle = padrao("terra");
      ctx.fillRect(x0 - s.x, 32, x1 - x0, y1 - 32);
    } else {
      ctx.fillStyle = padrao("bloco");
      ctx.fillRect(x0 - s.x, y0, x1 - x0, y1 - y0);
    }
    ctx.restore();
  }
}

function desenharPlataformas(cam) {
  const pl = fase.plataformas;
  for (let i = 0; i < pl.length; i++) {
    const p = pl[i];
    if (!visivel(p.x, p.w, cam) || p.y > ALTURA) continue;
    const tx = p.tremendo > 0 && !p.caiu ? Math.round((Math.random() - 0.5) * 4) : 0;
    ctx.save();
    ctx.translate(Math.round(p.x) + tx, Math.round(p.y));
    ctx.fillStyle = padrao("plat");
    if (p.caiu) ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, p.w, 16);
    if (p.cai) {
      ctx.fillStyle = "rgba(255,107,0,0.6)";
      ctx.fillRect(16, 6, 6, 4);
      ctx.fillRect(p.w - 30, 4, 8, 4);
    }
    ctx.restore();
  }
}

function desenharEspinhos(cam) {
  for (let i = 0; i < fase.espinhos.length; i++) {
    const s = fase.espinhos[i];
    if (!visivel(s.x, s.w, cam)) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
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
    ctx.drawImage(SPR_GEISER, g.x, CHAO - 12 + (brilho && tempo % 4 < 2 ? -2 : 0));
  }
}

function desenharErupcoes(cam) {
  for (let i = 0; i < fase.geiseres.length; i++) {
    const g = fase.geiseres[i];
    if (!visivel(g.x, g.w, cam) || g.t < 150 || g.t >= 185) continue;
    const k = Math.min(1, (g.t - 150) / 6) * Math.min(1, (185 - g.t) / 8);
    const alt = 430 * k;
    for (let yy = 0; yy < alt; yy += 12) {
      const larg = 40 + Math.sin(tempo * 0.6 + yy * 0.1) * 10 - (yy / 430) * 16;
      ctx.fillStyle = (Math.floor(yy / 12) + tempo) % 3 === 0 ? "#ffd43b" : "#ff6b00";
      ctx.globalAlpha = 0.85 - (yy / 430) * 0.5;
      ctx.fillRect(Math.round(g.x + g.w / 2 - larg / 2), Math.round(CHAO - 12 - yy - 12), Math.round(larg), 12);
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
    ctx.fillStyle = "#c9953f";
    ctx.fillRect(a.x, CHAO - 8, a.w, 72);
    ctx.fillStyle = "#e0b062";
    for (let x = 0; x < a.w - 8; x += 16) {
      const y = CHAO - 4 + ((x * 7 + tempo) % 56);
      ctx.fillRect(a.x + x + Math.floor((tempo / 4 + x) % 8), y, 6, 4);
    }
    ctx.fillStyle = "#f2c66d";
    ctx.fillRect(a.x, CHAO - 10, a.w, 4);
  }
}

function desenharLavas(cam) {
  for (let i = 0; i < fase.lavas.length; i++) {
    const l = fase.lavas[i];
    if (!visivel(l.x, l.w, cam)) continue;
    const topo = CHAO + 24;
    ctx.fillStyle = "rgba(255,120,0,0.18)";
    ctx.fillRect(l.x, topo - 50, l.w, 50);
    ctx.fillStyle = "#e8590c";
    ctx.fillRect(l.x, topo, l.w, ALTURA - topo);
    ctx.fillStyle = "#ff922b";
    ctx.fillRect(l.x, topo + 10, l.w, 6);
    ctx.fillStyle = "#ffd43b";
    for (let x = 0; x < l.w; x += 16) {
      const h = 4 + Math.round((Math.sin(tempo * 0.08 + (l.x + x) * 0.05) + 1) * 3);
      ctx.fillRect(l.x + x, topo - h + 6, Math.min(16, l.w - x), h);
    }
  }
}

function desenharFogos(cam) {
  for (let i = 0; i < fase.fogos.length; i++) {
    const fg = fase.fogos[i];
    if (fg.y === undefined || fg.y >= CHAO + 30 || !visivel(fg.x, 32, cam)) continue;
    ctx.drawImage(SPR_PROJ.podoboo, Math.round(fg.x), Math.round(fg.y));
  }
}

function desenharDecoracoes(cam) {
  for (let i = 0; i < fase.decoracoes.length; i++) {
    const d = fase.decoracoes[i];
    const spr = SPR_DECOR[d.spr];
    if (!visivel(d.x, spr.width, cam)) continue;
    if (!temChao(d.x + spr.width / 2, CHAO + 4)) continue;
    ctx.drawImage(spr, d.x, CHAO - spr.height);
  }
}

function desenharPlacas(cam) {
  const j = jogador;
  for (let i = 0; i < fase.placas.length; i++) {
    const p = fase.placas[i];
    if (!visivel(p.x - 200, 432, cam)) continue;
    ctx.drawImage(SPR_PLACA, p.x, CHAO - 32);
    if (Math.abs(j.x + j.w / 2 - (p.x + 16)) < 260) {
      const linhas = p.texto.split("\n");
      ctx.font = "bold 16px monospace";
      let w = 0;
      linhas.forEach(function(l) { w = Math.max(w, ctx.measureText(l).width); });
      w += 24;
      const h = linhas.length * 22 + 14;
      const bx = Math.round(p.x + 16 - w / 2);
      const by = CHAO - 52 - h;
      ctx.fillStyle = "#3b2412";
      ctx.fillRect(bx - 3, by - 3, w + 6, h + 6);
      ctx.fillStyle = "#fff8e7";
      ctx.fillRect(bx, by, w, h);
      ctx.fillRect(p.x + 10, by + h, 12, 8);
      ctx.fillStyle = "#3b2412";
      ctx.textAlign = "center";
      linhas.forEach(function(l, k) { ctx.fillText(l, bx + w / 2, by + 24 + k * 22); });
    }
  }
}

function desenharCheckpoints(cam) {
  for (let i = 0; i < fase.checkpoints.length; i++) {
    const c = fase.checkpoints[i];
    if (!visivel(c.x, 40, cam)) continue;
    ctx.drawImage(c.ativo ? SPR_BANDEIRA_ON[fase.mundo] : SPR_BANDEIRA_OFF, c.x, CHAO - 80);
  }
}

function desenharMoedas(cam) {
  const t = MOEDA.tamanho;
  const quadro = Math.floor(tempo / 8) % MOEDA.frames;
  const lista = fase.moedas;
  for (let i = 0; i < lista.length; i++) {
    const m = lista[i];
    if (m.pega || !visivel(m.x, t, cam)) continue;
    ctx.drawImage(moedaFonte.img, quadro * moedaFonte.fw, 0, moedaFonte.fw, moedaFonte.fh, Math.round(m.x), Math.round(m.y), t, t);
  }
}

function desenharBanana() {
  const b = banana;
  if (!b) return;
  ctx.save();
  ctx.translate(Math.round(b.x + 24), Math.round(b.y + 20));
  ctx.rotate(b.rot);
  if (b.estado === "parada") {
    ctx.globalAlpha = 0.25 + Math.sin(tempo * 0.1) * 0.1;
    ctx.fillStyle = "#fff3bf";
    ctx.fillRect(-34, -30, 68, 60);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(SPR_BANANA, -24, -20);
  ctx.restore();
}

function desenharInimigos(cam) {
  for (let i = 0; i < inimigos.length; i++) {
    const e = inimigos[i];
    if (!visivel(e.x, e.w, cam) && !e.espaco) continue;
    const spr = SPR_INIMIGO[e.tipo];
    const img = e.dir > 0 ? spr.d : spr.e;
    ctx.save();
    if (e.espaco || (e.morto && !e.esmagado)) {
      ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h / 2));
      ctx.rotate(e.espaco ? e.rot : Math.PI + e.rot * 0.2);
      ctx.scale(e.escala, e.escala);
      ctx.drawImage(img, -e.w / 2, -e.h / 2);
    } else {
      ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h));
      if (e.esmagado) ctx.scale(1.3, 0.3);
      else if (e.lacado) ctx.rotate(Math.sin(tempo * 0.8) * 0.3);
      else if (e.t.voa) ctx.scale(1, 1 + Math.sin(tempo * 0.5) * 0.08);
      else if (e.t.comp === "atirador" && e.timer < 15) ctx.translate(tempo % 4 < 2 ? -2 : 2, 0);
      else if (e.t.comp === "investida" && e.estado === "deslizar") ctx.rotate(e.dir * 1.2);
      else if (Math.abs(e.vx) > 0.1 && e.noChao) ctx.translate(0, Math.floor(tempo / 8) % 2 ? -2 : 0);
      if (e.flash > 0 && e.flash % 4 < 2) ctx.globalAlpha = 0.4;
      ctx.drawImage(img, -e.w / 2, -e.h);
    }
    ctx.restore();
  }
}

function poseJogador() {
  const j = jogador;
  if (j.morto) return "queda";
  if (j.cipo) return "pendurado";
  if (j.chute > 0) return "chute";
  if (j.poseTiro > 0 || j.laco) return "tiro";
  if (!j.noChao) return j.vy < 0 ? "pulo" : "queda";
  if (Math.abs(j.vx) > 0.5) return Math.floor(j.passos / 7) % 2 ? "andar1" : "andar2";
  return "parado";
}

function desenharJogador() {
  const j = jogador;
  if (j.invencivel > 0 && !j.morto && Math.floor(j.invencivel / 4) % 2) return;
  const pose = poseJogador();
  const spr = SPRITES_PRIMATA[pose][j.dir > 0 ? "d" : "e"];
  const cx = Math.round(j.x + j.w / 2);
  const base = Math.round(j.y + j.h + j.afundar);

  // Escudo
  if (buffs.escudo > 0) {
    ctx.globalAlpha = 0.3 + Math.sin(tempo * 0.2) * 0.1;
    ctx.fillStyle = "#74c0fc";
    ctx.fillRect(cx - 50, base - 92, 100, 96);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(cx, base);

  if (j.morto) {
    ctx.translate(0, -40);
    ctx.rotate(j.giro);
    ctx.drawImage(spr, -40, -40);
    ctx.restore();
    return;
  }

  if (j.deslizando) {
    ctx.translate(0, -24);
    ctx.rotate(j.dir * Math.PI / 2);
    ctx.scale(0.7, 0.7);
    ctx.drawImage(spr, -40, -40);
    ctx.restore();
    return;
  }

  // Estica no pulo, amassa na aterrissagem
  const e = j.esticar;
  let sx = 1;
  let sy = 1;
  if (e > 0) { sx = 1 - 0.15 * e; sy = 1 + 0.2 * e; }
  else if (e < 0) { sx = 1 - 0.25 * e; sy = 1 + 0.25 * e; }
  else if (pose === "parado") { sy = 1 + Math.sin(tempo * 0.08) * 0.02; }

  if (j.giro > 0) {
    ctx.translate(0, -40);
    ctx.rotate(j.giro * j.dir);
    ctx.translate(0, 40);
  }
  ctx.scale(sx, sy);
  const bob = pose === "andar1" ? -4 : 0;
  const sprY = j.cipo ? -80 + 4 : -80 + bob;
  ctx.drawImage(spr, -40, sprY);

  if (pose === "tiro" && !j.laco) {
    const r = SPR_REVOLVER;
    if (j.dir > 0) ctx.drawImage(r.d, 26, sprY + 52);
    else ctx.drawImage(r.e, -26 - r.w, sprY + 52);
    if (j.poseTiro > 10) {
      ctx.fillStyle = "#fff3bf";
      ctx.fillRect(j.dir > 0 ? 52 : -64, sprY + 50, 12, 10);
    }
  }
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
    ctx.globalAlpha = 0.35 + (tempo % 10 < 5 ? 0.25 : 0);
    ctx.fillStyle = "#c92a2a";
    ctx.fillRect(Math.round(p.x - 6), CHAO - 8, p.w + 12, 8);
    ctx.globalAlpha = 1;
  }
}

function desenharProjeteis() {
  for (let i = 0; i < projeteis.length; i++) {
    const p = projeteis[i];
    if (p.aviso > 0) continue;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    switch (p.tipo) {
      case "bala":
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
        break;
      case "tornado":
        desenharRedemoinho(p.x, p.y, p.w, p.h, "rgba(224,176,98,0.75)");
        break;
      case "gelo":
        ctx.drawImage(SPR_ESTALACTITE, x, y);
        break;
      case "bolao":
        ctx.save();
        ctx.translate(x + p.w / 2, y + p.h / 2);
        ctx.rotate(p.rot || 0);
        ctx.drawImage(SPR_PROJ.bolao, -p.w / 2, -p.h / 2);
        ctx.restore();
        break;
      case "chama":
        ctx.fillStyle = tempo % 4 < 2 ? "#ffd43b" : "#ff6b00";
        ctx.fillRect(x, y, p.w, p.h);
        break;
      default:
        if (SPR_PROJ[p.tipo]) ctx.drawImage(SPR_PROJ[p.tipo], x, y, p.w, p.h);
    }
  }
}

function textoSombra(txt, x, y, cor) {
  ctx.fillStyle = "#000000";
  ctx.fillText(txt, x + 2, y + 2);
  ctx.fillStyle = cor || "#ffffff";
  ctx.fillText(txt, x, y);
}

function desenharHud() {
  const j = jogador;

  // Corações
  const max = vidasMax();
  for (let i = 0; i < max; i++) ctx.drawImage(i < j.vidas ? SPR_CORACAO : SPR_CORACAO_VAZIO, 20 + i * 34, 14);

  // Moedas
  ctx.drawImage(moedaFonte.img, 0, 0, moedaFonte.fw, moedaFonte.fh, 20, 52, 28, 28);
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "left";
  textoSombra(String(save.moedas), 56, 74);

  // Balas do revólver
  const mb = maxBalas();
  for (let i = 0; i < mb; i++) {
    ctx.fillStyle = i < j.balas && j.recarregando === 0 ? "#ffd43b" : "#495057";
    ctx.fillRect(22 + i * 12, 92, 8, 14);
    ctx.fillStyle = i < j.balas && j.recarregando === 0 ? "#b8740a" : "#343a40";
    ctx.fillRect(22 + i * 12, 104, 8, 4);
  }
  if (j.recarregando > 0) {
    ctx.font = "bold 14px monospace";
    textoSombra("recarregando", 26 + mb * 12, 106);
  }

  // Nome da fase e progresso até a banana
  ctx.textAlign = "center";
  if (!chefe) {
    ctx.font = "bold 20px monospace";
    textoSombra(nomeFase(fase.indice), LARGURA / 2, 30);
    const bx = LARGURA / 2 - 150;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx, 42, 300, 8);
    const k = limitar(j.x / fase.fimX, 0, 1);
    ctx.fillStyle = MUNDOS[fase.mundo].cor;
    ctx.fillRect(bx, 42, 300 * k, 8);
    ctx.drawImage(SPR_BANANA, bx + 300 - 6, 32, 24, 20);
  } else {
    desenharVidaChefe();
  }

  // Poderes (teclas 1 a 5)
  PODERES.forEach(function(p, i) {
    const x = 20 + i * 66;
    const y = ALTURA - 74;
    const n = save.poderes[p.id];
    ctx.fillStyle = "rgba(20,12,6,0.75)";
    ctx.fillRect(x, y, 58, 58);
    ctx.strokeStyle = buffs[p.id] > 0 ? "#69db7c" : "#8a5a2b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, 55, 55);
    ctx.globalAlpha = n > 0 ? 1 : 0.3;
    ctx.drawImage(ICONES[p.id], x + 13, y + 13);
    ctx.globalAlpha = 1;
    if (recargas[p.id] > 0) {
      const k = recargas[p.id] / p.recarga;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x + 3, y + 3, 52, 52 * k);
    }
    if (buffs[p.id] > 0) {
      ctx.fillStyle = "#69db7c";
      ctx.fillRect(x + 3, y + 50, 52 * (buffs[p.id] / p.duracao), 5);
    }
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    textoSombra(p.tecla, x + 5, y + 15);
    ctx.textAlign = "right";
    textoSombra("x" + n, x + 54, y + 54, n > 0 ? "#ffffff" : "#868e96");
  });

  if (temMelhoria("dash")) {
    const x = 20 + PODERES.length * 66 + 10;
    const y = ALTURA - 74;
    ctx.fillStyle = "rgba(20,12,6,0.75)";
    ctx.fillRect(x, y, 58, 58);
    ctx.drawImage(ICONES.dash, x + 13, y + 13);
    if (j.recargaDash > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x, y, 58, 58 * (j.recargaDash / 45));
    }
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    textoSombra("Shift", x + 4, y + 14);
  }
}

function desenharMensagem() {
  if (!mensagem) return;
  const k = Math.min(1, mensagem.t / 10);
  ctx.globalAlpha = k;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, ALTURA / 2 - 90, LARGURA, 170);
  ctx.textAlign = "center";
  ctx.font = "bold 52px monospace";
  textoSombra(mensagem.titulo, LARGURA / 2, ALTURA / 2 - 10, "#ffe066");
  ctx.font = "bold 22px monospace";
  textoSombra(mensagem.sub, LARGURA / 2, ALTURA / 2 + 40);
  ctx.globalAlpha = 1;
}

function desenharJogo() {
  const cam = Math.round(cameraX);
  const tx = tremor > 0 ? Math.round((Math.random() - 0.5) * Math.min(tremor, 14)) : 0;
  const ty = tremor > 0 ? Math.round((Math.random() - 0.5) * Math.min(tremor, 14)) : 0;

  desenharFundo(fase.mundo, cam);

  ctx.save();
  ctx.translate(-cam + tx, ty);
  desenharDecoracoes(cam);
  desenharTornados(cam);
  desenharCipos(cam);
  desenharSolidos(cam);
  desenharPlataformas(cam);
  desenharEspinhos(cam);
  desenharGeiseres(cam);
  desenharEstalactites(cam);
  desenharPlacas(cam);
  desenharCheckpoints(cam);
  desenharMoedas(cam);
  desenharBanana();
  desenharAvisos();
  desenharInimigos(cam);
  if (chefe) desenharChefe();
  desenharJogador();
  desenharProjeteis();
  desenharAreias(cam);
  desenharLavas(cam);
  desenharFogos(cam);
  desenharErupcoes(cam);
  desenharParticulas();
  ctx.restore();

  desenharClima();

  if (flashNuke > 0) {
    ctx.fillStyle = "rgba(255,255,240," + (flashNuke / 40) * 0.8 + ")";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }

  desenharHud();
  desenharMensagem();
}
