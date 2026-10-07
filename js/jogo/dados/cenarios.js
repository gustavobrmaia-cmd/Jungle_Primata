"use strict";

// =========================
// OS 15 CENÁRIOS (cada um com um jeito diferente de jogar)
// Mundo: 1280 x 720. Plataformas: { x, y, w, h, fina?, gelo?, esteira?, move? }
//   fina: dá para subir por baixo e descer apertando "baixo" (como galho/andaime)
//   gelo: escorrega          esteira: empurra quem está em cima (px por passo, + = direita)
//   move: { dx, dy, periodo } vai e volta (periodo em s)
// Regras (todas opcionais):
//   gravidade (1 = normal), atrito (0..1, chão), semGravidade (voa nas 4 direções),
//   inverte (s entre as viradas da gravidade), lava { base, sobe, periodo }, queda (y onde cai e perde),
//   empurrao (multiplica o empurrão dos tiros), bumpers [{x,y,r}], quicaParede, escuro,
//   vento { forca, periodo }, agua, atravessaLados (sai de um lado, entra no outro),
//   portais [[{x,y},{x,y}]], meteoros (s entre meteoros)
// =========================

const CHAO = { x: 0, y: 660, w: 1280, h: 60 };

// Regra dos andares: cada nível fica no máximo 120 px acima do anterior (o pulo normal alcança ~143 px),
// então dá para subir tudo com pulos simples; o pulo duplo serve para atalhos e fugas.
// Níveis usados: chão 660 -> 540 -> 420 -> 300 -> 180.
const CENARIOS = [
  { id: "campo",
    spawn: [[260, 600], [1020, 600]],
    plataformas: [CHAO,
      { x: 130, y: 540, w: 240, h: 18, fina: true }, { x: 910, y: 540, w: 240, h: 18, fina: true },
      { x: 470, y: 420, w: 340, h: 18, fina: true },
      { x: 170, y: 300, w: 220, h: 18, fina: true }, { x: 890, y: 300, w: 220, h: 18, fina: true },
      { x: 520, y: 180, w: 240, h: 18, fina: true }] },

  { id: "gelo", atrito: 0.015,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [Object.assign({ gelo: true }, CHAO),
      { x: 90, y: 540, w: 260, h: 22, gelo: true, fina: true }, { x: 930, y: 540, w: 260, h: 22, gelo: true, fina: true },
      { x: 440, y: 420, w: 400, h: 22, gelo: true, fina: true },
      { x: 300, y: 300, w: 220, h: 22, gelo: true, fina: true }, { x: 760, y: 300, w: 220, h: 22, gelo: true, fina: true },
      { x: 540, y: 180, w: 200, h: 22, gelo: true, fina: true }] },

  { id: "lua", gravidade: 0.4,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [CHAO,
      { x: 150, y: 500, w: 180, h: 18, fina: true }, { x: 950, y: 500, w: 180, h: 18, fina: true },
      { x: 550, y: 360, w: 180, h: 18, fina: true },
      { x: 280, y: 220, w: 160, h: 18, fina: true }, { x: 840, y: 220, w: 160, h: 18, fina: true }] },

  { id: "vulcao", lava: { base: 700, sobe: 120, periodo: 9 },
    spawn: [[180, 500], [1100, 500]],
    plataformas: [
      { x: 40, y: 560, w: 280, h: 30 }, { x: 960, y: 560, w: 280, h: 30 },
      { x: 470, y: 520, w: 340, h: 30 },
      { x: 200, y: 430, w: 200, h: 26 }, { x: 880, y: 430, w: 200, h: 26 },
      { x: 540, y: 310, w: 200, h: 26 },
      { x: 240, y: 200, w: 160, h: 22, fina: true }, { x: 880, y: 200, w: 160, h: 22, fina: true }] },

  { id: "espaco", semGravidade: true,
    spawn: [[200, 360], [1080, 360]],
    plataformas: [
      { x: 300, y: 190, w: 120, h: 90 }, { x: 860, y: 440, w: 120, h: 90 },
      { x: 580, y: 320, w: 120, h: 80 },
      { x: 150, y: 520, w: 90, h: 70 }, { x: 1040, y: 130, w: 90, h: 70 }] },

  { id: "laboratorio", inverte: 6,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [CHAO, { x: 0, y: 0, w: 1280, h: 60 },
      { x: 170, y: 540, w: 220, h: 24 }, { x: 890, y: 540, w: 220, h: 24 },
      { x: 520, y: 420, w: 240, h: 24 },
      { x: 170, y: 300, w: 220, h: 24 }, { x: 890, y: 300, w: 220, h: 24 },
      { x: 520, y: 175, w: 240, h: 24 }] },

  { id: "dojo", queda: 780, empurrao: 2.2,
    spawn: [[470, 470], [810, 470]],
    plataformas: [
      { x: 340, y: 520, w: 600, h: 40 },
      { x: 180, y: 410, w: 140, h: 18, fina: true }, { x: 570, y: 410, w: 140, h: 18, fina: true },
      { x: 960, y: 410, w: 140, h: 18, fina: true },
      { x: 560, y: 290, w: 160, h: 18, fina: true }] },

  { id: "cidade", queda: 780,
    spawn: [[200, 580], [1080, 580]],
    plataformas: [
      { x: 0, y: 640, w: 420, h: 80 }, { x: 860, y: 640, w: 420, h: 80 },
      { x: 450, y: 590, w: 160, h: 20, move: { dx: 220, dy: 0, periodo: 6 } },
      { x: 120, y: 520, w: 200, h: 20, fina: true }, { x: 960, y: 520, w: 200, h: 20, fina: true },
      { x: 300, y: 400, w: 180, h: 20, fina: true }, { x: 800, y: 400, w: 180, h: 20, fina: true },
      { x: 560, y: 400, w: 160, h: 20, move: { dx: 0, dy: -110, periodo: 5 } },
      { x: 520, y: 280, w: 240, h: 20, fina: true }] },

  { id: "fliperama", quicaParede: true,
    spawn: [[220, 600], [1060, 600]],
    bumpers: [{ x: 640, y: 300, r: 50 }, { x: 330, y: 450, r: 40 }, { x: 950, y: 450, r: 40 }, { x: 640, y: 560, r: 34 }],
    plataformas: [CHAO,
      { x: 70, y: 540, w: 190, h: 18, fina: true }, { x: 1020, y: 540, w: 190, h: 18, fina: true },
      { x: 90, y: 420, w: 170, h: 18, fina: true }, { x: 1020, y: 420, w: 170, h: 18, fina: true },
      { x: 100, y: 300, w: 170, h: 18, fina: true }, { x: 1010, y: 300, w: 170, h: 18, fina: true },
      { x: 290, y: 180, w: 160, h: 18, fina: true }, { x: 830, y: 180, w: 160, h: 18, fina: true }] },

  { id: "floresta", escuro: true,
    spawn: [[230, 600], [1050, 600]],
    plataformas: [CHAO,
      { x: 120, y: 540, w: 220, h: 22, fina: true }, { x: 940, y: 540, w: 220, h: 22, fina: true },
      { x: 460, y: 430, w: 360, h: 22, fina: true },
      { x: 220, y: 320, w: 200, h: 22, fina: true }, { x: 860, y: 320, w: 200, h: 22, fina: true },
      { x: 560, y: 200, w: 160, h: 22, fina: true }] },

  { id: "deserto", vento: { forca: 0.22, periodo: 5 },
    spawn: [[230, 600], [1050, 600]],
    plataformas: [CHAO,
      { x: 610, y: 560, w: 60, h: 100 },
      { x: 180, y: 540, w: 240, h: 24, fina: true }, { x: 860, y: 540, w: 240, h: 24, fina: true },
      { x: 500, y: 420, w: 280, h: 24, fina: true },
      { x: 200, y: 300, w: 200, h: 24, fina: true }, { x: 880, y: 300, w: 200, h: 24, fina: true },
      { x: 560, y: 180, w: 160, h: 22, fina: true }] },

  { id: "fabrica",
    spawn: [[250, 600], [1030, 600]],
    plataformas: [
      { x: 0, y: 660, w: 640, h: 60, esteira: -2.2 }, { x: 640, y: 660, w: 640, h: 60, esteira: 2.2 },
      { x: 130, y: 540, w: 300, h: 24, esteira: 2.8 }, { x: 850, y: 540, w: 300, h: 24, esteira: -2.8 },
      { x: 490, y: 420, w: 300, h: 24 },
      { x: 150, y: 300, w: 200, h: 22, fina: true }, { x: 930, y: 300, w: 200, h: 22, fina: true },
      { x: 560, y: 300, w: 160, h: 20, move: { dx: 0, dy: -120, periodo: 4 } }] },

  { id: "oceano", agua: true, gravidade: 0.35,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [CHAO,
      { x: 150, y: 540, w: 200, h: 30 }, { x: 930, y: 540, w: 200, h: 30 },
      { x: 520, y: 430, w: 240, h: 30 },
      { x: 280, y: 300, w: 180, h: 24 }, { x: 820, y: 300, w: 180, h: 24 },
      { x: 560, y: 180, w: 160, h: 24 }] },

  { id: "templo", atravessaLados: true,
    spawn: [[300, 600], [980, 600]],
    portais: [[{ x: 640, y: 590 }, { x: 640, y: 110 }]],
    plataformas: [CHAO,
      { x: 0, y: 540, w: 300, h: 22, fina: true }, { x: 980, y: 540, w: 300, h: 22, fina: true },
      { x: 380, y: 420, w: 520, h: 22, fina: true },
      { x: 0, y: 300, w: 260, h: 22, fina: true }, { x: 1020, y: 300, w: 260, h: 22, fina: true },
      { x: 380, y: 190, w: 180, h: 22, fina: true }, { x: 720, y: 190, w: 180, h: 22, fina: true }] },

  { id: "castelo", meteoros: 2.4,
    spawn: [[230, 600], [1050, 600]],
    plataformas: [CHAO,
      { x: 100, y: 540, w: 220, h: 30 }, { x: 960, y: 540, w: 220, h: 30 },
      { x: 500, y: 420, w: 280, h: 30 },
      { x: 230, y: 300, w: 180, h: 24 }, { x: 870, y: 300, w: 180, h: 24 },
      { x: 560, y: 180, w: 160, h: 24 }] }
];

const CENARIO = {};
CENARIOS.forEach(function(c) { CENARIO[c.id] = c; });
