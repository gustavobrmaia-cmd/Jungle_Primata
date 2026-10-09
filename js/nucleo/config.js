"use strict";

// =========================
// CONFIGURAÇÃO GERAL (o resto do jogo lê daqui)
// =========================
const CONFIG = {
  nome: "Crazy Balls Duel",
  largura: 1280,            // resolução lógica deitado (o canvas escala para caber na tela)
  altura: 720,
  permitirRetrato: true,    // celular em pé: a tela fica mais alta e o jogo usa a largura toda
  passo: 1000 / 60,         // física em passos fixos de 1/60 s (igual em qualquer monitor)
  usarPoki: true,           // false para itch.io / teste local sem o SDK
  chaveSave: "duelo-bolinhas-v1",   // (mantido para não apagar o progresso de quem já jogou)
  debugEventos: false,      // true: mostra no console cada Game Event enviado ao Poki
  pontosParaVencer: 5,      // a partida acaba quando alguém faz 5 pontos
  multDano: 0.85,           // multiplicador geral de dano (rodada de ~20 s bot x bot; bot consertado na v7)
  pontosPrimeira: 3,        // a 1ª partida da vida é mais curta (até 3): a pessoa chega rápido ao fim e à recompensa
  multTreino: 1.8,          // 1ª partida da vida: o tiro do jogador tira mais vida (rodada de ~15 s em vez de ~30 s)
  multSegunda: 1.25,        // 2ª partida e rivais 2 e 3 da liga Bronze: um pouco mais (rodada curta enquanto a pessoa aprende)
  leve: false               // modo leve (celular/computador fraco): menos partículas e fundo dos menus a 30 qps
};
