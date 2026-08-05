<script lang="ts">
  import { base } from '$app/paths';
  import KitTela from '$lib/components/KitTela.svelte';
  import KitIcone from '$lib/components/KitIcone.svelte';
  import type { PageData } from './$types';

  // TELA 1 — OS MOMENTOS DE UM LUGAR.
  //
  // Na ordem do ARCO DA CENA (entrar → pedir → pagar → sair), não em ordem
  // alfabética e não por frequência: é assim que a cena acontece, e é assim que a
  // pessoa procura. A folha reativa ("algo deu errado") é sempre a ÚLTIMA — uma
  // folha no fim, nunca um galho em cada lugar, senão o índice reproduz sozinho a
  // moldura de perda que o curso levou meses para tirar.
  //
  // Uma linha de texto por momento, sem descrição secundária: rótulo escrito como
  // o que você QUER QUE ACONTEÇA, nunca como tópico.

  let { data }: { data: PageData } = $props();

  const numeros = ['➊', '➋', '➌', '➍', '➎', '➏', '➐', '➑'];
</script>

<svelte:head>
  <title>{data.tile.rotulo} · Ορίστε!</title>
</svelte:head>

<KitTela voltarPara="{base}/kit/">
  <h1 class="flex items-center gap-2 px-0.5 pb-2">
    <span class="{data.tile.id === 'apuro' ? 'text-terracota' : 'text-oceano'} shrink-0">
      <KitIcone icone={data.tile.icone} tamanho={24} />
    </span>
    <span class="text-xl font-extrabold leading-tight">{data.tile.rotulo}</span>
  </h1>

  <ul class="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-1">
    {#each data.folhas as f, i (f.folha.id)}
      <li>
        <a
          href="{base}/kit/{data.tile.id}/{f.slug}/"
          class="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white px-3.5 py-2 shadow-sm ring-1 transition active:scale-[0.99]
            {f.folha.reativa ? 'ring-terracota/40' : 'ring-black/10'}"
        >
          <span
            class="w-6 shrink-0 text-center text-lg font-bold {f.folha.reativa
              ? 'text-terracota'
              : 'text-oceano'}"
          >
            {f.folha.reativa ? '⚠' : (numeros[i] ?? '·')}
          </span>
          <span class="min-w-0 flex-1 text-[1.05rem] font-bold leading-snug">{f.folha.rotulo}</span>
          <span class="shrink-0 text-xs font-bold tabular-nums text-carvao/45">
            {f.cards || '—'}
          </span>
        </a>
      </li>
    {/each}
  </ul>

  {#snippet rodape()}
    <a
      href="{base}/kit/"
      class="flex h-14 items-center gap-2 rounded-2xl bg-white px-4 text-[1.05rem] font-bold shadow-sm ring-2 ring-carvao/15 active:scale-[0.99]"
    >
      <span class="text-xl text-oceano">◀</span>
      <span>All twelve</span>
    </a>
  {/snippet}
</KitTela>
