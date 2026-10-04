"use strict";

// =========================
// ARTE DO CHEFE SECRETO: Rei Macaco (inspirado na lenda chinesa do Rei Macaco: tiara dourada,
// armadura, bastão e cauda) e a forma gigante, o Grande Macaco (usa as poses do Gorila Rei).
// Carregado depois de arte.js (usa registrarChefe, SPR_PROJ e ICONES).
// =========================

const COR_REI = {
  pelo: rampaDe("#a8652a", 5),
  pele: rampaDe("#f0c79a", 4),
  ouro: rampaDe("#f2b705", 5),
  armadura: rampaDe("#e0a51d", 4),
  roupa: rampaDe("#c92a2a", 4),
  calca: rampaDe("#e8892b", 4),
  bota: rampaDe("#3b2a1e", 4),
  bastao: rampaDe("#b52020", 4)
};

// Pose (grade 32x34, olhando para a direita):
// bob, tx, cab [dx, dy], pe {t: [quadril x, pé x, pé y], f: [...]}, br {t: [cotovelo x, y, mão x, y], f: [...]},
// bastao [x1, y1, x2, y2] ou null, olhos "normal"|"raiva"|"fechado"|"tonto"|"arregala"|"vermelho", boca 0-2, pessego [x, y]
function reiQuadro(p) {
  const C = COR_REI;
  const b = pxNovo(32, 34);
  const bob = p.bob || 0;
  const tx = p.tx || 0;
  const cab = p.cab || [0, 0];
  const pe = p.pe || { t: [14, 13, 33], f: [18.5, 20, 33] };
  const br = p.br || { t: [10.5, 21, 10, 25], f: [22, 21, 23.5, 19] };

  // cauda (atrás de tudo): sai das costas e sobe enrolada
  const ca = p.cauda || [[13 + tx, 24 + bob], [8, 26 + bob], [4.5, 22 + bob], [4, 16 + bob], [6.5, 12.5 + bob], [9, 14 + bob]];
  for (let i = 0; i < ca.length - 1; i++) {
    pxMembro(b, ca[i][0], ca[i][1], ca[i + 1][0], ca[i + 1][1], 1.7 - i * 0.1, 1.6 - i * 0.1, C.pelo, { tex: pxTexPelo(60 + i, 0.15) });
  }
  // faixa vermelha esvoaçando atrás
  pxPoligono(b, [[12 + tx, 15 + bob], [16 + tx, 15.5 + bob], [9 + tx, 22 + bob], [6 + tx, 20 + bob]], C.roupa, { curva: 0.5, rim: "#4a0a12" });

  // bastão por trás do corpo (quando está atrás)
  const bastao = p.bastao;
  function desenharBastao() {
    if (!bastao) return;
    pxMembro(b, bastao[0], bastao[1], bastao[2], bastao[3], 0.95, 0.95, C.bastao, { rim: "#4a0a0a" });
    pxElipse(b, bastao[0], bastao[1], 1.3, 1.3, C.ouro, { rim: "#5c3a06" });
    pxElipse(b, bastao[2], bastao[3], 1.3, 1.3, C.ouro, { rim: "#5c3a06" });
  }
  if (p.bastaoAtras) desenharBastao();

  // pernas: calça laranja e botas
  function perna(l) {
    const hx = l[0] + tx, hy = 24.5 + bob;
    const fx = l[1] + tx, fy = l[2];
    const kx = (hx + fx) / 2 + (fx >= hx ? 1.2 : -1.2), ky = (hy + fy) / 2 - 0.5;
    pxMembro(b, hx, hy, kx, ky, 2.6, 2.3, C.calca, { tex: pxTexPelo(70, 0.08) });
    pxMembro(b, kx, ky, fx, fy - 2, 2.3, 2, C.calca);
    pxElipse(b, fx + 1, fy - 1.2, 2.9, 1.7, C.bota, { rim: "#140c06" });
  }
  perna(pe.t);

  // braço de trás
  function braco(a, tras) {
    const sx = (tras ? 12 : 20.5) + tx, sy = 17.5 + bob;
    pxMembro(b, sx, sy, a[0], a[1], 1.9, 1.7, C.pelo, { tex: pxTexPelo(tras ? 71 : 72, 0.15) });
    pxMembro(b, a[0], a[1], a[2], a[3], 1.7, 1.5, C.pelo, { tex: pxTexPelo(tras ? 73 : 74, 0.15) });
    pxElipse(b, a[2], a[3], 1.7, 1.6, C.pele, { rim: "#7a4a24" });
  }
  braco(br.t, true);

  // tronco: roupa vermelha, armadura dourada e cinto
  pxElipse(b, 16 + tx, 21 + bob, 5.6, 5.4, C.roupa, { rim: "#4a0a12" });
  pxPoligono(b, [[11.2 + tx, 17 + bob], [20.8 + tx, 17 + bob], [21.2 + tx, 23.5 + bob], [16 + tx, 25.5 + bob], [10.8 + tx, 23.5 + bob]], C.armadura, { rim: "#5c3a06", curva: 0.6 });
  pxLinha(b, 16 + tx, 18 + bob, 16 + tx, 24 + bob, C.armadura[0]);
  pxPonto(b, 13 + tx, 19 + bob, C.ouro[4]);
  pxRet(b, 11 + tx, 24 + bob, 10, 2, C.bota[1]);
  pxRet(b, 15 + tx, 24 + bob, 2, 2, C.ouro[3]);
  perna(pe.f);

  // cabeça
  const hx = 17 + tx + cab[0];
  const hy = 10 + bob + cab[1];
  pxElipse(b, hx - 6.6, hy + 1.2, 1.9, 2.3, C.pele, { rim: "#7a4a24" });
  pxElipse(b, hx + 6.6, hy + 1.2, 1.9, 2.3, C.pele, { rim: "#7a4a24" });
  pxElipse(b, hx, hy, 6.6, 6, C.pelo, { tex: pxTexPelo(75, 0.12) });
  // topete de pelo
  pxPoligono(b, [[hx - 3.5, hy - 4.5], [hx - 2, hy - 8], [hx - 0.5, hy - 5.5], [hx + 1.5, hy - 8.5], [hx + 2.5, hy - 5.5], [hx + 4.5, hy - 7], [hx + 4, hy - 4]], C.pelo, { curva: 0.5 });
  // rosto em forma de coração e focinho
  pxElipse(b, hx + 0.8, hy + 1.8, 4.8, 4.2, C.pele, { rim: "#7a4a24" });
  pxElipse(b, hx + 1.4, hy + 3.8, 2.8, 1.7, C.pele, { rim: false, luz: 0.25 });
  pxPonto(b, hx + 1, hy + 3, "#5c3018");
  pxPonto(b, hx + 2, hy + 3, "#5c3018");
  // tiara dourada com rubi e pontas enroladas
  pxRet(b, hx - 6, hy - 3, 13, 1, C.ouro[3]);
  pxRet(b, hx - 6, hy - 2, 13, 1, C.ouro[1]);
  pxPonto(b, hx + 1, hy - 3, "#e03131");
  pxPonto(b, hx + 1, hy - 2, "#8f1212");
  pxPonto(b, hx - 7, hy - 3, C.ouro[2]);
  pxPonto(b, hx - 7, hy - 4, C.ouro[3]);
  pxPonto(b, hx + 7, hy - 3, C.ouro[2]);
  pxPonto(b, hx + 7, hy - 4, C.ouro[3]);

  // olhos
  const ol = p.olhos || "normal";
  const olhos = [[hx - 1.5, hy + 0.5], [hx + 2.5, hy + 0.5]];
  olhos.forEach(function(o, i) {
    const ex = o[0], ey = o[1];
    if (ol === "fechado") {
      pxRet(b, ex - 0.5, ey + 1, 2, 1, "#2a1608");
    } else if (ol === "tonto") {
      pxRet(b, ex - 0.5, ey, 2, 2, "#ffffff");
      pxPonto(b, ex + (i ? 0 : 0.5), ey + 1, "#2a1608");
    } else if (ol === "arregala") {
      pxRet(b, ex - 0.5, ey - 0.5, 2, 2.5, "#ffffff");
      pxPonto(b, ex + 0.5, ey - 0.5, "#2a1608");
    } else if (ol === "vermelho") {
      pxRet(b, ex - 0.5, ey, 2, 2, "#ff2a2a");
      pxPonto(b, ex + 0.5, ey, "#ffd0d0");
      pxPonto(b, ex + (i ? 1 : -1), ey - 1, "#2a1608");
    } else {
      pxRet(b, ex - 0.5, ey, 2, 2, "#ffffff");
      pxPonto(b, ex + 0.5, ey + 1, "#1a0e08");
      if (ol === "raiva") {
        pxPonto(b, ex + (i ? 1 : -1), ey - 1, "#2a1608");
        pxPonto(b, ex, ey - 1, "#2a1608");
      }
    }
  });
  // boca
  const my = hy + 5;
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

  // pêssego na mão
  if (p.pessego) {
    pxElipse(b, p.pessego[0], p.pessego[1], 1.8, 1.8, rampaDe("#ff9a76", 4), { rim: "#8a2a1a" });
    pxPonto(b, p.pessego[0] - 0.5, p.pessego[1] - 2, "#2f9e44");
  }

  // bastão na frente e braço da frente segurando
  if (!p.bastaoAtras) desenharBastao();
  braco(br.f, false);

  pxFiapos(b, 0.25, 76, null, [C.pelo[1], C.pelo[2]]);
  pxContorno(b, "#140c06");
  return { b: b, olhos: olhos.map(function(o) { return [o[0] + 0.5, o[1] + 1]; }) };
}

