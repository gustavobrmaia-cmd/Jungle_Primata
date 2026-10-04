"use strict";

// =========================
// ARTE DO CHEFE SECRETO: Saru (macaco lutador de cabelo espetado e quimono laranja, com cauda e bastão)
// e a forma gigante da lua cheia, o Saru Gigante. Desenhos próprios (motor de pixelarte.js).
// Carregado depois de arte.js (usa registrarChefe, SPR_PROJ e ICONES).
// Os ids internos continuam "reiMacaco" / "grandeMacaco" (o save guarda a skin com esse id).
// =========================

const COR_SARU = {
  pelo: rampaDe("#a8652a", 5),
  pele: rampaDe("#f0c79a", 4),
  cabelo: ["#0c0806", "#1e140e", "#2e2018", "#4a3020"],
  quimono: rampaDe("#f08c1a", 4),
  azul: rampaDe("#2563c9", 4),
  bota: rampaDe("#2563c9", 4),
  bastao: rampaDe("#b52020", 4),
  ouro: rampaDe("#f2b705", 5)
};

// Pose (grade 32x34, olhando para a direita):
// bob, tx, cab [dx, dy], pe {t: [quadril x, pé x, pé y], f: [...]}, br {t: [cotovelo x, y, mão x, y], f: [...]},
// bastao [x1, y1, x2, y2] ou null (bastaoAtras: atrás do corpo), olhos, boca 0-2
function saruQuadro(p) {
  const C = COR_SARU;
  const b = pxNovo(32, 34);
  const bob = p.bob || 0;
  const tx = p.tx || 0;
  const cab = p.cab || [0, 0];
  const pe = p.pe || { t: [14, 13, 33], f: [18.5, 20, 33] };
  const br = p.br || { t: [10.5, 21, 10, 25], f: [22, 21, 23.5, 25] };

  // cauda (atrás de tudo)
  const ca = p.cauda || [[13 + tx, 24 + bob], [8, 26 + bob], [4.5, 22 + bob], [4, 16 + bob], [6.5, 12.5 + bob], [9, 14 + bob]];
  for (let i = 0; i < ca.length - 1; i++) {
    pxMembro(b, ca[i][0], ca[i][1], ca[i + 1][0], ca[i + 1][1], 1.7 - i * 0.1, 1.6 - i * 0.1, C.pelo, { tex: pxTexPelo(60 + i, 0.15) });
  }

  const bastao = p.bastao;
  function desenharBastao() {
    if (!bastao) return;
    pxMembro(b, bastao[0], bastao[1], bastao[2], bastao[3], 0.95, 0.95, C.bastao, { rim: "#4a0a0a" });
    pxElipse(b, bastao[0], bastao[1], 1.3, 1.3, C.ouro, { rim: "#5c3a06" });
    pxElipse(b, bastao[2], bastao[3], 1.3, 1.3, C.ouro, { rim: "#5c3a06" });
  }
  if (p.bastaoAtras) desenharBastao();

  // pernas: calça laranja larga e botas azuis
  function perna(l) {
    const hx = l[0] + tx, hy = 24.5 + bob;
    const fx = l[1] + tx, fy = l[2];
    const kx = (hx + fx) / 2 + (fx >= hx ? 1.2 : -1.2), ky = (hy + fy) / 2 - 0.5;
    pxMembro(b, hx, hy, kx, ky, 2.8, 2.5, C.quimono, { tex: pxTexPelo(70, 0.06) });
    pxMembro(b, kx, ky, fx, fy - 2.5, 2.5, 2.2, C.quimono);
    pxElipse(b, fx + 0.8, fy - 1.4, 2.8, 2, C.bota, { rim: "#0e2550" });
  }
  perna(pe.t);

  function braco(a, tras) {
    const sx = (tras ? 12 : 20.5) + tx, sy = 17.5 + bob;
    pxMembro(b, sx, sy, a[0], a[1], 1.9, 1.7, C.pelo, { tex: pxTexPelo(tras ? 71 : 72, 0.15) });
    pxMembro(b, a[0], a[1], a[2], a[3], 1.7, 1.5, C.pelo, { tex: pxTexPelo(tras ? 73 : 74, 0.15) });
    // munhequeira azul
    const mx = a[0] + (a[2] - a[0]) * 0.72, my = a[1] + (a[3] - a[1]) * 0.72;
    pxElipse(b, mx, my, 1.7, 1.7, C.azul, { rim: "#0e2550" });
    pxElipse(b, a[2], a[3], 1.7, 1.6, C.pele, { rim: "#7a4a24" });
  }
  braco(br.t, true);

  // tronco: quimono laranja, gola azul em V e faixa azul na cintura
  pxElipse(b, 16 + tx, 21 + bob, 5.8, 5.6, C.quimono, { rim: "#7a3a00" });
  pxPoligono(b, [[13.2 + tx, 16.3 + bob], [18.8 + tx, 16.3 + bob], [16 + tx, 20.5 + bob]], C.azul, { rim: "#0e2550", curva: 0.4 });
  pxLinha(b, 13 + tx, 16 + bob, 16 + tx, 22 + bob, C.quimono[0]);
  pxRet(b, 10.5 + tx, 24 + bob, 11, 2, C.azul[2]);
  pxRet(b, 10.5 + tx, 25 + bob, 11, 1, C.azul[1]);
  pxRet(b, 9 + tx, 24.5 + bob, 2, 3, C.azul[1]);
  perna(pe.f);

  // cabeça: cabelo espetado escuro por trás, rosto de macaco na frente
  const hx = 17 + tx + cab[0];
  const hy = 10 + bob + cab[1];
  pxPoligono(b, [
    [hx - 6.5, hy + 2], [hx - 10, hy - 1], [hx - 6.5, hy - 2.5], [hx - 9.5, hy - 7], [hx - 4.5, hy - 5.5],
    [hx - 5, hy - 11], [hx - 1, hy - 6.5], [hx + 1.5, hy - 12], [hx + 3, hy - 6.5], [hx + 7, hy - 10],
    [hx + 6, hy - 4.5], [hx + 10, hy - 4], [hx + 7, hy - 1], [hx + 8.5, hy + 2], [hx + 5.5, hy + 1]
  ], C.cabelo, { rim: "#0c0806", curva: 0.35 });
  pxElipse(b, hx - 6.4, hy + 1.6, 1.9, 2.2, C.pele, { rim: "#7a4a24" });
  pxElipse(b, hx + 6.6, hy + 1.6, 1.9, 2.2, C.pele, { rim: "#7a4a24" });
  pxElipse(b, hx, hy + 0.5, 6.2, 5.6, C.pelo, { tex: pxTexPelo(75, 0.12) });
  // franja espetada caindo na testa
  pxPoligono(b, [[hx - 5, hy - 3], [hx - 3, hy + 0.5], [hx - 1.5, hy - 2.5], [hx + 0.5, hy + 1], [hx + 2, hy - 2.5], [hx + 4, hy], [hx + 5, hy - 3.5], [hx, hy - 5]],
    C.cabelo, { rim: false, curva: 0.6 });
  // rosto e focinho
  pxElipse(b, hx + 0.8, hy + 2.4, 4.6, 3.8, C.pele, { rim: "#7a4a24" });
  pxElipse(b, hx + 1.4, hy + 4.2, 2.8, 1.6, C.pele, { rim: false, luz: 0.25 });
  pxPonto(b, hx + 1, hy + 3.4, "#5c3018");
  pxPonto(b, hx + 2, hy + 3.4, "#5c3018");

  const ol = p.olhos || "normal";
  const olhos = [[hx - 1.5, hy + 1], [hx + 2.5, hy + 1]];
  olhos.forEach(function(o, i) {
    const ex = o[0], ey = o[1];
    if (ol === "fechado") {
      pxRet(b, ex - 0.5, ey + 1, 2, 1, "#2a1608");
    } else if (ol === "tonto") {
      pxRet(b, ex - 0.5, ey, 2, 2, "#ffffff");
      pxPonto(b, ex, ey + 1, "#2a1608");
    } else if (ol === "arregala") {
      pxRet(b, ex - 0.5, ey - 0.5, 2, 2.5, "#ffffff");
      pxPonto(b, ex + 0.5, ey - 0.5, "#2a1608");
    } else if (ol === "vermelho") {
      pxRet(b, ex - 0.5, ey, 2, 2, "#ff2a2a");
      pxPonto(b, ex + 0.5, ey, "#ffd0d0");
      pxPonto(b, ex + (i ? 1 : -1), ey - 1, "#0c0806");
    } else {
      pxRet(b, ex - 0.5, ey, 2, 2, "#ffffff");
      pxPonto(b, ex + 0.5, ey + 1, "#1a0e08");
      // sobrancelha de lutador
      pxPonto(b, ex + (i ? 1 : -1), ey - 1, "#0c0806");
      pxPonto(b, ex, ey - 1, "#0c0806");
    }
  });
  const my = hy + 5.4;
  if (p.boca === 2) {
    pxRet(b, hx, my - 0.5, 3, 2, "#3a0c10");
    pxRet(b, hx, my - 0.5, 3, 1, "#ffffff");
  } else if (p.boca === 1) {
    pxRet(b, hx + 0.5, my, 2, 1, "#3a0c10");
  } else {
    pxPonto(b, hx, my, "#5c3018");
    pxRet(b, hx + 1, my + 0.5, 2, 1, "#5c3018");
    pxPonto(b, hx + 3, my, "#5c3018");
  }

  if (!p.bastaoAtras) desenharBastao();
  braco(br.f, false);

  pxFiapos(b, 0.25, 76, null, [C.pelo[1], C.pelo[2]]);
  pxContorno(b, "#140c06");
  const maos = [br.t.slice(2), br.f.slice(2)];
  return { b: b, olhos: olhos.map(function(o) { return [o[0] + 0.5, o[1] + 1]; }), maos: maos };
}

