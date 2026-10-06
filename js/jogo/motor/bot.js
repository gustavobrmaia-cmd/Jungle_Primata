"use strict";

// =========================
// O BOT
// Ele "imagina o futuro": várias vezes por segundo testa ~15 jeitos de se mexer (andar, pular, pulo duplo,
// descer...) simulando a MESMA física do jogo uns 0,5–0,8 s para frente, e dá nota para cada um:
//   - perigo: tiros que vão acertar, explosões, granadas, minas, meteoros, lava, cair do mapa;
//   - distância boa para a arma que tem (martelo quer colar, sniper quer longe);
//   - linha de tiro livre até o oponente;
//   - caixas de arma melhores e cartas;
//   - não ficar parado na mira do oponente.
// E só atira quando a simulação do tiro diz que vai acertar (com a mira na frente do alvo).
//
// O nível (0 a 1) muda o tempo de reação, quantos tiros ele "enxerga", quanto erra, quanto hesita,
// a velocidade na queda de braço etc. Assim ele nunca fica impossível nem bobo: é um humano bom ou ruim.
// =========================

function lerp(a, b, k) { return a + (b - a) * k; }

function criarBot(lado, nivel) {
  const d = limitar(nivel, 0, 1);
  return {
    lado: lado,
    nivel: d,
    reacao: lerp(0.42, 0.07, d),           // atraso para perceber (s)
    intervalo: lerp(0.24, 0.07, d),        // tempo entre decisões (s)
    horizonte: Math.round(lerp(26, 46, d)),// passos simulados
    enxerga: lerp(0.45, 1, d),             // chance de notar cada tiro vindo
    hesita: lerp(0.38, 0.02, d),           // chance de não atirar num tiro bom
    chuta: lerp(0.025, 0.003, d),          // chance por passo de atirar "no chute"
    pressiona: lerp(0.08, 0.3, d),         // chance por passo de atirar quando está mais ou menos na mira
    tolerancia: lerp(1.5, 1.0, d),         // folga para achar que o tiro acerta
    coleta: lerp(0.55, 1, d),              // quanto liga para caixas e cartas
    ruido: lerp(9, 1.2, d),                // bagunça na escolha do movimento
    cliques: lerp(5.2, 9.3, d),            // cliques por segundo na queda de braço
    historico: [],                          // posições passadas do oponente (para o atraso de reação)
    plano: null, proxDecisao: 0, passosPlano: 0,
    proxClique: 0.3 + Math.random() * 0.3,
    vistos: new WeakMap(),                  // projétil -> notou ou não
    hesitouAte: 0
  };
}

// ---------- valor das armas ----------
const VALOR_ARMA = {};
(function() {
  ARMAS.forEach(function(a) {
    let dps;
    if (a.tipo === "feixe") dps = a.dano * 60;
    else dps = a.dano * (a.qtd || 1) * (a.qtd > 3 ? 0.45 : 1) / Math.max(a.cadencia, 0.05);
    if (a.explode) dps *= 1.25;
    if (a.tipo === "ceu") dps = 40;
    if (a.tipo === "mina") dps = 30;
    VALOR_ARMA[a.id] = limitar(dps / 90, 0.1, 1.2) + (a.raridade || 0) * 0.08;
  });
})();

function distanciaBoa(a) {
  if (a.tipo === "melee") return 40;
  if (a.visual === "chama" || a.visual === "vento") return 120;
  if (a.tipo === "raio") return 230;
  if (a.tipo === "mina") return 220;
  if (a.tipo === "ceu") return 380;
  if ((a.qtd || 1) >= 5 || a.vida && a.vida < 40) return 170;
  if (a.tipo === "laser" || a.dano >= 28 && !a.explode) return 440;
  if (a.explode && a.grav) return 300;
  if (a.volta) return 240;
  return 320;
}

