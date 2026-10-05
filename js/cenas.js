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
  // contorno, sombra sob a grama e franja do tema (anda junto com o chão)
  ctx.save();
  ctx.translate(-off, 0);
  acabamentoChao(mundo, 0, LARGURA + 64);
  ctx.restore();
}

function desenharMacacoCena(x, base, pose, dir, giro) {
  const spr = SPRITES_PRIMATA[pose][dir > 0 ? "d" : "e"];
  sombraCena(x, base, 58, 0.38);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(base));
  if (giro) { ctx.translate(0, -40); ctx.rotate(giro); ctx.translate(0, 40); }
  ctx.drawImage(spr, -48, -80);
  ctx.restore();
}

function balao(x, y, desenho) {
  painelPixel(x - 24, y - 24, 48, 48, "#8a5a2b", "rgba(255,255,255,0.97)");
  // pontinha do balão
  ctx.fillStyle = "#0d0704";
  ctx.fillRect(x - 6, y + 24, 12, 2);
  ctx.fillRect(x - 4, y + 26, 8, 2);
  ctx.fillRect(x - 2, y + 28, 4, 2);
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fillRect(x - 4, y + 24, 8, 2);
  ctx.fillRect(x - 2, y + 26, 4, 2);
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
  intro.acabou = false;
  particulas = [];
  cameraX = 0;
  tremor = 0;
  if (typeof atualizarTelas === "function") atualizarTelas();
}

function terminarIntro() {
  if (intro.acabou) return;
  intro.acabou = true;
  save.viuIntro = true;
  salvar();
  trocarCena(function() { iniciarFase(0); });
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
  [820, 120].forEach(function(dx) {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(dx + 6, CHAO - 1, SPR_DECOR[0].width - 8, 5);
    ctx.drawImage(SPR_DECOR[0], dx, CHAO - SPR_DECOR[0].height);
  });

  // Banana (com um brilhinho enquanto espera)
  const bY = c.by + 20 + (c.voando ? 0 : Math.sin(c.t * 0.1) * 3);
  if (!c.voando) sombraCena(c.bx + 24, c.by + 44, 44, 0.3);
  luzAditiva(c.bx + 24, bY, c.voando ? 56 : 74, "255,215,70", c.voando ? 0.35 : 0.45 + Math.sin(c.t * 0.1) * 0.12);
  ctx.save();
  ctx.translate(c.bx + 24, bY);
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
      ctx.fillStyle = "#ff8787";
      ctx.fillRect(x - 4, y - 14, 3, 18);
    });
  }
  desenharParticulas();
  ctx.restore();

  desenharClima();
  ambienteMundo(0, 0, c.t);

  ctx.textAlign = "center";
  if (c.t > 240) {
    // a faixa decorada abre do meio e o texto vai aparecendo
    const abre = suavizar((c.t - 240) / 14);
    const hh = Math.max(2, Math.round(176 * abre));
    ctx.drawImage(faixaMensagem("bom"), 0, 0, LARGURA, 176, 0, Math.round(194 - hh / 2), LARGURA, hh);
    if (c.t > 250) {
      ctx.globalAlpha = Math.min(1, (c.t - 250) / 16);
      ctx.font = "bold 46px " + FONTE;
      textoSombra(tr("O vento levou a banana!"), LARGURA / 2, 168, ["#fff9c4", "#ffc21a"], 3);
      ctx.globalAlpha = 1;
    }
    if (c.t > 300) {
      ctx.globalAlpha = Math.min(1, (c.t - 300) / 16);
      ctx.font = "bold 24px " + FONTE;
      textoSombra(tr("Atravesse a Selva, o Deserto, a Era do Gelo e o Vulcão para recuperá-la!"), LARGURA / 2, 214);
      ctx.globalAlpha = 1;
    }
    if (c.t > 350) {
      ctx.globalAlpha = Math.min(1, (c.t - 350) / 16);
      ctx.font = "bold 20px " + FONTE;
      textoSombra(tr("Dizem que ela foi parar nas garras do Dragão de Magma..."), LARGURA / 2, 250, "#ff922b");
      ctx.globalAlpha = 1;
    }
  }
  if (c.t > 30) {
    ctx.font = "bold 16px " + FONTE;
    ctx.globalAlpha = 0.65 + Math.sin(c.t * 0.08) * 0.35;
    textoSombra(toqueAtivo ? tr("Toque na tela para começar") : tr("Clique ou aperte qualquer tecla para começar"), LARGURA / 2, ALTURA - 20, "#dee2e6");
    ctx.globalAlpha = 1;
  }
}


