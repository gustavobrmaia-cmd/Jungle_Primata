"use strict";

// =========================
// SAVE (fica guardado no navegador)
// =========================

const SAVE_KEY = "primata-save-v3";

function buscarItem(tipo, id) {
  if (tipo === "skin") return SKINS.find(function(s) { return s.id === id; }) || null;
  return ITENS.find(function(i) { return i.id === id && i.tipo === tipo; }) || null;
}

function copiaTeclasPadrao() {
  const t = {};
  Object.keys(TECLAS_PADRAO).forEach(function(a) { t[a] = TECLAS_PADRAO[a].slice(); });
  return t;
}

function saveNovo() {
  const poderes = {};
  PODERES.forEach(function(p) { poderes[p.id] = 0; });
  return {
    moedas: 0,
    comprados: SKINS.filter(function(s) { return s.preco === 0; }).map(function(s) { return s.id; }),
    equip: { skin: SKINS[0].id, chapeu: null, oculos: null, roupa: null },
    desbloqueado: 0,              // maior fase liberada
    chefes: [false, false, false, false],
    poderes: poderes,             // quantos de cada poder você tem
    melhorias: [],                // ids das melhorias permanentes
    nivel: 1,
    xp: 0,
    teclas: copiaTeclasPadrao(),
    stats: { inimigos: 0, chutes: 0, chefes: 0, mortes: 0, tempo: 0 },
    viuIntro: false,
    zerou: false,
    mudo: false,
    cronometro: false,            // cronômetro de speedrun na tela
    recordes: { fases: [], run: 0 }   // melhores tempos (em quadros de 1/60s)
  };
}

let save = saveNovo();

(function carregarSave() {
  let s = null;
  let versao = 3;
  try {
    s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) { s = JSON.parse(localStorage.getItem("primata-save-v2")); versao = 2; }
    if (!s) { s = JSON.parse(localStorage.getItem("primata-save-v1")); versao = 1; }
  } catch (e) { s = null; }
  if (!s || typeof s !== "object") return;

  if (typeof s.moedas === "number" && s.moedas >= 0) save.moedas = Math.floor(s.moedas);
  if (Array.isArray(s.comprados)) {
    s.comprados.forEach(function(id) {
      if (typeof id === "string" && save.comprados.indexOf(id) < 0) save.comprados.push(id);
    });
  }
  if (s.equip) {
    ["skin"].concat(CAMADAS).forEach(function(tipo) {
      const id = s.equip[tipo];
      if (id && buscarItem(tipo, id) && save.comprados.indexOf(id) >= 0) save.equip[tipo] = id;
    });
  }
  if (typeof s.desbloqueado === "number") {
    let d = Math.floor(s.desbloqueado);
    if (versao === 2) {
      // A versão 2 tinha 4 fases por mundo (3 + chefe); agora são 6 (5 + chefe)
      const m = Math.floor(d / 4);
      const e = d % 4;
      d = m * FASES_POR_MUNDO + (e === 3 ? FASES_POR_MUNDO - 1 : e);
    }
    save.desbloqueado = limitar(d, 0, TOTAL_FASES - 1);
  }
  if (Array.isArray(s.chefes)) save.chefes = save.chefes.map(function(v, i) { return !!s.chefes[i]; });
  if (s.poderes) {
    PODERES.forEach(function(p) {
      const n = s.poderes[p.id];
      if (typeof n === "number" && n > 0) save.poderes[p.id] = Math.floor(n);
    });
  }
  if (Array.isArray(s.melhorias)) {
    save.melhorias = s.melhorias.filter(function(id) {
      return MELHORIAS.some(function(m) { return m.id === id; });
    });
  }
  if (typeof s.nivel === "number" && s.nivel >= 1) save.nivel = Math.floor(s.nivel);
  if (typeof s.xp === "number" && s.xp >= 0) save.xp = Math.floor(s.xp);
  if (s.teclas && typeof s.teclas === "object") {
    ACOES.forEach(function(a) {
      const lista = s.teclas[a.id];
      if (Array.isArray(lista)) save.teclas[a.id] = lista.filter(function(k) { return typeof k === "string"; }).slice(0, 3);
    });
  }
  if (s.stats) {
    Object.keys(save.stats).forEach(function(k) {
      if (typeof s.stats[k] === "number") save.stats[k] = s.stats[k];
    });
  }
  save.viuIntro = !!s.viuIntro;
  save.zerou = !!s.zerou;
  save.mudo = !!s.mudo;
  save.cronometro = !!s.cronometro;
  if (s.recordes && typeof s.recordes === "object") {
    if (Array.isArray(s.recordes.fases)) {
      save.recordes.fases = s.recordes.fases.slice(0, TOTAL_FASES).map(function(v) {
        return typeof v === "number" && v > 0 ? Math.floor(v) : 0;
      });
    }
    if (typeof s.recordes.run === "number" && s.recordes.run > 0) save.recordes.run = Math.floor(s.recordes.run);
  }
})();

function salvar() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* navegador bloqueou */ }
}

function temMelhoria(id) {
  return save.melhorias.indexOf(id) >= 0;
}

function temCosmetico(id) {
  return save.comprados.indexOf(id) >= 0;
}

// Nome da tecla principal de uma ação (para mostrar nas placas e na tela)
function teclaDe(acao) {
  const lista = save.teclas[acao] || [];
  const k = lista.find(function(x) { return x; });
  return nomeDaTecla(k);
}