function saruQuadros() {
  const q = {};
  const nasCostas = [5, 6, 24, 27];
  const def = {
    parado0: { bastaoAtras: true, bastao: nasCostas },
    parado1: { bob: 0.7, bastaoAtras: true, bastao: nasCostas, br: { t: [10.5, 21.5, 10, 25.5], f: [22, 21.5, 23.5, 25.5] } },
    corre0: { tx: 1, pe: { t: [14, 10, 32], f: [18.5, 23, 33] }, bastaoAtras: true, bastao: nasCostas,
      br: { t: [9.5, 19, 7, 22], f: [22, 22, 25, 20] }, olhos: "raiva" },
    corre1: { tx: 1, bob: -0.5, pe: { t: [14, 15, 33], f: [18.5, 17, 31] }, bastaoAtras: true, bastao: nasCostas,
      br: { t: [10, 20, 9, 24], f: [22, 21, 24, 24] }, olhos: "raiva" },
    salto: { bob: -1, pe: { t: [14, 12, 29], f: [18.5, 20, 29] }, bastaoAtras: true, bastao: nasCostas,
      br: { t: [11, 13, 12, 7], f: [22, 13, 24, 7] }, boca: 2 },
    // voadora: perna da frente esticada
    chute: { tx: -1, bob: -1, cab: [-1, 0], pe: { t: [14, 11, 30], f: [19, 31, 26] }, bastaoAtras: true, bastao: nasCostas,
      br: { t: [10, 17, 6, 15], f: [21, 17, 18, 13] }, boca: 2 },
    // juntando energia nas mãos, atrás do quadril
    carrega: { bob: 1.5, cab: [-1, 1], pe: { t: [13, 9, 33], f: [19, 23, 33] }, bastaoAtras: true, bastao: nasCostas,
      br: { t: [10, 22, 9, 25], f: [16, 23, 11, 24.5] }, boca: 1 },
    // empurra as duas mãos para a frente (solta a rajada)
    rajada: { tx: 1, cab: [1, 0], pe: { t: [13, 9, 33], f: [19, 23, 33] }, bastaoAtras: true, bastao: nasCostas,
      br: { t: [16, 19, 27, 18], f: [24, 20, 29, 20] }, boca: 2 },
    estocada: { tx: 1, pe: { t: [14, 10, 33], f: [18.5, 22, 33] }, bastao: [16, 19, 31.5, 19],
      br: { t: [11, 20, 14, 19.5], f: [24, 19, 27, 19] }, boca: 1 },
    // agachado em cima da nuvem
    nuvem: { bob: 1.5, pe: { t: [13, 11, 32], f: [19, 21, 32] }, bastaoAtras: true, bastao: nasCostas,
      br: { t: [11, 21, 13, 24], f: [21, 21, 19, 24] } },
    tonto: { bob: 1.5, cab: [-1, 1], olhos: "tonto", boca: 1, bastaoAtras: true, bastao: nasCostas,
      br: { t: [10, 22, 9, 27], f: [22, 22, 23, 27] }, pe: { t: [14, 12, 33], f: [18.5, 21, 33] } },
    dano: { bob: 1, cab: [-1, 0.5], olhos: "fechado", boca: 2, bastaoAtras: true, bastao: nasCostas,
      br: { t: [10, 19, 8, 17], f: [22, 21, 24, 20] } },
    lua: { cab: [0, -1], olhos: "arregala", boca: 1, bastaoAtras: true, bastao: nasCostas,
      br: { t: [10.5, 22, 10, 26], f: [21.5, 22, 22, 26] } },
    transforma: { bob: 2.5, cab: [0, 1.5], olhos: "vermelho", boca: 2, bastaoAtras: true, bastao: nasCostas,
      br: { t: [9, 18, 10, 14], f: [23, 18, 22, 14] }, pe: { t: [13, 10, 33], f: [19, 22, 33] } }
  };
  Object.keys(def).forEach(function(k) {
    const r = saruQuadro(def[k]);
    const s = pxSprite(pxCanvas(r.b, 3));
    s.olhos = r.olhos;
    s.maos = r.maos;
    q[k] = s;
  });
  return q;
}


