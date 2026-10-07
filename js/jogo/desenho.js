"use strict";

// =========================
// DESENHO DA PARTIDA E HUD
// Junta a arte (ArteCenarios, ArteArmas, ArteCartas, ArteBolinha, Efeitos, ArteQueda) na ordem certa.
// Se algum arquivo de arte faltar, desenha formas simples no lugar (o jogo nunca quebra por causa da arte).
// No celular em pé o mundo 1280x720 fica um pouco acima do meio e o espaço de baixo fica para os dedos.
// =========================

const temArte = {
  get cen() { return typeof ArteCenarios !== "undefined"; },
  get armas() { return typeof ArteArmas !== "undefined"; },
  get cartas() { return typeof ArteCartas !== "undefined"; },
  get bola() { return typeof ArteBolinha !== "undefined"; },
  get fx() { return typeof Efeitos !== "undefined"; },
  get queda() { return typeof ArteQueda !== "undefined"; }
};

function deslocMundo() {
  return alturaTela > FIS.altura ? Math.round((alturaTela - FIS.altura) / 2) : 0;
}

function desenharJogo(ctx) {
  const j = jogo;
  const H = alturaTela;
  if (!j) { ctx.fillStyle = "#10121c"; ctx.fillRect(0, 0, CONFIG.largura, H); return; }
  const M = j.M, cen = M.cen, t = M.t;
  const dy = deslocMundo();

  // estado que o cenário usa para desenhar
  const est = estadoCenario(j, M, dy);

  ctx.save();
  if (temArte.fx) { const s = Efeitos.deslocamento(); ctx.translate(s.x, s.y); }
  ctx.translate(0, dy);

  // 1. fundo fixo (refeito só quando muda o cenário ou o tamanho)
  if (!j.prerender || j.prerenderCen !== cen.id || j.prerenderH !== H) {
    j.prerender = temArte.cen ? ArteCenarios.prerender(cen, CONFIG.largura, H) : null;
    j.prerenderCen = cen.id; j.prerenderH = H;
  }
  if (j.prerender) ctx.drawImage(j.prerender, 0, -dy);
  else { ctx.fillStyle = "#1b2140"; ctx.fillRect(0, -dy, CONFIG.largura, H); }

  // 2-3. fundo animado e plataformas
  if (temArte.cen) {
    ArteCenarios.desenharFundoAnimado(ctx, cen, est, t);
    ArteCenarios.desenharPlataformas(ctx, cen, M.plats, est, t);
  } else plataformasSimples(ctx, M);

  // 4. caixas e cartas
  for (let i = 0; i < M.caixas.length; i++) {
    const c = M.caixas[i];
    const piscando = !c.paraquedas && c.vida < 2.5 && Math.floor(c.vida * 8) % 2 === 0;
    if (piscando) continue;
    if (temArte.armas) ArteArmas.desenharCaixa(ctx, c);
    else { ctx.fillStyle = "#c08a4a"; ctx.fillRect(c.x - 18, c.y - 18, 36, 36); }
  }
  for (let i = 0; i < M.cartas.length; i++) {
    const c = M.cartas[i];
    if (c.vida < 1.5 && Math.floor(c.vida * 8) % 2 === 0) continue;
    const y = c.y + Math.sin(c.t * 3) * 6;
    const esc = Math.min(1, c.t * 4);
    if (temArte.cartas) ArteCartas.desenharCarta(ctx, c.id, c.x, y, esc, t);
    else { ctx.fillStyle = CARTA[c.id].cor; ctx.fillRect(c.x - 23 * esc, y - 32 * esc, 46 * esc, 64 * esc); }
  }

  // 5. projéteis, minas e avisos do céu
  for (let i = 0; i < M.proj.length; i++) {
    const p = M.proj[i];
    if (p.visual === "gancho") { const d = M.bolinhas[p.dono - 1]; p.donoX = d.x; p.donoY = d.y; }
    if (temArte.armas) ArteArmas.desenharProjetil(ctx, p);
    else { ctx.fillStyle = p.cor; ctx.beginPath(); ctx.arc(p.x, p.y, p.raio, 0, 7); ctx.fill(); }
  }
  for (let i = 0; i < M.avisos.length; i++) {
    const v = M.avisos[i];
    const prog = 1 - v.tempo / v.total;
    if (temArte.armas) {
      ArteArmas.desenharAviso(ctx, v.x, v.y, v.a.explode, prog, v.visual);
      if (v.visual === "meteoro" && v.tempo < 0.4) ArteArmas.desenharMeteoro(ctx, v.x, v.y - (v.tempo / 0.4) * (v.y + 60), 1 - v.tempo / 0.4);
    } else { ctx.strokeStyle = "rgba(255,80,80," + prog + ")"; ctx.beginPath(); ctx.arc(v.x, v.y, v.a.explode * prog, 0, 7); ctx.stroke(); }
  }

  // 6. bolinhas e armas
  for (let k = 0; k < 2; k++) desenharBolinhaNoMundo(ctx, j, M, M.bolinhas[k], M.bolinhas[1 - k], M.t);

  // 7. lasers e raios
  for (let i = 0; i < M.feixes.length; i++) {
    const f = M.feixes[i];
    if (temArte.armas) ArteArmas.desenharFeixe(ctx, f.pontos, f.visual, f.vida, f.cor);
    else { ctx.strokeStyle = f.cor; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.pontos[0].x, f.pontos[0].y); for (let k = 1; k < f.pontos.length; k++) ctx.lineTo(f.pontos[k].x, f.pontos[k].y); ctx.stroke(); }
  }

  // 8. partículas
  if (temArte.fx) Efeitos.desenhar(ctx);

  // 9. frente do cenário (lava, água, escuridão, vento)
  if (temArte.cen) ArteCenarios.desenharFrente(ctx, cen, est, t);
  ctx.restore();

  // 10. HUD e textos
  if (j.demo) { if (j.fase === "queda") desenharQueda(ctx, j, H); return; }   // fundo dos menus: só a luta
  // na queda de braço o botão de pausa sai da frente da barra de força
  const naQueda = j.fase === "queda";
  if (naQueda !== desenharJogo.naQueda) { desenharJogo.naQueda = naQueda; el("btnPausa").classList.toggle("escondido", naQueda); }
  if (j.fase === "queda") desenharQueda(ctx, j, H);
  else desenharHud(ctx, j, M, dy);
  if (!j.demo) desenharControlesToque(ctx, j, H);
  const cruz = !j.demo && estado === "jogo" && entrada.mouseAtivo && j.fase !== "queda";
  if (cruz) desenharCruzMira(ctx, j);
  if (cruz !== desenharJogo.cruz) { desenharJogo.cruz = cruz; canvas.style.cursor = cruz ? "none" : ""; }
}

