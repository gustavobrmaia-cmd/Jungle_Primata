"use strict";

// =========================
// CONFIGURAÇÃO GERAL (o resto do jogo lê daqui)
// =========================
const CONFIG = {
  nome: "Jogo",
  largura: 1280,            // resolução lógica deitado (o canvas escala para caber na tela)
  altura: 720,
  permitirRetrato: true,    // celular em pé: a tela fica mais alta e o jogo usa a largura toda
  passo: 1000 / 60,         // física em passos fixos de 1/60 s (igual em qualquer monitor)
  usarPoki: true,           // false para itch.io / teste local sem o SDK
  chaveSave: "jogo-save-v1",
  debugEventos: false       // true: mostra no console cada Game Event enviado ao Poki
};
