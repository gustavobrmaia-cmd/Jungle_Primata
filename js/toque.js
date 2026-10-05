"use strict";

// =========================
// TOQUE (celular e tablet)
// Lado esquerdo da tela: analógico parado no lugar; incline para andar, um pouco para baixo desliza.
// Lado direito: botões PULO, LAÇO (depois do Gorila Rei) e DASH (melhoria). Toque num poder do HUD para usar.
// Na primeira fase de quem está começando, dicas piscando mostram o que fazer.
// Os controles só aparecem depois do primeiro toque; o teclado ou o controle escondem de novo.
// =========================

let toqueAtivo = false;

const BOTOES_TOQUE = [
  { acao: "pulo", x: 1092, y: 588, r: 78, rotulo: "PULO", cores: ["#fff3a0", "#f2b705", "#a86a00", "#fff3bf"] },
  { acao: "laco", x: 948,  y: 628, r: 52, rotulo: "LAÇO", cores: ["#b2f2bb", "#40a95a", "#1d5e2c", "#d3f9d8"], cipo: true },
  { acao: "dash", x: 1112, y: 446, r: 46, rotulo: "DASH", cores: ["#d0ebff", "#4a9be8", "#1c4f8f", "#e7f5ff"], melhoria: "dash" }
];

// Dicas da primeira fase (só para quem está começando): somem quando a pessoa anda e pula
const dicaToque = { andar: 0, pulo: 0, iniciou: false };

const STICK = { x: 190, y: 520, r: 74, morta: 16, baixo: 24 };

const toque = {
  stick: null,      // { id, ox, oy, x, y } dedo do lado esquerdo
  botoes: {},       // id do dedo -> ação do botão
  segurando: { esquerda: false, direita: false, baixo: false, pulo: false }
};

function botaoDisponivel(b) {
  if (b.cipo) return temCipo();
  return !b.melhoria || temMelhoria(b.melhoria);
}

// Posição do dedo em "pixels de jogo" (1200x700), seja qual for o tamanho da tela
function pontoDoJogo(t) {
  const r = canvas.getBoundingClientRect();
  return { x: (t.clientX - r.left) * LARGURA / r.width, y: (t.clientY - r.top) * ALTURA / r.height };
}

function botaoNoPonto(p) {
  let melhor = null;
  let dist = Infinity;
  BOTOES_TOQUE.forEach(function(b) {
    if (!botaoDisponivel(b)) return;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < b.r * 1.25 && d < dist) { dist = d; melhor = b; }
  });
  return melhor;
}

// Quadradinhos dos poderes no HUD (mesma posição do desenharHud)
function poderNoPonto(p) {
  const y = ALTURA - 74;
  if (p.y < y - 6 || p.y > y + 64) return -1;
  for (let i = 0; i < PODERES.length; i++) {
    const x = 20 + i * 66;
    if (p.x >= x - 4 && p.x <= x + 62) return i;
  }
  return -1;
}

function jogandoComToque() {
  return estado === "jogo" && !pausado && !reviverAberto;
}

function ligarToque() {
  if (toqueAtivo) return;
  toqueAtivo = true;
  controleAtivo = false;
  atualizarTelas();
  verificarOrientacao();
}

canvas.addEventListener("touchstart", function(e) {
  e.preventDefault();
  iniciarAudio();
  ligarToque();

  // Cenas: um toque pula a abertura ou volta do final
  if (estado === "intro") {
    if (intro.t > 30) terminarIntro();
    return;
  }
  if (estado === "final") {
    if (final.pronto) trocarCena(voltarAoMenu);
    return;
  }
  if (!jogandoComToque()) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const p = pontoDoJogo(t);
    const poder = poderNoPonto(p);
    if (poder >= 0) { usarPoder(PODERES[poder].id); continue; }
    const b = botaoNoPonto(p);
    if (b) {
      toque.botoes[t.identifier] = b.acao;
      if (!mensagemTravada()) apertos.add(b.acao);
    } else if (p.x < LARGURA / 2 && !toque.stick) {
      // a base fica sempre no mesmo lugar; a direção é medida a partir do centro dela
      toque.stick = { id: t.identifier, ox: STICK.x, oy: STICK.y, x: p.x, y: p.y };
    }
  }
}, { passive: false });

canvas.addEventListener("touchmove", function(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (toque.stick && t.identifier === toque.stick.id) {
      const p = pontoDoJogo(t);
      toque.stick.x = p.x;
      toque.stick.y = p.y;
    }
  }
}, { passive: false });

function soltarDedo(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (toque.stick && t.identifier === toque.stick.id) toque.stick = null;
    delete toque.botoes[t.identifier];
  }
}
canvas.addEventListener("touchend", soltarDedo, { passive: false });
canvas.addEventListener("touchcancel", soltarDedo, { passive: false });

