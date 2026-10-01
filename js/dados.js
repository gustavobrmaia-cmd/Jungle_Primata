"use strict";

// =========================
// CONFIGURAÇÕES
// =========================

// Fundo da Selva (primeiro mundo). Sem internet o jogo desenha um fundo próprio.
const FUNDO_SELVA_URL = "https://static.vecteezy.com/ti/vetor-gratis/p1/48518715-8-mordeu-pixel-arte-selva-floresta-jogos-nivel-panorama-vetor.jpg";

// Sua imagem do macaco: vira a skin "Original" na loja (se não carregar, a skin some).
// As roupas são desenhadas para o macaco pixelado, então na sua imagem podem não encaixar perfeito.
const IMAGEM_PERSONAGEM = "file:///C:/Users/info19/Documents/Captura_de_tela_2026-08-20_150440-removebg-preview.png";

// Moeda: por padrão é pixelada feita no código. Para usar seu PNG: imagem: "moeda.png", frames: quadros
const MOEDA = { imagem: "", frames: 6, tamanho: 32 };


// =========================
// MUNDOS
// =========================

const MUNDOS = [
  { id: "selva",   nome: "Selva",          cor: "#2f9e44", chefe: "gorila",       nomeChefe: "Gorila Rei",
    terrestres: ["cobra", "sapo"], voadores: ["abelha"], atiradores: [] },
  { id: "deserto", nome: "Deserto",        cor: "#e8a33d", chefe: "escorpiaoRei", nomeChefe: "Escorpião Faraó",
    terrestres: ["escorpiao"], voadores: ["abutre"], atiradores: ["cacto"] },
  { id: "gelo",    nome: "Era do Gelo",    cor: "#4dabf7", chefe: "yeti",         nomeChefe: "Yeti Ancestral",
    terrestres: ["pinguim"], voadores: ["morcegoGelo"], atiradores: ["boneco"] },
  { id: "lava",    nome: "Vulcão de Lava", cor: "#e8590c", chefe: "dragao",       nomeChefe: "Dragão de Magma",
    terrestres: ["slime"], voadores: ["morcegoFogo"], atiradores: ["diabinho"] }
];

const FASES_POR_MUNDO = 4;   // 3 fases + o chefe
const TOTAL_FASES = MUNDOS.length * FASES_POR_MUNDO;
const RECOMPENSA_CHEFE = [150, 250, 350, 500];

function nomeFase(i) {
  const m = Math.floor(i / FASES_POR_MUNDO);
  const e = i % FASES_POR_MUNDO;
  if (e === FASES_POR_MUNDO - 1) return MUNDOS[m].nome + " - Chefe";
  return MUNDOS[m].nome + " " + (m + 1) + "-" + (e + 1);
}


// =========================
// INIMIGOS
// comp: como se mexe   hp: vida   espinhoso: não dá para pisar em cima
// =========================

const TIPOS_INIMIGO = {
  cobra:       { comp: "patrulha",    vel: 1.2, hp: 1 },
  sapo:        { comp: "pulador",     vel: 3,   hp: 1, pulo: -11 },
  abelha:      { comp: "voador",      vel: 1.6, hp: 1, voa: true, amplitude: 30 },
  escorpiao:   { comp: "patrulha",    vel: 1.7, hp: 2 },
  abutre:      { comp: "mergulhador", vel: 1.6, hp: 1, voa: true, amplitude: 20 },
  cacto:       { comp: "atirador",    hp: 2, espinhoso: true, tiro: "espinho", intervalo: 110 },
  pinguim:     { comp: "investida",   vel: 1,   hp: 1, velInvestida: 7 },
  morcegoGelo: { comp: "voador",      vel: 2.2, hp: 1, voa: true, amplitude: 50 },
  boneco:      { comp: "atirador",    hp: 2, tiro: "neve", intervalo: 120 },
  slime:       { comp: "pulador",     vel: 3.5, hp: 2, pulo: -13, espinhoso: true },
  morcegoFogo: { comp: "voador",      vel: 3,   hp: 1, voa: true, amplitude: 60 },
  diabinho:    { comp: "atirador",    hp: 2, tiro: "fogo", intervalo: 95 }
};


