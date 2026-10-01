"use strict";

// =========================
// GERADOR DE FASES
// Cada fase é montada com "pedaços" (chunks). Quanto mais longe no jogo,
// mais pedaços, buracos maiores, mais inimigos e mais perigos.
// A mesma fase sai sempre igual (semente fixa).
// =========================

function novaFase(indice) {
  const mundo = Math.floor(indice / FASES_POR_MUNDO);
  const etapa = indice % FASES_POR_MUNDO;
  return {
    indice: indice, mundo: mundo, etapa: etapa,
    ehChefe: etapa === FASES_POR_MUNDO - 1,
    dificuldade: 0, largura: 0, inicioX: 100, fimX: 0,
    solidos: [], plataformas: [], espinhos: [], lavas: [], moedas: [], inimigos: [],
    cipos: [], tornados: [], geiseres: [], areias: [], estalactites: [], fogos: [],
    placas: [], checkpoints: [], decoracoes: []
  };
}

// ---------- peças ----------

function fChao(f, x, w, gelo) {
  f.solidos.push({ x: x, y: CHAO, w: w, h: 240, tipo: "chao", gelo: !!gelo });
}

function fBloco(f, x, y, w, h, gelo) {
  f.solidos.push({ x: x, y: y, w: w, h: h, tipo: "bloco", gelo: !!gelo });
}

function fPlat(f, x, y, w, extra) {
  const p = Object.assign({ x: x, y: y, w: w, h: 16, x0: x, y0: y, dx: 0, dy: 0 }, extra || {});
  f.plataformas.push(p);
  return p;
}

function fMoeda(f, x, y) {
  f.moedas.push({ x: Math.round(x), y: Math.round(y), pega: false });
}

function fLinhaMoedas(f, x, y, n, passo) {
  for (let i = 0; i < n; i++) fMoeda(f, x + i * (passo || 40), y);
}

function fArcoMoedas(f, x1, x2, yBase, altura, n) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    fMoeda(f, x1 + (x2 - x1) * t - 16, yBase - Math.sin(t * Math.PI) * altura);
  }
}

function fInimigo(f, tipo, x, baseY) {
  const t = TIPOS_INIMIGO[tipo];
  f.inimigos.push({ tipo: tipo, x: x, y: (baseY === undefined ? CHAO : baseY) - t.h });
}

function fPlaca(f, x, texto) {
  f.placas.push({ x: x, texto: texto });
}

function terrestre(f, r) { return sorteio(MUNDOS[f.mundo].terrestres, r); }
function voador(f, r) { return sorteio(MUNDOS[f.mundo].voadores, r); }
function atiradorOuTerrestre(f, r) {
  const a = MUNDOS[f.mundo].atiradores;
  return a.length ? sorteio(a, r) : terrestre(f, r);
}

function fInimigoAr(f, r, x, y) {
  fInimigo(f, voador(f, r), x, y);
}

// ---------- pedaços comuns ----------

