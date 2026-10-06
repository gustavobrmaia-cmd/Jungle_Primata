"use strict";

// =========================
// IDIOMAS
// O próprio texto em português é a chave: tr("Fase completa!") vira "Stage complete!" em inglês.
// {0}, {1}... são trocados pelos valores: tr("Próximo: {0}", nome).
// O inglês fica aqui (EN); os outros idiomas ficam em js/idiomas/*.js (TRADUCOES.xx).
// Texto que faltar num idioma cai no inglês.
// Sem escolha salva, segue o navegador (pt-BR -> português, fr-FR -> francês...); se o idioma do
// navegador não estiver na lista, inglês.
// =========================

const IDIOMAS = [
  { id: "pt", nome: "Português" },
  { id: "en", nome: "English" },
  { id: "es", nome: "Español" },
  { id: "fr", nome: "Français" },
  { id: "de", nome: "Deutsch" },
  { id: "it", nome: "Italiano" },
  { id: "nl", nome: "Nederlands" },
  { id: "pl", nome: "Polski" },
  { id: "tr", nome: "Türkçe" }
];

function idiomaValido(id) {
  return IDIOMAS.some(function(i) { return i.id === id; });
}

const IDIOMA = (function() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && idiomaValido(s.idioma)) return s.idioma;
  } catch (e) { /* sem save */ }
  const lista = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]);
  for (let i = 0; i < lista.length; i++) {
    const id = String(lista[i] || "").slice(0, 2).toLowerCase();
    if (idiomaValido(id)) return id;
  }
  return "en";
})();

const TRADUCOES = {};   // preenchido por js/idiomas/*.js (e o EN logo abaixo)

