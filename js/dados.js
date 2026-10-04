"use strict";

// =========================
// CONFIGURAÇÕES
// =========================

// Fundo da Selva (primeiro mundo). Vazio = o jogo desenha o próprio fundo em pixel art.
// Para publicar (Poki, itch.io) deixe vazio: imagem de outro site pode sair do ar ou ter direitos autorais.
const FUNDO_SELVA_URL = "";

// Sua imagem do macaco: vira a skin "Original" na loja (se não carregar, a skin some).
// As roupas são desenhadas para o macaco pixelado, então na sua imagem podem não encaixar perfeito.
// Vazio = só as skins em pixel art. Um caminho do seu PC (file:///C:/...) só funciona no seu computador.
const IMAGEM_PERSONAGEM = "";

// Poki: true carrega o SDK de anúncios do Poki (intervalo entre fases e "assista para reviver").
// Se o SDK não carregar (sem internet, bloqueador de anúncio), o jogo segue normal, sem anúncios.
// false = nada do Poki carrega (bom para itch.io).
const USAR_POKI = true;

// Moeda: por padrão é pixelada feita no código. Para usar seu PNG: imagem: "moeda.png", frames: quadros
const MOEDA = { imagem: "", frames: 8, tamanho: 32 };


// =========================
// MUNDOS
// Cada fase (1 a 5) libera um inimigo novo e um obstáculo novo, na ordem das listas.
// =========================

const MUNDOS = [
  { id: "selva",   nome: "Selva",          cor: "#2f9e44", chefe: "gorila",       nomeChefe: "Gorila Rei",
    inimigos: ["cobra", "abelha", "sapo", "macacoLadrao", "aranha"],
    obstaculos: ["espinhos", "cipo", "cogumelo", "troncos", "plantas"] },
  { id: "deserto", nome: "Deserto",        cor: "#e8a33d", chefe: "escorpiaoRei", nomeChefe: "Escorpião Faraó",
    inimigos: ["escorpiao", "abutre", "cacto", "mumia", "tatu"],
    obstaculos: ["areia", "tornado", "dardos", "pedraRolante", "ventania"] },
  { id: "gelo",    nome: "Era do Gelo",    cor: "#4dabf7", chefe: "yeti",         nomeChefe: "Yeti Ancestral",
    inimigos: ["pinguim", "morcegoGelo", "boneco", "foca", "lobo"],
    obstaculos: ["tunel", "estalactites", "pista", "geloFino", "avalanche"] },
  { id: "lava",    nome: "Vulcão de Lava", cor: "#e8590c", chefe: "dragao",       nomeChefe: "Dragão de Magma",
    inimigos: ["slime", "morcegoFogo", "diabinho", "golem", "fenix"],
    obstaculos: ["lagoLava", "geiser", "plataformasCaem", "barraFogo", "meteoros"] }
];

const FASES_POR_MUNDO = 6;   // 5 fases + o chefe
const TOTAL_FASES = MUNDOS.length * FASES_POR_MUNDO;
const RECOMPENSA_CHEFE = [150, 250, 350, 500];

const NOMES_OBSTACULO = {
  espinhos: "Espinhos", cipo: "Cipós de balançar", cogumelo: "Cogumelo pula-pula", troncos: "Troncos rolando",
  plantas: "Plantas carnívoras", areia: "Areia movediça", tornado: "Redemoinho", dardos: "Armadilha de dardos",
  pedraRolante: "Pedras rolando", ventania: "Ventania de areia", tunel: "Túnel de gelo (deslize!)",
  estalactites: "Estalactites", pista: "Pista de gelo", geloFino: "Gelo fino", avalanche: "Avalanche",
  lagoLava: "Lago de lava", geiser: "Rocha de impulso", plataformasCaem: "Plataformas que caem",
  barraFogo: "Barra de fogo", meteoros: "Chuva de meteoros"
};

function nomeFase(i) {
  const m = Math.floor(i / FASES_POR_MUNDO);
  const e = i % FASES_POR_MUNDO;
  if (e === FASES_POR_MUNDO - 1) return tr("{0} - Chefe", MUNDOS[m].nome);
  return MUNDOS[m].nome + " " + (m + 1) + "-" + (e + 1);
}


// =========================
// INIMIGOS
// comp: como se mexe   hp: vida   espinhoso: não dá para pisar em cima
// =========================

