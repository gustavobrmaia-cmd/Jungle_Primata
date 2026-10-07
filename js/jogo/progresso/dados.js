"use strict";

// =========================
// MISSÕES, DESAFIOS SEMANAIS E CONQUISTAS (só dados; a lógica fica em progresso.js)
// "chave" é o contador que avança (Progresso.registrar(chave, n)):
//   vitorias (partida vencida contra o bot), partidas, partidas2p, rodadas (rodada vencida), dano, quedas (queda de braço
//   vencida), cartas, caixas, abatesExpl, abatesMelee, perfeitas (rodada vencida sem levar dano), placar5x0, virada,
//   botMestre, rodadaCenario (com o cenário), cenarioNovoSemana, lendarias, missoes, semanais
// Textos: mi_<id> (missão), de_<id> (desafio), co_<id> / cod_<id> (conquista), {0} = meta, {1} = cenário
// =========================

// Missões: sempre 3 ativas; ao resgatar, entra outra no lugar (nível 0..2 escolhe meta e prêmio)
const MISSOES_MODELOS = [
  { id: "vitorias", chave: "vitorias", metas: [1, 2, 3], moedas: [40, 70, 100] },
  { id: "rodadas", chave: "rodadas", metas: [4, 8, 12], moedas: [30, 55, 80] },
  { id: "dano", chave: "dano", metas: [600, 1200, 2500], moedas: [30, 55, 90] },
  { id: "quedas", chave: "quedas", metas: [1, 2, 3], moedas: [35, 60, 85] },
  { id: "cartas", chave: "cartas", metas: [3, 6, 10], moedas: [30, 50, 75] },
  { id: "caixas", chave: "caixas", metas: [4, 8, 14], moedas: [30, 50, 75] },
  { id: "abatesExpl", chave: "abatesExpl", metas: [1, 3, 5], moedas: [40, 70, 100] },
  { id: "abatesMelee", chave: "abatesMelee", metas: [1, 2, 3], moedas: [45, 75, 100] },
  { id: "perfeitas", chave: "perfeitas", metas: [1, 2, 3], moedas: [45, 75, 110] },
  { id: "partidas", chave: "partidas", metas: [2, 3, 5], moedas: [30, 45, 70] },
  { id: "partidas2p", chave: "partidas2p", metas: [1, 1, 2], moedas: [50, 50, 90] },
  { id: "rodadaCenario", chave: "rodadaCenario", metas: [1, 1, 2], moedas: [45, 45, 80], porCenario: true }
];

// Desafios da semana: 4 sorteados por semana (iguais para todo mundo naquela semana); completar os 4 dá a skin da semana
const DESAFIOS_MODELOS = [
  { id: "s_vitorias", chave: "vitorias", meta: 12, moedas: 250 },
  { id: "s_rodadas", chave: "rodadas", meta: 40, moedas: 220 },
  { id: "s_dano", chave: "dano", meta: 10000, moedas: 220 },
  { id: "s_quedas", chave: "quedas", meta: 8, moedas: 200 },
  { id: "s_cenarios", chave: "cenarioNovoSemana", meta: 10, moedas: 250 },
  { id: "s_5x0", chave: "placar5x0", meta: 1, moedas: 300 },
  { id: "s_expl", chave: "abatesExpl", meta: 12, moedas: 220 },
  { id: "s_cartas", chave: "cartas", meta: 25, moedas: 200 },
  { id: "s_perfeitas", chave: "perfeitas", meta: 6, moedas: 240 },
  { id: "s_virada", chave: "virada", meta: 1, moedas: 300 }
];

// Conquistas: permanentes. stat = contador total (ou tamanho de uma coleção: armasVistas, cartasVistas, cenariosVencidos)
const CONQUISTAS = [
  { id: "primeira_vitoria", stat: "vitorias", meta: 1, moedas: 50 },
  { id: "vitorias_10", stat: "vitorias", meta: 10, moedas: 150 },
  { id: "vitorias_25", stat: "vitorias", meta: 25, moedas: 100, skin: "robo" },
  { id: "vitorias_100", stat: "vitorias", meta: 100, moedas: 500 },
  { id: "partidas_50", stat: "partidas", meta: 50, moedas: 300 },
  { id: "rodadas_50", stat: "rodadas", meta: 50, moedas: 150 },
  { id: "rodadas_250", stat: "rodadas", meta: 250, moedas: 400 },
  { id: "dano_20000", stat: "dano", meta: 20000, moedas: 200 },
  { id: "dano_100000", stat: "dano", meta: 100000, moedas: 600 },
  { id: "quedas_5", stat: "quedas", meta: 5, moedas: 100 },
  { id: "quedas_20", stat: "quedas", meta: 20, moedas: 100, skin: "antena" },
  { id: "explosivos_50", stat: "abatesExpl", meta: 50, moedas: 100, skin: "chifres" },
  { id: "melee_20", stat: "abatesMelee", meta: 20, moedas: 200 },
  { id: "perfeitas_10", stat: "perfeitas", meta: 10, moedas: 100, skin: "mascara_ninja" },
  { id: "cenarios_todos", stat: "cenariosVencidos", meta: 15, moedas: 150, skin: "neon" },
  { id: "armas_25", stat: "armasVistas", meta: 25, moedas: 150 },
  { id: "armas_todas", stat: "armasVistas", meta: 49, moedas: 400 },
  { id: "cartas_todas", stat: "cartasVistas", meta: 12, moedas: 200 },
  { id: "placar_5x0", stat: "placar5x0", meta: 1, moedas: 250 },
  { id: "virada", stat: "virada", meta: 1, moedas: 250 },
  { id: "bot_mestre", stat: "botMestre", meta: 1, moedas: 300, skin: "ouro" },
  { id: "dois_jogadores_10", stat: "partidas2p", meta: 10, moedas: 200 },
  { id: "missoes_10", stat: "missoes", meta: 10, moedas: 150 },
  { id: "missoes_50", stat: "missoes", meta: 50, moedas: 200, skin: "aureola" },
  { id: "semana_completa", stat: "semanais", meta: 1, moedas: 300 }
];
