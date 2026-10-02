"use strict";

// =========================
// CONTROLE (gamepad de Xbox / PlayStation, layout "standard" do navegador)
// Na fase: analógico ou direcional anda, A pula, X atira, Y laço, B/RB dash, LB recarrega,
// LT troca o poder escolhido, RT usa, Start pausa, Back/Select abre a loja.
// Nos menus: direcional move a seleção, A confirma, B volta, Start joga/continua.
// =========================

const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, CIMA: 12, BAIXO: 13, ESQ: 14, DIR: 15 };

// Nome do botão nas placas e no HUD quando a pessoa está jogando no controle
const BOTAO_DO_PAD = {
  pulo: "A", tiro: "X", laco: "Y", dash: "B", recarregar: "LB", baixo: "↓", esquerda: "←", direita: "→",
  loja: "Back", pausa: "Start"
};

let controleAtivo = false;     // usou o controle por último (placas mostram os botões dele)
let poderSelecionado = 0;      // poder que o RT usa (LT troca)
let focoPad = null;            // botão selecionado nos menus

const pad = {
  antes: [],                   // botões apertados no quadro anterior
  segurando: { esquerda: false, direita: false, baixo: false, pulo: false },
  direcao: null,               // direção segurada nos menus
  repetir: 0
};

window.addEventListener("gamepadconnected", function() {
  controleAtivo = true;
  atualizarTelas();
});
window.addEventListener("gamepaddisconnected", function() {
  controleAtivo = false;
  atualizarTelas();
});

// Teclado de volta: placas voltam a mostrar as teclas
document.addEventListener("keydown", function() {
  if (controleAtivo) {
    controleAtivo = false;
    marcarFoco(null);
    atualizarTelas();
  }
}, true);

function nomeComando(acao) {
  if (controleAtivo && BOTAO_DO_PAD[acao]) return BOTAO_DO_PAD[acao];
  return teclaDe(acao);
}

function lerPad() {
  const lista = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < lista.length; i++) {
    if (lista[i] && lista[i].connected) return lista[i];
  }
  return null;
}

// Chamado a cada passo (60 por segundo)
function atualizarControle() {
  const g = lerPad();
  if (!g) return;
  const b = g.buttons.map(function(x) { return x.pressed || x.value > 0.5; });
  const ax = g.axes[0] || 0;
  const ay = g.axes[1] || 0;
  const apertou = function(i) { return b[i] && !pad.antes[i]; };
  const algum = b.some(function(x) { return x; }) || Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5;
  if (algum && !controleAtivo) {
    controleAtivo = true;
    atualizarTelas();
  }

  const esq = b[PAD.ESQ] || ax < -0.4;
  const dir = b[PAD.DIR] || ax > 0.4;
  const baixo = b[PAD.BAIXO] || ay > 0.55;
  const cima = b[PAD.CIMA] || ay < -0.55;

  if (estado === "jogo" && !pausado) controleNaFase(b, apertou, esq, dir, baixo);
  else {
    soltarPad();
    controleNosMenus(apertou, esq, dir, baixo, cima);
  }
  pad.antes = b;
}

function controleNaFase(b, apertou, esq, dir, baixo) {
  marcarFoco(null);
  // Só muda a tecla quando o controle muda (não atrapalha quem está no teclado)
  const agora = { esquerda: esq, direita: dir, baixo: baixo, pulo: b[PAD.A] };
  Object.keys(agora).forEach(function(k) {
    if (agora[k] !== pad.segurando[k]) {
      teclas[k] = agora[k];
      pad.segurando[k] = agora[k];
    }
  });
  if (mensagemTravada()) return;
  if (apertou(PAD.A)) apertos.add("pulo");
  if (apertou(PAD.X)) apertos.add("tiro");
  if (apertou(PAD.Y)) apertos.add("laco");
  if (apertou(PAD.B) || apertou(PAD.RB)) apertos.add("dash");
  if (apertou(PAD.LB)) apertos.add("recarregar");
  if (apertou(PAD.LT)) {
    poderSelecionado = (poderSelecionado + 1) % PODERES.length;
    som("recarga");
  }
  if (apertou(PAD.RT)) usarPoder(PODERES[poderSelecionado].id);
  if (apertou(PAD.START)) pausar(true);
  else if (apertou(PAD.BACK)) abrirLoja();
}

