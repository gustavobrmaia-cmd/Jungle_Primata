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
    nivelBot: 0.02,   // força do bot (0 a 1), ajustada depois de cada partida (e um pouco a cada rodada) contra ele
    teclas: null,     // teclas trocadas pelo jogador (null = as de fábrica)
    // progresso (js/jogo/progresso/progresso.js)
    moedas: 0,
    skinCorpo: "classico",
    skinAcessorio: "nenhum",
    donos: [],        // skins que a pessoa tem
    stats: {},        // contadores de tudo (vitórias, dano, quedas...)
    missoes: [],      // 3 missões ativas
    semana: null,     // desafios da semana
    conquistas: {},   // id -> "feita" | "resgatada"
    armasVistas: [], cartasVistas: [], cenariosVencidos: [],
    trocaDia: 0,      // dia em que trocou uma missão (1 troca grátis por dia)
    dobrar: 0,        // (antigo, não usado)
    xp: 0, nivel: 1,  // nível do jogador
    diario: null,     // recompensa diária: { ultimo: dia, seq: 1..7 }
    recordeOnda: 0,   // modo sobrevivência
    qualidade: "auto" // "auto" | "alta" | "leve"
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
