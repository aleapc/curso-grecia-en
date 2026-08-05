<script lang="ts">
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import KitTela from '$lib/components/KitTela.svelte';
  import KitCardTroca from '$lib/components/KitCardTroca.svelte';
  import { pararAudio } from '$lib/audio';
  import { manterAcordado } from '$lib/consulta/tela';
  import { antesDoVoo } from '$lib/consulta/viagem';
  import type { PageData } from './$types';

  // TELA 2 — OS CARDS DE UM MOMENTO.
  //
  // Aqui acaba a navegação e começa o produto: cada card é uma TROCA inteira.
  // Sem auto-play (você está numa mesa com gente), sem animação de entrada, sem
  // tela de carregamento — a frase está desenhada no primeiro quadro.
  //
  // WAKE LOCK enquanto esta tela está aberta: o card fica aberto na mesa, virado
  // para o garçom, e uma tela que apaga em 30 s apaga no meio da frase.

  let { data }: { data: PageData } = $props();

  // Vindo da busca: o card procurado vem primeiro e marcado. Sem isto, achar o
  // card e depois caçá-lo dentro da lista desfaz o que a busca acabou de fazer.
  // Só no navegador: a página é PRÉ-RENDERIZADA, e durante o prerender ler
  // searchParams é erro duro (o HTML gerado vale para qualquer query).
  const alvo = $derived(browser ? page.url.searchParams.get('card') : null);
  const cards = $derived(
    alvo ? [...data.cards].sort((a, b) => (a.id === alvo ? -1 : b.id === alvo ? 1 : 0)) : data.cards
  );

  const coberto = antesDoVoo();

  onMount(() => {
    const soltar = manterAcordado();
    return () => {
      soltar();
      pararAudio(); // sair da tela cala o áudio: ninguém quer a frase tocando no bolso
    };
  });
</script>

<svelte:head>
  <title>{data.folha.rotulo} · Ορίστε!</title>
</svelte:head>

<KitTela voltarPara="{base}/kit/{data.tile.id}/">
  <div class="px-0.5 pb-2">
    <p class="text-[0.7rem] font-bold uppercase tracking-wide text-carvao/60">
      {data.tile.rotulo}
    </p>
    <h1 class="text-xl font-extrabold leading-tight">{data.folha.rotulo}</h1>
  </div>

  <div class="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-1">
    {#if cards.length}
      {#each cards as card (card.id)}
        <KitCardTroca {card} {coberto} destaque={card.id === alvo} />
      {/each}
    {:else}
      <!-- ESTADO VAZIO HONESTO. A folha existe (é o mapa, e o mapa é lei de
           catálogo); o que ainda não existe é a marcação dos episódios que a
           preenche. Dizer isso é melhor que esconder a folha: quem procurou
           "the meter" e caiu aqui fica sabendo que o assunto tem lugar. -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/10">
        <p class="text-[1.05rem] font-bold leading-snug">Nothing here yet.</p>
        <p class="mt-1 text-[0.9rem] leading-snug text-carvao/75">
          This one is on the map, but the phrases for it have not landed in the kit yet. The rest of
          {data.tile.rotulo.toLowerCase()} may already have what you need.
        </p>
        <a
          href="{base}/kit/{data.tile.id}/"
          class="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-creme px-3 py-2 text-[0.95rem] font-bold ring-1 ring-carvao/15"
        >
          <span class="text-oceano">◀</span> Back to {data.tile.rotulo}
        </a>
      </div>
    {/if}
  </div>

  {#snippet rodape()}
    <a
      href="{base}/kit/{data.tile.id}/"
      class="flex h-14 items-center gap-2 rounded-2xl bg-white px-4 text-[1.05rem] font-bold shadow-sm ring-2 ring-carvao/15 active:scale-[0.99]"
    >
      <span class="text-xl text-oceano">◀</span>
      <span class="truncate">{data.tile.rotulo}</span>
    </a>
  {/snippet}
</KitTela>
