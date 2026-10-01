"use strict";

// =========================
// ARTE EM PIXEL (tudo é desenhado uma vez só em canvas escondidos)
// =========================

// ---------- MACACO (grade 20x20, cada pixel vira 4x4 = 80x80) ----------
// D contorno, F pelo, S pelo na sombra, L pelo com luz, P pele, R bochecha, B barriga, W/E olho, M boca

const CORPO = [
  "....................",
  "....................",
  "....................",
  ".......DDDDDD.......",
  ".....DDLLFFFFDD.....",
  "....DFLLFFFFFFSD....",
  ".DD.DFLFFFFFFFSD.DD.",
  "DPPDFFPPPPPPPPFSDPPD",
  "DPPDFPWEPPPPWEPFDPPD",
  ".DDDFPWEPPPPWEPSDDD.",
  "...DFPRPPPPPPRPSD...",
  "....DFPPMMMMPPSD....",
  ".....DFPPPPPPSD.....",
  "......DDDDDDDD......",
  ".....DFFBBBBFSD.....",
  "....DFFBBBBBBFSD..D.",
  "...DPDFBBBBBBSDPD..D",
  "...DPDFFBBBBFSDPD..D",
  ".....DFFFFFFSSDDDDD.",
  ".....DPPD..DPPD....."
];

// Cada pose troca algumas linhas do corpo
const BRACOS_CIMA = {
  11: "..P.DFPPMMMMPPSD.P..",
  12: "..D..DFPPPPPPSD..D..",
  13: "..DD..DDDDDDDD..DD..",
  14: "...DDDFFBBBBFSDDD...",
  15: "....DFFBBBBBBFSD..D.",
  16: "....DFBBBBBBBBSD...D",
  17: ".....DFFBBBBFSD....D"
};

const POSES = {
  parado: {},
  piscar: { 8: "DPPDFPPPPPPPPPPFDPPD", 9: ".DDDFPDDPPPPDDPSDDD." },
  andar1: { 19: "....DPPD....DPPD...." },
  andar2: { 19: "......DPPDDPPD......" },
  pulo: {
    13: "..PD..DDDDDDDD..DP..",
    14: "...DDDFFBBBBFSDDD...",
    15: "....DFFBBBBBBFSD..D.",
    16: "....DFBBBBBBBBSD...D",
    17: ".....DFFBBBBFSD....D",
    18: "....DPPFFFFFSPPDDDD.",
    19: "...................."
  },
  queda: BRACOS_CIMA,
  vitoria: Object.assign({}, BRACOS_CIMA, { 11: "..P.DFPMMMMMMPSD.P.." }),
  pendurado: {
    1: "...PP..........PP...",
    2: "...DF..........FD...",
    3: "...DF..DDDDDD..FD...",
    4: "...DFDDLLFFFFDDFD...",
    5: "...DFFFFFFFFFFFSD...",
    6: "..DDFFFFFFFFFFFSDD..",
    7: "..DDFFPPPPPPPPFSDD..",
    8: "...DFPWEPPPPWEPFD...",
    9: "...DFPWEPPPPWEPSD...",
    15: ".....DFBBBBBBSD...D.",
    16: ".....DFBBBBBBSD....D",
    17: ".....DFFBBBBFSD....D"
  },
  chute: {
    16: "...DPDFBBBBBBSDPD...",
    17: "...DPDFFBBBBFSDDDDD.",
    18: ".....DFFFFFFSSFFFPPD",
    19: ".....DPPD..........."
  },
  tiro: {
    15: "....DFFBBBBBBFSDDDD.",
    16: "...DPDFBBBBBBSFFFPPD",
    17: "...DPDFFBBBBFSDDDD.."
  }
};

const MAPAS_POSE = {};
Object.keys(POSES).forEach(function(nome) {
  const m = CORPO.slice();
  const mod = POSES[nome];
  Object.keys(mod).forEach(function(k) { m[+k] = mod[k]; });
  MAPAS_POSE[nome] = m;
});

const imgPersonagem = new Image();
let personagemOk = false;

// Cores da skin, com sombra/luz do pelo calculadas sozinhas
function paletaSkin(skin, corPelo) {
  const p = Object.assign({}, CORES_BASE, skin.cores);
  if (corPelo) p.F = corPelo;
  p.S = !corPelo && skin.cores.S ? skin.cores.S : escurecer(p.F, 0.25);
  p.L = !corPelo && skin.cores.L ? skin.cores.L : clarear(p.F, 0.22);
  if (!p.R) p.R = "rgba(255,105,120,0.4)";
  return p;
}

function desenharPrimata(g, equip, escala, pose) {
  const tam = 20 * escala;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, tam, tam);

  const skin = buscarItem("skin", equip.skin) || SKINS[0];

  if (skin.imagem && personagemOk) {
    // Sua imagem, encaixada no quadrado sem esticar
    const s = Math.min(tam / imgPersonagem.naturalWidth, tam / imgPersonagem.naturalHeight);
    const w = imgPersonagem.naturalWidth * s;
    const h = imgPersonagem.naturalHeight * s;
    g.drawImage(imgPersonagem, (tam - w) / 2, tam - h, w, h);
  } else {
    const base = skin.imagem ? buscarItem("skin", "classico") : skin;
    const mapa = MAPAS_POSE[pose || "parado"];
    if (base.faixas) {
      for (let y = 0; y < mapa.length; y++) {
        pintarMapa(g, [mapa[y]], paletaSkin(base, base.faixas[y % base.faixas.length]), escala, 0, y);
      }
    } else {
      pintarMapa(g, mapa, paletaSkin(base), escala);
    }
    if (base.detalhe) pintarMapa(g, base.detalhe.mapa, base.detalhe.cores, escala, 0, base.detalhe.y);
  }

  CAMADAS.forEach(function(tipo) {
    const item = equip[tipo] && buscarItem(tipo, equip[tipo]);
    if (item) pintarMapa(g, item.mapa, item.cores, escala, 0, item.y);
  });
}

const SPRITES_PRIMATA = {};