// ---------- percepção ----------
function lembrar(bot, o) {
  bot.historico.push({ x: o.x, y: o.y, vx: o.vx, vy: o.vy });
  if (bot.historico.length > 40) bot.historico.shift();
}
// Onde o bot "acha" que o oponente está (com atraso de reação, projetado para frente)
function oponentePercebido(bot, o, M) {
  const atraso = Math.round(bot.reacao / FIS.dt);
  const h = bot.historico;
  const s = h[Math.max(0, h.length - 1 - atraso)] || o;
  const k = Math.min(atraso, h.length);
  let x = s.x + s.vx * k, y = s.y + s.vy * k * 0.5;
  if (o.efeitos.fantasma > 0) { x += Math.sin(M.t * 3.1) * 90; y += Math.cos(M.t * 2.3) * 50; }
  return { x: x, y: y, vx: s.vx, vy: s.vy, r: o.r };
}

// ---------- decisão ----------
const CANDIDATOS_BASE = (function() {
  const lista = [];
  [-1, 0, 1].forEach(function(dx) {
    lista.push({ dx: dx, pulo: 0, baixo: false });
    lista.push({ dx: dx, pulo: 1, baixo: false });     // pulo
    lista.push({ dx: dx, pulo: 2, baixo: false });     // pulo duplo
    lista.push({ dx: dx, pulo: 3, baixo: false });     // pulinho
    lista.push({ dx: dx, pulo: 0, baixo: true });      // descer da plataforma fina
  });
  lista.push({ dx: -1, pulo: 4, baixo: false }, { dx: 0, pulo: 4, baixo: false }, { dx: 1, pulo: 4, baixo: false }); // nadar/voar
  return lista;
})();

function entradaDoPlano(c, k) {
  let pulo = false, seg = false;
  if (c.pulo === 1) { pulo = k === 0; seg = k < 14; }
  else if (c.pulo === 2) { pulo = k === 0 || k === 13; seg = k < 26; }
  else if (c.pulo === 3) { pulo = k === 0; seg = k < 3; }
  else if (c.pulo === 4) { pulo = k % 12 === 0; seg = true; }
  return { esq: c.dx < 0, dir: c.dx > 0, pulo: pulo, segPulo: seg, baixo: c.baixo };
}

// Trajetórias das ameaças (calculadas uma vez por decisão)
function ameacas(bot, M, b, H) {
  const lista = [];
  const sinal = gravSinal(M.cen, M.t);
  const g = gravidadeDe(M.cen) * sinal;
  for (let i = 0; i < M.proj.length; i++) {
    const p = M.proj[i];
    if (!p.vivo) continue;
    const meu = p.dono === b.lado;
    // meus tiros só preocupam se forem explosivos (dá para se explodir)
    if (meu && !p.a.explode) continue;
    let notou = bot.vistos.get(p);
    if (notou === undefined) { notou = Math.random() < bot.enxerga; bot.vistos.set(p, notou); }
    if (!notou || p.t < bot.reacao * 0.6) continue;
    const a = p.a;
    const pos = [];
    let x = p.x, y = p.y, vx = p.vx, vy = p.vy;
    let explodeEm = a.timer ? a.timer - p.passos : -1;
    for (let k = 0; k < H; k++) {
      if (a.grav && !p.parado) vy += g * a.grav;
      if (a.arrasto) { vx *= a.arrasto; vy *= a.arrasto; }
      if (!p.parado && a.tipo !== "mina") { x += vx; y += vy; }
      pos.push(x, y);
    }
    lista.push({ pos: pos, raio: p.raio + (a.explode && !a.timer ? 10 : 4), dano: a.dano * (a.qtd > 3 ? 0.5 : 1) * (meu ? 0.4 : 1),
                 explode: a.explode || 0, explodeEm: explodeEm, mina: a.tipo === "mina", buraco: !!a.atrai });
  }
  for (let i = 0; i < M.avisos.length; i++) {
    const v = M.avisos[i];
    lista.push({ ceu: true, x: v.x, y: v.y, em: Math.round(v.tempo / FIS.dt), explode: v.a.explode + 10, dano: v.a.dano });
  }
  return lista;
}

