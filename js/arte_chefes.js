"use strict";

// =========================
// ARTE DOS CHEFES: cada chefe é desenhado por uma função de "pose" (motor em pixelarte.js)
// e vira vários quadros de animação. Tudo olhando para a direita.
// =========================

// ---------- Gorila Rei (grade 48x44, escala 3 = 144x132) ----------

const COR_GORILA = {
  pelo: rampaDe("#463f52", 5),
  peito: rampaDe("#5b5062", 4),
  pele: rampaDe("#b7805a", 4),
  palma: rampaDe("#8a5a42", 4),
  capa: rampaDe("#c92a2a", 4),
  ouro: rampaDe("#f2b705", 5),
  rubi: ["#5c0a14", "#c2255c", "#ff6b8b", "#ffe3ec"],
  safira: ["#0b3a78", "#1c7ed6", "#74c0fc", "#e7f5ff"]
};

const COR_GRANDE_MACACO = {
  pelo: rampaDe("#5b3a22", 5),
  peito: rampaDe("#76502f", 4),
  pele: rampaDe("#c9966a", 4),
  palma: rampaDe("#8f5c3e", 4),
  ouro: rampaDe("#f2b705", 5)
};

// Pose: bob (sobe/desce o corpo), br = braços {e: [cotovelo x,y, punho x,y], d: [...]}, pe = pernas (dy esq, dir),
// boca 0-2, olhos "raiva"|"fechado"|"tonto"|"arregala", cab = [dx, dy] da cabeça, incl = inclinação do corpo
// gigante = true: o Grande Macaco (chefe secreto): sem capa e sem joias, com cauda, presas,
// olhos vermelhos e a tiara dourada rachada. Usa as mesmas poses do Gorila Rei.
function gorilaQuadro(p, gigante) {
  const C = gigante ? COR_GRANDE_MACACO : COR_GORILA;
  const b = pxNovo(48, 44);
  const bob = p.bob || 0;
  const cab = p.cab || [0, 0];
  const pe = p.pe || [0, 0];
  const tx = p.tx || 0;

  if (gigante) {
    // cauda grossa saindo de trás e subindo enrolada
    const ca = [[14 + tx, 34 + bob], [6, 33 + bob], [2.5, 26 + bob], [3.5, 19 + bob], [7, 16 + bob], [9.5, 18.5 + bob]];
    for (let i = 0; i < ca.length - 1; i++) {
      pxMembro(b, ca[i][0], ca[i][1], ca[i + 1][0], ca[i + 1][1], 3.2 - i * 0.35, 3 - i * 0.35, C.pelo, { tex: pxTexPelo(40 + i, 0.2) });
    }
  } else {
    // capa vermelha por trás
    pxPoligono(b, [[12 + tx, 15 + bob], [36 + tx, 15 + bob], [44, 36 + bob + (pe[1] > 0 ? 0 : 0)], [41, 40], [7, 40], [4, 36 + bob]], C.capa, { curva: 0.5, rim: "#4a0a12" });
    // dobras da capa
    pxLinha(b, 8, 38, 10, 30, C.capa[0]);
    pxLinha(b, 40, 38, 38, 30, C.capa[0]);
  }

  // pernas e pés
  [[15 + tx, pe[0]], [33 + tx, pe[1]]].forEach(function(l, i) {
    pxElipse(b, l[0], 35 + l[1] + bob * 0.5, 6.5, 6, C.pelo, { tex: pxTexPelo(3 + i) });
    pxElipse(b, l[0] - 1 + (i ? 2 : 0), 40.5 + l[1], 6.8, 3.4, C.palma, { rim: "#2a1812" });
    // dedos
    for (let k = 0; k < 3; k++) pxPonto(b, l[0] - 4 + (i ? 2 : 0) + k * 3, 41 + l[1], "#2a1812");
  });

  // tronco: costas largas, peitoral e barriga
  pxElipse(b, 24 + tx, 28 + bob, 15.5, 12.5, C.pelo, { tex: pxTexPelo(11, 0.12) });
  pxElipse(b, 24 + tx, 33.5 + bob, 9, 5.5, C.peito, { rim: false, tex: pxTexPelo(12, 0.12) });
  pxElipse(b, 19.5 + tx, 25.5 + bob, 6.8, 5.2, C.peito, { rim: C.pelo[1], tex: pxTexPelo(13) });
  pxElipse(b, 28.5 + tx, 25.5 + bob, 6.8, 5.2, C.peito, { rim: C.pelo[1], tex: pxTexPelo(14) });
  pxLinha(b, 24 + tx, 22 + bob, 24 + tx, 29 + bob, C.pelo[1]);
  // medalhão dourado no peito
  if (!gigante) {
    pxElipse(b, 24 + tx, 22.5 + bob, 2.4, 2.4, C.ouro, { rim: "#5c3a06" });
    pxPonto(b, 24 + tx, 22 + bob, C.rubi[2]);
    pxPonto(b, 23 + tx, 21 + bob, C.rubi[3]);
  }

  // braços (de trás pra frente: esquerdo, direito)
  const br = p.br || {};
  const bE = br.e || [4.5, 28, 6, 35];
  const bD = br.d || [43.5, 28, 42, 35];
  function braco(sx, sy, a, esq) {
    pxElipse(b, sx, sy, 7, 6.2, C.pelo, { tex: pxTexPelo(esq ? 21 : 22) });
    pxMembro(b, sx, sy + 1, a[0], a[1], 5.6, 5.1, C.pelo, { tex: pxTexPelo(esq ? 23 : 24, 0.2) });
    pxMembro(b, a[0], a[1], a[2], a[3], 5.1, 4.6, C.pelo, { tex: pxTexPelo(esq ? 25 : 26, 0.2) });
    // punho grande com nós dos dedos
    pxElipse(b, a[2], a[3] + 1.5, 5.6, 5, C.palma, { rim: "#2a1812" });
    pxPonto(b, a[2] - 2, a[3] + 4, "#2a1812");
    pxPonto(b, a[2] + 1, a[3] + 4, "#2a1812");
    // pulseira de ouro
    if (!gigante) {
      pxLinha(b, a[2] - 3, a[3] - 3, a[2] + 3, a[3] - 3, C.ouro[2]);
      pxLinha(b, a[2] - 3, a[3] - 2, a[2] + 3, a[3] - 2, C.ouro[1]);
    }
  }
  braco(9 + tx, 21 + bob, bE, true);
  braco(39 + tx, 21 + bob, bD, false);
  // ombreiras de ouro
  if (!gigante) [[9, true], [39, false]].forEach(function(s) {
    pxElipse(b, s[0] + tx, 17 + bob, 4.2, 2.6, C.ouro, { rim: "#5c3a06" });
    pxPonto(b, s[0] + tx + (s[1] ? -1 : 0), 16 + bob, C.ouro[4]);
  });

  // cabeça
  const hx = 24 + tx + cab[0];
  const hy = 13 + bob + cab[1];
  pxElipse(b, hx - 8.6, hy + 1.5, 2.6, 3, C.pele, { rim: "#2a1812" });
  pxElipse(b, hx + 8.6, hy + 1.5, 2.6, 3, C.pele, { rim: "#2a1812" });
  pxElipse(b, hx, hy, 9.6, 8.2, C.pelo, { tex: pxTexPelo(31, 0.12) });
  // crista da testa
  pxElipse(b, hx, hy - 2.2, 5.5, 3.6, C.pelo, { rim: false, tex: pxTexPelo(32) });
  // face
  pxElipse(b, hx, hy + 3, 7.2, 5.8, C.pele, { rim: "#3a2218", tex: pxTexPelo(33, 0.08) });
  // focinho
  pxElipse(b, hx, hy + 5.2, 4.2, 2.8, C.palma, { rim: false });
  pxPonto(b, hx - 1.5, hy + 4, "#2a1812");
  pxPonto(b, hx + 0.5, hy + 4, "#2a1812");
  // testa sombreada (arcada)

  // olhos
  const ox = [hx - 3.5, hx + 1.5];
  const ol = p.olhos || "raiva";
  ox.forEach(function(ex, i) {
    const ey = hy + 1.5;
    if (ol === "fechado") {
      pxRet(b, ex - 0.5, ey + 0.5, 3, 1, "#1a0e08");
    } else if (ol === "tonto") {
      pxRet(b, ex - 0.5, ey - 0.5, 3, 3, "#ffffff");
      pxPonto(b, ex + 0.5, ey + 0.5, "#1a0e08");
    } else if (ol === "arregala") {
      pxRet(b, ex - 0.5, ey - 0.5, 3, 3, "#fff3bf");
      pxPonto(b, ex + 1.5 - (i ? 1 : 0), ey + 0.5, "#c92a2a");
    } else if (gigante) {
      // olhos vermelhos acesos, sem pupila
      pxRet(b, ex - 0.5, ey, 3, 2, "#ff2a2a");
      pxPonto(b, ex + (i ? 1 : 0), ey, "#ffd0d0");
      pxPonto(b, ex + (i ? 2 : -1), ey - 1, "#1a0e08");
      pxPonto(b, ex + (i ? 1 : 0), ey - 1, "#1a0e08");
    } else {
      pxRet(b, ex, ey, 2, 2, "#ffd43b");
      pxPonto(b, ex + (i ? 0 : 1), ey + 1, "#c92a2a");
      // sobrancelha raivosa
      pxPonto(b, ex + (i ? 2 : -1), ey - 1, "#1a0e08");
      pxPonto(b, ex + (i ? 1 : 0), ey - 1, "#1a0e08");
      pxPonto(b, ex + (i ? 0 : 1), ey, i ? "#1a0e08" : "#ffd43b");
    }
  });

  // boca
  const my = hy + 7.2;
  if (p.boca === 2) {
    pxElipse(b, hx, my + 0.5, 4.6, 3.4, ["#1a0608", "#3a0c10", "#5c1018", "#7a1a22"], { rim: "#1a0608", pont: 0 });
    pxRet(b, hx - 3, my - 2, 6, 1, "#ffffff");
    pxPonto(b, hx - 3, my - 1, "#ffffff");
    pxPonto(b, hx + 2, my - 1, "#ffffff");
    pxRet(b, hx - 2, my + 1, 4, 1, "#e03131");
    pxPonto(b, hx - 4, my + 1.5, "#ffffff");
    pxPonto(b, hx + 3, my + 1.5, "#ffffff");
  } else if (p.boca === 1) {
    pxRet(b, hx - 3, my - 1, 6, 2, "#2a0c10");
    pxRet(b, hx - 3, my - 1, 6, 1, "#ffffff");
    pxRet(b, hx - 2, my, 4, 1, "#c92a2a");
  } else {
    pxRet(b, hx - 3, my, 6, 1, "#2a0c10");
    pxPonto(b, hx - 3, my - 1, "#ffffff");
    pxPonto(b, hx + 2, my - 1, "#ffffff");
  }

  if (gigante) {
    // presas para fora da boca
    pxRet(b, hx - 3, my - 3, 1, 2, "#fff8e8");
    pxRet(b, hx + 2, my - 3, 1, 2, "#fff8e8");
    // tiara dourada rachada na testa
    const ty = hy - 4;
    pxRet(b, hx - 7, ty, 15, 2, C.ouro[2]);
    pxRet(b, hx - 7, ty, 15, 1, C.ouro[3]);
    pxRet(b, hx - 7, ty + 1, 15, 1, C.ouro[1]);
    pxPonto(b, hx + 3, ty, "#2a1812");
    pxPonto(b, hx + 4, ty + 1, "#2a1812");
    pxPonto(b, hx - 1, ty, "#c92a2a");
    pxPonto(b, hx, ty + 1, "#c92a2a");
    pxFiapos(b, 0.35, 7, null, [C.pelo[1], C.pelo[2]]);
    pxContorno(b, "#0b0806");
    return { b: b, olhos: ox.map(function(ex) { return [ex + 1, hy + 2.5]; }) };
  }

  // coroa
  const cx = hx;
  const cy = hy - 8;
  pxPoligono(b, [[cx - 6.5, cy + 3.5], [cx - 7, cy - 2], [cx - 3.8, cy + 0.5], [cx - 1.8, cy - 3.6], [cx, cy - 0.6],
    [cx + 1.8, cy - 3.6], [cx + 3.8, cy + 0.5], [cx + 7, cy - 2], [cx + 6.5, cy + 3.5]], C.ouro, { rim: "#5c3a06", curva: 0.6 });
  pxRet(b, cx - 6, cy + 2, 12, 1, C.ouro[1]);
  pxPonto(b, cx, cy + 1, C.rubi[2]);
  pxPonto(b, cx, cy + 2, C.rubi[1]);
  pxPonto(b, cx - 4, cy + 2, C.safira[2]);
  pxPonto(b, cx + 4, cy + 2, C.safira[2]);
  pxPonto(b, cx - 6, cy - 1, C.ouro[4]);
  pxPonto(b, cx + 1.8, cy - 2.6, C.ouro[4]);
  pxPonto(b, cx - 2.6, cy - 2.6, C.ouro[4]);

  pxFiapos(b, 0.3, 7, null, [C.pelo[1], C.pelo[2]]);
  pxContorno(b, "#0e0f14");
  return { b: b, olhos: ox.map(function(ex) { return [ex + 1, hy + 2.5]; }) };
}

