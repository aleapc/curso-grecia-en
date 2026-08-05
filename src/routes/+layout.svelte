<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { base } from '$app/paths';
  import { PROFILES, store, setProfile } from '$lib/state.svelte';
  import { curso } from '$lib/curso.config';
  import KitBusca from '$lib/components/KitBusca.svelte';

  let { children } = $props();

  // Busca e menu são alcançáveis de QUALQUER tela (era só na tela 0 do /kit),
  // mas continuam a MESMA saída de emergência discreta — nunca um campo herói
  // fixo (PRODUTO.md §6: busca não é entrada primária). Por isso ficam
  // fechados por padrão, atrás de um ícone, e um clique fora fecha os dois.
  let buscaAberta = $state(false);
  let menuAberto = $state(false);

  const translatorHref = `https://translate.google.com/?sl=${curso.translatorPair.sl}&tl=${curso.translatorPair.tl}&op=translate`;

  // Registro MANUAL do service worker (o injectRegister automático não injeta
  // nada em HTML prerenderizado — sem isto o app nunca teve SW em produção).
  // Registro direto com URL absoluta do base: o virtual:pwa-register compila
  // "./sw.js" (relativo à PÁGINA), que quebraria em deep-link de episódio.
  // Com registerType autoUpdate o sw.js já tem skipWaiting+clientsClaim, então
  // register puro + update() horário dá o autoUpdate completo.
  onMount(async () => {
    if (dev || !('serviceWorker' in navigator)) return;
    // Sem base (= vite preview local em localhost:4173/5182, origem COMPARTILHADA
    // com os outros PWAs do casal): só registra com ?sw na URL, senão o precache
    // do app "sequestra" o / dos outros projetos em preview.
    if (!base && !new URLSearchParams(location.search).has('sw')) return;
    try {
      // Quando o SW novo (skipWaiting+clientsClaim) assume o controle, recarrega
      // UMA vez pra a página pegar o código novo — sem isto o shell velho fica na
      // memória e mudanças de código não aparecem (o "reabri e não vi" do iOS).
      // Só em ATUALIZAÇÃO (já havia controller), nunca no 1º install (evita loop).
      if (navigator.serviceWorker.controller) {
        let recarregando = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (recarregando) return;
          recarregando = true;
          location.reload();
        });
      }
      const reg = await navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` });
      void reg.update().catch(() => {}); // checa update já no launch
      // iOS só checa update no launch; com o app aberto horas (estudo/carro),
      // checa a cada hora pra nova versão chegar sem depender de reabrir 2x.
      setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch {
      /* sem SW (navegador antigo / registro falhou) — app segue online */
    }
  });
</script>

<div class="mx-auto flex min-h-dvh max-w-xl flex-col">
  <header
    class="sticky top-0 z-10 border-b border-black/5 bg-creme/90 px-4 py-3 backdrop-blur"
  >
    <div class="flex items-center justify-between gap-2">
      <a href="{base}/" class="flex items-baseline gap-1.5">
        <span class="text-lg font-extrabold text-terracota">Ορίστε!</span>
        <span class="hidden text-xs font-medium text-carvao/50 sm:inline">· Greece survival Greek</span>
      </a>
      <div class="flex items-center gap-1">
        {#each PROFILES as p}
          <button
            type="button"
            onclick={() => setProfile(p.id)}
            aria-pressed={store.current === p.id}
            class="pill {store.current === p.id
              ? 'bg-terracota text-white'
              : 'bg-white text-carvao/70 ring-1 ring-black/10'}"
          >
            {p.emoji} {p.nome.split(' ')[0]}
          </button>
        {/each}
        <button
          type="button"
          onclick={() => {
            buscaAberta = !buscaAberta;
            menuAberto = false;
          }}
          aria-pressed={buscaAberta}
          aria-label="Search the kit"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base {buscaAberta
            ? 'bg-terracota text-white'
            : 'bg-white text-carvao/70 ring-1 ring-black/10'}"
        >
          🔎
        </button>
        <div class="relative">
          <button
            type="button"
            onclick={() => {
              menuAberto = !menuAberto;
              buscaAberta = false;
            }}
            aria-pressed={menuAberto}
            aria-label="More"
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base {menuAberto
              ? 'bg-terracota text-white'
              : 'bg-white text-carvao/70 ring-1 ring-black/10'}"
          >
            ⋯
          </button>
          {#if menuAberto}
            <div
              class="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/15"
            >
              <a
                href={translatorHref}
                target="_blank"
                rel="noopener"
                onclick={() => (menuAberto = false)}
                class="flex items-center gap-2.5 px-3.5 py-3 text-sm font-medium active:bg-black/5"
              >
                <span class="text-lg">🗣️</span> Google Translator
              </a>
              <a
                href="{base}/bolso/"
                onclick={() => (menuAberto = false)}
                class="flex items-center gap-2.5 border-t border-black/5 px-3.5 py-3 text-sm font-medium active:bg-black/5"
              >
                <span class="text-lg">💱</span> Traveler's pocket
              </a>
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if buscaAberta}
      <div class="relative mt-2">
        <KitBusca direcao="baixo" />
      </div>
    {/if}
  </header>

  <main class="flex-1 px-4 pb-20 pt-3">
    {@render children()}
  </main>
</div>