// ---------- FINAL: o macaco derrota o Dragão, pega a banana e finalmente come ----------

const final = { t: 0, etapa: "", pronto: false };

function iniciarCenaFinal() {
  cronFimFase();
  cronFimRun();
  avaliarFase();
  const j = jogador;
  const c = chefe;
  estado = "final";
  pausado = false;
  mensagem = null;
  Object.assign(final, {
    t: 0, et: 0, etapa: "queda", pronto: false,
    mx: j.x + j.w / 2, mbase: j.y + j.h, mvy: 0, mdir: c.x + c.w / 2 > j.x + j.w / 2 ? 1 : -1, pose: "parado",
    dx: c.x, dy: c.y, dvx: 0, dvy: 0, drot: 0, desc: 1, ddir: c.dir, pousou: false,
    comBanana: true, bx: 0, by: 0, bvx: 0, bvy: 0, brot: 0, mordidas: 0, laco: 0
  });
  cancelarLaco();
  tremor = 25;
  flashNuke = 20;
  som("rugido");

  // Recompensas do último chefe
  const premio = save.chefes[3] ? 60 : RECOMPENSA_CHEFE[3];
  save.moedas += premio;
  final.premio = premio;
  save.chefes[3] = true;
  // Zerou pela primeira vez: libera o modo speedrun (liga o cronômetro)
  final.speedrun = !save.zerou && !save.cronometro;
  if (final.speedrun) save.cronometro = true;
  save.zerou = true;
  save.desbloqueado = TOTAL_FASES - 1;
  final.cosmetico = darPremioDaFase(fase.indice);
  salvar();
  if (typeof atualizarTelas === "function") atualizarTelas();
}

function proximaEtapa(nome) {
  final.etapa = nome;
  final.et = 0;
}

