# Jogo do Primata

Abra o `index.html` no navegador. Mantenha as pastas `js/` e `fontes/` e o `estilo.css` junto com ele.
Desenhos, sons e a fonte vêm desta pasta. A única coisa da internet é o SDK de anúncios do Poki
(`USAR_POKI` em `js/dados.js`); sem ele o jogo funciona igual, só sem anúncios.

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
| J ou K | cipó-laço (prêmio do Gorila Rei): agarra o inimigo, puxa e chuta pro espaço |
| Shift | dash (melhoria da loja) |
| 1 a 5 | usar poderes |
| L | loja · P / Esc pausa · M som |

Todas as teclas podem ser trocadas em **Opções → Controles**. Em **Opções** também ficam o
idioma e os adicionais (cronômetro e som).

**Controle (Xbox / PlayStation):** analógico ou direcional anda, **A** pula,
**X** ou **Y** cipó-laço, **B** ou **RB** dash, **LT** troca o poder escolhido e
**RT** usa, **Start** pausa, **Back/Select** abre a loja. Nos menus o direcional escolhe,
**A** confirma e **B** volta. Quando você usa o controle, as placas mostram os botões dele.

**Celular / tablet (toque):** o analógico fica fixo no canto esquerdo: incline para andar e puxe
um pouco para baixo para deslizar (na diagonal corre e desliza). Do lado direito ficam os botões
coloridos **PULO** (grande, segure para pular mais alto), **LAÇO** (depois do Gorila Rei, com anel de
recarga) e **DASH** (se comprado). Na primeira fase, dicas piscando mostram onde arrastar e tocar.
Toque num poder no canto de baixo para usar. Com o celular em pé, o jogo pede para girar.

**Sem armas:** os inimigos se vencem pulando na cabeça (ou deslizando nos espinhosos). O
**cipó-laço** é o prêmio do **Gorila Rei** (chefe da Selva) e recarrega em ~1,7 s.

## Idioma

Português ou inglês. Sem escolher, segue o idioma do navegador (português para `pt`,
inglês para o resto). Dá para trocar em **Controles → Idioma**. Os textos em inglês ficam em
`js/idioma.js`: o texto em português é a chave e o inglês é o valor.

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
- **Melhorias** (permanentes, mais caras): Dash, Coração Extra I e II e Cipó Longo.

Moedas, compras e progresso ficam salvos no navegador.

## Saru (chefe secreto do dia)

A partir do **nível 15**, na primeira vez que você abre o jogo no dia, há uma chance (40%) do
**Saru** aparecer: um macaco lutador de cabelo espetado e quimono laranja. O menu avisa
discretamente embaixo das moedas e do nível.
- Cada aparição dá **3 tentativas**. Acabou? Um anúncio premiado dá mais 3 (uma vez por dia).
- **1ª barra de vida (Saru):** some e reaparece atrás de você com uma voadora, junta energia e solta
  uma rajada que atravessa a arena (pule), voa numa nuvem soltando esferas de energia e estica o bastão.
  Furioso, emenda duas voadoras. Dois pisões seguidos na cabeça dele e ele some e contra-ataca.
- Quando ela esvazia, cai a noite, nasce a **lua cheia** e ele vira o **Saru Gigante** (2ª barra):
  raio pela boca que vai explodindo o chão (pule), pisão com chuva de pedras, palmas com ondas de
  choque (a alta você passa deslizando, a baixa pulando), rugido com ondas de som na altura da
  cabeça dele (fique no chão) e varrida rente ao chão que o deixa tonto.
  As plataformas da arena ajudam a pular na cabeça dele, mas quem fica em cima dele leva um
  **tapa por cima** (aparece um "!" e uma área vermelha: saia de cima).
- **Fica mais forte a cada vitória** (até o Nv 6): mais vida, ataca mais cedo, golpes mais rápidos,
  mais pedras e esferas, e fica furioso mais cedo (no Nv 6 já começa furioso, com aura roxa).
  Cada nível rende +100 moedas e +100 XP. A primeira luta é sempre a mais fácil.