function gorilaQuadros(gigante) {
  const q = {};
  const def = {
    parado0: {},
    parado1: { bob: 0.8, br: { e: [4, 29, 6, 36], d: [44, 29, 42, 36] }, cab: [0, 0.4] },
    andar0: { bob: -0.5, pe: [-1, 0], br: { e: [4, 28, 8, 34], d: [44, 28, 41, 36] }, tx: -0.5 },
    andar1: { bob: -0.5, pe: [0, -1], br: { e: [4, 28, 5, 36], d: [44, 28, 45, 34] }, tx: 0.5 },
    // levanta os braços acima da cabeça (preparando a pancada / pulo)
    prep: { bob: 2, cab: [0, 1], br: { e: [3, 15, 7, 7], d: [45, 15, 41, 7] }, olhos: "raiva" },
    pulo: { bob: -1, pe: [-3, -3], br: { e: [3, 17, 7, 8], d: [45, 17, 41, 8] }, boca: 1 },
    pancada: { bob: 3, cab: [0, 2], pe: [0, 0], br: { e: [3, 33, 3, 38], d: [45, 33, 45, 38] }, olhos: "raiva", boca: 1 },
    // arremesso: braço direito para trás e acima
    jogar0: { bob: 1, br: { e: [4, 28, 7, 34], d: [45, 16, 41, 7] }, cab: [-0.5, 0] },
    jogar1: { bob: 0, tx: 0.5, br: { e: [4, 28, 7, 34], d: [45, 20, 42.5, 12] }, cab: [1, 0.5], boca: 1 },
    rugido: { bob: -1, cab: [0, -1.4], br: { e: [3, 25, 6, 16], d: [45, 25, 42, 16] }, boca: 2 },
    peito: { bob: 0, br: { e: [9, 22, 17, 24], d: [44, 28, 42, 35] }, boca: 1 },
    invest0: { bob: 6, tx: 2, cab: [4, 5], pe: [-2, 0], br: { e: [4, 33, 12, 38], d: [44, 33, 38, 39] }, boca: 1 },
    invest1: { bob: 6, tx: 2, cab: [4, 5], pe: [0, -2], br: { e: [4, 33, 6, 39], d: [44, 33, 44, 38] }, boca: 1 },
    tonto: { bob: 3, cab: [-1, 3], olhos: "tonto", br: { e: [3, 30, 6, 38], d: [45, 30, 41, 38] }, pe: [1, 0] },
    dano: { bob: 1, cab: [-1, 1], olhos: "fechado", boca: 1, br: { e: [4, 26, 8, 30], d: [44, 26, 40, 30] } }
  };
  Object.keys(def).forEach(function(k) {
    const r = gorilaQuadro(def[k], gigante);
    const s = pxSprite(pxCanvas(r.b, gigante ? 4 : 3));
    s.olhos = r.olhos.map(function(o) { return gigante ? [o[0] * 4 / 3, o[1] * 4 / 3] : o; });
    q[k] = s;
  });
  return q;
}

