"use strict";

// =========================
// UTILIDADES GERAIS
// =========================

const LARGURA = 1200;
const ALTURA = 700;
const PASSO = 1000 / 60;   // a física roda sempre a 60 passos por segundo
const CHAO = 620;          // topo do chão

function criarCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Pinta um mapa de letras; junta pixels iguais vizinhos num retângulo só
function pintarMapa(g, mapa, paleta, escala, dx, dy) {
  dx = dx || 0;
  dy = dy || 0;
  for (let y = 0; y < mapa.length; y++) {
    const linha = mapa[y];
    let x = 0;
    while (x < linha.length) {
      const ch = linha[x];
      let fim = x + 1;
      while (fim < linha.length && linha[fim] === ch) fim++;
      const cor = paleta[ch];
      if (cor) {
        g.fillStyle = cor;
        g.fillRect((x + dx) * escala, (y + dy) * escala, (fim - x) * escala, escala);
      }
      x = fim;
    }
  }
}

function larguraMapa(mapa) {
  let m = 0;
  for (const l of mapa) if (l.length > m) m = l.length;
  return m;
}

function spriteDeMapa(mapa, paleta, escala) {
  const c = criarCanvas(larguraMapa(mapa) * escala, mapa.length * escala);
  pintarMapa(c.getContext("2d"), mapa, paleta, escala);
  return c;
}

function espelhar(c) {
  const e = criarCanvas(c.width, c.height);
  const g = e.getContext("2d");
  g.scale(-1, 1);
  g.drawImage(c, -c.width, 0);
  return e;
}

// Silhueta branca (piscar quando leva dano)
function silhueta(c, cor) {
  const s = criarCanvas(c.width, c.height);
  const g = s.getContext("2d");
  g.drawImage(c, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = cor || "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  return s;
}

// Sprite virado para a direita (d) e para a esquerda (e)
function spriteDuplo(mapa, paleta, escala) {
  const d = spriteDeMapa(mapa, paleta, escala);
  return { d: d, e: espelhar(d), w: d.width, h: d.height };
}

// Círculo pixelado (projéteis)
function bolaPixel(raio, cor, borda, brilho, escala) {
  const n = raio * 2;
  const mapa = [];
  for (let y = 0; y < n; y++) {
    let linha = "";
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - raio;
      const dy = y + 0.5 - raio;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > raio) linha += ".";
      else if (d > raio - 1.3) linha += "B";
      else if (brilho && dx < 0 && dy < 0 && d > raio * 0.25 && d < raio * 0.65) linha += "H";
      else linha += "C";
    }
    mapa.push(linha);
  }
  return spriteDeMapa(mapa, { C: cor, B: borda, H: brilho }, escala || 2);
}

// Números "aleatórios" que se repetem sempre igual para a mesma semente (fases fixas)
function criarRng(semente) {
  let a = semente >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function encosta(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function limitar(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function aproximar(v, alvo, passo) {
  return v < alvo ? Math.min(v + passo, alvo) : Math.max(v - passo, alvo);
}

function sorteio(lista, r) {
  return lista[Math.floor((r ? r() : Math.random()) * lista.length)];
}