// =========================
// SKINS E ROUPAS (desenhadas numa grade 20x20)
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
  { id: "fogo", nome: "Fogo", preco: 350,
    cores: { F: "#d9480f", D: "#5c1a03", P: "#ffd8a8", B: "#ffa94d" } },
  { id: "zumbi", nome: "Zumbi", preco: 400,
    cores: { F: "#5c8a3a", D: "#1f3312", P: "#b5d99c", B: "#8fbf6a", E: "#c92a2a", W: "#f8f9c8", M: "#3a1010" } },
  { id: "panda", nome: "Panda", preco: 450,
    cores: { F: "#f8f9fa", D: "#111111", P: "#ffffff", B: "#dee2e6" } },
  { id: "robo", nome: "Robô", preco: 600,
    cores: { F: "#868e96", D: "#212529", P: "#ced4da", B: "#adb5bd", E: "#22b8cf", W: "#0b7285", M: "#343a40" } },
  { id: "fantasma", nome: "Fantasma", preco: 750,
    cores: { F: "rgba(255,255,255,0.6)", D: "rgba(190,210,255,0.8)", P: "rgba(255,255,255,0.8)", B: "rgba(230,240,255,0.6)", E: "#1c1c3c" } },
  { id: "diamante", nome: "Diamante", preco: 900,
    cores: { F: "#3bc9db", D: "#0b7285", P: "#e3fafc", B: "#99e9f2", E: "#1864ab" } },
  { id: "galaxia", nome: "Galáxia", preco: 1200,
    cores: { F: "#2b1d5c", D: "#0b0620", P: "#c0a9ff", B: "#4c2a9e", E: "#ffffff", W: "#ff9cf3", M: "#ff6bd6" } }
];

if (IMAGEM_PERSONAGEM) {
  SKINS.unshift({ id: "original", nome: "Original", preco: 0, imagem: true });
}

