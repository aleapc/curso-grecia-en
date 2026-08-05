<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { decodeSync, importSync } from '$lib/sync';

  // 'fora' = link aberto no navegador (não no PWA instalado): no iOS o storage é
  // SEPARADO — importar aqui gravava no lugar errado e mostrava sucesso falso.
  let estado = $state<'lendo' | 'preview' | 'ok' | 'erro' | 'fora'>('lendo');
  let detalhe = $state('');
  let codigo = $state('');
  let previa = $state<{ ale: number; dea: number } | null>(null);
  let copiado = $state(false);

  onMount(() => {
    const m = window.location.hash.match(/s=(ES1.[A-Za-z0-9_-]+)/);
    if (!m) {
      estado = 'erro';
      detalhe = 'No code in this link. Ask for a new one.';
      return;
    }
    codigo = m[1];
    const data = decodeSync(codigo);
    if (!data) {
      estado = 'erro';
      detalhe = 'Invalid code — ask them to generate a new one.';
      return;
    }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) {
      estado = 'fora';
      return;
    }
    // Dentro do app: mostra o que vai entrar e ESPERA confirmação (merge é
    // irreversível — união sem undo).
    previa = { ale: data.ale.length, dea: data.dea.length };
    estado = 'preview';
  });

  function confirmar() {
    const r = importSync(codigo);
    if (r) {
      estado = 'ok';
      detalhe = `Merged +${r.ale} and +${r.dea}. 🎉`;
    } else {
      estado = 'erro';
      detalhe = 'Invalid code.';
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      copiado = true;
    } catch {
      /* iOS antigo sem clipboard API — o textarea abaixo permite copiar na mão */
    }
  }
</script>

<div class="mt-10 text-center">
  {#if estado === 'lendo'}
    <p>Reading the code…</p>
  {:else if estado === 'preview'}
    <h1 class="text-2xl font-extrabold">Sync? 🔄</h1>
    <p class="mt-2 text-carvao/70">
      This code carries {previa?.ale ?? 0} + {previa?.dea ?? 0} completed parts. Importing merges
      everything and removes nothing.
    </p>
    <button class="btn-primary mt-4" onclick={confirmar}>Import now</button>
  {:else if estado === 'ok'}
    <h1 class="text-2xl font-extrabold text-salvia">Done ✅</h1>
    <p role="status" class="mt-2 text-carvao/70">{detalhe}</p>
  {:else if estado === 'fora'}
    <h1 class="text-2xl font-extrabold">Almost there 📲</h1>
    <p class="mx-auto mt-2 max-w-sm text-carvao/70">
      This link opened in your <b>browser</b> — but your progress lives in the <b>Ορίστε! app</b> on
      your home screen. Copy the code and paste it in there:
    </p>
    <ol class="mx-auto mt-3 max-w-sm space-y-1 text-left text-sm text-carvao/70">
      <li>1. Tap <b>Copy code</b> below</li>
      <li>2. Open the <b>Ορίστε!</b> app on your home screen (on a computer: the course home)</li>
      <li>3. Under <b>Sync</b>, paste it and import</li>
    </ol>
    <button class="btn-primary mt-4" onclick={copiar}>
      {copiado ? '✅ Copied' : '📋 Copy code'}
    </button>
    <textarea
      class="mx-auto mt-3 block w-full max-w-sm rounded-xl border border-black/10 bg-white p-2 text-[10px] text-carvao/60"
      rows="3"
      readonly
      onclick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}>{codigo}</textarea
    >
  {:else}
    <h1 class="text-2xl font-extrabold text-terracota">Hmm… 🤔</h1>
    <p role="status" class="mt-2 text-carvao/70">{detalhe}</p>
  {/if}
  <a href="{base}/" class="btn-primary mt-6 inline-block">Go to the course</a>
</div>
