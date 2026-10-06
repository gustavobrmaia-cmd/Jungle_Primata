# Estrutura obrigatória (vale para todo jogo novo deste repositório)

Combinado com o dono do jogo. Qualquer versão nova TEM que manter isto:

## 1. Idiomas: 12
- pt + en + os 10 mais fortes no Poki: es, fr, de, it, nl, pl, tr, ru, ro, id.
- Um arquivo por idioma em `js/idiomas/xx.js` (`TEXTOS.xx = { chave: "texto" }`). Só baixa o escolhido + inglês (reserva).
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
  - Exceção: a primeira partida de quem acabou de chegar.
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
- Teclado, toque e controle viram as mesmas ações (`js/entrada.js`).
- Save em localStorage dentro de try/catch.
- Meta: abrir em ~1 s.

## Arquivos
`index.html`, `estilo.css`, `js/`. Ordem dos scripts: config, util, idiomas, save, poki, eventos, audio, entrada, jogo, telas, main.
O jogo em si fica em `js/jogo.js` (ou em mais arquivos carregados antes de telas.js). Ele usa:
- `novaPartida()`, `atualizarJogo(dt)`, `desenharJogo(ctx)`, `reviver()`;
- e chama `abrirFim()` quando acaba.

## Entrega para o Poki
- Zip com número de versão (ex.: `jogo-v1.zip`):
  `git archive --format=zip -o jogo-vX.zip HEAD index.html estilo.css js`
- Player Fit Test: média ≥ 3 min e ≥ 25% dos jogadores com mais de 3 min.
  - Meta do dono antes do Web Fit: 4m30–5m de média e ≥ 35% acima de 3 min.
