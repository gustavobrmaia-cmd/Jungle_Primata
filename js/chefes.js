"use strict";

// =========================
// CHEFES: um no fim de cada mundo, cada um com seus poderes
// =========================

const DEF_CHEFES = {
  gorila:       { hp: 40, margem: [12, 20, 12, 0] },
  escorpiaoRei: { hp: 40, margem: [10, 54, 10, 0] },
  yeti:         { hp: 50, margem: [12, 12, 12, 0] },
  dragao:       { hp: 60, margem: [30, 50, 12, 12], voa: true }
};

function criarChefe(mundo) {
  const tipo = MUNDOS[mundo].chefe;
  const def = DEF_CHEFES[tipo];
  const spr = SPR_CHEFE[tipo];
  const c = {
    tipo: tipo, def: def, nome: MUNDOS[mundo].nomeChefe,
    x: 880, y: -spr.h - 40, w: spr.w, h: spr.h, vx: 0, vy: 0, dir: -1,
    hp: def.hp, hpMax: def.hp, vivo: true, estado: "entrada", t: 0,
    flash: 0, invencivel: 0, noChao: false, batidaX: 0,
    intangivel: false, afundar: 0, ultimo: "", rot: 0, escala: 1, caixa: null
  };
  if (tipo === "dragao") { c.x = LARGURA + 40; c.y = 200; }
  atualizarCaixa(c);
  return c;
}

function atualizarCaixa(c) {
  const m = c.def.margem;
  c.caixa = { x: c.x + m[0], y: c.y + m[1], w: c.w - m[0] - m[2], h: c.h - m[1] - m[3] };
}

function proximoAtaque(c, lista) {
  let a;
  do { a = sorteio(lista); } while (a === c.ultimo && lista.length > 1);
  c.ultimo = a;
  c.estado = a;
  c.t = 0;
}

function irPara(c, estado) {
  c.estado = estado;
  c.t = 0;
}

function alvoX(c) {
  return jogador.x + jogador.w / 2 - c.w / 2;
}

function olharProJogador(c) {
  c.dir = jogador.x + jogador.w / 2 > c.x + c.w / 2 ? 1 : -1;
}

function fisicaChefe(c) {
  c.vy = Math.min(c.vy + GRAV, MAX_QUEDA);
  moverCorpo(c, false);
  c.x = limitar(c.x, 0, LARGURA - c.w);
}

function danoChefe(dano, origemX, ignoraInvencivel) {
  const c = chefe;
  if (!c || !c.vivo || c.intangivel || c.estado === "entrada") return;
  if (c.invencivel > 0 && !ignoraInvencivel) return;
  if (c.estado === "tonto") dano *= 2;
  c.hp -= dano;
  c.flash = 6;
  c.invencivel = 6;
  som("pisao");
  if (c.hp <= 0) {
    c.hp = 0;
    c.vivo = false;
    c.afundar = 0;
    c.intangivel = false;
    save.stats.chefes++;
    ganharXp(XP.chefe + 100 * fase.mundo);
    if (c.tipo === "dragao") {
      // O último chefe guardava a banana: começa a cena final
      projeteis = [];
      iniciarCenaFinal();
      return;
    }
    irPara(c, "derrotado");
    projeteis = projeteis.filter(function(p) { return p.doJogador; });
    som("rugido");
    tremor = 30;
  }
}

