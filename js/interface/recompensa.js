"use strict";

// =========================
// RECOMPENSAS RÁPIDAS
// 1. Fim da partida: tela com o resultado, a barra de XP enchendo (subir de nível dá um baú especial),
//    o baú da partida para abrir (toque -> treme -> abre com raios e o prêmio), "▶ abrir outro baú" (premiado,
//    1 vez) e REVANCHE direto (sem passar pelo menu).
// 2. Recompensa diária: sequência de 7 dias que cresce (dia 3 tem baú, dia 7 baú lendário). Aparece sozinha
//    no menu uma vez por dia; perder um dia volta para o dia 1.
// =========================

let rec = null;        // estado da tela de recompensa
let diaria = null;     // estado da tela da recompensa diária

// ---------- fim da partida ----------
function abrirRecompensa(j, titulo, sub) {
  const xp = Progresso.ganharXP(Progresso.xpDaPartida(j));
  const baus = ["normal"];
  for (let i = 0; i < xp.subiu; i++) baus.push("nivel");
  rec = { modo: j.modo, baus: baus, i: 0, fase: "fechado", t0: 0, premio: null, extraUsado: false, xp: xp };
  estado = "recompensa";
  garantirDemo();          // no fundo, a luta de demonstração (sem o placar da partida que acabou)
  atualizarTextos();
  el("recTitulo").textContent = titulo;
  el("recSub").textContent = sub || "";
  el("recPremio").textContent = "";
  animarXp(xp);
  atualizarBotoesRecompensa();
  mostrarTela("telaRecompensa");
  if (xp.subiu) Eventos.marco("player-level-" + xp.nivel);
}

// barra de XP: enche do valor antigo até o novo (passando por "cheia" em cada nível que subiu)
function animarXp(xp) {
  const barra = el("recXp");
  const pct = function(nivel, valor) { return Math.min(100, 100 * valor / Progresso.xpParaSubir(nivel)) + "%"; };
  barra.style.transition = "none";
  barra.style.width = pct(xp.nivelAntes, xp.xpAntes);
  el("recNivel").textContent = t("nivel_jogador", xp.nivelAntes);
  el("recXpTxt").textContent = "+" + xp.ganho + " XP";
  void barra.offsetWidth;
  let passo = 0;
  function proximo() {
    barra.style.transition = "width 0.6s ease-out";
    if (passo < xp.subiu) {
      barra.style.width = "100%";
      setTimeout(function() {
        passo++;
        som("vitoria_rodada");
        el("recNivel").textContent = t("nivel_jogador", xp.nivelAntes + passo);
        el("recSub").textContent = t("subiu_nivel", xp.nivelAntes + passo);
        barra.style.transition = "none"; barra.style.width = "0%"; void barra.offsetWidth;
        proximo();
      }, 650);
    } else barra.style.width = pct(xp.nivel, xp.xp);
  }
  setTimeout(proximo, 250);
}

function atualizarBotoesRecompensa() {
  const faltam = rec.i < rec.baus.length;
  el("btnAbrirBau").classList.toggle("escondido", !faltam || rec.fase !== "fechado");
  el("btnAbrirBau").textContent = rec.baus[rec.i] === "nivel" ? t("abrir_bau_nivel") : t("abrir_bau");
  const podeExtra = !faltam && rec.fase !== "sacudindo" && !rec.extraUsado && Poki.premiadoDisponivel();
  el("btnOutroBau").classList.toggle("escondido", !podeExtra);
  el("btnOutroBau").textContent = "▶ " + t("outro_bau");
  if (podeExtra && !rec.ofertou) { rec.ofertou = true; Eventos.oferta("extra-chest", "visible"); }
}

function abrirBauDaVez() {
  if (!rec || rec.i >= rec.baus.length || rec.fase !== "fechado") return;
  rec.fase = "sacudindo";
  rec.t0 = performance.now() / 1000;
  som("carga");
  atualizarBotoesRecompensa();
  setTimeout(function() {
    rec.premio = Progresso.abrirBau(rec.baus[rec.i]);
    rec.fase = "aberto";
    rec.t0 = performance.now() / 1000;
    som("carta");
    mostrarPremio(el("recPremio"), rec.premio);
    rec.i++;
    // próximo baú (se subiu de nível) fica pronto depois de um instante
    setTimeout(function() {
      if (rec && rec.i < rec.baus.length) { rec.fase = "fechado"; }
      atualizarBotoesRecompensa();
      atualizarMenuProgresso();
    }, 900);
  }, 700);
}

function mostrarPremio(alvo, premio) {
  let txt = "+" + premio.moedas + " 🪙";
  if (premio.skin) txt += "   ✨ " + t("premio_skin", t("sk_" + premio.skin));
  alvo.textContent = txt;
}

function outroBau() {
  if (ocupado || !rec || rec.extraUsado) return;
  ocupado = true;
  Eventos.oferta("extra-chest", "interact");
  Poki.premiado("small").then(function(assistiu) {
    ocupado = false;
    if (!assistiu) { atualizarBotoesRecompensa(); return; }
    rec.extraUsado = true;
    rec.baus.push("normal");
    rec.fase = "fechado";
    atualizarBotoesRecompensa();
    abrirBauDaVez();
  });
}