const TIPOS_INIMIGO = {
  cobra:        { nome: "Cobra",            comp: "patrulha",    vel: 1.2, hp: 1 },
  abelha:       { nome: "Abelha",           comp: "voador",      vel: 1.6, hp: 1, voa: true, amplitude: 30 },
  sapo:         { nome: "Sapo",             comp: "pulador",     vel: 3,   hp: 1, pulo: -11 },
  macacoLadrao: { nome: "Macaco Ladrão",    comp: "atirador",    hp: 2, tiro: "coco", intervalo: 110 },
  aranha:       { nome: "Aranha",           comp: "aranha",      vel: 4,   hp: 1, voa: true },
  escorpiao:    { nome: "Escorpião",        comp: "patrulha",    vel: 1.7, hp: 2 },
  abutre:       { nome: "Abutre",           comp: "mergulhador", vel: 1.6, hp: 1, voa: true, amplitude: 20 },
  cacto:        { nome: "Cacto Atirador",   comp: "atirador",    hp: 2, espinhoso: true, tiro: "espinho", intervalo: 110 },
  mumia:        { nome: "Múmia",            comp: "patrulha",    vel: 0.9, hp: 3 },
  tatu:         { nome: "Tatu-bola",        comp: "investida",   vel: 1,   hp: 2, velInvestida: 8, rolaEspinhoso: true },
  pinguim:      { nome: "Pinguim",          comp: "investida",   vel: 1,   hp: 1, velInvestida: 7 },
  morcegoGelo:  { nome: "Morcego de Gelo",  comp: "voador",      vel: 2.2, hp: 1, voa: true, amplitude: 50 },
  boneco:       { nome: "Boneco de Neve",   comp: "atirador",    hp: 2, tiro: "neve", intervalo: 120 },
  foca:         { nome: "Foca",             comp: "pulador",     vel: 3.5, hp: 2, pulo: -12 },
  lobo:         { nome: "Lobo do Gelo",     comp: "investida",   vel: 1.8, hp: 2, velInvestida: 9 },
  slime:        { nome: "Slime de Magma",   comp: "pulador",     vel: 3.5, hp: 2, pulo: -13, espinhoso: true },
  morcegoFogo:  { nome: "Morcego de Fogo",  comp: "voador",      vel: 3,   hp: 1, voa: true, amplitude: 60 },
  diabinho:     { nome: "Diabinho",         comp: "atirador",    hp: 2, tiro: "fogo", intervalo: 95 },
  golem:        { nome: "Golem de Pedra",   comp: "atirador",    hp: 4, tiro: "pedra", intervalo: 130 },
  fenix:        { nome: "Fênix",            comp: "mergulhador", vel: 2.4, hp: 2, voa: true, amplitude: 30, rastro: "#ff922b" }
};

function categoriaInimigo(tipo) {
  const t = TIPOS_INIMIGO[tipo];
  if (t.comp === "aranha") return "aranha";
  if (t.voa) return "voador";
  if (t.comp === "atirador") return "atirador";
  return "terrestre";
}


// =========================
// XP E NÍVEIS
// =========================

const XP = { moeda: 1, inimigo: 10, chute: 15, checkpoint: 15, powerup: 5, fase: 60, chefe: 300 };

function xpParaSubir(nivel) {
  return 100 + (nivel - 1) * 60;
}


// =========================
// SKINS E ROUPAS (desenhadas numa grade 20x20)
// preco: compra na loja   fase: ganha ao passar daquela fase   nivel: ganha ao chegar no nível
// detalhe: desenho por cima do corpo (listras, manchas...)   faixas: cores do pelo por linha
// =========================

const CORES_BASE = { E: "#111111", W: "#ffffff", M: "#6b2a1a" };