function reiQuadros() {
  const q = {};
  const def = {
    parado0: { bastao: [25, 5, 25, 32] },
    parado1: { bob: 0.7, bastao: [25, 5.5, 25, 32], br: { t: [10.5, 21.5, 10, 25.5], f: [22, 21.5, 23.5, 19.5] } },
    corre0: { tx: 1, pe: { t: [14, 10, 32], f: [18.5, 23, 33] }, bastaoAtras: true, bastao: [4, 14, 22, 24],
      br: { t: [9.5, 19, 7, 22], f: [22, 22, 24, 23] }, olhos: "raiva" },
    corre1: { tx: 1, bob: -0.5, pe: { t: [14, 15, 33], f: [18.5, 17, 31] }, bastaoAtras: true, bastao: [4, 14, 22, 24],
      br: { t: [10, 20, 9, 24], f: [22, 21, 23, 24] }, olhos: "raiva" },
    salto: { bob: -1, pe: { t: [14, 12, 29], f: [18.5, 20, 29] }, bastao: [9, 2, 31, 4],
      br: { t: [11, 13, 12, 6], f: [22, 13, 24, 5] }, olhos: "raiva", boca: 2 },
    pancada: { bob: 2, cab: [1, 1], pe: { t: [13, 10, 33], f: [19, 23, 33] }, bastao: [20, 12, 31, 33],
      br: { t: [12, 21, 15, 19], f: [23, 20, 25, 21] }, olhos: "raiva", boca: 2 },
    estocada: { tx: 1, pe: { t: [14, 10, 33], f: [18.5, 22, 33] }, bastao: [16, 19, 31.5, 19],
      br: { t: [11, 20, 14, 19.5], f: [24, 19, 27, 19] }, olhos: "raiva", boca: 1 },
    jogar0: { bastaoAtras: true, bastao: [6, 8, 9, 32], br: { t: [9, 13, 8, 8], f: [22, 21, 23.5, 22] }, pessego: [8, 7], cab: [-0.5, 0] },
    jogar1: { tx: 0.5, bastaoAtras: true, bastao: [6, 8, 9, 32], br: { t: [10.5, 21, 10, 25], f: [24, 15, 28, 13] }, boca: 1 },
    tonto: { bob: 1.5, cab: [-1, 1], olhos: "tonto", boca: 1, br: { t: [10, 22, 9, 27], f: [22, 22, 23, 27] }, pe: { t: [14, 12, 33], f: [18.5, 21, 33] } },
    dano: { bob: 1, cab: [-1, 0.5], olhos: "fechado", boca: 2, bastao: [26, 7, 23, 32], br: { t: [10, 19, 8, 17], f: [22, 21, 24, 20] } },
    lua: { cab: [0, -1], olhos: "arregala", boca: 1, br: { t: [10.5, 22, 10, 26], f: [21.5, 22, 22, 26] } },
    transforma: { bob: 2.5, cab: [0, 1.5], olhos: "vermelho", boca: 2, br: { t: [9, 18, 10, 14], f: [23, 18, 22, 14] },
      pe: { t: [13, 10, 33], f: [19, 22, 33] } }
  };
  Object.keys(def).forEach(function(k) {
    const r = reiQuadro(def[k]);
    const s = pxSprite(pxCanvas(r.b, 3));
    s.olhos = r.olhos;
    q[k] = s;
  });
  return q;
}

