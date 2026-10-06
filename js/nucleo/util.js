"use strict";

// Pequenas ferramentas usadas em todo lugar
function limitar(v, min, max) { return v < min ? min : v > max ? max : v; }
function aleatorio(min, max) { return min + Math.random() * (max - min); }
function el(id) { return document.getElementById(id); }

// Retângulos se encostando ({x, y, w, h})
function encosta(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Carrega um script uma vez só (usado pelos idiomas, para não baixar os 12)
const scriptsCarregados = {};
function carregarScript(src) {
  if (!scriptsCarregados[src]) {
    scriptsCarregados[src] = new Promise(function(ok, erro) {
      const s = document.createElement("script");
      s.src = src;
      s.onload = function() { ok(); };
      s.onerror = function() { erro(new Error("falhou: " + src)); };
      document.head.appendChild(s);
    });
  }
  return scriptsCarregados[src];
}
