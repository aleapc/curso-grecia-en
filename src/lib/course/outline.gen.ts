import type { ModuloOutline } from '../types';

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  ARQUIVO GERADO — não edite à mão.                                       │
// │  Fonte: os ep-*.json (título) + slots.json (ordem e módulo).             │
// │  Regenerar: npm run outline   ·   Conferir: npm run outline:conferir     │
// │                                                                          │
// │  O título vivia aqui E no episódio. Duas canônicas para a mesma string   │
// │  é o defeito que fez duas partes reescritas aparecerem na tela com o     │
// │  título antigo e duas partes novas não aparecerem. Agora deriva.         │
// └──────────────────────────────────────────────────────────────────────────┘

export const outline: ModuloOutline[] = [
  {
    nivel: 'basico',
    nome: 'Basic · Get by',
    descricao: 'The Spanish that gets the day done: arriving, ordering, paying, moving, and getting help.',
    cor: 'terracota',
    licoes: [
      { id: 'b01', titulo: 'You already own the two rarest sounds', pronta: true },
      { id: 'b02', titulo: 'Γεια σας on the way in, and nine more words', pronta: true },
      { id: 'b03', titulo: 'Συγγνώμη, and then the thing you need', pronta: true },
      { id: 'b04', titulo: 'Five things that stop being free once you fly', pronta: true },
      { id: 'b05', titulo: 'Three answers at the desk, and the booking carries the rest', pronta: true },
      { id: 'b06', titulo: 'Έχετε — and then whatever you need', pronta: true },
      { id: 'b07', titulo: 'Μπορώ να — the three sounds that open the whole ride into town', pronta: true },
      { id: 'b08', titulo: 'Πού είναι — and the answer that fits in your head', pronta: true },
      { id: 'b09', titulo: 'The ticket starts when you start it', pronta: true },
      { id: 'b10', titulo: 'ΡΟΔΟΣ is not Podos — reading the sign and saying the word', pronta: true },
      { id: 'b11', titulo: 'Θα ήθελα — sitting down and getting the first round', pronta: true },
      { id: 'b12', titulo: 'Χωρίς — the one word that edits any plate', pronta: true },
      { id: 'b13', titulo: 'Έχω αλλεργία — the sentence that has to land the first time', pronta: true },
      { id: 'b14', titulo: 'Τον λογαριασμό — and the list by the door', pronta: true },
      { id: 'b15', titulo: 'Πόσο κάνει — three words in front of anything with a price', pronta: true },
      { id: 'b16', titulo: 'Έχετε and μπορώ να — the desk minute that improves the room', pronta: true },
      { id: 'b17', titulo: 'Φαρμακείο — the green cross, the notice in the window, two numbers', pronta: true },
      { id: 'b18', titulo: 'The last morning — μπορώ να αφήσω, and the goodbye that gets you asked back', pronta: true },
    ]
  },
  {
    nivel: 'intermediario',
    nome: 'Intermediate · Get the good stuff',
    descricao: 'Eat where they eat, when they eat, at the price they pay.',
    cor: 'oliva',
    licoes: [
      { id: 'i01', titulo: 'Their clock, and the question that hands it to you', pronta: true },
      { id: 'i02', titulo: 'The counter, and the sentence that is shorter than yours', pronta: true },
      { id: 'i03', titulo: 'The dish you were not going to order', pronta: true },
      { id: 'i04', titulo: 'The evening that starts late and ends with one bill', pronta: true },
      { id: 'i05', titulo: 'The five questions, and the five answers you already have', pronta: true },
      { id: 'i06', titulo: 'Yesterday I went, I ate, I loved it', pronta: true },
      { id: 'i07', titulo: 'The praise that reaches the kitchen, and the flat sentence that gets the plate sorted', pronta: true },
      { id: 'i08', titulo: 'Someone invites you — what you carry in, where you sit, how you say you are full', pronta: true },
      { id: 'i09', titulo: 'Doing what they do — the market, the long coffee, and the square after dark', pronta: true },
      { id: 'i10', titulo: 'Money here: the card is the one with a law behind it', pronta: true },
    ]
  },
  {
    nivel: 'avancado',
    nome: 'Advanced · Read the room',
    descricao: 'The humour, the pride, the old argument, and what their silence means.',
    cor: 'indigo',
    licoes: [
      { id: 'a01', titulo: 'How they talk when it is not to you', pronta: true },
      { id: 'a02', titulo: 'What they laugh at, and the one joke that is yours', pronta: true },
      { id: 'a03', titulo: 'Who they think they are', pronta: true },
      { id: 'a04', titulo: 'The old argument', pronta: true },
      { id: 'a05', titulo: 'The other language', pronta: true },
      { id: 'a06', titulo: 'Thirteen days of drift, nine named dates, and the month the island is yours', pronta: true },
      { id: 'a07', titulo: 'Ορίστε, πέρνα, να πηγαίνω — the signals that arrive before the sentence', pronta: true },
      { id: 'a08', titulo: 'The last minute with each of them, and the eight openings in your pocket', pronta: true },
    ]
  },
];

// Gerado de static/img/ — a home só pede imagem que existe.
export const COM_IMAGEM = new Set(["a01","a02","a03","a04","a05","a06","a07","a08","b01","b02","b03","b04","b05","b06","b07","b08","b09","b10","b11","b12","b13","b14","b15","b16","b17","b18","i01","i02","i03","i04","i05","i06","i07","i08","i09","i10"]);
