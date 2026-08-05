// G6 — ZERO ADJETIVO DE POVO, por língua da narração.
//
// A narração é escrita na língua do COMPRADOR, que muda por SKU: inglês no
// ¡Dime! EN, alemão no DE, português no Hablá/Shuō!/Phûut!. O regex de gentílico
// tem que casar a língua certa — senão o portão dá VERDE sem verificar nada.
//
// Foi o que aconteceu: a primeira versão só tinha gentílico inglês e português,
// e no curso alemão (narração 100% alemã) `die Spanier sind` passava direto. Um
// revisor achou à mão. Portão que aprova sem olhar é pior que portão nenhum —
// dá a falsa garantia que dispensa a revisão humana.
//
// A DISCRIMINAÇÃO LÍNGUA vs POVO é a mesma em toda língua e vem do caso real:
// «Spanish is a typewriter» (a língua, metáfora do B01) não pode disparar, mas
// «the Spanish are warm» (o povo) tem que disparar. Em inglês, o singular só cabe
// na língua; o povo exige plural ou «people». As outras línguas têm suas próprias
// pistas, embutidas abaixo.

const REGRAS = {
  en: [
    // povo + cópula: plural direto, ou "people are/tend to…" no singular
    // `greeks?`/`greek people` entrou porque o SKU EN → Grécia narra em inglês e o
    // regex sem o gentílico do destino dá VERDE sem olhar — exatamente a falha do
    // curso alemão descrita acima, só que no destino em produção agora.
    /\b(the )?(spanish|spaniards|thai|chinese|italians?|french|germans?|greeks?|argentin\w+|brazilians?|british|americans?)\s+(?:people\s+(?:are|is|always|never|tend to|love to|like to)|are|always|never|tend to|love to|like to)\b/i
  ],
  pt: [
    /\b(os |as )?(espanhóis|espanhola?s|tailandeses|chineses|italianos|italianas|franceses|francesas|alemães|alemãs|argentinos|argentinas|brasileiros|brasileiras)\s+(são|estão|sempre|nunca|costumam|adoram|gostam de|tendem a)\b/i
  ],
  de: [
    // Substantivado: "die Spanier sind", "die Deutschen mögen", "die Katalanen…"
    /\b(die |der )?(Spanier(?:in)?(?:nen)?|Deutsche[nr]?|Katalanen|Basken|Galicier|Italiener(?:in)?(?:nen)?|Franzosen|Französin(?:nen)?|Chinesen|Thailänder(?:in)?(?:nen)?)\s+(sind|sein|mögen|lieben|hassen|neigen|immer|nie|meistens|typischerweise)\b/,
    // Adjetival: "typisch spanisch", "die spanische Art ist…"
    /\b(typisch\s+(spanisch|deutsch|italienisch|französisch|katalanisch)|die\s+(spanische|deutsche|italienische)\s+Art)\b/i
  ],
  fr: [
    // Gentílico + cópula: "les Espagnols sont", "les Français aiment". Acrescentado
    // ANTES de o primeiro autor francês escrever — a lição do alemão foi que um
    // portão sem a língua do SKU dá verde sem verificar.
    /\b(les |l['’])?(espagnol|espagnole|français|française|catalan|catalane|basque|italien|italienne|allemand|chinois)s?\s+(sont|aiment|adorent|détestent|ont tendance|sont toujours|ne sont jamais|typiquement)\b/i,
    // Adjetival: "typiquement espagnol", "à l'espagnole"
    /\b(typiquement\s+(espagnol|français|catalan|italien)|à l['’]espagnol[e]?)\b/i
  ]
};

/** Devolve as ocorrências de adjetivo de povo na língua dada. */
export function achaGentilicos(texto, lingua) {
  const regras = REGRAS[lingua] || REGRAS.en;
  const achados = [];
  for (const re of regras) {
    const m = texto.match(re);
    if (m) achados.push(m[0]);
  }
  return achados;
}

/** As línguas que o G6 sabe checar — para o script avisar quando não souber uma. */
export const LINGUAS_G6 = Object.keys(REGRAS);
