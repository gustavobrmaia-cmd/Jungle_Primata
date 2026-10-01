# Jogo do Primata

Abra o `index.html` no navegador. Mantenha a pasta `js/` e o `estilo.css` junto com ele.

O vento levou a banana do macaco! Atravesse 4 mundos (24 fases: 5 + o chefe em cada) para recuperá-la.
Cada fase libera um inimigo novo, um obstáculo novo e um cosmético de prêmio.
As fases ficam mais difíceis conforme você avança: ficam mais longas, os buracos ficam
maiores, aparecem mais inimigos e eles ficam mais rápidos.

## Controles

| Tecla | Ação |
| --- | --- |
| A / D ou setas | andar |
| W, ↑ ou Espaço | pular (segure para pular mais alto) |
| S ou ↓ | deslizar |
| K | revólver (R recarrega) |
| J | cipó-laço: agarra o inimigo, puxa e chuta pro espaço |
| Shift | dash (melhoria da loja) |
| 1 a 5 | usar poderes |
| L | loja · P / Esc pausa · M som |

Todas as teclas podem ser trocadas no menu **Controles**.

## Mundos

1. **Selva**: pule nos cipós para atravessar buracos grandes. Chefe: **Gorila Rei**
   (pulo que solta ondas de choque, cocos e investida que o deixa tonto).
2. **Deserto**: redemoinhos que levantam o macaco e areia movediça. Chefe: **Escorpião Faraó**
   (se enterra e sai debaixo de você, ferrão venenoso, tempestade de areia).
3. **Era do Gelo**: deslize (S) no gelo para passar em túneis e pular vãos enormes;
   cuidado com as estalactites. Chefe: **Yeti Ancestral** (bola de neve gigante, rugido que
   derruba estalactites, deslizada de barriga).
4. **Vulcão de Lava**: pule na rocha de magma para dar um impulso, desvie da lava e das
   plataformas que caem. Chefe: **Dragão de Magma** (sopro de fogo, chuva de meteoros, mergulho).

## XP e power-ups

Quase tudo dá XP (moedas, inimigos, checkpoints, fases e chefes). Cada nível dá moedas,
e os níveis 5, 10, 15 e 20 dão skins especiais. Power-ups aparecem nas fases de vez em
quando e ativam na hora (duram menos que os da loja).

## Loja

- **Skins, chapéus, óculos e roupas** para equipar no macaco.
- **Poderes** (temporários): você compra e usa um de cada vez; depois de usar, ele tem
  tempo de recarga. Super Velocidade, Pulo Duplo, Escudo, Ímã de Moedas e Nuke.
- **Melhorias** (permanentes, mais caras): Dash, Coração Extra I e II, Revólver Turbo e Cipó Longo.

Moedas, compras e progresso ficam salvos no navegador.

## Arquivos

- `js/dados.js`: configurações, mundos, inimigos, skins, roupas, poderes e preços.
  Para usar sua imagem do macaco, coloque o caminho em `IMAGEM_PERSONAGEM`: ela aparece
  como a skin "Original".
- `js/fases.js`: gerador das fases.
- `js/jogo.js`: física, jogador, inimigos e perigos.
- `js/obstaculos.js`: obstáculos novos e power-ups.
- `js/progresso.js`: XP, níveis, prêmios e transições.
- `js/chefes.js`: os chefes.
- `js/arte.js`: todos os desenhos em pixel art.
- `js/cenas.js`: abertura e final.
- `js/telas.js`: menu, mapa, pausa e loja.