// ---------- Escorpião Faraó (grade 54x36, escala 3 = 162x108) ----------

const COR_ESCORPIAO = {
  casco: rampaDe("#dc9a22", 5),
  garra: rampaDe("#f0b73a", 5),
  perna: rampaDe("#8a5418", 4),
  azul: rampaDe("#2f6fe0", 4),
  ouro: rampaDe("#ffcf2e", 5),
  veneno: rampaDe("#8f5af5", 4),
  gota: ["#5c1a73", "#9c36b5", "#e599f7", "#ffffff"]
};

// Pose: bob, cauda (lista de [x, y, raio], da base ao ferrão), ferr = [x, y] da ponta, pinca (0 fechada ... 1 aberta),
// garra = deslocamento das garras [dx, dy], legs = fase das pernas, olhos "raiva"|"fechado"|"tonto", boca
function escorpiaoQuadro(p) {
  const C = COR_ESCORPIAO;
  const b = pxNovo(54, 36);
  const bob = (p.bob || 0) - 2.5;
  const leg = p.legs || 0;
  const garra = p.garra || [0, 0];
  const pinca = p.pinca === undefined ? 0.3 : p.pinca;
  const RIM = "#3d2208";
  const listras = function(x, y, k) { return (x + y * 2) % 7 === 0 ? k - 1 : k; };

  // pernas do lado de trás (finas, escuras)
  [[19, 3], [24, 1], [29, -1], [34, -3]].forEach(function(h, i) {
    const f = (i + leg) % 2 ? 1 : -1;
    const kx = h[0] - h[1] * 0.5 + f * 0.5;
    pxMembro(b, h[0], 30, kx, 31.2, 1.1, 1, C.perna, { rim: false });
    pxMembro(b, kx, 31.2, kx - h[1] * 0.7 + f, 34.8, 1, 0.6, C.perna, { rim: false });
  });

  // cauda: segmentos esféricos encadeados, saindo do fim do abdômen e arqueando por cima
  const cauda = p.cauda;
  for (let i = cauda.length - 2; i >= 0; i--) {
    const s = cauda[i], n = cauda[i + 1];
    pxMembro(b, s[0], s[1] + bob, n[0], n[1] + bob, s[2], n[2], C.casco, { rim: RIM });
  }
  for (let i = cauda.length - 1; i >= 0; i--) {
    const s = cauda[i];
    pxElipse(b, s[0], s[1] + bob, s[2], s[2], C.casco, { rim: RIM, rimClaro: C.casco[3], tex: listras });
    pxPonto(b, s[0] - 1, s[1] + bob - 1, C.casco[4]);
  }
  // bulbo e ferrão
  const fe = p.ferr;
  const ult = cauda[cauda.length - 1];
  pxMembro(b, ult[0] + 1, ult[1] + bob + 1, fe[0], fe[1] + bob, 3.4, 0.5, C.veneno, { rim: "#2a1260" });
  pxElipse(b, ult[0] + 1.2, ult[1] + bob + 1.2, 3.6, 3.6, C.veneno, { rim: "#2a1260" });
  pxPonto(b, fe[0], fe[1] + bob, C.gota[3]);
  if (p.gota) {
    pxPonto(b, fe[0], fe[1] + bob + 2, C.gota[2]);
    pxPonto(b, fe[0], fe[1] + bob + 3.5, C.gota[1]);
  }

  // abdômen em placas, afinando para trás
  [[9.5, 28, 4, 4.4], [14.5, 27.5, 5, 5.2], [20, 27, 6, 5.8]].forEach(function(s) {
    pxElipse(b, s[0], s[1] + bob, s[2], s[3], C.casco, { rim: RIM, rimClaro: C.casco[3], tex: listras });
    pxPonto(b, s[0] - 1, s[1] + bob - s[3] + 1.5, C.casco[4]);
  });
  // carapaça (tórax) alta e larga
  pxElipse(b, 28.5, 26 + bob, 11, 7.8, C.casco, { rim: RIM, rimClaro: C.casco[3], tex: listras });
  // gemas de lápis-lazúli em cada placa
  [[20, 25], [14.5, 25.5], [9.5, 26.5]].forEach(function(g) {
    pxElipse(b, g[0], g[1] + bob, 1.4, 1.4, C.azul, { rim: "#0b2a63" });
  });

  // pernas da frente (lado de perto): quadril, joelho para cima e para fora, pé no chão
  [[17, 3], [22, 1], [27, -1], [32, -3]].forEach(function(h, i) {
    const f = (i + leg) % 2 ? -1 : 1;
    const kx = h[0] - h[1] * 0.9 + f * 0.5;
    pxMembro(b, h[0], 31, kx, 32.4, 1.5, 1.3, C.perna, { rim: RIM, rimClaro: C.perna[3] });
    pxMembro(b, kx, 32.4, kx - h[1] * 0.4 + f, 35.3, 1.3, 0.8, C.perna, { rim: RIM, rimClaro: C.perna[3] });
  });

  // garras: braço, palma e pinças curvas (a de cima é fixa, a de baixo abre)
  const gx = garra[0], gy = garra[1];
  const ax = 45 + gx, ay = 27 + bob + gy;
  pxMembro(b, 36, 29 + bob, 41 + gx * 0.5, 31 + bob + gy * 0.3, 2.6, 2.4, C.garra, { rim: RIM });
  pxMembro(b, 41 + gx * 0.5, 31 + bob + gy * 0.3, ax, ay, 2.4, 3.2, C.garra, { rim: RIM });
  const ab = pinca;
  // dedo de baixo (abre para baixo) e de cima (fixo, curvado)
  pxMembro(b, ax + 1, ay + 2, ax + 5.5, ay + 3.6 + ab * 3, 2.4, 1.3, C.garra, { rim: RIM });
  pxMembro(b, ax + 5.5, ay + 3.6 + ab * 3, ax + 8.2, ay + 2.2 + ab * 1.2, 1.4, 0.4, C.garra, { rim: RIM });
  pxMembro(b, ax + 1, ay - 2, ax + 5.5, ay - 3.2 - ab * 1.2, 2.6, 1.4, C.garra, { rim: RIM });
  pxMembro(b, ax + 5.5, ay - 3.2 - ab * 1.2, ax + 8.2, ay - 0.6 - ab * 0.4, 1.5, 0.4, C.garra, { rim: RIM });
  pxElipse(b, ax, ay, 4.4, 4.2, C.garra, { rim: RIM, rimClaro: C.garra[3], tex: listras });
  pxLinha(b, ax - 2, ay - 2.5, ax + 1, ay - 3, C.garra[4]);

  // cabeça: touca de faraó (nemes) listrada de azul e ouro sobre a carapaça
  const hx = 31.5, hy = 21 + bob;
  pxPoligono(b, [[hx - 10, hy + 8], [hx - 8, hy - 2], [hx - 3, hy - 5.5], [hx + 5, hy - 5], [hx + 8.5, hy], [hx + 8, hy + 6]], C.azul, { rim: "#0b2a63", curva: 0.6 });
  for (let k = 0; k < 5; k++) pxLinha(b, hx - 9 + k * 2.4, hy + 7, hx - 7.5 + k * 2.4, hy - 3, C.ouro[2]);
  // faixa de ouro na testa + cobra (uraeus)
  pxRet(b, hx - 6, hy - 2, 15, 2, C.ouro[2]);
  pxRet(b, hx - 6, hy - 2, 15, 1, C.ouro[4]);
  pxRet(b, hx - 6, hy, 15, 1, C.ouro[0]);
  pxElipse(b, hx + 9, hy - 3, 1.7, 2.8, C.ouro, { rim: "#5c3a06" });
  pxPonto(b, hx + 9, hy - 4, "#e03131");
  pxPonto(b, hx + 9, hy - 5, "#ff8787");
  // rosto
  const ol = p.olhos || "raiva";
  pxElipse(b, hx + 4.5, hy + 5.8, 5, 3.4, C.casco, { rim: RIM, rimClaro: C.casco[3] });
  if (ol === "fechado") {
    pxLinha(b, hx + 1.5, hy + 4.8, hx + 7.5, hy + 4.8, "#2a1608");
  } else if (ol === "tonto") {
    pxRet(b, hx + 1, hy + 3.5, 3, 3, "#ffffff");
    pxPonto(b, hx + 2, hy + 4.5, "#2a1608");
    pxRet(b, hx + 5.5, hy + 3.5, 3, 3, "#ffffff");
    pxPonto(b, hx + 7, hy + 4.5, "#2a1608");
  } else {
    pxRet(b, hx + 1, hy + 4, 3, 2, "#ff3b3b");
    pxPonto(b, hx + 1, hy + 4, "#fff3bf");
    pxRet(b, hx + 5.5, hy + 4, 3, 2, "#ff3b3b");
    pxPonto(b, hx + 5.5, hy + 4, "#fff3bf");
    pxLinha(b, hx, hy + 2.5, hx + 3.5, hy + 3.7, "#2a1608");
    pxLinha(b, hx + 5, hy + 3.7, hx + 8.5, hy + 2.5, "#2a1608");
  }
  // mandíbulas (quelíceras)
  const abre = p.boca || 0;
  if (abre > 0) pxRet(b, hx + 3.5, hy + 8.3, 3, 1 + abre, "#3a0c10");
  pxMembro(b, hx + 3, hy + 8, hx + 1.5 - abre, hy + 10.6, 1.3, 0.4, C.garra, { rim: RIM });
  pxMembro(b, hx + 7, hy + 8, hx + 8.5 + abre, hy + 10.6, 1.3, 0.4, C.garra, { rim: RIM });

  pxContorno(b, "#1c1006");
  return { b: b, olhos: [[hx + 2.5, hy + 5], [hx + 7, hy + 5]], ferr: [fe[0], fe[1] + bob] };
}

