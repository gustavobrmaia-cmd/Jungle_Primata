"use strict";

// =========================
// CARTAS DE HABILIDADE (aparecem flutuando no meio da rodada; encostou, pegou e já vale)
// duracao em segundos (0 = efeito na hora)
// =========================

const CARTAS = [
  { id: "escudo", duracao: 7, cor: "#4dabf7" },        // segura 40 de dano
  { id: "rapidez", duracao: 7, cor: "#ffd43b" },       // anda e pula mais
  { id: "cura", duracao: 0, cor: "#51cf66" },          // +35 de vida
  { id: "furia", duracao: 6, cor: "#ff6b6b" },         // dano x2
  { id: "tiro_duplo", duracao: 8, cor: "#ff922b" },    // cada tiro sai em dobro
  { id: "mini", duracao: 8, cor: "#cc5de8" },          // fica pequeno (difícil de acertar)
  { id: "congelar", duracao: 0, cor: "#99e9f2" },      // congela o oponente por 1,6 s
  { id: "fantasma", duracao: 5, cor: "#e9ecef" },      // quase invisível
  { id: "reflexo", duracao: 5, cor: "#f783ac" },       // devolve os tiros
  { id: "super_pulo", duracao: 8, cor: "#94d82d" },    // pulo triplo e mais alto
  { id: "chuva", duracao: 0, cor: "#fd7e14" },         // 5 meteoros no oponente
  { id: "municao", duracao: 8, cor: "#ced4da" }        // munição infinita
];

const CARTA = {};
CARTAS.forEach(function(c) { CARTA[c.id] = c; });

// Cores das bolinhas: cada partida sorteia duas bem diferentes
const CORES_BOLINHAS = [
  "#ff5d73", "#4dabf7", "#ffd43b", "#51cf66", "#cc5de8", "#ff922b",
  "#22b8cf", "#f06595", "#94d82d", "#845ef7", "#ff8787", "#20c997"
];