// Qualquer toque em botões das telas também liga o modo toque (e destrava o som no iPhone)
document.addEventListener("touchstart", function() {
  iniciarAudio();
  ligarToque();
}, { passive: true });

document.addEventListener("keydown", function() {
  if (toqueAtivo) {
    toqueAtivo = false;
    toque.stick = null;
    toque.botoes = {};
    atualizarTelas();
  }
}, true);

// Chamado a cada passo: passa o que os dedos seguram para as teclas
function atualizarToque() {
  if (!toqueAtivo) return;
  const agora = { esquerda: false, direita: false, baixo: false, pulo: false };
  if (jogandoComToque()) {
    const s = toque.stick;
    if (s) {
      const dx = s.x - s.ox;
      const dy = s.y - s.oy;
      agora.esquerda = dx < -STICK.morta;
      agora.direita = dx > STICK.morta;
      // basta puxar um pouco para baixo; inclinado na diagonal também desliza correndo
      agora.baixo = dy > STICK.baixo && dy > Math.abs(dx) * 0.45;
    }
    Object.keys(toque.botoes).forEach(function(id) {
      if (toque.botoes[id] === "pulo") agora.pulo = true;
    });
  } else {
    toque.stick = null;
    toque.botoes = {};
  }
  Object.keys(agora).forEach(function(k) {
    if (agora[k] !== toque.segurando[k]) {
      teclas[k] = agora[k];
      toque.segurando[k] = agora[k];
    }
  });
}

function nomeDoToque(acao) {
  const nomes = { esquerda: "←", direita: "→", baixo: "↓", pulo: tr("PULO"), laco: tr("LAÇO"),
    dash: "DASH", loja: tr("LOJA"), pausa: tr("PAUSA") };
  return nomes[acao] || null;
}


// ---------- Desenho ----------

// Botão redondo "de verdade": sombra, degradê, borda clara e brilho; afunda quando apertado
function botaoRedondo(x, y, r, cores, apertado, apagado) {
  const yy = apertado ? y + 4 : y;
  ctx.beginPath();
  ctx.arc(x, y + 6, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, yy - r * 0.45, r * 0.1, x, yy, r);
  g.addColorStop(0, apagado ? "#ced4da" : cores[0]);
  g.addColorStop(0.65, apagado ? "#868e96" : cores[1]);
  g.addColorStop(1, apagado ? "#495057" : cores[2]);
  ctx.globalAlpha = apertado ? 0.95 : 0.8;
  ctx.beginPath();
  ctx.arc(x, yy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 4;
  ctx.strokeStyle = apertado ? "#ffffff" : (apagado ? "rgba(255,255,255,0.4)" : cores[3]);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(13,7,4,0.55)";
  ctx.beginPath();
  ctx.arc(x, yy, r + 3, 0, Math.PI * 2);
  ctx.stroke();
  // brilho em cima
  ctx.fillStyle = "rgba(255,255,255," + (apertado ? 0.12 : 0.22) + ")";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.15, yy - r * 0.45, r * 0.55, r * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();
  return yy;
}

// Ícones desenhados dentro dos botões
function iconeBotao(acao, x, y, r) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (acao === "pulo") {
    // seta grossa para cima
    ctx.strokeStyle = "#5c3a00";
    ctx.lineWidth = r * 0.24;
    ctx.beginPath(); ctx.moveTo(x - r * 0.32, y + r * 0.02); ctx.lineTo(x, y - r * 0.3); ctx.lineTo(x + r * 0.32, y + r * 0.02); ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(x - r * 0.32, y + r * 0.02); ctx.lineTo(x, y - r * 0.3); ctx.lineTo(x + r * 0.32, y + r * 0.02); ctx.stroke();
  } else if (acao === "laco") {
    desenharIconeCipo(x, y - r * 0.12, r * 0.42);
  } else if (acao === "dash") {
    // duas setas para a frente
    [-0.2, 0.16].forEach(function(dx) {
      ctx.strokeStyle = "#0b2a52";
      ctx.lineWidth = r * 0.2;
      ctx.beginPath(); ctx.moveTo(x + (dx - 0.14) * r * 1.6, y - r * 0.3); ctx.lineTo(x + dx * r * 1.6 + r * 0.06, y - r * 0.08); ctx.lineTo(x + (dx - 0.14) * r * 1.6, y + r * 0.14); ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = r * 0.09;
      ctx.beginPath(); ctx.moveTo(x + (dx - 0.14) * r * 1.6, y - r * 0.3); ctx.lineTo(x + dx * r * 1.6 + r * 0.06, y - r * 0.08); ctx.lineTo(x + (dx - 0.14) * r * 1.6, y + r * 0.14); ctx.stroke();
    });
  }
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

// Setinha (chevron) do analógico
function setaStick(x, y, ang, tam, acesa) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = acesa ? "#ffffff" : "rgba(255,243,191,0.75)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-tam * 0.5, -tam); ctx.lineTo(tam * 0.5, 0); ctx.lineTo(-tam * 0.5, tam); ctx.stroke();
  ctx.restore();
}