// ---------- Saru Gigante (grade 56x52, escala 4 = 224x208) ----------

const COR_GIGANTE = {
  pelo: rampaDe("#6b3f1f", 5),
  juba: rampaDe("#3a2416", 4),
  peito: rampaDe("#a87a52", 4),
  pele: rampaDe("#c9966a", 4),
  quimono: rampaDe("#e8821a", 4),
  azul: rampaDe("#2563c9", 4)
};

// Pose: bob, cab [dx, dy], pe [dy esq, dy dir], br {e: [cotovelo x, y, punho x, y], d: [...]}, boca 0-2, olhos
function giganteQuadro(p) {
  const C = COR_GIGANTE;
  const b = pxNovo(56, 52);
  const bob = p.bob || 0;
  const cab = p.cab || [0, 0];
  const pe = p.pe || [0, 0];
  const br = p.br || { e: [11, 32, 10, 41], d: [45, 32, 46, 41] };

  // cauda grossa balançando atrás (à esquerda)
  const k = p.cauda || 0;
  const ca = [[18, 38 + bob], [10, 41 + bob], [4, 36 + bob], [3, 27 + bob + k], [7, 20 + bob + k], [11, 21 + bob + k]];
  for (let i = 0; i < ca.length - 1; i++) {
    pxMembro(b, ca[i][0], ca[i][1], ca[i + 1][0], ca[i + 1][1], 3 - i * 0.3, 2.8 - i * 0.3, C.pelo, { tex: pxTexPelo(80 + i, 0.2) });
  }

  // juba espetada nos ombros e na nuca (atrás do corpo)
  const hx = 30 + cab[0];
  const hy = 15 + bob + cab[1];
  pxPoligono(b, [
    [12, 26 + bob], [9, 19 + bob], [15, 20 + bob], [14, 12 + bob], [20, 15 + bob], [21, 6 + bob + cab[1] * 0.5], [26, 10 + bob + cab[1] * 0.5],
    [29, 2 + bob + cab[1]], [33, 9 + bob + cab[1]], [39, 4 + bob + cab[1] * 0.5], [39, 12 + bob], [45, 11 + bob], [43, 18 + bob], [48, 21 + bob], [44, 26 + bob]
  ], C.juba, { rim: "#140c06", curva: 0.6 });

  // pernas curtas e grossas
  [[20, pe[0]], [36, pe[1]]].forEach(function(l, i) {
    pxElipse(b, l[0], 43 + l[1] + bob * 0.4, 6.5, 6.5, C.pelo, { tex: pxTexPelo(85 + i) });
    pxElipse(b, l[0] + 1, 49 + l[1], 6.5, 2.8, C.pele, { rim: "#3a2214" });
  });

  // restos da calça laranja e faixa azul
  pxPoligono(b, [[13, 37 + bob], [43, 37 + bob], [45, 44 + bob], [41, 42 + bob], [38, 45 + bob], [33, 42 + bob],
    [28, 45 + bob], [23, 42 + bob], [18, 45 + bob], [15, 42 + bob], [11, 44 + bob]], C.quimono, { rim: "#7a3a00", curva: 0.5 });
  pxRet(b, 13, 36 + bob, 30, 2, C.azul[2]);
  pxRet(b, 13, 37 + bob, 30, 1, C.azul[1]);

  // tronco curvado, peito claro
  pxElipse(b, 28, 29 + bob, 15.5, 11, C.pelo, { tex: pxTexPelo(88, 0.12) });
  pxElipse(b, 29, 31 + bob, 9, 7, C.peito, { rim: false, tex: pxTexPelo(89, 0.1) });
  pxLinha(b, 29, 26 + bob, 29, 35 + bob, C.peito[0]);

  // braços longos (punhos grandes)
  function braco(sx, sy, a, i) {
    pxElipse(b, sx, sy, 6, 5.5, C.pelo, { tex: pxTexPelo(90 + i) });
    pxMembro(b, sx, sy + 1, a[0], a[1], 4.8, 4.2, C.pelo, { tex: pxTexPelo(92 + i, 0.2) });
    pxMembro(b, a[0], a[1], a[2], a[3], 4.2, 3.8, C.pelo, { tex: pxTexPelo(94 + i, 0.2) });
    pxElipse(b, a[2], a[3] + 1, 4.8, 4.2, C.pele, { rim: "#3a2214" });
    pxPonto(b, a[2] - 1.5, a[3] + 3.5, "#3a2214");
    pxPonto(b, a[2] + 1, a[3] + 3.5, "#3a2214");
  }
  braco(15, 23 + bob, br.e, 0);

  // cabeça
  pxElipse(b, hx - 8, hy, 2.4, 2.8, C.pele, { rim: "#3a2214" });
  pxElipse(b, hx + 8.4, hy, 2.4, 2.8, C.pele, { rim: "#3a2214" });
  pxElipse(b, hx, hy - 1, 8.2, 7.4, C.pelo, { tex: pxTexPelo(96, 0.12) });
  // arcada da testa e focinho grande
  pxRet(b, hx - 6, hy - 3, 12, 1.5, C.pelo[0]);
  pxElipse(b, hx + 1, hy + 3.8, 6.8, 4.6, C.peito, { rim: "#3a2214" });
  pxPonto(b, hx, hy + 2, "#2a1608");
  pxPonto(b, hx + 2, hy + 2, "#2a1608");

  const ol = p.olhos || "raiva";
  const olhos = [[hx - 3.5, hy - 1.5], [hx + 2.5, hy - 1.5]];
  olhos.forEach(function(o, i) {
    const ex = o[0], ey = o[1];
    if (ol === "fechado") {
      pxRet(b, ex - 0.5, ey + 0.5, 3, 1, "#1a0e08");
    } else if (ol === "tonto") {
      pxRet(b, ex - 0.5, ey - 0.5, 3, 3, "#ffffff");
      pxPonto(b, ex + 0.5, ey + 0.5, "#1a0e08");
    } else {
      pxRet(b, ex - 0.5, ey, 3, 2, "#ff2a2a");
      pxPonto(b, ex + (i ? 1.5 : 0), ey, "#ffd0d0");
      pxPonto(b, ex + (i ? 2.5 : -1.5), ey - 1, "#140c06");
      pxPonto(b, ex + (i ? 1.5 : -0.5), ey - 1, "#140c06");
    }
  });
  // boca com presas
  const my = hy + 5.6;
  if (p.boca === 2) {
    pxElipse(b, hx + 1, my + 0.5, 4.6, 2.8, ["#1a0608", "#3a0c10", "#5c1018", "#7a1a22"], { rim: "#1a0608", pont: 0 });
    pxRet(b, hx - 2.5, my - 2, 1, 2, "#fff8e8");
    pxRet(b, hx + 3.5, my - 2, 1, 2, "#fff8e8");
    pxRet(b, hx - 1.5, my + 2, 1, 1.5, "#fff8e8");
    pxRet(b, hx + 2.5, my + 2, 1, 1.5, "#fff8e8");
  } else if (p.boca === 1) {
    pxRet(b, hx - 2.5, my - 0.5, 7, 2, "#2a0c10");
    pxRet(b, hx - 2.5, my - 1.5, 1, 2, "#fff8e8");
    pxRet(b, hx + 3.5, my - 1.5, 1, 2, "#fff8e8");
  } else {
    pxRet(b, hx - 2.5, my, 7, 1, "#2a0c10");
    pxRet(b, hx - 2.5, my - 1, 1, 2, "#fff8e8");
    pxRet(b, hx + 3.5, my - 1, 1, 2, "#fff8e8");
  }

  braco(42, 23 + bob, br.d, 1);

  pxFiapos(b, 0.35, 97, null, [C.pelo[1], C.pelo[2], C.juba[1], C.juba[2]]);
  pxContorno(b, "#0b0806");
  return { b: b, olhos: olhos.map(function(o) { return [o[0] + 1, o[1] + 1]; }), boca: [hx + 1, my] };
}

