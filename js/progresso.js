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
  let cx = LARGURA / 2;
  let cy = ALTURA / 2;
  if (estado === "jogo" && jogador) {
    cx = jogador.x + jogador.w / 2 - cameraX;
    cy = jogador.y + jogador.h / 2;
  }
  const r = Math.max(1, k * k * 1400);
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.rect(0, 0, LARGURA, ALTURA);
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
  let extra = "+" + moedas + " moedas";
  const premio = premioDoNivel(n);
  if (premio && !temCosmetico(premio.id)) {
    save.comprados.push(premio.id);
    extra += "  ·  Nova skin: " + premio.nome + "!";
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
  if (fase.ehChefe) {
    cartao = { t: 0, titulo: m.nomeChefe, mundo: fase.mundo, chefe: m.chefe,
      linhas: [m.nome + " - o chefe do mundo"] };
    return;
  }
  const linhas = [
    "Novo inimigo: " + TIPOS_INIMIGO[m.inimigos[fase.etapa]].nome,
    "Novo obstáculo: " + NOMES_OBSTACULO[m.obstaculos[fase.etapa]]
  ];
  const premio = premioDaFase(fase.indice);
  if (premio && !temCosmetico(premio.id)) linhas.push("Prêmio ao terminar: " + premio.nome);
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
    p.y = p.y0 + (66 - p.y0) * k - Math.sin(k * Math.PI) * 60;
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
    ctx.drawImage(moedaFonte.img, 0, 0, moedaFonte.fw, moedaFonte.fh, Math.round(p.x - 12), Math.round(p.y - 12), 24, 24);
  }

  // Tela vermelha quando leva dano
  if (flashDano > 0) {
    const a = (flashDano / 20) * 0.35;
    ctx.fillStyle = "rgba(255,0,0," + a + ")";
    ctx.fillRect(0, 0, LARGURA, 24);
    ctx.fillRect(0, ALTURA - 24, LARGURA, 24);
    ctx.fillRect(0, 0, 24, ALTURA);
    ctx.fillRect(LARGURA - 24, 0, 24, ALTURA);
    ctx.fillStyle = "rgba(255,0,0," + a * 0.4 + ")";
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

  ctx.fillStyle = "rgba(20,12,6,0.88)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = MUNDOS[c.mundo].cor;
  ctx.fillRect(x, y, w, 6);
  ctx.fillRect(x, y + h - 6, w, 6);

  let tx = x + w / 2;
  if (c.chefe) {
    const spr = SPR_CHEFE[c.chefe];
    const esc = 110 / spr.h;
    ctx.drawImage(spr.d, x + 16, y + h - 6 - spr.h * esc, spr.w * esc, spr.h * esc);
    tx = x + w / 2 + 70;
  }
  ctx.textAlign = "center";
  ctx.font = "bold 34px monospace";
  textoSombra(c.titulo, tx, y + 48, "#ffe066");
  ctx.font = "bold 18px monospace";
  c.linhas.forEach(function(l, i) { textoSombra(l, tx, y + 80 + i * 26); });
}

function desenharSubiuNivel() {
  if (!animNivel) return;
  const a = animNivel;
  const k = Math.min(1, a.t / 12);
  const fim = a.t > 150 ? 1 - (a.t - 150) / 20 : 1;
  ctx.globalAlpha = Math.max(0, fim);

  // Raios girando
  ctx.save();
  ctx.translate(LARGURA / 2, 300);
  ctx.rotate(a.t * 0.02);
  ctx.fillStyle = "rgba(255,224,102,0.22)";
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillRect(0, -14, 260 * k, 28);
  }
  ctx.restore();

  const esc = a.t < 12 ? 0.5 + k * 0.7 : a.t < 20 ? 1.2 - (a.t - 12) * 0.025 : 1;
  ctx.save();
  ctx.translate(LARGURA / 2, 300);
  ctx.scale(esc, esc);
  ctx.textAlign = "center";
  ctx.font = "bold 60px monospace";
  textoSombra("NÍVEL " + a.nivel + "!", 0, 10, "#ffe066");
  ctx.restore();
  ctx.textAlign = "center";
  ctx.font = "bold 20px monospace";
  textoSombra(a.extra, LARGURA / 2, 350);
  ctx.globalAlpha = 1;

  if (a.t % 3 === 0 && a.t < 120) {
    particula({ tipo: "q", x: cameraX + LARGURA / 2 + (Math.random() - 0.5) * 400, y: 300 + (Math.random() - 0.5) * 100,
      vx: 0, vy: -1, g: 0.05, vida: 30, max: 30, cor: "#ffe066", tam: 6 });
  }
}

// Barra de XP (no HUD e no menu)
function desenharBarraXp(x, y, w) {
  const precisa = xpParaSubir(save.nivel);
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  textoSombra("Nv " + save.nivel, x, y + 12, "#91a7ff");
  const bx = x + 62;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(bx, y + 2, w, 10);
  ctx.fillStyle = "#748ffc";
  ctx.fillRect(bx, y + 2, Math.round((w * save.xp) / precisa), 10);
}
