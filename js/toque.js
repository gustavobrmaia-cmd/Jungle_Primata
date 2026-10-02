"use strict";

// =========================
// TOQUE (celular e tablet)
// Lado esquerdo da tela: arraste o dedo para andar (e para baixo para deslizar).
// Lado direito: botões PULO, TIRO, LAÇO e DASH. Toque num poder do HUD para usar.
// Os controles só aparecem depois do primeiro toque; o teclado ou o controle escondem de novo.
// =========================

let toqueAtivo = false;

const BOTOES_TOQUE = [
  { acao: "pulo", x: 1100, y: 590, r: 72, rotulo: "PULO" },
  { acao: "tiro", x: 950,  y: 622, r: 48, rotulo: "TIRO" },
  { acao: "laco", x: 990,  y: 488, r: 46, rotulo: "LAÇO" },
  { acao: "dash", x: 1130, y: 432, r: 42, rotulo: "DASH", melhoria: "dash" }
];

const STICK = { x: 190, y: 520, r: 74, morta: 18 };

const toque = {
  stick: null,      // { id, ox, oy, x, y } dedo do lado esquerdo
  botoes: {},       // id do dedo -> ação do botão
  segurando: { esquerda: false, direita: false, baixo: false, pulo: false }
};

function botaoDisponivel(b) {
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
      toque.stick = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y };
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
      // o centro acompanha o dedo se ele for longe demais (não precisa voltar até o começo)
      const dx = p.x - toque.stick.ox;
      const dy = p.y - toque.stick.oy;
      const d = Math.hypot(dx, dy);
      if (d > STICK.r) {
        toque.stick.ox = p.x - (dx / d) * STICK.r;
        toque.stick.oy = p.y - (dy / d) * STICK.r;
      }
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
      agora.baixo = dy > STICK.r * 0.55;
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
  const nomes = { esquerda: "←", direita: "→", baixo: "↓", pulo: tr("PULO"), tiro: tr("TIRO"), laco: tr("LAÇO"),
    dash: "DASH", loja: tr("LOJA"), pausa: tr("PAUSA") };
  return nomes[acao] || null;
}


// ---------- Desenho ----------

function circuloToque(x, y, r, apertado, cor) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = apertado ? "rgba(255,255,255,0.32)" : "rgba(13,7,4,0.32)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = apertado ? "rgba(255,255,255,0.9)" : cor || "rgba(255,243,191,0.55)";
  ctx.stroke();
}

function desenharToque() {
  if (!toqueAtivo || !jogandoComToque()) return;
  ctx.save();

  // Analógico do lado esquerdo
  const s = toque.stick;
  const ox = s ? s.ox : STICK.x;
  const oy = s ? s.oy : STICK.y;
  ctx.globalAlpha = s ? 1 : 0.6;
  circuloToque(ox, oy, STICK.r, false);
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
  circuloToque(kx, ky, 32, !!s);
  ctx.globalAlpha = 1;

  // Botões do lado direito
  const apertados = {};
  Object.keys(toque.botoes).forEach(function(id) { apertados[toque.botoes[id]] = true; });
  ctx.textAlign = "center";
  BOTOES_TOQUE.forEach(function(b) {
    if (!botaoDisponivel(b)) return;
    const ap = !!apertados[b.acao];
    circuloToque(b.x, b.y, b.r, ap, b.acao === "pulo" ? "rgba(255,212,59,0.75)" : null);
    ctx.font = "bold " + (b.r > 60 ? 24 : 18) + "px " + FONTE;
    textoSombra(tr(b.rotulo), b.x, b.y + 7, ap ? "#ffffff" : "#fff3bf");
  });

  // Munição acabando: o botão de tiro mostra a recarga
  if (jogador && jogador.recarregando > 0) {
    const b = BOTOES_TOQUE[1];
    const total = temMelhoria("revolver") ? 40 : 70;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - jogador.recarregando / total));
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ffd43b";
    ctx.stroke();
  }
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