function giganteQuadros() {
  const q = {};
  const def = {
    parado0: { cauda: 0 },
    parado1: { bob: 0.8, cauda: 1.5, br: { e: [11, 33, 10, 42], d: [45, 33, 46, 42] } },
    andar0: { bob: -0.5, pe: [-2, 0], cauda: -1, br: { e: [11, 31, 14, 40], d: [45, 32, 44, 42] } },
    andar1: { bob: -0.5, pe: [0, -2], cauda: 1, br: { e: [11, 32, 9, 42], d: [45, 31, 48, 40] } },
    rugido: { bob: -1, cab: [0, -1.5], boca: 2, cauda: -2, br: { e: [10, 18, 12, 9], d: [46, 18, 44, 9] } },
    sopro: { cab: [3, 1.5], boca: 2, br: { e: [11, 30, 8, 37], d: [45, 30, 49, 36] } },
    pisao: { bob: -1, pe: [0, -7], cauda: 2, boca: 1, br: { e: [9, 26, 5, 31], d: [47, 26, 51, 31] } },
    pisao2: { bob: 2, pe: [0, 0], boca: 2, br: { e: [9, 30, 5, 36], d: [47, 30, 51, 36] } },
    palmas0: { boca: 1, cab: [0, -1], br: { e: [7, 22, 3, 18], d: [49, 22, 53, 18] } },
    palmas1: { bob: 1, boca: 2, br: { e: [18, 26, 26, 23], d: [38, 26, 31, 23] } },
    varrida0: { cab: [-1, 0], boca: 1, br: { e: [11, 32, 10, 41], d: [46, 19, 51, 12] } },
    varrida1: { bob: 2, cab: [2, 2], boca: 2, br: { e: [11, 33, 10, 42], d: [44, 36, 53, 46] } },
    tonto: { bob: 3, cab: [0, 4], olhos: "tonto", boca: 1, br: { e: [12, 36, 10, 47], d: [44, 36, 46, 47] } },
    dano: { bob: 1, cab: [-1, 1], olhos: "fechado", boca: 1, br: { e: [11, 28, 14, 31], d: [45, 28, 42, 31] } }
  };
  Object.keys(def).forEach(function(k) {
    const r = giganteQuadro(def[k]);
    const s = pxSprite(pxCanvas(r.b, 4));
    // o desenho dos chefes mede pontos em "grade x 3": converte da escala 4
    s.olhos = r.olhos.map(function(o) { return [o[0] * 4 / 3, o[1] * 4 / 3]; });
    s.boca = [r.boca[0] * 4 / 3, r.boca[1] * 4 / 3];
    q[k] = s;
  });
  return q;
}