- Vencer dá **300 moedas** (+100 por nível); na primeira vitória também a skin **Saru** e a melhoria
  **Nuvem Mágica** (uma vez por fase, se cair num buraco, a nuvem te salva sem perder vida).

## Estrelas

Cada fase tem 3 estrelas: **terminar**, **terminar sem perder nenhuma vida** e **terminar
dentro da meta de tempo** (mostrada no fim da fase). Cada estrela nova vale 30 moedas. As
estrelas aparecem no mapa e o total fica no menu (72 no máximo).

## Cronômetro de speedrun

Liga sozinho na primeira vez que você zera (e dá para ligar/desligar em **Pausa** ou **Controles**) ("Cronômetro: ligado"). Mostra no canto da tela:

- **Total**: o tempo da run, que começa ao entrar na Selva 1-1 e para quando o Dragão de Magma cai.
- **Fase**: o tempo da fase atual (morrer não zera) e o recorde dela.
- Ao terminar uma fase aparece a diferença para o recorde (ex.: `-1.20  Recorde!`).

Só conta o tempo jogando: pausa, loja, abertura e final não contam. Voltar ao menu cancela a run.
Depois de zerar, **Jogar** começa uma run nova na Selva 1-1.

## Publicar (Poki, itch.io, GitHub Pages)

- **Sem links do seu computador:** em `js/dados.js`, `IMAGEM_PERSONAGEM` e `FUNDO_SELVA_URL`
  ficam vazios (`""`), assim o jogo usa só a arte própria em pixel art.
- **GitHub Pages:** o repositório precisa ser público (no plano grátis). Depois, em
  *Settings → Pages*, escolha *Deploy from a branch*, `main` e `/ (root)`. O link fica
  `https://<usuario>.github.io/jogo-do-primata/`.
- **Netlify Drop** (funciona com repositório privado): abra `app.netlify.com/drop` e arraste a
  pasta do jogo.
- **Poki:** `USAR_POKI` em `js/dados.js` já está `true`. O jogo carrega o SDK do Poki, avisa
  quando a gameplay começa e para, mostra um intervalo comercial entre as fases e ao recomeçar,
  e quando o macaco perde todas as vidas oferece "assista um anúncio para reviver" (volta no
  último chão seguro com as vidas cheias, uma vez por tentativa). Durante o anúncio o jogo fica
  parado e mudo. Com `false` nada disso carrega (use `false` no itch.io).
  Na loja aparecem dois prêmios opcionais por anúncio: **moedas grátis** (cresce com o nível)
  e **um poder grátis**. Eles só aparecem quando o SDK do Poki carregou e não há bloqueador.
  Há também um intervalo comercial ao sair do menu para jogar (o Poki decide se mostra).

## Arquivos

- `js/dados.js`: configurações, mundos, inimigos, skins, roupas, poderes e preços.
  Para usar sua imagem do macaco, coloque o caminho em `IMAGEM_PERSONAGEM`: ela aparece
  como a skin "Original" (só no seu PC; deixe vazio para publicar).
- `js/fases.js`: gerador das fases.
- `js/jogo.js`: física, jogador, inimigos e perigos.
- `js/obstaculos.js`: obstáculos novos e power-ups.
- `js/progresso.js`: XP, níveis, prêmios e transições.
- `js/chefes.js`: os chefes.
- `js/arte.js`: todos os desenhos em pixel art.
- `js/cenas.js`: abertura e final.
- `js/cronometro.js`: cronômetro de speedrun e recordes.
- `js/estrelas.js`: as 3 estrelas de cada fase.
- `js/reimacaco.js` e `js/arte_rei.js`: o chefe secreto do dia (lógica e desenhos).
- `js/telas.js`: menu, mapa, pausa e loja.
- `js/idioma.js`: textos em inglês e troca de idioma.
- `js/anuncios.js`: SDK do Poki (intervalo e anúncio premiado para reviver).
- `js/controle.js`: suporte a controle (gamepad).
- `js/toque.js`: controles de toque para celular e tablet.
- `fontes/`: fonte Pixelify Sans (licença SIL OFL em `fontes/OFL.txt`).
