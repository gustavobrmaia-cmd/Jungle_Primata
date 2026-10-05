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

// Posições "deitado" (guardadas para voltar quando o celular gira de novo)
BOTOES_TOQUE.forEach(function(b) { b.x0 = b.x; b.y0 = b.y; b.r0 = b.r; });
const STICK_DEITADO = { x: STICK.x, y: STICK.y, r: STICK.r };

// Em pé: tudo vai para o painel embaixo do jogo, bem maior (feito para o polegar)
let geoPoderes = { ox: 0, oy: 0, k: 1 };    // onde os quadradinhos dos poderes são desenhados
let geoPlaca = null;                         // faixa do painel que mostra a placa perto do macaco

function layoutToque() {
  if (!modoRetrato) {
    BOTOES_TOQUE.forEach(function(b) { b.x = b.x0; b.y = b.y0; b.r = b.r0; });
    STICK.x = STICK_DEITADO.x; STICK.y = STICK_DEITADO.y; STICK.r = STICK_DEITADO.r;
    geoPoderes = { ox: 0, oy: 0, k: 1 };
    geoPlaca = null;
  } else {
    const py = topoPainel();
    const ph = alturaTela - py;
    const f = limitar(ph / 1500, 0.55, 1.1);
    // poderes: faixa no topo do painel, ampliados
    const k = 2.3 * f;
    const larg = (PODERES.length + 1) * 66 * k;
    geoPoderes = { ox: (LARGURA - larg) / 2 - 20 * k + 10, oy: py + 50 * f - (ALTURA - 74) * k, k: k, cy: py + 60 * f + 62 * f };
    // placa: logo abaixo dos poderes
    const topoPlaca = py + 60 * f + 124 * f + 40 * f;
    geoPlaca = { y: topoPlaca, h: 150 * f };
    // controles: metade de baixo do painel, ao alcance dos polegares
    const cy = Math.max(topoPlaca + geoPlaca.h + 260 * f, py + ph * 0.64);
    STICK.x = 300; STICK.y = cy; STICK.r = 190 * f;
    const lug = { pulo: [950, cy + 60 * f, 200 * f], laco: [790, cy - 300 * f, 125 * f], dash: [1055, cy - 270 * f, 110 * f] };
    BOTOES_TOQUE.forEach(function(b) { b.x = lug[b.acao][0]; b.y = lug[b.acao][1]; b.r = lug[b.acao][2]; });
  }
  // zona morta e "puxar para baixo" acompanham o tamanho do analógico
  STICK.morta = STICK.r * 0.22;
  STICK.baixo = STICK.r * 0.32;
}

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
  return { x: (t.clientX - r.left) * canvas.width / r.width, y: (t.clientY - r.top) * canvas.height / r.height };
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
function poderNoPonto(q) {
  if (modoRetrato) {
    for (let i = 0; i < circulosPoderes.length; i++) {
      const c = circulosPoderes[i];
      if (Math.hypot(q.x - c.x, q.y - c.y) < c.r * 1.2) return c.i;
    }
    return -1;
  }
  // (no modo em pé os quadradinhos estão ampliados no painel: volta para a medida do HUD)
  const p = { x: (q.x - geoPoderes.ox) / geoPoderes.k, y: (q.y - geoPoderes.oy) / geoPoderes.k };
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
    } else if (p.x < LARGURA / 2 && !toque.stick && (!modoRetrato || p.y > topoPainel())) {
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
      // pendurado no cipó, "baixo" solta o cipó: aí só vale um puxão bem para baixo
      // (antes, balançar com o dedo inclinado soltava sem querer e o macaco caía)
      if (jogador && jogador.cipo) agora.baixo = dy > STICK.r * 0.7 && dy > Math.abs(dx) * 1.5;
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
  ctx.lineWidth = Math.max(6, tam * 0.55);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-tam * 0.5, -tam); ctx.lineTo(tam * 0.5, 0); ctx.lineTo(-tam * 0.5, tam); ctx.stroke();
  ctx.restore();
}

// Texto de dica piscando, num balão escuro
function dicaPiscando(txt, x, y) {
  const a = 0.75 + Math.sin(tempo * 0.15) * 0.25;
  const tam = modoRetrato ? 44 : 20;
  ctx.font = "bold " + tam + "px " + FONTE;
  const w = Math.ceil(ctx.measureText(txt).width) + tam * 1.4;
  const h = tam * 1.6;
  ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(13,7,4,0.75)";
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - h * 0.7), Math.round(w), Math.round(h));
  ctx.strokeStyle = "#ffe066";
  ctx.lineWidth = modoRetrato ? 4 : 2;
  ctx.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(y - h * 0.7) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  ctx.textAlign = "center";
  textoSombra(txt, x, y, "#ffe066");
  ctx.globalAlpha = 1;
}