// y = linha da grade onde o desenho começa
const ITENS = [
  // ---------- Chapéus ----------
  { id: "bone", tipo: "chapeu", nome: "Boné", preco: 80, y: 2,
    cores: { R: "#d62828", W: "#ffffff", K: "#7a1010" },
    mapa: [
      "......RRRRRRR.......",
      ".....RRRWRRRRR......",
      ".....KRRRRRRRRRRRR.."
    ] },
  { id: "festa", tipo: "chapeu", nome: "Chapéu de Festa", preco: 100, y: 0,
    cores: { W: "#ffffff", P: "#e64980", Y: "#ffd43b" },
    mapa: [
      ".........WW.........",
      "........PPPP........",
      ".......PYPPYP.......",
      "......PPPYYPPP......"
    ] },
  { id: "gorro", tipo: "chapeu", nome: "Gorro", preco: 120, y: 0,
    cores: { W: "#ffffff", B: "#1c7ed6" },
    mapa: [
      ".........WW.........",
      ".......BBBBBB.......",
      "......BBBBBBBB......",
      ".....BBBBBBBBBB.....",
      ".....WWWWWWWWWW....."
    ] },
  { id: "cowboy", tipo: "chapeu", nome: "Chapéu de Cowboy", preco: 180, y: 0,
    cores: { N: "#8a5a2b", K: "#3b2412" },
    mapa: [
      "........NNNN........",
      ".......NNNNNN.......",
      ".......KKKKKK.......",
      "..NNNNNNNNNNNNNNNN..",
      "...NN..........NN..."
    ] },
  { id: "cartola", tipo: "chapeu", nome: "Cartola", preco: 220, y: 0,
    cores: { K: "#1a1a1a", R: "#c92a2a" },
    mapa: [
      "......KKKKKKKK......",
      "......KKKKKKKK......",
      "......RRRRRRRR......",
      "....KKKKKKKKKKKK...."
    ] },
  { id: "chef", tipo: "chapeu", nome: "Chapéu de Chef", preco: 250, y: 0,
    cores: { W: "#ffffff", G: "#ced4da" },
    mapa: [
      "......WW.WW.WW......",
      ".....WWWWWWWWWW.....",
      ".....WWWWWWWWWW.....",
      "......GWWWWWWG......",
      "......GGGGGGGG......"
    ] },
  { id: "viking", tipo: "chapeu", nome: "Capacete Viking", preco: 320, y: 0,
    cores: { W: "#f1f3f5", G: "#868e96", Y: "#fab005" },
    mapa: [
      ".W................W.",
      ".WW.....GGGG.....WW.",
      "..WW..GGGGGGGG..WW..",
      "...WWGGGGGGGGGGWW...",
      ".....YYYYYYYYYY....."
    ] },
  { id: "aureola", tipo: "chapeu", nome: "Auréola", preco: 500, y: 0,
    cores: { Y: "#ffe066" },
    mapa: [
      "......YYYYYYYY......",
      ".....Y........Y.....",
      "......YYYYYYYY......"
    ] },
  { id: "coroa", tipo: "chapeu", nome: "Coroa", preco: 800, y: 0,
    cores: { Y: "#ffd43b", R: "#e03131", O: "#c98a00" },
    mapa: [
      ".......Y.YY.Y.......",
      ".......YYRRYY.......",
      ".......YYYYYY.......",
      "......OOOOOOOO......"
    ] },

  // ---------- Óculos ----------
  { id: "escuros", tipo: "oculos", nome: "Óculos Escuros", preco: 80, y: 8,
    cores: { K: "#111111", G: "#6c757d" },
    mapa: [
      "....KGKKKKKKGKKK....",
      "....KKKKK..KKKKK...."
    ] },
  { id: "oculos3d", tipo: "oculos", nome: "Óculos 3D", preco: 100, y: 8,
    cores: { K: "#f1f3f5", R: "#e03131", C: "#22b8cf" },
    mapa: [
      "....KRRRKKKKCCCK....",
      "....KRRRK..KCCCK...."
    ] },
  { id: "nerd", tipo: "oculos", nome: "Óculos de Nerd", preco: 120, y: 7,
    cores: { K: "#111111" },
    mapa: [
      ".....KKKK..KKKK.....",
      ".....K..KKKK..K.....",
      ".....K..K..K..K.....",
      ".....KKKK..KKKK....."
    ] },
  { id: "mascara", tipo: "oculos", nome: "Máscara", preco: 150, y: 8,
    cores: { K: "#5f3dc4" },
    mapa: [
      "...KKK..KKKK..KKK...",
      "....KK..KKKK..KK...."
    ] },
  { id: "coracao", tipo: "oculos", nome: "Óculos de Coração", preco: 180, y: 7,
    cores: { H: "#f06595", K: "#a61e4d" },
    mapa: [
      "....HH.HH..HH.HH....",
      "....HHHHHKKHHHHH....",
      ".....HHH....HHH.....",
      "......H......H......"
    ] },
  { id: "monoculo", tipo: "oculos", nome: "Monóculo", preco: 220, y: 7,
    cores: { Y: "#fab005" },
    mapa: [
      "...........YYYY.....",
      "...........Y..Y.....",
      "...........Y..Y.....",
      "...........YYYY.....",
      "..............Y.....",
      "...............Y...."
    ] },
  { id: "cyber", tipo: "oculos", nome: "Visor Cyber", preco: 380, y: 8,
    cores: { G: "#495057", R: "#ff2b5e" },
    mapa: [
      "...GRRRRRRRRRRRRG...",
      "...GGGGGGGGGGGGGG..."
    ] },

  // ---------- Roupas ----------
  { id: "gravata", tipo: "roupa", nome: "Gravata", preco: 80, y: 13,
    cores: { W: "#ffffff", R: "#c92a2a" },
    mapa: [
      ".......WW..WW.......",
      ".........RR.........",
      ".........RR.........",
      "........RRRR........",
      ".........RR........."
    ] },
  { id: "camiseta", tipo: "roupa", nome: "Camiseta", preco: 100, y: 14,
    cores: { R: "#e03131", Y: "#ffd43b" },
    mapa: [
      "......RRRRRRRR......",
      ".....RRRRRRRRRR.....",
      "......RRRYYRRR......",
      "......RRRRRRRR......"
    ] },
  { id: "cachecol", tipo: "roupa", nome: "Cachecol", preco: 120, y: 13,
    cores: { R: "#e03131", W: "#ffffff" },
    mapa: [
      ".....RWRWRWRWRW.....",
      "............RW......",
      "............WR......",
      "............RW......"
    ] },
  { id: "macacao", tipo: "roupa", nome: "Macacão", preco: 150, y: 14,
    cores: { U: "#1c7ed6", Y: "#ffd43b" },
    mapa: [
      ".......U....U.......",
      ".......YUUUUY.......",
      "......UUUUUUUU......",
      "......UUUUUUUU......",
      "......UUUUUUUU......"
    ] },
  { id: "colete", tipo: "roupa", nome: "Colete Salva-vidas", preco: 160, y: 14,
    cores: { O: "#fd7e14", W: "#ffffff" },
    mapa: [
      "......OO....OO......",
      ".....OOOO..OOOO.....",
      "......OWO..OWO......",
      "......OOO..OOO......"
    ] },
  { id: "smoking", tipo: "roupa", nome: "Smoking", preco: 280, y: 13,
    cores: { K: "#1a1a1a", W: "#ffffff", R: "#c92a2a" },
    mapa: [
      "........RRRR........",
      "......KKWWWWKK......",
      ".....KKKWWWWKKK.....",
      "......KKKWWKKK......",
      "......KKKKKKKK......"
    ] },
  { id: "capa", tipo: "roupa", nome: "Capa de Herói", preco: 400, y: 13,
    cores: { R: "#e03131", Y: "#ffd43b" },
    mapa: [
      ".....RRRRRRRRRR.....",
      "..RRR...............",
      ".RRRR....YY.........",
      ".RR.................",
      "RRR.................",
      "RR.................."
    ] },
  { id: "armadura", tipo: "roupa", nome: "Armadura", preco: 650, y: 13,
    cores: { G: "#868e96", S: "#dee2e6" },
    mapa: [
      "......GGGGGGGG......",
      ".....GSSSSSSSSG.....",
      "....GSSSGGGGSSSG....",
      "...GGSSSSSSSSSSGG...",
      "......SSSSSSSS......",
      "......GGGGGGGG......"
    ] }
];

