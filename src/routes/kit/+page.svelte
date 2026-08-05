<script lang="ts">
  import KitTela from '$lib/components/KitTela.svelte';
  import KitTile from '$lib/components/KitTile.svelte';
  import KitBusca from '$lib/components/KitBusca.svelte';
  import KitFaixaAgora from '$lib/components/KitFaixaAgora.svelte';
  import { chavesDeAudioDoKit } from '$lib/consulta/indice';
  import { baixarKit, kitJaBaixado } from '$lib/consulta/offline';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  // TELA 0 — OS 12.
  //
  // Grade 2 × 6 ocupando a tela inteira, zero rolagem em 375×812. A grade é
  // `flex-1` com seis linhas iguais: em tela menor os tiles encolhem juntos, e em
  // NENHUMA tela nasce uma barra de rolagem. A promessa é "o lugar onde você está
  // em zero segundo" — rolar para achar já custou o segundo.

  let { data }: { data: PageData } = $props();

  const chaves = chavesDeAudioDoKit();

  type Estado = 'parado' | 'baixando' | 'pronto' | 'parcial' | 'sem-suporte';
  let estado = $state<Estado>('parado');
  let progresso = $state(0);

  onMount(async () => {
    if (chaves.length && (await kitJaBaixado())) estado = 'pronto';
  });

  async function baixar() {
    if (estado === 'baixando' || estado === 'pronto') return;
    estado = 'baixando';
    progresso = 0;
    const r = await baixarKit((p) => (progresso = Math.round((p.feitos / p.total) * 100)));
    estado = r.estado === 'pronto' ? 'pronto' : r.estado === 'parcial' ? 'parcial' : 'sem-suporte';
  }
</script>

<svelte:head>
  <title>The kit · Ορίστε!</title>
</svelte:head>

<KitTela>
  <KitFaixaAgora />

  <!-- A grade. `grid-rows-6` + `flex-1`: a altura de cada tile é o que sobra
       dividido por seis, então caber é estrutural, não um número com sorte. -->
  <div class="mt-2 grid min-h-0 flex-1 grid-cols-2 grid-rows-6 gap-2.5 pb-1">
    {#each data.tiles as t (t.tile.id)}
      <KitTile tile={t.tile} cards={t.cards} />
    {/each}
  </div>

  {#snippet rodape()}
    <div class="flex items-end gap-2">
      <div class="min-w-0 flex-1">
        <KitBusca />
      </div>

      <!-- MODO AVIÃO: o kit inteiro em um botão, separado do "save this part
           offline" do treino. Sem nada para baixar, o botão não existe — botão
           que não faz nada é pior que botão nenhum. -->
      {#if chaves.length}
        <button
          type="button"
          onclick={baixar}
          disabled={estado === 'baixando' || estado === 'pronto'}
          class="h-12 shrink-0 rounded-2xl px-3 text-sm font-bold ring-2 transition active:scale-95 disabled:active:scale-100
            {estado === 'pronto'
            ? 'bg-salvia/20 text-carvao ring-salvia'
            : 'bg-white text-carvao ring-carvao/15'}"
        >
          {#if estado === 'baixando'}⬇ {progresso}%
          {:else if estado === 'pronto'}✓ Trip
          {:else if estado === 'parcial'}↻ Trip
          {:else if estado === 'sem-suporte'}— Trip
          {:else}⬇ Trip{/if}
        </button>
      {/if}
    </div>
    {#if estado === 'parcial'}
      <p role="status" class="mt-1 text-center text-[0.72rem] font-semibold text-terracota">
        Some clips did not come down — tap ↻ Trip again while you have signal.
      </p>
    {:else if estado === 'sem-suporte'}
      <p role="status" class="mt-1 text-center text-[0.72rem] font-semibold text-terracota">
        This browser cannot store the audio. Add the app to your home screen first.
      </p>
    {/if}
  {/snippet}
</KitTela>
