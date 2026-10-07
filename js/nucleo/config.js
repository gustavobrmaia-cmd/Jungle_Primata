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
  multDano: 1.3,            // multiplicador geral de dano (calibrado nas simulações bot x bot)
  pontosPrimeira: 3,        // a 1ª partida da vida é mais curta (até 3): a pessoa chega rápido ao fim e à recompensa
  leve: false               // modo leve (celular/computador fraco): menos partículas e fundo dos menus a 30 qps
};
