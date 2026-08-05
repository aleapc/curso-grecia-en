<script lang="ts">
  // O BOLSO DO VIAJANTE é a metade do produto que se usa em modo avião, de pé,
  // com uma mão. Por isso ele NÃO pode ter fato hard-coded: até 2026-08-05 esta
  // página era a da Espanha em todos os 15 cursos, e o curso de Türkiye dizia ao
  // aluno que o país usa o euro, que a tomada é tipo C/F e que a água da torneira
  // é potável — nenhuma das três é verdade lá, e a terceira faz mal.
  //
  // Agora tudo vem de `src/lib/bolso.json`, e a regra que governa aquele arquivo
  // é: **fato sem fonte não entra**. Onde o dado falta, o cartão inteiro some da
  // tela. Uma lacuna visível é melhor que uma certeza errada num lugar onde o
  // aluno não tem internet para conferir.
  import { browser } from '$app/environment';
  import { curso } from '$lib/curso.config';
  import bolso from '$lib/bolso.json';

  type Rates = Record<string, number>;

  const embedded = bolso.cambio;
  const storageKey = `${curso.sku}:rates`;

  // A bandeira e o locale vêm do dado, não de uma lista fixa. A lista antiga só
  // conhecia EUR, GBP e USD — a lira turca e o peso mexicano apareciam sem
  // bandeira e com a cotação do euro.
  const labels: Record<string, { flag: string; locale: string }> = bolso.moedas;

  let rates = $state<Rates>({ ...embedded.rates });
  let rateDate = $state(embedded.date);
  let source = $state<'saved' | 'online' | 'embedded'>('embedded');
  let editing = $state<string | null>(null);
  let texts = $state<Record<string, string>>({});

  const fieldClass =
    'w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-right text-lg font-semibold tabular-nums';

  function onInput(currency: string, raw: string) {
    texts = { ...texts, [currency]: raw };
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    const base = currency === curso.destCurrency ? n : n / (rates[currency] ?? 1);
    const novo: Record<string, string> = { [curso.destCurrency]: base.toFixed(2) };
    for (const c of curso.homeCurrencies) novo[c] = (base * (rates[c] ?? 1)).toFixed(2);
    novo[currency] = raw;
    texts = novo;
  }

  if (browser) {
    try {
      const salvo = localStorage.getItem(storageKey);
      if (salvo) {
        const j = JSON.parse(salvo);
        if (j?.rates) {
          rates = j.rates;
          rateDate = j.date;
          source = 'saved';
        }
      }
    } catch {
      /* storage indisponível: fica a cotação embutida */
    }
  }
</script>

<svelte:head><title>{bolso.titulo} · {bolso.marca}</title></svelte:head>

<div class="mx-auto max-w-lg space-y-6 pb-8">
  <header>
    <p class="text-xs font-bold uppercase tracking-widest text-terracota">{bolso.cabecalho}</p>
    <h1 class="mt-1 text-2xl font-extrabold">{bolso.titulo}</h1>
    <p class="mt-1 text-sm text-carvao/65">{bolso.subtitulo}</p>
  </header>

  <section>
    <h2 class="mb-2 text-lg font-bold">💱 {bolso.rotulos.cambio}</h2>
    {#if curso.homeCurrencies.length > 0}
      <div class="card space-y-3 p-4">
        {#each [curso.destCurrency, ...curso.homeCurrencies] as currency (currency)}
          <label class="flex items-center gap-3">
            <span class="w-24 text-sm font-semibold text-carvao/70"
              >{labels[currency]?.flag} {currency}</span
            >
            <input
              class={fieldClass}
              inputmode="decimal"
              aria-label={`${bolso.rotulos.valorEm} ${currency}`}
              value={texts[currency] ?? ''}
              oninput={(event) => onInput(currency, (event.target as HTMLInputElement).value)}
              onfocus={() => (editing = currency)}
              onblur={() => (editing = null)}
            />
          </label>
        {/each}
        <div class="border-t border-black/5 pt-3 text-xs text-carvao/55">
          <p>
            1 {curso.destCurrency} =
            {#each curso.homeCurrencies as c, i (c)}{i > 0 ? ' · ' : ''}{rates[c]?.toFixed(4)}
              {c}{/each}
          </p>
          <p>{bolso.rotulos.dataCotacao}: {rateDate}</p>
          <p class="mt-1">{bolso.rotulos.avisoCotacao}</p>
        </div>
      </div>
    {:else}
      <div class="card p-4 text-sm">{bolso.mesmaMoeda}</div>
    {/if}
  </section>

  {#if bolso.tomadas}
    <section>
      <h2 class="mb-2 text-lg font-bold">🔌 {bolso.rotulos.tomadas}</h2>
      <div class="card p-4 text-sm leading-relaxed">{bolso.tomadas}</div>
    </section>
  {/if}

  {#if bolso.emergencia?.length}
    <section>
      <h2 class="mb-2 text-lg font-bold">🆘 {bolso.rotulos.emergencia}</h2>
      <div class="space-y-2">
        {#each bolso.emergencia as e (e.numero)}
          <a href={`tel:${e.numero.replace(/\s/g, '')}`} class="card flex items-center justify-between p-4">
            <span
              ><strong>{e.numero}</strong><span class="ml-2 text-sm text-carvao/65">{e.oQue}</span
              ></span
            >
            <span class="text-terracota">{bolso.rotulos.ligar} →</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  {#if bolso.saberUtil?.length}
    <section>
      <h2 class="mb-2 text-lg font-bold">💡 {bolso.rotulos.saberUtil}</h2>
      <ul class="card divide-y divide-black/5 px-4 text-sm leading-relaxed">
        {#each bolso.saberUtil as item (item.texto)}
          <li class="py-3">{item.emoji} {item.texto}</li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