registrarChefe("reiMacaco", saruQuadros(), "parado0");
registrarChefe("grandeMacaco", giganteQuadros(), "parado0");

// Pêssego, esfera de energia (cai da nuvem) e ícone da melhoria Nuvem Mágica
SPR_PROJ.pessego = objCanvas(12, 12, 2, function(b) {
  esferaPx(b, 6, 6.5, 5, ["#a8321e", "#e8603a", "#ff9a76", "#ffd0b8"], { rim: false });
  pxLinha(b, 6, 3, 6, 10, "#c8462a");
  pxRet(b, 6, 0, 1, 2, "#6b4220");
  pxRet(b, 7, 1, 3, 1, "#2f9e44");
  pxRet(b, 8, 0, 2, 1, "#69db7c");
}, "#5a1a10");

SPR_PROJ.esfera = objCanvas(12, 12, 2, function(b) {
  esferaPx(b, 6, 6, 5.2, ["#1c4fd6", "#4dabf7", "#a5d8ff", "#ffffff"], { rim: false });
  pxRet(b, 4, 3, 2, 2, "#ffffff");
}, "#0b2a80");

ICONES.nuvem = objCanvas(16, 16, 2, function(b) {
  const nuvem = ["#8fa8c8", "#d0def0", "#f4f8ff", "#ffffff"];
  esferaPx(b, 5, 9, 3.6, nuvem, { rim: false });
  esferaPx(b, 9, 7.5, 4.4, nuvem, { rim: false });
  esferaPx(b, 12.2, 9.5, 3, nuvem, { rim: false });
  pxRet(b, 3, 10, 11, 2, "#f4f8ff");
  pxRet(b, 4, 12, 10, 1, "#c8d8ee");
}, "#3a4a66");