function montarSprites() {
  Object.keys(POSES).forEach(function(pose) {
    const c = criarCanvas(80, 80);
    desenharPrimata(c.getContext("2d"), save.equip, 4, pose);
    SPRITES_PRIMATA[pose] = { d: c, e: espelhar(c) };
  });
}

const SPR_REVOLVER = spriteDuplo([
  "..GGGGGGG",
  ".GKKKKKKK",
  "GKKKGG...",
  "NNK......",
  "NN......."
], { G: "#adb5bd", K: "#495057", N: "#8a5a2b" }, 3);


// ---------- TERRENO DE CADA MUNDO (tiles de 8x8 pixels, escala 4 = 32x32) ----------

const MAPA_TIJOLO = [
  "LLLLLLLD",
  "LMMMMMMD",
  "LMMMMMMD",
  "DDDDDDDD",
  "LLLDLLLL",
  "MMMDLMMM",
  "MMMDLMMM",
  "DDDDDDDD"
];

const MAPA_TABUA = [
  "LLLLLLLL",
  "MMMMMMMM",
  "MMDMMMDM",
  "DDDDDDDD"
];

const MAPA_ESPINHO = [
  "...LD...",
  "...LD...",
  "..LMMD..",
  "..LMMD..",
  ".LMMMMD.",
  "LMMMMMMD"
];

function tile(mapa, paleta) { return spriteDeMapa(mapa, paleta, 4); }

const TEMAS = [
  { // Selva
    topo: tile(["GGGGGGGG", "gggggggg", "TggTTgTT", "TTTTTTTT", "TTdTTTTT", "TTTTTTdT", "TTTTddTT", "TdTTTTTT"],
      { G: "#6fcf3a", g: "#4caf2f", T: "#8a5a2b", d: "#6b4220" }),
    terra: tile(["TTTTTTTT", "TTdTTTTT", "TTTTTTdT", "TTTTTTTT", "TdTTTTTT", "TTTTdTTT", "TTTTTTTT", "TTTdTTTT"],
      { T: "#8a5a2b", d: "#6b4220" }),
    bloco: tile(MAPA_TIJOLO, { L: "#a3ad96", M: "#7b8471", D: "#4a5244" }),
    plat: tile(MAPA_TABUA, { L: "#b07a3e", M: "#8a5a2b", D: "#5c3a1a" }),
    espinho: tile(MAPA_ESPINHO, { L: "#c0eb75", M: "#5c940d", D: "#2b5016" })
  },
  { // Deserto
    topo: tile(["LLLLLLLL", "SSSSSSSS", "SsSSSSsS", "SSSSSSSS", "SSsSSSSS", "SSSSSsSS", "SSSSSSSS", "sSSSSSSS"],
      { L: "#ffe8a3", S: "#f2c66d", s: "#d9a648" }),
    terra: tile(["SSSSSSSS", "SSSsSSSS", "ssssssss", "SSSSSSSS", "SSSSSSsS", "SsSSSSSS", "ssssssss", "SSSSSSSS"],
      { S: "#d9a648", s: "#b8862f" }),
    bloco: tile(MAPA_TIJOLO, { L: "#f2c66d", M: "#d9a648", D: "#8a6420" }),
    plat: tile(MAPA_TABUA, { L: "#c99a5b", M: "#a0703a", D: "#6b4220" }),
    espinho: tile(MAPA_ESPINHO, { L: "#8ce99a", M: "#2f9e44", D: "#1b5e20" })
  },
  { // Era do Gelo
    topo: tile(["WWWWWWWW", "WWWWWWWW", "SWWWSWWW", "IIIIIIII", "IIiIIIII", "IIIIIIiI", "IIIIIIII", "IiIIIIII"],
      { W: "#f8f9fa", S: "#dee2e6", I: "#74c0fc", i: "#4dabf7" }),
    terra: tile(["IIIIIIII", "IhIIIIII", "IIIIIiII", "IIIIIIII", "IIIhIIII", "iIIIIIII", "IIIIIIhI", "IIIIIIII"],
      { I: "#74c0fc", i: "#4dabf7", h: "#d0ebff" }),
    topoGelo: tile(["hhhhhhhh", "HHHHHHHH", "HhHHHHhH", "IIIIIIII", "IIiIIIII", "IIIIIIiI", "IIIIIIII", "IiIIIIII"],
      { h: "#e7f5ff", H: "#a5d8ff", I: "#74c0fc", i: "#4dabf7" }),
    bloco: tile(MAPA_TIJOLO, { L: "#e7f5ff", M: "#a5d8ff", D: "#4dabf7" }),
    plat: tile(MAPA_TABUA, { L: "#ffffff", M: "#dee2e6", D: "#adb5bd" }),
    espinho: tile(MAPA_ESPINHO, { L: "#e7f5ff", M: "#74c0fc", D: "#1c7ed6" })
  },
  { // Lava
    topo: tile(["KKKKKKKK", "BBBBBBBB", "BoBBBBBB", "BBBBBoBB", "BBBBBBBB", "BBoBBBBB", "BBBBBBBB", "BBBBBBoB"],
      { K: "#5c5f66", B: "#343a40", o: "#ff6b00" }),
    terra: tile(["BBBBBBBB", "BBBoBBBB", "BBBBBBBB", "BbBBBBBB", "BBBBBBoB", "BBBBBBBB", "BBoBBBbB", "BBBBBBBB"],
      { B: "#2b2f33", b: "#1a1d20", o: "#e8590c" }),
    bloco: tile(MAPA_TIJOLO, { L: "#5c4b6b", M: "#3b2f4a", D: "#1a1424" }),
    plat: tile(MAPA_TABUA, { L: "#868e96", M: "#495057", D: "#212529" }),
    espinho: tile(MAPA_ESPINHO, { L: "#ced4da", M: "#495057", D: "#212529" })
  }
];


// ---------- INIMIGOS (todos olhando para a direita) ----------

const SPR_INIMIGO = {};

function registrarInimigo(tipo, mapa, paleta, escala) {
  const s = spriteDuplo(mapa, paleta, escala);
  SPR_INIMIGO[tipo] = s;
  TIPOS_INIMIGO[tipo].w = s.w;
  TIPOS_INIMIGO[tipo].h = s.h;
}

