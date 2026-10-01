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
      ctx.drawImage(SPR_ARMADILHA, l.x, l.y - 16);
    } else if (l.tipo === "tronco") {
      ctx.drawImage(SPR_TRONCO, l.x, CHAO - 40);
      ctx.drawImage(SPR_TRONCO, l.x + 40, CHAO - 40);
      ctx.drawImage(SPR_TRONCO, l.x + 20, CHAO - 76);
    } else if (l.tipo === "pedra") {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(SPR_PROJ.pedra, l.x + 20, CHAO - 80);
      ctx.drawImage(SPR_PROJ.pedra, l.x + 70, CHAO - 120, 60, 60);
      ctx.globalAlpha = 1;
    } else if (l.tipo === "bolaNeve") {
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(l.x - 10, CHAO - 40, 130, 40);
      ctx.fillRect(l.x + 10, CHAO - 64, 90, 24);
      ctx.fillRect(l.x + 34, CHAO - 80, 44, 16);
      ctx.fillStyle = "#dbe9f6";
      ctx.fillRect(l.x + 60, CHAO - 40, 60, 40);
    }
  }
}

function desenharPlantas(cam) {
  for (let i = 0; i < fase.plantas.length; i++) {
    const pl = fase.plantas[i];
    if (!visivel(pl.x, 48, cam)) continue;
    ctx.fillStyle = "#1b3a12";
    ctx.fillRect(pl.x + 2, CHAO - 4, 44, 8);
    if (pl.sai <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pl.x - 10, 0, 70, CHAO);
    ctx.clip();
    const morde = pl.sai >= 1 && Math.floor(tempo / 6) % 2 ? 2 : 0;
    ctx.drawImage(SPR_PLANTA, pl.x, Math.round(CHAO - 64 * pl.sai) + morde);
    ctx.restore();
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
      ctx.drawImage(SPR_PROJ.bolaFogo, Math.round(bx - 10), Math.round(by - 10));
    }
  }
}

function desenharAguas(cam) {
  for (let i = 0; i < fase.aguas.length; i++) {
    const a = fase.aguas[i];
    if (!visivel(a.x, a.w, cam)) continue;
    const topo = CHAO + 30;
    ctx.fillStyle = "rgba(28,126,214,0.85)";
    ctx.fillRect(a.x, topo, a.w, ALTURA - topo);
    ctx.fillStyle = "#a5d8ff";
    for (let x = 0; x < a.w; x += 16) {
      const h = 2 + Math.round((Math.sin(tempo * 0.06 + (a.x + x) * 0.04) + 1) * 2);
      ctx.fillRect(a.x + x, topo - h + 4, Math.min(16, a.w - x), h);
    }
  }
}

function desenharPowerups(cam) {
  for (let i = 0; i < fase.powerups.length; i++) {
    const pu = fase.powerups[i];
    if (!visivel(pu.x, 44, cam)) continue;
    if (pu.vida !== undefined && pu.vida < 120 && Math.floor(pu.vida / 6) % 2) continue;
    const y = Math.round(pu.y + Math.sin(pu.t * 0.08) * 6);
    ctx.globalAlpha = 0.35 + Math.sin(tempo * 0.15) * 0.15;
    ctx.fillStyle = "#d0ebff";
    ctx.fillRect(pu.x - 4, y - 4, 52, 52);
    ctx.globalAlpha = 1;
    ctx.drawImage(ICONES[pu.tipo], pu.x + 8, y + 8, 28, 28);
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
    const r = 40 + ((tempo * 2) % 60);
    ctx.globalAlpha = 0.5 * (1 - (r - 40) / 60);
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 3;
    ctx.strokeRect(Math.round(cx - r), Math.round(cy - r), r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
  if (buffs.puloDuplo > 0 && tempo % 6 === 0) {
    particula({ tipo: "q", x: cx + (Math.random() - 0.5) * 40, y: j.y + j.h, vx: 0, vy: -1, g: 0, vida: 20, max: 20, cor: "#74c0fc", tam: 5 });
  }
  if (buffs.velocidade > 0 && tempo % 3 === 0) {
    particula({ tipo: "q", x: cx - j.dir * 30, y: j.y + 10 + Math.random() * (j.h - 20), vx: -j.dir * 3, vy: 0, g: 0, vida: 12, max: 12, cor: "#ffe066", tam: 4 });
  }
}
