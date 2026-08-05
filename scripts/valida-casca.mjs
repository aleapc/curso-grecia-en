#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// G20 — A CASCA DO APP
//
// Oitava vez que o clone morde, e a primeira que morde o COMPRADOR na cara: os
// dez cursos não-Espanha abriam a aba do navegador escrevendo
// «¡Dime! · Spain survival Spanish». Marca espanhola e destino errado, no
// <title>, na meta description, no nome do app instalado e na tela de bloqueio
// do telefone (a media session dizia «Dime Spanish» tocando áudio turco).
// Dois desses cursos já tinham ido ao ar assim.
//
// E junto veio um defeito de DADOS, que é o que este portão mais protege.
// Todos os cursos servem de `aleapc.github.io/<curso>/` — **mesma origem**, e
// localStorage é por ORIGEM, não por caminho. As chaves eram `es-state`,
// `es-modo` e `es-pausa`, idênticas em todos os SKUs da mesma língua-guia, de
// modo que quem fazia França lia e sobrescrevia o progresso de quem fazia
// Espanha. O comentário no próprio código já avisava do domínio compartilhado,
// mas só protegia contra OUTROS PWAs — nunca contra os cursos irmãos.
//
// Nenhum build reclamava de nada disso, porque tudo compila.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = basename(root);
const destino = (/^curso-([a-z]+)/.exec(pasta) || [, ''])[1];

// Como cada destino se chama nas línguas do catálogo. Serve para detectar a
// menção a um destino que NÃO é o desta worktree.
const NOMES = {
  espanha: ['Spain', 'Spanien', 'Espagne', 'Spagna', 'España'],
  mexico: ['Mexico', 'Mexiko', 'Mexique', 'Messico', 'México'],
  franca: ['France', 'Frankreich', 'Francia'],
  italia: ['Italy', 'Italien', 'Italie', 'Italia'],
  grecia: ['Greece', 'Griechenland', 'Grèce', 'Grecia'],
  turquia: ['Türkiye', 'Türkei', 'Turquie', 'Turchia', 'Turkey'],
  portugal: ['Portugal', 'Portogallo']
};

const erros = [];
const ler = (...p) => (existsSync(join(root, ...p)) ? readFileSync(join(root, ...p), 'utf8') : '');

// ── 1. a casca nomeia OUTRO destino? ────────────────────────────────────────
//
// TODA ROTA CONTA, e não só o cabeçalho. A primeira versão deste portão olhava
// `app.html` e `+layout.svelte`, e por isso deixou passar a HOME: quatro cursos
// foram publicados com «¡Hola! 👋 — Survival Spanish and culture for Spain» na
// primeira tela, um deles ensinando grego. Foi achado abrindo o site publicado,
// não rodando portão — a lição é que a casca não é o topo da página, é tudo o
// que o comprador lê antes de começar a estudar.
// SÓ O QUE É RENDERIZADO CONTA. Este portão pergunta «o que o comprador LÊ na
// tela», então código e comentário ficam de fora — o próprio comentário que
// explica este bug menciona a Türkiye, e a primeira versão acusou os catorze
// cursos por causa dele. Portão que acusa a própria documentação é portão que
// se aprende a ignorar.
const semCodigo = (s) =>
  s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

const rotas = [];
const varre = (dir) => {
  for (const f of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${f.name}`;
    if (f.isDirectory()) varre(rel);
    else if (f.name.endsWith('.svelte')) rotas.push(semCodigo(readFileSync(join(root, rel), 'utf8')));
  }
};
try {
  varre('src/routes');
} catch {
  /* sem rotas: nada a varrer */
}
const app = ler('src', 'app.html');
const cabecalho = app + '\n' + rotas.join('\n');
// O PAÍS DO COMPRADOR NÃO É «OUTRO DESTINO». O curso IT → Espanha diz, com razão,
// «Spagna e Italia usano l'euro: non serve alcuna conversione» — a Itália ali é a
// CASA de quem compra, não um destino trocado. A primeira versão deste portão
// acusava essa frase, que é justamente o tipo de falso positivo que ensina a
// ignorar portão.
const CASA_DO_COMPRADOR = { de: 'alemanha', fr: 'franca', it: 'italia' };
const buyerLang = (/buyerLang:\s*'([a-z-]+)'/.exec(ler('src', 'lib', 'curso.config.ts')) || [])[1];
const casa = CASA_DO_COMPRADOR[buyerLang];

for (const [d, nomes] of Object.entries(NOMES)) {
  if (d === destino || d === casa) continue;
  for (const n of nomes) {
    // fronteira de palavra à mão: `Italia` não pode casar dentro de `Italiano`
    const re = new RegExp(`(^|[^\\p{L}])${n}([^\\p{L}]|$)`, 'u');
    if (re.test(cabecalho))
      erros.push(
        `a casca do app menciona "${n}" — este SKU é de destino "${destino}". ` +
          `Título, descrição e cabeçalho falam com o COMPRADOR e são a primeira coisa que ele lê.`
      );
  }
}

// ── 2. chave de localStorage sem namespace ──────────────────────────────────
// O `LEGADO` é a única exceção legítima: existe só para migrar o dado antigo.
const SEM_NAMESPACE = /'(es|de|fr|it|en|pt|tr|el)-(state|modo|pausa)'/g;
for (const rel of [
  ['src', 'lib', 'state.svelte.ts'],
  ['src', 'lib', 'components', 'EpisodioPlayer.svelte']
]) {
  const txt = ler(...rel);
  for (const linha of txt.split('\n')) {
    if (linha.includes('LEGADO')) continue;
    const m = linha.match(SEM_NAMESPACE);
    if (m)
      erros.push(
        `${rel.join('/')}: chave de localStorage ${m[0]} sem o SKU. Todos os cursos servem ` +
          `da MESMA origem (aleapc.github.io) — sem namespace, um curso sobrescreve o ` +
          `progresso do outro.`
      );
  }
}

// ── 3. o sku existe e bate com a pasta ──────────────────────────────────────
const cfg = ler('src', 'lib', 'curso.config.ts');
const sku = (/sku:\s*'([^']+)'/.exec(cfg) || [])[1];
if (!sku) erros.push('curso.config.ts não declara `sku` — é ele que dá o namespace de armazenamento.');
else if (sku !== pasta) erros.push(`curso.config.ts declara sku "${sku}" e a worktree é "${pasta}".`);

console.log(`\nvalida-casca · ${pasta} · destino "${destino}" · sku "${sku || '—'}"\n`);
const titulo = (/<title>([^<]*)<\/title>/.exec(app) || [])[1] || '(sem título)';
console.log(`  título: ${titulo}`);
if (erros.length) {
  console.log(`\n  ${erros.length} DEFEITO(S) NA CASCA:\n`);
  for (const e of erros) console.log(`  ✗ ${e}`);
  console.log('');
  process.exit(1);
}
console.log('\n  ✓ a casca fala do destino certo e o armazenamento é só deste SKU.\n');