registrarInimigo("cobra", [
  "...........KKK..",
  "..........KGGGK.",
  "..........KGWEK.",
  "..........KGGGGR",
  "...........KGGK.",
  "...KKKK....KGK..",
  "..KGGGGK..KGGK..",
  ".KGLLLLGKKGGK...",
  "KGLK..KLGGGK....",
  "KGGK...KKKK.....",
  ".KGGKKKKGGK.....",
  "..KKGGGGKK......"
], { K: "#1b4d1b", G: "#40c057", L: "#b2f2bb", W: "#ffffff", E: "#111111", R: "#e03131" }, 3);

registrarInimigo("sapo", [
  "..KKK.....KKK...",
  ".KWEGK...KWEGK..",
  ".KGGGKKKKKGGGK..",
  "KGGGGGGGGGGGGGK.",
  "KGGKKKKKKKKKGGK.",
  "KGGGGGGGGGGGGGGK",
  ".KGLLLLLLLLLLGK.",
  "KGGKLLLLLLLLKGGK",
  "KGGK.KKKKKK.KGGK",
  ".KK..........KK."
], { K: "#1b4d1b", G: "#37b24d", L: "#d8f5a2", W: "#ffffff", E: "#111111" }, 3);

registrarInimigo("abelha", [
  "....WW.WW.....",
  "...WCCWCCW....",
  "....WWWWW.....",
  "...KKKKKKKK...",
  "..KYYKKYYKYK..",
  ".KYYKKYYKYYWEK",
  "KKYYKKYYKYYYYK",
  ".KYYKKYYKYYYK.",
  "..KKKKKKKKKK..",
  "....K..K.K...."
], { K: "#1a1a1a", Y: "#fcc419", W: "#ffffff", C: "#d0ebff", E: "#111111" }, 3);

registrarInimigo("escorpiao", [
  "......KKKK........",
  ".....KOOOOK.......",
  "....KOK..KOK......",
  "....KOK...KRK.....",
  "....KOK....K......",
  "....KOK...........",
  "....KOOKKKKKKKK...",
  "...KOOOOOOOOOOOK..",
  "..KOLLOLLOLLOOWEK.",
  "..KOOOOOOOOOOOOOKK",
  "...KKOKKOKKOKKKOOK",
  "....K..K..K..K..KK"
], { K: "#3d1f00", O: "#c77d2a", L: "#e0a458", R: "#8a1c1c", W: "#ffffff", E: "#111111" }, 3);

registrarInimigo("abutre", [
  "..................",
  "...........KKK....",
  "..........KPPPK...",
  "..........KPWEKYY.",
  "KKKK......KPPPKY..",
  "KLLLKK...KCCCK....",
  ".KLLLLKKKNNNNNKKKK",
  "..KLLLLLNNNNNNLLLK",
  "...KKLLLNNNNNLLKK.",
  ".....KKKNNNNNKK...",
  ".......KKKNNKK....",
  "........Y...Y....."
], { K: "#1a1a1a", N: "#4a3728", L: "#6b5240", P: "#e599a8", Y: "#f2c94c", W: "#ffffff", E: "#111111", C: "#e9ecef" }, 3);

registrarInimigo("cacto", [
  "....KPPK....",
  "...KGGGGK...",
  "...KGLGGK...",
  "...KWEWEK...",
  "...KGMMGK...",
  ".K.KGLGGK.K.",
  "KGKKGLGGKKGK",
  "KGGGGLGGGGGK",
  "KLKKGLGGKKLK",
  ".K.KGLGGK.K.",
  "...KGLGGK...",
  "...KGLGGK...",
  "...KGLGGK...",
  "..KNNNNNNK..",
  "..KNNNNNNK..",
  "...KKKKKK..."
], { K: "#1b4d1b", G: "#2f9e44", L: "#69db7c", P: "#f783ac", W: "#ffffff", E: "#111111", M: "#5c1010", N: "#a0703a" }, 3);

registrarInimigo("pinguim", [
  "...KKKKK....",
  "..KBBBBBK...",
  ".KBBBBWEBK..",
  ".KBBWWWWBYY.",
  ".KBWWWWWWBK.",
  "KBBWWWWWWBBK",
  "KBWWWWWWWWBK",
  "KBWWWWWWWWBK",
  "KBWWWWWWWWBK",
  ".KBWWWWWWBK.",
  ".KBBWWWWBBK.",
  "..KKKKKKKK..",
  "..YYY..YYY.."
], { K: "#111111", B: "#1e2a44", W: "#ffffff", Y: "#ff922b", E: "#111111" }, 4);

const MAPA_MORCEGO = [
  "K......KK......K",
  "KK....KBBK....KK",
  "KLK..KBEEBK..KLK",
  "KLLKKBBBBBBKKLLK",
  "KLLLLKBBBBKLLLLK",
  ".KLLLKKBBKKLLLK.",
  "..KKK..KK..KKK.."
];
registrarInimigo("morcegoGelo", MAPA_MORCEGO, { K: "#1c3d5a", B: "#a5d8ff", L: "#74c0fc", E: "#ffffff" }, 3);
registrarInimigo("morcegoFogo", MAPA_MORCEGO, { K: "#4a1500", B: "#e8590c", L: "#ff922b", E: "#ffe066" }, 3);

registrarInimigo("boneco", [
  "....KKKKKK....",
  "....KKKKKK....",
  "...KKKKKKKK...",
  "....SWWWWS....",
  "...SWKWWKWS...",
  "...SWWWOOOO...",
  "...SWKKKWWS...",
  "....RRRRRRR...",
  "N...SWWWWS...N",
  ".N.SWWKWWWS.N.",
  "..NSWWWWWWWSN.",
  "...SWWKWWWWS..",
  "...SWWWWWWWS..",
  "..SWWWWWWWWWS.",
  ".SWWWWKWWWWWWS",
  ".SWWWWWWWWWWWS",
  ".SWWWWWWWWWWWS",
  ".SWWWWWWWWWWWS",
  "..SWWWWWWWWWS.",
  "...SSSSSSSSS.."
], { K: "#111111", W: "#ffffff", S: "#ced4da", O: "#ff922b", R: "#e03131", N: "#6b4220" }, 3);