// Texto de dica piscando, num balão escuro
function dicaPiscando(txt, x, y) {
  const a = 0.75 + Math.sin(tempo * 0.15) * 0.25;
  ctx.font = "bold 20px " + FONTE;
  const w = Math.ceil(ctx.measureText(txt).width) + 28;
  ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(13,7,4,0.75)";
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - 22), w, 32);
  ctx.strokeStyle = "#ffe066";
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(y - 22) + 0.5, w - 1, 31);
  ctx.textAlign = "center";
  textoSombra(txt, x, y, "#ffe066");
  ctx.globalAlpha = 1;
}

// Primeira fase de quem está começando: pede para andar e pular até a pessoa fazer
function atualizarDicasToque() {
  if (!toqueAtivo || estado !== "jogo" || !fase || fase.indice !== 0 || save.desbloqueado > 0) {
    dicaToque.andar = dicaToque.pulo = 0;
    return;
  }
  if (!dicaToque.iniciou) { dicaToque.iniciou = true; dicaToque.andar = 1; dicaToque.pulo = 1; }
  if (dicaToque.andar && (teclas.direita || teclas.esquerda)) dicaToque.andar = 0;
  if (dicaToque.pulo && teclas.pulo) dicaToque.pulo = 0;
}

function desenharToque() {
  if (!toqueAtivo || !jogandoComToque()) return;
  atualizarDicasToque();
  ctx.save();

  // Analógico do lado esquerdo: base com setas e bolinha que acompanha o dedo
  const s = toque.stick;
  const ox = STICK.x;
  const oy = STICK.y;
  ctx.globalAlpha = s ? 1 : 0.85;
  ctx.beginPath();
  ctx.arc(ox, oy + 5, STICK.r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ox, oy, STICK.r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(13,7,4,0.38)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = s ? "rgba(255,255,255,0.85)" : "rgba(255,243,191,0.6)";
  ctx.stroke();
  setaStick(ox - STICK.r + 20, oy, Math.PI, 11, teclas.esquerda);
  setaStick(ox + STICK.r - 20, oy, 0, 11, teclas.direita);
  setaStick(ox, oy + STICK.r - 20, Math.PI / 2, 9, teclas.baixo);
  let kx = ox;
  let ky = oy;
  if (s) {
    const dx = s.x - s.ox;
    const dy = s.y - s.oy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, STICK.r / d);
    kx = ox + dx * k;
    ky = oy + dy * k;
  }
  botaoRedondo(kx, ky, 34, ["#ffffff", "#e9dcc4", "#8a6d45", "#ffffff"], false, false);
  ctx.globalAlpha = 1;

  // Botões do lado direito
  const apertados = {};
  Object.keys(toque.botoes).forEach(function(id) { apertados[toque.botoes[id]] = true; });
  BOTOES_TOQUE.forEach(function(b) {
    if (!botaoDisponivel(b)) return;
    const ap = !!apertados[b.acao];
    const recarga = b.acao === "laco" && jogador && jogador.recargaLaco > 0 && !jogador.laco;
    const yy = botaoRedondo(b.x, b.y, b.r, b.cores, ap, recarga);
    iconeBotao(b.acao, b.x, yy, b.r);
    ctx.font = "bold " + (b.r > 60 ? 20 : 15) + "px " + FONTE;
    ctx.textAlign = "center";
    textoSombra(tr(b.rotulo), b.x, yy + b.r * 0.55, "#ffffff");
    // cipó recarregando: anel enchendo em volta do botão
    if (recarga) {
      ctx.beginPath();
      ctx.arc(b.x, yy, b.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - jogador.recargaLaco / RECARGA_LACO));
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#69db7c";
      ctx.stroke();
    }
  });

  // Dicas da primeira fase
  if (dicaToque.andar) dicaPiscando(tr("Arraste para andar"), STICK.x, STICK.y - STICK.r - 26);
  if (dicaToque.pulo) dicaPiscando(tr("Toque para pular"), BOTOES_TOQUE[0].x - 30, BOTOES_TOQUE[0].y - BOTOES_TOQUE[0].r - 26);
  ctx.restore();
}


// ---------- Celular em pé: pede para girar ----------

function verificarOrientacao() {
  const emPe = toqueAtivo && window.innerHeight > window.innerWidth;
  el("girar").classList.toggle("aberta", emPe);
}

window.addEventListener("resize", verificarOrientacao);
window.addEventListener("orientationchange", verificarOrientacao);

// Abre já no modo toque em aparelhos sem teclado/mouse
if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0) {
  toqueAtivo = true;
}
verificarOrientacao();