const CHUNKS = {

  plano: function(f, x, d, r) {
    const w = 360 + Math.floor(r() * 4) * 40;
    fChao(f, x, w, f.mundo === 2 && r() < 0.5);
    fLinhaMoedas(f, x + 60, CHAO - 50, 3 + Math.floor(r() * 3), 40);
    if (r() < 0.35 + 0.5 * d) fInimigo(f, terrestre(f, r), x + w * 0.65);
    if (r() < 0.5) {
      const py = CHAO - 130 - Math.floor(r() * 2) * 20;
      fPlat(f, x + 80, py, 128);
      fLinhaMoedas(f, x + 96, py - 44, 3, 32);
      if (r() < d) fInimigoAr(f, r, x + w / 2, CHAO - 230);
    }
    return x + w;
  },

  buraco: function(f, x, d, r) {
    const vao = Math.round(90 + 90 * d + r() * 20);
    fChao(f, x, 160);
    fArcoMoedas(f, x + 160, x + 160 + vao, CHAO - 90, 80, 3);
    fChao(f, x + 160 + vao, 200);
    if (d > 0.5 && r() < 0.5) fInimigoAr(f, r, x + 160 + vao / 2, CHAO - 210);
    return x + 160 + vao + 200;
  },

  muro: function(f, x, d, r) {
    const h = d < 0.4 ? 64 : d < 0.8 ? 96 : 128;
    fChao(f, x, 480);
    fBloco(f, x + 200, CHAO - h, 64, h);
    fMoeda(f, x + 216, CHAO - h - 50);
    if (r() < 0.3 + 0.5 * d) fInimigo(f, terrestre(f, r), x + 340);
    return x + 480;
  },

  escada: function(f, x, d, r) {
    fChao(f, x, 680);
    for (let i = 0; i < 3; i++) {
      fBloco(f, x + 120 + i * 96, CHAO - 64 * (i + 1), 96, 64 * (i + 1));
      fMoeda(f, x + 152 + i * 96, CHAO - 64 * (i + 1) - 50);
    }
    if (d > 0.4 && r() < 0.6) fInimigo(f, terrestre(f, r), x + 330, CHAO - 192);
    if (r() < 0.5) fPlat(f, x + 470, CHAO - 260, 96);
    return x + 680;
  },

  espinhos: function(f, x, d, r) {
    const w = 64 + Math.round(d * 3) * 32;
    fChao(f, x, 220 + w + 220);
    f.espinhos.push({ x: x + 220, y: CHAO - 24, w: w, h: 24 });
    fArcoMoedas(f, x + 220, x + 220 + w, CHAO - 100, 60, 3);
    if (d > 0.6 && r() < 0.5) fInimigoAr(f, r, x + 220 + w / 2, CHAO - 240);
    return x + 220 + w + 220;
  },

  plataformas: function(f, x, d, r) {
    const n = d > 0.5 ? 3 : 2;
    fChao(f, x, 160);
    let px = x + 160 + 110;
    for (let i = 0; i < n; i++) {
      const y = CHAO - 70 - (i % 2) * 50;
      let mov = null;
      if (d > 0.35 && r() < 0.6) {
        mov = r() < 0.5 ? { ax: 40, periodo: Math.round(220 - d * 60), fase: r() * 6 }
                        : { ay: 40, periodo: 200, fase: r() * 6 };
      }
      fPlat(f, px, y, 96, mov);
      fLinhaMoedas(f, px + 16, y - 44, 2, 40);
      px += 96 + 120;
    }
    const fim = px - 120 + 110;
    if (f.mundo === 3) f.lavas.push({ x: x + 160, w: fim - x - 160 });
    fChao(f, fim, 200);
    return fim + 200;
  },

  grupo: function(f, x, d, r) {
    const w = 560;
    fChao(f, x, w, f.mundo === 2 && r() < 0.5);
    const n = d > 0.5 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      if (r() < 0.35) fInimigoAr(f, r, x + 140 + i * 150, CHAO - 190);
      else fInimigo(f, terrestre(f, r), x + 140 + i * 150);
    }
    fLinhaMoedas(f, x + 100, CHAO - 150, 5, 70);
    return x + w;
  },

  atirador: function(f, x, d, r) {
    fChao(f, x, 520);
    fBloco(f, x + 260, CHAO - 96, 96, 96);
    fInimigo(f, atiradorOuTerrestre(f, r), x + 290, CHAO - 96);
    fLinhaMoedas(f, x + 60, CHAO - 50, 4, 40);
    if (d > 0.5) fInimigo(f, terrestre(f, r), x + 420);
    return x + 520;
  },

  // ---------- Selva ----------

  cipo: function(f, x, d, r) {
    const dois = (f.etapa > 0 || d > 0.45) && r() < 0.6;
    fChao(f, x, 200);
    const x0 = x + 200;
    const a1 = x0 + 120;
    f.cipos.push({ x: a1, y: 150, comp: 300, fase: r() * 6 });
    let fim = a1 + 320;
    if (dois) {
      const a2 = a1 + 330;
      f.cipos.push({ x: a2, y: 150, comp: 300, fase: r() * 6 });
      fArcoMoedas(f, a1, a2, 380, 50, 4);
      fim = a2 + 320;
    }
    fArcoMoedas(f, fim - 300, fim - 40, 420, 90, 4);
    fChao(f, fim, 240);
    if (r() < d) fInimigo(f, terrestre(f, r), fim + 140);
    return fim + 240;
  },

  // ---------- Deserto ----------

  tornado: function(f, x, d, r) {
    const h = 256 + Math.round(d * 2) * 32;
    fChao(f, x, 700);
    f.tornados.push({ x: x + 160, w: 110, topo: CHAO - h - 140 });
    fBloco(f, x + 300, CHAO - h, 192, h);
    fLinhaMoedas(f, x + 199, CHAO - 120, 1);
    fLinhaMoedas(f, x + 199, CHAO - 220, 1);
    fLinhaMoedas(f, x + 330, CHAO - h - 50, 4, 36);
    if (d > 0.4) fInimigo(f, terrestre(f, r), x + 420, CHAO - h);
    return x + 700;
  },

  areia: function(f, x, d, r) {
    const w = 160 + Math.round(d * 4) * 32;
    fChao(f, x, 200 + w + 200);
    f.areias.push({ x: x + 200, w: w });
    fArcoMoedas(f, x + 200, x + 200 + w, CHAO - 90, 70, 4);
    if (d > 0.5 && r() < 0.6) fInimigoAr(f, r, x + 200 + w / 2, CHAO - 230);
    return x + 200 + w + 200;
  },

  // ---------- Era do Gelo ----------

  tunel: function(f, x, d, r) {
    const w = 256 + Math.round(d * 3) * 64;
    fChao(f, x, 240 + w + 200, true);
    fBloco(f, x + 240, CHAO - 44 - 256, w, 256, true);
    fLinhaMoedas(f, x + 280, CHAO - 38, Math.floor(w / 64), 64);
    return x + 240 + w + 200;
  },

  pista: function(f, x, d, r) {
    const vao = 320 + Math.round(d * 2) * 20;
    fChao(f, x, 700, true);
    fArcoMoedas(f, x + 700, x + 700 + vao, CHAO - 110, 90, 5);
    fChao(f, x + 700 + vao, 260, true);
    return x + 700 + vao + 260;
  },

  estalactites: function(f, x, d, r) {
    const w = 680;
    fChao(f, x, w, r() < 0.5);
    fBloco(f, x + 120, 200, w - 240, 32, true);
    const n = 3 + Math.round(d * 2);
    for (let i = 0; i < n; i++) {
      f.estalactites.push({ x: x + 140 + i * ((w - 300) / n), y: 232 });
    }
    fLinhaMoedas(f, x + 140, CHAO - 50, 6, 70);
    if (d > 0.5) fInimigo(f, terrestre(f, r), x + w - 120);
    return x + w;
  },

  // ---------- Lava ----------

  lagoLava: function(f, x, d, r) {
    const w = 128 + Math.round(d * 3) * 32;
    fChao(f, x, 200);
    f.lavas.push({ x: x + 200, w: w });
    if (d > 0.3) f.fogos.push({ x: x + 200 + w / 2 - 16, t: Math.floor(r() * 150) });
    fArcoMoedas(f, x + 200, x + 200 + w, CHAO - 110, 80, 3);
    fChao(f, x + 200 + w, 200);
    return x + 400 + w;
  },

  geiser: function(f, x, d, r) {
    const h = 288 + Math.round(d * 2) * 32;
    fChao(f, x, 700);
    f.geiseres.push({ x: x + 180, w: 64, t: Math.floor(r() * 200) });
    fBloco(f, x + 300, CHAO - h, 224, h);
    fLinhaMoedas(f, x + 196, CHAO - 200, 1);
    fLinhaMoedas(f, x + 196, CHAO - 300, 1);
    fLinhaMoedas(f, x + 330, CHAO - h - 50, 4, 40);
    if (d > 0.5) fInimigo(f, terrestre(f, r), x + 430, CHAO - h);
    return x + 700;
  },

  plataformasCaem: function(f, x, d, r) {
    const n = 3 + Math.round(d);
    fChao(f, x, 180);
    let px = x + 180 + 100;
    for (let i = 0; i < n; i++) {
      fPlat(f, px, CHAO - 60 - (i % 2) * 40, 96, { cai: true });
      fLinhaMoedas(f, px + 32, CHAO - 150 - (i % 2) * 40, 1);
      px += 96 + 110;
    }
    const fim = px - 110 + 100;
    f.lavas.push({ x: x + 180, w: fim - x - 180 });
    if (d > 0.5) f.fogos.push({ x: x + 180 + (fim - x - 180) / 2, t: Math.floor(r() * 150) });
    fChao(f, fim, 200);
    return fim + 200;
  }
};

