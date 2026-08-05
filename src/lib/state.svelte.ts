// Estado do app: perfil atual (casal) + lições concluídas por perfil.
// Persiste em localStorage com namespace `ce-` pra não colidir com os outros
// PWAs que vivem no mesmo domínio (aleapc.github.io).

import { curso } from './curso.config';

// A CHAVE LEVA O SKU, e isso conserta um vazamento de dados que estava no ar.
// Os cursos servem todos de aleapc.github.io/<curso>/ — mesma ORIGEM, e
// localStorage é por origem, não por caminho. Com `es-state` igual nos 14
// cursos, quem fazia França lia e sobrescrevia o progresso de quem fazia
// Espanha. O comentário acima já avisava do domínio compartilhado, mas só
// protegia contra OUTROS PWAs, não contra os cursos irmãos.
const KEY = `${curso.sku}:state`;
const LEGADO = 'es-state';

// A chave legada só é adotada pelo SKU original. Adotá-la nos outros daria
// ao aluno de francês o progresso dele em espanhol.
if (typeof localStorage !== 'undefined' && curso.sku === 'curso-espanha') {
  try {
    const velho = localStorage.getItem(LEGADO);
    if (velho && !localStorage.getItem(KEY)) localStorage.setItem(KEY, velho);
  } catch {
    /* storage indisponível: seguir sem migrar */
  }
}

export type Profile = 'ale' | 'dea';

// Perfis do casal viajante (ids internos 'ale'/'dea' mantidos pelo formato de
// sync — são só chaves; os NOMES é que aparecem).
export const PROFILES: { id: Profile; nome: string; emoji: string }[] = [
  { id: 'ale', nome: 'You', emoji: '🧳' },
  { id: 'dea', nome: 'Travel buddy', emoji: '🕶️' }
];

interface Persisted {
  current: Profile;
  done: Record<Profile, string[]>;
}

// Valida o shape vindo do storage: qualquer coisa que não seja array de strings
// vira [] — estado corrompido se auto-recupera em vez de quebrar o app no boot.
function soStrings(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : [];
}

function load(): Persisted {
  const fallback: Persisted = { current: 'ale', done: { ale: [], dea: [] } };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw);
    return {
      current: p.current === 'dea' ? 'dea' : 'ale',
      done: { ale: soStrings(p.done?.ale), dea: soStrings(p.done?.dea) }
    };
  } catch {
    return fallback;
  }
}

export const store = $state<Persisted>(load());

function save() {
  if (typeof localStorage === 'undefined') return;
  // Outra aba/contexto pode ter salvo depois de nós: funde (união) o que está
  // gravado antes de sobrescrever, senão o snapshot velho apaga progresso novo.
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      (['ale', 'dea'] as Profile[]).forEach((prof) => {
        for (const id of soStrings(p?.done?.[prof])) {
          if (!store.done[prof].includes(id)) store.done[prof].push(id);
        }
      });
    }
  } catch {
    /* gravação ilegível → sobrescreve com o estado bom */
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (e) {
    // Quota cheia (a origem aleapc.github.io é COMPARTILHADA pelos outros PWAs).
    // O progresso segue em memória na sessão; não derruba markDone/importSync.
    console.warn('Dime: could not save your progress (storage full?)', e);
  }
}

export function setProfile(p: Profile) {
  store.current = p;
  save();
}

export function isDone(id: string, p: Profile = store.current): boolean {
  return store.done[p].includes(id);
}

export function markDone(id: string, p: Profile = store.current) {
  if (!store.done[p].includes(id)) {
    store.done[p].push(id);
    save();
  }
}

// --- Sincronização de casal (união idempotente, sem servidor) ---
// NOTA: o merge é UNIÃO (só adiciona). Se um dia "desmarcar lição" virar
// requisito, o sync precisará de tombstones/timestamps — uma desmarcação
// simples seria "ressuscitada" no próximo import do parceiro.
export interface SyncData {
  ale: string[];
  dea: string[];
}

export function exportSyncData(): SyncData {
  return { ale: [...store.done.ale], dea: [...store.done.dea] };
}

export function mergeFromPeer(data: SyncData): { ale: number; dea: number } {
  const added = { ale: 0, dea: 0 };
  (['ale', 'dea'] as Profile[]).forEach((p) => {
    for (const id of data[p] ?? []) {
      if (!store.done[p].includes(id)) {
        store.done[p].push(id);
        added[p]++;
      }
    }
  });
  save();
  return added;
}
