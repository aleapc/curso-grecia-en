<script lang="ts">
  import { base } from '$app/paths';
  import { niveis } from '$lib/course';
  import { COM_IMAGEM } from '$lib/course/outline.gen';
  import { examDoNivel, quizDoEpisodio } from '$lib/course/quiz-nav';
  import { store, isDone, PROFILES } from '$lib/state.svelte';
  import { encodeSync, importSync, whatsappUrl } from '$lib/sync';
  import { curso } from '$lib/curso.config';

  const translatorHref = `https://translate.google.com/?sl=${curso.translatorPair.sl}&tl=${curso.translatorPair.tl}&op=translate`;

  const perfil = $derived(PROFILES.find((p) => p.id === store.current)!);

  // Episódio aberto (mostra as partes embaixo da fileira)
  let aberto = $state<string | null>(null);

  // Sync de casal
  let codigo = $state('');
  let cola = $state('');
  let msg = $state('');
  let msgOk = $state(false);
  function gerar() {
    codigo = encodeSync();
  }
  function importar() {
    const r = importSync(cola);
    msgOk = !!r;
    msg = r
      ? `Imported: +${r.ale} yours, +${r.dea} theirs. 🎉`
      : 'Invalid code — check you copied all of it (it starts with ES1.).';
  }

  const dotBg: Record<string, string> = {
    salvia: 'bg-salvia',
    oceano: 'bg-oceano',
    terracota: 'bg-terracota'
  };
  const softBg: Record<string, string> = {
    salvia: 'bg-salvia/15',
    oceano: 'bg-oceano/15',
    terracota: 'bg-terracota/15'
  };
  const textCor: Record<string, string> = {
    salvia: 'text-salvia',
    oceano: 'text-oceano',
    terracota: 'text-terracota'
  };
  const ringCor: Record<string, string> = {
    salvia: 'ring-2 ring-salvia',
    oceano: 'ring-2 ring-oceano',
    terracota: 'ring-2 ring-terracota'
  };
  // Degradê de fundo do card (atrás da imagem/emoji), por nível — vibe dos guias
  const grad: Record<string, string> = {
    salvia: 'linear-gradient(155deg, #8FB89B, #5E8870)',
    oceano: 'linear-gradient(155deg, #3E8DA0, #244F5C)',
    terracota: 'linear-gradient(155deg, #E0915A, #B23A22)'
  };

  const feitasDe = (ep: { partes: { id: string }[] }) =>
    ep.partes.filter((p) => isDone(p.id)).length;
</script>

<section class="mt-2">
  <h1 class="text-2xl font-extrabold leading-tight">
    Γεια σας! 👋
  </h1>
  <p class="mt-1 text-carvao/70">
    Survival Greek and culture for Greece — listen, say it out loud, and don’t get had.
  </p>
</section>

<!-- Entrada do modo consulta. Fica no rodapé da janela e no alcance do polegar,
     porque é a metade do produto que se usa de pé, com uma mão, no minuto em que
     o valor acontece — e a home inteira é rolagem de sofá. Flutua (fixed) e não
     empurra nada: o `pb-20` do <main> já reservava essa faixa. -->
<a
  href="{base}/kit/"
  class="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 inline-flex items-center gap-2 rounded-full bg-carvao px-4 py-2.5 text-sm font-bold text-white shadow-lg transition active:scale-95"
>
  🧭 The kit · look it up
</a>

<a
  href={translatorHref}
  target="_blank"
  rel="noopener"
  class="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5"
>
  <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-terracota/15 text-2xl">🗣️</span>
  <span class="min-w-0 flex-1">
    <span class="block font-bold leading-tight text-carvao">Offline translator</span>
    <span class="block text-xs text-carvao/60"
      >Get <b>Google Translate</b> and download <b>Greek</b> for offline use — the camera reads
      menus, labels and forms on the spot.</span
    >
  </span>
  <span class="shrink-0 text-lg text-carvao/30">↗</span>
