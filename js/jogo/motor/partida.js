"use strict";

// =========================
// PARTIDA E RODADAS
// Partida: quem fizer CONFIG.pontosParaVencer pontos primeiro. Cada rodada é num cenário diferente:
//   "intro"     ~1,3 s: nome do cenário, bolinhas aparecem (ninguém atira ainda)
//   "luta"      20 s para derrotar o oponente
//   "queda"     acabou o tempo e os dois estão vivos: queda de braço (quem clicar mais vence).
//               Quem terminou a luta com mais vida já começa um pouco na frente.
//   "fimRodada" câmera lenta, ponto para quem venceu
//   "fimPartida" comemoração e volta para as telas
// Modos: "bot" (jogador 1 contra o bot), "2p" (dois no mesmo aparelho), "demo" (bot contra bot no fundo do menu)
// =========================

const RODADA = { intro: 1.3, introPrimeira: 1.7, luta: 20, fim: 1.8, quedaIntro: 1.1, quedaMax: 6, quedaFim: 1.6, fimPartida: 2.6, danoDobro: 6 };

let jogo = null;   // a partida atual (de verdade ou a de demonstração)

function embaralhar(lista) {
  const l = lista.slice();
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = l[i]; l[i] = l[j]; l[j] = x; }
  return l;
}

function sortearCores() {
  const l = embaralhar(CORES_BOLINHAS);
  // duas cores que não se confundem (tons bem diferentes)
  const a = l[0];
  for (let i = 1; i < l.length; i++) if (distanciaCor(a, l[i]) > 140) return [a, l[i]];
  return [l[0], l[1]];
}
function distanciaCor(a, b) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const dr = (x >> 16) - (y >> 16), dg = ((x >> 8) & 255) - ((y >> 8) & 255), db = (x & 255) - (y & 255);
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
}

// opcoes: { lendaria, nivelBot, primeiraVez }
function novaPartida(modo, opcoes) {
  opcoes = opcoes || {};
  const ordem = embaralhar(CENARIOS.map(function(c) { return c.id; }));
  // na primeiríssima partida a 1ª rodada é no campo (o mais simples)
  if (opcoes.primeiraVez) { ordem.splice(ordem.indexOf("campo"), 1); ordem.unshift("campo"); }
  jogo = {
    modo: modo,
    demo: modo === "demo",
    pontos: [0, 0],
    alvo: CONFIG.pontosParaVencer,
    rodada: 0,
    cores: sortearCores(),
    ordem: ordem,
    lendaria: !!opcoes.lendaria,
    nivelBot: opcoes.nivelBot === undefined ? 0.5 : opcoes.nivelBot,
    bots: [null, null],
    M: null,
    fase: "intro", tempoFase: 0, relogio: RODADA.luta,
    queda: null,
    total: { dano: [0, 0], tiros: [0, 0], acertos: [0, 0], quedas: 0, rodadas: [] },
    vencedorRodada: 0, vencedorPartida: 0,
    banner: null,
    tempoReal: 0
  };
  if (modo === "bot") jogo.bots[1] = criarBot(2, jogo.nivelBot);
  if (modo === "demo") { jogo.bots[0] = criarBot(1, 0.75); jogo.bots[1] = criarBot(2, 0.75); jogo.alvo = 99; }
  entrada.solo = modo !== "2p";
  if (typeof Efeitos !== "undefined") Efeitos.limpar();
  iniciarRodada();
}

