"use strict";

// =========================
// TUTORIAL (primeira visita)
// Bem curtinho (~20 s): andar, pular, pisar na cobra e pegar a banana.
// Sem buracos, sem anúncio e sem cronômetro. No fim vai para o menu.
// =========================

const FASE_TUTORIAL = 101;   // índice especial (as fases normais vão de 0 a 23, o Saru é 100)

const TUTO_ANDAR = 620;      // passou daqui: já sabe andar
const TUTO_BLOCO = 820;      // bloco para pular
const TUTO_COBRA = 1280;
const TUTO_FIM = 1960;       // banana

let tuto = { passo: 0, ok: 0 };
const PASSOS_TUTO = ["walk", "jump", "snake", "banana"];   // nomes nos Game Events do Poki

function gerarTutorial() {
  const f = novaFase(0);
  f.indice = FASE_TUTORIAL;
  f.tutorial = true;
  f.ehChefe = false;
  f.pool = ["cobra"];
  f.inicioX = 240;
  fChao(f, 0, TUTO_FIM + 500);
  fBloco(f, TUTO_BLOCO, CHAO - 64, 64, 64);
  fArcoMoedas(f, TUTO_BLOCO - 70, TUTO_BLOCO + 150, CHAO - 120, 70, 4);
  fColocar(f, "cobra", TUTO_COBRA);
  fLinhaMoedas(f, TUTO_COBRA + 260, CHAO - 60, 4, 50);
  f.decoracoes.push({ x: 560, spr: 0 }, { x: 1120, spr: 0 }, { x: 1700, spr: 0 });
  f.fimX = TUTO_FIM;
  f.largura = TUTO_FIM + 500;
  tuto = { passo: 0, ok: 0 };
  medir("tutorial", PASSOS_TUTO[0], "start");
  return f;
}

function atualizarTutorial() {
  const j = jogador;
  if (!j) return;
  if (tuto.ok > 0) tuto.ok--;
  const cobraViva = inimigos.some(function(e) { return e.vivo; });
  let passo = 0;
  if (j.x > TUTO_ANDAR) passo = 1;
  if (j.x > TUTO_BLOCO + 64) passo = 2;
  if (passo === 2 && (!cobraViva || j.x > TUTO_COBRA + 220)) passo = 3;
  if (passo > tuto.passo) {
    for (let p = tuto.passo; p < passo; p++) {
      medir("tutorial", PASSOS_TUTO[p], "complete");
      medir("tutorial", PASSOS_TUTO[p + 1], "start");
    }
    tuto.passo = passo;
    tuto.ok = 40;
    som("moeda");
    texto(j.x + j.w / 2, j.y - 20, tr("Boa!"), "#9cff57", 26);
  }
}

function textoPassoTutorial() {
  const toque = toqueAtivo && !controleAtivo;
  if (tuto.passo === 0) return toque ? tr("Arraste o analógico para a direita") : tr("Ande para a direita: {0}", nomeComando("direita"));
  if (tuto.passo === 1) return toque ? tr("Toque em PULO para pular o bloco") : tr("Pule o bloco: {0}", nomeComando("pulo"));
  if (tuto.passo === 2) return tr("Pule na cabeça da cobra!");
  return tr("Pegue a banana!");
}

// Faixa grande no alto da tela com o passo atual (aparece também nas gravações, que só pegam o canvas)
function desenharTutorial() {
  if (mensagem) return;
  const txt = textoPassoTutorial();
  // deitado: logo abaixo do nome da fase; em pé: no espaço da placa do painel (letra grande)
  const emPe = modoRetrato && geoPlaca;
  const h = emPe ? Math.round(geoPlaca.h) : 64;
  const y = emPe ? Math.round(geoPlaca.y) : 92;
  let tam = emPe ? Math.round(h * 0.34) : 26;
  ctx.font = "bold " + tam + "px " + FONTE;
  while (tam > 14 && ctx.measureText(txt).width > LARGURA - 120) {
    tam -= 2;
    ctx.font = "bold " + tam + "px " + FONTE;
  }
  const w = emPe ? LARGURA - 60 : Math.ceil((ctx.measureText(txt).width + 70) / 8) * 8;
  const x = Math.round(LARGURA / 2 - w / 2);
  const pulso = tuto.ok > 0;
  painelPixel(x, y, w, h, pulso ? "#9cff57" : "#ffe066", "rgba(20,12,6,0.88)");
  ctx.textAlign = "center";
  ctx.font = "bold " + Math.round(h * 0.22) + "px " + FONTE;
  textoSombra(tr("Tutorial") + "  " + (tuto.passo + 1) + "/4", LARGURA / 2, y + h * 0.34, "#ffc21a");
  ctx.font = "bold " + tam + "px " + FONTE;
  textoSombra(txt, LARGURA / 2, y + h * 0.78, "#ffffff");

  if (tuto.passo === 0) desenharTeclasAndar();

  // seta pulando em cima do que tem que fazer
  let alvo = null;
  if (tuto.passo === 1) alvo = TUTO_BLOCO + 32;
  else if (tuto.passo === 2) {
    const c = inimigos.find(function(e) { return e.vivo; });
    if (c) alvo = c.x + c.w / 2;
  } else if (tuto.passo === 3) alvo = TUTO_FIM + 22;
  if (alvo !== null) {
    const z = zoomJogo();
    const sx = (alvo - cameraX) * z;
    const sy = (CHAO - (tuto.passo === 1 ? 150 : 130) + Math.sin(tempo / 8) * 8) * z;
    if (sx > 20 && sx < LARGURA - 20) {
      ctx.fillStyle = "#0d0704";
      ctx.beginPath();
      ctx.moveTo(sx - 20, sy - 4); ctx.lineTo(sx + 20, sy - 4); ctx.lineTo(sx, sy + 22);
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.moveTo(sx - 14, sy); ctx.lineTo(sx + 14, sy); ctx.lineTo(sx, sy + 15);
      ctx.fill();
    }
  }
}

