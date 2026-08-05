// G14 — INTEGRIDADE DE VOZ × LÍNGUA
//
// A regra (INV-5): **a voz-guia nunca fala a língua-alvo, a voz nativa nunca fala
// a língua do comprador.** Não é purismo: uma voz treinada em inglês dizendo
// espanhol produz o sotaque que o curso existe para corrigir, e o aluno passa o
// curso inteiro tomando o erro como modelo.
//
// POR QUE ESTE PORTÃO EXISTE, e o caso é real. O curso alemão foi clonado do
// inglês e ficou com **460 clipes de narração INGLESA sob chaves alemãs**. A
// build passava, o app abria, e um comprador alemão ouviria o curso em inglês —
// sem erro em lugar nenhum. Foi achado por acaso, comparando manifesto com
// roteiro, meses depois.
//
// O `valida-audio.mjs` pega o caso em que o TEXTO mudou e o mp3 ficou para trás.
// Este pega outro: o texto e o áudio concordam, e os DOIS estão na língua errada
// para a voz que os diz. Roda antes de gravar, que é quando ainda é de graça.
//
// COMO DETECTA. Marcadores baratos e de alta precisão, não detecção de idioma:
// pontuação e diacríticos que só existem numa língua, mais palavras funcionais
// muito frequentes. Preferimos deixar passar um caso duvidoso a acusar em falso —
// portão que grita à toa é portão que se aprende a ignorar.