const EN = {
  // ---------- Mundos, chefes e fases ----------
  "Selva": "Jungle",
  "Deserto": "Desert",
  "Era do Gelo": "Ice Age",
  "Vulcão de Lava": "Lava Volcano",
  "Gorila Rei": "King Gorilla",
  "Escorpião Faraó": "Pharaoh Scorpion",
  "Yeti Ancestral": "Ancient Yeti",
  "Dragão de Magma": "Magma Dragon",
  "{0} - Chefe": "{0} - Boss",

  // ---------- Obstáculos ----------
  "Espinhos": "Spikes",
  "Cipós de balançar": "Swinging vines",
  "Cogumelo pula-pula": "Bouncy mushroom",
  "Troncos rolando": "Rolling logs",
  "Plantas carnívoras": "Carnivorous plants",
  "Areia movediça": "Quicksand",
  "Redemoinho": "Whirlwind",
  "Armadilha de dardos": "Dart trap",
  "Pedras rolando": "Rolling boulders",
  "Ventania de areia": "Sandstorm",
  "Túnel de gelo (deslize!)": "Ice tunnel (slide!)",
  "Estalactites": "Icicles",
  "Pista de gelo": "Ice track",
  "Gelo fino": "Thin ice",
  "Avalanche": "Avalanche",
  "Lago de lava": "Lava lake",
  "Rocha de impulso": "Launch rock",
  "Plataformas que caem": "Falling platforms",
  "Barra de fogo": "Fire bar",
  "Chuva de meteoros": "Meteor shower",

  // ---------- Inimigos ----------
  "Cobra": "Snake",
  "Abelha": "Bee",
  "Sapo": "Frog",
  "Macaco Ladrão": "Thief Monkey",
  "Aranha": "Spider",
  "Escorpião": "Scorpion",
  "Abutre": "Vulture",
  "Cacto Atirador": "Shooting Cactus",
  "Múmia": "Mummy",
  "Tatu-bola": "Armadillo",
  "Pinguim": "Penguin",
  "Morcego de Gelo": "Ice Bat",
  "Boneco de Neve": "Snowman",
  "Foca": "Seal",
  "Lobo do Gelo": "Ice Wolf",
  "Slime de Magma": "Magma Slime",
  "Morcego de Fogo": "Fire Bat",
  "Diabinho": "Imp",
  "Golem de Pedra": "Stone Golem",
  "Fênix": "Phoenix",

  // ---------- Dicas nas placas ----------
  "{esquerda}/{direita} andar   {pulo} pular\nSegure {pulo} para pular mais alto": "{esquerda}/{direita} walk   {pulo} jump\nHold {pulo} to jump higher",
  "Bem-vindo: {0}!": "Welcome to the {0}!",
  "Novo inimigo: {0}!": "New enemy: {0}!",
  "Novo inimigo: Cobra! Pule na cabeça dela!": "New enemy: Snake! Stomp on its head!",
  "Seu prêmio: cipó-laço! {laco}: puxa o inimigo": "Your prize: vine lasso! {laco}: pull enemies in",
  "Vença o Gorila Rei para ganhar o cipó-laço!": "Beat the Gorilla King to get the vine lasso!",
  "Você ganhou o cipó-laço!": "You got the vine lasso!",
  "Arraste para andar": "Drag to move",
  "{0}: puxa o inimigo e chuta pro espaço. Atrás da banana!": "{0}: pull enemies in and kick them into space. Chase the banana!",
  "+{0} moedas. Atrás da banana!": "+{0} coins. Chase the banana!",
  "Tutorial": "Tutorial",
  "Boa!": "Nice!",
  "Arraste o analógico para a direita": "Drag the stick to the right",
  "Ande para a direita: {0}": "Walk right: {0}",
  "Toque em PULO para pular o bloco": "Tap JUMP to hop over the block",
  "Pule o bloco: {0}": "Jump over the block: {0}",
  "Pule na cabeça da cobra!": "Jump on the snake's head!",
  "Pegue a banana!": "Grab the banana!",
  "Tutorial completo!": "Tutorial complete!",
  "ou": "or",
  "Agora é pra valer: atravesse os 4 mundos!": "Now for real: cross all 4 worlds!",
  "Toque para pular": "Tap to jump",
  "{0}: puxa o inimigo e chuta pro espaço. Pegue a banana!": "{0}: pull enemies in and kick them into space. Grab the banana!",
  "Novo: {0}!": "New: {0}!",
  "Pule por cima dos espinhos!": "Jump over the spikes!",
  "Pule no cipó para se agarrar!\n{pulo} solta": "Jump onto the vine to grab it!\n{pulo} lets go",
  "Pule no cogumelo para ir bem alto!": "Jump on the mushroom to go really high!",
  "Pule por cima deles!": "Jump over them!",
  "Passe quando a planta se esconder!": "Go when the plant hides!",
  "Pule rápido para não afundar!": "Jump quickly so you don't sink!",
  "Entre no redemoinho para subir!": "Step into the whirlwind to go up!",
  "Pule os dardos de baixo,\ndeslize ({baixo}) nos de cima!": "Jump over the low darts,\nslide ({baixo}) under the high ones!",
  "Elas são enormes: pule na hora certa!": "They're huge: time your jump!",
  "Espere o vento parar para pular!": "Wait for the wind to stop, then jump!",
  "Corra e segure {baixo} para deslizar!": "Run and hold {baixo} to slide!",
  "Não pare embaixo das estalactites!": "Don't stop under the icicles!",
  "Deslize ({baixo}) no gelo para pular longe!": "Slide ({baixo}) on the ice to jump far!",
  "O gelo fino quebra! Não fique parado": "Thin ice breaks! Keep moving",
  "Pule as bolas de neve!": "Jump over the snowballs!",
  "Lava queima! Pule por cima": "Lava burns! Jump over it",
  "Pule na rocha de magma: IMPULSO!": "Jump on the magma rock: BOOST!",
  "Essas plataformas despencam!": "These platforms fall!",
  "Passe quando a barra de fogo girar!": "Go when the fire bar swings away!",
  "Fuja das sombras vermelhas!": "Stay out of the red shadows!",
  "Pule na cabeça dela!": "Stomp on its head!",
  "Ela voa: pule nela ou passe por baixo!": "It flies: stomp on it or go under it!",
  "Ele pula atrás de você!": "It hops after you!",
  "Ele joga cocos!": "It throws coconuts!",
  "Ela desce quando você passa!": "It drops down when you pass!",
  "Pule na cabeça dele!": "Stomp on its head!",
  "Ele mergulha em você!": "It dives at you!",
  "Espinhoso: não pise, deslize nele!": "Spiky: don't stomp, slide into it!",
  "Lenta mas resistente!": "Slow but tough!",
  "Não pise quando ele rolar!": "Don't stomp on it while it rolls!",
  "Ele escorrega na sua direção!": "It slides toward you!",
  "Voa rápido!": "Flies fast!",
  "Joga bolas de neve!": "Throws snowballs!",
  "Pula atrás de você!": "Hops after you!",
  "Corre muito rápido!": "Runs really fast!",
  "Quente: não pise, deslize nele!": "Hot: don't stomp, slide into it!",
  "Voa muito rápido!": "Flies really fast!",
  "Atira bolas de fogo!": "Shoots fireballs!",
  "Pule na cabeça ou use o cipó-laço!": "Stomp on its head or use the vine lasso!",
  "Mergulha soltando fogo!": "Dives breathing fire!",

  // ---------- Skins ----------
  "Clássico": "Classic",
  "Dourado": "Golden",
  "Chiclete": "Bubblegum",
  "Gelo": "Ice",
  "Sombra": "Shadow",
  "Camuflado": "Camo",
  "Fogo": "Fire",
  "Dálmata": "Dalmatian",
  "Zumbi": "Zombie",
  "Robô": "Robot",
  "Esqueleto": "Skeleton",
  "Fantasma": "Ghost",
  "Diamante": "Diamond",
  "Galáxia": "Galaxy",
  "Arco-íris": "Rainbow",
  "Tigre": "Tiger",
  "Gorila": "Gorilla",
  "Camelo": "Camel",
  "Dragão": "Dragon",
  "Prata": "Silver",
  "Ouro": "Gold",
  "Lendário": "Legendary",

  // ---------- Chapéus, óculos e roupas ----------
  "Boné": "Cap",
  "Chapéu de Festa": "Party Hat",
  "Gorro": "Beanie",
  "Chapéu de Cowboy": "Cowboy Hat",
  "Cartola": "Top Hat",
  "Chapéu de Chef": "Chef Hat",
  "Capacete Viking": "Viking Helmet",
  "Auréola": "Halo",
  "Coroa": "Crown",
  "Folha": "Leaf",
  "Chapéu de Explorador": "Explorer Hat",
  "Turbante": "Turban",
  "Coroa de Faraó": "Pharaoh Crown",
  "Protetor de Orelha": "Earmuffs",
  "Chapéu de Pele": "Fur Hat",
  "Capacete de Bombeiro": "Firefighter Helmet",
  "Chifres de Demônio": "Devil Horns",
  "Óculos Escuros": "Sunglasses",
  "Óculos 3D": "3D Glasses",
  "Óculos de Nerd": "Nerd Glasses",
  "Máscara": "Mask",
  "Óculos de Coração": "Heart Glasses",
  "Monóculo": "Monocle",
  "Visor Cyber": "Cyber Visor",
  "Pintura de Guerra": "War Paint",
  "Óculos de Aviador": "Aviator Glasses",
  "Óculos de Esqui": "Ski Goggles",
  "Óculos de Solda": "Welding Goggles",
  "Gravata": "Tie",
  "Camiseta": "T-shirt",
  "Cachecol": "Scarf",
  "Macacão": "Overalls",
  "Colete Salva-vidas": "Life Vest",
  "Smoking": "Tuxedo",
  "Capa de Herói": "Hero Cape",
  "Armadura": "Armor",
  "Colar de Flores": "Flower Necklace",
  "Lenço de Bandido": "Bandit Bandana",
  "Faixas de Múmia": "Mummy Wraps",
  "Jaqueta de Neve": "Snow Jacket",
  "Capa de Fogo": "Fire Cape",

  // ---------- Poderes e melhorias ----------
  "Super Velocidade": "Super Speed",
  "+60% de velocidade por 10s": "+60% speed for 10s",
  "Pulo Duplo": "Double Jump",
  "Pula de novo no ar por 15s": "Jump again in midair for 15s",
  "Escudo": "Shield",
  "Invencível por 8s": "Invincible for 8s",
  "Ímã de Moedas": "Coin Magnet",
  "Puxa as moedas por 15s": "Pulls in coins for 15s",
  "Explode os inimigos perto": "Blows up nearby enemies",
  "Dispara pra frente e atravessa inimigos": "Bursts forward through enemies",
  "Coração Extra": "Extra Heart",
  "Coração Extra II": "Extra Heart II",
  "+1 coração de vida": "+1 heart",
  "Revólver Turbo": "Turbo Revolver",
  "8 balas, tiro e recarga mais rápidos": "8 bullets, faster shooting and reloading",
  "Cipó Longo": "Long Vine",
  "O laço de cipó alcança mais longe": "The vine lasso reaches farther",

  // ---------- Abas da loja ----------
  "Chapéus": "Hats",
  "Óculos": "Glasses",
  "Roupas": "Outfits",
  "Poderes": "Powers",
  "Melhorias": "Upgrades",

  // ---------- Controles ----------
  "Andar para a esquerda": "Walk left",
  "Andar para a direita": "Walk right",
  "Pular": "Jump",
  "Deslizar / soltar do cipó": "Slide / let go of the vine",
  "Revólver": "Revolver",
  "Recarregar": "Reload",
  "Cipó-laço": "Vine lasso",
  "Poder: Super Velocidade": "Power: Super Speed",
  "Poder: Pulo Duplo": "Power: Double Jump",
  "Poder: Escudo": "Power: Shield",
  "Poder: Ímã de Moedas": "Power: Coin Magnet",
  "Poder: Nuke": "Power: Nuke",
  "Loja": "Shop",
  "Pausa": "Pause",
  "Ligar/desligar som": "Sound on/off",
  "Espaço": "Space",
  "Apagar": "Backspace",
  "andar": "walk",
  "pular (segure: mais alto)": "jump (hold: higher)",
  "deslizar": "slide",
  "revólver": "revolver",
  "recarregar": "reload",
  "cipó-laço (puxa o inimigo e chuta pro espaço!)": "vine lasso (pull the enemy in and kick it into space!)",
  "dash (melhoria)": "dash (upgrade)",
  "poderes": "powers",
  "loja": "shop",
  "pausa": "pause",
  "Ação": "Action",
  "Tecla 1": "Key 1",
  "Tecla 2": "Key 2",
  "Tecla 3": "Key 3",
  "aperte...": "press...",
  "trocar poder": "switch power",
  "Saru": "Saru",
  "Saru Gigante": "Giant Saru",
  "Nível {0}+: um macaco lendário pode aparecer 1 vez por dia": "Level {0}+: a legendary monkey may show up once a day",
  "Você venceu o Saru hoje! Ele pode voltar amanhã.": "You beat Saru today! He may be back tomorrow.",
  "Volte amanhã: o Saru pode aparecer": "Come back tomorrow: Saru may show up",
  "O Saru apareceu! Enfrentar ({0})": "Saru is here! Fight ({0})",
  "O Saru Nv {1} apareceu! Enfrentar ({0})": "Saru Lv {1} is here! Fight ({0})",
  "Nv {0}": "Lv {0}",
  "Nível {0}: mais vida, mais rápido e furioso mais cedo": "Level {0}: more health, faster and enraged sooner",
  "Você venceu o Saru hoje! Ele pode voltar amanhã, mais forte.": "You beat Saru today! He may be back tomorrow, stronger.",
  "Saru: +3 tentativas (anúncio)": "Saru: +3 tries (watch ad)",
  "Sem tentativas contra o Saru hoje. Volte amanhã!": "No tries left against Saru today. Come back tomorrow!",
  "O Saru venceu!": "Saru won!",
  "Tentativas restantes: {0}": "Tries left: {0}",
  "Nova skin: Saru  ·  Nova melhoria: Nuvem Mágica  ·  +{0} moedas": "New skin: Saru  ·  New upgrade: Magic Cloud  ·  +{0} coins",
  "Saru derrotado!": "Saru defeated!",
  "A lua cheia nasceu...": "The full moon is rising...",
  "Fase {0}/2": "Phase {0}/2",
  "O macaco lendário! Tentativas restantes: {0}": "The legendary monkey! Tries left: {0}",
  "Nuvem Mágica!": "Magic Cloud!",
  "Nuvem Mágica": "Magic Cloud",
  "Uma vez por fase, se cair num buraco, a nuvem te salva sem perder vida": "Once per stage, if you fall in a pit, the cloud saves you without losing a life",
  "Derrote o Saru": "Defeat Saru",
  "Volte amanhã: ele pode aparecer de novo.": "Come back tomorrow: he may show up again.",
  "Tentar de novo (Enter)": "Try again (Enter)",
  "Assistir anúncio: +3 tentativas": "Watch ad: +3 tries",
  "Voltar ao menu (Esc)": "Back to menu (Esc)",
  "Opções": "Options",
  "Idioma": "Language",
  "Adicionais": "Extras",
  "Escolha o idioma do jogo.": "Choose the game language.",
  "O cronômetro mostra o tempo da run e de cada fase, com os seus recordes.": "The timer shows your run and stage times, with your records.",
  "Assistir anúncio: +{0} moedas": "Watch ad: +{0} coins",
  "Grátis (anúncio)": "Free (watch ad)",
  "+{0} moedas!": "+{0} coins!",
  "+1 {0}!": "+1 {0}!",
  "O anúncio não terminou, nada ganho.": "The ad didn't finish, no reward.",
  "Moedas grátis": "Free coins",
  "Completa": "Complete",
  "Sem perder vida": "No lives lost",
  "Até {0}": "Under {0}",
  "NOVA!": "NEW!",
  "Tempo {0}": "Time {0}",
  "Recorde {0}": "Record {0}",
  "Estrelas: {0}/{1}": "Stars: {0}/{1}",
  "Modo speedrun liberado! O cronômetro foi ligado.": "Speedrun mode unlocked! The timer is now on.",
  "Zerado! Jogar = nova run": "Beaten! Play = new run",
  "PULO": "JUMP",
  "TIRO": "SHOOT",
  "LAÇO": "LASSO",
  "LOJA": "SHOP",
  "PAUSA": "PAUSE",
  "arraste do lado esquerdo: andar e deslizar": "drag on the left side: walk and slide",
  "toque nos poderes para usar": "tap a power to use it",
  "Toque na tela para começar": "Tap the screen to start",
  "Toque na tela para voltar ao menu": "Tap the screen to return to the menu",
  "usar poder": "use power",

  // ---------- Menus ----------
  "Jogo zerado!": "Game beaten!",
  "Próxima: {0}": "Next: {0}",
  " · Recorde: {0}": " · Record: {0}",
  "Som: ligado ({0})": "Sound: on ({0})",
  "Som: desligado ({0})": "Sound: off ({0})",
  "Cronômetro: ligado": "Timer: on",
  "Cronômetro: desligado": "Timer: off",
  "Idioma: Português": "Language: English",
  "Chefe": "Boss",
  "Chefe: ": "Boss: ",
  "Prêmio": "Prize",
  "Épico": "Epic",
  "Raro": "Rare",
  "Comum": "Common",
  "{0}. Tecla {1}.": "{0}. Key {1}.",
  "Você tem: {0}": "You have: {0}",
  "Comprar": "Buy",
  "Faltam {0}": "Need {0} more",
  "{0} (permanente)": "{0} (permanent)",
  "Comprado": "Purchased",
  "Precisa: {0}": "Requires: {0}",
  "Equipado": "Equipped",
  "Seu": "Owned",
  "Passe a fase {0}": "Beat {0}",
  "Chegue ao nível {0}": "Reach level {0}",
  "Bloqueado": "Locked",
  "Tirar": "Remove",
  "Equipar": "Equip",

  // ---------- Durante o jogo ----------
  "-1 vida": "-1 life",
  "recarregando": "reloading",
  "Você perdeu!": "You lost!",
  "Voltando do checkpoint...": "Back to the checkpoint...",
  "Tentando de novo...": "Trying again...",
  "Fase completa!": "Stage complete!",
  "{0} completo!": "{0} complete!",
  "A banana escapou de novo! Próximo: {0}": "The banana got away again! Next: {0}",
  "Você ganhou: {0}!  Próximo: {1}": "You got: {0}!  Next: {1}",
  "Chefe derrotado!": "Boss defeated!",
  "+{0} moedas. Pegue a banana!": "+{0} coins. Grab the banana!",
  "Reviveu!": "Revived!",
  "+{0} moedas": "+{0} coins",
  "  ·  Nova skin: {0}!": "  ·  New skin: {0}!",
  "NÍVEL {0}!": "LEVEL {0}!",
  "Nv {0}": "Lv {0}",
  "{0} - o chefe do mundo": "{0} - the world boss",
  "Novo inimigo: {0}": "New enemy: {0}",
  "Novo obstáculo: {0}": "New obstacle: {0}",
  "Prêmio ao terminar: {0}": "Prize for finishing: {0}",

  // ---------- Cronômetro ----------
  "FASE": "STAGE",
  "Recorde da fase": "Stage record",
  "Primeiro tempo!": "First time!",
  "{0}  Recorde!": "{0}  Record!",
  "  (primeira run!)": "  (first run!)",
  "  NOVO RECORDE! ({0})": "  NEW RECORD! ({0})",
  "  (recorde: {0})": "  (record: {0})",

  // ---------- Abertura e final ----------
  "O vento levou a banana!": "The wind took the banana!",
  "Atravesse a Selva, o Deserto, a Era do Gelo e o Vulcão para recuperá-la!": "Cross the Jungle, the Desert, the Ice Age and the Volcano to get it back!",
  "Dizem que ela foi parar nas garras do Dragão de Magma...": "Rumor has it the Magma Dragon is keeping it...",
  "Clique ou aperte qualquer tecla para começar": "Click or press any key to start",
  "Nham!": "Nom!",
  "FIM!": "THE END!",
  "O primata derrotou o Dragão de Magma e finalmente comeu a sua banana!": "The primate beat the Magma Dragon and finally ate the banana!",
  "Nível {0}   ·   Moedas: {1}": "Level {0}   ·   Coins: {1}",
  "Inimigos derrotados: {0}   ·   Chutados pro espaço: {1}": "Enemies defeated: {0}   ·   Kicked into space: {1}",
  "Chefes derrotados: {0}   ·   Quedas: {1}": "Bosses defeated: {0}   ·   Falls: {1}",
  "Tempo de jogo: {0}": "Play time: {0}",
  "Nova skin: {0}!": "New skin: {0}!",
  "Clique ou aperte qualquer tecla para voltar ao menu": "Click or press any key to return to the menu",

  // ---------- Telas (index.html) ----------
  "PAUSA (P)": "PAUSE (P)",
  "LOJA (L)": "SHOP (L)",
  "A grande caçada à banana": "The great banana hunt",
  "moedas": "coins",
  "Fase": "Stage",
  "Nível": "Level",
  "Jogar (Enter)": "Play (Enter)",
  "Escolher fase": "Select stage",
  "Controles": "Controls",
  "Escolha a fase": "Choose a stage",
  "Voltar": "Back",
  "Pausado": "Paused",
  "Continuar (P)": "Resume (P)",
  "Loja (L)": "Shop (L)",
  "Recomeçar fase": "Restart stage",
  "Som": "Sound",
  "Cronômetro": "Timer",
  "Menu principal": "Main menu",
  "Assista um anúncio para continuar daqui com todas as vidas.": "Watch an ad to keep going from here with full lives.",
  "Assistir e reviver (Enter)": "Watch and revive (Enter)",
  "Voltar do checkpoint (Esc)": "Back to checkpoint (Esc)",
  "Clique numa tecla e aperte a nova.": "Click a key, then press the new one.",
  "apaga.": "clears it.",
  "volta.": "goes back.",
  "Restaurar padrão": "Restore defaults",
  "Loja do Primata": "Primate Shop",
  "L ou Esc para voltar": "L or Esc to go back",
  "{0} ou Esc para voltar": "{0} or Esc to go back",
  "Continuar": "Resume"
};