function iniciarRodada() {
  const j = jogo;
  j.rodada++;
  const cen = CENARIO[j.ordem[(j.rodada - 1) % j.ordem.length]];
  const M = {
    cen: cen, plats: prepararPlataformas(cen), t: 0, passo: 0,
    bumpers: cen.bumpers ? cen.bumpers.map(function(u) { return { x: u.x, y: u.y, r: u.r, flash: 0 }; }) : null,
    proj: [], feixes: [], avisos: [], caixas: [], cartas: [],
    proxCaixa: 3, proxCarta: 6 + Math.random() * 1.5, proxMeteoro: 3,
    lendaria: j.lendaria, mudo: j.demo, multDano: 1,
    stats: { dano: [0, 0], tiros: [0, 0], acertos: [0, 0] },
    morreu: null, pegou: null, ultimaCarta: null
  };
  const b1 = novaBolinha(1, cen.spawn[0][0], cen.spawn[0][1], j.cores[0]);
  const b2 = novaBolinha(2, cen.spawn[1][0], cen.spawn[1][1], j.cores[1]);
  M.bolinhas = [b1, b2];
  // os dois começam com a mesma arma (justo) e ela muda a cada rodada
  const arma = sortearArma(M, true);
  equipar(b1, arma); equipar(b2, arma);
  b1.mira = 0; b2.mira = Math.PI;
  j.M = M;
  j.fase = "intro";
  j.tempoFase = 0;
  j.relogio = RODADA.luta;
  j.queda = null;
  j.avisouDobro = false;
  j.vencedorRodada = 0;
  j.prerender = null;          // o desenho refaz o fundo
  j.bots.forEach(function(bot) { if (bot) { bot.plano = null; bot.historico = []; } });
  if (!j.demo) {
    if (j.modo === "bot") Poki.medir("arena", cen.id, "start");
    som("rodada");
  }
}

// ---------- um passo (1/60 s) ----------
function atualizarJogo(dt) {
  const j = jogo;
  if (!j) return;
  const M = j.M;
  j.tempoFase += FIS.dt;
  j.tempoReal += FIS.dt;
  if (typeof Efeitos !== "undefined") Efeitos.atualizar(dt);
  if (j.fase === "queda") { atualizarQueda(j); return; }
  if (j.fase === "fimPartida") {
    passoMundo(j, M, false, 0.5);
    if (j.tempoFase >= RODADA.fimPartida) terminarPartida();
    return;
  }

  if (j.fase === "intro") {
    passoMundo(j, M, false, 1);
    if (j.tempoFase >= (j.rodada === 1 ? RODADA.introPrimeira : RODADA.intro)) { j.fase = "luta"; j.tempoFase = 0; if (!j.demo) som("lute"); }
    return;
  }
  if (j.fase === "luta") {
    // últimos segundos: dano em dobro (quase toda rodada acaba em derrota, não em empate)
    M.multDano = CONFIG.multDano * (j.relogio <= RODADA.danoDobro ? 2 : 1);
    if (!j.avisouDobro && j.relogio <= RODADA.danoDobro) { j.avisouDobro = true; if (!j.demo) som("alarme"); }
    passoMundo(j, M, true, 1);
    j.relogio -= FIS.dt;
    if (M.morreu) {
      const vivos = M.bolinhas.filter(function(b) { return b.viva; });
      j.vencedorRodada = vivos.length === 1 ? vivos[0].lado : 0;
      j.fase = "fimRodada"; j.tempoFase = 0;
      return;
    }
    if (j.relogio <= 0) comecarQueda(j);
    return;
  }
  if (j.fase === "fimRodada") {
    // câmera lenta no começo do fim da rodada
    passoMundo(j, M, true, j.tempoFase < 0.7 ? 0.35 : 1);
    if (j.tempoFase >= RODADA.fim) fecharRodada(j);
  }
}