function estadoCenario(j, M, dy) {
  const cen = M.cen, t = M.t;
  const est = j.est || (j.est = { luzes: [] });
  est.t = t; est.largura = CONFIG.largura; est.altura = alturaTela; est.deslocY = dy;
  est.lavaY = lavaY(cen, t);
  est.gravidade = gravSinal(cen, t);
  est.avisoInversao = avisoInversao(cen, t);
  est.vento = ventoEm(cen, t);
  est.bumpers = M.bumpers;
  est.portais = cen.portais;
  if (cen.escuro) {
    const l = est.luzes; l.length = 0;
    M.bolinhas.forEach(function(b) { if (b.viva) l.push({ x: b.x, y: b.y, r: 175 }); });
    for (let i = 0; i < M.proj.length && l.length < 24; i++) {
      const p = M.proj[i];
      if (p.visual === "chama" || p.visual === "bola_fogo" || p.visual === "plasma" || p.visual === "foguete" || p.visual === "missil") l.push({ x: p.x, y: p.y, r: 70 });
    }
    for (let i = 0; i < M.feixes.length && l.length < 28; i++) { const f = M.feixes[i]; const u = f.pontos[f.pontos.length - 1]; l.push({ x: u.x, y: u.y, r: 90 }); }
    for (let i = 0; i < M.cartas.length; i++) l.push({ x: M.cartas[i].x, y: M.cartas[i].y, r: 60 });
    for (let i = 0; i < M.caixas.length; i++) l.push({ x: M.caixas[i].x, y: M.caixas[i].y, r: 50 });
  }
  return est;
}

