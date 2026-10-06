"use strict";

// =========================
// INÍCIO, TAMANHO DA TELA E LOOP
// - física em passos fixos de 1/60 s (igual em 60, 120 ou 144 Hz) e desenho a cada quadro;
// - deitado: o jogo (1280x720) cabe inteiro no meio da janela;
//   em pé (celular): ocupa a largura toda e fica mais alto (alturaTela), sem pedir para girar;
// - nada roda durante anúncio (o Poki avisa) e a aba escondida pausa o jogo.
// =========================

const canvas = el("canvas");
const ctx = canvas.getContext("2d");
let alturaTela = CONFIG.altura;
let modoRetrato = false;

function ajustarTela() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const retrato = CONFIG.permitirRetrato && h > w * 1.15;
  const escala = retrato ? w / CONFIG.largura : Math.min(w / CONFIG.largura, h / CONFIG.altura);
  const alt = retrato ? Math.max(CONFIG.altura, Math.floor(h / escala)) : CONFIG.altura;
  modoRetrato = retrato;
  alturaTela = alt;
  if (canvas.width !== CONFIG.largura) canvas.width = CONFIG.largura;
  if (canvas.height !== alt) canvas.height = alt;
  const tela = el("tela");
  tela.style.height = alt + "px";
  tela.style.transform = "translate(-50%, -50%) scale(" + escala + ")";
  document.body.classList.toggle("retrato", retrato);
}
window.addEventListener("resize", ajustarTela);
window.addEventListener("orientationchange", function() { setTimeout(ajustarTela, 150); });

// ---------- loop ----------
let ultimo = performance.now();
let acumulado = 0;

function passo(dt) {
  entrada.atualizar();
  if (estado === "jogo") {
    if (entrada.apertou("pausa")) { pausar(); return; }
    atualizarJogo(dt);
    Eventos.passoDeJogo(dt);
  } else if (estado === "pausa" && entrada.apertou("pausa")) {
    continuar();   // botão Start do controle
  }
}

function quadro(agora) {
  let dt = agora - ultimo;
  ultimo = agora;
  if (dt > 100) dt = 100;   // voltou de outra aba: não "pula" o tempo
  if (!Poki.anuncioAberto) {
    acumulado += dt;
    while (acumulado >= CONFIG.passo) {
      passo(CONFIG.passo);
      acumulado -= CONFIG.passo;
    }
  } else {
    acumulado = 0;
  }
  desenharJogo(ctx);
  requestAnimationFrame(quadro);
}

// ---------- começo ----------
(function iniciar() {
  carregarSave();
  ajustarTela();
  montarTelas();
  carregarIdioma(detectarIdioma(save.idioma)).then(function() {
    atualizarTextos();
    mostrarTela("telaMenu");
    requestAnimationFrame(quadro);
    // o SDK carrega em paralelo; o jogo não espera por ele para aparecer
    Poki.iniciar().then(function() {
      Poki.carregou();
      Eventos.inicioDaVisita();
    });
  });
})();