function atualizarChefe() {
  const c = chefe;
  const j = jogador;
  c.t++;
  if (c.flash > 0) c.flash--;
  if (c.invencivel > 0) c.invencivel--;

  // ----- Entrada -----
  if (c.estado === "entrada") {
    if (c.def.voa) {
      c.x += (860 - c.x) * 0.04;
      c.y += (200 - c.y) * 0.04;
      c.dir = -1;
      if (c.t === 60) { som("rugido"); tremor = 25; }
      if (c.t > 100) irPara(c, "voar");
    } else {
      fisicaChefe(c);
      if (c.noChao && !c.pousou) {
        c.pousou = true;
        tremor = 25;
        som("pancada");
        poeira(c.x + 20, CHAO, 6, -1);
        poeira(c.x + c.w - 20, CHAO, 6, 1);
      }
      if (c.pousou && c.t > 90) irPara(c, "parado");
    }
    atualizarCaixa(c);
    return;
  }

  // ----- Derrotado: explode e é chutado pro espaço -----
  if (c.estado === "derrotado") {
    if (c.t < 80) {
      if (!c.def.voa || c.t > 1) fisicaChefe(c);
      if (c.t % 6 === 0) {
        const px = c.x + Math.random() * c.w;
        const py = c.y + Math.random() * c.h;
        for (let i = 0; i < 8; i++) {
          particula({ tipo: "q", x: px, y: py, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, g: 0, vida: 20, max: 20, cor: i % 2 ? "#ffd43b" : "#ff6b00", tam: 8 });
        }
        som("pisao");
      }
      c.flash = c.t % 8 < 4 ? 2 : 0;
    } else if (c.t === 80) {
      c.vx = (c.x + c.w / 2 > LARGURA / 2 ? 1 : -1) * 4;
      c.vy = -14;
      som("chute");
      tremor = 20;
      particula({ tipo: "texto", x: c.x + c.w / 2, y: c.y, vx: 0, vy: -1.5, g: 0, vida: 50, max: 50, texto: "POW!!", cor: "#ffd43b", tam: 48 });
    } else if (!c.foiPro) {
      c.x += c.vx;
      c.y += c.vy;
      c.vy -= 0.2;
      c.rot += 0.3;
      c.escala = Math.max(0.15, c.escala - 0.012);
      if (tempo % 2 === 0) particula({ tipo: "fumaca", x: c.x + c.w / 2, y: c.y + c.h / 2, vx: 0, vy: 0, g: 0, vida: 30, max: 30, cor: "#dee2e6", tam: 30 * c.escala + 8 });
      if (c.y + c.h * c.escala < -40) {
        c.foiPro = true;
        particula({ tipo: "estrela", x: limitar(c.x + c.w / 2, 40, LARGURA - 40), y: 26, vx: 0, vy: 0, g: 0, vida: 70, max: 70 });
        som("estrela");
        const premio = save.chefes[fase.mundo] ? 60 : RECOMPENSA_CHEFE[fase.mundo];
        ganharMoedas(premio, LARGURA / 2, 200);
        save.chefes[fase.mundo] = true;
        mostrarMensagem("Chefe derrotado!", "+" + premio + " moedas. Pegue a banana!", 150, null, false);
        soltarBananaDoCeu();
      }
    }
    atualizarCaixa(c);
    return;
  }

  IA_CHEFES[c.tipo](c, c.hp <= c.hpMax / 2);
  atualizarCaixa(c);

  // Encostar no chefe machuca (pular na cabeça dele dá dano)
  if (!j.morto && !c.intangivel && encosta(j, c.caixa)) {
    if (j.vy > 0 && j.pesAntes <= c.caixa.y + 26) {
      danoChefe(3, j.x + j.w / 2, true);
      c.invencivel = 30;
      j.vy = -14;
      j.pulouNormal = false;
      j.pulosExtras = 1;
    } else {
      machucar(c.x + c.w / 2);
    }
  }
}

function jogarNoJogador(x, y, vy, g, tipo, extra) {
  const dx = jogador.x + jogador.w / 2 - x;
  const tempoVoo = Math.max(30, (-2 * vy) / g);
  const p = Object.assign({ tipo: tipo, x: x - 12, y: y - 12, w: 24, h: 24, vx: limitar(dx / tempoVoo, -10, 10), vy: vy, g: g, vida: 300 }, extra || {});
  projeteis.push(p);
  return p;
}

function chuvaDoCeu(n, tipo, w, h, extra) {
  const xs = [jogador.x + jogador.w / 2 - w / 2];
  for (let i = 1; i < n; i++) xs.push(40 + Math.random() * (LARGURA - 80 - w));
  xs.forEach(function(x, i) {
    projeteis.push(Object.assign({ tipo: tipo, x: x, y: -h - 10, w: w, h: h, vx: 0, vy: 1, g: 0.45, vida: 400,
      aviso: 35 + i * 9, marcar: true, quebraNoChao: true }, extra || {}));
  });
}