function perigoNoPasso(lista, k, x, y, r) {
  let p = 0;
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (a.ceu) {
      if (Math.abs(k - a.em) <= 1) { const dx = x - a.x, dy = y - a.y; if (dx * dx + dy * dy < (a.explode + r) * (a.explode + r)) p += a.dano; }
      continue;
    }
    const px = a.pos[k * 2], py = a.pos[k * 2 + 1];
    const dx = x - px, dy = y - py;
    const d2 = dx * dx + dy * dy;
    if (a.mina) { if (d2 < 80 * 80) p += a.dano * 0.5; continue; }
    if (a.buraco) { if (d2 < 200 * 200) p += 3; continue; }
    if (a.explodeEm >= 0) {
      if (k === a.explodeEm || (k === lista.length && false)) { if (d2 < (a.explode + r) * (a.explode + r)) p += a.dano; }
      else if (d2 < (r + 14) * (r + 14)) p += a.dano * 0.4;
      continue;
    }
    const rr = r + a.raio;
    if (d2 < rr * rr) { p += a.dano * (a.explode ? 1.3 : 1); a.dano *= 0.3; }   // conta forte só a 1ª vez
  }
  return p;
}

function decidir(bot, M, b, o, perc) {
  const H = bot.horizonte;
  const cen = M.cen;
  const lista = ameacas(bot, M, b, H);
  const danos = lista.map(function(a) { return a.dano; });
  const arma = ARMA[b.arma];
  const pref = distanciaBoa(arma);
  const aguaOuEspaco = cen.agua || cen.semGravidade;
  const bumpers = M.bumpers ? M.bumpers.map(function(u) { return { x: u.x, y: u.y, r: u.r, flash: 0 }; }) : null;
  const lava = cen.lava ? lavaY(cen, M.t + 1.5) : Infinity;
  const valorAtual = VALOR_ARMA[b.arma] * (b.municao === Infinity ? 0.6 : limitar(b.municao / (arma.municao || 1), 0.25, 1));
  const ameacaOponente = VALOR_ARMA[o.arma] || 0.3;
  const reto = !(ARMA[o.arma].grav > 0.3) && ARMA[o.arma].tipo !== "ceu" && ARMA[o.arma].tipo !== "mina";

  let melhor = null, notaMelhor = -Infinity;
  for (let ci = 0; ci < CANDIDATOS_BASE.length; ci++) {
    const c = CANDIDATOS_BASE[ci];
    if (c.pulo === 4 && !aguaOuEspaco) continue;
    if (c.baixo && !(b.noChao && b.chao && b.chao.fina)) continue;
    // reseta o dano das ameaças (perigoNoPasso diminui depois do 1º acerto)
    for (let i = 0; i < lista.length; i++) lista[i].dano = danos[i];
    const s = copiarBolinha(b);
    let perigo = 0, caiu = false, pegaCaixa = 0, pegaCarta = 0;
    for (let k = 0; k < H; k++) {
      moverBolinha(s, entradaDoPlano(c, k), cen, M.plats, M.t + (k + 1) * FIS.dt, bumpers);
      if (s.evento === "caiu") { caiu = true; break; }
      if (s.evento === "lava") perigo += 35;
      perigo += perigoNoPasso(lista, k, s.x, s.y, s.r) * (1 - k / H * 0.4);
      // passou pela caixa / carta?
      for (let i = 0; i < M.caixas.length; i++) {
        const cx = M.caixas[i];
        if (Math.abs(cx.x - s.x) < s.r + 24 && Math.abs(cx.y - s.y) < s.r + 24) {
          const ganho = VALOR_ARMA[cx.idArma] - valorAtual;
          if (ganho > pegaCaixa) pegaCaixa = ganho;
        }
      }
      for (let i = 0; i < M.cartas.length; i++) {
        const ct = M.cartas[i];
        if (Math.abs(ct.x - s.x) < s.r + 26 && Math.abs(ct.y - s.y) < s.r + 30) pegaCarta = 1;
      }
    }
    let nota = 0;
    if (caiu) nota -= 1000;
    nota -= perigo * 3;
    // distância boa até o oponente (onde ele vai estar)
    const fx = perc.x + perc.vx * H * 0.5, fy = perc.y;
    const dx = fx - s.x, dy = fy - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    nota -= Math.abs(dist - pref) * 0.045;
    // linha de tiro
    const livre = linhaLivre(s.x, s.y, fx, fy, M.plats, M.t);
    if (livre) {
      if (arma.grav > 0.3 || arma.tipo === "ceu") nota += 6;
      else if (Math.abs(dy) < 70 || Math.abs(Math.atan2(dy, Math.abs(dx))) < 0.55) nota += 10;
      // e o perigo de ficar parado na linha do oponente
      if (reto && Math.abs(dy) < s.r + 8) nota -= 7 * ameacaOponente * (1 - Math.abs(s.vy) / 8);
    }
    // caixas e cartas (as que pega no caminho valem muito; as perto valem um pouco)
    if (pegaCaixa > 0) nota += pegaCaixa * 45 * bot.coleta;
    if (pegaCarta) nota += 30 * bot.coleta;
    for (let i = 0; i < M.caixas.length; i++) {
      const cx = M.caixas[i];
      const ganho = VALOR_ARMA[cx.idArma] - valorAtual;
      if (ganho <= 0.05 || cx.paraquedas && cx.y < 60) continue;
      const dd = Math.abs(cx.x - s.x) + Math.abs(cx.y - s.y) * 1.3;
      nota += ganho * 22 * bot.coleta / (1 + dd / 120);
    }
    for (let i = 0; i < M.cartas.length; i++) {
      const ct = M.cartas[i];
      const dd = Math.abs(ct.x - s.x) + Math.abs(ct.y - s.y) * 1.3;
      nota += 14 * bot.coleta / (1 + dd / 120);
    }
    // perigos do cenário
    if (s.y + s.r > lava - 40) nota -= 18;
    if (cen.queda) {
      // em cima de algum chão?
      let temChao = false;
      for (let i = 0; i < M.plats.length; i++) { const p = M.plats[i]; if (s.x > p.x - 5 && s.x < p.x + p.w + 5 && p.y >= s.y) { temChao = true; break; } }
      if (!temChao) nota -= 30;
    }
    nota -= Math.abs(s.x - 640) * 0.004;
    // continuar o plano anterior evita tremedeira
    if (bot.plano === c) nota += 2.5;
    nota += Math.random() * bot.ruido;
    if (nota > notaMelhor) { notaMelhor = nota; melhor = c; }
  }
  return melhor || CANDIDATOS_BASE[0];
}

