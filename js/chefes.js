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
  if (!c || !c.vivo || c.intangivel || c.cena || c.sumido || c.estado === "entrada") return;
  if (c.invencivel > 0 && !ignoraInvencivel) return;
  if (c.estado === "tonto") dano *= 2;
  c.hp -= dano;
  c.flash = 6;
  c.invencivel = 6;
  som("pisao");
  if (c.hp <= 0 && c.tipo === "reiMacaco") {
    reiTransformar(c);   // 1ª barra do chefe secreto: vira o Saru Gigante
    return;
  }
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
        if (fase.secreta) {
          reiVencido();
        } else {
          const premio = save.chefes[fase.mundo] ? 60 : RECOMPENSA_CHEFE[fase.mundo];
          ganharMoedas(premio, LARGURA / 2, 200);
          save.chefes[fase.mundo] = true;
          mostrarMensagem(tr("Chefe derrotado!"), tr("+{0} moedas. Pegue a banana!", premio), 150, null, false);
          soltarBananaDoCeu();
        }
      }
    }
    atualizarCaixa(c);
    return;
  }

  IA_CHEFES[c.tipo](c, c.hp <= c.hpMax / 2);
  atualizarCaixa(c);

  // Encostar no chefe machuca (pular na cabeça dele dá dano)
  if (!j.morto && !c.intangivel && !c.cena && !c.sumido && encosta(j, c.caixa)) {
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

// ---------- Desenho dos chefes: escolha do quadro de animação ----------

// Cada função devolve o nome do quadro (em SPR_CHEFE[tipo].q) conforme o estado da IA
const QUADRO_CHEFE = {

  gorila: function(c, raiva) {
    const t = c.t;
    const resp = Math.floor(tempo / 26) % 2 ? "parado1" : "parado0";
    switch (c.estado) {
      case "entrada":
        if (!c.pousou) return "pulo";
        if (c.visT0 === undefined) c.visT0 = t;
        return t - c.visT0 < 8 ? "pancada" : t - c.visT0 < 70 ? "rugido" : resp;
      case "parado":
        if (Math.abs(c.vx) > 0.5) return Math.floor(tempo / 7) % 2 ? "andar1" : "andar0";
        if (c.ultimo === "pulo" && t < 14) return "pancada";
        if (raiva && t % 56 < 20) return Math.floor(tempo / 5) % 2 ? "peito" : "parado0";
        return resp;
      case "pulo":
        return c.noChao ? "pancada" : c.vy < -3 ? "pulo" : "prep";
      case "cocos": {
        const lim = raiva ? 80 : 48;
        if (t > lim + 10) return resp;
        const ph = t % 16;
        return ph < 4 && t > 0 && t <= lim ? "jogar1" : ph >= 8 || t < 16 ? "jogar0" : "parado0";
      }
      case "investida":
        if (t < 35) return t % 14 < 7 ? "invest0" : "prep";
        return Math.floor(t / 4) % 2 ? "invest1" : "invest0";
      case "tonto":
        return "tonto";
    }
    return "parado0";
  },

  escorpiaoRei: function(c, raiva) {
    const t = c.t;
    const resp = Math.floor(tempo / 26) % 2 ? "parado1" : "parado0";
    switch (c.estado) {
      case "entrada":
        if (!c.pousou) return "emergir";
        return c.t < 60 ? "rugido" : resp;
      case "parado":
        return resp;
      case "andar":
        return Math.floor(tempo / 7) % 2 ? "andar1" : "andar0";
      case "enterrar":
        return "emergir";
      case "emergir":
        return c.t < 40 ? "emergir" : "parado0";
      case "ferrao":
        if (t < 20) return "prep";
        if (t < 40) return "ferrao";
        if (raiva && t < 55) return "prep";
        if (raiva && t < 75) return "ferrao";
        return "parado0";
      case "tempestade":
        return t < 45 ? "rugido" : "parado0";
      case "tonto":
        return "tonto";
    }
    return "parado0";
  },

  yeti: function(c, raiva) {
    const t = c.t;
    const resp = Math.floor(tempo / 26) % 2 ? "parado1" : "parado0";
    switch (c.estado) {
      case "entrada":
        if (!c.pousou) return "pulo";
        if (c.visT0 === undefined) c.visT0 = t;
        return t - c.visT0 < 8 ? "pouso" : t - c.visT0 < 70 ? "rugido" : resp;
      case "parado":
        if (Math.abs(c.vx) > 0.5) return Math.floor(tempo / 7) % 2 ? "andar1" : "andar0";
        if (c.ultimo === "pulo" && t < 14) return "pouso";
        return resp;
      case "bolaNeve":
        return t < 30 ? "prep" : t < 55 ? "empurra" : "parado0";
      case "rugido":
        return t < 62 ? "rugido" : "parado0";
      case "deslize":
        if (t < 25) return t % 12 < 6 ? "deslize0" : "deslize1";
        return Math.floor(t / 4) % 2 ? "deslize1" : "deslize0";
      case "pulo":
        return c.noChao ? "pouso" : c.vy < -3 ? "pulo" : "prep";
      case "tonto":
        return "tonto";
    }
    return "parado0";
  },

  dragao: function(c, raiva) {
    const t = c.t;
    switch (c.estado) {
      case "entrada":
        return t > 55 && t < 100 ? "rugido" : "voar0";
      case "voar":
        return Math.floor(tempo / 30) % 2 ? "voar1" : "voar0";
      case "sopro": {
        const n = raiva ? 10 : 6;
        if (t < 20) return t > 8 ? "sopro0" : "voar0";
        return t < 20 + n * 8 + 6 ? "sopro1" : "sopro0";
      }
      case "meteoros":
        return t > 3 && t < 60 ? "rugido" : "voar0";
      case "mergulho":
        return t < 25 ? "rugido" : "mergulho";
      case "pousar":
        return "pouso";
      case "descansando":
        return Math.floor(tempo / 24) % 2 ? "pouso2" : "pouso1";
      case "decolar":
        return "voar0";
    }
    return "voar0";
  }
};

// Cores da aura de raiva (vida abaixo da metade) e dos olhos brilhantes de cada chefe
const AURA_CHEFE = {
  gorila: { aura: "255,60,40", olho: "255,70,40", contorno: "#ff3b2e" },
  escorpiaoRei: { aura: "200,90,255", olho: "255,60,60", contorno: "#c25cff" },
  yeti: { aura: "255,90,60", olho: "255,110,60", contorno: "#ff4a36" },
  dragao: { aura: "255,100,20", olho: "255,220,90", contorno: "#ffb020" }
};

// Quadros em que o chefe está atacando (olhos brilham mais)
const QUADROS_ATAQUE = {
  gorila: ["pancada", "jogar1", "rugido", "invest0", "invest1", "prep"],
  escorpiaoRei: ["ferrao", "prep", "rugido"],
  yeti: ["rugido", "empurra", "deslize0", "deslize1", "prep", "pouso"],
  dragao: ["sopro0", "sopro1", "rugido", "mergulho"]
};

// Pequeno símbolo de raiva (as quatro "veias" do quadrinho) ao lado da cabeça
function desenharVeiaRaiva(x, y, k) {
  const e = 3 * k;
  const barras = [[-1.5, -3, 1, 5.5], [0.5, -3, 1, 5.5], [-3, -1.5, 5.5, 1], [-3, 0.5, 5.5, 1]];
  ctx.fillStyle = "#3a0606";
  barras.forEach(function(r) { ctx.fillRect(x + r[0] * e - e * 0.5, y + r[1] * e - e * 0.5, r[2] * e + e, r[3] * e + e); });
  ctx.fillStyle = "#ff4d4d";
  barras.forEach(function(r) { ctx.fillRect(x + r[0] * e, y + r[1] * e, r[2] * e, r[3] * e); });
  ctx.fillStyle = "#ffa8a8";
  ctx.fillRect(x - 1.5 * e, y - 3 * e, e, e);
  ctx.fillRect(x - 3 * e, y - 1.5 * e, e, e);
}

// Brasas / névoa subindo em volta do chefe furioso
function desenharBrasasRaiva(c, cor) {
  const brasa = c.tipo === "yeti" ? ["#e7f5ff", "#a5d8ff"] : c.tipo === "escorpiaoRei" ? ["#e599f7", "#be4bdb"] : ["#ffd43b", "#ff6b00"];
  for (let k = 0; k < 8; k++) {
    const ciclo = (tempo * 0.9 + k * 29) % 56;
    const px = c.x + c.w * (0.1 + 0.8 * ((k * 0.381) % 1)) + Math.sin(tempo * 0.07 + k) * 6;
    const py = c.y + c.h * 0.9 - ciclo * 2.4;
    const tam = k % 3 === 0 ? 6 : 4;
    ctx.globalAlpha = Math.max(0, 1 - ciclo / 56);
    ctx.fillStyle = brasa[k % 2];
    ctx.fillRect(Math.round(px), Math.round(py), tam, tam);
  }
  ctx.globalAlpha = 1;
}

// Asas do dragão por trás do corpo (a de longe mais escura e um pouco atrasada). (0,0) = canto do corpo.
function desenharAsasDragao(dir, idx, dobrada, w) {
  const q = SPR_ASA.quadros;
  const asa = dobrada ? SPR_ASA.dobrada : q[idx];
  const asaL = dobrada ? SPR_ASA.dobrada : q[Math.min(q.length - 1, Math.max(0, idx + 1))];
  const rx = 33 * 3;
  const ry = 16 * 3;
  const ox = dir > 0 ? rx - SPR_ASA.rx * 3 : (w - rx) - (64 - SPR_ASA.rx) * 3;
  const oy = ry - SPR_ASA.ry * 3;
  const lado = dir > 0 ? "d" : "e";
  ctx.drawImage(asaL.longe[lado], ox + (dir > 0 ? 12 : -12), oy - 6);
  ctx.drawImage(asa[lado], ox, oy);
}

// Banana nas garras da frente (a mão fica por cima da banana). comBanana false: só a mão.
function desenharBananaDragao(dir, fr, w, comBanana) {
  if (comBanana) {
    ctx.save();
    ctx.translate(dir > 0 ? 43 * 3 : w - 43 * 3, 33 * 3);
    ctx.rotate(Math.sin(tempo * 0.1) * 0.12);
    luzAditiva(0, 0, 44, "255,215,70", 0.3);
    ctx.drawImage(SPR_BANANA, -24, -20);
    ctx.restore();
  }
  ctx.drawImage(dir > 0 ? fr.mao.d : fr.mao.e, 0, 0);
  // brasa na ponta da cauda
  luzAditiva(dir > 0 ? 2.5 * 3 : w - 2.5 * 3, 21 * 3, 28 + Math.sin(tempo * 0.4) * 5, "255,150,40", 0.4);
}

function desenharChefe() {
  const c = chefe;
  const spr = SPR_CHEFE[c.tipo];
  const raiva = c.hp <= c.hpMax / 2 && c.vivo;

  // Quadro atual (o "dano" aparece nos últimos tiques do piscar)
  let nome = QUADRO_CHEFE[c.tipo](c, raiva);
  if (c.estado === "derrotado") nome = "dano";
  else if (c.flash > 0 && c.flash <= 3 && c.estado !== "enterrar") nome = "dano";
  const fr = spr.q[nome] || spr;
  const img = c.flash > 3 || (c.estado === "derrotado" && c.t % 8 < 4) ? (c.dir > 0 ? fr.flashD : fr.flashE) : (c.dir > 0 ? fr.d : fr.e);

  if (c.intangivel) {
    // Montinho de areia andando debaixo da terra, com contorno e luz
    const mx = Math.round(c.x + c.w / 2);
    ctx.fillStyle = "#4a2f0a";
    ctx.fillRect(mx - 62, CHAO - 14, 124, 14);
    ctx.fillRect(mx - 38, CHAO - 24, 76, 12);
    ctx.fillRect(mx - 22, CHAO - 30, 44, 8);
    ctx.fillStyle = "#c9953f";
    ctx.fillRect(mx - 60, CHAO - 12, 120, 12);
    ctx.fillRect(mx - 36, CHAO - 22, 72, 10);
    ctx.fillStyle = "#e0b062";
    ctx.fillRect(mx - 20, CHAO - 28, 40, 6);
    ctx.fillStyle = "#f6d68c";
    ctx.fillRect(mx - 20, CHAO - 28, 40, 2);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(mx + 10, CHAO - 22, 26, 10);
    ctx.fillRect(mx + 30, CHAO - 12, 30, 12);
    // a ponta do ferrão aparece rondando na areia
    const fx = mx + Math.round(Math.sin(tempo * 0.2) * 14);
    ctx.fillStyle = "#2a1260";
    ctx.fillRect(fx - 6, CHAO - 42, 12, 14);
    ctx.fillStyle = "#8f5af5";
    ctx.fillRect(fx - 4, CHAO - 40, 8, 10);
    ctx.fillStyle = "#e599f7";
    ctx.fillRect(fx - 4, CHAO - 40, 3, 4);
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

  const cores = AURA_CHEFE[c.tipo];
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;

  // Aura: brasa do dragão sempre, e uma aura de raiva pulsando em todos quando a vida passa da metade
  if (c.tipo === "dragao") luzAditiva(cx, cy, 150, "255,100,30", 0.2 + Math.sin(tempo * 0.1) * 0.05 + (c.estado === "sopro" ? 0.12 : 0));
  if (raiva) {
    luzAditiva(cx, cy, Math.max(c.w, c.h) * 0.75, cores.aura, 0.2 + Math.sin(tempo * 0.18) * 0.07);
    desenharBrasasRaiva(c);
  }
  if (c.estado === "tonto") luzAditiva(cx, c.y + 10, 70, "255,230,120", 0.15);

  if (c.afundar > 0) {
    ctx.beginPath();
    ctx.rect(c.x - 20, c.y - 200, c.w + 40, CHAO - c.y + 200);
    ctx.clip();
  }

  const w = c.w;
  const espelho = c.dir > 0 ? 1 : -1;
  // x de um ponto do sprite virado pra direita => x na tela relativo ao canto do chefe
  const X = function(px) { return c.dir > 0 ? px : w - px; };

  // Treme de leve ao carregar o ataque
  let tremX = 0;
  if (c.tipo === "gorila" && c.estado === "investida" && c.t < 35) tremX = c.t % 4 < 2 ? -2 : 2;
  if (c.tipo === "yeti" && c.estado === "deslize" && c.t < 25) tremX = c.t % 4 < 2 ? -2 : 2;
  if (c.tipo === "escorpiaoRei" && c.estado === "ferrao" && c.t < 20) tremX = c.t % 4 < 2 ? -1 : 1;

  const x = Math.round(c.x) + tremX;
  let y = Math.round(c.y + c.afundar);
  let sy = 1;
  if (c.estado === "parado" || c.estado === "descansando") sy = 1 + Math.sin(tempo * 0.1) * 0.012;

  // Dragão: batida de asas acompanhada do corpo (sobe na batida pra baixo)
  let asaIdx = 0;
  let rotDragao = 0;
  const voando = c.tipo === "dragao" && ["entrada", "voar", "sopro", "meteoros", "decolar", "pousar"].indexOf(c.estado) >= 0;
  let dobrada = c.tipo === "dragao" && !voando;
  if (c.tipo === "dragao") {
    const vel = c.estado === "decolar" ? 0.38 : c.estado === "pousar" ? 0.3 : c.estado === "sopro" ? 0.16 : 0.22;
    const fase = tempo * vel;
    if (c.estado === "mergulho") dobrada = c.t >= 25;
    const ciclo = (Math.cos(fase) + 1) / 2;   // 1 = asa no alto, 0 = asa embaixo
    asaIdx = Math.round((1 - ciclo) * (SPR_ASA.quadros.length - 1));
    if (voando || (c.estado === "mergulho" && c.t < 25)) y += Math.round(Math.cos(fase) * 3);
    if (c.estado === "mergulho" && c.t >= 25) rotDragao = limitar(Math.atan2(c.vy, Math.max(2, Math.abs(c.vx))) * 0.7, -0.5, 0.6) * espelho;
  }

  ctx.translate(x + w / 2, y + c.h);
  ctx.scale(1, sy);
  ctx.translate(-w / 2, -c.h);
  if (rotDragao) {
    ctx.translate(w / 2, c.h / 2);
    ctx.rotate(rotDragao);
    ctx.translate(-w / 2, -c.h / 2);
  }

  if (c.tipo === "dragao") desenharAsasDragao(c.dir, asaIdx, dobrada, w);

  // Furioso: contorno pulsando na cor da raiva em volta do corpo
  if (raiva) {
    const so = silhuetaDe(img, cores.contorno);
    ctx.globalAlpha = 0.5 + Math.sin(tempo * 0.2) * 0.2;
    ctx.drawImage(so, -4, 0);
    ctx.drawImage(so, 4, 0);
    ctx.drawImage(so, 0, -4);
    ctx.drawImage(so, 0, 4);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(img, 0, 0);

  if (c.tipo === "dragao") desenharBananaDragao(c.dir, fr, w, true);

  // Olhos brilhantes (mais fortes atacando ou furioso)
  const atacando = QUADROS_ATAQUE[c.tipo].indexOf(nome) >= 0;
  if (fr.olhos && nome !== "dano" && nome !== "tonto") {
    const forca = (atacando ? 0.4 : 0.08) + (raiva ? 0.2 : 0);
    fr.olhos.forEach(function(o) {
      luzAditiva(X(o[0] * 3), o[1] * 3, atacando ? 13 : 9, cores.olho, forca);
    });
  }
  // Olhos girando quando está tonto
  if (nome === "tonto" && fr.olhos) {
    ctx.fillStyle = "#1a0a0a";
    fr.olhos.forEach(function(o, i) {
      const a = tempo * 0.3 + i * 2;
      ctx.fillRect(Math.round(X(o[0] * 3) + Math.cos(a) * 5 - 2), Math.round(o[1] * 3 + Math.sin(a) * 5 - 2), 4, 4);
    });
  }

  // Ferrão do escorpião brilhando (veneno) ao preparar e atacar
  if (c.tipo === "escorpiaoRei" && fr.ferr) {
    const f = fr.ferr;
    luzAditiva(X(f[0] * 3), f[1] * 3, nome === "ferrao" ? 36 : 24, "200,100,255", nome === "ferrao" ? 0.6 : 0.3 + Math.sin(tempo * 0.2) * 0.1);
  }

  // Boca em chamas (dragão soprando fogo)
  if (c.tipo === "dragao" && fr.boca && (nome === "sopro0" || nome === "sopro1" || nome === "rugido")) {
    const f = fr.boca;
    luzAditiva(X(f[0] * 3), f[1] * 3, nome === "sopro1" ? 56 : 34, "255,150,40", nome === "sopro1" ? 0.7 : 0.4);
    if (nome === "sopro1") {
      for (let k = 0; k < 4; k++) {
        const d = ((tempo * 3 + k * 9) % 30);
        ctx.fillStyle = k % 2 ? "#ffd43b" : "#ff6b00";
        ctx.globalAlpha = 1 - d / 30;
        ctx.fillRect(Math.round(X(f[0] * 3) + espelho * (d + 4) - 5), Math.round(f[1] * 3 - 4 + (k - 1.5) * 4), 10, 8);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Ondas sonoras do rugido
  if (nome === "rugido") {
    const bx = fr.boca ? fr.boca[0] : (c.tipo === "escorpiaoRei" ? 34 : 24);
    const by = fr.boca ? fr.boca[1] : (c.tipo === "escorpiaoRei" ? 26 : 19);
    for (let k = 0; k < 3; k++) {
      const r = ((tempo * 2 + k * 14) % 42) + 8;
      ctx.globalAlpha = 0.5 * (1 - r / 50);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(X(bx * 3), by * 3, r, -0.9 * espelho + (c.dir > 0 ? 0 : Math.PI), 0.9 * espelho + (c.dir > 0 ? 0 : Math.PI), c.dir < 0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Poeira nos pés: gorila e yeti avançando, impacto do pouso
  if ((c.tipo === "gorila" && c.estado === "investida" && c.t >= 35) || (c.tipo === "yeti" && c.estado === "deslize" && c.t >= 25)) {
    for (let k = 0; k < 4; k++) {
      const d = ((tempo * 2 + k * 11) % 36);
      ctx.fillStyle = c.tipo === "yeti" ? "#e7f5ff" : "#e9e3d5";
      ctx.globalAlpha = 0.8 * (1 - d / 36);
      const s = 10 + d * 0.3;
      ctx.fillRect(Math.round(X(c.dir > 0 ? 6 : w - 6) - espelho * d * 1.6 - s / 2 + (c.dir > 0 ? 0 : -0)), Math.round(c.h - 4 - d * 0.5 - s / 2), Math.round(s), Math.round(s));
    }
    ctx.globalAlpha = 1;
  }
  if (nome === "pancada" || nome === "pouso") {
    const k = c.estado === "pulo" ? 0 : c.t;
    if (k < 14) {
      ctx.globalAlpha = 1 - k / 14;
      ctx.fillStyle = "#e9e3d5";
      ctx.fillRect(Math.round(w / 2 - 70 - k * 4), Math.round(c.h - 8), 20 + k * 2, 8);
      ctx.fillRect(Math.round(w / 2 + 50 + k * 2), Math.round(c.h - 8), 20 + k * 2, 8);
      ctx.globalAlpha = 1;
    }
  }

  // Símbolo de raiva ao lado da cabeça
  if (raiva && c.tipo !== "dragao") {
    const o = fr.olhos ? fr.olhos[fr.olhos.length - 1] : [30, 10];
    const pulso = 1 + (tempo % 24 < 12 ? 0.25 : 0);
    desenharVeiaRaiva(X(o[0] * 3) - espelho * 20, o[1] * 3 - 44, pulso);
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
  const w = 620;
  const h = 70;
  const x = LARGURA / 2 - w / 2;
  const y = 6;
  const r = limitar(c.hp / c.hpMax, 0, 1);

  // cor da barra muda com a vida: verde, âmbar, vermelho (e pisca quando está acabando)
  let claro = "#8ce99a";
  let meio = "#40c057";
  let escuro = "#2b8a3e";
  if (r <= 0.33) { claro = "#ff8787"; meio = "#e03131"; escuro = "#a51111"; }
  else if (r <= 0.66) { claro = "#ffe066"; meio = "#fab005"; escuro = "#c77700"; }

  painelPixel(x, y, w, h, "#d9b45a", "rgba(26,12,10,0.86)");

  // retrato do chefe numa moldura
  const spr = SPR_CHEFE[c.tipo];
  painelPixel(x + 10, y + 8, 76, 54, "#8a6a2b", "rgba(10,6,4,0.8)");
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 14, y + 12, 68, 46);
  ctx.clip();
  const esc = Math.min(66 / spr.w, 44 / spr.h);
  const pw = Math.round(spr.w * esc);
  const ph = Math.round(spr.h * esc);
  const flash = c.flash > 3;
  if (c.tipo === "dragao") luzAditiva(x + 48, y + 35, 40, "255,100,30", 0.3);
  ctx.drawImage(c.estado === "derrotado" ? spr.d : (flash ? spr.flashD : spr.d), x + 48 - Math.round(pw / 2), y + 35 - Math.round(ph / 2), pw, ph);
  ctx.restore();

  // nome
  const bx = x + 100;
  const bw = w - 116;
  ctx.font = "bold 20px " + FONTE;
  ctx.textAlign = "center";
  textoSombra(c.nome, bx + bw / 2, y + 28, "#ffe066");
  if (c.secreto) {
    ctx.font = "bold 15px " + FONTE;
    ctx.textAlign = "right";
    textoSombra(tr("Fase {0}/2", c.fase2 ? 2 : 1), bx + bw, y + 26, "#ffffff");
    ctx.textAlign = "center";
  }

  // barra: moldura, fundo, "dano recente" em branco que escorre e a vida em degradê
  if (c.hpAtraso === undefined || c.hpAtraso < c.hp) c.hpAtraso = c.hp;
  c.hpAtraso += (c.hp - c.hpAtraso) * 0.06;
  const by = y + 38;
  ctx.fillStyle = "#0d0704";
  ctx.fillRect(bx - 3, by - 3, bw + 6, 26);
  ctx.fillStyle = "#3b2f2a";
  ctx.fillRect(bx, by, bw, 20);
  ctx.fillStyle = "#2a201c";
  ctx.fillRect(bx, by, bw, 6);
  const larg = Math.round((bw * c.hp) / c.hpMax);
  const largAtraso = Math.round((bw * c.hpAtraso) / c.hpMax);
  if (largAtraso > larg) {
    ctx.fillStyle = "#fff3bf";
    ctx.fillRect(bx + larg, by, largAtraso - larg, 20);
  }
  if (larg > 0) {
    const critico = r <= 0.2 && tempo % 24 < 12;
    ctx.fillStyle = critico ? "#ff8787" : meio;
    ctx.fillRect(bx, by, larg, 20);
    ctx.fillStyle = critico ? "#ffc9c9" : claro;
    ctx.fillRect(bx, by, larg, 6);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(bx, by + 2, larg, 2);
    ctx.fillStyle = escuro;
    ctx.fillRect(bx, by + 15, larg, 5);
  }
  if (c.flash > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(bx, by, Math.max(larg, 2), 20);
  }
  // divisões de 10% na barra
  ctx.fillStyle = "rgba(13,7,4,0.55)";
  for (let i = 1; i < 10; i++) ctx.fillRect(bx + Math.round((bw * i) / 10) - 1, by, 2, 20);
  // detalhes dourados nas pontas da barra
  ctx.fillStyle = "#0d0704";
  ctx.fillRect(bx - 8, by - 6, 10, 32);
  ctx.fillRect(bx + bw - 2, by - 6, 10, 32);
  ctx.fillStyle = "#d9b45a";
  ctx.fillRect(bx - 6, by - 4, 6, 28);
  ctx.fillRect(bx + bw, by - 4, 6, 28);
  ctx.fillStyle = "#fff0b0";
  ctx.fillRect(bx - 6, by - 4, 2, 28);
  ctx.fillRect(bx + bw, by - 4, 2, 28);
}