function atualizarFinal() {
  const f = final;
  const spr = SPR_CHEFE.dragao;
  f.t++;
  f.et++;
  tempo++;
  if (tremor > 0) tremor--;
  if (flashNuke > 0) flashNuke--;

  // O macaco cai até o chão se estava pulando
  if (f.mbase < CHAO) {
    f.mvy += GRAV;
    f.mbase = Math.min(CHAO, f.mbase + f.mvy);
  }

  const meioDragao = f.dx + spr.w / 2;

  switch (f.etapa) {
    case "queda":
      f.pose = "parado";
      f.dvy += 0.5;
      f.dy = Math.min(CHAO - spr.h, f.dy + f.dvy);
      if (f.et % 6 === 0) {
        const px = f.dx + Math.random() * spr.w;
        const py = f.dy + Math.random() * spr.h;
        for (let i = 0; i < 8; i++) particula({ tipo: "q", x: px, y: py, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, g: 0, vida: 20, max: 20, cor: i % 2 ? "#ffd43b" : "#ff6b00", tam: 8 });
        som("pisao");
      }
      if (f.dy >= CHAO - spr.h && !f.pousou) {
        f.pousou = true;
        tremor = 20;
        som("pancada");
        poeira(f.dx + 30, CHAO, 8, -1);
        poeira(f.dx + spr.w - 30, CHAO, 8, 1);
      }
      if (f.et > 70 && f.pousou) proximaEtapa("tonto");
      break;

    case "tonto":
      if (f.et > 40) proximaEtapa("andando");
      break;

    case "andando": {
      f.mdir = meioDragao > f.mx ? 1 : -1;
      const alvo = meioDragao - f.mdir * (spr.w / 2 + 170);
      if (Math.abs(alvo - f.mx) > 4 && f.et < 90) {
        f.mx += Math.sign(alvo - f.mx) * 4;
        f.pose = Math.floor(f.t / 7) % 2 ? "andar1" : "andar2";
      } else {
        f.pose = "parado";
        som("laco");
        proximaEtapa("laco");
      }
      break;
    }

    case "laco": {
      f.pose = "tiro";
      const borda = f.mdir > 0 ? f.dx + 20 : f.dx + spr.w - 20;
      const dist = Math.abs(borda - (f.mx + f.mdir * 32));
      f.laco = Math.min(dist, f.laco + 26);
      if (f.laco >= dist) { som("agarrou"); proximaEtapa("puxando"); }
      break;
    }

    case "puxando": {
      f.pose = "tiro";
      const alvoX = f.mdir > 0 ? f.mx + 60 : f.mx - 60 - spr.w;
      f.dx += limitar(alvoX - f.dx, -9, 9);
      const borda = f.mdir > 0 ? f.dx + 20 : f.dx + spr.w - 20;
      f.laco = Math.abs(borda - (f.mx + f.mdir * 32));
      if (Math.abs(alvoX - f.dx) < 2) {
        proximaEtapa("chute");
        f.laco = 0;
        f.dvx = f.mdir * 5;
        f.dvy = -17;
        tremor = 35;
        flashNuke = 25;
        som("chute");
        particula({ tipo: "texto", x: f.mx + f.mdir * 120, y: CHAO - 160, vx: 0, vy: -1.2, g: 0, vida: 70, max: 70, texto: "POW!!!", cor: "#ffd43b", tam: 64 });
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          particula({ tipo: "q", x: f.mx + f.mdir * 70, y: CHAO - 50, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, g: 0, vida: 25, max: 25, cor: i % 2 ? "#ffffff" : "#ffd43b", tam: 9 });
        }
      }
      break;
    }

    case "chute":
      f.pose = f.et < 25 ? "chute" : "parado";
      voarDragao(f, spr);
      if (f.et > 25) proximaEtapa("pegarBanana");
      break;

    case "pegarBanana": {
      voarDragao(f, spr);
      if (!f.comBanana) {
        f.bvy = Math.min(f.bvy + 0.22, 7);
        f.bx += f.bvx;
        f.by += f.bvy;
        f.brot += 0.15;
        const alvo = f.bx + 24;
        if (Math.abs(alvo - f.mx) > 3) {
          f.mdir = alvo > f.mx ? 1 : -1;
          f.mx += Math.sign(alvo - f.mx) * Math.min(5, Math.abs(alvo - f.mx));
          f.pose = Math.floor(f.t / 6) % 2 ? "andar1" : "andar2";
        } else {
          f.pose = "vitoria";
        }
        if (f.by + 40 >= f.mbase - 110 && Math.abs(alvo - f.mx) < 40) {
          som("vitoria");
          for (let i = 0; i < 16; i++) particula({ tipo: "q", x: f.mx, y: f.mbase - 110, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, g: 0, vida: 25, max: 25, cor: "#ffe066", tam: 6 });
          proximaEtapa("pegou");
        }
        if (f.by > CHAO) { f.by = CHAO - 40; f.bx = f.mx - 24; }
      }
      break;
    }

    case "pegou":
      f.pose = "vitoria";
      voarDragao(f, spr);
      if (f.et > 50) proximaEtapa("comendo");
      break;

    case "comendo":
      f.pose = f.et % 30 < 15 ? "vitoria" : "parado";
      if (f.et === 20 || f.et === 50 || f.et === 80) {
        f.mordidas++;
        som("nham");
        particula({ tipo: "texto", x: f.mx + 40, y: f.mbase - 130, vx: 0, vy: -1, g: 0, vida: 40, max: 40, texto: tr("Nham!"), cor: "#ffffff", tam: 24 });
        for (let i = 0; i < 8; i++) particula({ tipo: "q", x: f.mx, y: f.mbase - 100, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, g: 0.3, vida: 30, max: 30, cor: "#ffe066", tam: 6 });
      }
      if (f.et > 110) { som("vitoria"); proximaEtapa("festa"); }
      break;

    case "festa":
      f.pose = Math.sin(f.et * 0.12) > 0 ? "vitoria" : "parado";
      if (f.mbase >= CHAO && f.et % 30 === 0) f.mvy = -8;
      if (f.et % 4 === 0) {
        const cores = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#da77f2"];
        particula({ tipo: "q", x: Math.random() * LARGURA, y: -10, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2, g: 0.02, vida: 300, max: 300, cor: sorteio(cores), tam: 8 });
      }
      if (f.et === 220) f.pronto = true;
      break;
  }

  atualizarParticulas();
}