const CAMADAS = ["roupa", "oculos", "chapeu"]; // ordem de desenho por cima do corpo


// =========================
// PODERES (temporários: você compra e usa um de cada vez)
// MELHORIAS (permanentes: mais caras)
// =========================

const PODERES = [
  { id: "velocidade", tecla: "1", nome: "Super Velocidade", desc: "+60% de velocidade por 10s", preco: 60,  duracao: 600, recarga: 1500 },
  { id: "puloDuplo",  tecla: "2", nome: "Pulo Duplo",       desc: "Pula de novo no ar por 15s", preco: 80,  duracao: 900, recarga: 1800 },
  { id: "escudo",     tecla: "3", nome: "Escudo",           desc: "Invencível por 8s",         preco: 100, duracao: 480, recarga: 1800 },
  { id: "ima",        tecla: "4", nome: "Ímã de Moedas",    desc: "Puxa as moedas por 15s",    preco: 50,  duracao: 900, recarga: 1500 },
  { id: "nuke",       tecla: "5", nome: "Nuke",             desc: "Explode os inimigos perto", preco: 150, duracao: 0,   recarga: 1800 }
];

const MELHORIAS = [
  { id: "dash",      nome: "Dash",             desc: "Shift: dispara pra frente e atravessa inimigos", preco: 600 },
  { id: "coracao1",  nome: "Coração Extra",    desc: "+1 coração de vida",                preco: 400 },
  { id: "coracao2",  nome: "Coração Extra II", desc: "+1 coração de vida",                preco: 800, requer: "coracao1" },
  { id: "revolver",  nome: "Revólver Turbo",   desc: "8 balas, tiro e recarga mais rápidos", preco: 500 },
  { id: "cipoLongo", nome: "Cipó Longo",       desc: "O laço de cipó alcança mais longe", preco: 450 }
];

const ABAS = [
  { tipo: "skin",     nome: "Skins" },
  { tipo: "chapeu",   nome: "Chapéus" },
  { tipo: "oculos",   nome: "Óculos" },
  { tipo: "roupa",    nome: "Roupas" },
  { tipo: "poder",    nome: "Poderes" },
  { tipo: "melhoria", nome: "Melhorias" }
];
