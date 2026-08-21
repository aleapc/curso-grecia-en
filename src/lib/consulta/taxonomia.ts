import type { Folha, Tile } from './tipos';

// TAXONOMIA DO MODO CONSULTA
//
// O turista chega com uma de duas consultas: "estou em X" (sabe onde o corpo está,
// em zero segundo) ou "acabou de acontecer Y" (cauda longa, infinita). A segunda
// NÃO é enumerável, e é por onde a deriva defensiva entra: se cada lugar ganhar um
// galho "quando dá errado", o índice reproduz os 46% de moldura de perda que o
// curso levou meses para tirar.
//
// Por isso: nível 1 = LUGAR (12 fixos) · nível 2 = INTENÇÃO, na ordem do arco da
// cena, com "algo deu errado" como UMA FOLHA no fim — nunca um galho. O reativo
// puro fica num único tile de doze (8%).
//
// POR QUE DOZE, e a razão é física: 375×812, header ~90 px, safe-area ~80 px →
// ~640 px úteis. Tile legível a braço estendido sob sol = 92 px + 10 px de gap =
// 102 px por linha. Seis linhas × duas colunas = 12 tiles, tela cheia, zero
// rolagem. Três colunas dariam 15 a 18, mas o rótulo cai para ~110 px de largura
// e "Chemist & feeling rough" não cabe.
//
// NÍVEL 1 É IDÊNTICO EM TODO SKU — memória muscular entre destinos, e é o que faz
// quem comprou o da Espanha reconhecer o da Itália no primeiro toque. NÍVEL 2 é
// local (tapa vs ración só aqui; os cinco tons só no Phûut!).
//
// A ORDEM DOS 12 TILES É FIXA PARA SEMPRE DEPOIS DO LANÇAMENTO. Quem decorou que
// "pagar" é o quarto não pode ser realfabetizado por uma refatoração.

export const TILES: Tile[] = [
  { id: 'chegar', ordem: 1, rotulo: 'Hello & goodbye', icone: 'porta' },
  { id: 'mesa', ordem: 2, rotulo: 'Bar & restaurant', icone: 'garfo' },
  { id: 'dieta', ordem: 3, rotulo: "Can't eat it", icone: 'escudo' },
  { id: 'pagar', ordem: 4, rotulo: 'Paying', icone: 'cartao' },
  { id: 'taxi', ordem: 5, rotulo: 'Taxi & car', icone: 'carro' },
  { id: 'transporte', ordem: 6, rotulo: 'Metro & trains', icone: 'trilho' },
  { id: 'quarto', ordem: 7, rotulo: 'Hotel & room', icone: 'cama' },
  { id: 'compras', ordem: 8, rotulo: 'Shops & market', icone: 'sacola' },
  { id: 'saude', ordem: 9, rotulo: 'Chemist & feeling rough', icone: 'cruz' },
  { id: 'simpatia', ordem: 10, rotulo: 'Nice things to say', icone: 'brinde' },
  { id: 'reparo', ordem: 11, rotulo: "Didn't catch that", icone: 'ouvido' },
  { id: 'apuro', ordem: 12, rotulo: 'It went wrong', icone: 'alerta' }
];

