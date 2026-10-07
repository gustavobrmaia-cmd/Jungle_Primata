"use strict";

// =========================
// SKINS
// Duas partes que se combinam: o CORPO (material/estampa da bolinha) e o ACESSÓRIO (na cabeça/rosto).
// cor: "jogador" = usa a cor sorteada da bolinha na partida (a estampa fica no tom dela);
//      um hex = a skin tem cor própria (ouro, galáxia...). O oponente sempre fica com uma cor bem diferente.
// raridade: 1 comum, 2 rara, 3 épica, 4 lendária
// como ganhar: preco (moedas na loja) | conquista (id em CONQUISTAS) | semanal (prêmio do desafio da semana)
// =========================

const SKINS_CORPO = [
  { id: "classico",  raridade: 1, cor: "jogador", preco: 0 },
  { id: "listras",   raridade: 1, cor: "jogador", preco: 150 },
  { id: "pintas",    raridade: 1, cor: "jogador", preco: 150 },
  { id: "xadrez",    raridade: 1, cor: "jogador", preco: 200 },
  { id: "camuflado", raridade: 2, cor: "jogador", preco: 400 },
  { id: "futebol",   raridade: 2, cor: "#f1f3f5", preco: 450 },
  { id: "melancia",  raridade: 2, cor: "#2f9e44", preco: 450 },
  { id: "robo",      raridade: 2, cor: "jogador", conquista: "vitorias_25" },
  { id: "doce",      raridade: 2, cor: "#f783ac", semanal: true },
  { id: "cromado",   raridade: 3, cor: "jogador", preco: 900 },
  { id: "gelo",      raridade: 3, cor: "#a5d8ff", preco: 900 },
  { id: "neon",      raridade: 3, cor: "jogador", conquista: "cenarios_todos" },
  { id: "lava",      raridade: 3, cor: "#ff6b1a", semanal: true },
  { id: "diamante",  raridade: 4, cor: "#99e9f2", preco: 2000 },
  { id: "galaxia",   raridade: 4, cor: "#5f3dc4", semanal: true },
  { id: "ouro",      raridade: 4, cor: "#fcc419", conquista: "bot_mestre" }
];

const SKINS_ACESSORIO = [
  { id: "nenhum",      raridade: 1, preco: 0 },
  { id: "bone",        raridade: 1, preco: 120 },
  { id: "oculos",      raridade: 1, preco: 150 },
  { id: "orelhas_gato", raridade: 1, preco: 150 },
  { id: "fone",        raridade: 2, preco: 350 },
  { id: "cartola",     raridade: 2, preco: 400 },
  { id: "chifres",     raridade: 2, conquista: "explosivos_50" },
  { id: "tiara_flores", raridade: 2, semanal: true },
  { id: "mascara_ninja", raridade: 3, conquista: "perfeitas_10" },
  { id: "viking",      raridade: 3, preco: 800 },
  { id: "cowboy",      raridade: 3, semanal: true },
  { id: "antena",      raridade: 3, conquista: "quedas_20" },
  { id: "aureola",     raridade: 4, conquista: "missoes_50" },
  { id: "coroa",       raridade: 4, preco: 1800 }
];

const SKIN = {};
SKINS_CORPO.forEach(function(s) { s.tipo = "corpo"; SKIN[s.id] = s; });
SKINS_ACESSORIO.forEach(function(s) { s.tipo = "acessorio"; SKIN[s.id] = s; });
