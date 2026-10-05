"use strict";

// =========================
// PROGRESSO: XP, níveis, prêmios, transições de tela e cartões de apresentação
// =========================

let transicao = null;      // { fase: "fechando" | "abrindo", t, depois }
let cartao = null;         // cartão com o nome da fase (ou do chefe)
let animNivel = null;      // animação de subir de nível
let particulasHud = [];    // moedas voando até o contador
let hudPulso = 0;

// ---------- Transição: um círculo fecha no macaco e abre na cena nova ----------

function trocarCena(fn) {
  if (transicao && transicao.fase === "fechando") return;
  transicao = { fase: "fechando", t: 0, depois: fn };
}

// Devolve true enquanto a tela está fechando (o jogo fica parado)
function atualizarTransicao() {
  if (!transicao) return false;
  transicao.t++;
  if (transicao.fase === "fechando" && transicao.t >= 28) {
    const fn = transicao.depois;
    transicao = { fase: "abrindo", t: 0 };
    if (fn) fn();
  } else if (transicao.fase === "abrindo" && transicao.t >= 28) {
    transicao = null;
  }
  return !!transicao && transicao.fase === "fechando";
}

function desenharTransicao() {
  if (!transicao) return;
  const k = transicao.fase === "fechando" ? 1 - transicao.t / 28 : transicao.t / 28;
  const z = zoomJogo();
  let cx = LARGURA / 2;
  let cy = ALTURA * z / 2;
  if (estado === "jogo" && jogador) {
    cx = (jogador.x + jogador.w / 2 - cameraX) * z;
    cy = (jogador.y + jogador.h / 2) * z;
  }
  const r = Math.max(1, k * k * 1400 * z);
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.rect(0, 0, LARGURA, ALTURA * z);
  ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
}


// ---------- XP e níveis ----------

function ganharXp(n, x, y) {
  if (!n) return;
  save.xp += n;
  sujo = true;
  if (x !== undefined && n >= 10) texto(x, y, "+" + n + " XP", "#91a7ff", 16);
  while (save.xp >= xpParaSubir(save.nivel)) {
    save.xp -= xpParaSubir(save.nivel);
    save.nivel++;
    subiuNivel(save.nivel);
  }
}

function subiuNivel(n) {
  const moedas = 20 * n;
  save.moedas += moedas;
  let extra = tr("+{0} moedas", moedas);
  const premio = premioDoNivel(n);
  if (premio && !temCosmetico(premio.id)) {
    save.comprados.push(premio.id);
    extra += tr("  ·  Nova skin: {0}!", premio.nome);
  }
  if (jogador && estado === "jogo" && !jogador.morto) jogador.vidas = Math.min(vidasMax(), jogador.vidas + 1);
  animNivel = { t: 0, nivel: n, extra: extra };
  som("vitoria");
  salvar();
}

// Cosmético ganho ao passar de uma fase pela primeira vez
function darPremioDaFase(i) {
  const p = premioDaFase(i);
  if (p && !temCosmetico(p.id)) {
    save.comprados.push(p.id);
    return p;
  }
  return null;
}


// ---------- Cartão com o nome da fase ----------

function mostrarCartaoFase() {
  const m = MUNDOS[fase.mundo];
  if (fase.secreta) {
    const linhas = [tr("O macaco lendário! Tentativas restantes: {0}", save.rei.tentativas)];
    if (nivelSaru()) linhas.push(tr("Nível {0}: mais vida, mais rápido e furioso mais cedo", nivelSaru() + 1));
    cartao = { t: 0, titulo: nomeSaru(false), mundo: 0, chefe: "reiMacaco", linhas: linhas };
    return;
  }
  if (fase.ehChefe) {
    cartao = { t: 0, titulo: m.nomeChefe, mundo: fase.mundo, chefe: m.chefe,
      linhas: [tr("{0} - o chefe do mundo", m.nome)] };
    return;
  }
  const linhas = [
    tr("Novo inimigo: {0}", TIPOS_INIMIGO[m.inimigos[fase.etapa]].nome),
    tr("Novo obstáculo: {0}", NOMES_OBSTACULO[m.obstaculos[fase.etapa]])
  ];
  const premio = premioDaFase(fase.indice);
  if (premio && !temCosmetico(premio.id)) linhas.push(tr("Prêmio ao terminar: {0}", premio.nome));
  cartao = { t: 0, titulo: nomeFase(fase.indice), mundo: fase.mundo, linhas: linhas };
}


// ---------- Moeda voando até o contador ----------

function moedaParaHud(xMundo, yMundo) {
  if (particulasHud.length > 30) return;
  const x = xMundo - cameraX;
  particulasHud.push({ x: x, y: yMundo, x0: x, y0: yMundo, t: 0 });
}