function escorpiaoQuadros() {
  const q = {};
  const T0 = [[8, 28, 3], [4.5, 23, 3], [4, 17, 2.9], [6, 12.5, 2.8], [11, 8, 2.7], [18, 5.8, 2.6], [25, 5.8, 2.5], [30, 8, 2.4]];
  const T0F = [34.5, 15];
  // levemente mais alta (respirando)
  const T1 = T0.map(function(s, i) { return [s[0], s[1] - (i > 3 ? 0.8 : 0), s[2]]; });
  // recuada (preparando o ferrão)
  const TP = [[8, 28, 3], [4, 23.5, 3], [2.5, 18, 2.9], [3, 13, 2.8], [6, 8.5, 2.7], [11, 5.5, 2.6], [16, 5.5, 2.5], [19.5, 7.5, 2.4]];
  const TPF = [21.5, 13];
  // chicote para a frente
  const TA = [[8, 28, 3], [4, 23, 3], [5, 17.5, 2.9], [9, 13, 2.8], [16, 11, 2.7], [23.5, 11, 2.6], [31, 13, 2.5], [37, 16, 2.4]];
  const TAF = [42.5, 21];
  // enrolada baixa (andando)
  const TW = T0.map(function(s, i) { return [s[0] + (i > 3 ? 0.5 : 0), s[1] + 1, s[2]]; });
  const def = {
    parado0: { cauda: T0, ferr: T0F },
    parado1: { cauda: T1, ferr: [T0F[0], T0F[1] - 1], bob: 0.6 },
    andar0: { cauda: TW, ferr: [34.5, 14.5], legs: 0, bob: -0.4, pinca: 0.5 },
    andar1: { cauda: TW, ferr: [34.5, 14.5], legs: 1, bob: 0.2, pinca: 0.2 },
    prep: { cauda: TP, ferr: TPF, pinca: 0.7, bob: 0.4, garra: [0, -2] },
    ferrao: { cauda: TA, ferr: TAF, pinca: 0.9, bob: 0.5, garra: [-1, 0], gota: true },
    rugido: { cauda: T1, ferr: [T0F[0], T0F[1] - 1], pinca: 1, garra: [-2, -8], bob: -0.5, boca: 2 },
    emergir: { cauda: T1, ferr: [T0F[0], T0F[1] - 1], pinca: 1, garra: [-1, -7], bob: -1, boca: 1 },
    tonto: { cauda: TW, ferr: [34.5, 15], olhos: "tonto", bob: 1, pinca: 0.1, garra: [-1, 2] },
    dano: { cauda: T0, ferr: T0F, olhos: "fechado", bob: 0.6, pinca: 0.9, garra: [0, -1] }
  };
  Object.keys(def).forEach(function(k) {
    const r = escorpiaoQuadro(def[k]);
    const s = pxSprite(pxCanvas(r.b, 3));
    s.olhos = r.olhos;
    s.ferr = r.ferr;
    q[k] = s;
  });
  return q;
}