// avança o mundo; "lento" < 1 deixa tudo mais devagar (câmera lenta)
function passoMundo(j, M, controles, lento) {
  j.acumLento = (j.acumLento || 0) + lento;
  if (j.acumLento < 1) return;
  j.acumLento -= 1;
  M.t += FIS.dt;
  M.passo++;
  atualizarPlataformas(M.plats, M.t);
  if (M.bumpers) M.bumpers.forEach(function(u) { if (u.flash > 0) u.flash = Math.max(0, u.flash - FIS.dt * 4); });

  for (let k = 0; k < 2; k++) {
    const b = M.bolinhas[k];
    let ent;
    const bot = j.bots[k];
    if (!controles || !b.viva) ent = PARADO;
    else if (bot) ent = pensarBot(bot, M, b);
    else ent = entradaHumana(b.lado);
    b.ent = ent;
    const yAntes = b.vy;
    moverBolinha(b, ent, M.cen, M.plats, M.t, M.bumpers);
    animarBolinha(b, yAntes);
    if (b.evento === "caiu") { b.vida = 0; matar(M, b); }
    else if (b.evento === "lava") causarDano(M, b, 18, null, 0, -1, 0);
    else if (b.evento === "pulo") { if (!M.mudo) som("pulo"); if (typeof Efeitos !== "undefined" && b.noChao === false && b.tempoNoAr > 0.2) Efeitos.poeira(b.x, b.y + b.r); }
    else if (b.evento === "aterrissou" && typeof Efeitos !== "undefined" && Math.abs(yAntes) > 6) Efeitos.poeira(b.x, b.y + b.r * gravSinal(M.cen, M.t));
    else if (b.evento === "portal" && typeof Efeitos !== "undefined") Efeitos.teleporte(b.x, b.y, b.cor);
    else if (b.evento === "bumper" && !M.mudo) som("mola");
    if (controles) usarArma(M, b, ent.tiro, ent.apertouTiro);
    atualizarEfeitos(M, b);
  }
  separarBolinhas(M.bolinhas[0], M.bolinhas[1]);
  atualizarProjeteis(M);
  atualizarAvisos(M);
  if (controles) { atualizarItens(M); atualizarMeteorosDoCenario(M); }
  for (let i = M.feixes.length - 1; i >= 0; i--) {
    const f = M.feixes[i];
    f.vida -= FIS.dt / f.dur;
    if (f.vida <= 0) M.feixes.splice(i, 1);
  }
  // eventos para o painel do Poki (só o jogador de verdade)
  if (M.pegou) {
    M.pegou.forEach(function(p) {
      const b = M.bolinhas[p.lado - 1];
      if (typeof Efeitos !== "undefined") Efeitos.texto(b.x, b.y - b.r - 34, t("a_" + p.arma), ["#ffffff", "#ffffff", "#d0bfff", "#ffd43b"][ARMA[p.arma].raridade]);
      if (!j.demo && (p.lado === 1 || j.modo === "2p")) Poki.medir("weapon", p.arma, "interact");
    });
    M.pegou = null;
  }
  if (!j.demo && M.ultimaCarta && !M.ultimaCarta.medida) {
    M.ultimaCarta.medida = true;
    if (M.ultimaCarta.lado === 1 || j.modo === "2p") Poki.medir("card", M.ultimaCarta.id, "interact");
  }
}
const PARADO = { esq: false, dir: false, pulo: false, segPulo: false, baixo: false, tiro: false, apertouTiro: false };

function entradaHumana(j) {
  const apertouTiro = entrada.apertou(j, "tiro");
  return {
    esq: entrada.segurando(j, "esquerda"),
    dir: entrada.segurando(j, "direita"),
    pulo: entrada.apertou(j, "pulo"),
    segPulo: entrada.segurando(j, "pulo"),
    baixo: entrada.segurando(j, "baixo"),
    tiro: entrada.segurando(j, "tiro") || apertouTiro,
    apertouTiro: apertouTiro
  };
}

// amassa e estica a bolinha (pulo e aterrissagem) e escolhe a expressão
function animarBolinha(b, vyAntes) {
  if (b.escalaX === undefined) { b.escalaX = 1; b.escalaY = 1; b.piscar = 0; b.proxPiscar = 2 + Math.random() * 3; }
  if (b.evento === "pulo") { b.escalaX = 0.82; b.escalaY = 1.2; }
  if (b.evento === "aterrissou" && Math.abs(vyAntes) > 5) { b.escalaX = 1.25; b.escalaY = 0.78; }
  b.escalaX += (1 - b.escalaX) * 0.18;
  b.escalaY += (1 - b.escalaY) * 0.18;
  b.proxPiscar -= FIS.dt;
  if (b.proxPiscar <= 0) { b.piscar = 1; b.proxPiscar = 2 + Math.random() * 4; }
  b.piscar = Math.max(0, b.piscar - FIS.dt * 8);
}