function atualizarExtrasHud() {
  for (let i = particulasHud.length - 1; i >= 0; i--) {
    const p = particulasHud[i];
    p.t++;
    const k = p.t / 22;
    p.x = p.x0 + (34 - p.x0) * k * k;
    p.y = p.y0 + (74 - p.y0) * k - Math.sin(k * Math.PI) * 60;
    if (p.t >= 22) {
      particulasHud.splice(i, 1);
      hudPulso = 8;
    }
  }
  if (hudPulso > 0) hudPulso--;
  if (cartao && ++cartao.t > 230) cartao = null;
  if (animNivel && ++animNivel.t > 170) animNivel = null;
  if (flashDano > 0) flashDano--;
}

function desenharExtrasHud() {
  // Moedas voando
  for (let i = 0; i < particulasHud.length; i++) {
    const p = particulasHud[i];
    luzAditiva(Math.round(p.x), Math.round(p.y), 22, "255,205,60", 0.4);
    ctx.drawImage(moedaFonte.img, 0, 0, moedaFonte.fw, moedaFonte.fh, Math.round(p.x - 12), Math.round(p.y - 12), 24, 24);
  }

  // Borda vermelha (vinheta) quando leva dano
  if (flashDano > 0) {
    const a = flashDano / 20;
    const v = cacheVis("vinDano", function() {
      const c = criarCanvas(LARGURA, ALTURA);
      const g = c.getContext("2d");
      g.translate(LARGURA / 2, ALTURA / 2);
      g.scale(1, 0.75);
      const gr = g.createRadialGradient(0, 0, 220, 0, 0, 720);
      gr.addColorStop(0, "rgba(255,0,0,0)");
      gr.addColorStop(0.55, "rgba(255,20,20,0.25)");
      gr.addColorStop(1, "rgba(255,0,0,0.85)");
      g.fillStyle = gr;
      g.fillRect(-LARGURA, -ALTURA, LARGURA * 2, ALTURA * 2);
      return c;
    });
    ctx.globalAlpha = Math.min(1, a * 1.2);
    ctx.drawImage(v, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,0,0," + a * 0.12 + ")";
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }

  desenharCartao();
  desenharSubiuNivel();
}

function desenharCartao() {
  if (!cartao) return;
  const c = cartao;
  const entra = Math.min(1, c.t / 20);
  const sai = c.t > 205 ? (c.t - 205) / 25 : 0;
  const desliza = (1 - (1 - Math.pow(1 - entra, 3))) * -900 + sai * sai * 1400;
  const w = 620;
  const h = 76 + c.linhas.length * 26;
  const x = Math.round(LARGURA / 2 - w / 2 + desliza);
  const y = 110;
  const cor = MUNDOS[c.mundo].cor;

  painelPixel(x, y, w, h, clarear(cor, 0.35), "rgba(20,12,6,0.9)");
  // listras da cor do mundo em cima e embaixo, com brilho
  ctx.fillStyle = cor;
  ctx.fillRect(x + 10, y + 8, w - 20, 5);
  ctx.fillRect(x + 10, y + h - 13, w - 20, 5);
  ctx.fillStyle = clarear(cor, 0.5);
  ctx.fillRect(x + 10, y + 8, w - 20, 2);
  ctx.fillRect(x + 10, y + h - 13, w - 20, 2);
  // rebites nos cantos
  [[x + 14, y + 20], [x + w - 20, y + 20], [x + 14, y + h - 26], [x + w - 20, y + h - 26]].forEach(function(r) {
    ctx.fillStyle = "#0d0704";
    ctx.fillRect(r[0] - 1, r[1] - 1, 8, 8);
    ctx.fillStyle = clarear(cor, 0.5);
    ctx.fillRect(r[0], r[1], 6, 6);
    ctx.fillStyle = cor;
    ctx.fillRect(r[0] + 2, r[1] + 2, 4, 4);
  });

  let tx = x + w / 2;
  if (c.chefe) {
    const spr = SPR_CHEFE[c.chefe];
    const esc = 110 / spr.h;
    const sx = x + 24;
    const sy = y + h - 18 - spr.h * esc;
    luzAditiva(sx + (spr.w * esc) / 2, sy + (spr.h * esc) / 2, 80, c.chefe === "dragao" ? "255,110,30" : "255,230,150", 0.22);
    desenharContorno(spr.d, 0, 0, spr.w, spr.h, sx, sy, spr.w * esc, spr.h * esc, "#0d0704", 2);
    tx = x + w / 2 + 70;
  }
  ctx.textAlign = "center";
  ctx.font = "bold 34px " + FONTE;
  textoSombra(c.titulo, tx, y + 52, ["#fff9c4", "#ffc21a"], 3);
  ctx.font = "bold 18px " + FONTE;
  c.linhas.forEach(function(l, i) { textoSombra(l, tx, y + 84 + i * 26); });
}