TRADUCOES.en = EN;

// Texto já traduzido (sem trocar {0}...): o do idioma, senão o inglês, senão o próprio português
function traduzido(texto) {
  if (IDIOMA === "pt") return texto;
  const d = TRADUCOES[IDIOMA];
  if (d && Object.prototype.hasOwnProperty.call(d, texto)) return d[texto];
  if (Object.prototype.hasOwnProperty.call(EN, texto)) return EN[texto];
  return texto;
}

function tr(texto) {
  let t = traduzido(texto);
  for (let i = 1; i < arguments.length; i++) t = t.split("{" + (i - 1) + "}").join(arguments[i]);
  return t;
}

// Nomes e descrições das listas de dados.js (chamado no fim de dados.js)
function traduzirDados() {
  if (IDIOMA === "pt") return;
  const campo = function(lista, nome) {
    lista.forEach(function(o) { if (o[nome]) o[nome] = tr(o[nome]); });
  };
  campo(MUNDOS, "nome");
  campo(MUNDOS, "nomeChefe");
  campo(Object.keys(TIPOS_INIMIGO).map(function(k) { return TIPOS_INIMIGO[k]; }), "nome");
  Object.keys(NOMES_OBSTACULO).forEach(function(k) { NOMES_OBSTACULO[k] = tr(NOMES_OBSTACULO[k]); });
  campo(SKINS, "nome");
  campo(ITENS, "nome");
  campo(PODERES, "nome");
  campo(PODERES, "desc");
  campo(MELHORIAS, "nome");
  campo(MELHORIAS, "desc");
  campo(ABAS, "nome");
  campo(ACOES, "nome");
}

// Textos fixos do index.html (botões, títulos das telas)
function traduzirDom() {
  document.documentElement.lang = IDIOMA === "pt" ? "pt-BR" : IDIOMA;
  if (IDIOMA === "pt") return;
  const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nos = [];
  while (andar.nextNode()) nos.push(andar.currentNode);
  nos.forEach(function(n) {
    const t = n.nodeValue.trim();
    if (!t) return;
    const novo = traduzido(t);
    if (novo !== t) n.nodeValue = n.nodeValue.replace(t, novo);
  });
}

function trocarIdioma(id) {
  if (!idiomaValido(id) || id === IDIOMA) return;
  save.idioma = id;
  salvar();
  try { sessionStorage.setItem("primata-abrir-idioma", "1"); } catch (e) { /* sem sessionStorage */ }
  location.reload();
}