registrarInimigo("slime", [
  ".....KKKK.....",
  "...KKOOOOKK...",
  "..KOOYYOOOOK..",
  ".KOOYOOOOOOOK.",
  ".KOOOWEOOWEOK.",
  "KRROOOOOOOOORK",
  "KRRROOKKOOORRK",
  "KRRRRROORRRRRK",
  "KRRRRRRRRRRRRK",
  ".KKKKKKKKKKKK."
], { K: "#2b0a0a", R: "#e8590c", O: "#ff922b", Y: "#ffe066", W: "#ffffff", E: "#111111" }, 4);

registrarInimigo("diabinho", [
  ".H......H...",
  ".HK....KH...",
  "..KRRRRK....",
  ".KRRRRRRK...",
  ".KRYERYERK..",
  ".KRRRRRRK...",
  ".KRRWWWRK...",
  "..KKRRRK....",
  ".KRRRRRRRK.N",
  "KRDRRRRRDRKN",
  "KK.KRRRRK.NN",
  "...KRRRRK..N",
  "...KRK.KRK.N",
  "...KKK.KKK.."
], { K: "#2b0a0a", R: "#e03131", D: "#a51111", Y: "#ffe066", E: "#111111", W: "#ffffff", H: "#f1f3f5", N: "#495057" }, 4);


registrarInimigo("macacoLadrao", [
  "....KKKKKK....",
  "...KGGGGGGK...",
  ".KKGGGGGGGGKK.",
  "KPKKKKKKKKKKPK",
  "KPKKWEKKWEKKPK",
  ".KKPPPPPPPPKK.",
  "...KPPMMPPK...",
  "....KKKKKK....",
  "...KGGGGGGK.NN",
  "..KGGPPPPGGKNN",
  "..KGGPPPPGGK..",
  "...KGGGGGGK...",
  "...KGK..KGK...",
  "...KKK..KKK..."
], { K: "#2b1d14", G: "#6b5a4e", P: "#d9b99b", W: "#ffffff", E: "#111111", M: "#5c1010", N: "#5c3a1a" }, 3);

registrarInimigo("aranha", [
  "..K..KKKK..K..",
  ".K..KKKKKK..K.",
  "K..KKRKKRKK..K",
  "K.KKKKKKKKKK.K",
  ".KKKKKKKKKKKK.",
  "K.KKKKKKKKKK.K",
  "K..KKVKKVKK..K",
  ".K..KKKKKK..K.",
  "..K..KKKK..K..",
  ".K....KK....K."
], { K: "#1a1a1a", R: "#e03131", V: "#7048e8" }, 3);

registrarInimigo("mumia", [
  "...SWWWWS...",
  "..SWWSWWWS..",
  "..WKEWWKEW..",
  "..SWWWWWWS..",
  "..WWSSWWWW..",
  "...SWWWWS...",
  "..SWWWWWS...",
  ".SWWSWWWWWWW",
  ".SWWWWWSWWWS",
  ".SWWWSWWW...",
  ".SWWWWWWS...",
  "..WWSWWWS...",
  "..SWWWWWW...",
  "..WW.SWW....",
  "..SW..WS....",
  "..WW..WW....",
  ".SWW..WWS..."
], { W: "#e9e4d4", S: "#b8ae94", K: "#2b2620", E: "#ffd43b" }, 3);

registrarInimigo("tatu", [
  "....KKKKKK......",
  "...KAAABAAK.....",
  "..KAAABAAABK....",
  ".KAAABAAABAAK...",
  ".KAABAAABAAABKK.",
  "KAAABAAABAAABPEK",
  "KAAABAAABAAABPPN",
  ".KKKKKKKKKKKKKK.",
  "..KP..KP..KP.KP.",
  "................"
], { K: "#3b2a1a", A: "#a68a64", B: "#7a6040", P: "#d9b99b", E: "#111111", N: "#5c3a1a" }, 3);

registrarInimigo("foca", [
  "..........KKK...",
  ".........KGGGK..",
  ".........KGWEGK.",
  "........KGGGGGNK",
  "...KKKKKGGGGGK..",
  "..KGGGGGGGLLGK..",
  ".KGGGGGGGLLLGK..",
  "KGGKGGGGLLLLGK..",
  "KKK.KKGGGGGGKK..",
  ".....KKK..KKK..."
], { K: "#1c2a3a", G: "#8ba3b8", L: "#d0dde8", W: "#ffffff", E: "#111111", N: "#111111" }, 3);

registrarInimigo("lobo", [
  ".............K.K..",
  "............KGKGK.",
  "...........KGGGGGK",
  "...........KGWEGGK",
  "K........KGGGGLLLN",
  "GK.....KKKGGGGGKK.",
  ".GKKKKKGGGGGGGGK..",
  "..KGGGGGGGGGLLGK..",
  "..KGGGGGGGGGLLGK..",
  "..KGGKKKKKKGGGK...",
  "..KGK......KGK....",
  "..KKK......KKK...."
], { K: "#2b3440", G: "#adb5bd", L: "#f1f3f5", W: "#ffd43b", E: "#111111", N: "#111111" }, 3);

registrarInimigo("golem", [
  "....KKKKKKKK....",
  "...KRRRRRRRRK...",
  "..KRRrRRRRrRRK..",
  "..KRROORROORRK..",
  "..KRRRRRRRRRRK..",
  "...KRRKKKKRRK...",
  ".KKKRRRRRRRRKKK.",
  "KRRRKRRrRRRKRRRK",
  "KRrRKRRRRRrKRrRK",
  "KRRRKRRRRRRKRRRK",
  "KRRRKRRORRRKRRRK",
  "KKKKKRRRRRRKKKKK",
  "KRRK.KRRRRK.KRRK",
  "KKKK.KRRRRK.KKKK",
  ".....KRRKRRK....",
  "....KRRK.KRRK...",
  "....KKKK.KKKK..."
], { K: "#1a1d20", R: "#6c6f73", r: "#8a8d91", O: "#ff922b" }, 3);

