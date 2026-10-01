"use strict";

// =========================
// SAVE (fica guardado no navegador)
// =========================

const SAVE_KEY = "primata-save-v2";

function buscarItem(tipo, id) {
  if (tipo === "skin") return SKINS.find(function(s) { return s.id === id; }) || null;
  return ITENS.find(function(i) { return i.id === id && i.tipo === tipo; }) || null;
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
    viuIntro: false,
    zerou: false,
    mudo: false
  };
}

let save = saveNovo();

(function carregarSave() {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) s = JSON.parse(localStorage.getItem("primata-save-v1")); // save da versão antiga
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
  if (typeof s.desbloqueado === "number") save.desbloqueado = limitar(Math.floor(s.desbloqueado), 0, TOTAL_FASES - 1);
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
  save.viuIntro = !!s.viuIntro;
  save.zerou = !!s.zerou;
  save.mudo = !!s.mudo;
})();

function salvar() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* navegador bloqueou */ }
}

function temMelhoria(id) {
  return save.melhorias.indexOf(id) >= 0;
}