// Primeiro passo: as teclas de andar desenhadas grandes no meio da tela, piscando, com uma seta
// apontando para a direita (16% dos jogadores do teste nunca chegaram a andar).
function desenharTeclasAndar() {
  if (toqueAtivo || controleAtivo) return;   // no toque já tem a dica no analógico
  const nomes = (save.teclas.direita || []).filter(function(k) { return k; }).map(nomeDaTecla);
  if (!nomes.length) return;
  const lado = 96;
  const esp = 60;
  const total = nomes.length * lado + (nomes.length - 1) * esp;
  const cy = modoRetrato ? Math.round(ALTURA * zoomJogo() * 0.42) : 300;
  const pisca = Math.floor(tempo / 20) % 2 === 0;
  let x = Math.round(LARGURA / 2 - total / 2 - 50);
  nomes.forEach(function(n, i) {
    if (i > 0) {
      ctx.font = "bold 26px " + FONTE;
      ctx.textAlign = "center";
      textoSombra(tr("ou"), x - esp / 2, cy + 8, "#ffe066");
    }
    teclaGrande(x, cy - lado / 2, lado, n, pisca);
    x += lado + esp;
  });
  // seta grande para a direita, balançando
  const sx = x + 10 + Math.sin(tempo / 6) * 8;
  ctx.fillStyle = "#0d0704";
  ctx.beginPath();
  ctx.moveTo(sx - 4, cy - 22); ctx.lineTo(sx + 44, cy - 22); ctx.lineTo(sx + 44, cy - 42);
  ctx.lineTo(sx + 84, cy); ctx.lineTo(sx + 44, cy + 42); ctx.lineTo(sx + 44, cy + 22); ctx.lineTo(sx - 4, cy + 22);
  ctx.fill();
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.moveTo(sx + 2, cy - 15); ctx.lineTo(sx + 50, cy - 15); ctx.lineTo(sx + 50, cy - 30);
  ctx.lineTo(sx + 75, cy); ctx.lineTo(sx + 50, cy + 30); ctx.lineTo(sx + 50, cy + 15); ctx.lineTo(sx + 2, cy + 15);
  ctx.fill();
}

// Tecla de teclado "de verdade": base escura, tampa clara que afunda quando pisca
function teclaGrande(x, y, lado, nome, apertada) {
  const desce = apertada ? 6 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 4, y + 10, lado, lado);
  ctx.fillStyle = "#0d0704";
  ctx.fillRect(x - 3, y + desce - 3, lado + 6, lado + 6 - desce);
  ctx.fillStyle = "#8a7a63";
  ctx.fillRect(x, y + 12, lado, lado - 12);
  ctx.fillStyle = apertada ? "#ffe066" : "#fff3d6";
  ctx.fillRect(x, y + desce, lado, lado - 14);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(x + 6, y + desce + 6, lado - 12, 6);
  ctx.fillStyle = "#3b2412";
  ctx.font = "bold " + (nome.length > 2 ? 22 : 44) + "px " + FONTE;
  ctx.textAlign = "center";
  ctx.fillText(nome, x + lado / 2, y + desce + (lado - 14) / 2 + (nome.length > 2 ? 8 : 15));
}

function fimDoTutorial() {
  medir("tutorial", PASSOS_TUTO[3], "complete");
  save.viuTutorial = true;
  salvar();
  sujo = false;
  som("vitoria");
  // emenda direto na história e na fase 1-1 (sem menu e sem anúncio): no Player Fit Test 1 em cada 5
  // jogadores sumia entre o fim do tutorial, o menu e o comercial. O menu aparece a partir da 2ª visita.
  mostrarMensagem(tr("Tutorial completo!"), tr("Agora é pra valer: atravesse os 4 mundos!"), 120, function() {
    trocarCena(function() {
      if (!save.viuIntro) iniciarIntro();
      else iniciarFase(0);
    });
  });
}