function fecharRodada(j) {
  const M = j.M;
  const v = j.vencedorRodada;
  if (v) j.pontos[v - 1]++;
  for (let k = 0; k < 2; k++) {
    j.total.dano[k] += M.stats.dano[k];
    j.total.tiros[k] += M.stats.tiros[k];
    j.total.acertos[k] += M.stats.acertos[k];
  }
  j.total.rodadas.push(v);
  if (!j.demo && j.modo === "bot") Poki.medir("arena", M.cen.id, v === 1 ? "complete" : "fail");
  if (j.pontos[0] >= j.alvo || j.pontos[1] >= j.alvo) {
    j.vencedorPartida = j.pontos[0] > j.pontos[1] ? 1 : 2;
    j.fase = "fimPartida"; j.tempoFase = 0;
    if (!j.demo) som(j.modo === "bot" && j.vencedorPartida === 2 ? "derrota" : "vitoria");
    return;
  }
  if (j.demo && j.rodada > 40) { novaPartida("demo"); return; }
  iniciarRodada();
}

// ---------- queda de braço ----------
function comecarQueda(j) {
  const [b1, b2] = j.M.bolinhas;
  // quem tem mais vida já começa na frente (até 35% do caminho)
  const vantagem = limitar((b2.vida - b1.vida) / 100, -1, 1) * 0.35;
  j.fase = "queda";
  j.tempoFase = 0;
  j.queda = { pos: vantagem, toques1: 0, toques2: 0, t: 0, vencedor: 0, pulso1: 0, pulso2: 0 };
  j.total.quedas++;
  entrada.limparApertos();
  if (!j.demo) { Eventos.marco("arm-wrestling"); som("apito"); }
  j.bots.forEach(function(bot) { if (bot) bot.proxClique = 0.25 + Math.random() * 0.3; });
}

const PASSO_QUEDA = 0.058;
function atualizarQueda(j) {
  const q = j.queda;
  q.pulso1 = Math.max(0, q.pulso1 - FIS.dt * 6);
  q.pulso2 = Math.max(0, q.pulso2 - FIS.dt * 6);
  if (q.vencedor) {
    if (j.tempoFase >= RODADA.quedaFim) { j.vencedorRodada = q.vencedor; fecharRodada(j); }
    return;
  }
  if (j.tempoFase < RODADA.quedaIntro) { entrada.limparApertos(); return; }
  q.t += FIS.dt;
  for (let k = 1; k <= 2; k++) {
    const bot = j.bots[k - 1];
    let clicou;
    if (bot) clicou = botClica(bot, q.t);
    else clicou = entrada.apertou(k, "tiro") || entrada.apertou(k, "toque") || entrada.apertou(k, "pulo");
    if (!clicou) continue;
    if (k === 1) { q.toques1++; q.pos -= PASSO_QUEDA; q.pulso1 = 1; }
    else { q.toques2++; q.pos += PASSO_QUEDA; q.pulso2 = 1; }
    if (!j.demo) som("clique");
  }
  if (q.pos <= -1 || q.pos >= 1 || q.t >= RODADA.quedaMax) {
    q.pos = limitar(q.pos, -1, 1);
    q.vencedor = q.pos < 0 ? 1 : q.pos > 0 ? 2 : (Math.random() < 0.5 ? 1 : 2);
    j.tempoFase = 0;
    if (!j.demo) som("vitoria_rodada");
    if (typeof Efeitos !== "undefined") Efeitos.tremer(8);
  }
}

// ---------- fim ----------
// Desempenho do jogador contra o bot (0 a 1): metade rodadas, metade dano trocado
function desempenhoDoJogador(j) {
  const r = j.total.rodadas;
  const minhas = r.filter(function(v) { return v === 1; }).length;
  const rodadas = r.length ? minhas / r.length : 0.5;
  const d = j.total.dano;
  const dano = d[0] + d[1] > 0 ? d[0] / (d[0] + d[1]) : 0.5;
  return rodadas * 0.55 + dano * 0.45;
}

// O bot da próxima partida: se o jogador foi bem, fica mais forte; se foi mal, mais fraco.
// Mira em ~50% de vitórias. Nunca abaixo de 0,12 nem acima de 0,95.
function proximoNivelBot(nivel, desempenho) {
  return limitar(nivel + (desempenho - 0.5) * 0.5, 0.12, 0.95);
}

function terminarPartida() {
  const j = jogo;
  if (j.demo) { novaPartida("demo"); return; }
  aoTerminarPartida(j);   // telas.js
}