// Primeira fase de quem está começando: pede para andar e pular até a pessoa fazer
function atualizarDicasToque() {
  if (!toqueAtivo || estado !== "jogo" || !fase || (fase.indice !== 0 && !fase.tutorial) || save.desbloqueado > 0) {
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
  ctx.fillStyle = modoRetrato ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.25)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ox, oy, STICK.r, 0, Math.PI * 2);
  ctx.fillStyle = modoRetrato ? "rgba(255,255,255,0.07)" : "rgba(13,7,4,0.38)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = s ? "rgba(255,255,255,0.85)" : "rgba(255,243,191,0.6)";
  ctx.stroke();
  const sk = STICK.r / 74;
  setaStick(ox - STICK.r + 20 * sk, oy, Math.PI, 11 * sk, teclas.esquerda);
  setaStick(ox + STICK.r - 20 * sk, oy, 0, 11 * sk, teclas.direita);
  setaStick(ox, oy + STICK.r - 20 * sk, Math.PI / 2, 9 * sk, teclas.baixo);
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
  if (modoRetrato) {
    const g = ctx.createRadialGradient(kx - 15, ky - 20, 4, kx, ky, STICK.r * 0.46);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0.45)");
    ctx.beginPath();
    ctx.arc(kx, ky, STICK.r * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  } else {
    botaoRedondo(kx, ky, STICK.r * 0.46, ["#ffffff", "#e9dcc4", "#8a6d45", "#ffffff"], false, false);
  }
  ctx.globalAlpha = 1;

  // Botões do lado direito
  const apertados = {};
  Object.keys(toque.botoes).forEach(function(id) { apertados[toque.botoes[id]] = true; });
  BOTOES_TOQUE.forEach(function(b) {
    if (!botaoDisponivel(b)) return;
    const ap = !!apertados[b.acao];
    const recarga = b.acao === "laco" && jogador && jogador.recargaLaco > 0 && !jogador.laco;
    const yy = modoRetrato ? botaoVidro(b, ap, recarga) : botaoRedondo(b.x, b.y, b.r, b.cores, ap, recarga);
    iconeBotao(b.acao, b.x, yy, b.r);
    ctx.font = "bold " + Math.max(15, Math.round(b.r * 0.26)) + "px " + FONTE;
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
  const folgaDica = modoRetrato ? 60 : 26;
  if (dicaToque.andar) dicaPiscando(tr("Arraste para andar"), STICK.x + (modoRetrato ? 40 : 0), STICK.y - STICK.r - folgaDica);
  if (dicaToque.pulo) dicaPiscando(tr("Toque para pular"), BOTOES_TOQUE[0].x - (modoRetrato ? 80 : 30), BOTOES_TOQUE[0].y - BOTOES_TOQUE[0].r - folgaDica);
  ctx.restore();
}


// ---------- Painel do modo em pé (embaixo do jogo) ----------

// Cor de fundo do painel em cada mundo (o cenário se dissolve nela, sem emenda)
const COR_PAINEL = ["16,38,20", "48,30,16", "14,30,46", "40,14,10"];

function fundoPainel(py, ph) {
  const cor = COR_PAINEL[fase ? fase.mundo : 0] || COR_PAINEL[0];
  // degradê: da cor do mundo para quase preto
  const g = ctx.createLinearGradient(0, py, 0, py + ph);
  g.addColorStop(0, "rgb(" + cor + ")");
  g.addColorStop(1, "#07080a");
  ctx.fillStyle = g;
  ctx.fillRect(0, py, LARGURA, ph);
  // o fim do cenário vai escurecendo até a cor do painel (sem borda nenhuma)
  const f = ctx.createLinearGradient(0, py - 110, 0, py + 4);
  f.addColorStop(0, "rgba(" + cor + ",0)");
  f.addColorStop(1, "rgba(" + cor + ",1)");
  ctx.fillStyle = f;
  ctx.fillRect(0, py - 110, LARGURA, 114);
  // brilho suave atrás dos controles
  [[STICK.x, STICK.y, STICK.r * 1.9], [BOTOES_TOQUE[0].x, BOTOES_TOQUE[0].y, BOTOES_TOQUE[0].r * 1.9]].forEach(function(b) {
    const r = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
    r.addColorStop(0, "rgba(255,255,255,0.06)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r;
    ctx.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2);
  });
}

// Texto da placa perto do macaco (no jogo ela fica pequena demais com o celular em pé)
function textoPlacaPerto() {
  const j = jogador;
  if (!j || !fase) return null;
  for (let i = 0; i < fase.placas.length; i++) {
    const p = fase.placas[i];
    if (Math.abs(j.x + j.w / 2 - (p.x + 16)) < 260) {
      return p.texto.replace(/\{(\w+)\}/g, function(m, a) { return nomeComando(a); });
    }
  }
  return null;
}

function retanguloRedondo(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Placa: cartão escuro translúcido com letras grandes
function desenharPlacaPainel(txt) {
  const linhas = txt.split("\n");
  const f = geoPlaca.h / 150;
  const tam = Math.round(40 * f);
  const lh = Math.round(54 * f);
  const h = Math.round(linhas.length * lh + 36 * f);
  const y = Math.round(geoPlaca.y);
  retanguloRedondo(70, y, LARGURA - 140, h, 28 * f);
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.stroke();
  ctx.font = "bold " + tam + "px " + FONTE;
  ctx.textAlign = "center";
  linhas.forEach(function(l, k) { textoSombra(l, LARGURA / 2, y + 18 * f + lh * (k + 0.72), k === 0 ? "#ffe066" : "#ffffff", 3); });
}

// Poderes em círculos de vidro (tocar usa); a posição de cada um fica guardada para o toque
let circulosPoderes = [];

function desenharPoderesRetrato(j) {
  circulosPoderes = [];
  const lista = PODERES.slice();
  const f = geoPlaca.h / 150;
  const r = 62 * f;
  const passo = r * 2 + 34 * f;
  const n = lista.length + (temMelhoria("dash") ? 1 : 0);
  const x0 = LARGURA / 2 - (n - 1) * passo / 2;
  const y = geoPoderes.cy;
  lista.forEach(function(p, i) {
    const x = x0 + i * passo;
    circulosPoderes.push({ x: x, y: y, r: r, i: i });
    const qtd = save.poderes[p.id];
    const ativo = buffs[p.id] > 0;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = ativo ? "rgba(105,219,124,0.28)" : "rgba(0,0,0,0.32)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = ativo ? "#69db7c" : "rgba(255,255,255," + (qtd > 0 ? 0.45 : 0.15) + ")";
    ctx.stroke();
    ctx.globalAlpha = qtd > 0 || ativo ? 1 : 0.3;
    ctx.drawImage(ICONES[p.id], Math.round(x - r * 0.62), Math.round(y - r * 0.62), Math.round(r * 1.24), Math.round(r * 1.24));
    ctx.globalAlpha = 1;
    // recarga: arco escurecendo
    if (recargas[p.id] > 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (recargas[p.id] / p.recarga));
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fill();
    }
    if (ativo) {
      ctx.beginPath();
      ctx.arc(x, y, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (buffs[p.id] / p.duracao));
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#69db7c";
      ctx.stroke();
    }
    // contador
    ctx.font = "bold " + Math.round(26 * f) + "px " + FONTE;
    ctx.textAlign = "center";
    textoSombra("x" + qtd, x + r * 0.62, y + r * 0.95, qtd > 0 ? "#ffffff" : "#868e96", 3);
  });
  if (temMelhoria("dash")) {
    // o dash tem botão próprio: aqui só mostra a recarga
    const x = x0 + lista.length * passo;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = j.recargaDash > 0 ? "rgba(255,255,255,0.15)" : "rgba(116,192,252,0.7)";
    ctx.stroke();
    ctx.globalAlpha = j.recargaDash > 0 ? 0.4 : 1;
    ctx.drawImage(ICONES.dash, Math.round(x - r * 0.62), Math.round(y - r * 0.62), Math.round(r * 1.24), Math.round(r * 1.24));
    ctx.globalAlpha = 1;
  }
}

// Botão de vidro (modo em pé): círculo translúcido com borda clara; o PULO é dourado
function botaoVidro(b, apertado, apagado) {
  const yy = apertado ? b.y + 5 : b.y;
  const cores = { pulo: "255,200,40", laco: "81,207,102", dash: "77,171,247" };
  const c = apagado ? "160,160,160" : cores[b.acao] || "255,255,255";
  const g = ctx.createRadialGradient(b.x - b.r * 0.3, yy - b.r * 0.4, b.r * 0.1, b.x, yy, b.r);
  g.addColorStop(0, "rgba(" + c + "," + (apertado ? 0.75 : 0.55) + ")");
  g.addColorStop(1, "rgba(" + c + "," + (apertado ? 0.45 : 0.22) + ")");
  ctx.beginPath();
  ctx.arc(b.x, yy, b.r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255," + (apertado ? 0.95 : 0.6) + ")";
  ctx.stroke();
  return yy;
}

function desenharPainelRetrato() {
  if (!modoRetrato) return;
  // começa logo abaixo do que foi desenhado do jogo (nas lutas de chefe o jogo não é ampliado)
  const py = ALTURA * zoomJogo();
  const ph = alturaTela - py;
  ctx.save();
  ctx.globalAlpha = 1;
  fundoPainel(py, ph);
  if (estado === "jogo" && jogador) {
    desenharPoderesRetrato(jogador);
    const txt = textoPlacaPerto();
    if (txt) desenharPlacaPainel(txt);
    desenharToque();
  }
  ctx.restore();
}


// Abre já no modo toque em aparelhos sem teclado/mouse
if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0) {
  toqueAtivo = true;
}
