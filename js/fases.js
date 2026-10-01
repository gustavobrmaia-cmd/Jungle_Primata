"use strict";

// =========================
// GERADOR DE FASES
// Cada fase é montada com "pedaços" (chunks). Quanto mais longe no jogo,
// mais pedaços, buracos maiores, mais inimigos e mais perigos.
// A fase N de cada mundo libera o N-ésimo inimigo e o N-ésimo obstáculo do mundo.
// A mesma fase sai sempre igual (semente fixa).
// =========================

const TIPOS_POWERUP = ["velocidade", "puloDuplo", "escudo", "ima", "nuke"];

function novaFase(indice) {
  const mundo = Math.floor(indice / FASES_POR_MUNDO);
  const etapa = indice % FASES_POR_MUNDO;
  return {
    indice: indice, mundo: mundo, etapa: etapa,
    ehChefe: etapa === FASES_POR_MUNDO - 1,
    dificuldade: 0, largura: 0, inicioX: 100, fimX: 0, pool: [],
    solidos: [], plataformas: [], espinhos: [], lavas: [], aguas: [], moedas: [], inimigos: [],
    cipos: [], tornados: [], geiseres: [], areias: [], estalactites: [], fogos: [],
    lancadores: [], plantas: [], barras: [], ventos: [], zonasMeteoro: [], powerups: [],
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

function fPlaca(f, x, texto) {
  f.placas.push({ x: x, texto: texto });
}

// Coloca o inimigo do jeito certo para o tipo dele (no chão, voando ou pendurado)
function fColocar(f, tipo, x, baseY) {
  const t = TIPOS_INIMIGO[tipo];
  const cat = categoriaInimigo(tipo);
  baseY = baseY === undefined ? CHAO : baseY;
  if (cat === "voador") f.inimigos.push({ tipo: tipo, x: x, y: baseY - 200 });
  else if (cat === "aranha") f.inimigos.push({ tipo: tipo, x: x, y: CHAO - 330 });
  else f.inimigos.push({ tipo: tipo, x: x, y: baseY - t.h });
}

// Sorteia um inimigo já liberado nesta fase, de preferência da categoria pedida
function inimigoDe(f, r, categoria) {
  const pool = f.pool.filter(function(t) { return categoriaInimigo(t) === categoria; });
  return sorteio(pool.length ? pool : f.pool, r);
}

// ---------- pedaços comuns ----------

const CHUNKS = {

  plano: function(f, x, d, r) {
    const w = 360 + Math.floor(r() * 4) * 40;
    fChao(f, x, w, f.mundo === 2 && r() < 0.5);
    fLinhaMoedas(f, x + 60, CHAO - 50, 3 + Math.floor(r() * 3), 40);
    if (r() < 0.35 + 0.5 * d) fColocar(f, inimigoDe(f, r, "terrestre"), x + w * 0.65);
    if (r() < 0.5) {
      const py = CHAO - 130 - Math.floor(r() * 2) * 20;
      fPlat(f, x + 80, py, 128);
      fLinhaMoedas(f, x + 96, py - 44, 3, 32);
      if (r() < d) fColocar(f, inimigoDe(f, r, "voador"), x + w / 2);
    }
    return x + w;
  },

  buraco: function(f, x, d, r) {
    const vao = Math.round(90 + 90 * d + r() * 20);
    fChao(f, x, 160);
    fArcoMoedas(f, x + 160, x + 160 + vao, CHAO - 90, 80, 3);
    fChao(f, x + 160 + vao, 200);
    if (d > 0.5 && r() < 0.5) fColocar(f, inimigoDe(f, r, "voador"), x + 160 + vao / 2);
    return x + 160 + vao + 200;
  },

  muro: function(f, x, d, r) {
    const h = d < 0.4 ? 64 : d < 0.8 ? 96 : 128;
    fChao(f, x, 480);
    fBloco(f, x + 200, CHAO - h, 64, h);
    fMoeda(f, x + 216, CHAO - h - 50);
    if (r() < 0.3 + 0.5 * d) fColocar(f, inimigoDe(f, r, "terrestre"), x + 340);
    return x + 480;
  },

  escada: function(f, x, d, r) {
    fChao(f, x, 680);
    for (let i = 0; i < 3; i++) {
      fBloco(f, x + 120 + i * 96, CHAO - 64 * (i + 1), 96, 64 * (i + 1));
      fMoeda(f, x + 152 + i * 96, CHAO - 64 * (i + 1) - 50);
    }
    if (d > 0.4 && r() < 0.6) fColocar(f, inimigoDe(f, r, "terrestre"), x + 330, CHAO - 192);
    if (r() < 0.5) fPlat(f, x + 470, CHAO - 260, 96);
    return x + 680;
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
    for (let i = 0; i < n; i++) fColocar(f, sorteio(f.pool, r), x + 140 + i * 150);
    fLinhaMoedas(f, x + 100, CHAO - 150, 5, 70);
    return x + w;
  },

  atirador: function(f, x, d, r) {
    fChao(f, x, 520);
    fBloco(f, x + 260, CHAO - 96, 96, 96);
    fColocar(f, inimigoDe(f, r, "atirador"), x + 280, CHAO - 96);
    fLinhaMoedas(f, x + 60, CHAO - 50, 4, 40);
    if (d > 0.5) fColocar(f, inimigoDe(f, r, "terrestre"), x + 420);
    return x + 520;
  },

  // Mostra o inimigo novo da fase
  apresentaInimigo: function(f, x, d, r) {
    const tipo = MUNDOS[f.mundo].inimigos[f.etapa];
    fChao(f, x, 680);
    if (categoriaInimigo(tipo) === "atirador") {
      fBloco(f, x + 380, CHAO - 64, 96, 64);
      fColocar(f, tipo, x + 400, CHAO - 64);
    } else {
      fColocar(f, tipo, x + 340);
      fColocar(f, tipo, x + 540);
    }
    fLinhaMoedas(f, x + 220, CHAO - 50, 4, 40);
    return x + 680;
  },

  espinhos: function(f, x, d, r) {
    const w = 64 + Math.round(d * 3) * 32;
    fChao(f, x, 220 + w + 220);
    f.espinhos.push({ x: x + 220, y: CHAO - 24, w: w, h: 24 });
    fArcoMoedas(f, x + 220, x + 220 + w, CHAO - 100, 60, 3);
    if (d > 0.6 && r() < 0.5) fColocar(f, inimigoDe(f, r, "voador"), x + 220 + w / 2);
    return x + 220 + w + 220;
  },

  // ---------- Selva ----------

  cipo: function(f, x, d, r) {
    const dois = (f.etapa > 1 || d > 0.45) && r() < 0.6;
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
    if (r() < d) fColocar(f, inimigoDe(f, r, "terrestre"), fim + 140);
    return fim + 240;
  },

  cogumelo: function(f, x, d, r) {
    const h = 224 + Math.round(d * 2) * 32;
    fChao(f, x, 700);
    fPlat(f, x + 170, CHAO - 28, 64, { cogumelo: true, amassar: 0 });
    fBloco(f, x + 300, CHAO - h, 192, h);
    fMoeda(f, x + 186, CHAO - 160);
    fMoeda(f, x + 186, CHAO - 270);
    fLinhaMoedas(f, x + 330, CHAO - h - 50, 4, 36);
    if (d > 0.1) fColocar(f, inimigoDe(f, r, "terrestre"), x + 420, CHAO - h);
    return x + 700;
  },

  troncos: function(f, x, d, r) {
    const w = 940;
    fChao(f, x, w);
    f.lancadores.push({ tipo: "tronco", x: x + w - 90, y: CHAO - 40, intervalo: Math.round(150 - d * 50), t: 60 });
    fLinhaMoedas(f, x + 120, CHAO - 130, 6, 100);
    return x + w;
  },

  plantas: function(f, x, d, r) {
    const n = d > 0.15 ? 4 : 3;
    const w = 220 + n * 170;
    fChao(f, x, w);
    for (let i = 0; i < n; i++) {
      // em "onda": quem passa logo depois que a primeira se esconde pega as outras escondidas
      f.plantas.push({ x: x + 180 + i * 170, t: Math.round(400 - i * 30 - r() * 12) % 200 });
      fMoeda(f, x + 188 + i * 170, CHAO - 170);
    }
    return x + w;
  },

  // ---------- Deserto ----------

  areia: function(f, x, d, r) {
    const w = 160 + Math.round(d * 4) * 32;
    fChao(f, x, 200 + w + 200);
    f.areias.push({ x: x + 200, w: w });
    fArcoMoedas(f, x + 200, x + 200 + w, CHAO - 90, 70, 4);
    if (d > 0.4 && r() < 0.6) fColocar(f, inimigoDe(f, r, "voador"), x + 200 + w / 2);
    return x + 200 + w + 200;
  },

  tornado: function(f, x, d, r) {
    const h = 256 + Math.round(d * 2) * 32;
    fChao(f, x, 700);
    f.tornados.push({ x: x + 160, w: 110, topo: CHAO - h - 140 });
    fBloco(f, x + 300, CHAO - h, 192, h);
    fMoeda(f, x + 199, CHAO - 120);
    fMoeda(f, x + 199, CHAO - 220);
    fLinhaMoedas(f, x + 330, CHAO - h - 50, 4, 36);
    if (d > 0.4) fColocar(f, inimigoDe(f, r, "terrestre"), x + 420, CHAO - h);
    return x + 700;
  },

  dardos: function(f, x, d, r) {
    fChao(f, x, 820);
    const bx = x + 600;
    fBloco(f, bx, CHAO - 128, 96, 128);
    const intervalo = Math.round(120 - d * 30);
    f.lancadores.push({ tipo: "dardo", x: bx, y: CHAO - 30, intervalo: intervalo, t: 0 });
    f.lancadores.push({ tipo: "dardo", x: bx, y: CHAO - 62, intervalo: intervalo, t: Math.round(intervalo / 2) });
    fLinhaMoedas(f, x + 200, CHAO - 50, 6, 50);
    fLinhaMoedas(f, bx + 16, CHAO - 180, 2, 40);
    return x + 820;
  },

  pedraRolante: function(f, x, d, r) {
    const w = 1000;
    fChao(f, x, w);
    f.lancadores.push({ tipo: "pedra", x: x + w - 110, y: CHAO - 80, intervalo: Math.round(220 - d * 60), t: 120 });
    fLinhaMoedas(f, x + 150, CHAO - 170, 5, 120);
    return x + w;
  },

  ventania: function(f, x, d, r) {
    const vao = 90 + Math.round(d * 10);
    fChao(f, x, 220);
    fChao(f, x + 220 + vao, 240);
    fChao(f, x + 220 + vao + 240 + vao, 300);
    const w = 220 + vao + 240 + vao + 300;
    f.ventos.push({ x: x + 100, w: w - 200, t: Math.floor(r() * 240) });
    fArcoMoedas(f, x + 220, x + 220 + vao, CHAO - 90, 60, 2);
    fArcoMoedas(f, x + 460 + vao, x + 460 + vao * 2, CHAO - 90, 60, 2);
    return x + w;
  },

  // ---------- Era do Gelo ----------

  tunel: function(f, x, d, r) {
    const w = 256 + Math.round(d * 3) * 64;
    fChao(f, x, 240 + w + 200, true);
    fBloco(f, x + 240, CHAO - 44 - 256, w, 256, true);
    fLinhaMoedas(f, x + 280, CHAO - 38, Math.floor(w / 64), 64);
    return x + 240 + w + 200;
  },

  estalactites: function(f, x, d, r) {
    const w = 680;
    fChao(f, x, w, r() < 0.5);
    fBloco(f, x + 120, 200, w - 240, 32, true);
    const n = 3 + Math.round(d * 2);
    for (let i = 0; i < n; i++) f.estalactites.push({ x: x + 140 + i * ((w - 300) / n), y: 232 });
    fLinhaMoedas(f, x + 140, CHAO - 50, 6, 70);
    if (d > 0.5) fColocar(f, inimigoDe(f, r, "terrestre"), x + w - 120);
    return x + w;
  },

  pista: function(f, x, d, r) {
    const vao = 320 + Math.round(d * 2) * 20;
    fChao(f, x, 700, true);
    fArcoMoedas(f, x + 700, x + 700 + vao, CHAO - 110, 90, 5);
    fChao(f, x + 700 + vao, 260, true);
    return x + 700 + vao + 260;
  },

  geloFino: function(f, x, d, r) {
    const n = 3 + Math.round(d);
    fChao(f, x, 180, true);
    let px = x + 180 + 100;
    for (let i = 0; i < n; i++) {
      fPlat(f, px, CHAO - 50 - (i % 2) * 30, 96, { cai: true, fragil: true });
      fMoeda(f, px + 32, CHAO - 140 - (i % 2) * 30);
      px += 96 + 105;
    }
    const fim = px - 105 + 100;
    f.aguas.push({ x: x + 180, w: fim - x - 180 });
    fChao(f, fim, 200, true);
    return fim + 200;
  },

  avalanche: function(f, x, d, r) {
    const w = 1000;
    fChao(f, x, w, r() < 0.5);
    f.lancadores.push({ tipo: "bolaNeve", x: x + w - 90, y: CHAO - 56, intervalo: Math.round(130 - d * 40), t: 40 });
    fLinhaMoedas(f, x + 150, CHAO - 150, 6, 110);
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
    fMoeda(f, x + 196, CHAO - 200);
    fMoeda(f, x + 196, CHAO - 300);
    fLinhaMoedas(f, x + 330, CHAO - h - 50, 4, 40);
    if (d > 0.5) fColocar(f, inimigoDe(f, r, "terrestre"), x + 430, CHAO - h);
    return x + 700;
  },

  plataformasCaem: function(f, x, d, r) {
    const n = 3 + Math.round(d);
    fChao(f, x, 180);
    let px = x + 180 + 100;
    for (let i = 0; i < n; i++) {
      fPlat(f, px, CHAO - 60 - (i % 2) * 40, 96, { cai: true });
      fMoeda(f, px + 32, CHAO - 150 - (i % 2) * 40);
      px += 96 + 110;
    }
    const fim = px - 110 + 100;
    f.lavas.push({ x: x + 180, w: fim - x - 180 });
    if (d > 0.5) f.fogos.push({ x: x + 180 + (fim - x - 180) / 2, t: Math.floor(r() * 150) });
    fChao(f, fim, 200);
    return fim + 200;
  },

  barraFogo: function(f, x, d, r) {
    const n = d > 0.85 ? 2 : 1;
    const w = 300 + n * 300;
    fChao(f, x, w);
    for (let i = 0; i < n; i++) {
      const cx = x + 260 + i * 300;
      fBloco(f, cx - 16, CHAO - 32, 32, 32);
      f.barras.push({ cx: cx, cy: CHAO - 16, n: d > 0.9 ? 6 : 5, ang: r() * 6, vel: (0.03 + d * 0.012) * (i % 2 ? -1 : 1) });
      fMoeda(f, cx - 16, CHAO - 150);
    }
    return x + w;
  },

  meteoros: function(f, x, d, r) {
    const w = 900;
    fChao(f, x, w);
    f.zonasMeteoro.push({ x: x, w: w, t: 0, intervalo: Math.round(55 - d * 15) });
    fLinhaMoedas(f, x + 100, CHAO - 50, 8, 90);
    return x + w;
  }
};

const CHUNKS_GERAIS = ["plano", "buraco", "muro", "escada", "plataformas", "grupo", "atirador"];

const DICAS_OBSTACULO = {
  espinhos: "Pule por cima dos espinhos!",
  cipo: "Pule no cipó para se agarrar!\n{pulo} solta",
  cogumelo: "Pule no cogumelo para ir bem alto!",
  troncos: "Pule por cima deles!",
  plantas: "Passe quando a planta se esconder!",
  areia: "Pule rápido para não afundar!",
  tornado: "Entre no redemoinho para subir!",
  dardos: "Pule os dardos de baixo,\ndeslize ({baixo}) nos de cima!",
  pedraRolante: "Elas são enormes: pule na hora certa!",
  ventania: "Espere o vento parar para pular!",
  tunel: "Corra e segure {baixo} para deslizar!",
  estalactites: "Não pare embaixo das estalactites!",
  pista: "Deslize ({baixo}) no gelo para pular longe!",
  geloFino: "O gelo fino quebra! Não fique parado",
  avalanche: "Pule as bolas de neve!",
  lagoLava: "Lava queima! Pule por cima",
  geiser: "Pule na rocha de magma: IMPULSO!",
  plataformasCaem: "Essas plataformas despencam!",
  barraFogo: "Passe quando a barra de fogo girar!",
  meteoros: "Fuja das sombras vermelhas!"
};

const DICAS_INIMIGO = {
  cobra: "Pule na cabeça ou atire!",
  abelha: "Ela voa: use o revólver!",
  sapo: "Ele pula atrás de você!",
  macacoLadrao: "Ele joga cocos!",
  aranha: "Ela desce quando você passa!",
  escorpiao: "Precisa de 2 tiros!",
  abutre: "Ele mergulha em você!",
  cacto: "Espinhoso: não pise nele!",
  mumia: "Lenta mas resistente!",
  tatu: "Não pise quando ele rolar!",
  pinguim: "Ele escorrega na sua direção!",
  morcegoGelo: "Voa rápido!",
  boneco: "Joga bolas de neve!",
  foca: "Pula atrás de você!",
  lobo: "Corre muito rápido!",
  slime: "Quente: não pise nele!",
  morcegoFogo: "Voa muito rápido!",
  diabinho: "Atira bolas de fogo!",
  golem: "Muito forte: use o cipó-laço!",
  fenix: "Mergulha soltando fogo!"
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
  const mundo = MUNDOS[f.mundo];
  if (f.ehChefe) return gerarArena(f);

  const r = criarRng(indice * 7919 + 13);
  const d = (f.mundo * 5 + f.etapa) / 19;
  f.dificuldade = d;
  f.pool = mundo.inimigos.slice(0, f.etapa + 1);

  // Começo
  fChao(f, 0, 640);
  f.decoracoes.push({ x: 380, spr: f.mundo });

  const novoObstaculo = mundo.obstaculos[f.etapa];
  const obstaculos = mundo.obstaculos.slice(0, f.etapa + 1);
  let lista;

  if (indice === 0) {
    fPlaca(f, 200, "{esquerda}/{direita} andar   {pulo} pular\nSegure {pulo} para pular mais alto");
    lista = ["plano", "buraco", "apresentaInimigo", "espinhos", "muro", "grupo", "plataformas", "espinhos", "escada"];
  } else {
    if (f.etapa === 0) fPlaca(f, 200, "Bem-vindo: " + mundo.nome + "!");
    const total = 6 + Math.round(d * 7);
    lista = [novoObstaculo, "apresentaInimigo"];
    let ultimo = "apresentaInimigo";
    while (lista.length < total) {
      let nome;
      do {
        nome = r() < 0.45 ? sorteio(obstaculos, r) : sorteio(CHUNKS_GERAIS, r);
      } while (nome === ultimo);
      lista.push(nome);
      ultimo = nome;
    }
    // o obstáculo novo aparece pelo menos 2 vezes
    if (lista.filter(function(n) { return n === novoObstaculo; }).length < 2) lista.splice(3 + Math.floor(r() * (lista.length - 3)), 0, novoObstaculo);
  }

  let x = 640;
  const mostradas = {};
  lista.forEach(function(nome, i) {
    if (i === Math.floor(lista.length / 2)) {
      fChao(f, x, 280);
      f.checkpoints.push({ x: x + 120, ativo: false, sobe: 0 });
      x += 280;
    }
    if (nome === "apresentaInimigo") {
      const tipo = mundo.inimigos[f.etapa];
      let texto = "Novo inimigo: " + TIPOS_INIMIGO[tipo].nome + "!\n" + DICAS_INIMIGO[tipo];
      if (indice === 0) texto = "Novo inimigo: Cobra! Pule nela\n{tiro}: revólver  {laco}: cipó-laço";
      fPlaca(f, x + 40, texto);
    } else if (DICAS_OBSTACULO[nome] && !mostradas[nome] && obstaculos.indexOf(nome) >= 0 &&
               (nome === novoObstaculo || indice === 0)) {
      fPlaca(f, x + 40, (nome === novoObstaculo ? "Novo: " + NOMES_OBSTACULO[nome] + "!\n" : "") + DICAS_OBSTACULO[nome]);
      mostradas[nome] = true;
    }
    // Power-up de vez em quando no começo do pedaço
    if (i > 0 && r() < 0.2) f.powerups.push({ x: x + 70, y: CHAO - 200, tipo: sorteio(TIPOS_POWERUP, r), base: CHAO - 200 });
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
  f.pool = MUNDOS[f.mundo].inimigos.slice();
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