</a>
<p class="mt-1 px-1 text-[11px] text-carvao/45">
  💡 Set it up BEFORE you fly. It saves you on small print — but it will not order your beer, and it
  will not tell you that the same drink costs three prices.
</p>

<a
  href="{base}/bolso/"
  class="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5"
>
  <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-salvia/15 text-2xl">💱</span>
  <span class="min-w-0 flex-1">
    <span class="block font-bold leading-tight text-carvao">Traveler's pocket</span>
    <span class="block text-xs text-carvao/60"
      >Currency, plug type, and the emergency number — works with the phone in airplane mode.</span
    >
  </span>
  <span class="shrink-0 text-lg text-carvao/30">→</span>
</a>

{#each niveis as nivel}
  {@const feitas = nivel.episodios.reduce((n, e) => n + feitasDe(e), 0)}
  {@const totalP = nivel.episodios.reduce((n, e) => n + e.partes.length, 0)}
  <section class="mt-7">
    <div class="mb-1 flex items-center gap-2">
      <span class="h-3 w-3 rounded-full {dotBg[nivel.cor]}"></span>
      <h2 class="text-lg font-bold">{nivel.nome}</h2>
      <span class="text-xs text-carvao/50">{feitas}/{totalP} parts</span>
    </div>
    <p class="mb-3 text-sm text-carvao/60">{nivel.descricao}</p>

    <!-- fileira rolável de episódios -->
    <div class="row -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
      {#each nivel.episodios as ep, i}
        {@const f = feitasDe(ep)}
        <button
          type="button"
          onclick={() => (aberto = aberto === ep.id ? null : ep.id)}
          class="w-44 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-md transition
            {aberto === ep.id ? ringCor[nivel.cor] : 'ring-1 ring-black/5'}"
        >
          <!-- imagem-herói (foto se houver; senão emoji grande sobre degradê) -->
          <div class="relative h-28" style="background: {grad[nivel.cor]}">
            <div class="absolute inset-0 grid place-items-center text-5xl opacity-90">{ep.emoji}</div>
            <!-- Só pede o arquivo que existe. O `onerror` abaixo continua sendo a
                 rede de segurança (arquivo corrompido, cache velho), mas card sem
                 foto deixa de disparar um 404 por visita — eram 21 depois da
                 reestruturação, para imagens que ainda não foram produzidas. -->
            {#if COM_IMAGEM.has(ep.id)}
              <img
                src="{base}/img/{ep.id}.webp"
                alt=""
                loading="lazy"
                class="absolute inset-0 h-full w-full object-cover"
                onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            {/if}
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"></div>
            <div class="absolute inset-x-2.5 bottom-2 text-white">
              <div class="text-[10px] font-bold uppercase tracking-wide opacity-90">
                Episode {i + 1}
              </div>
              <div class="line-clamp-2 text-sm font-bold leading-snug drop-shadow">{ep.nome}</div>
            </div>
            {#if f === ep.partes.length}
              <span class="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-xs">✅</span>
            {/if}
          </div>
          <!-- progresso das partes -->
          <div class="flex gap-1 px-2.5 py-2">
            {#each ep.partes as p}
              <span
                class="h-1.5 flex-1 rounded-full {isDone(p.id) ? dotBg[nivel.cor] : 'bg-black/10'}"
              ></span>
            {/each}
          </div>
        </button>
      {/each}
    </div>

    <!-- partes do episódio aberto (se for deste nível) -->
    {#each nivel.episodios as ep}
      {#if aberto === ep.id}
        <div class="card mt-1 p-3">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-2xl">{ep.emoji}</span>
            <span class="font-bold">{ep.nome}</span>
            <button
              type="button"
              class="ml-auto text-sm text-carvao/40"
              onclick={() => (aberto = null)}
              aria-label="Close">✕</button
            >
          </div>
          <div class="space-y-1.5">
            {#each ep.partes as p}
              {#if p.pronta}
                <a
                  href="{base}/episodio/{p.id}/"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-black/5"
                >
                  <span
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white {dotBg[
                      nivel.cor
                    ]}">{p.letra}</span
                  >
                  <span class="flex-1 text-sm font-medium">{p.titulo}</span>
                  <span class="text-sm">{isDone(p.id) ? '✅' : '▶'}</span>
                </a>
              {:else}
                <div class="flex items-center gap-3 rounded-xl px-3 py-2.5 opacity-50">
                  <span
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white {dotBg[
                      nivel.cor
                    ]}">{p.letra}</span
                  >
                  <span class="flex-1 text-sm font-medium">{p.titulo}</span>
                  <span class="text-[10px] font-semibold uppercase tracking-wide text-carvao/40"
                    >coming soon</span
                  >
                </div>
              {/if}
            {/each}
            <!-- Episode quiz (só quando há parte pronta — a página do quiz
                 nasce junto com o conteúdo) -->
            {#if quizDoEpisodio[ep.id] && ep.partes.some((p) => p.pronta)}
              <a
                href="{base}/quiz/{quizDoEpisodio[ep.id]}/"
                class="flex items-center gap-3 rounded-xl border border-dashed border-black/15 px-3 py-2.5 transition hover:bg-black/5"
              >
                <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs {softBg[nivel.cor]}">🎧</span>
                <span class="flex-1 text-sm font-medium">Episode quiz</span>
                <span class="text-sm">{isDone(quizDoEpisodio[ep.id]) ? '✅' : '▶'}</span>
              </a>
            {/if}
          </div>
        </div>
      {/if}
    {/each}

    <!-- Prova do nível (só quando o nível tem alguma parte pronta) -->
    {#if examDoNivel[nivel.nivel] && nivel.episodios.some((e) => e.partes.some((p) => p.pronta))}
      <a
        href="{base}/quiz/{examDoNivel[nivel.nivel]}/"
        class="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-sm transition hover:brightness-105"
        style="background: {grad[nivel.cor]}"
      >
        <span class="text-xl">🎬</span>
        <span class="flex-1">
          <span class="block text-sm font-bold">{nivel.nome} test</span>
          <span class="block text-xs opacity-90">Longer audio + comprehension test</span>
        </span>
        <span class="text-sm">{isDone(examDoNivel[nivel.nivel]) ? '✅' : '▶'}</span>
      </a>
    {/if}
  </section>
{/each}

<!-- Sincronizar com o casal -->
<section class="mt-8">
  <div class="card p-4">
    <h2 class="mb-1 font-bold">👯 Sync with your travel buddy</h2>
    <p class="mb-3 text-sm text-carvao/60">
      Generate a code and send it over to merge what you two have done — no account, no
      server.
    </p>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn-primary" onclick={gerar}>Get my code</button>
      {#if codigo}
        <a class="btn bg-salvia text-white" href={whatsappUrl(codigo)} target="_blank" rel="noopener">
          Send on WhatsApp
        </a>
      {/if}
    </div>
    {#if codigo}
      <textarea
        readonly
        class="mt-2 w-full rounded-xl border border-black/10 p-2 text-xs"
        rows="2">{codigo}</textarea
      >
    {/if}

    <div class="mt-4 border-t border-black/5 pt-3">
      <p class="mb-2 text-sm text-carvao/60">Got a code? Paste it here:</p>
      <textarea
        bind:value={cola}
        placeholder="ES1...."
        class="w-full rounded-xl border border-black/10 p-2 text-xs"
        rows="2"
      ></textarea>
      <button type="button" class="btn-primary mt-2" onclick={importar}>Import</button>
      {#if msg}
        <p role="status" class="mt-2 text-sm {msgOk ? 'text-salvia' : 'text-terracota'}">
          {msgOk ? '✅' : '⚠️'}
          {msg}
        </p>
      {/if}
    </div>
  </div>
</section>

<style>
  /* Fileira de cards: rolagem lateral suave, sem barra visível */
  .row {
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .row::-webkit-scrollbar {
    display: none;
  }
</style>