registrarInimigo("fenix", [
  "...........Y.Y....",
  "...........YRRK...",
  "..........KRRWEK..",
  "Y........KRRRRRYY.",
  "YR.....KKRRRRRK...",
  ".YRR.KROOORRRK....",
  "..YRRROOOOOORK....",
  "...YRRYYOOOORK....",
  "..YYRRRRYYOOK.....",
  ".Y..YRRRRRKK......",
  "......YY.Y........",
  ".......K..K......."
], { K: "#5c1a03", R: "#e8590c", O: "#ff922b", Y: "#ffd43b", W: "#ffffff", E: "#111111" }, 3);


// ---------- OBSTÁCULOS ----------

const SPR_COGUMELO = spriteDeMapa([
  "....RRRRRRRR....",
  "..RRWWRRRRWWRR..",
  ".RRWWWRRRRRWWRR.",
  "RRRRRRRWWRRRRRRR",
  "KKKKKKKKKKKKKKKK",
  ".....SSSSSS.....",
  ".....SSSSSS....."
], { R: "#e03131", W: "#ffffff", K: "#a51111", S: "#f1e3c8" }, 4);

const SPR_TRONCO = spriteDeMapa([
  "..KKKKKK..",
  ".KNNNNNNK.",
  "KNNLLLLNNK",
  "KNLNNNNLNK",
  "KNLNKKNLNK",
  "KNLNKKNLNK",
  "KNLNNKNLNK",
  "KNNLLLLNNK",
  ".KNNNNNNK.",
  "..KKKKKK.."
], { K: "#3b2412", N: "#8a5a2b", L: "#c4915a" }, 4);

const SPR_PLANTA = spriteDeMapa([
  "...RRRRRR...",
  ".RRWRRRRWRR.",
  "RRRRRRRRRRRR",
  "RWRWRWRWRWRW",
  "KKKKKKKKKKKK",
  "WRWRWRWRWRWR",
  "RRRRRRRRRRRR",
  ".RRRRRRRRRR.",
  "...RRRRRR...",
  ".....GG.....",
  "..GG.GG.GG..",
  ".GGGGGGGGGG.",
  "..GG.GG.GG..",
  ".....GG.....",
  ".....GG.....",
  ".....GG....."
], { R: "#e03131", W: "#ffffff", K: "#5c1010", G: "#2f9e44" }, 4);

const SPR_ARMADILHA = spriteDeMapa([
  "MMMMMMMM",
  "MLLLLLLM",
  "MLKKKKLM",
  "MLKDDKLM",
  "MLKDDKLM",
  "MLKKKKLM",
  "MLLLLLLM",
  "MMMMMMMM"
], { M: "#8a6420", L: "#d9a648", K: "#3b2a1a", D: "#000000" }, 4);

const SPR_BOLHA = bolaPixel(11, "rgba(255,255,255,0.18)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0.85)", 2);


// ---------- CHEFES ----------

const SPR_CHEFE = {};

function registrarChefe(nome, mapa, paleta, escala) {
  const s = spriteDuplo(mapa, paleta, escala);
  s.flashD = silhueta(s.d);
  s.flashE = silhueta(s.e);
  SPR_CHEFE[nome] = s;
}

registrarChefe("gorila", [
  "...........Y.Y.Y........",
  "...........YYRYY........",
  "..........KKKKKKK.......",
  ".........KGGGGGGGK......",
  "........KGGGGGGGGGK.....",
  "........KGGPPPPPPPK.....",
  "........KGPWEPPWEPK.....",
  "....KKKKKGPPPPPPPPKKK...",
  "...KGGGGGGPPMMMMPPKGGK..",
  "..KGGGGGGGKPPPPPPKGGGGK.",
  ".KGGLLGGGGGKKKKKKGGGGGGK",
  ".KGLLGGGCCCCCCCCGGGLLGGK",
  "KGGLGGGCCCCCCCCCCGGGLGGK",
  "KGGLGGGCCCCCCCCCCGGGLGGK",
  "KGGGGGGCCCCCCCCCCGGGGGGK",
  "KGGGGGGGCCCCCCCCGGGGGGGK",
  "KGGGKGGGGGGGGGGGGGGKGGGK",
  "KGGGKKGGGGGGGGGGGGKKGGGK",
  "KPPPK.KGGGGKKGGGGK.KPPPK",
  ".KKK..KGGGK..KGGGK..KKK.",
  "......KPPPK..KPPPK......",
  "......KKKKK..KKKKK......"
], { K: "#141414", G: "#3d3d3d", L: "#5c5c5c", C: "#7a7a7a", P: "#a07a5a", W: "#ffffff", E: "#c92a2a",
     M: "#2b0f0f", Y: "#ffd43b", R: "#e03131" }, 6);

const MAPA_ESCORPIAO_REI = [
  "......KKKK........",
  ".....KOOOOK.......",
  "....KOK..KOK......",
  "....KOK...KRK.....",
  "....KOK....K......",
  "....KOK...........",
  "....KOOKKKKKKKK...",
  "...KOOOOOOOOOOOK..",
  "..KOLLOLLOLLOOWEK.",
  "..KOOOOOOOOOOOOOKK",
  "...KKOKKOKKOKKKOOK",
  "....K..K..K..K..KK"
];
registrarChefe("escorpiaoRei", MAPA_ESCORPIAO_REI,
  { K: "#3d2600", O: "#e0a526", L: "#ffe066", R: "#5f3dc4", W: "#ffffff", E: "#c92a2a" }, 9);

const SPR_COROA_PEQ = spriteDuplo([
  "Y.YY.Y",
  "YYRRYY",
  "YYYYYY"
], { Y: "#ffd43b", R: "#e03131" }, 6);