// ---------- Yeti Ancestral (grade 44x48, escala 3 = 132x144) ----------

const COR_YETI = {
  pelo: ["#4d6c9c", "#86a5cc", "#bcd4ec", "#e8f2fc", "#ffffff"],
  pele: ["#26406a", "#3f6a9e", "#6a9ac8", "#9cc4e6"],
  osso: ["#7a6a50", "#b8a688", "#e8dcc0", "#fff8e6"],
  gelo: ["#1d6aa0", "#4fb4e8", "#a0e4ff", "#ffffff"],
  couro: rampaDe("#7a4a28", 4)
};

function yetiQuadro(p) {
  const C = COR_YETI;
  const b = pxNovo(44, 48);
  const bob = p.bob || 0;
  const cab = p.cab || [0, 0];
  const pe = p.pe || [0, 0];
  const tx = p.tx || 0;
  const tex = function(sem) { return pxTexPelo(sem, 0.14); };

  // pernas e pés grandes
  [[14 + tx, pe[0]], [30 + tx, pe[1]]].forEach(function(l, i) {
    pxElipse(b, l[0], 39 + l[1] + bob * 0.5, 7, 6.5, C.pelo, { tex: tex(40 + i) });
    pxElipse(b, l[0] + (i ? 1 : -1), 44.2 + l[1], 7.4, 3.6, C.pelo, { tex: tex(42 + i) });
    // garras dos pés
    for (let k = 0; k < 3; k++) {
      pxPonto(b, l[0] - 4 + (i ? 1 : -1) + k * 3, 46.5 + l[1], C.osso[3]);
      pxPonto(b, l[0] - 4 + (i ? 1 : -1) + k * 3, 47 + l[1], C.osso[1]);
    }
  });

  // tronco
  pxElipse(b, 22 + tx, 29 + bob, 15, 13.5, C.pelo, { tex: tex(11) });
  pxElipse(b, 22 + tx, 33.5 + bob, 9.5, 6.5, C.pelo, { rim: false, luz: 0.15, tex: tex(12) });
  // cristais de gelo nascendo no dorso (aparecem atrás dos ombros)
  // colar de presas e ossos
  const cx0 = 22 + tx;
  pxLinha(b, cx0 - 9, 20 + bob, cx0 - 5, 24 + bob, C.couro[1]);
  pxLinha(b, cx0 + 9, 20 + bob, cx0 + 5, 24 + bob, C.couro[1]);
  pxLinha(b, cx0 - 5, 24 + bob, cx0 + 5, 24 + bob, C.couro[1]);
  [[-8, 21.5], [-5.5, 24.5], [-2.5, 25.5], [0.5, 25.8], [3.5, 25.5], [6.5, 24.5], [9, 21.5]].forEach(function(d, i) {
    const big = i === 3;
    pxMembro(b, cx0 + d[0], d[1] + bob, cx0 + d[0] + (i - 3) * 0.2, d[1] + bob + (big ? 4.5 : 3.2), 1.2, 0.3, C.osso, { rim: "#4a3e2a" });
  });
  pxElipse(b, cx0 + 0.5, 25.5 + bob, 2.4, 2.4, C.gelo, { rim: "#0e3a60" });

  // braços
  const br = p.br || {};
  const bE = br.e || [4, 29, 5, 37];
  const bD = br.d || [40, 29, 39, 37];
  function braco(sx, sy, a, esq) {
    a = esq ? [Math.max(a[0], 6), a[1], Math.max(a[2], 7.5), a[3]] : [Math.min(a[0], 38), a[1], Math.min(a[2], 36.5), a[3]];
    pxElipse(b, sx, sy, 7.4, 6.6, C.pelo, { tex: tex(esq ? 51 : 52) });
    pxMembro(b, sx, sy + 1, a[0], a[1], 6, 5.4, C.pelo, { tex: tex(esq ? 53 : 54) });
    pxMembro(b, a[0], a[1], a[2], a[3], 5.4, 4.8, C.pelo, { tex: tex(esq ? 55 : 56) });
    // mão peluda com garras
    pxElipse(b, a[2], a[3] + 1.5, 5.4, 5, C.pelo, { tex: tex(esq ? 57 : 58) });
    for (let k = 0; k < 3; k++) {
      pxRet(b, a[2] - 3 + k * 3, a[3] + 5.5, 1, 2, C.osso[2]);
      pxPonto(b, a[2] - 3 + k * 3, a[3] + 7.5, C.osso[3]);
    }
    // pulseira de gelo
    pxLinha(b, a[2] - 3, a[3] - 2, a[2] + 3, a[3] - 2, C.gelo[2]);
    pxLinha(b, a[2] - 3, a[3] - 1, a[2] + 3, a[3] - 1, C.gelo[0]);
  }
  braco(8 + tx, 21 + bob, bE, true);
  braco(36 + tx, 21 + bob, bD, false);
  // cristais de gelo nos ombros
  function cristal(x, base, h, w, inc) {
    pxPoligono(b, [[x - w, base], [x - w, base - h * 0.65], [x + inc, base - h], [x + w, base - h * 0.65], [x + w, base]], C.gelo, { rim: "#0e3a60", curva: 0.2, luz: 0.3 });
    pxPoligono(b, [[x, base], [x + inc * 0.5, base - h * 0.85], [x + w, base - h * 0.65], [x + w, base]], [C.gelo[0], C.gelo[1], C.gelo[1], C.gelo[2]], { rim: false, curva: 0, luz: -0.1 });
    pxLinha(b, x - w + 1, base - 2, x - w + 1, base - h * 0.6, "#ffffff");
  }
  [[3.6, 17, 7.5, 2.2, -1], [7.6, 16, 11, 2.5, 0], [11.6, 17, 7, 2.1, 1], [32.4, 17, 7, 2.1, -1], [36.4, 16, 11, 2.5, 0], [40.4, 17, 7.5, 2.2, 1]].forEach(function(k) {
    cristal(k[0] + tx, k[1] + bob, k[2], k[3], k[4]);
  });

  // cabeça
  const hx = 22 + tx + cab[0];
  const hy = 12.5 + bob + cab[1];
  // chifres de osso
  pxMembro(b, hx - 8, hy - 2, hx - 11.5, hy - 8.5, 2.4, 0.6, C.osso, { rim: "#4a3e2a" });
  pxMembro(b, hx + 8, hy - 2, hx + 11.5, hy - 8.5, 2.4, 0.6, C.osso, { rim: "#4a3e2a" });
  pxElipse(b, hx, hy, 10, 8.6, C.pelo, { tex: tex(61) });
  // topete
  pxPoligono(b, [[hx - 5, hy - 6], [hx - 3, hy - 11], [hx - 1, hy - 7.5], [hx + 1.5, hy - 11.5], [hx + 3, hy - 7], [hx + 5.5, hy - 10], [hx + 6, hy - 5]], C.pelo, { rim: C.pelo[0], curva: 0.4 });
  // rosto de pele azul
  pxElipse(b, hx, hy + 2.8, 7.4, 5.8, C.pele, { rim: "#14284a", tex: pxTexPelo(62, 0.08) });
  // testa carregada
  pxRet(b, hx - 6, hy - 0.5, 4, 1, "#14284a");
  pxRet(b, hx + 2, hy - 0.5, 4, 1, "#14284a");
  // olhos
  const ol = p.olhos || "raiva";
  [hx - 4.5, hx + 1.5].forEach(function(ex, i) {
    const ey = hy + 1.5;
    if (ol === "fechado") pxRet(b, ex, ey + 1, 3, 1, "#0a1428");
    else if (ol === "tonto") {
      pxRet(b, ex - 0.5, ey - 0.5, 4, 3.5, "#ffffff");
      pxPonto(b, ex + 1, ey + 1, "#0a1428");
    } else if (ol === "arregala") {
      pxRet(b, ex - 0.5, ey - 0.5, 4, 3.5, "#fff3bf");
      pxRet(b, ex + 1, ey + 0.5, 2, 2, "#e03131");
    } else {
      pxRet(b, ex, ey, 3, 2, "#ff5a3c");
      pxPonto(b, ex + (i ? 0 : 2), ey, "#fff3bf");
      pxLinha(b, ex - (i ? 0 : 1), ey - 1 - (i ? 0 : 0), ex + 3 + (i ? 1 : 0), ey - (i ? 1 : 1), "#0a1428");
      pxPonto(b, ex + (i ? 3 : -1), ey + (i ? -2 : 0), "#0a1428");
    }
  });
  // nariz
  pxRet(b, hx - 1, hy + 4.2, 2, 1, "#14284a");
  // boca com presas
  const my = hy + 7.2;
  if (p.boca === 2) {
    pxElipse(b, hx, my + 0.8, 5.4, 3.8, ["#1a0610", "#3a0c1a", "#6a1428", "#8c2038"], { rim: "#1a0610", pont: 0 });
    pxRet(b, hx - 4, my - 2, 8, 1, "#ffffff");
    pxPonto(b, hx - 4, my - 1, "#ffffff"); pxPonto(b, hx - 3, my - 1, "#ffffff");
    pxPonto(b, hx + 3, my - 1, "#ffffff"); pxPonto(b, hx + 2, my - 1, "#ffffff");
    pxRet(b, hx - 3, my + 1.5, 6, 1, "#ff6b8b");
    pxPonto(b, hx - 4, my + 2, "#ffffff"); pxPonto(b, hx + 3, my + 2, "#ffffff");
  } else if (p.boca === 1) {
    pxRet(b, hx - 4, my - 1, 8, 2, "#2a0816");
    pxRet(b, hx - 4, my - 1, 8, 1, "#ffffff");
    pxPonto(b, hx - 4, my, "#ffffff"); pxPonto(b, hx + 3, my, "#ffffff");
    pxRet(b, hx - 2, my, 4, 1, "#c2255c");
  } else {
    pxRet(b, hx - 4, my, 8, 1, "#2a0816");
    pxPonto(b, hx - 4, my - 1, "#ffffff"); pxPonto(b, hx + 3, my - 1, "#ffffff");
    pxPonto(b, hx - 4, my - 2, "#ffffff"); pxPonto(b, hx + 3, my - 2, "#ffffff");
  }

  pxFiapos(b, 0.32, 9, null, [C.pelo[2], C.pelo[3], C.pelo[1]]);
  pxContorno(b, "#13243f");
  return { b: b, olhos: [[hx - 3, hy + 2.5], [hx + 3, hy + 2.5]] };
}