// O Dragão sobe girando pro espaço e solta a banana no caminho
function voarDragao(f, spr) {
  if (f.desc <= 0) return;
  f.dx += f.dvx;
  f.dy += f.dvy;
  f.dvy -= 0.2;
  f.drot += 0.3;
  f.desc = Math.max(0.15, f.desc - 0.01);
  if (tempo % 2 === 0) particula({ tipo: "fumaca", x: f.dx + spr.w / 2, y: f.dy + spr.h / 2, vx: 0, vy: 0, g: 0, vida: 30, max: 30, cor: "#dee2e6", tam: 30 * f.desc + 8 });
  if (f.comBanana && f.dy < 260) {
    f.comBanana = false;
    f.bx = f.dx + spr.w / 2 - 24;
    f.by = f.dy + spr.h / 2;
    f.bvy = -4;
    f.bvx = limitar((f.mx - f.bx - 24) / 90, -3, 3);
    som("vento");
  }
  if (f.dy + spr.h * f.desc < -40) {
    f.desc = 0;
    particula({ tipo: "estrela", x: limitar(f.dx + spr.w / 2, 40, LARGURA - 40), y: 30, vx: 0, vy: 0, g: 0, vida: 90, max: 90 });
    som("estrela");
  }
}

function desenharDragaoFinal(f) {
  const spr = SPR_CHEFE.dragao;
  if (f.desc <= 0) return;
  // quadro do dragão conforme a etapa: tonto girando os olhos, caindo com dano ou parado cansado
  const tonto = f.etapa === "tonto" || f.etapa === "andando" || f.etapa === "laco" || f.etapa === "puxando";
  const fr = spr.q[f.etapa === "queda" ? "dano" : tonto ? "tonto" : "pouso1"];
  const flash = f.etapa === "queda" && f.t % 8 < 4;
  const img = flash ? (f.ddir > 0 ? fr.flashD : fr.flashE) : (f.ddir > 0 ? fr.d : fr.e);
  sombraCena(f.dx + spr.w / 2, f.dy + spr.h, spr.w * 0.85 * f.desc, 0.36);
  if (f.etapa !== "festa" && f.etapa !== "comendo") luzAditiva(f.dx + spr.w / 2, f.dy + spr.h / 2, 130 * f.desc, "255,110,30", 0.18);
  ctx.save();
  ctx.translate(Math.round(f.dx + spr.w / 2), Math.round(f.dy + spr.h / 2));
  ctx.rotate(f.drot);
  ctx.scale(f.desc, f.desc);
  ctx.translate(-spr.w / 2, -spr.h / 2);
  // asas: dobradas quando está tonto ou andando; senão batendo
  const dobrada = tonto || f.etapa === "queda" || f.etapa === "festa" || f.etapa === "comendo";
  const idx = Math.round(((Math.cos(tempo * 0.4) + 1) / 2) * (SPR_ASA.quadros.length - 1));
  desenharAsasDragao(f.ddir, SPR_ASA.quadros.length - 1 - idx, dobrada, spr.w);
  ctx.drawImage(img, 0, 0);
  desenharBananaDragao(f.ddir, fr, spr.w, f.comBanana);
  if (tonto) {
    ctx.fillStyle = "#1a0a0a";
    (fr.olhos || []).forEach(function(o) {
      const a = tempo * 0.3;
      ctx.fillRect(Math.round((f.ddir > 0 ? o[0] * 3 : spr.w - o[0] * 3) + Math.cos(a) * 5 - 2), Math.round(o[1] * 3 + Math.sin(a) * 5 - 2), 4, 4);
    });
  }
  ctx.restore();
  if (f.etapa === "tonto" || f.etapa === "andando" || f.etapa === "laco" || f.etapa === "puxando") {
    for (let i = 0; i < 3; i++) {
      const a = tempo * 0.12 + (i * Math.PI * 2) / 3;
      desenharEstrela4(f.dx + spr.w * 0.8 + Math.cos(a) * 40, f.dy + 10 + Math.sin(a) * 10, 8, "#ffe066");
    }
  }
}