registrarChefe("yeti", [
  "........BBBBBB........",
  "......BBWWWWWWBB......",
  ".....BWWWWWWWWWWB.....",
  "....BWWWWWWWWWWWWB....",
  "....BWWFFFFFFFFWWB....",
  "....BWFFEFFFFEFFWB....",
  "....BWFFFFFFFFFFWB....",
  "....BWFMTMTMTMTFWB....",
  "..BBBWFMMMMMMMMFWBBB..",
  ".BWWWWWFFFFFFFFWWWWWB.",
  "BWWSWWWWWWWWWWWWWWSWWB",
  "BWWSWWWWWWWWWWWWWWSWWB",
  "BWSSWWWWWWWWWWWWWWSSWB",
  "BWSWWWWWWWWWWWWWWWWSWB",
  "BWWWBWWWWWWWWWWWWBWWWB",
  "BWWWBWWWWWWWWWWWWBWWWB",
  "BFFFBWWWWWWWWWWWWBFFFB",
  ".BBB.BWWWWWWWWWWB.BBB.",
  ".....BWWWWWWWWWWB.....",
  ".....BWWWWBBWWWWB.....",
  ".....BWWWB..BWWWB.....",
  "....BWWWWB..BWWWWB....",
  "....BFFFFB..BFFFFB....",
  "....BBBBBB..BBBBBB...."
], { B: "#1c3d5a", W: "#f8f9fa", S: "#a5d8ff", F: "#9fb3c8", E: "#c92a2a", M: "#2b0f2f", T: "#ffffff" }, 6);

registrarChefe("dragao", [
  "................................",
  "................................",
  "................................",
  "...........................HH...",
  "..........................KKKK..",
  ".........................KRRRRK.",
  "........................KRRWERK.",
  ".......................KRRRRRRRK",
  ".....................KKRRRRRYYK.",
  "......KRRRRRRRRRRKKKKRRRRRKKKK..",
  ".....KRRRRRRRRRRRRRRRRRRRK......",
  "KK..KRROOOOOOOOOOOORRRRK........",
  "KRKKRRROOOOOOOOOOOORRRK.........",
  ".KRRRRRROOOOOOOOOORRRK..........",
  "..KKKKKRRRRRRRRRRRRK............",
  ".......KRRK...KRRK..............",
  ".......KYYK...KYYK..............",
  ".......KKKK...KKKK.............."
], { K: "#2b0a0a", R: "#c92a2a", O: "#ff922b", Y: "#ffd43b", W: "#ffffff", E: "#111111", H: "#f1f3f5" }, 6);

const SPR_ASA = spriteDuplo([
  "........KK......",
  ".......KDDK.....",
  "......KDDDDK....",
  ".....KDDDDDDK...",
  "....KDDDDDDDDK..",
  "...KDDDKDDDDDK..",
  "..KDDK.KDDDDDDK.",
  ".KDK...KDDDDDDDK",
  "KK.....KKDDDDDDK"
], { K: "#2b0a0a", D: "#862e2e" }, 6);


// ---------- OBJETOS ----------

const SPR_BANANA = spriteDeMapa([
  "..........N.",
  ".........KN.",
  "........KYK.",
  ".......KYYK.",
  "......KYYYK.",
  "....KKYyYK..",
  "KKKKYYYyK...",
  "KYYYYYyK....",
  ".KyyyKK.....",
  "..KKK......."
], { K: "#7a4f05", Y: "#ffe066", y: "#f2b705", N: "#5c3a1a" }, 4);

const MAPA_CORACAO = [
  ".RR.RR.",
  "RWRRRRR",
  "RRRRRRR",
  "RRRRRRR",
  ".RRRRR.",
  "..RRR..",
  "...R..."
];
const SPR_CORACAO = spriteDeMapa(MAPA_CORACAO, { R: "#e03131", W: "#ffc9c9" }, 4);
const SPR_CORACAO_VAZIO = spriteDeMapa(MAPA_CORACAO, { R: "#495057", W: "#868e96" }, 4);

const SPR_PLACA = spriteDeMapa([
  "DDDDDDDD",
  "DLLLLLLD",
  "DLKKKLLD",
  "DLLLLLLD",
  "DLKKLKLD",
  "DDDDDDDD",
  "...DD...",
  "...DD..."
], { D: "#6b4220", L: "#c99a5b", K: "#6b4220" }, 4);

const SPR_GEISER = spriteDeMapa([
  "..KKKKKKKKKKKK..",
  ".KBBBOOOOOOBBBK.",
  "KBBBOYYYYYYOBBBK",
  "KBBBBOOOOOOBBBBK",
  "KKKKKKKKKKKKKKKK"
], { K: "#1a1d20", B: "#495057", O: "#ff6b00", Y: "#ffd43b" }, 4);

const SPR_ESTALACTITE = spriteDeMapa([
  "WIIIID",
  "WIIIID",
  ".WIID.",
  ".WIID.",
  ".WIID.",
  "..WD..",
  "..WD..",
  "..WD..",
  "...D.."
], { W: "#e7f5ff", I: "#a5d8ff", D: "#4dabf7" }, 4);

const MAPA_BANDEIRA = [
  ".PFFFFF.", ".PFFFFF.", ".PFFFF..", ".PFFF...", ".PFF....",
  ".P......", ".P......", ".P......", ".P......", ".P......",
  ".P......", ".P......", ".P......", ".P......", ".P......", ".P......"
];
const SPR_BANDEIRA_OFF = spriteDeMapa(MAPA_BANDEIRA, { P: "#d8d8d8", F: "#868e96" }, 5);
const SPR_BANDEIRA_ON = MUNDOS.map(function(m) { return spriteDeMapa(MAPA_BANDEIRA, { P: "#d8d8d8", F: m.cor }, 5); });

const SPR_GALHO = spriteDeMapa([
  "..GG..GGG...",
  ".GgGGGGgGG..",
  "NNNNNNNNNNNN",
  ".GGgGGNGgGG.",
  "..GG..N.GG.."
], { G: "#2f9e44", g: "#69db7c", N: "#6b4220" }, 4);