const CHUNKS_MUNDO = [
  ["cipo", "cipo", "espinhos"],
  ["tornado", "areia", "areia", "tornado"],
  ["tunel", "pista", "estalactites"],
  ["lagoLava", "geiser", "plataformasCaem"]
];

const CHUNKS_GERAIS = ["plano", "buraco", "muro", "escada", "espinhos", "plataformas", "grupo", "atirador"];

const DICAS = {
  cipo: "Pule no cipó para se agarrar! W solta",
  tornado: "Entre no redemoinho para subir!",
  areia: "Areia movediça! Pule para não afundar",
  tunel: "Corra e segure S para deslizar!",
  pista: "Deslize no gelo (S) para pular longe!",
  estalactites: "Cuidado: as estalactites caem!",
  lagoLava: "Lava queima! Pule por cima",
  geiser: "Pule na rocha de magma: IMPULSO!",
  plataformasCaem: "Essas plataformas despencam!"
};

// Junta pedaços de chão encostados (menos coisas para desenhar e testar)
function juntarChao(f) {
  const chaos = f.solidos.filter(function(s) { return s.tipo === "chao"; }).sort(function(a, b) { return a.x - b.x; });
  const outros = f.solidos.filter(function(s) { return s.tipo !== "chao"; });
  const juntos = [];
  chaos.forEach(function(s) {
    const u = juntos[juntos.length - 1];
    if (u && u.x + u.w === s.x && u.gelo === s.gelo) u.w += s.w;
    else juntos.push(Object.assign({}, s));
  });
  f.solidos = juntos.concat(outros);
}

