"use strict";

// =========================
// PODER (v13): melhorias compradas com moedas que deixam a bolinha mais forte.
//   Força      x(1 + 0,10 por nível) no dano que a pessoa causa
//   Vida       o dano recebido é dividido por (1 + 0,10 por nível): a barra continua de 0 a 100, mas dura mais
//   Velocidade x(1 + 0,03 por nível) no andar
// Vale contra máquina (Rivais, Contra o bot, Sobrevivência). No modo 2 jogadores, nunca (os dois ficam iguais).
// Os rivais também têm poder: sobe ao longo da escada e bastante a cada liga. Quem melhora sobe a escada;
// quem perde ganha moedas, melhora e volta para a revanche mais forte ("perdi -> melhoro -> mais uma").
// PODER = 100 + 10 por nível (o número da abertura do rival, da tela de fim e do menu).
// Por quê: nos testes do Poki (v10 e v12, 2m25) quem jogava 5 min ou mais era ~10% das pessoas e somava quase
// metade do tempo jogado; enfeite (skins, acessórios) não fez essas pessoas ficarem mais.
// =========================

const MELHORIAS = [
  { id: "forca", icone: "💥", cor: "#ff8787", passo: 0.10, max: 25 },
  { id: "vida",  icone: "❤️", cor: "#69db7c", passo: 0.10, max: 25 },
  { id: "veloc", icone: "⚡", cor: "#4dabf7", passo: 0.03, max: 10 }
];

const Poder = (function() {
  function nivel(id) { return (save.poder && save.poder[id]) || 0; }
  function info(id) { return MELHORIAS.find(function(m) { return m.id === id; }); }
  function noMax(id) { return nivel(id) >= info(id).max; }

  // 40, 50, 65, 85, 105, 135, 175, 225, 290, 370... (a 1ª partida já paga umas 4 ou 5)
  function custo(id) { return Math.round(40 * Math.pow(1.28, nivel(id)) / 5) * 5; }
  function podeComprar(id) { return !noMax(id) && save.moedas >= custo(id); }
  function algumaPossivel() { return MELHORIAS.some(function(m) { return podeComprar(m.id); }); }

  function comprar(id) {
    if (!podeComprar(id)) return false;
    save.moedas -= custo(id);
    if (!save.poder) save.poder = { forca: 0, vida: 0, veloc: 0 };
    save.poder[id] = nivel(id) + 1;
    save.stats.melhorias = (save.stats.melhorias || 0) + 1;
    salvar();
    const tot = total(doJogador());
    Poki.medir("upgrade", id, "interact");
    if (tot <= 30) Poki.medir("power", "level-" + tot, "reached");
    return true;
  }

  function doJogador() { return { forca: nivel("forca"), vida: nivel("vida"), veloc: nivel("veloc") }; }
  // rival i (0 a 9) da liga: 1 nível por degrau e 12 por liga (rival 10 da Bronze = 9 níveis, PODER 190;
  // na simulação, quem não compra nada sofre pouco a mais na Bronze; na Prata em diante, melhorar vira necessário)
  function doRival(i, liga) {
    const n = Math.round(i + 12 * (liga || 0));
    const veloc = Math.min(10, Math.floor(n / 5));
    const forca = Math.ceil((n - veloc) / 2);
    return { forca: forca, vida: n - veloc - forca, veloc: veloc };
  }
  function total(niv) { return niv.forca + niv.vida + niv.veloc; }
  function valor(niv) { return 100 + 10 * total(niv); }
  function efeito(id, n) { return "+" + Math.round(info(id).passo * n * 100) + "%"; }

  // coloca o poder na bolinha (combate.js lê forca/defesa; fisica.js lê multVel)
  function aplicar(b, niv) {
    b.forca = 1 + 0.10 * niv.forca;
    b.defesa = 1 + 0.10 * niv.vida;
    b.multVel = 1 + 0.03 * niv.veloc;
  }

  return {
    nivel: nivel, custo: custo, noMax: noMax, podeComprar: podeComprar, algumaPossivel: algumaPossivel, comprar: comprar,
    doJogador: doJogador, doRival: doRival, total: total, valor: valor, efeito: efeito, aplicar: aplicar
  };
})();