const SPR_DECOR = [
  spriteDeMapa([
    "....GGGG........",
    "..GGgGGGGG..GG..",
    ".GGGGGGgGGGGGGG.",
    "GGgGGGGGGGGgGGGG",
    "GGGGGgGGGGGGGGgG",
    "GgGGGGGGGgGGGGGG",
    "GGGGGGGGGGGGGGGG",
    ".gggggggggggggg."
  ], { G: "#2f9e44", g: "#1b6b2a" }, 4),
  spriteDeMapa([
    "....KK....",
    "...KGLK...",
    "...KGLK..K",
    "K..KGLK.KG",
    "GK.KGLK.KG",
    "GKKKGLKKKG",
    "KGGGGLGGGK",
    ".KKKGLKKK.",
    "...KGLK...",
    "...KGLK...",
    "...KGLK...",
    "...KGLK...",
    "...KGLK...",
    "...KKKK..."
  ], { G: "#2f9e44", L: "#69db7c", K: "#1b5e20" }, 4),
  spriteDeMapa([
    ".....WW.....",
    "....WGGW....",
    "....GGGG....",
    "...WWGGWW...",
    "...GGGGGG...",
    "..GGGDGGGG..",
    "..WWWGGWWW..",
    "..GGGGGGGG..",
    ".GGDGGGGGDG.",
    ".WWWWGGWWWW.",
    ".GGGGGGGGGG.",
    "GGGGDGGGGGGG",
    "GGGGGGGGDGGG",
    ".....NN.....",
    ".....NN.....",
    ".....NN....."
  ], { W: "#f8f9fa", G: "#2b8a3e", D: "#1b5e20", N: "#6b4220" }, 4),
  spriteDeMapa([
    "...KKK....",
    "..KBBBK...",
    ".KBBOBBK..",
    ".KBOOBBBK.",
    "KBBBBBOBK.",
    "KBBBBBBBBK",
    "KKKKKKKKKK"
  ], { K: "#1a1d20", B: "#3b2f4a", O: "#ff6b00" }, 4)
];

// Ícones dos poderes e melhorias (8x8)
const ICONES = {
  velocidade: spriteDeMapa(["....YY..", "...YY...", "..YY....", ".YYYYYY.", "....YY..", "...YY...", "..YY....", ".Y......"],
    { Y: "#ffd43b" }, 4),
  puloDuplo: spriteDeMapa(["...WW...", "..WWWW..", ".WW..WW.", "...WW...", "..WWWW..", ".WW..WW.", "........", "........"],
    { W: "#74c0fc" }, 4),
  escudo: spriteDeMapa([".BBBBBB.", "BWWBBBBB", "BWBBBBBB", "BBBBBBBB", ".BBBBBB.", ".BBBBBB.", "..BBBB..", "...BB..."],
    { B: "#4dabf7", W: "#d0ebff" }, 4),
  ima: spriteDeMapa(["GG....GG", "RR....RR", "RR....RR", "RR....RR", "RRR..RRR", ".RRRRRR.", "..RRRR..", "........"],
    { R: "#e03131", G: "#ced4da" }, 4),
  nuke: spriteDeMapa(["......Y.", ".....Y..", "...KKK..", "..KKKKK.", ".KKWKKKK", ".KWKKKKK", ".KKKKKKK", "..KKKKK."],
    { K: "#343a40", W: "#868e96", Y: "#ff922b" }, 4),
  dash: spriteDeMapa(["........", "WW..WW..", ".WW..WW.", "..WW..WW", ".WW..WW.", "WW..WW..", "........", "........"],
    { W: "#ffd43b" }, 4),
  coracao1: spriteDeMapa(MAPA_CORACAO, { R: "#e03131", W: "#ffc9c9" }, 4),
  coracao2: spriteDeMapa(MAPA_CORACAO, { R: "#c2255c", W: "#ffc9c9" }, 4),
  revolver: SPR_REVOLVER.d,
  cipoLongo: spriteDeMapa(["..GGGG..", ".G....G.", "G......G", "G......G", ".G....G.", "..GGGG..", "...G....", "..G....."],
    { G: "#40c057" }, 4)
};

// Projéteis
const SPR_PROJ = {
  coco: bolaPixel(6, "#8a5a2b", "#4a2f12", "#c4915a", 2),
  neve: bolaPixel(5, "#ffffff", "#adb5bd", "#ffffff", 2),
  fogo: bolaPixel(6, "#ff922b", "#e8590c", "#ffe066", 2),
  veneno: bolaPixel(6, "#9c36b5", "#5f1a73", "#e599f7", 2),
  bolao: bolaPixel(18, "#f8f9fa", "#adb5bd", "#ffffff", 2),
  meteoro: bolaPixel(10, "#6b4220", "#2b1a0a", "#ff922b", 2),
  podoboo: bolaPixel(8, "#ff6b00", "#c92a2a", "#ffe066", 2),
  pedra: bolaPixel(20, "#868e96", "#343a40", "#ced4da", 2),
  pedrinha: bolaPixel(7, "#868e96", "#343a40", "#ced4da", 2),
  bolaNeve: bolaPixel(14, "#f8f9fa", "#adb5bd", "#ffffff", 2),
  bolaFogo: bolaPixel(5, "#ff922b", "#e8590c", "#ffe066", 2)
};

// Moeda pixelada (6 quadros girando)
function criarMoedaPixelada(t) {
  const larguras = [8, 6, 4, 2, 4, 6];
  const linhas = [4, 6, 8, 8, 8, 8, 6, 4];
  const e = t / 8;
  const c = criarCanvas(t * larguras.length, t);
  const g = c.getContext("2d");

  larguras.forEach(function(w, f) {
    linhas.forEach(function(lw, y) {
      const l = Math.min(lw, w);
      const x = f * 8 + (8 - l) / 2;
      g.fillStyle = "#b8740a";
      g.fillRect(x * e, y * e, l * e, e);
      if (l >= 4 && y > 0 && y < 7) {
        g.fillStyle = "#ffcf2e";
        g.fillRect((x + 1) * e, y * e, (l - 2) * e, e);
      }
    });
    if (w >= 6) {
      g.fillStyle = "#fff3a0";
      g.fillRect((f * 8 + 2) * e, 2 * e, e, 2 * e);
    }
  });
  return c;
}