function plataformasSimples(ctx, M) {
  ctx.fillStyle = "#5c6b8a";
  M.plats.forEach(function(p) { ctx.fillRect(p.x, p.y, p.w, p.h); });
  if (M.cen.lava) { ctx.fillStyle = "#ff6a00"; ctx.fillRect(0, lavaY(M.cen, M.t), 1280, 400); }
}

// Descritor que a ArteBolinha desenha
function desenharBolinhaNoMundo(ctx, j, M, b, o, tm) {
  if (!b.viva) return;
  const ef = b.efeitos;
  const fantasma = ef.fantasma > 0 ? 0.82 : 0;
  // expressão
  let expr = "normal";
  if (j.fase === "fimRodada" && j.vencedorRodada === b.lado) expr = "feliz";
  else if (ef.congelado > 0 || ef.lento > 0.5) expr = "tonto";
  else if (b.dor > 0) expr = "dor";
  else if (b.vida < 25) expr = "medo";
  else if (ef.furia > 0 || b.recuoAnim > 0.5 || b.golpe > 0) expr = "bravo";
  const ox = o.x - b.x, oy = o.y - b.y, od = Math.sqrt(ox * ox + oy * oy) || 1;
  const d = b.desc || (b.desc = {});
  d.x = b.x; d.y = b.y; d.r = b.r; d.cor = b.cor; d.vx = b.vx; d.vy = b.vy;
  d.olharX = o.viva ? ox / od : b.dir; d.olharY = o.viva ? oy / od * 0.7 : 0;
  d.expressao = expr; d.piscar = b.piscar || 0;
  d.escalaX = b.escalaX || 1; d.escalaY = (b.escalaY || 1) * (gravSinal(M.cen, tm) < 0 ? -1 : 1);
  d.flash = b.flash || 0; d.escudo = ef.escudo > 0; d.fantasma = fantasma; d.congelado = ef.congelado > 0;
  d.fogo = ef.fogo > 0; d.furia = ef.furia > 0; d.rapidez = ef.rapidez > 0; d.t = tm;
  const sk = j.skins && j.skins[b.lado - 1];
  d.skin = sk ? sk.corpo : "classico"; d.acessorio = sk ? sk.acessorio : "nenhum";
  if (temArte.bola) {
    if (!M.cen.semGravidade && !M.cen.inverte) ArteBolinha.sombra(ctx, b.x, chaoEmbaixo(M, b), b.r, chaoEmbaixo(M, b) - b.y - b.r);
    ArteBolinha.desenhar(ctx, d);
  } else {
    ctx.globalAlpha = 1 - fantasma;
    ctx.fillStyle = b.flash > 0.5 ? "#fff" : b.cor;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (fantasma > 0) ctx.globalAlpha = 0.25;
  const a = ARMA[b.arma];
  const ang = a.tipo === "melee" || a.tipo === "mina" || a.tipo === "ceu" ? (b.dir > 0 ? 0 : Math.PI) : (b.mira === undefined ? 0 : b.mira);
  if (temArte.armas) ArteArmas.desenharNaMao(ctx, b.arma, b.x, b.y, ang, b.r, b.recuoAnim || 0, b.golpe > 0 ? 1 - b.golpe : 0);
  ctx.globalAlpha = 1;
  if (!j.demo && b.miraLivre !== null && b.miraLivre !== undefined && j.fase === "luta") desenharGuiaMira(ctx, M, b, ang);
  // marcador acima da cabeça no modo 2 jogadores (P1 / P2) para ninguém se perder
  if (!j.demo && (j.modo === "2p" || b.lado === 1)) {
    const txt = j.modo === "2p" ? "P" + b.lado : t("voce_curto");
    ctx.font = "900 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,10,20,0.75)"; ctx.fillStyle = b.cor;
    const yy = b.y - b.r - 16 - (gravSinal(M.cen, tm) < 0 ? -2 * b.r - 32 : 0);
    if (fantasma === 0 || j.modo === "2p") { ctx.strokeText(txt, b.x, yy); ctx.fillText(txt, b.x, yy); }
  }
}

// Linha pontilhada da mira livre: reta para tiros normais, curva para granadas/flechas (mostra onde cai)
function desenharGuiaMira(ctx, M, b, ang) {
  const a = ARMA[b.arma];
  if (a.tipo === "melee" || a.tipo === "mina" || a.tipo === "ceu") return;
  const boca = pontaDoCano(b, ang);
  const g = (a.grav || 0) * gravidadeDe(M.cen) * gravSinal(M.cen, M.t);
  const v = (a.vel || 18) * (M.cen.agua ? 0.7 : 1);
  const atravessa = a.atravessa || a.perfuraParede;
  let x = boca.x, y = boca.y, vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
  const passos = g ? 46 : 26, cada = g ? 3 : 2;
  let bateu = !atravessa && dentroDeSolida(M, x, y, a.raio || 4) ? { x: x, y: y } : null;   // cano já dentro da plataforma
  ctx.save();
  ctx.fillStyle = b.cor;
  for (let k = 1; k <= passos && !bateu; k++) {
    if (g) vy += g;
    const nx = x + vx * (g ? 1 : 0.9), ny = y + vy * (g ? 1 : 0.9);
    // o tiro bate numa plataforma grossa? a linha para ali e mostra um X vermelho
    // (mesma conta do tiro de verdade: ponto final e meio do caminho)
    if (!atravessa) {
      const r = a.raio || 4, mx = (x + nx) / 2, my = (y + ny) / 2;
      if (dentroDeSolida(M, mx, my, r)) { bateu = { x: mx, y: my }; break; }
      if (dentroDeSolida(M, nx, ny, r)) { bateu = { x: nx, y: ny }; break; }
    }
    x = nx; y = ny;
    if (k % cada) continue;
    const alfa = 0.75 * (1 - k / passos);
    if (alfa <= 0.05) break;
    ctx.globalAlpha = alfa;
    ctx.beginPath(); ctx.arc(x, y, g ? 3.2 : 2.6, 0, 7); ctx.fill();
  }
  if (bateu) {
    // X que pulsa, com borda escura para aparecer em qualquer cenário
    const r = 10 + Math.sin(M.t * 10) * 2;
    ctx.globalAlpha = 0.95; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bateu.x - r, bateu.y - r); ctx.lineTo(bateu.x + r, bateu.y + r);
    ctx.moveTo(bateu.x + r, bateu.y - r); ctx.lineTo(bateu.x - r, bateu.y + r);
    ctx.strokeStyle = "#3a0a14"; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = "#ff4d5e"; ctx.lineWidth = 4.5; ctx.stroke();
  }
  ctx.restore();
}