function yetiQuadros() {
  const q = {};
  const def = {
    parado0: {},
    parado1: { bob: 0.8, br: { e: [4, 30, 5, 38], d: [40, 30, 39, 38] }, cab: [0, 0.4] },
    andar0: { bob: -0.5, pe: [-1, 0], br: { e: [4, 29, 8, 36], d: [40, 29, 38, 38] }, tx: -0.5 },
    andar1: { bob: -0.5, pe: [0, -1], br: { e: [4, 29, 5, 38], d: [40, 29, 42, 35] }, tx: 0.5 },
    // empurrando a bola de neve: braços para a frente
    empurra: { bob: 1.5, cab: [1, 1], br: { e: [6, 31, 14, 36], d: [38, 28, 41, 36] }, boca: 1 },
    prep: { bob: 2, cab: [0, 1], br: { e: [3, 17, 8, 7], d: [41, 17, 36, 7] } },
    pulo: { bob: -1, pe: [-3, -3], br: { e: [3, 19, 8, 9], d: [41, 19, 36, 9] }, boca: 1 },
    pouso: { bob: 3, cab: [0, 2], br: { e: [3, 34, 3, 40], d: [41, 34, 41, 40] }, boca: 1 },
    rugido: { bob: -1, cab: [0, -1.4], br: { e: [3, 27, 6, 18], d: [41, 27, 38, 18] }, boca: 2 },
    deslize0: { bob: 6, tx: 2, cab: [4, 5], pe: [-2, 0], br: { e: [4, 33, 12, 40], d: [40, 33, 36, 41] }, boca: 1 },
    deslize1: { bob: 6, tx: 2, cab: [4, 5], pe: [0, -2], br: { e: [4, 33, 6, 41], d: [40, 33, 42, 40] }, boca: 1 },
    tonto: { bob: 3, cab: [-1, 3], olhos: "tonto", br: { e: [3, 31, 6, 39], d: [41, 31, 38, 39] }, pe: [1, 0] },
    dano: { bob: 1, cab: [-1, 1], olhos: "fechado", boca: 1, br: { e: [4, 27, 9, 31], d: [40, 27, 35, 31] } }
  };
  Object.keys(def).forEach(function(k) {
    const r = yetiQuadro(def[k]);
    const s = pxSprite(pxCanvas(r.b, 3));
    s.olhos = r.olhos;
    q[k] = s;
  });
  return q;
}

// ---------- Dragão de Magma (corpo 64x36, escala 3 = 192x108; asas em outro sprite) ----------

const COR_DRAGAO = {
  escama: ["#3d0a12", "#7a1420", "#b8242a", "#e04a3a", "#ff8a5a"],
  barriga: ["#8a3a14", "#d8681a", "#ffa44a", "#ffd98a"],
  chifre: ["#140c10", "#2e2028", "#4e3c46", "#7e6874"],
  espinho: ["#7a2a0a", "#e0701e", "#ffb347", "#fff0b0"],
  membrana: ["#3a0c16", "#6a1624", "#962434", "#c23a3e"],
  osso: ["#2a1218", "#4a2430", "#7a4650", "#a8707a"],
  fogo: ["#c2410c", "#ff7a1a", "#ffd25a", "#fff6c8"]
};

function escamasTex(x, y, i) {
  return (y & 1) === 1 && (x + (((y >> 1) & 1) * 2)) % 4 === 0 ? i - 1 : i;
}

