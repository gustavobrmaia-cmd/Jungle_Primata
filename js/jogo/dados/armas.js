"use strict";

// =========================
// AS 50 ARMAS
// Unidades: velocidade em px por passo (60 passos/s), cadência e tempos em segundos,
// dano em pontos de vida (cada bolinha tem 100).
//
// tipo:
//   "bala"   projétil comum (com os extras abaixo)
//   "laser"  acerta na hora em linha reta (perfuraParede, quicaParede)
//   "feixe"  raio contínuo enquanto segura o tiro (dano por passo)
//   "raio"   choque elétrico que pula até o oponente se ele estiver perto
//   "melee"  golpe de perto (alcance em px)
//   "mina"   fica no chão e explode quando o oponente chega perto
//   "ceu"    cai do céu em cima do oponente depois de um aviso (meteoro, relâmpago)
//
// extras da "bala": qtd (por tiro), espalha (radianos), grav (fração da gravidade), quica (vezes),
//   explode (raio da explosão), perfura, teleguia (curva por passo), volta (bumerangue),
//   congela (s de lentidão), fogo (s queimando), empurra (força no alvo), recuo (força em quem atira),
//   vida (passos até sumir), raio (tamanho do projétil), timer (passos até explodir sozinho),
//   fragmentos (quantos estilhaços na explosão), puxa (gancho), atrai (buraco negro), arrasto (freio no ar)
// visual: como o projétil é desenhado (ArteArmas.desenharProjetil)
// raridade: 1 comum, 2 rara, 3 lendária (as raras aparecem menos nas caixas)
// =========================