function gerarFase(indice) {
  const f = novaFase(indice);
  if (f.ehChefe) return gerarArena(f);

  const r = criarRng(indice * 7919 + 13);
  const d = (f.mundo * 3 + f.etapa) / 11;
  f.dificuldade = d;

  // Começo
  fChao(f, 0, 640);
  f.decoracoes.push({ x: 380, spr: f.mundo });

  let lista;
  if (indice === 0) {
    // Fase 1: tutorial
    fPlaca(f, 200, "A/D andar  W pular\nSegure W para pular mais alto");
    lista = ["plano", "buraco", "grupo", "cipo", "muro", "plataformas", "espinhos", "cipo"];
  } else {
    if (f.etapa === 0) fPlaca(f, 200, "Bem-vindo: " + MUNDOS[f.mundo].nome + "!");
    lista = [];
    const total = 6 + Math.round(d * 6);
    const especiais = CHUNKS_MUNDO[f.mundo];
    const unicos = especiais.filter(function(n, i) { return especiais.indexOf(n) === i; });
    let ultimo = "";
    for (let i = 0; i < total; i++) {
      let nome;
      if (f.etapa === 0 && i % 2 === 0 && i / 2 < unicos.length) nome = unicos[i / 2];
      else {
        do {
          nome = r() < 0.45 ? sorteio(especiais, r) : sorteio(CHUNKS_GERAIS, r);
        } while (nome === ultimo);
      }
      lista.push(nome);
      ultimo = nome;
    }
  }

  let x = 640;
  const dicasMostradas = {};
  lista.forEach(function(nome, i) {
    if (i === Math.floor(lista.length / 2)) {
      fChao(f, x, 280);
      f.checkpoints.push({ x: x + 120, ativo: false });
      x += 280;
    }
    if (DICAS[nome] && !dicasMostradas[nome] && (f.etapa === 0 || indice === 0)) {
      fPlaca(f, x + 40, DICAS[nome]);
      dicasMostradas[nome] = true;
    }
    if (indice === 0 && nome === "grupo") fPlaca(f, x + 40, "K: revólver   J: cipó-laço\nLace o inimigo e chute pro espaço!");
    x = CHUNKS[nome](f, x, d, r);
    if (r() < 0.5) f.decoracoes.push({ x: x - 120, spr: f.mundo });
  });

  // Final: a banana
  fChao(f, x, 900);
  f.decoracoes.push({ x: x + 640, spr: f.mundo });
  f.fimX = x + 520;
  f.largura = x + 900;

  juntarChao(f);
  return f;
}

// Arena do chefe: uma tela só, com paredes dos lados
function gerarArena(f) {
  f.largura = LARGURA;
  f.inicioX = 120;
  f.dificuldade = 1;
  fChao(f, -400, LARGURA + 800, f.mundo === 2);
  fBloco(f, -64, -2000, 64, 2000 + CHAO);
  fBloco(f, LARGURA, -2000, 64, 2000 + CHAO);
  if (f.mundo === 3) {
    fPlat(f, 150, 440, 160);
    fPlat(f, 890, 440, 160);
    fPlat(f, 520, 320, 160);
  }
  f.decoracoes.push({ x: 40, spr: f.mundo });
  f.decoracoes.push({ x: 1080, spr: f.mundo });
  return f;
}