// Cruz da mira do mouse (jogador 1)
function desenharCruzMira(ctx, j) {
  const x = entrada.mouseX, y = entrada.mouseY, cor = j.cores[0];
  ctx.save();
  ctx.lineCap = "round";
  for (let k = 0; k < 2; k++) {
    ctx.strokeStyle = k ? cor : "rgba(12,8,30,0.85)";
    ctx.lineWidth = k ? 2.5 : 5.5;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 21, y); ctx.lineTo(x - 8, y); ctx.moveTo(x + 8, y); ctx.lineTo(x + 21, y);
    ctx.moveTo(x, y - 21); ctx.lineTo(x, y - 8); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 21);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
  ctx.restore();
}

function chaoEmbaixo(M, b) {
  let y = 720;
  for (let i = 0; i < M.plats.length; i++) {
    const p = M.plats[i];
    if (b.x > p.x && b.x < p.x + p.w && p.y >= b.y && p.y < y) y = p.y;
  }
  return y;
}

// ---------- HUD ----------
function textoContorno(ctx, s, x, y, tam, cor, alinh, contorno) {
  ctx.font = "900 " + tam + "px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = alinh || "center";
  ctx.lineJoin = "round";
  ctx.lineWidth = contorno || Math.max(4, tam * 0.16);
  ctx.strokeStyle = "rgba(12,8,30,0.9)";
  ctx.strokeText(s, x, y);
  ctx.fillStyle = cor || "#fff";
  ctx.fillText(s, x, y);
}

function retRedondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function nomeJogador(j, lado) {
  if (j.modo === "bot" || j.modo === "sobrevivencia") {
    const nivel = j.bots[1] ? j.bots[1].nivel : j.nivelBot;
    const estilo = j.bots[1] ? " · " + t("estilo_" + j.bots[1].estilo) : "";
    return lado === 1 ? t("voce") : t("bot") + " · " + t("nivel_curto", nivelBotTexto(nivel)) + estilo;
  }
  if (j.modo === "demo") return lado === 1 ? "BOT 1" : "BOT 2";
  return t("jogador_n", lado);
}

function desenharHud(ctx, j, M, dy) {
  // em pé: o HUD fica acima da arena e maior (a tela do celular é estreita)
  const em = dy > 150;
  const k = em ? 1.45 : 1;
  const topo = em ? dy - 200 : 10;
  const margem = em ? CONFIG.largura / 2 - CONFIG.largura / 2 / k + 12 : 20;
  ctx.save();
  if (em) { ctx.translate(CONFIG.largura / 2, topo); ctx.scale(k, k); ctx.translate(-CONFIG.largura / 2, -topo); }
  for (let i = 0; i < 2; i++) painelJogador(ctx, j, M.bolinhas[i], i === 0 ? margem : CONFIG.largura - margem, topo, i === 0 ? 1 : -1);

  // relógio
  const cx = CONFIG.largura / 2, cy = topo + 44;
  const tempo = Math.max(0, j.relogio);
  const dobro = j.fase === "luta" && tempo <= RODADA.danoDobro;
  ctx.save();
  ctx.fillStyle = "rgba(12,8,30,0.72)";
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, 7); ctx.fill();
  ctx.strokeStyle = dobro ? "#ff4d5e" : "#ffd43b";
  ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(cx, cy, 33, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (tempo / RODADA.luta)); ctx.stroke();
  const pulso = dobro ? 1 + 0.12 * Math.abs(Math.sin(M.t * 8)) : 1;
  textoContorno(ctx, String(Math.ceil(tempo)), cx, cy + 12 * pulso, Math.round(34 * pulso), dobro ? "#ff8787" : "#fff");
  textoContorno(ctx, j.modo === "sobrevivencia" ? t("onda_n", j.onda) : t("rodada_n", j.rodada), cx, cy + 64, 18, j.modo === "sobrevivencia" ? "#ffd43b" : "#e9ecef");
  if (dobro) textoContorno(ctx, t("dano_dobro"), cx, cy + 90, 20, "#ff6b6b");
  ctx.restore();
  ctx.restore();

  const meio = dy + FIS.altura * 0.42;
  // abertura da rodada: nome do cenário e o que ele tem de diferente
  if (j.fase === "intro") {
    const k = Math.min(1, j.tempoFase * 4);
    const cor = temArte.cen && ArteCenarios.corDestaque ? ArteCenarios.corDestaque(M.cen.id) : "#ffd43b";
    ctx.globalAlpha = k;
    textoContorno(ctx, t("c_" + M.cen.id), cx, meio - 20, 76, cor);
    textoContorno(ctx, t("r_" + M.cen.id), cx, meio + 30, 30, "#fff");
    if (j.lendaria) textoContorno(ctx, "✨ " + t("lendaria") + " ✨", cx, meio + 74, 26, "#ffd43b");
    if (j.modo === "sobrevivencia") textoContorno(ctx, t("onda_n", j.onda), cx, meio - 96, 44, "#ffd43b");
    ctx.globalAlpha = 1;
  } else if (j.fase === "luta" && j.tempoFase < 0.7) {
    const k = j.tempoFase / 0.7;
    ctx.globalAlpha = 1 - k;
    textoContorno(ctx, t("lute"), cx, meio + 20, Math.round(90 + k * 60), "#ffd43b");
    ctx.globalAlpha = 1;
  } else if (j.fase === "fimRodada" && j.tempoFase > 0.4) {
    const v = j.vencedorRodada;
    const surv = j.modo === "sobrevivencia";
    const txt = surv ? (v === 1 ? t("onda_concluida", j.onda) : t("bot_venceu_rodada")) :
      !v ? t("empate") : j.modo === "bot" ? (v === 1 ? t("voce_venceu_rodada") : t("bot_venceu_rodada")) : t("jogador_venceu_rodada", v);
    textoContorno(ctx, txt, cx, meio, 58, v ? j.cores[v - 1] : "#fff");
    if (!surv) placarGrande(ctx, j, cx, meio + 60);
  } else if (j.fase === "fimPartida") {
    const v = j.vencedorPartida;
    const surv = j.modo === "sobrevivencia";
    const txt = surv ? t("fim_sobrevivencia", j.onda) : j.modo === "bot" ? (v === 1 ? t("voce_venceu") : t("bot_venceu")) : t("jogador_venceu", v);
    const esc = 1 + 0.06 * Math.sin(j.tempoFase * 6);
    textoContorno(ctx, txt, cx, meio, Math.round((surv ? 64 : 84) * esc), j.cores[v - 1]);
    if (surv) textoContorno(ctx, t("recorde_onda", Math.max(save.recordeOnda, j.onda)), cx, meio + 64, 34, "#fff");
    else placarGrande(ctx, j, cx, meio + 70);
  }
  // primeira partida: lembrete dos controles nos primeiros segundos
  if ((save.partidas <= 1 && j.rodada <= 2 || j.dicaRodada === j.rodada) && (j.fase === "intro" || j.fase === "luta" && j.tempoFase < 7)) {
    const texto = entrada.toque ? t(j.modo === "2p" ? "dica_2p_toque" : "dica_bot_toque") : dicaTeclas(j.modo !== "2p");
    const linhas = texto.split("\n");
    const tam = em ? 34 : 24;
    const base = em ? dy + FIS.altura + 70 : dy + FIS.altura - 30 - (linhas.length - 1) * 30;
    ctx.globalAlpha = j.fase === "luta" ? Math.min(1, (7 - j.tempoFase) / 1.5) : 1;
    linhas.forEach(function(l, i) { textoContorno(ctx, l, cx, base + i * tam * 1.25, tam, "#fff"); });
    ctx.globalAlpha = 1;
  }
  // missão / desafio / conquista completada durante a partida
  if (typeof Progresso !== "undefined") Progresso.avisos.forEach(function(a, i) {
    const k = Math.min(1, a.t * 5) * Math.min(1, (3 - a.t) * 3);
    ctx.globalAlpha = Math.max(0, k);
    textoContorno(ctx, a.texto, cx, dy + FIS.altura - 70 - i * 34, 26, a.cor);
    ctx.globalAlpha = 1;
  });
  // carta que alguém acabou de pegar
  const uc = M.ultimaCarta;
  if (uc && M.t - uc.t < 1.8 && j.fase === "luta") {
    const k = Math.min(1, (M.t - uc.t) * 5) * Math.min(1, (1.8 - (M.t - uc.t)) * 4);
    ctx.globalAlpha = k;
    const y = topo + 150;
    if (temArte.cartas) ArteCartas.desenharCarta(ctx, uc.id, cx - 170, y, 1, M.t);
    textoContorno(ctx, t("k_" + uc.id), cx - 130, y - 6, 34, CARTA[uc.id].cor, "left");
    textoContorno(ctx, t("kd_" + uc.id), cx - 130, y + 24, 20, "#fff", "left");
    ctx.globalAlpha = 1;
  }
}

