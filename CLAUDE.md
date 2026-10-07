# Estrutura obrigatória (vale para todo jogo novo deste repositório)

Combinado com o dono do jogo. Qualquer versão nova TEM que manter isto:

## 1. Idiomas: 12
- pt + en + os 10 mais fortes no Poki: es, fr, de, it, nl, pl, tr, ru, ro, id.
- Um arquivo por idioma em `js/idiomas/textos/xx.js` (`TEXTOS.xx = { chave: "texto" }`). Só baixa o escolhido + inglês (reserva).
- Ordem: escolha salva > idioma do navegador > inglês. Troca na hora, sem recarregar.
- Nunca escrever texto direto no código: `t("chave", valores)` no JS e `data-t="chave"` no HTML.
- Texto novo = adicionar a chave nos 12 arquivos.

## 2. Game Events (o que o jogador faz)
- Sempre pelos atalhos de `js/eventos.js`, nunca `PokiSDK.measure` direto:
  - `Eventos.nivel(id, "start" | "complete" | "fail")`: tabela de progresso e funil (Started, Completed, Failed, Left).
  - `Eventos.oferta(nome, "visible" | "interact")`: anúncio premiado oferecido e aceito.
  - `Eventos.botao(nome)` e `Eventos.marco(nome)`: cliques importantes e momentos-chave.
- Automáticos, não remover:
  - playtime (30s, 1m, 2m, 3m, 5m, 10m, 15m, 20m, 30m de gameplay real);
  - idioma, desktop/mobile, em pé/deitado, primeira visita/voltou;
  - primeira interação;
  - erros de JS (máx. 5 por visita).
- Nomes sem "/" nem "^". Eventos de antes do SDK ficam numa fila e não se perdem.

## 3. SDK do Poki (`js/poki.js`), com tudo que aprendemos
- Script do SDK no `<head>`. Ordem: `init()` e depois `gameLoadingFinished()`.
- `gameplayStart`: só depois da 1ª interação. `gameplayStop`: em pausa, menu, fim, anúncio e aba escondida.
- `commercialBreak` (`Poki.intervalo()`) antes de TODA volta ao jogo: começar, próxima fase, recomeçar.
  - O Poki decide se mostra. Sem timer, sorteio ou limite nosso.
  - Exceção: a primeira partida de quem acabou de chegar (e, entre as rodadas, as 2 primeiras partidas).
- `rewardedBreak` (`Poki.premiado(tamanho)`) só quando o jogador escolhe. Nunca soltar comercial comum logo depois de um premiado.
- Durante anúncio: jogo parado e mudo.
- Rede de segurança: o anúncio tem que começar em 4 s (comercial) ou 8 s (premiado), com limite de 60 s.
- Com bloqueador ou sem SDK, o jogo funciona igual, só sem anúncios.

## 4. Leve e otimizado
- JS puro, sem biblioteca, sem build.
- Som sintetizado (WebAudio), sem arquivos de áudio.
- Arte desenhada no canvas ou pixel art pequena.
- Loop de passo fixo (1/60 s). Resolução lógica 1280x720 escalada.
- Celular em pé suportado (tela mais alta, sem pedir para girar).
- Modo leve (`CONFIG.leve`; Opções > Gráficos: automático/altos/leves, `save.qualidade`): automático em aparelho de toque
  ou com pouca memória/poucos núcleos. Menos partículas (300) e a luta do fundo dos menus desenhada a 30 qps.
- Sprites de armas, cartas e efeitos são preparados logo no começo, em pedaços (evita engasgo no 1º uso).
- Teclado, toque e controle viram as mesmas ações (`js/entrada.js`).
- Save em localStorage dentro de try/catch.
- Meta: abrir em ~1 s.

