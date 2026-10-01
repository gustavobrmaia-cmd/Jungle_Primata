"use strict";

// =========================
// OBSTÁCULOS NOVOS E POWER-UPS
// troncos, pedras e bolas de neve rolando, dardos, plantas carnívoras,
// barras de fogo, ventania, chuva de meteoros, gelo fino e power-ups da fase
// =========================

function ventoAtivo(v) {
  return v.t % 240 < 150;
}

// -1 quando o macaco está num vento soprando para a esquerda
function ventoNoJogador() {
  const j = jogador;
  const cx = j.x + j.w / 2;
  for (let i = 0; i < fase.ventos.length; i++) {
    const v = fase.ventos[i];
    if (cx > v.x && cx < v.x + v.w && ventoAtivo(v)) return -1;
  }
  return 0;
}

function alturaPlanta(t) {
  if (t < 90) return 0;
  if (t < 110) return (t - 90) / 20;
  if (t < 170) return 1;
  if (t < 190) return 1 - (t - 170) / 20;
  return 0;
}

function lancar(l) {
  if (l.tipo === "dardo") {
    projeteis.push({ tipo: "dardo", x: l.x - 24, y: l.y - 3, w: 22, h: 6, vx: -6.5, vy: 0, vida: 200 });
  } else if (l.tipo === "tronco") {
    projeteis.push({ tipo: "tronco", x: l.x, y: CHAO - 40, w: 40, h: 40, vx: -3.6, vy: 0, g: 0.6, rola: true, vida: 600 });
  } else if (l.tipo === "pedra") {
    projeteis.push({ tipo: "pedra", x: l.x, y: CHAO - 80, w: 80, h: 80, vx: -5, vy: 0, g: 0.6, rola: true, vida: 600 });
    tremor = Math.max(tremor, 4);
  } else if (l.tipo === "bolaNeve") {
    projeteis.push({ tipo: "bolaNeve", x: l.x, y: CHAO - 56, w: 56, h: 56, vx: -4.4, vy: 0, g: 0.6, rola: true, vida: 600 });
  }
}

function pegarPowerup(pu) {
  const p = PODERES.find(function(x) { return x.id === pu.tipo; });
  const j = jogador;
  som("poder");
  j.brilho = 10;
  texto(j.x + j.w / 2, j.y - 20, p.nome + "!", "#74c0fc", 22);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    particula({ tipo: "q", x: pu.x + 22, y: pu.y + 22, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, g: 0, vida: 20, max: 20, cor: "#d0ebff", tam: 6 });
  }
  if (pu.tipo === "nuke") nuke(true);
  else buffs[pu.tipo] = Math.max(buffs[pu.tipo], Math.round(p.duracao * DURACAO_POWERUP));
  if (pu.tipo === "puloDuplo") j.pulosExtras = 1;
  ganharXp(XP.powerup);
}