function placarGrande(ctx, j, cx, y) {
  textoContorno(ctx, j.pontos[0] + "  –  " + j.pontos[1], cx, y, 48, "#fff");
}

function painelJogador(ctx, j, b, x, y, lado) {
  const w = 380;
  const x0 = lado > 0 ? x : x - w;
  // nome
  textoContorno(ctx, nomeJogador(j, b.lado), lado > 0 ? x0 + 4 : x0 + w - 4, y + 22, 22, b.cor, lado > 0 ? "left" : "right");
  // barra de vida (com a parte perdida sumindo devagar)
  const vida = Math.max(0, b.vida) / 100;
  b.vidaLenta = b.vidaLenta === undefined ? vida : Math.max(vida, b.vidaLenta - 0.012);
  const by = y + 30, bh = 22;
  ctx.fillStyle = "rgba(12,8,30,0.75)";
  retRedondo(ctx, x0 - 3, by - 3, w + 6, bh + 6, 13); ctx.fill();
  const fill = function(f, cor) {
    if (f <= 0) return;
    ctx.fillStyle = cor;
    const ww = w * f;
    retRedondo(ctx, lado > 0 ? x0 : x0 + w - ww, by, ww, bh, 10); ctx.fill();
  };
  fill(b.vidaLenta, "#ffffff");
  fill(vida, vida < 0.25 ? "#ff4d5e" : b.cor);
  if (b.escudoHP > 0 && b.efeitos.escudo > 0) fill(b.escudoHP / 100, "rgba(77,171,247,0.75)");
  // pontos da partida
  for (let i = 0; i < j.alvo && i < 9 && j.modo !== "sobrevivencia"; i++) {
    const px = lado > 0 ? x0 + 12 + i * 26 : x0 + w - 12 - i * 26;
    ctx.beginPath(); ctx.arc(px, by + bh + 18, 9, 0, 7);
    ctx.fillStyle = i < j.pontos[b.lado - 1] ? "#ffd43b" : "rgba(12,8,30,0.6)";
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.stroke();
  }
  // arma e munição
  const ix = lado > 0 ? x0 + w - 56 : x0 + 56, iy = by + bh + 22;
  if (temArte.armas) ArteArmas.icone(ctx, b.arma, ix, iy, 34);
  const mun = b.municao === Infinity || b.efeitos.municao > 0 ? "∞" : String(b.municao);
  textoContorno(ctx, mun, lado > 0 ? ix + 24 : ix - 24, iy + 8, 20, "#fff", lado > 0 ? "left" : "right");
  // cartas ativas
  let n = 0;
  for (const id in b.efeitos) {
    if (!(b.efeitos[id] > 0) || !CARTA[id] || !CARTA[id].duracao) continue;
    const cx2 = lado > 0 ? x0 + 12 + (j.alvo * 26) + 14 + n * 30 : x0 + w - 12 - (j.alvo * 26) - 14 - n * 30;
    if (temArte.cartas) ArteCartas.icone(ctx, id, cx2, iy, 24);
    n++;
  }
}