// Duas listas por língua, e elas têm papéis opostos.
//
// `alvo` — marcas de ALTA PRECISÃO: pontuação e diacríticos que praticamente só
// existem naquela língua. Usadas para dizer "há língua-alvo aqui".
//
// `propria` — palavras funcionais de ALTA COBERTURA: as que qualquer frase real
// daquela língua contém. Usadas para dizer "esta frase É da língua da guia".
// Precisam ser largas de propósito: a primeira versão delas era estreita e
// produziu falso positivo em "One word to bank: caña. A small glass of draught",
// que é inglês puro sem `the` e sem `you`. Uma lista de dez palavras não cobre
// inglês; uma de sessenta cobre qualquer frase de mais de cinco palavras.
const MARCAS = {
  es: {
    nome: 'espanhol',
    forte: /[¿¡ñ]|\b(por favor|gracias|quería|está|dónde|cuánto|señor|usted|vale)\b/i,
    propria:
      /\b(el|la|los|las|un|una|de|del|que|es|en|por|para|con|se|no|su|lo|le|más|pero|como|este|esta|hay|tiene|puede|quiero|está|son|ya|muy|todo|cuando|si|me|te|nos)\b/i
  },
  de: {
    nome: 'alemão',
    // O ALEMÃO CAPITALIZA TODO SUBSTANTIVO, e por isso ele não pode passar pelo
    // filtro de nome próprio. Sem esta bandeira, "Die nützliche zweite Frage
    // lautet also: aus welchem Teil?" perdia `Frage` e `Teil`, sobrava uma marca
    // contra um limiar de duas, e o portão acusava de "não ter uma única palavra
    // de alemão" uma frase inteiramente alemã. Pior: `Sie`, `Ihr` e `Ihres` são
    // sempre maiúsculos, e são o tratamento formal de todo o catálogo DE — o
    // filtro apagava justamente a marca mais frequente da língua no corpus.
    capitalizaSubstantivos: true,
    // SEM o-trema e SEM u-trema: o TURCO os escreve (lütfen, güzel, Türkçem) e
    // toda fala nativa turca era acusada de ser alemã. Ficam ä e ß, que nenhuma
    // outra língua do catálogo usa, mais funcionais que o turco não tem.
    forte: /[äßÄ]|\b(bitte|danke|nicht|schon|noch|auch|sehr|immer|wieder)\b/i,
    propria:
      /\b(der|die|das|den|dem|des|ein|eine|einen|einem|und|ist|sind|nicht|von|zu|zum|zur|mit|auf|für|im|in|an|es|sie|ihr|ihre|ihres|ihnen|ich|du|wir|aber|auch|wenn|dass|noch|nur|schon|hier|man|kann|können|wird|werden|war|waren|hat|haben|sein|mehr|so|als|wie|was|wer|wo|warum|also|aus|sich|dann|denn|oder|über|nach|bei|um|vor|durch|ohne|gegen|weil|jetzt|immer|etwas|nichts|welche|welchem|welcher|welches|diese|dieser|dieses|aufs|ins|ans|vom|beim|am|fürs|übers|durchs|hinein|hinaus|zurück|wieder|fertig|steht|geht|kommt|macht|sagt|heißt|gibt|braucht|muss|müssen|soll|sollen|will|wollen|lässt|damit|dabei|dafür|davon|dazu|deshalb|trotzdem|zwei|drei|vier|erst)\b/
  },
  en: {
    nome: 'inglês',
    forte: /\b(the|you|your)\b/i,
    propria:
      /\b(the|a|an|is|are|was|were|it|of|to|in|for|that|this|and|but|not|with|on|at|as|or|you|your|he|she|they|we|do|does|did|have|has|had|will|would|can|could|one|two|what|when|where|which|who|how|why|there|here|from|by|out|up|so|if|than|then|now|just|only|more|most|all|no|yes|be|been|about|into|over|after|before|off|down)\b/i
  },
  pt: {
    nome: 'português',
    forte: /[ãõ]|\b(você|então|obrigad[oa])\b/i,
    propria:
      /\b(o|a|os|as|um|uma|de|do|da|dos|das|que|é|em|no|na|por|para|com|se|não|seu|sua|mais|mas|como|este|esta|tem|pode|quero|está|são|já|muito|tudo|quando|você|ele|ela|isso|aqui|ali|vai|foi|ser|ter|fazer)\b/i
  },
  // Grego: o discriminador é o ALFABETO, e é o marcador mais barato e mais
  // preciso do lote — nenhuma outra língua do catálogo escreve em grego, e
  // nenhuma frase grega real deixa de escrever nele. `propria` casa a mesma
  // coisa de propósito: aqui cobertura e precisão coincidem, o que não acontece
  // em nenhum dos pares latinos.
  //
  // Sem esta entrada o portão ficava LIGADO e CEGO: `MARCAS['el']` era
  // undefined, as três checagens caíam no ramo `mAlvo &&` e nada era conferido
  // no SKU cujo alfabeto é o produto inteiro.
  el: { nome: 'grego', forte: /[Ͱ-Ͽἀ-῿]/, propria: /[Ͱ-Ͽἀ-῿]/ },
  fr: {
    nome: 'francês',
    // `forte` DELIBERADAMENTE SEM e-agudo e sem u-grave. Este curso roda com o
    // espanhol como língua-ALVO, e "¿Qué quieres?" traria um e-agudo que faria o
    // portão acusar a voz nativa espanhola de falar francês. Os acentos que
    // sobraram (à â ç ê ë î ï ô û) não existem em espanhol.
    forte: /\b(s'il vous plaît|qu'est-ce|c'est|voudrais|bonjour|bonsoir|combien coûte)\b/i,
    propria:
      /\b(le|la|les|un|une|des|de|du|et|est|sont|ne|pas|que|qui|quoi|vous|je|tu|il|elle|nous|ils|elles|ce|cet|cette|dans|pour|avec|sans|sur|sous|au|aux|en|par|plus|mais|comme|si|se|son|sa|ses|leur|on|y|ont|fait|peut|veux|voudrais|donc|alors|quand|bien|aussi|encore|ici|tout|tous|toute|toutes|deux|trois|autre|autres|chaque|meme|même|rien|jamais|toujours|faut|avez|avoir|etre|sera|etait|dit|va|vient|celui|celle|ceux|sont|puis|entre|apres|avant|chez|vers|moins|assez|juste|seul)\b/i
  },
  it: {
    nome: 'italiano',
    // Mesma disciplina do francês: nada de a-agudo nem o-agudo, que o espanhol
    // tem. È, Ò e Ì graves não ocorrem em espanhol e servem de marca segura.
    forte: /\b(per favore|grazie|scusi|prego|buongiorno|buonasera|quanto costa)\b/i,
    propria:
      /\b(il|lo|la|i|gli|le|un|uno|una|di|del|della|dei|delle|che|chi|e|ed|sono|in|per|con|non|si|se|ma|come|questo|questa|quello|ci|ha|hanno|ho|hai|abbiamo|era|erano|voglio|vorrei|anche|da|al|alla|allo|dal|nel|nella|sul|sulla|mi|ti|vi|ne|qui|dove|quando|molto|bene|ancora|solo|tutto|tutti|tutta|due|tre|volta|volte|cosa|quindi|poi|sempre|mai|senza|altro|altra|altri|qualcuno|qualcosa|nessuno|lei|lui|loro|adesso|subito|prima|dopo|sotto|sopra|meno|stesso|stessa|avere|essere|fare|dire|dare|stare|sembra|sembrano|deve|devono|vuole|vogliono|puoi|posso|viene|vanno|ogni|ognuno|qualunque|suo|sua|suoi|sue|mio|mia|nostro|vostro|ecco|allora|oppure|mentre|invece|magari|proprio|anzi|cosi|dunque|infatti|neanche)\b/i
  },
  el: {
    nome: 'grego',
    // Alfabeto próprio: a escrita JÁ é a marca, como no mandarim e no tailandês.
    // Não há lista de funcionais porque não é preciso — nenhuma língua-guia do
    // catálogo escreve em grego.
    forte: /[\u0370-\u03FF\u1F00-\u1FFF]/,
    propria: /[\u0370-\u03FF\u1F00-\u1FFF]/
  },
  tr: {
    nome: 'turco',
    // O turco escreve em alfabeto LATINO desde 1928, então a escrita não separa
    // nada e a marca tem de vir das letras que só ele tem: i-sem-ponto, I-com-ponto,
    // s-cedilha e g-breve. Ç e Ö/Ü ficaram de FORA de `forte` por colidirem com o
    // francês e o alemão.
    forte: /[ıİşŞğĞ]|\b(lütfen|teşekkür|nerede|ne kadar|var mı)\b/i,
    propria:
      /\b(bir|ve|bu|şu|için|ile|çok|ama|daha|var|yok|ne|nerede|nasıl|değil|gibi|kadar|sonra|önce|şey|ben|sen|siz|biz|onlar|hangi|her|bazı|olarak|artık|şimdi|burada|orada)\b/i
  },
  zh: { nome: 'mandarim', forte: /[一-鿿]/, propria: /[一-鿿]/ },
  th: { nome: 'tailandês', forte: /[฀-๿]/, propria: /[฀-๿]/ }
};

/**
 * @param jobs  saída de collectJobs — {key, voice, text}
 * @param cfg   { guia: ['Alice','George'], guiaLingua: 'en',
 *                alvo: ['Carmen','Emilio'], alvoLingua: 'es' }
 */
// NOME PRÓPRIO NÃO CONTA, e o caso que ensinou isto é o melhor do lote: o Hablá
// tem `Antes vivía en São Paulo y tenía un perro` na voz da Ana. É espanhol
// perfeito — uma falante nativa nomeando uma cidade brasileira — e o `ã` de
// "São" disparava a marca de português. Topônimo e nome de gente atravessam a
// fronteira da língua sem mudar de forma; medi-los como sinal de idioma é medir
// o mundo, não o texto.
//
// Remove os tokens que começam com maiúscula fora do início da frase. Perde-se
// alguma sensibilidade em texto todo em caixa alta, e é troca barata.
const semNomesProprios = (t, marcas) => {
  // A BANDEIRA DE SAÍDA. Em língua que capitaliza substantivo comum — alemão —
  // este filtro não remove nome próprio: remove a língua. Ver o comentário em
  // MARCAS.de. Devolver o texto intacto perde a proteção contra topônimo, e essa
  // é a troca certa: o alemão prova a si mesmo por funcionais MINÚSCULAS (ist,
  // und, nicht, auch), que topônimo nenhum carrega.
  if (marcas && marcas.capitalizaSubstantivos) return String(t || '');
  return String(t || '')
    .split(/([.!?¿¡]\s*)/)
    .map((trecho) =>
      trecho
        .split(/\s+/)
        .filter((w, i) => i === 0 || !/^\p{Lu}/u.test(w))
        .join(' ')
    )
    .join(' ');
};

// QUANTAS PALAVRAS PROVAM UMA LÍNGUA. Uma não prova, e o caso é medido: a frase
// inglesa "…your first evening in Spain" contém `in`, que também é palavra
// alemã, e com o limiar de uma ocorrência ela se declarava alemã e escapava do
// portão — justamente o clipe que motivou tudo isto. Línguas vizinhas
// compartilham funcionais curtas (`in`, `an`, `so`, `man`, `die`, `no`, `a`,
// `de`); o que elas não compartilham é várias ao mesmo tempo.
//
// Conta ocorrências DISTINTAS: três "in" continuam sendo uma evidência só.
const quantasMarcas = (t, re) => {
  const m = String(t).match(new RegExp(re.source, 'gi'));
  return m ? new Set(m.map((x) => x.toLowerCase())).size : 0;
};
const pareceLingua = (t, marcas, minimo = 2) =>
  quantasMarcas(t, marcas.propria || marcas.forte) >= minimo;

export function g14(jobs, cfg) {
  const erros = [];
  const guia = new Set(cfg.guia || []);
  const alvo = new Set(cfg.alvo || []);
  const mAlvo = MARCAS[cfg.alvoLingua];
  const mGuia = MARCAS[cfg.guiaLingua];

  for (const j of jobs) {
    const t = j.text || '';

    // Voz-guia dizendo a língua-alvo.
    //
    // O DISCRIMINADOR, e ele vem do caso real. A primeira versão deste portão
    // acusava por pontuação invertida ou três marcas de espanhol na linha, e deu
    // **20 falsos positivos em 20** — todos a guia CITANDO espanhol dentro da
    // narração inglesa ("But ¿cuánto vale? is not how OK is it"), que é
    // literalmente o trabalho dela. Citar não é falar.
    //
    // O que separa os dois é a AUSÊNCIA da própria língua da guia: os 460 clipes
    // que motivaram o portão eram 100% inglês sob chave alemã, com zero alemão
    // dentro. Uma narração alemã que cita espanhol continua cheia de alemão.
    //
    // Então: só acusa quando há marca da língua-alvo E **nenhuma** marca da
    // língua da guia. Isso deixa passar o clipe curto e ambíguo, e é o lado
    // certo para errar — portão que grita à toa é portão que se aprende a
    // ignorar, e este precisa ser levado a sério no dia em que gritar.
    if (guia.has(j.voice) && mAlvo && mGuia) {
      // UMA MARCA E CITACAO, DUAS SAO FALA. Ver o comentario abaixo sobre o
      // toponimo: ele escapa do filtro por ser inicial de frase, e uma marca
      // solitaria nao distingue a guia CITANDO da guia FALANDO.
      const temAlvo = quantasMarcas(semNomesProprios(t, mAlvo), mAlvo.forte) >= 2;
      const temGuia = pareceLingua(t, mGuia);
      if (temAlvo && !temGuia)
        erros.push(
          `G14: ${j.key} está na voz-GUIA (${j.voice}) e o texto parece ${mAlvo.nome} sem nenhuma ` +
            `palavra de ${mGuia.nome} — "${t.slice(0, 60)}…". A guia nunca fala a língua-alvo (INV-5).`
        );
    }

    // ── A CHECAGEM QUE PEGA O CASO FUNDADOR ─────────────────────────────────
    //
    // As duas checagens ao redor perguntam "esta voz está falando a língua da
    // OUTRA?". Nenhuma das duas pega o bug que motivou o portão inteiro, e eu só
    // descobri isso testando: os 460 clipes eram narração INGLESA num curso
    // ALEMÃO — uma terceira língua, que não é nem a da guia nem a do destino.
    // Sem marca de espanhol, nada disparava. O portão aprovava o próprio caso
    // que o justificava.
    //
    // A pergunta certa é a inversa: **a guia está falando a língua DELA?** Um
    // clipe de narração sem uma única palavra funcional do idioma do comprador é
    // o alarme, seja qual for a língua em que ele esteja.
    //
    // O piso de 40 caracteres existe porque clipe curto legítimo ("Vale.",
    // "Otra vez.", "Carmen zuerst.") pode não conter função nenhuma, e acusar
    // esses seria o ruído que faz portão ser ignorado.
    if (guia.has(j.voice) && mGuia && t.length >= 40) {
      const semNP = semNomesProprios(t, mGuia);
      if (!pareceLingua(semNP, mGuia)) {
        // A SEGUNDA CONDIÇÃO, e ela existe porque a primeira sozinha acusa por
        // AUSÊNCIA — prova fraca. "Move five. Place names pull the beat
        // backwards. İSTANbul, ANkara, TAKsim, TÜRkiye." é inglês impecável e
        // deixa UMA funcional distinta: o estilo é telegráfico e os topônimos
        // saíram no filtro de nome próprio, corretamente. Engordar a lista de
        // novo só adiaria o próximo caso.
        //
        // O caso fundador não era um clipe pobre em funcionais: era um clipe
        // RICO NAS FUNCIONAIS DE OUTRA LÍNGUA — 460 narrações 100% inglesas sob
        // chave alemã. Então a acusação passa a exigir isso: a língua da guia
        // rala E outra língua conhecida marcando forte. Três marcas distintas,
        // não duas, porque aqui o ônus da prova é de quem acusa.
        const rival = Object.entries(MARCAS)
          .filter(([lg]) => lg !== cfg.guiaLingua)
          .map(([lg, m]) => [lg, m, quantasMarcas(semNomesProprios(t, m), m.propria || m.forte)])
          .filter(([, , n]) => n >= 3)
          .sort((x, y) => y[2] - x[2])[0];
        if (rival)
          erros.push(
            `G14: ${j.key} está na voz-GUIA (${j.voice}) e o texto não é ${mGuia.nome} — ` +
              `parece ${rival[1].nome} (${rival[2]} marcas) — "${t.slice(0, 60)}…". ` +
              `É narração na língua errada: foi assim que 460 clipes ingleses passaram por alemães.`
          );
      }
    }

    // Voz nativa dizendo a língua do comprador. Aqui NÃO há exceção: o nativo
    // não explica nada, ele só fala. Uma única marca FORTE já é erro.
    //
    // Usa `forte`, nunca `propria`, e a razão é medida: com a lista larga isto
    // deu 221 acusações no curso inglês e 479 no Hablá, porque o espanhol contém
    // legitimamente `no`, `a`, `de`, `me`, `en` — palavras que estão na lista de
    // cobertura do português e do inglês. As duas checagens querem coisas
    // opostas: provar que a frase É da língua da guia pede COBERTURA; provar que
    // há língua estrangeira num clipe nativo pede PRECISÃO.
    if (alvo.has(j.voice) && mGuia && mGuia.forte.test(semNomesProprios(t, mGuia)))
      erros.push(
        `G14: ${j.key} está na voz-ALVO (${j.voice}) e o texto é ${mGuia.nome} — ` +
          `"${t.slice(0, 60)}…". A nativa nunca fala a língua do comprador (INV-5).`
      );

    // Romanização indo ao TTS. O respelling existe para o OLHO do aluno; mandado
    // ao sintetizador vira uma terceira língua que ninguém fala.
    if (alvo.has(j.voice) && /[A-Z]{2,}-[A-Z]{2,}/.test(t))
      erros.push(
        `G14: ${j.key} parece carregar ROMANIZAÇÃO no texto que vai ao TTS — "${t.slice(0, 50)}…". ` +
          `O respelling é para ler, não para falar.`
      );
  }
  return erros;
}