let moedaFonte = { img: criarMoedaPixelada(MOEDA.tamanho), fw: MOEDA.tamanho, fh: MOEDA.tamanho };

if (MOEDA.imagem) {
  const imgMoeda = new Image();
  imgMoeda.onload = function() {
    moedaFonte = { img: imgMoeda, fw: imgMoeda.naturalWidth / MOEDA.frames, fh: imgMoeda.naturalHeight };
  };
  imgMoeda.src = MOEDA.imagem;
}


// ---------- FUNDOS (1200x700, desenhados em blocos de 8px para parecer pixel art) ----------

function faixaMorros(g, cor, base, amp, freq, fase, passo) {
  passo = passo || 8;
  g.fillStyle = cor;
  for (let x = 0; x < LARGURA; x += passo) {
    const a = (x / LARGURA) * Math.PI * 2 * freq + (fase || 0);
    const y = Math.round((base - Math.abs(Math.sin(a)) * amp) / 8) * 8;
    g.fillRect(x, y, passo, ALTURA - y);
  }
}

function triangulo(g, cx, base, larg, alt, cor, corSombra) {
  for (let y = 0; y < alt; y += 8) {
    const w = Math.round((larg * (y / alt)) / 8) * 8;
    g.fillStyle = cor;
    g.fillRect(cx - w / 2, base - alt + y, w, 8);
    if (corSombra) {
      g.fillStyle = corSombra;
      g.fillRect(cx, base - alt + y, w / 2, 8);
    }
  }
}

function ceu(g, c1, c2) {
  const grad = g.createLinearGradient(0, 0, 0, ALTURA);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  g.fillStyle = grad;
  g.fillRect(0, 0, LARGURA, ALTURA);
}

const CRIAR_FUNDO = [
  function selva(g) {
    ceu(g, "#5fb8ff", "#c9f0ff");
    faixaMorros(g, "#3f9142", 420, 70, 2);
    faixaMorros(g, "#2b6b2f", 520, 60, 5, 1);
    g.fillStyle = "#1f5124";
    for (let x = 20; x < LARGURA; x += 140) {
      g.fillRect(x, 0, 8, 60 + (x * 7) % 120);
    }
  },
  function deserto(g) {
    ceu(g, "#ffb347", "#ffe8a3");
    g.fillStyle = "#fff3bf";
    for (let y = -64; y <= 64; y += 8) {
      const w = Math.round(Math.sqrt(64 * 64 - y * y) / 8) * 8;
      g.fillRect(900 - w, 150 + y, w * 2, 8);
    }
    triangulo(g, 250, 470, 360, 220, "#e0a458", "#c98a3e");
    triangulo(g, 470, 470, 240, 140, "#e0a458", "#c98a3e");
    faixaMorros(g, "#e9b872", 480, 50, 3);
    faixaMorros(g, "#d39a4f", 540, 40, 4, 2);
  },
  function gelo(g) {
    ceu(g, "#9ec5fe", "#e7f5ff");
    const aurora = ["rgba(99,230,190,0.35)", "rgba(116,192,252,0.3)", "rgba(177,151,252,0.25)"];
    aurora.forEach(function(cor, i) {
      g.fillStyle = cor;
      for (let x = 0; x < LARGURA; x += 8) {
        const y = 80 + i * 26 + Math.round(Math.sin(x / 120 + i) * 24 / 8) * 8;
        g.fillRect(x, y, 8, 24);
      }
    });
    triangulo(g, 200, 520, 420, 300, "#f8f9fa", "#c5d8ea");
    triangulo(g, 560, 520, 480, 360, "#f1f3f5", "#bccfe2");
    triangulo(g, 950, 520, 400, 260, "#f8f9fa", "#c5d8ea");
    faixaMorros(g, "#dbe9f6", 540, 30, 4);
  },
  function lava(g) {
    ceu(g, "#1a0505", "#6b1d0a");
    triangulo(g, 300, 560, 600, 340, "#2b0f0f", "#1c0808");
    triangulo(g, 900, 560, 520, 280, "#2b0f0f", "#1c0808");
    g.fillStyle = "#ff6b00";
    g.fillRect(280, 220, 40, 16);
    g.fillRect(880, 280, 40, 16);
    g.fillStyle = "#e8590c";
    for (let y = 236; y < 520; y += 8) g.fillRect(292 + Math.round(Math.sin(y / 30) * 2) * 8, y, 8, 8);
    faixaMorros(g, "#3b1010", 540, 40, 5);
    const grad = g.createLinearGradient(0, 480, 0, ALTURA);
    grad.addColorStop(0, "rgba(255,107,0,0)");
    grad.addColorStop(1, "rgba(255,107,0,0.45)");
    g.fillStyle = grad;
    g.fillRect(0, 480, LARGURA, ALTURA - 480);
  }
];

const FUNDOS = MUNDOS.map(function(m, i) {
  const c = criarCanvas(LARGURA, ALTURA);
  CRIAR_FUNDO[i](c.getContext("2d"));
  return c;
});

const imgFundoSelva = new Image();
imgFundoSelva.onload = function() {
  const c = criarCanvas(LARGURA, ALTURA);
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(imgFundoSelva, 0, 0, LARGURA, ALTURA);
  FUNDOS[0] = c;
};
imgFundoSelva.src = FUNDO_SELVA_URL;


// Imagem do jogador (skin "Original")
if (IMAGEM_PERSONAGEM) {
  imgPersonagem.onload = function() {
    personagemOk = true;
    montarSprites();
    if (typeof aoMudarVisual === "function") aoMudarVisual();
  };
  imgPersonagem.onerror = function() {
    const i = SKINS.findIndex(function(s) { return s.imagem; });
    if (i >= 0) SKINS.splice(i, 1);
    if (save.equip.skin === "original") save.equip.skin = SKINS[0].id;
    montarSprites();
    if (typeof aoMudarVisual === "function") aoMudarVisual();
  };
  imgPersonagem.src = IMAGEM_PERSONAGEM;
}

montarSprites();