registrarChefe("reiMacaco", reiQuadros(), "parado0");
registrarChefe("grandeMacaco", gorilaQuadros(true), "parado0");

// Pêssego (o Rei Macaco joga) e ícone da melhoria Nuvem Mágica
SPR_PROJ.pessego = objCanvas(12, 12, 2, function(b) {
  esferaPx(b, 6, 6.5, 5, ["#a8321e", "#e8603a", "#ff9a76", "#ffd0b8"], { rim: false });
  pxLinha(b, 6, 3, 6, 10, "#c8462a");
  pxRet(b, 6, 0, 1, 2, "#6b4220");
  pxRet(b, 7, 1, 3, 1, "#2f9e44");
  pxRet(b, 8, 0, 2, 1, "#69db7c");
}, "#5a1a10");

ICONES.nuvem = objCanvas(16, 16, 2, function(b) {
  const nuvem = ["#8fa8c8", "#d0def0", "#f4f8ff", "#ffffff"];
  esferaPx(b, 5, 9, 3.6, nuvem, { rim: false });
  esferaPx(b, 9, 7.5, 4.4, nuvem, { rim: false });
  esferaPx(b, 12.2, 9.5, 3, nuvem, { rim: false });
  pxRet(b, 3, 10, 11, 2, "#f4f8ff");
  pxRet(b, 4, 12, 10, 1, "#c8d8ee");
}, "#3a4a66");