// Pose: cab = [dx, dy] da cabeça, boca 0-2, pernas "recolhidas"|"pouso"|"frente", cauda = deslocamento y da ponta,
// bob, olhos "raiva"|"fechado"|"cansado"|"tonto", peito = brilho no peito (0-1)
function dragaoQuadro(p) {
  const C = COR_DRAGAO;
  const b = pxNovo(64, 36);
  const bob = p.bob || 0;
  const cab = p.cab || [0, 0];
  const pernas = p.pernas || "recolhidas";
  const ct = p.cauda || 0;
  const RIM = "#1a0508";

  // cauda comprida terminando em chama / ponta de lança
  const tc = [[14, 23 + bob, 4.4], [9, 25 + bob, 3.6], [5, 25 + ct * 0.4 + bob, 2.8], [2.5, 22 + ct + bob, 2]];
  for (let i = 0; i < tc.length - 1; i++) pxMembro(b, tc[i][0], tc[i][1], tc[i + 1][0], tc[i + 1][1], tc[i][2], tc[i + 1][2], C.escama, { rim: RIM, tex: escamasTex });
  const pt = tc[tc.length - 1];
  pxPoligono(b, [[pt[0] - 1, pt[1] - 2], [pt[0] + 1.5, pt[1] - 6], [pt[0] + 3, pt[1] - 1], [pt[0] + 2, pt[1] + 3], [pt[0] - 1, pt[1] + 2.5]], C.fogo, { rim: "#7a1a06", curva: 0.4, luz: 0.3 });
  pxPonto(b, pt[0] + 1, pt[1] - 3, C.fogo[3]);
  // espinhos da cauda
  [[12, 19.5], [8, 22], [5, 23]].forEach(function(e, i) {
    pxPoligono(b, [[e[0] - 1.8, e[1] + bob + 1], [e[0] - 0.5, e[1] + bob - 3 + i * 0.5], [e[0] + 1.8, e[1] + bob + 1]], C.espinho, { rim: "#5a1a04", curva: 0.3 });
  });

  // perna de trás (lado de trás, mais escura)
  const pe = pernas === "pouso" ? 35 : pernas === "frente" ? 29 : 31;
  pxMembro(b, 25, 27 + bob, 24, pe - 2, 4.2, 2.2, C.escama, { rim: RIM, luz: -0.3, tex: escamasTex });

  // espinhos do dorso (atrás do corpo)
  [[35.5, 13], [32, 10.5], [28, 9.5], [24, 9.5], [20, 10.5], [16.5, 12.5]].forEach(function(e, i) {
    const h = 4.2 - Math.abs(i - 2) * 0.35;
    pxPoligono(b, [[e[0] - 2.2, e[1] + bob + 3], [e[0] - 0.6, e[1] + bob - h + 3], [e[0] + 2.2, e[1] + bob + 3]], C.espinho, { rim: "#5a1a04", curva: 0.3 });
  });

  // pescoço (S) e tronco
  pxMembro(b, 37, 19 + bob, 41 + cab[0] * 0.5, 14 + bob + cab[1] * 0.5, 5.6, 5, C.escama, { rim: RIM, tex: escamasTex });
  pxElipse(b, 27, 22 + bob, 15.5, 9.8, C.escama, { rim: RIM, rimClaro: C.escama[3], tex: escamasTex });
  // barriga em placas
  pxElipse(b, 29, 27.5 + bob, 13.5, 5.2, C.barriga, { rim: false });
  for (let k = 0; k < 5; k++) pxLinha(b, 22 + k * 3.8, 27 + bob, 22.5 + k * 3.8, 31.5 + bob, C.barriga[1]);
  // peito brilhando (preparando o sopro)
  if (p.peito) pxElipse(b, 37, 22 + bob, 3.6, 3.6, C.fogo, { rim: false, luz: 0.4 * p.peito });
  // rachaduras de magma nas escamas
  [[18, 18], [22, 15], [26, 19], [30, 15.5], [33, 19]].forEach(function(r, i) {
    pxPonto(b, r[0], r[1] + bob, C.fogo[1]);
    pxPonto(b, r[0] + 1, r[1] + bob + 1, C.fogo[2]);
    if (i % 2) pxPonto(b, r[0] + 1, r[1] + bob, C.fogo[0]);
  });

  // pernas: coxa e pé de perto
  if (pernas === "recolhidas") {
    pxElipse(b, 20, 27 + bob, 6, 5.4, C.escama, { rim: RIM, rimClaro: C.escama[3], tex: escamasTex });
    pxMembro(b, 21, 29 + bob, 19, 33 + bob, 3.2, 2.2, C.escama, { rim: RIM });
    [-1.5, 0.5, 2.5].forEach(function(d) { pxPoligono(b, [[19 + d - 0.8, 33 + bob], [19 + d - 2, 35.5 + bob], [19 + d + 0.8, 34 + bob]], C.chifre, { rim: false }); });
  } else {
    const py = pernas === "pouso" ? 35 : 33;
    pxElipse(b, 20, 27 + bob, 6.4, 5.8, C.escama, { rim: RIM, rimClaro: C.escama[3], tex: escamasTex });
    pxMembro(b, 21, 29 + bob, 19, py - 2, 3.4, 2.6, C.escama, { rim: RIM });
    pxElipse(b, 17.5, py - 0.5, 4.6, 1.8, C.escama, { rim: RIM });
    [-3, -1, 1].forEach(function(d) { pxRet(b, 15 + d + 1, py, 1, 1.6, C.osso[3]); });
  }

  // braço dianteiro, com as garras que seguram a banana (fica em "mao")
  pxMembro(b, 35, 24 + bob, 39, 28.5 + bob, 3.4, 2.8, C.escama, { rim: RIM, tex: escamasTex });

  // cabeça
  const hx = 47 + cab[0] * 0.8, hy = 10 + bob + cab[1];
  const ab = p.boca || 0;
  // chifres para trás
  pxMembro(b, hx - 3, hy - 3, hx - 10, hy - 9, 2.6, 0.5, C.chifre, { rim: "#0a0508", rimClaro: C.chifre[3] });
  pxMembro(b, hx - 0.5, hy - 4, hx - 5.5, hy - 11, 2.2, 0.4, C.chifre, { rim: "#0a0508", rimClaro: C.chifre[3] });
  // mandíbula de baixo (abre)
  pxMembro(b, hx + 1, hy + 4, hx + 9, hy + 5.4 + ab * 2.4, 2.8, 1.5, C.escama, { rim: RIM, luz: -0.2 });
  if (ab > 0) {
    // interior da boca em brasa
    pxElipse(b, hx + 6, hy + 3.4 + ab * 1.2, 3.8, 1.6 + ab * 1.1, C.fogo, { rim: "#5a0a04", pont: 0 });
    for (let k = 0; k < 3; k++) pxPonto(b, hx + 5 + k * 2, hy + 5.2 + ab * 2.3, "#fff6e0");
  }
  // crânio e focinho
  pxElipse(b, hx, hy, 7.8, 5.8, C.escama, { rim: RIM, rimClaro: C.escama[3], tex: escamasTex });
  pxMembro(b, hx + 3, hy + 0.5, hx + 10, hy + 1.2, 4.2, 3.1, C.escama, { rim: RIM, rimClaro: C.escama[3], tex: escamasTex });
  // narina e sobrancelha
  pxPonto(b, hx + 10.5, hy - 0.3, "#1a0508");
  pxPonto(b, hx + 10.5, hy + 0.7, ab > 0 ? C.fogo[2] : "#1a0508");
  // dentes de cima
  if (ab > 0) for (let k = 0; k < 3; k++) pxRet(b, hx + 5 + k * 2, hy + 3.6, 1, 1.5, "#fff6e0");
  else for (let k = 0; k < 2; k++) pxRet(b, hx + 6 + k * 2.5, hy + 3.8, 1, 1, "#fff6e0");
  // olho
  const ol = p.olhos || "raiva";
  const ex = hx + 2.8, ey = hy - 0.8;
  if (ol === "fechado") pxLinha(b, ex - 1, ey + 1, ex + 2.5, ey + 1, "#1a0508");
  else if (ol === "tonto") { pxRet(b, ex - 1, ey - 0.5, 4, 3, "#ffffff"); pxPonto(b, ex + 1, ey + 0.5, "#1a0508"); }
  else if (ol === "cansado") { pxRet(b, ex - 1, ey + 0.5, 4, 1.5, "#ffd43b"); pxPonto(b, ex + 1, ey + 1, "#1a0508"); pxLinha(b, ex - 1.5, ey, ex + 3, ey, "#1a0508"); }
  else {
    pxRet(b, ex - 1, ey - 0.5, 4, 2.5, "#ffe066");
    pxPonto(b, ex + 1, ey, "#1a0508"); pxPonto(b, ex + 1, ey + 1, "#1a0508");
    pxPonto(b, ex - 1, ey - 0.5, "#fffbe0");
    pxLinha(b, ex - 2.5, ey - 2.5, ex + 3, ey - 0.8, "#1a0508");
  }
  // barbela / franja de espinhos atrás da cabeça
  [[-5, 3], [-3.5, 5.5]].forEach(function(f) {
    pxPoligono(b, [[hx + f[0] - 1.5, hy + f[1] - 1], [hx + f[0] - 4, hy + f[1] + 1.5], [hx + f[0] + 0.5, hy + f[1] + 2]], C.espinho, { rim: "#5a1a04", curva: 0.3 });
  });

  pxFiapos(b, 0.0, 1);
  pxContorno(b, "#14040a");

  // garras que seguram a banana: desenhadas à parte, por cima dela
  const m = pxNovo(64, 36);
  const mx = 41.5, my = 29.5 + bob;
  pxElipse(m, mx - 1, my, 4.2, 2.8, C.escama, { rim: RIM, rimClaro: C.escama[3], tex: escamasTex });
  [0, 1, 2].forEach(function(k) {
    pxMembro(m, mx + 0.5 + k * 2, my + 1.4, mx + 3 + k * 2, my + 4.2, 1.3, 0.5, C.osso, { rim: "#0a0508", rimClaro: C.osso[3] });
  });
  pxContorno(m, "#14040a");

  return { b: b, mao: m, olhos: [[ex + 1, ey + 1]], boca: [hx + 10, hy + 5] };
}

