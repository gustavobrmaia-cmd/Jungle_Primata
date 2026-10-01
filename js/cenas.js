"use strict";

// =========================
// CENAS: abertura (o vento leva a banana), final e fundo do menu
// =========================

const PADROES_CENA = {};
function padraoMundo(mundo, nome) {
  const chave = mundo + nome;
  if (!PADROES_CENA[chave]) PADROES_CENA[chave] = ctx.createPattern(TEMAS[mundo][nome], "repeat");
  return PADROES_CENA[chave];
}

function desenharChaoCena(mundo, deslocamento) {
  const off = Math.round(deslocamento || 0) % 32;
  ctx.save();
  ctx.translate(-off, CHAO);
  ctx.fillStyle = padraoMundo(mundo, "topo");
  ctx.fillRect(0, 0, LARGURA + 64, 32);
  ctx.fillStyle = padraoMundo(mundo, "terra");
  ctx.fillRect(0, 32, LARGURA + 64, ALTURA - CHAO - 32);
  ctx.restore();
}

function desenharMacacoCena(x, base, pose, dir, giro) {
  const spr = SPRITES_PRIMATA[pose][dir > 0 ? "d" : "e"];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(base));
  if (giro) { ctx.translate(0, -40); ctx.rotate(giro); ctx.translate(0, 40); }
  ctx.drawImage(spr, -40, -80);
  ctx.restore();
}

function balao(x, y, desenho) {
  ctx.fillStyle = "#3b2412";
  ctx.fillRect(x - 23, y - 23, 46, 46);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 20, y - 20, 40, 40);
  ctx.fillRect(x - 4, y + 20, 8, 8);
  desenho(x, y);
}


// ---------- ABERTURA ----------

const intro = { t: 0, x: -60, base: CHAO, vy: 0, pose: "andar1", bx: 700, by: CHAO - 40, brot: 0, voando: false };

function iniciarIntro() {
  estado = "intro";
  intro.t = 0;
  intro.x = -60;
  intro.base = CHAO;
  intro.vy = 0;
  intro.bx = 720;
  intro.by = CHAO - 40;
  intro.brot = 0;
  intro.voando = false;
  particulas = [];
  cameraX = 0;
  tremor = 0;
  if (typeof atualizarTelas === "function") atualizarTelas();
}

function terminarIntro() {
  save.viuIntro = true;
  salvar();
  iniciarFase(0);
}

function atualizarIntro() {
  const c = intro;
  c.t++;
  tempo++;

  if (c.t < 110) {
    c.x += 5.4;
    c.pose = Math.floor(c.t / 7) % 2 ? "andar1" : "andar2";
  } else if (c.t < 150) {
    c.pose = "parado";
    if (c.t === 138) c.vy = -6;
  }

  if (c.t === 150) {
    c.voando = true;
    som("vento");
    tremor = 8;
  }
  if (c.voando) {
    c.bx += 6 + (c.t - 150) * 0.12;
    c.by -= 4.5 - (c.t - 150) * 0.03;
    c.brot += 0.3;
    if (c.t < 260 && tempo % 2 === 0) vento();
    if (c.t < 200 && tempo % 4 === 0) {
      particula({ tipo: "q", x: Math.random() * 400 + 200, y: CHAO - Math.random() * 300, vx: 9, vy: -1, g: 0, vida: 50, max: 50, cor: "#69db7c", tam: 6 });
    }
  }
  if (c.t >= 150 && c.t < 230) {
    c.pose = "queda";
    if (c.t < 190) c.x -= 1;
  } else if (c.t >= 230) {
    c.pose = "parado";
  }

  c.vy += GRAV;
  c.base = Math.min(CHAO, c.base + c.vy);
  if (c.base >= CHAO) c.vy = 0;

  if (tremor > 0) tremor--;
  atualizarParticulas();
  if (c.t > 470) terminarIntro();
}

function desenharIntro() {
  const c = intro;
  const tx = tremor > 0 ? Math.round((Math.random() - 0.5) * tremor) : 0;
  desenharFundo(0, 0);
  ctx.save();
  ctx.translate(tx, 0);
  desenharChaoCena(0, 0);
  ctx.drawImage(SPR_DECOR[0], 820, CHAO - SPR_DECOR[0].height);
  ctx.drawImage(SPR_DECOR[0], 120, CHAO - SPR_DECOR[0].height);

  // Banana
  ctx.save();
  ctx.translate(c.bx + 24, c.by + 20 + (c.voando ? 0 : Math.sin(c.t * 0.1) * 3));
  ctx.rotate(c.brot);
  ctx.drawImage(SPR_BANANA, -24, -20);
  ctx.restore();

  desenharMacacoCena(c.x, c.base, c.pose, 1, 0);

  if (c.t > 112 && c.t < 150) {
    balao(c.x, CHAO - 120, function(x, y) { ctx.drawImage(SPR_CORACAO, x - 14, y - 14); });
  }
  if (c.t > 160 && c.t < 260) {
    balao(c.x, CHAO - 120, function(x, y) {
      ctx.fillStyle = "#e03131";
      ctx.fillRect(x - 4, y - 14, 8, 18);
      ctx.fillRect(x - 4, y + 8, 8, 6);
    });
  }
  desenharParticulas();
  ctx.restore();

  ctx.textAlign = "center";
  if (c.t > 240) {
    ctx.globalAlpha = Math.min(1, (c.t - 240) / 20);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 120, LARGURA, 150);
    ctx.font = "bold 46px monospace";
    textoSombra("O vento levou a banana!", LARGURA / 2, 185, "#ffe066");
    if (c.t > 320) {
      ctx.font = "bold 24px monospace";
      textoSombra("Atravesse a Selva, o Deserto, a Era do Gelo e o Vulcão para recuperá-la!", LARGURA / 2, 235);
    }
    ctx.globalAlpha = 1;
  }
  if (c.t > 30) {
    ctx.font = "bold 16px monospace";
    textoSombra("Aperte qualquer tecla para começar", LARGURA / 2, ALTURA - 20, "#dee2e6");
  }
}