// ---------- tiro ----------
// Simula o tiro e diz se acerta onde o bot acha que o oponente vai estar
function tiroAcerta(bot, M, b, perc) {
  const a = ARMA[b.arma];
  const o = oponente(M, b);
  const dx = perc.x - b.x, dy = perc.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (a.tipo === "melee") return dist < a.alcance + perc.r + 6;
  if (a.tipo === "ceu") return true;
  if (a.tipo === "mina") return b.noChao && dist < 320 && Math.random() < 0.04;
  if (a.tipo === "raio") return dist < a.alcance - 10 && linhaLivre(b.x, b.y, perc.x, perc.y, M.plats, M.t);
  const ang = b.mira;
  const boca = pontaDoCano(b, ang);
  if (a.tipo === "laser" || a.tipo === "feixe") {
    const alc = a.tipo === "feixe" ? a.alcance : 1500;
    const x2 = boca.x + Math.cos(ang) * alc, y2 = boca.y + Math.sin(ang) * alc;
    if (distPontoSegmento(perc.x, perc.y, boca.x, boca.y, x2, y2) > perc.r * bot.tolerancia) return false;
    return a.perfuraParede || linhaLivre(boca.x, boca.y, perc.x, perc.y, M.plats, M.t);
  }
  // projétil: simula
  const g = (a.grav || 0) * gravidadeDe(M.cen) * gravSinal(M.cen, M.t);
  const v = a.vel * (M.cen.agua ? 0.7 : 1);
  let x = boca.x, y = boca.y, vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
  let ox = perc.x, oy = perc.y;
  const ovx = perc.vx * 0.7, ovy = o.noChao ? 0 : perc.vy * 0.4;
  const alcanceMax = a.vida ? a.vida : 90;
  const raio = a.explode ? Math.max(a.explode * 0.55, perc.r) : perc.r * bot.tolerancia + (a.raio || 4);
  const espalha = (a.qtd || 1) > 2 ? 1.6 : 1;
  for (let k = 0; k < Math.min(alcanceMax, 90); k++) {
    if (a.grav) vy += g;
    if (a.arrasto) { vx *= a.arrasto; vy *= a.arrasto; }
    x += vx; y += vy;
    ox += ovx; oy += ovy;
    const ex = x - ox, ey = y - oy;
    if (ex * ex + ey * ey < raio * raio * espalha) {
      // não se explodir junto
      if (a.explode) { const sx = x - b.x, sy = y - b.y; if (sx * sx + sy * sy < (a.explode + b.r) * (a.explode + b.r) * 0.8) return false; }
      return true;
    }
    if (!a.atravessa && (k & 1) === 0) {
      for (let i = 0; i < M.plats.length; i++) {
        const p = M.plats[i];
        if (p.fina) continue;
        if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) {
          if (a.explode) { const ex2 = x - ox, ey2 = y - oy; return ex2 * ex2 + ey2 * ey2 < a.explode * a.explode * 0.5; }
          if (!a.quica) return false;
        }
      }
    }
    if (x < -40 || x > FIS.largura + 40 || y > 760) return false;
  }
  // teleguiados e bumerangue: basta estar mais ou menos na direção
  if (a.teleguia || a.volta || a.atrai) return dist < 650 && Math.abs(dy) < 160;
  return false;
}