const IA_CHEFES = {

  // ---------- Gorila Rei: pulo que faz ondas de choque, cocos e investida ----------
  gorila: function(c, raiva) {
    const j = jogador;
    switch (c.estado) {
      case "parado":
        olharProJogador(c);
        c.vx = Math.abs(alvoX(c) - c.x) > 200 ? aproximar(c.vx, c.dir * 1.2, 0.2) : aproximar(c.vx, 0, 0.3);
        fisicaChefe(c);
        if (c.t > (raiva ? 40 : 70)) proximoAtaque(c, ["pulo", "cocos", "investida"]);
        break;

      case "pulo":
        if (c.t === 1) {
          olharProJogador(c);
          c.vy = -17;
          c.vx = limitar((alvoX(c) - c.x) / 48, -9, 9);
          som("rugido");
        }
        fisicaChefe(c);
        if (c.t > 5 && c.noChao) {
          c.vx = 0;
          tremor = 16;
          som("pancada");
          const meio = c.x + c.w / 2;
          projeteis.push({ tipo: "onda", x: meio - 60, y: CHAO - 30, w: 34, h: 30, vx: -6.5, vy: 0, vida: 240 });
          projeteis.push({ tipo: "onda", x: meio + 26, y: CHAO - 30, w: 34, h: 30, vx: 6.5, vy: 0, vida: 240 });
          poeira(meio, CHAO, 10);
          if (raiva && !c.pulou2) { c.pulou2 = true; irPara(c, "pulo"); }
          else { c.pulou2 = false; irPara(c, "parado"); }
        }
        break;

      case "cocos":
        c.vx = 0;
        olharProJogador(c);
        fisicaChefe(c);
        if (c.t > 0 && c.t % 16 === 0 && c.t <= (raiva ? 80 : 48)) {
          const p = jogarNoJogador(c.x + c.w / 2 + c.dir * 40, c.y + 30, -11, 0.4, "coco");
          p.vx += (Math.random() - 0.5) * 3;
        }
        if (c.t > 100) irPara(c, "parado");
        break;

      case "investida":
        if (c.t === 1) { olharProJogador(c); som("rugido"); }
        if (c.t < 35) {
          c.vx = 0;
          if (c.t % 10 === 0) tremor = 4;
        } else {
          c.vx = c.dir * (raiva ? 11 : 9);
          if (tempo % 3 === 0) poeira(c.x + c.w / 2 - c.dir * 50, CHAO, 1);
        }
        fisicaChefe(c);
        if (c.t > 35 && c.batidaX) {
          irPara(c, "tonto");
          tremor = 20;
          som("pancada");
          c.vx = -c.dir * 3;
          c.vy = -6;
          chuvaDoCeu(raiva ? 4 : 3, "coco", 24, 24);
        }
        break;

      case "tonto":
        c.vx = aproximar(c.vx, 0, 0.2);
        fisicaChefe(c);
        if (c.t > 110) irPara(c, "parado");
        break;
    }
  },

  // ---------- Escorpião Faraó: se enterra, ferrão venenoso e tempestade de areia ----------
  escorpiaoRei: function(c, raiva) {
    switch (c.estado) {
      case "parado":
        olharProJogador(c);
        c.vx = aproximar(c.vx, 0, 0.3);
        fisicaChefe(c);
        if (c.t > (raiva ? 35 : 60)) {
          const temTornado = projeteis.some(function(p) { return p.tipo === "tornado"; });
          proximoAtaque(c, temTornado ? ["andar", "enterrar", "ferrao"] : ["andar", "enterrar", "ferrao", "tempestade"]);
        }
        break;

      case "andar":
        olharProJogador(c);
        c.vx = c.dir * (raiva ? 3.5 : 2.5);
        fisicaChefe(c);
        if (c.t > 70) irPara(c, "parado");
        break;

      case "enterrar":
        c.vx = 0;
        if (c.t <= 30) {
          c.afundar = c.t * (c.h / 30);
          if (tempo % 2 === 0) poeira(c.x + Math.random() * c.w, CHAO, 1);
          if (c.t === 30) c.intangivel = true;
        } else {
          const ax = alvoX(c);
          c.x += limitar(ax - c.x, -5, 5);
          c.x = limitar(c.x, 0, LARGURA - c.w);
          if (tempo % 2 === 0) particula({ tipo: "q", x: c.x + c.w / 2 + (Math.random() - 0.5) * 60, y: CHAO - 4, vx: 0, vy: -2, g: 0.1, vida: 20, max: 20, cor: "#e0b062", tam: 7 });
          if ((Math.abs(ax - c.x) < 8 && c.t > 50) || c.t > 140) irPara(c, "emergir");
        }
        break;

      case "emergir":
        if (c.t < 25) {
          if (tempo % 2 === 0) particula({ tipo: "q", x: c.x + c.w / 2 + (Math.random() - 0.5) * 80, y: CHAO - 4, vx: (Math.random() - 0.5) * 3, vy: -4, g: 0.2, vida: 25, max: 25, cor: "#e0b062", tam: 8 });
        } else if (c.t === 25) {
          c.intangivel = false;
          c.afundar = 0;
          c.vy = -15;
          tremor = 12;
          som("pancada");
          poeira(c.x + c.w / 2, CHAO, 12);
        }
        if (c.t >= 25) {
          fisicaChefe(c);
          if (c.t > 30 && c.noChao) irPara(c, "parado");
        }
        break;

      case "ferrao":
        c.vx = 0;
        olharProJogador(c);
        fisicaChefe(c);
        if (c.t === 20 || (raiva && c.t === 55)) {
          const n = raiva ? 5 : 3;
          const ox = c.dir > 0 ? c.x + 99 : c.x + c.w - 99;
          for (let k = 0; k < n; k++) {
            const p = jogarNoJogador(ox, c.y + 27, -10 - k * 0.6, 0.35, "veneno");
            p.vx += (k - (n - 1) / 2) * 1.4;
          }
          som("laco");
        }
        if (c.t > 90) irPara(c, "parado");
        break;

      case "tempestade":
        c.vx = 0;
        fisicaChefe(c);
        if (c.t === 1) { som("rugido"); tremor = 15; }
        if (c.t === 10) {
          const daEsquerda = c.x + c.w / 2 > LARGURA / 2;
          projeteis.push({ tipo: "tornado", x: daEsquerda ? -70 : LARGURA + 10, y: CHAO - 90, w: 60, h: 90, vx: daEsquerda ? 3.2 : -3.2, vy: 0, vida: 500, atravessa: true });
        }
        if (raiva && c.t === 80) {
          const daEsquerda = c.x + c.w / 2 <= LARGURA / 2;
          projeteis.push({ tipo: "tornado", x: daEsquerda ? -70 : LARGURA + 10, y: CHAO - 90, w: 60, h: 90, vx: daEsquerda ? 3.8 : -3.8, vy: 0, vida: 500, atravessa: true });
        }
        if (c.t > (raiva ? 90 : 50)) irPara(c, "parado");
        break;
    }
  },

  // ---------- Yeti: bola de neve gigante, rugido que derruba estalactites e deslizada ----------
  yeti: function(c, raiva) {
    switch (c.estado) {
      case "parado":
        olharProJogador(c);
        c.vx = aproximar(c.vx, 0, 0.2);
        fisicaChefe(c);
        if (c.t > (raiva ? 35 : 60)) proximoAtaque(c, ["bolaNeve", "rugido", "deslize", "pulo"]);
        break;

      case "bolaNeve":
        c.vx = 0;
        olharProJogador(c);
        fisicaChefe(c);
        if (c.t === 30) {
          projeteis.push({ tipo: "bolao", x: c.dir > 0 ? c.x + c.w : c.x - 72, y: CHAO - 72, w: 72, h: 72,
            vx: c.dir * (raiva ? 7 : 5.5), vy: 0, g: 0.6, rola: true, vida: 400 });
          som("pancada");
        }
        if (c.t > 70) irPara(c, "parado");
        break;

      case "rugido":
        c.vx = 0;
        fisicaChefe(c);
        if (c.t < 50 && c.t % 3 === 0) tremor = 5;
        if (c.t === 1) som("rugido");
        if (c.t === 15) chuvaDoCeu(raiva ? 8 : 5, "gelo", 24, 36);
        if (c.t > 80) irPara(c, "parado");
        break;

      case "deslize":
        if (c.t === 1) olharProJogador(c);
        if (c.t < 25) c.vx = 0;
        else {
          c.vx = c.dir * (raiva ? 13 : 11);
          if (tempo % 2 === 0) particula({ tipo: "q", x: c.x + c.w / 2, y: CHAO - 4, vx: -c.dir * 2, vy: -2, g: 0.1, vida: 20, max: 20, cor: "#e7f5ff", tam: 7 });
        }
        fisicaChefe(c);
        if (c.t > 25 && c.batidaX) {
          irPara(c, "tonto");
          tremor = 18;
          som("pancada");
          chuvaDoCeu(3, "gelo", 24, 36);
        }
        break;

      case "pulo":
        if (c.t === 1) {
          olharProJogador(c);
          c.vy = -16;
          c.vx = limitar((alvoX(c) - c.x) / 45, -9, 9);
        }
        fisicaChefe(c);
        if (c.t > 5 && c.noChao) {
          c.vx = 0;
          tremor = 14;
          som("pancada");
          for (let k = 0; k < (raiva ? 6 : 4); k++) {
            const lado = k % 2 ? 1 : -1;
            projeteis.push({ tipo: "neve", x: c.x + c.w / 2 - 10, y: c.y + 40, w: 20, h: 20, vx: lado * (2 + k), vy: -9, g: 0.35, vida: 200 });
          }
          irPara(c, "parado");
        }
        break;

      case "tonto":
        c.vx = aproximar(c.vx, 0, 0.3);
        fisicaChefe(c);
        if (c.t > 80) irPara(c, "parado");
        break;
    }
  },

  // ---------- Dragão de Magma: sopro de fogo, chuva de meteoros e mergulho ----------
  dragao: function(c, raiva) {
    const j = jogador;
    switch (c.estado) {
      case "voar": {
        if (c.t === 1) c.lado = j.x < LARGURA / 2 ? 1 : -1;
        const ax = limitar(j.x + j.w / 2 + c.lado * 300 - c.w / 2, 0, LARGURA - c.w);
        const ay = 190 + Math.sin(tempo * 0.05) * 40;
        c.x += (ax - c.x) * 0.03;
        c.y += (ay - c.y) * 0.05;
        olharProJogador(c);
        if (c.t > (raiva ? 70 : 100)) proximoAtaque(c, ["sopro", "meteoros", "mergulho", "pousar"]);
        break;
      }

      case "sopro": {
        olharProJogador(c);
        c.y += Math.sin(tempo * 0.1) * 0.5;
        const n = raiva ? 10 : 6;
        if (c.t >= 20 && c.t < 20 + n * 8 && (c.t - 20) % 8 === 0) {
          const bx = c.dir > 0 ? c.x + 180 : c.x + c.w - 180;
          const by = c.y + 48;
          const dx = j.x + j.w / 2 - bx;
          const dy = j.y + j.h / 2 - by;
          const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;
          projeteis.push({ tipo: "fogo", x: bx - 12, y: by - 12, w: 24, h: 24, vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, vida: 220, rastro: "#ff922b" });
          som("tiro");
        }
        if (c.t > 20 + n * 8 + 30) irPara(c, "voar");
        break;
      }

      case "meteoros":
        if (c.t === 5) { som("rugido"); tremor = 20; chuvaDoCeu(raiva ? 9 : 6, "meteoro", 40, 40, { rastro: "#ff922b" }); }
        c.y += Math.sin(tempo * 0.1) * 0.5;
        if (c.t > 150) irPara(c, "voar");
        break;

      case "mergulho":
        if (c.t < 25) {
          c.y -= 1;
          if (c.t % 6 === 0) tremor = 3;
        } else if (c.t === 25) {
          olharProJogador(c);
          c.vx = limitar((j.x + j.w / 2 - (c.x + c.w / 2)) / 35, -12, 12);
          c.vy = 9;
          som("dash");
        } else {
          c.x = limitar(c.x + c.vx, 0, LARGURA - c.w);
          c.y += c.vy;
          if (c.vy > 0 && c.y + c.h >= CHAO - 4) { c.y = CHAO - 4 - c.h; c.vy = -7; tremor = 10; poeira(c.x + c.w / 2, CHAO, 8); }
          if (c.vy < 0 && c.y < 190) irPara(c, "voar");
        }
        break;

      case "pousar":
        c.vx = 0;
        c.y += 6;
        if (c.y + c.h >= CHAO) {
          c.y = CHAO - c.h;
          tremor = 14;
          som("pancada");
          irPara(c, "descansando");
        }
        break;

      case "descansando":
        olharProJogador(c);
        if (c.t % 20 === 0) particula({ tipo: "fumaca", x: c.dir > 0 ? c.x + c.w - 10 : c.x + 10, y: c.y + 40, vx: c.dir, vy: -1, g: 0, vida: 40, max: 40, cor: "#868e96", tam: 14 });
        if (c.t > (raiva ? 90 : 130)) irPara(c, "decolar");
        break;

      case "decolar":
        c.y -= 4;
        if (c.y < 190) irPara(c, "voar");
        break;
    }
  }
};