const SKINS = [
  { id: "classico", nome: "Clássico", preco: 0,
    cores: { F: "#8a5a2b", D: "#3b2412", P: "#e8c08a", B: "#c79a62" } },
  { id: "dourado", nome: "Dourado", preco: 150,
    cores: { F: "#e0a526", D: "#6e4504", P: "#fff0c2", B: "#ffd166" } },
  { id: "chiclete", nome: "Chiclete", preco: 200,
    cores: { F: "#f783ac", D: "#a61e4d", P: "#ffdeeb", B: "#fcc2d7" } },
  { id: "gelo", nome: "Gelo", preco: 250,
    cores: { F: "#e8f1f8", D: "#4a6a8a", P: "#a8d8ff", B: "#ffffff", E: "#1b3a5c" } },
  { id: "sombra", nome: "Sombra", preco: 300,
    cores: { F: "#3a2f4a", D: "#0e0914", P: "#a08cc0", B: "#5d4b78", E: "#ff3b6b", W: "#ffd1dc" } },
  { id: "camuflado", nome: "Camuflado", preco: 350,
    cores: { F: "#5c7a3a", D: "#1f2a14", P: "#c9b89a", B: "#7a8f52" },
    detalhe: { y: 4, cores: { N: "#3b2a14", G: "#2f4a1f" }, mapa: [
      "........NN..........",
      "......GG....NN......",
      "..............G.....",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      ".......NN...........",
      "......G.....GG......",
      "..........NN........",
      "......GG....N......."
    ] } },
  { id: "fogo", nome: "Fogo", preco: 350,
    cores: { F: "#d9480f", D: "#5c1a03", P: "#ffd8a8", B: "#ffa94d" },
    detalhe: { y: 1, cores: { Y: "#ffd43b", O: "#ff922b" }, mapa: [
      "........Y...........",
      ".......YO.Y.........",
      "......YOOYO.........",
      "........OO.........."
    ] } },
  { id: "dalmata", nome: "Dálmata", preco: 400,
    cores: { F: "#f8f9fa", D: "#343a40", P: "#ffe3e3", B: "#ffffff" },
    detalhe: { y: 4, cores: { K: "#212529" }, mapa: [
      "..........KK........",
      "......K.............",
      "..K.............K...",
      "....K...............",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      ".......K............",
      "............K.......",
      "......K.............",
      "...........K........",
      "........K....K......"
    ] } },
  { id: "zumbi", nome: "Zumbi", preco: 400,
    cores: { F: "#5c8a3a", D: "#1f3312", P: "#b5d99c", B: "#8fbf6a", E: "#c92a2a", W: "#f8f9c8", M: "#3a1010" },
    detalhe: { y: 4, cores: { K: "#1f3312", N: "#6b4220" }, mapa: [
      ".......K.K.K........",
      ".......KKKKK........",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      ".........NN.........",
      "........NNN........."
    ] } },
  { id: "zebra", nome: "Zebra", preco: 450,
    cores: { F: "#f8f9fa", D: "#111111", P: "#dee2e6", B: "#ffffff" },
    detalhe: { y: 4, cores: { K: "#111111" }, mapa: [
      "........K.K.........",
      ".......K.K.K........",
      "......K.......K.....",
      "....K..........K....",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "......K......K......",
      ".....K........K.....",
      "......K......K......",
      "......K......K......",
      ".......K....K......."
    ] } },
  { id: "panda", nome: "Panda", preco: 450,
    cores: { F: "#f8f9fa", D: "#111111", P: "#ffffff", B: "#dee2e6" },
    detalhe: { y: 6, cores: { K: "#111111" }, mapa: [
      ".KK..............KK.",
      ".....KKKK..KKKK.....",
      ".....K..K..K..K.....",
      ".....K..K..K..K.....",
      "......KK....KK......",
      "....................",
      "....................",
      "....................",
      "....................",
      "....KK........KK....",
      "....K..........K....",
      "....K..........K....",
      ".....KKKKKKKKK......"
    ] } },
  { id: "robo", nome: "Robô", preco: 600,
    cores: { F: "#868e96", D: "#212529", P: "#ced4da", B: "#adb5bd", E: "#22b8cf", W: "#0b7285", M: "#343a40" },
    detalhe: { y: 0, cores: { R: "#ff3b3b", K: "#495057", Y: "#ffd43b", G: "#40c057" }, mapa: [
      ".........R..........",
      ".........K..........",
      ".........K..........",
      "....................",
      "....................",
      "....................",
      "....................",
      "....Y..........Y....",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      ".........RG.........",
      "........GRG........."
    ] } },
  { id: "esqueleto", nome: "Esqueleto", preco: 650,
    cores: { F: "#1a1a1a", D: "#000000", P: "#e9ecef", B: "#1a1a1a", E: "#ff3b3b", W: "#000000", M: "#000000" },
    detalhe: { y: 14, cores: { W: "#e9ecef" }, mapa: [
      "........WW..........",
      ".......WWWW.........",
      "........WW..........",
      ".......WWWW........."
    ] } },
  { id: "neon", nome: "Neon", preco: 700,
    cores: { F: "#111827", D: "#00f5d4", P: "#2b2d42", B: "#1b1f3a", E: "#ff00e5", W: "#00f5d4", M: "#ff00e5" } },
  { id: "fantasma", nome: "Fantasma", preco: 750,
    cores: { F: "rgba(255,255,255,0.6)", D: "rgba(190,210,255,0.8)", P: "rgba(255,255,255,0.8)", B: "rgba(230,240,255,0.6)", E: "#1c1c3c" } },
  { id: "diamante", nome: "Diamante", preco: 900,
    cores: { F: "#3bc9db", D: "#0b7285", P: "#e3fafc", B: "#99e9f2", E: "#1864ab" },
    detalhe: { y: 4, cores: { W: "#ffffff" }, mapa: [
      ".........W..........",
      "....................",
      "......W.......W.....",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "............W.......",
      "......W.............",
      "....................",
      "..........W........."
    ] } },
  { id: "galaxia", nome: "Galáxia", preco: 1200,
    cores: { F: "#2b1d5c", D: "#0b0620", P: "#c0a9ff", B: "#4c2a9e", E: "#ffffff", W: "#ff9cf3", M: "#ff6bd6" },
    detalhe: { y: 4, cores: { W: "#ffffff", Y: "#ffe066" }, mapa: [
      "........W...........",
      "............W.......",
      "......Y.......W.....",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      ".......W............",
      "..............Y.....",
      "....................",
      "............Y......."
    ] } },
  { id: "arcoiris", nome: "Arco-íris", preco: 1500,
    faixas: ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"],
    cores: { F: "#ff6b6b", D: "#2b2b2b", P: "#fff4e6", B: "#ffffff" } },

  // ---------- Ganhas passando de fase ----------
  { id: "tigre", nome: "Tigre", fase: 4,
    cores: { F: "#f08c00", D: "#5c2b00", P: "#fff4e6", B: "#ffffff" },
    detalhe: { y: 4, cores: { K: "#2b1400" }, mapa: [
      "........K.K.........",
      ".......K.K.K........",
      "....................",
      "....K..........K....",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "......K......K......",
      "....................",
      "......K......K......",
      "....................",
      ".......K....K......."
    ] } },
  { id: "gorila", nome: "Gorila", fase: 5,
    cores: { F: "#3d3d3d", D: "#141414", P: "#a07a5a", B: "#7a7a7a", E: "#c92a2a" } },
  { id: "camelo", nome: "Camelo", fase: 10,
    cores: { F: "#c9a26b", D: "#6b4f2a", P: "#f2e1c2", B: "#e0c79c" } },
  { id: "pinguimSkin", nome: "Pinguim", fase: 15,
    cores: { F: "#1e2a44", D: "#0b1020", P: "#ffffff", B: "#ffffff", M: "#ff922b" } },
  { id: "yetiSkin", nome: "Yeti", fase: 17,
    cores: { F: "#f8f9fa", D: "#1c3d5a", P: "#9fb3c8", B: "#ffffff", E: "#c92a2a" } },
  { id: "lavaSkin", nome: "Lava", fase: 21,
    cores: { F: "#343a40", D: "#111111", P: "#ff922b", B: "#495057", E: "#ffd43b" },
    detalhe: { y: 4, cores: { O: "#ff6b00", Y: "#ffd43b" }, mapa: [
      "........O...........",
      ".........OO.........",
      "...........O........",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "......O.............",
      ".......OY.......O...",
      ".............O......",
      ".......O....YO......"
    ] } },
  { id: "dragaoSkin", nome: "Dragão", fase: 23,
    cores: { F: "#c92a2a", D: "#2b0a0a", P: "#ff922b", B: "#ffd43b", E: "#111111" },
    detalhe: { y: 1, cores: { H: "#f1f3f5" }, mapa: [
      "......H......H......",
      "......HH....HH......",
      ".......H....H......."
    ] } },

  // ---------- Ganhas subindo de nível ----------
  { id: "bronze", nome: "Bronze", nivel: 5,
    cores: { F: "#b0703c", D: "#4a2a10", P: "#f2d0a9", B: "#d9a066" },
    detalhe: { y: 4, cores: { W: "#ffe8cc" }, mapa: [".........W..........", "....................", "......W............."] } },
  { id: "prata", nome: "Prata", nivel: 10,
    cores: { F: "#ced4da", D: "#495057", P: "#f8f9fa", B: "#e9ecef" },
    detalhe: { y: 4, cores: { W: "#ffffff" }, mapa: [".........W..........", "....................", "......W.......W....."] } },
  { id: "ouro", nome: "Ouro", nivel: 15,
    cores: { F: "#fab005", D: "#7a4f05", P: "#fff3bf", B: "#ffe066" },
    detalhe: { y: 4, cores: { W: "#ffffff" }, mapa: [
      ".........W..........", "....................", "......W.......W.....",
      "....................", "....................", "....................", "....................",
      "....................", "....................", "....................", "............W......."
    ] } },
  { id: "lendario", nome: "Lendário", nivel: 20,
    cores: { F: "#3b1f6e", D: "#ffd43b", P: "#e5dbff", B: "#5f3dc4", E: "#ffd43b", W: "#ffffff" },
    detalhe: { y: 1, cores: { Y: "#ffd43b", W: "#ffffff" }, mapa: [
      ".......Y.YY.Y.......", ".......YYYYYY.......", "....................",
      "....................", "........W...........", "....................", "......Y.......W.....",
      "....................", "....................", "....................", "....................",
      "....................", "....................", "....................", ".......W......Y.....",
      "....................", "............W......."
    ] } }
];