function atualizarObstaculos() {
  const j = jogador;
  const cj = caixaJogador();
  const vivo = !j.morto;

  // Lançadores: só funcionam perto da tela e enquanto o macaco não passou deles
  for (let i = 0; i < fase.lancadores.length; i++) {
    const l = fase.lancadores[i];
    if (l.x < cameraX - 200 || l.x > cameraX + LARGURA + 250 || j.x > l.x + 60) continue;
    if (++l.t >= l.intervalo) {
      l.t = 0;
      lancar(l);
    }
  }

  // Plantas carnívoras
  for (let i = 0; i < fase.plantas.length; i++) {
    const pl = fase.plantas[i];
    pl.t = (pl.t + 1) % 200;
    pl.sai = alturaPlanta(pl.t);
    if (vivo && pl.sai > 0.35 && encosta(cj, { x: pl.x + 6, y: CHAO - 64 * pl.sai + 4, w: 36, h: 64 * pl.sai })) machucar(pl.x + 24);
  }

  // Barras de fogo girando
  for (let i = 0; i < fase.barras.length; i++) {
    const b = fase.barras[i];
    b.ang += b.vel;
    if (!vivo || Math.abs(b.cx - (j.x + j.w / 2)) > 220) continue;
    for (let k = 1; k < b.n; k++) {
      const bx = b.cx + Math.cos(b.ang) * k * 18;
      const by = b.cy + Math.sin(b.ang) * k * 18;
      if (encosta(cj, { x: bx - 8, y: by - 8, w: 16, h: 16 })) { machucar(b.cx); break; }
    }
  }

  // Ventania
  for (let i = 0; i < fase.ventos.length; i++) {
    const v = fase.ventos[i];
    v.t++;
    if (ventoAtivo(v) && v.x < cameraX + LARGURA && v.x + v.w > cameraX && tempo % 2 === 0) {
      particula({ tipo: "vento", x: Math.min(v.x + v.w, cameraX + LARGURA), y: CHAO - 10 - Math.random() * 280,
        vx: -16 - Math.random() * 6, vy: 0, g: 0, vida: 50, max: 50, tam: 30 + Math.random() * 40 });
      if (tempo % 4 === 0) particula({ tipo: "q", x: Math.min(v.x + v.w, cameraX + LARGURA), y: CHAO - Math.random() * 200,
        vx: -10, vy: -0.3, g: 0, vida: 60, max: 60, cor: "#e0b062", tam: 4 });
    }
  }

  // Chuva de meteoros: caem perto do macaco, com uma sombra vermelha avisando
  for (let i = 0; i < fase.zonasMeteoro.length; i++) {
    const z = fase.zonasMeteoro[i];
    const cx = j.x + j.w / 2;
    if (!vivo || cx < z.x - 100 || cx > z.x + z.w + 100) continue;
    if (++z.t >= z.intervalo) {
      z.t = 0;
      const mx = limitar(cx - 80 + Math.random() * 380, z.x, z.x + z.w - 40);
      projeteis.push({ tipo: "meteoro", x: mx, y: -50, w: 40, h: 40, vx: -0.4, vy: 2, g: 0.35, vida: 400,
        aviso: 40, marcar: true, quebraNoChao: true, rastro: "#ff922b" });
    }
  }

  // Power-ups flutuando
  for (let i = fase.powerups.length - 1; i >= 0; i--) {
    const pu = fase.powerups[i];
    pu.t = (pu.t || 0) + 1;
    if (pu.vida !== undefined && --pu.vida <= 0) { fase.powerups.splice(i, 1); continue; }
    pu.y += (pu.base - pu.y) * 0.05;
    const yy = pu.y + Math.sin(pu.t * 0.08) * 6;
    if (vivo && encosta(cj, { x: pu.x, y: yy, w: 44, h: 44 })) {
      pegarPowerup(pu);
      fase.powerups.splice(i, 1);
    }
  }

  // Cogumelos voltam ao normal depois de amassar
  for (let i = 0; i < fase.plataformas.length; i++) {
    const p = fase.plataformas[i];
    if (p.amassar > 0) p.amassar--;
  }
}


// ---------- Desenho ----------