// ---------- FINAL ----------

const final = { t: 0 };

function iniciarFinal() {
  estado = "final";
  final.t = 0;
  particulas = [];
  cameraX = 0;
  save.zerou = true;
  save.chefes[MUNDOS.length - 1] = true;
  save.desbloqueado = TOTAL_FASES - 1;
  salvar();
  som("vitoria");
  if (typeof atualizarTelas === "function") atualizarTelas();
}

function atualizarFinal() {
  const f = final;
  f.t++;
  tempo++;
  if (f.t === 70 || f.t === 110 || f.t === 150) {
    som("nham");
    for (let i = 0; i < 8; i++) {
      particula({ tipo: "q", x: LARGURA / 2, y: CHAO - 120, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, g: 0.3, vida: 30, max: 30, cor: "#ffe066", tam: 6 });
    }
  }
  if (f.t > 170 && f.t % 4 === 0) {
    const cores = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#da77f2"];
    particula({ tipo: "q", x: Math.random() * LARGURA, y: -10, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2, g: 0.02, vida: 300, max: 300, cor: sorteio(cores), tam: 8 });
  }
  if (f.t === 175) som("vitoria");
  atualizarParticulas();
}

function desenharFinal() {
  const f = final;
  desenharFundo(0, 0);
  desenharChaoCena(0, 0);
  ctx.drawImage(SPR_DECOR[0], 200, CHAO - SPR_DECOR[0].height);
  ctx.drawImage(SPR_DECOR[0], 880, CHAO - SPR_DECOR[0].height);

  const pulando = f.t > 170 ? Math.abs(Math.sin(f.t * 0.12)) * 30 : 0;
  desenharMacacoCena(LARGURA / 2, CHAO - pulando, f.t < 170 ? "pulo" : (Math.sin(f.t * 0.12) > 0 ? "pulo" : "parado"), 1, 0);

  // Banana sendo comida em 3 mordidas
  const mordidas = f.t < 70 ? 0 : f.t < 110 ? 1 : f.t < 150 ? 2 : 3;
  if (mordidas < 3) {
    const h = SPR_BANANA.height;
    const corte = Math.round((h * mordidas) / 3);
    ctx.drawImage(SPR_BANANA, 0, corte, SPR_BANANA.width, h - corte, LARGURA / 2 - 24, CHAO - 130 + corte - pulando, SPR_BANANA.width, h - corte);
  }
  if (f.t > 170) {
    for (let i = 0; i < 3; i++) {
      const y = CHAO - 160 - ((f.t * 1.5 + i * 60) % 180);
      ctx.globalAlpha = 0.8;
      ctx.drawImage(SPR_CORACAO, LARGURA / 2 - 80 + i * 70, y);
      ctx.globalAlpha = 1;
    }
  }
  desenharParticulas();

  ctx.textAlign = "center";
  if (f.t > 180) {
    ctx.globalAlpha = Math.min(1, (f.t - 180) / 30);
    ctx.font = "bold 72px monospace";
    textoSombra("FIM!", LARGURA / 2, 150, "#ffe066");
    ctx.font = "bold 26px monospace";
    textoSombra("O primata finalmente comeu a sua banana!", LARGURA / 2, 205);
    ctx.font = "bold 20px monospace";
    textoSombra("Moedas guardadas: " + save.moedas + "  -  gaste tudo na loja!", LARGURA / 2, 245, "#ffe066");
    ctx.globalAlpha = 1;
  }
  if (f.t > 260) {
    ctx.font = "bold 18px monospace";
    textoSombra("Aperte qualquer tecla para voltar ao menu", LARGURA / 2, ALTURA - 20, "#dee2e6");
  }
}


// ---------- FUNDO DO MENU ----------

let menuT = 0;

function desenharMenuFundo() {
  const mundo = Math.floor(save.desbloqueado / FASES_POR_MUNDO);
  desenharFundo(mundo, menuT * 1.5);
  desenharChaoCena(mundo, menuT * 1.5);
  desenharMacacoCena(130, CHAO, Math.floor(menuT / 7) % 2 ? "andar1" : "andar2", 1, 0);
  ctx.save();
  ctx.translate(980, CHAO - 180 + Math.sin(menuT * 0.05) * 20);
  ctx.rotate(Math.sin(menuT * 0.03) * 0.4);
  ctx.drawImage(SPR_BANANA, -24, -20);
  ctx.restore();
  desenharClima();
}