// Prêmio do chefe secreto (não dá para comprar)
SKINS.push({ id: "reiMacaco", nome: "Saru", especial: "rei",
  cores: { F: "#9a5a26", D: "#2a1608", P: "#f2cfa0", B: "#f08c1a" },
  detalhe: { y: 1, cores: { K: "#2e2018", A: "#2563c9" }, mapa: [
    "......K..K..K.......", ".....KK.KK.KKK......", "....KKKKKKKKKKK.....", "....KKKKKKKKKKKK....",
    "....K.KK.KK.KK.K....", "....................", "....................", "....................", "....................", "....................", "....................", "....................", "....................", "....................", "....................", "....................",
    "......AAAAAAAA......"
  ] } });

if (IMAGEM_PERSONAGEM) {
  SKINS.unshift({ id: "original", nome: "Original", preco: 0, imagem: true });
}

// y = linha da grade onde o desenho começa
const ITENS = [
  // ---------- Chapéus ----------
  { id: "bone", tipo: "chapeu", nome: "Boné", preco: 80, y: 2,
    cores: { R: "#d62828", W: "#ffffff", K: "#7a1010" },
    mapa: ["......RRRRRRR.......", ".....RRRWRRRRR......", ".....KRRRRRRRRRRRR.."] },
  { id: "festa", tipo: "chapeu", nome: "Chapéu de Festa", preco: 100, y: 0,
    cores: { W: "#ffffff", P: "#e64980", Y: "#ffd43b" },
    mapa: [".........WW.........", "........PPPP........", ".......PYPPYP.......", "......PPPYYPPP......"] },
  { id: "gorro", tipo: "chapeu", nome: "Gorro", preco: 120, y: 0,
    cores: { W: "#ffffff", B: "#1c7ed6" },
    mapa: [".........WW.........", ".......BBBBBB.......", "......BBBBBBBB......", ".....BBBBBBBBBB.....", ".....WWWWWWWWWW....."] },
  { id: "cowboy", tipo: "chapeu", nome: "Chapéu de Cowboy", preco: 180, y: 0,
    cores: { N: "#8a5a2b", K: "#3b2412" },
    mapa: ["........NNNN........", ".......NNNNNN.......", ".......KKKKKK.......", "..NNNNNNNNNNNNNNNN..", "...NN..........NN..."] },
  { id: "cartola", tipo: "chapeu", nome: "Cartola", preco: 220, y: 0,
    cores: { K: "#1a1a1a", R: "#c92a2a" },
    mapa: ["......KKKKKKKK......", "......KKKKKKKK......", "......RRRRRRRR......", "....KKKKKKKKKKKK...."] },
  { id: "chef", tipo: "chapeu", nome: "Chapéu de Chef", preco: 250, y: 0,
    cores: { W: "#ffffff", G: "#ced4da" },
    mapa: ["......WW.WW.WW......", ".....WWWWWWWWWW.....", ".....WWWWWWWWWW.....", "......GWWWWWWG......", "......GGGGGGGG......"] },
  { id: "viking", tipo: "chapeu", nome: "Capacete Viking", preco: 320, y: 0,
    cores: { W: "#f1f3f5", G: "#868e96", Y: "#fab005" },
    mapa: [".W................W.", ".WW.....GGGG.....WW.", "..WW..GGGGGGGG..WW..", "...WWGGGGGGGGGGWW...", ".....YYYYYYYYYY....."] },
  { id: "aureola", tipo: "chapeu", nome: "Auréola", preco: 500, y: 0,
    cores: { Y: "#ffe066" },
    mapa: ["......YYYYYYYY......", ".....Y........Y.....", "......YYYYYYYY......"] },
  { id: "coroa", tipo: "chapeu", nome: "Coroa", preco: 800, y: 0,
    cores: { Y: "#ffd43b", R: "#e03131", O: "#c98a00" },
    mapa: [".......Y.YY.Y.......", ".......YYRRYY.......", ".......YYYYYY.......", "......OOOOOOOO......"] },
  { id: "folha", tipo: "chapeu", nome: "Folha", fase: 0, y: 0,
    cores: { G: "#40c057", g: "#2b8a3e", N: "#6b4220" },
    mapa: ["..........GG........", "........GGGgG.......", ".......GGgGGG.......", "........NGG........."] },
  { id: "explorador", tipo: "chapeu", nome: "Chapéu de Explorador", fase: 3, y: 0,
    cores: { C: "#d4c08a", N: "#6b4220", S: "#a08c5a" },
    mapa: [".......CCCCCC.......", "......CCCCCCCC......", "......NNNNNNNN......", "..SCCCCCCCCCCCCCCS.."] },
  { id: "turbante", tipo: "chapeu", nome: "Turbante", fase: 6, y: 0,
    cores: { W: "#f8f9fa", P: "#ced4da", R: "#e03131" },
    mapa: ["........WWWW........", "......WWPPWWWW......", ".....WWWWWRWWWW.....", ".....PPWWWWWWPP.....", "......WWWWWWWW......"] },
  { id: "farao", tipo: "chapeu", nome: "Coroa de Faraó", fase: 11, y: 0,
    cores: { Y: "#fab005", B: "#1c7ed6" },
    mapa: [
      "......YYYYYYYY......",
      ".....YBYBYBYBYB.....",
      "....YBYBYBYBYBYB....",
      "....YBYBYBYBYBYB....",
      "...YB..........BY...",
      "..YB............BY..",
      "..BY............YB..",
      "..YB............BY..",
      "..BY............YB.."
    ] },
  { id: "protetor", tipo: "chapeu", nome: "Protetor de Orelha", fase: 12, y: 3,
    cores: { R: "#c2255c", W: "#ffc9e3" },
    mapa: [
      "......RRRRRRRR......",
      "....RR........RR....",
      "...R............R...",
      ".WWWW..........WWWW.",
      "WWWWW..........WWWWW",
      "WWWWW..........WWWWW",
      ".WWWW..........WWWW."
    ] },
  { id: "ushanka", tipo: "chapeu", nome: "Chapéu de Pele", fase: 16, y: 0,
    cores: { N: "#6b4220", F: "#e9dcc9" },
    mapa: [
      "......NNNNNNNN......",
      ".....NNNNNNNNNN.....",
      "....FFFFFFFFFFFF....",
      "...FFFFFFFFFFFFFF...",
      "..FF............FF..",
      "..FF............FF..",
      "..FF............FF..",
      "...F............F..."
    ] },
  { id: "bombeiro", tipo: "chapeu", nome: "Capacete de Bombeiro", fase: 18, y: 0,
    cores: { R: "#e03131", Y: "#ffd43b" },
    mapa: [".......RRRRRR.......", "......RRRYYRRR......", ".....RRRRYYRRRR.....", "....RRRRRRRRRRRR....", ".RRRRRRRRRRRRRRRRRR."] },
  { id: "chifres", tipo: "chapeu", nome: "Chifres de Demônio", fase: 22, y: 1,
    cores: { R: "#c92a2a" },
    mapa: ["....R..........R....", "....RR........RR....", ".....RR......RR....."] },

  // ---------- Óculos ----------
  { id: "escuros", tipo: "oculos", nome: "Óculos Escuros", preco: 80, y: 8,
    cores: { K: "#111111", G: "#6c757d" },
    mapa: ["....KGKKKKKKGKKK....", "....KKKKK..KKKKK...."] },
  { id: "oculos3d", tipo: "oculos", nome: "Óculos 3D", preco: 100, y: 8,
    cores: { K: "#f1f3f5", R: "#e03131", C: "#22b8cf" },
    mapa: ["....KRRRKKKKCCCK....", "....KRRRK..KCCCK...."] },
  { id: "nerd", tipo: "oculos", nome: "Óculos de Nerd", preco: 120, y: 7,
    cores: { K: "#111111" },
    mapa: [".....KKKK..KKKK.....", ".....K..KKKK..K.....", ".....K..K..K..K.....", ".....KKKK..KKKK....."] },
  { id: "mascara", tipo: "oculos", nome: "Máscara", preco: 150, y: 8,
    cores: { K: "#5f3dc4" },
    mapa: ["...KKK..KKKK..KKK...", "....KK..KKKK..KK...."] },
  { id: "coracao", tipo: "oculos", nome: "Óculos de Coração", preco: 180, y: 7,
    cores: { H: "#f06595", K: "#a61e4d" },
    mapa: ["....HH.HH..HH.HH....", "....HHHHHKKHHHHH....", ".....HHH....HHH.....", "......H......H......"] },
  { id: "monoculo", tipo: "oculos", nome: "Monóculo", preco: 220, y: 7,
    cores: { Y: "#fab005" },
    mapa: ["...........YYYY.....", "...........Y..Y.....", "...........Y..Y.....", "...........YYYY.....", "..............Y.....", "...............Y...."] },
  { id: "cyber", tipo: "oculos", nome: "Visor Cyber", preco: 380, y: 8,
    cores: { G: "#495057", R: "#ff2b5e" },
    mapa: ["...GRRRRRRRRRRRRG...", "...GGGGGGGGGGGGGG..."] },
  { id: "pintura", tipo: "oculos", nome: "Pintura de Guerra", fase: 2, y: 10,
    cores: { R: "#e03131", W: "#ffffff" },
    mapa: ["....RRR......RRR....", ".....WW......WW....."] },
  { id: "aviador", tipo: "oculos", nome: "Óculos de Aviador", fase: 7, y: 7,
    cores: { N: "#6b4220", Y: "#fab005", C: "rgba(116,192,252,0.55)" },
    mapa: ["...NNNNNNNNNNNNNN...", "...NYCCYNNNNYCCYN...", "...NYCCYN..NYCCYN...", "....YYYY....YYYY...."] },
  { id: "esqui", tipo: "oculos", nome: "Óculos de Esqui", fase: 13, y: 8,
    cores: { B: "#212529", O: "rgba(255,146,43,0.75)", W: "#ffffff" },
    mapa: ["..BBOWOOOOOOWOOOBB..", "..BBOOOOOOOOOOOOBB.."] },
  { id: "solda", tipo: "oculos", nome: "Óculos de Solda", fase: 19, y: 7,
    cores: { K: "#111111", G: "#2b8a3e" },
    mapa: ["....KKKK....KKKK....", "...KGGGGKKKKGGGGK...", "...KGGGGK..KGGGGK...", "....KKKK....KKKK...."] },

  // ---------- Roupas ----------
  { id: "gravata", tipo: "roupa", nome: "Gravata", preco: 80, y: 13,
    cores: { W: "#ffffff", R: "#c92a2a" },
    mapa: [".......WW..WW.......", ".........RR.........", ".........RR.........", "........RRRR........", ".........RR........."] },
  { id: "camiseta", tipo: "roupa", nome: "Camiseta", preco: 100, y: 14,
    cores: { R: "#e03131", Y: "#ffd43b" },
    mapa: ["......RRRRRRRR......", ".....RRRRRRRRRR.....", "......RRRYYRRR......", "......RRRRRRRR......"] },
  { id: "cachecol", tipo: "roupa", nome: "Cachecol", preco: 120, y: 13,
    cores: { R: "#e03131", W: "#ffffff" },
    mapa: [".....RWRWRWRWRW.....", "............RW......", "............WR......", "............RW......"] },
  { id: "macacao", tipo: "roupa", nome: "Macacão", preco: 150, y: 14,
    cores: { U: "#1c7ed6", Y: "#ffd43b" },
    mapa: [".......U....U.......", ".......YUUUUY.......", "......UUUUUUUU......", "......UUUUUUUU......", "......UUUUUUUU......"] },
  { id: "colete", tipo: "roupa", nome: "Colete Salva-vidas", preco: 160, y: 14,
    cores: { O: "#fd7e14", W: "#ffffff" },
    mapa: ["......OO....OO......", ".....OOOO..OOOO.....", "......OWO..OWO......", "......OOO..OOO......"] },
  { id: "smoking", tipo: "roupa", nome: "Smoking", preco: 280, y: 13,
    cores: { K: "#1a1a1a", W: "#ffffff", R: "#c92a2a" },
    mapa: ["........RRRR........", "......KKWWWWKK......", ".....KKKWWWWKKK.....", "......KKKWWKKK......", "......KKKKKKKK......"] },
  { id: "capa", tipo: "roupa", nome: "Capa de Herói", preco: 400, y: 13,
    cores: { R: "#e03131", Y: "#ffd43b" },
    mapa: [".....RRRRRRRRRR.....", "..RRR...............", ".RRRR....YY.........", ".RR.................", "RRR.................", "RR.................."] },
  { id: "armadura", tipo: "roupa", nome: "Armadura", preco: 650, y: 13,
    cores: { G: "#868e96", S: "#dee2e6" },
    mapa: ["......GGGGGGGG......", ".....GSSSSSSSSG.....", "....GSSSGGGGSSSG....", "...GGSSSSSSSSSSGG...", "......SSSSSSSS......", "......GGGGGGGG......"] },
  { id: "colarFlores", tipo: "roupa", nome: "Colar de Flores", fase: 1, y: 13,
    cores: { R: "#e03131", Y: "#ffd43b", P: "#f783ac" },
    mapa: [".....RYPRYPRYPR.....", "......PRYPRYPR......", "........YPRY........"] },
  { id: "lenco", tipo: "roupa", nome: "Lenço de Bandido", fase: 8, y: 10,
    cores: { R: "#c92a2a", W: "#ffffff" },
    mapa: ["....RRRRRRRRRRRR....", "....RWRRRRRRWRRR....", ".....RRRRRRRRRR.....", ".......RRRRRR.......", ".........RR........."] },
  { id: "faixasMumia", tipo: "roupa", nome: "Faixas de Múmia", fase: 9, y: 13,
    cores: { W: "#e9e4d4", S: "#b8ae94" },
    mapa: ["......WSWWSWWS......", ".....SWWWSWWWS......", "....WWSWWWWSWWW.....", "...WSWWWSWWWWSWW....", "...SWWSWWWWSWWSW....", ".....WWWSWWWSWW....."] },
  { id: "jaqueta", tipo: "roupa", nome: "Jaqueta de Neve", fase: 14, y: 13,
    cores: { B: "#1c7ed6", W: "#ffffff", L: "#a5d8ff" },
    mapa: [".....WWWWWWWWWW.....", ".....BBBBBBBBBB.....", "....BBBBBLBBBBBB....", "...BBBBBBLBBBBBBB...", "...BBBBBBLBBBBBBB...", "...WW.BBBLBBBB.WW..."] },
  { id: "capaFogo", tipo: "roupa", nome: "Capa de Fogo", fase: 20, y: 13,
    cores: { O: "#ff6b00", Y: "#ffd43b" },
    mapa: [".....OOOOOOOOOO.....", "..OOO...............", ".YOOO...............", ".OYO................", "YOO.................", "OY.Y................", "Y.Y................."] }
];

