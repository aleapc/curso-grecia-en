// Sincronização entre os dois celulares do casal, sem servidor: as lições
// concluídas (dos dois perfis) viram um código curto que viaja pelo WhatsApp.
// Quem recebe cola o código (ou abre o link /sync#s=...) e o app funde por
// união — trocar nos dois sentidos deixa os aparelhos iguais. Prefixo: TH1.

import { exportSyncData, mergeFromPeer, type SyncData } from './state.svelte';
import { base } from '$app/paths';

interface Payload {
  v: 1;
  a: string[];
  b: string[];
}

function b64uEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64uDecode(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
}

export function encodeSync(): string {
  const d = exportSyncData();
  const payload: Payload = { v: 1, a: d.ale, b: d.dea };
  return 'ES1.' + b64uEncode(JSON.stringify(payload));
}

export function decodeSync(code: string): SyncData | null {
  try {
    // Input não confiável (viaja por WhatsApp): cap de tamanho + validação de
    // tipo dos DOIS lados + saneamento dos elementos. Sem isto, um código
    // adulterado (b como string/número, elementos não-string) poluía o
    // progresso persistido ou lançava fora do try da página de sync.
    if (code.length > 10_000) return null;
    const m = code.trim().match(/ES1.([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const p = JSON.parse(b64uDecode(m[1])) as Payload;
    if (p.v !== 1 || !Array.isArray(p.a) || !Array.isArray(p.b ?? [])) return null;
    const limpa = (arr: unknown[]) =>
      arr.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 40);
    return { ale: limpa(p.a), dea: limpa(p.b ?? []) };
  } catch {
    return null;
  }
}

/** Decodifica e funde. Retorna o que entrou de novo, ou null se o código for inválido. */
export function importSync(code: string): { ale: number; dea: number } | null {
  const data = decodeSync(code);
  if (!data) return null;
  return mergeFromPeer(data);
}

export function shareUrl(code: string): string {
  return `https://aleapc.github.io${base}/sync#s=${code}`;
}

export function whatsappUrl(code: string): string {
  // O link abre no NAVEGADOR (não no PWA instalado — storage separado no iOS!),
  // então a mensagem manda também o código puro pra colar dentro do app.
  const text =
    `📚 *Ορίστε!* — my progress!\n` +
    `Copy this code and paste it into the Ορίστε! app (home → Sync → Paste):\n\n` +
    `${code}\n\n` +
    `(or open ${shareUrl(code)} and it will walk you through)`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