function dragaoQuadros() {
  const q = {};
  const def = {
    voar0: { cab: [0, 0], bob: 0 },
    voar1: { cab: [0, 0.8], bob: 0.6, cauda: 1 },
    sopro0: { cab: [1, -1], boca: 1, peito: 0.8, bob: -0.4 },
    sopro1: { cab: [2, -1.5], boca: 2, peito: 1, bob: -0.4 },
    rugido: { cab: [-1, -3], boca: 2, bob: -1, cauda: -1 },
    mergulho: { cab: [2, 3], boca: 1, pernas: "frente", cauda: -2, bob: 0 },
    pouso: { pernas: "pouso", cab: [0, 1], bob: 0 },
    pouso1: { pernas: "pouso", cab: [0, 2], bob: 0.6, olhos: "cansado", cauda: 1 },
    pouso2: { pernas: "pouso", cab: [0, 2.5], bob: 0.6, olhos: "cansado", boca: 1, cauda: 1 },
    dano: { cab: [-1, 1], olhos: "fechado", boca: 1, bob: 0.5 },
    tonto: { cab: [-1, 2], olhos: "tonto", bob: 0.8, pernas: "pouso" }
  };
  Object.keys(def).forEach(function(k) {
    const r = dragaoQuadro(def[k]);
    const s = pxSprite(pxCanvas(r.b, 3));
    const mao = pxCanvas(r.mao, 3);
    s.mao = { d: mao, e: espelhar(mao) };
    s.olhos = r.olhos;
    s.boca = r.boca;
    q[k] = s;
  });
  return q;
}

// Asa do dragão: um quadro por ângulo de batida (phi: + sobe, - desce); k = escala (asa dobrada = pequena)
function dragaoAsaQuadro(phi, k, escuro) {
  const C = COR_DRAGAO;
  const b = pxNovo(64, 92);
  const rx = 52, ry = 54;
  const ca = Math.cos(phi), sa = Math.sin(phi);
  function P(x, y) { return [rx + (x * ca - y * sa) * k, ry + (x * sa + y * ca) * k]; }
  const W = P(-13, -24), T1 = P(-32, -42), F2 = P(-46, -26), F3 = P(-44, -8), F4 = P(-32, 5), B = P(-9, 9);
  const V1 = P(-34, -30), V2 = P(-39, -14), V3 = P(-33, -1), V4 = P(-20, 2);
  const R = P(0, 0);
  const mem = escuro ? ["#2a0810", "#4a1018", "#6a1a24", "#8a2630"] : C.membrana;
  pxPoligono(b, [R, W, T1, V1, F2, V2, F3, V3, F4, V4, B], mem, { rim: "#120308", curva: 0.35, luz: escuro ? -0.1 : 0.1 });
  // ossos
  const osso = escuro ? ["#1a0a10", "#2e1820", "#4a2a34", "#6a424c"] : C.osso;
  [[R, W, 2.1, 1.7], [W, T1, 1.7, 0.7], [W, F2, 1.2, 0.5], [W, F3, 1.2, 0.5], [W, F4, 1.2, 0.5]].forEach(function(o) {
    pxMembro(b, o[0][0], o[0][1], o[1][0], o[1][1], o[2], o[3], osso, { rim: "#0a0205", rimClaro: osso[3], pont: 0 });
  });
  // garra no punho e brasa nas juntas
  pxElipse(b, W[0], W[1], 1.8 * k, 1.8 * k, C.fogo, { rim: "#5a0a04" });
  if (!escuro) [[T1, 0.7], [F2, 0.6], [F3, 0.6], [F4, 0.6]].forEach(function(t) { pxPonto(b, t[0][0], t[0][1], C.fogo[2]); });
  pxContorno(b, "#0a0205");
  return b;
}

function dragaoAsas() {
  const asas = { quadros: [], rx: 52, ry: 54 };
  [0.5, 0.15, -0.3, -0.75, -1.15].forEach(function(phi) {
    const c = pxCanvas(dragaoAsaQuadro(phi, 1, false), 3);
    const f = pxCanvas(dragaoAsaQuadro(phi - 0.15, 0.95, true), 3);
    asas.quadros.push({ d: c, e: espelhar(c), longe: { d: f, e: espelhar(f) } });
  });
  const dc = pxCanvas(dragaoAsaQuadro(-0.05, 0.5, false), 3);
  const df = pxCanvas(dragaoAsaQuadro(-0.2, 0.46, true), 3);
  asas.dobrada = { d: dc, e: espelhar(dc), longe: { d: df, e: espelhar(df) } };
  return asas;
}
