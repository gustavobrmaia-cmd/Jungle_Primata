"use strict";

// =========================
// SAVE (localStorage)
// Tudo protegido com try/catch: em aba anônima ou com o armazenamento bloqueado o jogo
// funciona igual, só não lembra nada na próxima visita.
// =========================

function saveNovo() {
  return {
    versao: 1,
    idioma: "",       // vazio: segue o navegador
    mudo: false,
    partidas: 0,      // quantas partidas já começou (0 = primeira visita)
    vitorias: 0,      // contra o bot
    derrotas: 0,
    nivelBot: 0.28    // força do bot (0 a 1), ajustada depois de cada partida contra ele
  };
}

let save = saveNovo();

function carregarSave() {
  try {
    const s = JSON.parse(localStorage.getItem(CONFIG.chaveSave) || "null");
    if (s && typeof s === "object") {
      const base = saveNovo();
      Object.keys(base).forEach(function(k) {
        if (typeof s[k] === typeof base[k]) base[k] = s[k];
      });
      save = base;
    }
  } catch (e) { /* sem armazenamento: segue com o save novo */ }
}

function salvar() {
  try { localStorage.setItem(CONFIG.chaveSave, JSON.stringify(save)); } catch (e) { /* cheio ou bloqueado */ }
}