// ---------- queda de braço ----------
function desenharQueda(ctx, j, H) {
  const q = j.queda;
  const M = j.M;
  const d1 = M.bolinhas[0].desc || {}, d2 = M.bolinhas[1].desc || {};
  [d1, d2].forEach(function(d, i) { const b = M.bolinhas[i]; d.cor = b.cor; d.r = 34; d.expressao = q.vencedor ? (q.vencedor === i + 1 ? "feliz" : "dor") : "esforco"; d.flash = 0; d.escalaX = 1; d.escalaY = 1; d.fantasma = 0; d.t = j.tempoFase; });
  const toque = entrada.toque;
  const q2 = {
    b1: d1, b2: d2, pos: q.pos, t: j.tempoFase, toques1: q.toques1, toques2: q.toques2, vencedor: q.vencedor,
    nome1: nomeJogador(j, 1), nome2: nomeJogador(j, 2),
    dica1: j.modo !== "2p" ? (toque ? t("queda_dica_toque") : t("queda_clique", nomeTecla(entrada.teclas()[1].tiro[0])))
                           : (toque ? t("queda_dica_toque_esq") : t("queda_aperte", nomeTecla(entrada.teclas()[1].tiro[0]))),
    dica2: j.modo !== "2p" ? "" : (toque ? t("queda_dica_toque_dir") : t("queda_aperte", nomeTecla(entrada.teclas()[2].tiro[0])))
  };
  if (temArte.queda) ArteQueda.desenhar(ctx, q2, CONFIG.largura, H);
  else {
    ctx.fillStyle = "rgba(10,8,25,0.85)"; ctx.fillRect(0, 0, CONFIG.largura, H);
    ctx.fillStyle = j.cores[0]; ctx.fillRect(140, H / 2 - 20, (q.pos + 1) / 2 * 1000, 40);
  }
  const cx = CONFIG.largura / 2;
  if (j.tempoFase < RODADA.quedaIntro && !q.vencedor) {
    const k = Math.min(1, j.tempoFase * 3);
    ctx.globalAlpha = k;
    textoContorno(ctx, t("queda"), cx, H * 0.22, 70, "#ffd43b");
    textoContorno(ctx, t("queda_sub"), cx, H * 0.22 + 46, 28, "#fff");
    ctx.globalAlpha = 1;
  } else if (!q.vencedor) {
    textoContorno(ctx, Math.max(0, Math.ceil(RODADA.quedaMax - q.t)).toString(), cx, H * 0.2, 54, "#fff");
  } else {
    const txt = j.modo === "bot" ? (q.vencedor === 1 ? t("voce_venceu_rodada") : t("bot_venceu_rodada")) : t("jogador_venceu_rodada", q.vencedor);
    textoContorno(ctx, txt, cx, H * 0.2, 54, j.cores[q.vencedor - 1]);
  }
}

