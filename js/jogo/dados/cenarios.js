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

const CENARIOS = [
  { id: "campo",
    spawn: [[260, 600], [1020, 600]],
    plataformas: [CHAO,
      { x: 180, y: 500, w: 260, h: 18, fina: true }, { x: 840, y: 500, w: 260, h: 18, fina: true },
      { x: 500, y: 360, w: 280, h: 18, fina: true },
      { x: 160, y: 240, w: 200, h: 18, fina: true }, { x: 920, y: 240, w: 200, h: 18, fina: true }] },

  { id: "gelo", atrito: 0.015,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [Object.assign({ gelo: true }, CHAO),
      { x: 100, y: 520, w: 300, h: 22, gelo: true }, { x: 880, y: 520, w: 300, h: 22, gelo: true },
      { x: 440, y: 400, w: 400, h: 22, gelo: true }, { x: 560, y: 250, w: 160, h: 22, gelo: true }] },

  { id: "lua", gravidade: 0.4,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [CHAO,
      { x: 150, y: 450, w: 180, h: 18, fina: true }, { x: 950, y: 450, w: 180, h: 18, fina: true },
      { x: 550, y: 300, w: 180, h: 18, fina: true },
      { x: 300, y: 170, w: 140, h: 18, fina: true }, { x: 840, y: 170, w: 140, h: 18, fina: true }] },

  { id: "vulcao", lava: { base: 700, sobe: 120, periodo: 9 },
    spawn: [[190, 500], [1090, 500]],
    plataformas: [
      { x: 60, y: 540, w: 260, h: 30 }, { x: 960, y: 540, w: 260, h: 30 },
      { x: 470, y: 470, w: 340, h: 30 },
      { x: 220, y: 330, w: 200, h: 24 }, { x: 860, y: 330, w: 200, h: 24 },
      { x: 540, y: 200, w: 200, h: 24 }] },

  { id: "espaco", semGravidade: true,
    spawn: [[200, 360], [1080, 360]],
    plataformas: [
      { x: 300, y: 190, w: 120, h: 90 }, { x: 860, y: 440, w: 120, h: 90 },
      { x: 580, y: 320, w: 120, h: 80 },
      { x: 150, y: 520, w: 90, h: 70 }, { x: 1040, y: 130, w: 90, h: 70 }] },

  { id: "laboratorio", inverte: 6,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [CHAO, { x: 0, y: 0, w: 1280, h: 60 },
      { x: 200, y: 330, w: 240, h: 24 }, { x: 840, y: 330, w: 240, h: 24 },
      { x: 560, y: 200, w: 160, h: 24 }, { x: 560, y: 460, w: 160, h: 24 }] },

  { id: "dojo", queda: 780, empurrao: 2.2,
    spawn: [[470, 480], [810, 480]],
    plataformas: [
      { x: 340, y: 520, w: 600, h: 40 },
      { x: 170, y: 380, w: 130, h: 18, fina: true }, { x: 980, y: 380, w: 130, h: 18, fina: true },
      { x: 560, y: 300, w: 160, h: 18, fina: true }] },

  { id: "cidade", queda: 780,
    spawn: [[220, 580], [1060, 580]],
    plataformas: [
      { x: 0, y: 640, w: 420, h: 80 }, { x: 860, y: 640, w: 420, h: 80 },
      { x: 450, y: 590, w: 160, h: 20, move: { dx: 220, dy: 0, periodo: 6 } },
      { x: 560, y: 380, w: 160, h: 20, move: { dx: 0, dy: 120, periodo: 5 } },
      { x: 120, y: 420, w: 200, h: 20, fina: true }, { x: 960, y: 420, w: 200, h: 20, fina: true },
      { x: 520, y: 200, w: 240, h: 20, fina: true }] },

  { id: "fliperama", quicaParede: true,
    spawn: [[220, 600], [1060, 600]],
    bumpers: [{ x: 640, y: 300, r: 50 }, { x: 330, y: 430, r: 40 }, { x: 950, y: 430, r: 40 }, { x: 640, y: 560, r: 34 }],
    plataformas: [CHAO,
      { x: 100, y: 290, w: 170, h: 18, fina: true }, { x: 1010, y: 290, w: 170, h: 18, fina: true }] },

  { id: "floresta", escuro: true,
    spawn: [[230, 600], [1050, 600]],
    plataformas: [CHAO,
      { x: 120, y: 520, w: 220, h: 22, fina: true }, { x: 940, y: 520, w: 220, h: 22, fina: true },
      { x: 480, y: 430, w: 320, h: 22, fina: true },
      { x: 250, y: 300, w: 180, h: 22, fina: true }, { x: 850, y: 300, w: 180, h: 22, fina: true },
      { x: 560, y: 170, w: 160, h: 22, fina: true }] },

  { id: "deserto", vento: { forca: 0.22, periodo: 5 },
    spawn: [[230, 600], [1050, 600]],
    plataformas: [CHAO,
      { x: 610, y: 560, w: 60, h: 100 },
      { x: 200, y: 480, w: 240, h: 24 }, { x: 840, y: 480, w: 240, h: 24 },
      { x: 520, y: 330, w: 240, h: 24 }] },

  { id: "fabrica",
    spawn: [[250, 600], [1030, 600]],
    plataformas: [
      { x: 0, y: 660, w: 640, h: 60, esteira: -2.2 }, { x: 640, y: 660, w: 640, h: 60, esteira: 2.2 },
      { x: 150, y: 500, w: 300, h: 24, esteira: 2.8 }, { x: 830, y: 500, w: 300, h: 24, esteira: -2.8 },
      { x: 490, y: 360, w: 300, h: 24 },
      { x: 120, y: 230, w: 160, h: 20, move: { dx: 0, dy: 110, periodo: 4 } },
      { x: 1000, y: 230, w: 160, h: 20, move: { dx: 0, dy: 110, periodo: 4 } }] },

  { id: "oceano", agua: true, gravidade: 0.35,
    spawn: [[250, 600], [1030, 600]],
    plataformas: [CHAO,
      { x: 150, y: 520, w: 200, h: 30 }, { x: 930, y: 520, w: 200, h: 30 },
      { x: 520, y: 420, w: 240, h: 30 },
      { x: 300, y: 260, w: 160, h: 24 }, { x: 820, y: 260, w: 160, h: 24 }] },

  { id: "templo", atravessaLados: true,
    spawn: [[300, 600], [980, 600]],
    portais: [[{ x: 640, y: 590 }, { x: 640, y: 110 }]],
    plataformas: [CHAO,
      { x: 0, y: 480, w: 240, h: 22, fina: true }, { x: 1040, y: 480, w: 240, h: 22, fina: true },
      { x: 460, y: 380, w: 360, h: 22, fina: true },
      { x: 0, y: 250, w: 200, h: 22, fina: true }, { x: 1080, y: 250, w: 200, h: 22, fina: true },
      { x: 540, y: 190, w: 200, h: 22, fina: true }] },

  { id: "castelo", meteoros: 2.4,
    spawn: [[230, 600], [1050, 600]],
    plataformas: [CHAO,
      { x: 100, y: 500, w: 220, h: 30 }, { x: 960, y: 500, w: 220, h: 30 },
      { x: 500, y: 380, w: 280, h: 30 },
      { x: 240, y: 250, w: 160, h: 24 }, { x: 880, y: 250, w: 160, h: 24 }] }
];

const CENARIO = {};
CENARIOS.forEach(function(c) { CENARIO[c.id] = c; });