const ARMAS = [
  // ---- a de começo (munição infinita) ----
  { id: "estilingue", tipo: "bala", raridade: 0, municao: Infinity, cadencia: 0.32, dano: 7, vel: 13, grav: 0.15, raio: 5, visual: "pedra" },

  // ---- tiro ----
  { id: "pistola", tipo: "bala", raridade: 1, municao: 14, cadencia: 0.26, dano: 10, vel: 17, raio: 4, visual: "bala" },
  { id: "revolver", tipo: "bala", raridade: 1, municao: 6, cadencia: 0.6, dano: 22, vel: 20, raio: 5, empurra: 6, recuo: 2, visual: "bala_grande" },
  { id: "submetralhadora", tipo: "bala", raridade: 1, municao: 45, cadencia: 0.08, dano: 5, vel: 17, espalha: 0.08, raio: 3, visual: "bala" },
  { id: "minigun", tipo: "bala", raridade: 2, municao: 90, cadencia: 0.05, dano: 4, vel: 18, espalha: 0.12, raio: 3, recuo: 0.35, visual: "bala" },
  { id: "escopeta", tipo: "bala", raridade: 1, municao: 6, cadencia: 0.8, dano: 6, qtd: 7, espalha: 0.35, vel: 15, vida: 30, raio: 3, empurra: 3, recuo: 4, visual: "chumbo" },
  { id: "escopeta_dupla", tipo: "bala", raridade: 2, municao: 4, cadencia: 1.1, dano: 6, qtd: 12, espalha: 0.5, vel: 15, vida: 28, raio: 3, empurra: 4, recuo: 7, visual: "chumbo" },
  { id: "rifle", tipo: "bala", raridade: 1, municao: 20, cadencia: 0.18, dano: 13, vel: 24, raio: 4, visual: "bala" },
  { id: "sniper", tipo: "bala", raridade: 2, municao: 4, cadencia: 1.3, dano: 45, vel: 40, raio: 4, empurra: 8, recuo: 4, visual: "bala_rastro" },
  { id: "plasma", tipo: "bala", raridade: 1, municao: 12, cadencia: 0.3, dano: 14, vel: 15, raio: 9, explode: 30, visual: "plasma" },
  { id: "pula_pula", tipo: "bala", raridade: 1, municao: 10, cadencia: 0.45, dano: 12, vel: 14, grav: 0.6, quica: 6, raio: 8, vida: 240, visual: "bola_pula" },
  { id: "confete", tipo: "bala", raridade: 1, municao: 10, cadencia: 0.5, dano: 3, qtd: 10, espalha: 0.7, vel: 12, vida: 32, raio: 4, visual: "confete" },
  { id: "arma_agua", tipo: "bala", raridade: 1, municao: 100, cadencia: 0.04, dano: 1.5, vel: 15, grav: 0.3, raio: 4, empurra: 2.5, vida: 50, visual: "agua" },
  { id: "zarabatana", tipo: "bala", raridade: 1, municao: 10, cadencia: 0.45, dano: 8, vel: 22, raio: 3, congela: 0.7, visual: "dardo" },
  { id: "onda_sonora", tipo: "bala", raridade: 2, municao: 6, cadencia: 0.8, dano: 15, vel: 9, raio: 24, perfura: true, atravessa: true, empurra: 12, vida: 120, visual: "onda" },

  // ---- arremesso e flechas ----
  { id: "shuriken", tipo: "bala", raridade: 1, municao: 10, cadencia: 0.4, dano: 9, qtd: 3, espalha: 0.25, vel: 18, raio: 6, visual: "shuriken" },
  { id: "bumerangue", tipo: "bala", raridade: 1, municao: 6, cadencia: 0.6, dano: 18, vel: 14, raio: 10, perfura: true, volta: true, vida: 110, visual: "bumerangue" },
  { id: "arco", tipo: "bala", raridade: 1, municao: 8, cadencia: 0.7, dano: 28, vel: 20, grav: 0.35, raio: 4, visual: "flecha" },
  { id: "arco_triplo", tipo: "bala", raridade: 2, municao: 6, cadencia: 0.8, dano: 18, qtd: 3, espalha: 0.15, vel: 20, grav: 0.3, raio: 4, visual: "flecha" },
  { id: "besta", tipo: "bala", raridade: 2, municao: 5, cadencia: 0.9, dano: 34, vel: 26, grav: 0.15, raio: 4, perfura: true, visual: "virote" },
  { id: "serra", tipo: "bala", raridade: 2, municao: 4, cadencia: 0.7, dano: 14, vel: 12, raio: 14, quica: 4, perfura: true, vida: 200, visual: "serra" },
  { id: "bola_neve", tipo: "bala", raridade: 1, municao: 10, cadencia: 0.4, dano: 10, vel: 15, grav: 0.5, raio: 8, congela: 0.5, visual: "bola_neve" },
  { id: "gancho", tipo: "bala", raridade: 2, municao: 5, cadencia: 0.9, dano: 6, vel: 20, raio: 6, puxa: 16, vida: 45, visual: "gancho" },

  // ---- explosivos ----
  { id: "bazuca", tipo: "bala", raridade: 2, municao: 4, cadencia: 1.2, dano: 30, vel: 11, raio: 8, explode: 85, recuo: 5, visual: "foguete" },
  { id: "lanca_granadas", tipo: "bala", raridade: 1, municao: 6, cadencia: 0.9, dano: 25, vel: 13, grav: 1, quica: 3, explode: 70, timer: 80, raio: 7, visual: "granada" },
  { id: "granada", tipo: "bala", raridade: 1, municao: 3, cadencia: 0.7, dano: 35, vel: 11, grav: 1, quica: 5, explode: 95, timer: 95, raio: 8, visual: "granada" },
  { id: "dinamite", tipo: "bala", raridade: 2, municao: 2, cadencia: 0.9, dano: 45, vel: 10, grav: 1, quica: 4, explode: 130, timer: 120, raio: 8, visual: "dinamite" },
  { id: "fragmentacao", tipo: "bala", raridade: 2, municao: 3, cadencia: 0.9, dano: 20, vel: 11, grav: 1, quica: 4, explode: 60, timer: 85, fragmentos: 8, raio: 8, visual: "granada_frag" },
  { id: "canhao", tipo: "bala", raridade: 2, municao: 3, cadencia: 1.4, dano: 40, vel: 14, grav: 0.45, raio: 14, explode: 60, empurra: 14, recuo: 8, visual: "bala_canhao" },
  { id: "mini_misseis", tipo: "bala", raridade: 2, municao: 16, cadencia: 0.15, dano: 9, vel: 13, espalha: 0.15, raio: 5, explode: 34, visual: "mini_missil" },
  { id: "missil", tipo: "bala", raridade: 2, municao: 4, cadencia: 1.1, dano: 26, vel: 8, raio: 8, explode: 60, teleguia: 0.07, vida: 260, visual: "missil" },
  { id: "abelhas", tipo: "bala", raridade: 2, municao: 3, cadencia: 1, dano: 4, qtd: 5, espalha: 0.9, vel: 7, raio: 5, teleguia: 0.1, vida: 160, visual: "abelha" },
  { id: "bola_fogo", tipo: "bala", raridade: 1, municao: 6, cadencia: 0.7, dano: 18, vel: 12, raio: 11, explode: 40, fogo: 3, visual: "bola_fogo" },
  { id: "granada_gelo", tipo: "bala", raridade: 1, municao: 3, cadencia: 0.8, dano: 12, vel: 11, grav: 1, quica: 3, explode: 90, congela: 1.6, timer: 85, raio: 8, visual: "granada_gelo" },
  { id: "mina", tipo: "mina", raridade: 1, municao: 3, cadencia: 0.6, dano: 40, explode: 80, raio: 10, visual: "mina" },

  // ---- energia ----
  { id: "laser", tipo: "laser", raridade: 1, municao: 10, cadencia: 0.5, dano: 18, visual: "laser" },
  { id: "railgun", tipo: "laser", raridade: 3, municao: 3, cadencia: 1.6, dano: 50, perfuraParede: true, carga: 0.35, empurra: 10, visual: "railgun" },
  { id: "arco_iris", tipo: "laser", raridade: 3, municao: 6, cadencia: 0.7, dano: 26, quicaParede: 3, visual: "arco_iris" },
  { id: "feixe", tipo: "feixe", raridade: 2, municao: 180, cadencia: 0, dano: 1.3, alcance: 520, visual: "feixe" },
  { id: "tesla", tipo: "raio", raridade: 2, municao: 10, cadencia: 0.45, dano: 14, alcance: 380, visual: "raio" },
  { id: "raio_gelo", tipo: "bala", raridade: 1, municao: 10, cadencia: 0.4, dano: 8, vel: 16, raio: 6, congela: 1.2, visual: "gelo" },
  { id: "bolhas", tipo: "bala", raridade: 1, municao: 12, cadencia: 0.35, dano: 6, vel: 6, grav: -0.05, raio: 14, congela: 0.8, vida: 200, visual: "bolha" },
  { id: "buraco_negro", tipo: "bala", raridade: 3, municao: 2, cadencia: 1.5, dano: 1.2, vel: 4, raio: 18, atrai: 0.55, perfura: true, atravessa: true, vida: 200, visual: "buraco_negro" },

  // ---- fogo e vento (muitas partículas curtas) ----
  { id: "lanca_chamas", tipo: "bala", raridade: 2, municao: 120, cadencia: 0.035, dano: 1.6, vel: 9, espalha: 0.25, vida: 26, raio: 10, perfura: true, fogo: 2, arrasto: 0.96, visual: "chama" },
  { id: "soprador", tipo: "bala", raridade: 1, municao: 150, cadencia: 0.035, dano: 0.2, vel: 11, espalha: 0.3, vida: 30, raio: 12, perfura: true, atravessa: true, empurra: 2.2, arrasto: 0.95, visual: "vento" },

  // ---- corpo a corpo ----
  { id: "martelo", tipo: "melee", raridade: 1, municao: 12, cadencia: 0.55, dano: 30, alcance: 75, empurra: 18, visual: "martelo" },
  { id: "espada", tipo: "melee", raridade: 1, municao: 16, cadencia: 0.35, dano: 22, alcance: 82, empurra: 9, visual: "espada" },
  { id: "luva_boxe", tipo: "melee", raridade: 1, municao: 12, cadencia: 0.5, dano: 15, alcance: 70, empurra: 26, visual: "luva" },

  // ---- do céu ----
  { id: "meteoro", tipo: "ceu", raridade: 3, municao: 2, cadencia: 2, dano: 28, explode: 75, qtd: 3, aviso: 0.9, visual: "meteoro" },
  { id: "relampago", tipo: "ceu", raridade: 2, municao: 3, cadencia: 1.2, dano: 30, explode: 40, qtd: 1, aviso: 0.55, visual: "relampago" }
];

const ARMA = {};
ARMAS.forEach(function(a) { ARMA[a.id] = a; });