const CAMADAS = ["roupa", "oculos", "chapeu"]; // ordem de desenho por cima do corpo

// Cosmético ganho em cada fase / nível
function premioDaFase(i) {
  return SKINS.concat(ITENS).find(function(c) { return c.fase === i; }) || null;
}

function premioDoNivel(n) {
  return SKINS.concat(ITENS).find(function(c) { return c.nivel === n; }) || null;
}


// =========================
// PODERES (temporários: você compra e usa um de cada vez)
// MELHORIAS (permanentes: mais caras)
// POWER-UPS: aparecem na fase de vez em quando e já ativam sozinhos (duram menos)
// =========================

const PODERES = [
  { id: "velocidade", nome: "Super Velocidade", desc: "+60% de velocidade por 10s", preco: 60,  duracao: 600, recarga: 1500 },
  { id: "puloDuplo",  nome: "Pulo Duplo",       desc: "Pula de novo no ar por 15s", preco: 80,  duracao: 900, recarga: 1800 },
  { id: "escudo",     nome: "Escudo",           desc: "Invencível por 8s",         preco: 100, duracao: 480, recarga: 1800 },
  { id: "ima",        nome: "Ímã de Moedas",    desc: "Puxa as moedas por 15s",    preco: 50,  duracao: 900, recarga: 1500 },
  { id: "nuke",       nome: "Nuke",             desc: "Explode os inimigos perto", preco: 150, duracao: 0,   recarga: 1800 }
];