// ---------- controles de toque (desenho dos analógicos e da área de tiro) ----------
function desenharControlesToque(ctx, j, H) {
  if (!entrada.toque || j.fase === "queda" || j.fase === "fimPartida") return;
  ctx.save();
  const emPe = H > FIS.altura + 200;
  const k = emPe ? 1.8 : 1;
  const yBaixo = H - (emPe ? 330 : 130);          // analógicos (andar / mirar)
  const yCima = H * (emPe ? 0.3 : 0.32);          // botão de pulo (metade de cima do lado de dentro)
  const zonas = j.modo === "2p"
    ? [{ x: 0.13, y: yBaixo, tipo: "stick", j: 1 }, { x: 0.39, y: yBaixo, tipo: "mira", j: 1 }, { x: 0.39, y: yCima, tipo: "pulo", j: 1 },
       { x: 0.61, y: yBaixo, tipo: "mira", j: 2 }, { x: 0.61, y: yCima, tipo: "pulo", j: 2 }, { x: 0.87, y: yBaixo, tipo: "stick", j: 2 }]
    : [{ x: 0.14, y: yBaixo, tipo: "stick", j: 1 }, { x: 0.86, y: yBaixo, tipo: "mira", j: 1 }, { x: 0.86, y: yCima, tipo: "pulo", j: 1 }];
  const abertos = entrada.analogicos();
  const nomes = { stick: "toque_mover", mira: "toque_mira", pulo: "toque_pulo" };
  zonas.forEach(function(z) {
    const cor = j.cores[z.j - 1];
    const x = z.x * CONFIG.largura;
    const usando = abertos.some(function(d) { return d.jogador === z.j && d.tipo === z.tipo; });
    const r = (z.tipo === "stick" ? 84 : z.tipo === "mira" ? 76 : 62) * k;
    ctx.globalAlpha = z.tipo === "pulo" && usando ? 0.45 : usando ? 0.12 : 0.28;
    ctx.lineWidth = 5; ctx.strokeStyle = cor; ctx.fillStyle = z.tipo === "pulo" && usando ? cor : "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.arc(x, z.y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = usando ? 0.3 : 0.55;
    textoContorno(ctx, t(nomes[z.tipo]), x, z.y + 8 * k, Math.round(20 * k), "#fff");
  });
  // analógicos que estão sendo usados
  abertos.forEach(function(d) {
    if (d.tipo === "pulo") return;
    const cor = j.cores[d.jogador - 1];
    const bx = d.fx * CONFIG.largura, by = d.fy * H;
    ctx.globalAlpha = 0.35; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(bx, by, 80, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.85; ctx.fillStyle = cor;
    ctx.beginPath(); ctx.arc(bx + limitar(d.dx, -80, 80), by + limitar(d.dy, -80, 80), 38, 0, 7); ctx.fill();
  });
  ctx.restore();
}