// baús que ficaram sem abrir quando a pessoa sai: o prêmio vem do mesmo jeito
function fecharRecompensa() {
  if (!rec) return;
  while (rec.i < rec.baus.length) { Progresso.abrirBau(rec.baus[rec.i]); rec.i++; }
  rec = null;
}

function revanche() {
  if (!rec || ocupado) return;
  const modo = rec.modo;
  fecharRecompensa();
  comecarPartida(modo);
}

function recompensaParaMenu() {
  fecharRecompensa();
  irParaMenu(undefined);
}

// desenho do baú (chamado pelo loop enquanto a tela está aberta)
function desenharRecompensa(tempo) {
  const cv = el("canvasBau"), g = cv.getContext("2d");
  g.clearRect(0, 0, cv.width, cv.height);
  if (!rec || typeof ArteBau === "undefined") return;
  const tipo = rec.baus[Math.min(rec.i, rec.baus.length - 1)];
  const tipoVisto = rec.fase === "aberto" ? rec.baus[rec.i - 1] : tipo;
  const dt = tempo - rec.t0;
  let abre = 0, sacode = 0;
  if (rec.fase === "sacudindo") sacode = Math.min(1, dt * 2);
  if (rec.fase === "aberto") abre = Math.min(1, dt * 3);
  const pula = rec.fase === "fechado" ? Math.abs(Math.sin(tempo * 3)) * 6 : 0;
  ArteBau.desenhar(g, cv.width / 2, cv.height * 0.58 - pula, 1, tipoVisto, abre, tempo, sacode);
}

// ---------- recompensa diária ----------
function abrirDiaria() {
  const dia = Progresso.diaDisponivel();
  if (!dia) return false;
  diaria = { dia: dia, fase: "fechado", t0: 0, premio: null };
  estado = "diaria";
  montarDiaria(dia, false);
  el("diariaPremio").textContent = "";
  el("btnPegarDiaria").classList.remove("escondido");
  el("btnFecharDiaria").classList.add("escondido");
  el("canvasDiaria").classList.add("escondido");
  Eventos.oferta("daily", "visible");
  mostrarTela("telaDiaria");
  return true;
}

function montarDiaria(dia, pego) {
  const g = el("gradeDiaria");
  g.innerHTML = "";
  Progresso.DIARIAS.forEach(function(r, i) {
    const n = i + 1;
    const c = document.createElement("div");
    c.className = "diaCard" + (n < dia || (pego && n === dia) ? " pego" : "") + (n === dia ? " hoje" : "") + (n === 7 ? " grande" : "");
    const h = document.createElement("div"); h.className = "diaNum"; h.textContent = t("dia_n", n); c.appendChild(h);
    // ícone: baú desenhado (dias com baú) ou moeda
    if (r.bau && typeof ArteBau !== "undefined") {
      const cv = document.createElement("canvas"); cv.width = 110; cv.height = 80; cv.className = "diaIcone";
      ArteBau.desenhar(cv.getContext("2d"), 55, 50, 0.42, r.bau, 0, 0, 0);
      c.appendChild(cv);
    } else { const ic = document.createElement("div"); ic.className = "moedaGrande"; c.appendChild(ic); }
    const v = document.createElement("div"); v.className = "diaValor"; v.textContent = r.moedas + (r.bau ? " + " + t(r.bau === "lendario" ? "bau_lendario" : "bau") : ""); c.appendChild(v);
    if (n < dia || (pego && n === dia)) { const ok = document.createElement("div"); ok.className = "diaOk"; ok.textContent = "✓"; c.appendChild(ok); }
    g.appendChild(c);
  });
}

function pegarDiaria() {
  if (!diaria || diaria.fase !== "fechado") return;
  const premio = Progresso.pegarDiaria();
  if (!premio) { fecharDiaria(); return; }
  diaria.premio = premio;
  montarDiaria(premio.dia, true);
  som("carta");
  let txt = "+" + premio.moedas + " 🪙";
  if (premio.bau) {
    diaria.fase = "aberto"; diaria.t0 = performance.now() / 1000; diaria.tipoBau = premio.bau.tipo;
    el("canvasDiaria").classList.remove("escondido");
    txt += "   🎁 +" + premio.bau.moedas + " 🪙" + (premio.bau.skin ? "   ✨ " + t("premio_skin", t("sk_" + premio.bau.skin)) : "");
  } else diaria.fase = "pego";
  el("diariaPremio").textContent = txt;
  el("btnPegarDiaria").classList.add("escondido");
  el("btnFecharDiaria").classList.remove("escondido");
  atualizarMenuProgresso();
}

function fecharDiaria() {
  diaria = null;
  estado = "menu";
  atualizarTextos();
  mostrarTela("telaMenu");
}

function desenharDiaria(tempo) {
  if (!diaria || diaria.fase !== "aberto" || typeof ArteBau === "undefined") return;
  const cv = el("canvasDiaria"), g = cv.getContext("2d");
  g.clearRect(0, 0, cv.width, cv.height);
  ArteBau.desenhar(g, cv.width / 2, cv.height * 0.6, 0.8, diaria.tipoBau, Math.min(1, (tempo - diaria.t0) * 3), tempo, 0);
}