// Fora da fase o controle não segura nada (ao voltar, o analógico vale de novo)
function soltarPad() {
  Object.keys(pad.segurando).forEach(function(k) { pad.segurando[k] = false; });
}


// ---------- Menus ----------

// A tela que está por cima e recebe o controle
function telaDoPad() {
  const ids = ["loja", "telaControles", "telaReviver", "telaPausa", "telaMapa", "telaMenu"];
  for (let i = 0; i < ids.length; i++) {
    const e = el(ids[i]);
    if (e.classList.contains("aberta")) return e;
  }
  return null;
}

function botoesDaTela(tela) {
  return Array.prototype.filter.call(tela.querySelectorAll("button"), function(b) {
    return !b.disabled && b.offsetParent !== null;
  });
}

function marcarFoco(b) {
  if (focoPad && focoPad !== b) focoPad.classList.remove("focoPad");
  focoPad = b;
  if (b) {
    b.classList.add("focoPad");
    b.scrollIntoView({ block: "nearest" });
  }
}

// Depois que a loja redesenha os botões, acha de novo o "mesmo" botão
function reencontrarFoco(lista) {
  if (focoPad && lista.indexOf(focoPad) >= 0) return focoPad;
  if (focoPad) {
    const d = focoPad.dataset;
    const igual = lista.find(function(b) {
      return Object.keys(d).length && Object.keys(d).every(function(k) { return b.dataset[k] === d[k]; });
    });
    if (igual) return igual;
  }
  return null;
}

// O botão mais perto na direção (dx, dy)
function vizinho(lista, atual, dx, dy) {
  const r = atual.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let melhor = null;
  let nota = Infinity;
  lista.forEach(function(b) {
    if (b === atual) return;
    const q = b.getBoundingClientRect();
    const vx = q.left + q.width / 2 - cx;
    const vy = q.top + q.height / 2 - cy;
    const frente = vx * dx + vy * dy;
    if (frente <= 4) return;
    const lado = Math.abs(vx * dy - vy * dx);
    const n = frente + lado * 2;
    if (n < nota) { nota = n; melhor = b; }
  });
  return melhor;
}

function controleNosMenus(apertou, esq, dir, baixo, cima) {
  // Cenas: qualquer botão pula a abertura ou volta do final
  if (estado === "intro") {
    if ((apertou(PAD.A) || apertou(PAD.START)) && intro.t > 30) terminarIntro();
    return;
  }
  if (estado === "final") {
    if ((apertou(PAD.A) || apertou(PAD.START)) && final.pronto) trocarCena(voltarAoMenu);
    return;
  }
  if (anuncios.aberto) return;

  const tela = telaDoPad();
  if (!tela) return;
  const lista = botoesDaTela(tela);
  if (!lista.length) return;
  let atual = reencontrarFoco(lista);

  // Direção: move na hora e repete se segurar
  const d = cima ? "cima" : baixo ? "baixo" : esq ? "esq" : dir ? "dir" : null;
  let mover = false;
  if (d !== pad.direcao) { pad.direcao = d; pad.repetir = 18; mover = !!d; }
  else if (d && --pad.repetir <= 0) { pad.repetir = 8; mover = true; }
  if (mover) {
    if (!atual) atual = lista[0];
    else {
      const v = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] }[d];
      atual = vizinho(lista, atual, v[0], v[1]) || atual;
    }
  }
  if (atual !== focoPad) marcarFoco(atual);

  if (apertou(PAD.A)) {
    if (focoPad) focoPad.click();
    else marcarFoco(lista[0]);
  } else if (apertou(PAD.B)) {
    voltarComPad(tela);
  } else if (apertou(PAD.START)) {
    if (tela.id === "telaMenu") jogar();
    else if (tela.id === "telaPausa") pausar(false);
  }
}

function voltarComPad(tela) {
  if (tela.id === "loja") fecharLoja();
  else if (tela.id === "telaControles") fecharControles();
  else if (tela.id === "telaReviver") recusarReviver();
  else if (tela.id === "telaPausa") pausar(false);
  else if (tela.id === "telaMapa") { telaAtual = "menu"; atualizarTelas(); }
  marcarFoco(null);
}