function desenharChefe() {
  const c = chefe;
  const spr = SPR_CHEFE[c.tipo];
  const img = c.flash > 3 ? (c.dir > 0 ? spr.flashD : spr.flashE) : (c.dir > 0 ? spr.d : spr.e);

  if (c.intangivel) {
    // Montinho de areia andando debaixo da terra
    ctx.fillStyle = "#c9953f";
    const mx = Math.round(c.x + c.w / 2);
    ctx.fillRect(mx - 60, CHAO - 12, 120, 12);
    ctx.fillRect(mx - 36, CHAO - 22, 72, 10);
    ctx.fillStyle = "#e0b062";
    ctx.fillRect(mx - 20, CHAO - 28, 40, 6);
    return;
  }

  ctx.save();
  if (c.estado === "derrotado" && c.t > 80) {
    ctx.translate(Math.round(c.x + c.w / 2), Math.round(c.y + c.h / 2));
    ctx.rotate(c.rot);
    ctx.scale(c.escala, c.escala);
    ctx.drawImage(img, -c.w / 2, -c.h / 2);
    ctx.restore();
    return;
  }

  if (c.afundar > 0) {
    ctx.beginPath();
    ctx.rect(c.x - 20, c.y - 200, c.w + 40, CHAO - c.y + 200);
    ctx.clip();
  }

  const x = Math.round(c.x);
  const y = Math.round(c.y + c.afundar);
  let sy = 1;
  if (c.estado === "parado" || c.estado === "descansando") sy = 1 + Math.sin(tempo * 0.1) * 0.02;
  if ((c.estado === "investida" || c.estado === "deslize") && c.t < 35) sy = 1 + (c.t % 10 < 5 ? 0.04 : -0.04);

  ctx.translate(x + c.w / 2, y + c.h);
  ctx.scale(1, sy);
  ctx.translate(-c.w / 2, -c.h);

  if (c.tipo === "dragao") {
    const asa = SPR_ASA;
    const bat = c.estado === "descansando" || c.estado === "pousar" ? 0.4 : Math.cos(tempo * 0.25);
    ctx.save();
    if (c.dir > 0) { ctx.translate(48, 54); ctx.scale(1, bat); ctx.drawImage(asa.d, -48, -54); }
    else { ctx.translate(c.w - 48, 54); ctx.scale(1, bat); ctx.drawImage(asa.e, -48, -54); }
    ctx.restore();
  }

  ctx.drawImage(img, 0, 0);

  if (c.tipo === "dragao") {
    const bx = c.dir > 0 ? 7 * 6 + 20 : c.w - 7 * 6 - 68;
    ctx.save();
    ctx.translate(bx + 24, 17 * 6 - 8);
    ctx.rotate(Math.sin(tempo * 0.1) * 0.2);
    ctx.drawImage(SPR_BANANA, -24, -20);
    ctx.restore();
  }

  if (c.tipo === "escorpiaoRei") {
    const cx = c.dir > 0 ? 13 * 9 : c.w - 13 * 9 - 36;
    ctx.drawImage(c.dir > 0 ? SPR_COROA_PEQ.d : SPR_COROA_PEQ.e, cx, 6 * 9 - 18);
  }

  if (c.estado === "tonto") {
    for (let i = 0; i < 3; i++) {
      const a = tempo * 0.12 + (i * Math.PI * 2) / 3;
      desenharEstrela4(c.w / 2 + Math.cos(a) * 50, -10 + Math.sin(a) * 12, 8, "#ffe066");
    }
  }
  ctx.restore();
}

function desenharVidaChefe() {
  const c = chefe;
  const w = 520;
  const x = LARGURA / 2 - w / 2;
  ctx.font = "bold 20px " + FONTE;
  ctx.textAlign = "center";
  textoSombra(c.nome, LARGURA / 2, 28, "#ffe066");
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - 4, 38, w + 8, 22);
  ctx.fillStyle = "#495057";
  ctx.fillRect(x, 42, w, 14);
  ctx.fillStyle = c.hp <= c.hpMax / 2 ? "#ff6b00" : "#e03131";
  ctx.fillRect(x, 42, (w * c.hp) / c.hpMax, 14);
  if (c.flash > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(x, 42, (w * c.hp) / c.hpMax, 14);
  }
}