// Nível 2 — LOCAL da Espanha. `reativa: true` marca a folha de "deu errado":
// sempre a última do tile, e contada pelo G8 (teto de 15% dos cards no curso).
export const FOLHAS: Folha[] = [
  // 1 · chegar
  { id: 'chegar/entrar', tile: 'chegar', rotulo: 'Walking in' },
  { id: 'chegar/balcao', tile: 'chegar', rotulo: 'Getting served at the bar' },
  { id: 'chegar/ultimo', tile: 'chegar', rotulo: '"Who\'s last?"' },
  { id: 'chegar/sair', tile: 'chegar', rotulo: 'Leaving' },
  { id: 'chegar/tu-usted', tile: 'chegar', rotulo: 'Formal or casual, in one line' },

  // 2 · mesa
  { id: 'mesa/mesa', tile: 'mesa', rotulo: 'A table' },
  { id: 'mesa/carta', tile: 'mesa', rotulo: 'The menu' },
  { id: 'mesa/bebida', tile: 'mesa', rotulo: 'A drink' },
  { id: 'mesa/comida', tile: 'mesa', rotulo: 'Food' },
  { id: 'mesa/tamanho', tile: 'mesa', rotulo: 'Small plate, full plate or half portion' },
  { id: 'mesa/agua-pao', tile: 'mesa', rotulo: 'Water & bread' },
  { id: 'mesa/conta', tile: 'mesa', rotulo: 'The bill' },
  { id: 'mesa/errado', tile: 'mesa', rotulo: "That's not what I ordered", reativa: true },

  // 3 · dieta
  { id: 'dieta/dizer', tile: 'dieta', rotulo: 'Say it (the three-step ladder)' },
  { id: 'dieta/cartao', tile: 'dieta', rotulo: 'Show the card' },
  { id: 'dieta/o-que-tem', tile: 'dieta', rotulo: "What's in it?" },
  { id: 'dieta/sem', tile: 'dieta', rotulo: 'No meat / no pork / no gluten' },
  { id: 'dieta/nao-levam-a-serio', tile: 'dieta', rotulo: "They're not taking it seriously", reativa: true },
  { id: 'dieta/acontecendo', tile: 'dieta', rotulo: "It's happening", reativa: true },

  // 4 · pagar
  { id: 'pagar/pedir', tile: 'pagar', rotulo: 'Ask for the bill' },
  { id: 'pagar/cartao', tile: 'pagar', rotulo: 'Card — and "in local currency"' },
  { id: 'pagar/dinheiro', tile: 'pagar', rotulo: 'Cash & the fifty' },
  { id: 'pagar/gorjeta', tile: 'pagar', rotulo: 'Tipping' },
  { id: 'pagar/rachar', tile: 'pagar', rotulo: 'Splitting' },
  { id: 'pagar/errado', tile: 'pagar', rotulo: 'Wrong bill or wrong change', reativa: true },

  // 5 · taxi
  { id: 'taxi/destino', tile: 'taxi', rotulo: 'Say where' },
  { id: 'taxi/taximetro', tile: 'taxi', rotulo: 'The meter & the price' },
  { id: 'taxi/parar', tile: 'taxi', rotulo: 'Stop here / receipt' },
  { id: 'taxi/locadora', tile: 'taxi', rotulo: 'The hire car counter' },
  { id: 'taxi/estacionar', tile: 'taxi', rotulo: 'Parking & low-emission zone cameras' },
  { id: 'taxi/errado', tile: 'taxi', rotulo: 'No card / wrong way', reativa: true },

  // 6 · transporte
  { id: 'transporte/bilhete', tile: 'transporte', rotulo: 'The right ticket' },
  { id: 'transporte/qual-trem', tile: 'transporte', rotulo: 'Which train — metro, regional or intercity' },
  { id: 'transporte/plataforma', tile: 'transporte', rotulo: 'Platform & gate' },
  { id: 'transporte/bagagem', tile: 'transporte', rotulo: 'Bags & the scanner' },
  { id: 'transporte/placas', tile: 'transporte', rotulo: 'Signs that cost money' },
  { id: 'transporte/perdi', tile: 'transporte', rotulo: 'I missed it', reativa: true },

  // 7 · quarto
  { id: 'quarto/checkin', tile: 'quarto', rotulo: 'Check-in' },
  { id: 'quarto/pedir', tile: 'quarto', rotulo: 'Ask for something' },
  { id: 'quarto/nao-funciona', tile: 'quarto', rotulo: '"It\'s not working"' },
  { id: 'quarto/mala', tile: 'quarto', rotulo: 'Leave the bag' },
  { id: 'quarto/checkout', tile: 'quarto', rotulo: 'Check-out & the tourist tax' },

  // 8 · compras
  { id: 'compras/balcao', tile: 'compras', rotulo: 'At the counter' },
  { id: 'compras/quanto', tile: 'compras', rotulo: 'How much / what size' },
  { id: 'compras/so-olhando', tile: 'compras', rotulo: 'Just looking' },
  { id: 'compras/pagar', tile: 'compras', rotulo: 'Paying & the receipt' },
  { id: 'compras/devolver', tile: 'compras', rotulo: 'Taking it back', reativa: true },

  // 9 · saude
  { id: 'saude/algo-para', tile: 'saude', rotulo: '"Something for…"' },
  { id: 'saude/receita', tile: 'saude', rotulo: 'With or without a prescription' },
  { id: 'saude/minha-alergia', tile: 'saude', rotulo: 'My allergy, my medicine' },
  { id: 'saude/guardia', tile: 'saude', rotulo: 'The 24-hour pharmacy' },
  { id: 'saude/112', tile: 'saude', rotulo: 'Emergency number & the hospital', reativa: true },

  // 10 · simpatia — a folha que o G8 protege com um piso de 8 cards.
  // É onde a viagem fica boa, e é exatamente a que a deriva defensiva esvazia:
  // nas 252 frases-alvo do curso antigo, a ÚNICA fala de apreciação que o aluno
  // produzia era «¿Qué me recomienda?».
  { id: 'simpatia/elogiar-comida', tile: 'simpatia', rotulo: 'Praise the food' },
  { id: 'simpatia/elogiar-lugar', tile: 'simpatia', rotulo: 'Praise the place' },
  { id: 'simpatia/agradecer', tile: 'simpatia', rotulo: 'Thanks & goodbye' },
  { id: 'simpatia/brindar', tile: 'simpatia', rotulo: 'Make a toast' },
  { id: 'simpatia/puxar-conversa', tile: 'simpatia', rotulo: 'Start a conversation' },
  { id: 'simpatia/convite', tile: 'simpatia', rotulo: 'Accept or decline an invitation' },

  // 11 · reparo
  { id: 'reparo/devagar', tile: 'reparo', rotulo: 'Slower / again' },
  { id: 'reparo/escreve', tile: 'reparo', rotulo: 'Write it / show me' },
  { id: 'reparo/ingles', tile: 'reparo', rotulo: 'Do you speak English? (and when they don\'t)' },
  { id: 'reparo/como-se-diz', tile: 'reparo', rotulo: 'How do you say…?' },
  { id: 'reparo/apontar', tile: 'reparo', rotulo: 'Point and get it' },

  // 12 · apuro — o único tile reativo. Um de doze: 8%.
  { id: 'apuro/roubo', tile: 'apuro', rotulo: "I've been robbed", reativa: true },
  { id: 'apuro/perdi', tile: 'apuro', rotulo: "I've lost it / I've lost someone", reativa: true },
  { id: 'apuro/denuncia', tile: 'apuro', rotulo: 'Police & the report', reativa: true },
  { id: 'apuro/112', tile: 'apuro', rotulo: 'Emergency number', reativa: true },
  { id: 'apuro/golpes', tile: 'apuro', rotulo: 'The scams, by name', reativa: true },
  { id: 'apuro/reclamacoes', tile: 'apuro', rotulo: 'Filing a complaint', reativa: true }
];

// Cards com JANELA DE DATA: aeroporto, fronteira e pré-embarque são eventos de UMA
// VEZ SÓ. Um tile permanente para algo usado num único dia custa 1/12 da tela por
// doze dias. Estes não têm tile: são empurrados pela faixa "Now" nos 7 dias antes
// do voo e no dia, e continuam alcançáveis pela busca.
export const JANELAS = [
  { id: 'antes-de-voar', de: -7, ate: -1, rotulo: 'Before you fly' },
  { id: 'fronteira', de: 0, ate: 0, rotulo: 'Landing & the border' },
  { id: 'volta', de: 'ultimo-dia', ate: 'ultimo-dia', rotulo: 'Going home' }
] as const;