## Pastas (manter organizado: cada arquivo na pasta do que ele faz)
```
index.html, estilo.css
js/
  nucleo/     config.js (ajustes), util.js (ferramentas), save.js (localStorage), main.js (tela e loop; carrega por último)
  poki/       poki.js (SDK e anúncios), eventos.js (Game Events)
  idiomas/    idiomas.js (t(), detecção, troca)  +  textos/xx.js (os 12 idiomas)
  sistemas/   audio.js (som sintetizado), entrada.js (teclado, toque, controle; 2 jogadores)
  interface/  telas.js (menu, escolha do modo, pausa, continuar; anúncios)
  jogo/
    dados/    armas.js (50 armas), cenarios.js (15 cenários), cartas.js (12 cartas + cores), skins.js (corpos e acessórios)
    progresso/ dados.js (missões, desafios, conquistas), progresso.js (moedas, contadores, prêmios)
    motor/    fisica.js, combate.js (tiros, explosões, itens), bot.js (IA), partida.js (rodadas, queda de braço)
    arte/     efeitos.js, skins.js, bolinhas.js, armas.js, cartas.js, cenarios.js, queda.js, bau.js (só desenho, canvas)
    desenho.js (junta a arte na ordem certa + HUD)
```
Ordem dos scripts no index.html: nucleo/config, nucleo/util, idiomas/idiomas, nucleo/save, poki/poki, poki/eventos,
sistemas/audio, sistemas/entrada, jogo/dados/*, jogo/arte/*, jogo/motor/* (fisica, combate, bot, partida), jogo/desenho,
interface/telas, nucleo/main.
Arquivo novo: colocar na pasta certa. Arte nunca mexe em regra de jogo; motor nunca desenha.

## O jogo atual: Crazy Balls Duel
- Duas bolinhas (cores sorteadas). Modos: contra o bot, 2 jogadores no mesmo aparelho, e a demo (bot x bot no fundo dos menus).
- Partida até 5 pontos (a 1ª partida da vida, contra o bot, vai até 3: `CONFIG.pontosPrimeira`). Rodada de 45 s num cenário diferente; últimos 10 s com dano em dobro.
  Se ninguém morrer: queda de braço (quem clicar mais vence; quem tem mais vida começa na frente).
- Os dois começam a rodada com a mesma arma sorteada; caixas de arma caem (1ª aos 1,5 s, depois a cada ~4 s);
  cartas de habilidade aparecem (1ª aos ~4 s).
- 1ª visita: cai direto numa partida contra o bot (sem tela de modo). "2 jogadores" tem o selo "mesmo aparelho · não é
  online" (no playtest acharam que era online) e, no celular, fica por último e menor.
- Plataformas finas (`fina: true`) deixam o tiro passar; nas grossas a linha da mira para e mostra um X vermelho,
  e o tiro que bate na parede faz som (só para o humano). Muitos mapas usam plataformas finas no meio.
- Mira assistida igual para jogador e bot. Sem sangue (acerto = faíscas; derrota = estouro em confete).
- Bot: simula a física para frente e escolhe o melhor movimento; só atira quando a simulação diz que acerta.
  O nível (save.nivelBot, começa em 0,06 = "nível 2") muda depois de cada partida pelo desempenho do jogador e, um pouco,
  a cada rodada (perdeu a rodada: bot -0,07; ganhou: +0,03). Bot fraco: bate mais fraco (M.multBot 0,7 no nível mais baixo),
  erra de propósito os primeiros tiros de cada rodada (tiros de aviso, como em BioShock) e não "caça" o jogador.
  Playtest v6: 70% perdiam a 1ª rodada e 76% saíam no meio da 1ª partida — o começo tem que ser vencível.
- Estado do bot que usa o relógio da rodada (M.t) é zerado a cada rodada nova (pensarBot); antes o bot ficava
  sem atirar no começo das rodadas seguintes.
- Bot avisa tiro pesado (bazuca, laser, sniper): balão "!" + linha vermelha tracejada por 0,2–0,55 s antes de atirar
  (só contra humano). Balões de reação: "!" no começo, "?!" quando apanha forte, "!!" com pouca vida, "♪" quando vence;
  gota de suor com pouca vida.
- Sensação de acerto (só para quem joga): micro-pausa no impacto (M.pausa, quadros), marcador de acerto na mira,
  COMBO xN (acertos em menos de 1,3 s) com som subindo de tom, tela vermelha ao levar dano e com pouca vida,
  K.O.! (e PERFEITO!) com câmera lenta e zoom, moedas voando do bot até o placar. b.humano marca quem é pessoa.
- Ajuda de mira para armas de arco (estilingue, granada...): se a pessoa mira entre a linha reta e a curva certa,
  o tiro sai na curva certa (o bot calcula a parábola; gente mira reto).
- Duração: luta de ~20 s por rodada bot x bot (CONFIG.multDano 0,85). Medir com a simulação ao mexer em dano.
- Game Events de diagnóstico nas 2 primeiras partidas: round/m1-r1... (start/complete/fail) e
  player/r1-tiros-* e r1-acertos-* (o jogador atira? acerta?).
- Anúncio comum: antes de cada partida (menos a 1ª e logo depois de um premiado) E entre as rodadas (pausa natural;
  o Poki decide se mostra; nas 2 primeiras partidas não pede entre as rodadas — no playtest, gente saía nessa hora). Premiados (opcionais): "Partida Lendária"
  (só armas raras para os dois), "Continuar" (perdeu para o bot: o bot perde o último ponto) e "Dobrar moedas" (menu).
- Plataformas: andares a cada <= 120 px (o pulo normal alcança ~143 px). Conferir com a simulação de alcance ao mudar mapa.
- Controles (PC): ESPAÇO pula (W também), mouse mira o tempo todo, CLIQUE ESQUERDO atira (F também); teclas trocáveis
  (save.teclas) e todos os textos mostram as teclas escolhidas. Toque: esquerda = analógico de andar; direita em cima = PULO,
  direita embaixo = analógico de mira/tiro. Controle: analógico direito mira. Bot também mira livre.
- Bot: decide atirar pela mira ideal (sem o ruído), tem "paciência" (3 s sem dano → fica impaciente: procura um ponto com
  linha de visão até o jogador, chega mais perto e atira mais), quase não pula à toa quando está parado.
- Bot: 5 personalidades sorteadas por partida (agressivo, atirador, saltitante, cauteloso, colecionador), aparece no HUD.
- gameplayStop no fim de cada rodada e gameplayStart quando a próxima começa (além de pausa, menus e anúncios).
- Progresso (js/jogo/progresso): moedas, 3 missões, 4 desafios da semana (skin exclusiva), 27 conquistas, 30 skins,
  XP/nível do jogador, baús (normal no fim da partida, de nível ao subir, lendário no 7º dia) e recompensa diária (7 dias).
- Fim da partida: tela de recompensa (interface/recompensa.js): XP, baú para abrir, "▶ abrir outro baú" (premiado) e REVANCHE.
- Modos: contra o bot, 2 jogadores, SOBREVIVÊNCIA (ondas de bots cada vez mais fortes; vida passa de uma onda para outra,
  +35 entre ondas; recorde em save.recordeOnda; "Continuar" premiado volta na mesma onda com vida cheia).
- Equilíbrio: `node` + simulação bot x bot (script fora do repositório) — medir % de rodadas na queda de braço (~10–35%)
  e duração da partida (2–3,5 min). `CONFIG.multDano` é o ajuste geral.

## Entrega para o Poki
- Zip com número de versão (ex.: `jogo-v1.zip`):
  `git archive --format=zip -o jogo-vX.zip HEAD index.html estilo.css js`
- Player Fit Test: média ≥ 3 min e ≥ 25% dos jogadores com mais de 3 min.
  - Meta do dono antes do Web Fit: 4m30–5m de média e ≥ 35% acima de 3 min.