// Raios do "NÍVEL!": pré-renderizados e girados no quadro
function raiosNivel() {
  return cacheVis("raiosNivel", function() {
    const c = criarCanvas(560, 560);
    const g = c.getContext("2d");
    g.translate(280, 280);
    for (let i = 0; i < 14; i++) {
      g.rotate(Math.PI / 7);
      const gr = g.createLinearGradient(0, 0, 270, 0);
      gr.addColorStop(0, "rgba(255,240,150,0.9)");
      gr.addColorStop(1, "rgba(255,200,60,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, -4);
      g.lineTo(270, -26);
      g.lineTo(270, 26);
      g.lineTo(0, 4);
      g.fill();
    }
    return c;
  });
}

function desenharSubiuNivel() {
  if (!animNivel) return;
  const a = animNivel;
  const k = Math.min(1, a.t / 12);
  const fim = a.t > 150 ? 1 - (a.t - 150) / 20 : 1;
  ctx.globalAlpha = Math.max(0, fim);

  // Clarão e raios girando
  luzAditiva(LARGURA / 2, 300, 300 * k, "255,220,100", 0.35);
  ctx.save();
  ctx.translate(LARGURA / 2, 300);
  ctx.rotate(a.t * 0.02);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.max(0, fim) * 0.9;
  const r = raiosNivel();
  ctx.drawImage(r, -400 * k, -400 * k, 800 * k, 800 * k);
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = Math.max(0, fim);

  // Anel que se expande
  if (a.t < 30) {
    ctx.globalAlpha = Math.max(0, fim) * (1 - a.t / 30);
    ctx.strokeStyle = "#fff3bf";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(LARGURA / 2, 300, 40 + a.t * 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, fim);
  }

  // Plaquinha com o texto
  const esc = a.t < 12 ? 0.5 + k * 0.7 : a.t < 20 ? 1.2 - (a.t - 12) * 0.025 : 1;
  ctx.font = "bold 20px " + FONTE;
  const largExtra = ctx.measureText(a.extra).width;
  const wp = Math.ceil(Math.max(440, largExtra + 80) / 8) * 8;
  ctx.save();
  ctx.translate(LARGURA / 2, 300);
  ctx.scale(esc, esc);
  painelPixel(-wp / 2, -62, wp, 138, "#ffd43b", "rgba(24,14,6,0.86)");
  ctx.textAlign = "center";
  ctx.font = "bold 60px " + FONTE;
  textoSombra(tr("NÍVEL {0}!", a.nivel), 0, 10, ["#fff9c4", "#ffb700"], 3);
  ctx.font = "bold 20px " + FONTE;
  textoSombra(a.extra, 0, 56);
  // estrelinhas nos cantos da plaquinha
  for (let i = 0; i < 4; i++) {
    const rr = Math.abs(Math.sin((a.t + i * 13) * 0.12)) * 8;
    if (rr > 2) desenharEstrela4(i % 2 ? wp / 2 - 6 : -wp / 2 + 6, i < 2 ? -62 : 76, Math.round(rr), "#fff6bf");
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  if (a.t % 3 === 0 && a.t < 120) {
    particula({ tipo: "q", x: cameraX + LARGURA / 2 + (Math.random() - 0.5) * 400, y: 300 + (Math.random() - 0.5) * 100,
      vx: 0, vy: -1, g: 0.05, vida: 30, max: 30, cor: "#ffe066", tam: 6 });
  }
}

// Barra de XP (no HUD e no menu)
// Barra de XP (no HUD): painel com o nível, moldura e brilho
function desenharBarraXp(x, y, w) {
  const precisa = xpParaSubir(save.nivel);
  painelPixel(x - 10, y - 5, 62 + w + 20, 26);
  ctx.font = "bold 16px " + FONTE;
  ctx.textAlign = "left";
  textoSombra(tr("Nv {0}", save.nivel), x, y + 12, "#bac8ff");
  const bx = x + 62;
  const k = limitar(save.xp / precisa, 0, 1);
  ctx.fillStyle = "#0d0704";
  ctx.fillRect(bx - 2, y, w + 4, 14);
  ctx.fillStyle = "#1b1f3b";
  ctx.fillRect(bx, y + 2, w, 10);
  const f = Math.round(w * k);
  if (f > 0) {
    ctx.fillStyle = "#5c7cfa";
    ctx.fillRect(bx, y + 2, f, 10);
    ctx.fillStyle = "#91a7ff";
    ctx.fillRect(bx, y + 2, f, 4);
    ctx.fillStyle = "#dbe4ff";
    ctx.fillRect(bx, y + 2, f, 2);
    // brilho que passa de tempos em tempos
    const brilho = (tempo * 2) % 220;
    if (brilho < f) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(bx + brilho, y + 2, Math.min(6, f - brilho), 10);
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 1; i < 5; i++) ctx.fillRect(bx + Math.round((w * i) / 5), y + 2, 2, 10);
}