const DURACAO_POWERUP = 0.5;   // power-up achado na fase dura metade do comprado

const MELHORIAS = [
  { id: "dash",      nome: "Dash",             desc: "Dispara pra frente e atravessa inimigos", preco: 600 },
  { id: "coracao1",  nome: "Coração Extra",    desc: "+1 coração de vida",                preco: 400 },
  { id: "coracao2",  nome: "Coração Extra II", desc: "+1 coração de vida",                preco: 800, requer: "coracao1" },
  { id: "revolver",  nome: "Revólver Turbo",   desc: "8 balas, tiro e recarga mais rápidos", preco: 500 },
  { id: "cipoLongo", nome: "Cipó Longo",       desc: "O laço de cipó alcança mais longe", preco: 450 },
  // prêmio do chefe secreto (não dá para comprar)
  { id: "nuvem",     nome: "Nuvem Mágica",     desc: "Uma vez por fase, se cair num buraco, a nuvem te salva sem perder vida", preco: 0, especial: "rei" }
];

const ABAS = [
  { tipo: "skin",     nome: "Skins" },
  { tipo: "chapeu",   nome: "Chapéus" },
  { tipo: "oculos",   nome: "Óculos" },
  { tipo: "roupa",    nome: "Roupas" },
  { tipo: "poder",    nome: "Poderes" },
  { tipo: "melhoria", nome: "Melhorias" }
];


