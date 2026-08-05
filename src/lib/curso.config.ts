// A CONFIG DE CURSO — o que muda entre EN/DE/FR/IT→Espanha (e o futuro →França)
// mora AQUI e só aqui. Componentes agnósticos de língua (busca, tradutor,
// bolso do viajante) leem daqui; nenhum deles tem par de idioma ou moeda
// hard-coded. Derivar um SKU novo = copiar este arquivo e trocar os valores.

export const curso = {
  /**
   * Identidade do SKU, e ela NÃO é cosmética: é o namespace de
   * localStorage. Todos os cursos servem de aleapc.github.io/<curso>/, e
   * localStorage é por ORIGEM, não por caminho — sem isto, os cursos leem e
   * sobrescrevem o progresso uns dos outros.
   */
  sku: 'curso-grecia-en',
  /** Idioma do comprador (a voz-guia). */
  buyerLang: 'en',
  /** Idioma do destino (a fala nativa ensinada). */
  targetLang: 'el',
  /** Par para o link do Google Tradutor: sl = comprador, tl = destino. */
  translatorPair: { sl: 'en', tl: 'el' },
  /** Moeda do destino. */
  destCurrency: 'EUR',
  /**
   * Moedas de "casa" do comprador que vale converter no bolso do viajante.
   * Vazio quando o comprador já usa a moeda do destino (ex.: DE/FR/IT→Espanha,
   * todos em EUR) — nesse caso o /bolso mostra a nota "mesma moeda", sem conversor.
   */
  homeCurrencies: ['GBP', 'USD'] as string[],
  timeZone: 'Europe/Athens'
} as const;

export type CursoConfig = typeof curso;