function desenharLancadores(cam) {
  for (let i = 0; i < fase.lancadores.length; i++) {
    const l = fase.lancadores[i];
    if (!visivel(l.x - 20, 140, cam)) continue;
    if (l.tipo === "dardo") {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      sombraNoChao(l.x - 2, CHAO - 1, 44, 5);
      ctx.drawImage(SPR_ARMADILHA, l.x, l.y - 16);
      // olhinho vermelho brilha pouco antes de disparar
      if (l.intervalo - l.t < 30) luzAditiva(l.x + 6, l.y, 20, "255,60,40", 0.5 * (1 - (l.intervalo - l.t) / 30));
    } else if (l.tipo === "tronco") {
      ctx.fillStyle = "rgba(0,0,0,0.26)";
      sombraNoChao(l.x - 2, CHAO - 1, 88, 5);
      ctx.drawImage(SPR_TRONCO, l.x, CHAO - 40);
      ctx.drawImage(SPR_TRONCO, l.x + 40, CHAO - 40);
      ctx.drawImage(SPR_TRONCO, l.x + 20, CHAO - 76);
    } else if (l.tipo === "pedra") {
      ctx.fillStyle = "rgba(0,0,0,0.26)";
      sombraNoChao(l.x + 14, CHAO - 1, 120, 5);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(SPR_PROJ.pedra, l.x + 20, CHAO - 80);
      ctx.drawImage(SPR_PROJ.pedra, l.x + 70, CHAO - 120, 60, 60);
      ctx.globalAlpha = 1;
    } else if (l.tipo === "bolaNeve") {
      // monte de neve com contorno, sombra azulada e brilhinhos
      const monte = [[-10, 40, 130], [10, 64, 90], [34, 80, 44]];
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      sombraNoChao(l.x - 12, CHAO - 1, 134, 5);
      monte.forEach(function(m) {
        ctx.fillStyle = "#16294a";
        ctx.fillRect(l.x + m[0] - 2, CHAO - m[1] - 2, m[2] + 4, m[1] + 2);
      });
      monte.forEach(function(m) {
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(l.x + m[0], CHAO - m[1], m[2], m[1]);
      });
      ctx.fillStyle = "#dbe9f6";
      ctx.fillRect(l.x + 60, CHAO - 40, 60, 40);
      ctx.fillStyle = "#b7cfe8";
      ctx.fillRect(l.x + 84, CHAO - 40, 36, 40);
      ctx.fillRect(l.x + 60, CHAO - 12, 60, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(l.x + 6, CHAO - 56, 10, 4);
      ctx.fillRect(l.x + 44, CHAO - 76, 8, 4);
      if ((tempo + i * 40) % 90 < 12) desenharEstrela4(l.x + 30, CHAO - 50, 5, "#ffffff");
    }
  }
}

function desenharPlantas(cam) {
  for (let i = 0; i < fase.plantas.length; i++) {
    const pl = fase.plantas[i];
    if (!visivel(pl.x, 48, cam)) continue;
    // buraquinho na terra com a borda de terra levantada
    ctx.fillStyle = "#0d0704";
    ctx.fillRect(pl.x - 2, CHAO - 6, 52, 10);
    ctx.fillStyle = "#1b3a12";
    ctx.fillRect(pl.x + 2, CHAO - 4, 44, 8);
    ctx.fillStyle = "#4a7a2a";
    ctx.fillRect(pl.x - 2, CHAO - 4, 6, 4);
    ctx.fillRect(pl.x + 44, CHAO - 4, 6, 4);
    if (pl.sai <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pl.x - 10, 0, 70, CHAO);
    ctx.clip();
    const morde = pl.sai >= 1 && Math.floor(tempo / 6) % 2 ? 2 : 0;
    ctx.drawImage(SPR_PLANTA, pl.x, Math.round(CHAO - 64 * pl.sai) + morde);
    ctx.restore();
    // folhinhas na base
    ctx.fillStyle = "#2f9e44";
    ctx.fillRect(pl.x - 4, CHAO - 10, 10, 6);
    ctx.fillRect(pl.x + 42, CHAO - 10, 10, 6);
    ctx.fillStyle = "#8ce99a";
    ctx.fillRect(pl.x - 4, CHAO - 10, 10, 2);
    ctx.fillRect(pl.x + 42, CHAO - 10, 10, 2);
  }
}

function desenharBarras(cam) {
  for (let i = 0; i < fase.barras.length; i++) {
    const b = fase.barras[i];
    if (!visivel(b.cx - 120, 240, cam)) continue;
    for (let k = 0; k < b.n; k++) {
      const bx = b.cx + Math.cos(b.ang) * k * 18;
      const by = b.cy + Math.sin(b.ang) * k * 18;
      if (by > CHAO + 6) continue;   // a parte que passa por baixo do chão não aparece
      luzAditiva(bx, by, 26 + (k === b.n - 1 ? 6 : 0), "255,120,20", 0.5 + Math.sin(tempo * 0.3 + k) * 0.1);
    }
    for (let k = 0; k < b.n; k++) {
      const bx = b.cx + Math.cos(b.ang) * k * 18;
      const by = b.cy + Math.sin(b.ang) * k * 18;
      if (by > CHAO + 6) continue;
      ctx.drawImage(SPR_PROJ.bolaFogo, Math.round(bx - 10), Math.round(by - 10));
    }
  }
}

function desenharAguas(cam) {
  const corpo = degradeVertical("aguaCorpo", 64, [[0, "#6ec6ff"], [0.15, "#3d9be9"], [0.55, "#1c6fc4"], [1, "#0b3a78"]]);
  const luz = degradeVertical("aguaLuz", 64, [[0, "rgba(160,220,255,0)"], [1, "rgba(160,220,255,0.35)"]]);
  for (let i = 0; i < fase.aguas.length; i++) {
    const a = fase.aguas[i];
    if (!visivel(a.x, a.w, cam)) continue;
    const topo = CHAO + 26;
    const t = tempo;

    // corpo em degradê (mais escuro no fundo), um pouco translúcido
    ctx.globalAlpha = 0.94;
    preencherDegrade(corpo, a.x, topo, a.w, ALTURA - topo);
    ctx.globalAlpha = 1;

    // bandas de luz que descem da superfície
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.05 + a.x) * 0.15;
    preencherDegrade(luz, a.x, topo - 4, a.w, 30);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // superfície em ondas (duas ondas somadas) com crista clara
    for (let x = 0; x < a.w; x += 8) {
      const wx = a.x + x;
      const w8 = Math.min(8, a.w - x);
      const onda = Math.sin(t * 0.06 + wx * 0.04) + Math.sin(t * 0.1 - wx * 0.08) * 0.5;
      const h = 4 + Math.round(onda * 2);
      ctx.fillStyle = "#6ec6ff";
      ctx.fillRect(wx, topo + 3 - h, w8, h);
      ctx.fillStyle = "#cdeeff";
      ctx.fillRect(wx, topo + 3 - h, w8, 2);
      if (h >= 5) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(wx + 2, topo + 3 - h, Math.max(2, w8 - 4), 2);
      }
    }

    // reflexos: riscos claros deslizando devagar
    const n = Math.max(2, Math.floor(a.w / 70));
    for (let k = 0; k < n; k++) {
      const semente = k * 3571 + Math.floor(a.x);
      const rx = a.x + ((semente * 7 + t * (0.25 + (k % 3) * 0.12)) % Math.max(30, a.w - 30));
      const ry = topo + 8 + (semente % 5) * 7;
      ctx.fillStyle = "rgba(255,255,255," + (0.18 + (k % 3) * 0.08).toFixed(2) + ")";
      ctx.fillRect(Math.round(rx), ry, 14 + (k % 3) * 8, 2);
      ctx.fillRect(Math.round(rx) + 6, ry + 4, 8, 2);
    }

    // brilhos cintilando
    for (let k = 0; k < n; k++) {
      const ciclo = (t + k * 29) % 100;
      if (ciclo > 12) continue;
      const sx = a.x + 12 + (((k * 677 + Math.floor(a.x)) * 13) % Math.max(20, Math.floor(a.w) - 24));
      desenharEstrela4(Math.round(sx), topo + 6 + (k % 3) * 8, Math.round(2 + Math.sin((ciclo / 12) * Math.PI) * 5), "#ffffff");
    }

    // espuma e contorno nas bordas do buraco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(a.x, topo - 4, 6, 6);
    ctx.fillRect(a.x + a.w - 6, topo - 4, 6, 6);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(a.x + 6, topo - 2, 4 + Math.round(Math.sin(t * 0.1) * 2), 4);
    ctx.fillRect(a.x + a.w - 10 - Math.round(Math.sin(t * 0.1) * 2), topo - 2, 4 + Math.round(Math.sin(t * 0.1) * 2), 4);
  }
}