function formatarTempo(frames) {
  const seg = Math.floor(frames / 60);
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  return (h ? h + "h " : "") + m + "min " + (s < 10 ? "0" : "") + s + "s";
}

function desenharFinal() {
  const f = final;
  const tx = tremor > 0 ? Math.round((Math.random() - 0.5) * Math.min(tremor, 16)) : 0;
  desenharFundo(3, 0);

  // O céu vai clareando quando o macaco come a banana
  if (f.etapa === "comendo" || f.etapa === "festa") {
    const k = f.etapa === "festa" ? Math.min(1, f.et / 120) : 0;
    ctx.fillStyle = "rgba(255,200,120," + (0.15 + k * 0.35) + ")";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }

  ctx.save();
  ctx.translate(tx, 0);
  desenharSolidos(0);
  desenharPlataformas(0);
  desenharDragaoFinal(f);

  // Cipó-laço puxando o Dragão
  if (f.laco > 0) {
    const mx = f.mx + f.mdir * 32;
    const my = f.mbase - 22;
    desenharCorda(mx, my, mx + f.mdir * f.laco, my - 10, "#2b8a3e", "#69db7c");
  }

  desenharMacacoCena(f.mx, f.mbase, f.pose, f.mdir, 0);

  // A banana: caindo, na mão ou sendo comida
  const naMao = f.etapa === "pegou" || f.etapa === "comendo" || f.etapa === "festa";
  if (!f.comBanana && !naMao) {
    luzAditiva(f.bx + 24, f.by + 20, 56, "255,215,70", 0.4);
    ctx.save();
    ctx.translate(f.bx + 24, f.by + 20);
    ctx.rotate(f.brot);
    ctx.drawImage(SPR_BANANA, -24, -20);
    ctx.restore();
  } else if (naMao && f.mordidas < 3) {
    luzAditiva(f.mx, f.mbase - 100, 54, "255,215,70", 0.35);
    const h = SPR_BANANA.height;
    const corte = Math.round((h * f.mordidas) / 3);
    ctx.drawImage(SPR_BANANA, 0, corte, SPR_BANANA.width, h - corte, Math.round(f.mx - 24), Math.round(f.mbase - 122 + corte), SPR_BANANA.width, h - corte);
  }
  if (f.etapa === "festa") {
    for (let i = 0; i < 3; i++) {
      const y = f.mbase - 160 - ((f.et * 1.5 + i * 60) % 180);
      ctx.globalAlpha = 0.8;
      ctx.drawImage(SPR_CORACAO, f.mx - 90 + i * 70, y);
      ctx.globalAlpha = 1;
    }
  }
  desenharParticulas();
  ctx.restore();

  if (flashNuke > 0) {
    ctx.fillStyle = "rgba(255,255,255," + flashNuke / 30 + ")";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }

  desenharClima();
  ambienteMundo(3, 0, tempo);

  ctx.textAlign = "center";
  if (f.etapa === "festa" && f.et > 40) {
    const abre = suavizar((f.et - 40) / 16);
    const hh = Math.max(2, Math.round(176 * abre));
    ctx.drawImage(faixaMensagem("bom"), 0, 0, LARGURA, 176, 0, Math.round(146 - hh / 2), LARGURA, hh);
    if (f.et > 50) {
      ctx.globalAlpha = Math.min(1, (f.et - 50) / 20);
      const esc = 0.6 + 0.4 * saltitar((f.et - 50) / 24);
      ctx.save();
      ctx.translate(LARGURA / 2, 136);
      ctx.scale(esc, esc);
      ctx.font = "bold 72px " + FONTE;
      textoSombra(tr("FIM!"), 0, 0, ["#fff9c4", "#ffb700"], 4);
      ctx.restore();
      ctx.font = "bold 22px " + FONTE;
      textoSombra(tr("O primata derrotou o Dragão de Magma e finalmente comeu a sua banana!"), LARGURA / 2, 188);
      ctx.globalAlpha = 1;
    }
  }
  if (f.etapa === "festa" && f.et > 120) {
    const st = save.stats;
    const linhas = [
      tr("Nível {0}   ·   Moedas: {1}", save.nivel, save.moedas) + (f.premio ? " (+" + f.premio + ")" : ""),
      tr("Inimigos derrotados: {0}   ·   Chutados pro espaço: {1}", st.inimigos, st.chutes),
      tr("Chefes derrotados: {0}   ·   Quedas: {1}", st.chefes, st.mortes),
      tr("Tempo de jogo: {0}", formatarTempo(st.tempo))
    ];
    linhas.push(tr("Estrelas: {0}/{1}", totalEstrelas(), TOTAL_FASES * 3));
    const speedrun = linhaCronFinal();
    if (speedrun) linhas.push(speedrun);
    if (f.speedrun) linhas.push(tr("Modo speedrun liberado! O cronômetro foi ligado."));
    if (f.cosmetico) linhas.push(tr("Nova skin: {0}!", f.cosmetico.nome));
    ctx.globalAlpha = Math.min(1, (f.et - 120) / 30);
    painelPixel(LARGURA / 2 - 380, 250, 760, 40 + linhas.length * 28, "#ffd43b", "rgba(20,12,6,0.82)");
    ctx.font = "bold 18px " + FONTE;
    linhas.forEach(function(l, i) { textoSombra(l, LARGURA / 2, 282 + i * 28, i === linhas.length - 1 && f.cosmetico ? "#ffe066" : "#ffffff"); });
    ctx.globalAlpha = 1;
  }
  if (f.pronto) {
    ctx.font = "bold 18px " + FONTE;
    ctx.globalAlpha = 0.65 + Math.sin(f.et * 0.08) * 0.35;
    textoSombra(toqueAtivo ? tr("Toque na tela para voltar ao menu") : tr("Clique ou aperte qualquer tecla para voltar ao menu"), LARGURA / 2, ALTURA - 20, "#dee2e6");
    ctx.globalAlpha = 1;
  }
}


// ---------- FUNDO DO MENU ----------

let menuT = 0;

function desenharMenuFundo() {
  const mundo = Math.floor(save.desbloqueado / FASES_POR_MUNDO);
  desenharFundo(mundo, menuT * 1.5, menuT);
  desenharChaoCena(mundo, menuT * 1.5);
  desenharMacacoCena(130, CHAO, Math.floor(menuT / 7) % 2 ? "andar1" : "andar2", 1, 0);
  const by = CHAO - 180 + Math.sin(menuT * 0.05) * 20;
  sombraCena(980, by + 44, 40, 0.3);
  luzAditiva(980, by, 80, "255,215,70", 0.4 + Math.sin(menuT * 0.1) * 0.1);
  ctx.save();
  ctx.translate(980, by);
  ctx.rotate(Math.sin(menuT * 0.03) * 0.4);
  ctx.drawImage(SPR_BANANA, -24, -20);
  ctx.restore();
  desenharClima();
  ambienteMundo(mundo, menuT * 1.5, menuT);
}