// ---------- o que o bot aperta neste passo ----------
function pensarBot(bot, M, b) {
  const o = oponente(M, b);
  lembrar(bot, o);
  const ent = { esq: false, dir: false, pulo: false, segPulo: false, baixo: false, tiro: false };
  if (!b.viva) return ent;
  const perc = oponentePercebido(bot, o, M);

  bot.proxDecisao -= FIS.dt;
  if (bot.proxDecisao <= 0 || !bot.plano) {
    const novo = decidir(bot, M, b, o, perc);
    if (novo !== bot.plano) bot.passosPlano = 0;
    bot.plano = novo;
    bot.proxDecisao = bot.intervalo * (0.8 + Math.random() * 0.4);
  }
  const e = entradaDoPlano(bot.plano, bot.passosPlano++);
  Object.assign(ent, e);

  // virar para o oponente quando dá para atirar (como um humano tocando a seta rapidinho)
  const a = ARMA[b.arma];
  if (o.viva && b.cad <= 0.05 && !ent.esq && !ent.dir) b.dir = perc.x > b.x ? 1 : -1;

  if (o.viva) {
    if (M.t < bot.hesitouAte) return ent;
    const bom = tiroAcerta(bot, M, b, perc);
    if (bom) {
      if (b.cad <= 0 && Math.random() < bot.hesita) { bot.hesitouAte = M.t + 0.15; return ent; }
      ent.tiro = true;
    } else if (a.tipo !== "mina" && a.tipo !== "melee" && (b.municao === Infinity || b.municao > (a.municao || 1) * 0.3) && alinhado(M, b, perc)) {
      // na direção certa e com munição sobrando: atira "pressionando" (como um humano faz)
      if (Math.random() < bot.pressiona) ent.tiro = true;
    } else if (Math.random() < bot.chuta && a.tipo !== "mina") ent.tiro = true;
    // feixe: segura enquanto acerta
    if (a.tipo === "feixe" && bom) ent.tiro = true;
  }
  return ent;
}

// Oponente na frente, sem parede no meio e mais ou menos na altura da mira
function alinhado(M, b, perc) {
  const dx = perc.x - b.x, dy = perc.y - b.y;
  if (dx * b.dir < 0) return false;
  if (Math.abs(Math.atan2(dy, Math.abs(dx))) > 0.5) return false;
  if (dx * dx + dy * dy > 700 * 700) return false;
  return linhaLivre(b.x, b.y, perc.x, perc.y, M.plats, M.t);
}

// Queda de braço: devolve true quando o bot "clica" neste passo
function botClica(bot, tempo) {
  if (tempo < bot.proxClique) return false;
  bot.proxClique = tempo + (1 / bot.cliques) * (0.7 + Math.random() * 0.6);
  return true;
}