// =========================
// CONTROLES (dá para trocar no menu "Controles")
// =========================

const ACOES = [
  { id: "esquerda",   nome: "Andar para a esquerda" },
  { id: "direita",    nome: "Andar para a direita" },
  { id: "pulo",       nome: "Pular" },
  { id: "baixo",      nome: "Deslizar / soltar do cipó" },
  { id: "tiro",       nome: "Revólver" },
  { id: "recarregar", nome: "Recarregar" },
  { id: "laco",       nome: "Cipó-laço" },
  { id: "dash",       nome: "Dash" },
  { id: "poder1",     nome: "Poder: Super Velocidade" },
  { id: "poder2",     nome: "Poder: Pulo Duplo" },
  { id: "poder3",     nome: "Poder: Escudo" },
  { id: "poder4",     nome: "Poder: Ímã de Moedas" },
  { id: "poder5",     nome: "Poder: Nuke" },
  { id: "loja",       nome: "Loja" },
  { id: "pausa",      nome: "Pausa" },
  { id: "som",        nome: "Ligar/desligar som" }
];

const TECLAS_PADRAO = {
  esquerda: ["a", "arrowleft"], direita: ["d", "arrowright"], pulo: ["w", "arrowup", " "],
  baixo: ["s", "arrowdown"], tiro: ["k"], recarregar: ["r"], laco: ["j"], dash: ["shift"],
  poder1: ["1"], poder2: ["2"], poder3: ["3"], poder4: ["4"], poder5: ["5"],
  loja: ["l"], pausa: ["p"], som: ["m"]
};

function nomeDaTecla(k) {
  const nomes = { " ": tr("Espaço"), arrowleft: "←", arrowright: "→", arrowup: "↑", arrowdown: "↓", shift: "Shift",
    control: "Ctrl", alt: "Alt", enter: "Enter", tab: "Tab", backspace: tr("Apagar"), capslock: "Caps" };
  if (!k) return "-";
  return nomes[k] || k.toUpperCase();
}

traduzirDados();   // idioma.js: nomes em inglês quando o jogo está em inglês