function desenharPowerups(cam) {
  for (let i = 0; i < fase.powerups.length; i++) {
    const pu = fase.powerups[i];
    if (!visivel(pu.x, 44, cam)) continue;
    if (pu.vida !== undefined && pu.vida < 120 && Math.floor(pu.vida / 6) % 2) continue;
    const y = Math.round(pu.y + Math.sin(pu.t * 0.08) * 6);
    const cx = pu.x + 22;
    const cy = y + 22;
    sombraSprite(cx, pu.base + 44 + 10, 36, 0.26);
    // halo aditivo pulsando e estrelinhas girando em volta
    luzAditiva(cx, cy, 58, "170,215,255", 0.55 + Math.sin(tempo * 0.15) * 0.15);
    luzAditiva(cx, cy, 30, "255,255,255", 0.25);
    for (let k = 0; k < 3; k++) {
      const a = tempo * 0.05 + k * 2.09;
      desenharEstrela4(Math.round(cx + Math.cos(a) * 36), Math.round(cy + Math.sin(a) * 36 * 0.8), 3 + (k + Math.floor(tempo / 8)) % 3, k % 2 ? "#d0ebff" : "#ffffff");
    }
    desenharContorno(ICONES[pu.tipo], 0, 0, 32, 32, pu.x + 8, y + 8, 28, 28, "#0d0704", 2);
    ctx.drawImage(SPR_BOLHA, pu.x, y);
  }
}

// Brilho em volta do macaco enquanto um poder está ativo
function desenharAura() {
  const j = jogador;
  if (j.morto) return;
  const cx = j.x + j.w / 2;
  const cy = j.y + j.h / 2;
  if (buffs.ima > 0) {
    // ondas douradas do ímã se espalhando em volta do macaco
    luzAditiva(cx, cy, 70, "255,200,60", 0.16);
    for (let k = 0; k < 2; k++) {
      const r = 40 + ((tempo * 2 + k * 30) % 60);
      ctx.globalAlpha = 0.55 * (1 - (r - 40) / 60);
      ctx.strokeStyle = "#ffd43b";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -tempo;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (buffs.puloDuplo > 0 && tempo % 6 === 0) {
    particula({ tipo: "q", x: cx + (Math.random() - 0.5) * 40, y: j.y + j.h, vx: 0, vy: -1, g: 0, vida: 20, max: 20, cor: "#74c0fc", tam: 5 });
  }
  if (buffs.velocidade > 0 && tempo % 3 === 0) {
    particula({ tipo: "q", x: cx - j.dir * 30, y: j.y + 10 + Math.random() * (j.h - 20), vx: -j.dir * 3, vy: 0, g: 0, vida: 12, max: 12, cor: "#ffe066", tam: 4 });
  }
}
