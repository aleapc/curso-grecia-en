#!/usr/bin/env node
// GERA O ÍNDICE DO CURSO a partir dos episódios e do contrato de slots.
//
//   node scripts/gera-outline.mjs            → reescreve src/lib/course/outline.gen.ts
//   node scripts/gera-outline.mjs --conferir → só verifica; sai 1 se estiver desatualizado
//
// POR QUE ISTO EXISTE. O título de uma parte vivia em DOIS lugares: no próprio
// `ep-*.json` e, copiado à mão, no `index.ts`. Duas canônicas para a mesma string
// é o defeito que este projeto já cometeu três vezes — o rótulo de consumo entre
// o PRODUTO.md e o slots.json, o id de molde entre a GRADE e o moldes.json, e
// este. Nas três, nenhum script conferia, e a divergência ficaria errada em
// silêncio: aqui, duas partes reescritas apareceriam na tela com o título antigo
// e duas partes novas não apareceriam de jeito nenhum.
//
// A ORDEM também deixa de ser digitada: vem do contrato (slots.json), que é onde
// a ordem das 36 partes é lei. Uma parte nova entra no lugar certo do índice no
// instante em que declara o slot dela — sem ninguém editar lista nenhuma.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname , basename} from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'lib', 'course');
const alvo = join(dir, 'outline.gen.ts');
const CONFERIR = process.argv.includes('--conferir');

const contrato = JSON.parse(readFileSync(join(dir, 'slots.json'), 'utf8'));
const ordemDoSlot = new Map(contrato.slots.map((s, i) => [s.id, i]));

// Cor e descrição são apresentação, não conteúdo — ficam aqui, únicas por módulo.
// O nome do destino NÃO é literal aqui, e essa é a correção. Ele sai da pasta,
// que é a única camada que o clone não consegue falsificar: curso-<destino>-<lg>.
// Antes havia «The Spanish that gets the day done» fixo neste arquivo, em OITO
// cursos — e como isto é um GERADOR, a string se reescrevia sozinha a cada
// `npm run outline`, inclusive por cima de correções feitas à mão.
const _pasta = basename(root);
const _destino = (/^curso-([a-z]+)/.exec(_pasta) || [, ''])[1];
const _lingua = (/^curso-([a-z]+)-([a-z]{2})$/.exec(_pasta) || [])[2] || 'en';
const NOME_DA_LINGUA = {
  espanha: 'Spanish', mexico: 'Spanish', franca: 'French', italia: 'Italian',
  grecia: 'Greek', turquia: 'Turkish', portugal: 'Portuguese', alemanha: 'German'
};
const NOME_DA_LINGUA_DE = {
  espanha: 'Spanisch', mexico: 'Spanisch', franca: 'Französisch', italia: 'Italienisch',
  grecia: 'Griechisch', turquia: 'Türkisch', portugal: 'Portugiesisch', alemanha: 'Deutsch'
};
const _lg = _lingua === 'de'
  ? (NOME_DA_LINGUA_DE[_destino] || _destino)
  : (NOME_DA_LINGUA[_destino] || _destino);

const APRESENTACAO = _lingua === 'de' ? {
  basico: {
    nome: 'Grundstufe · Zurechtkommen',
    descricao: `Das ${_lg}, mit dem Sie durch den Tag kommen: ankommen, bestellen, bezahlen, sich bewegen und um Hilfe bitten.`,
    cor: 'terracota'
  },
  intermediario: {
    nome: 'Mittelstufe · Das Gute mitnehmen',
    descricao: 'Essen Sie dort, wo sie essen, wann sie essen, zu dem Preis, den sie zahlen.',
    cor: 'oliva'
  },
  avancado: {
    nome: 'Oberstufe · Den Raum lesen',
    descricao: 'Der Humor, der Stolz, der alte Streit — und was ihr Schweigen bedeutet.',
    cor: 'indigo'
  }
} : {
  basico: {
    nome: 'Basic · Get by',
    descricao: `The ${_lg} that gets the day done: arriving, ordering, paying, moving, and getting help.`,
    cor: 'terracota'
  },
  intermediario: {
    nome: 'Intermediate · Get the good stuff',
    descricao: 'Eat where they eat, when they eat, at the price they pay.',
    cor: 'oliva'
  },
  avancado: {
    nome: 'Advanced · Read the room',
    descricao: 'The humour, the pride, the old argument, and what their silence means.',
    cor: 'indigo'
  }
};

const partes = [];
for (const f of readdirSync(dir).filter((x) => /^ep-.*\.json$/.test(x))) {
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (!j.slot && !j.dissolveEm) continue;
  partes.push(j);
}

// PARTE EM TRÂNSITO CONTINUA NO ÍNDICE, e a razão é o aluno, não a arquitetura.
// O conteúdo dela está sendo repartido entre slots que ainda estão sendo
// escritos — mas ele existe hoje, está gravado hoje e alguém pode estar ouvindo
// hoje. Tirá-la do índice no começo da obra encolheria o curso publicado de 24
// para 17 partes e roubaria do aluno sete aulas que ninguém substituiu ainda.
// Ela sai sozinha do índice no dia em que o arquivo for apagado, que é o dia em
// que o conteúdo já está no destino. Durante a janela há alguma duplicação —
// e duplicar é o erro barato; o caro é o buraco.
const ordem = (p) =>
  p.slot ? (ordemDoSlot.get(p.slot) ?? 900) : 1000 + (typeof p.numero === 'number' ? p.numero : 0);
partes.sort((a, b) => ordem(a) - ordem(b));

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

let out = `import type { ModuloOutline } from '../types';

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  ARQUIVO GERADO — não edite à mão.                                       │
// │  Fonte: os ep-*.json (título) + slots.json (ordem e módulo).             │
// │  Regenerar: npm run outline   ·   Conferir: npm run outline:conferir     │
// │                                                                          │
// │  O título vivia aqui E no episódio. Duas canônicas para a mesma string   │
// │  é o defeito que fez duas partes reescritas aparecerem na tela com o     │
// │  título antigo e duas partes novas não aparecerem. Agora deriva.         │
// └──────────────────────────────────────────────────────────────────────────┘

export const outline: ModuloOutline[] = [
`;

for (const mod of contrato.modulos) {
  const doMod = partes.filter((p) => p.nivel === mod.id);
  if (!doMod.length) continue;
  const ap = APRESENTACAO[mod.id];
  out += `  {\n    nivel: '${mod.id}',\n    nome: '${esc(ap.nome)}',\n    descricao: '${esc(ap.descricao)}',\n    cor: '${ap.cor}',\n    licoes: [\n`;
  for (const p of doMod) {
    // `pronta` = tem áudio de verdade. Quem decide é o disco, não uma flag
    // digitada: uma parte marcada pronta sem mp3 toca silêncio no app.
    out += `      { id: '${p.id}', titulo: '${esc(p.titulo)}', pronta: true },\n`;
  }
  out += `    ]\n  },\n`;
}
out += `];\n`;

// ── quais cards TÊM imagem ──────────────────────────────────────────────────
//
// A home renderiza `img/{id}.webp` e esconde a tag no `onerror`, então card sem
// foto degrada para o emoji sobre degradê — não quebra. Mas pede o arquivo do
// mesmo jeito, e depois da reestruturação isso virou 21 requisições 404 por
// visita, para arquivos que ninguém vai criar tão cedo.
//
// Exportar o conjunto resolve os dois lados: a home só pede o que existe, e
// quem for produzir as imagens tem a lista do que falta sem precisar deduzir do
// agrupamento da tela.
const imgDir = join(root, 'static', 'img');
const comImagem = existsSync(imgDir)
  ? readdirSync(imgDir)
      .filter((f) => /\.(webp|png|jpg|jpeg)$/i.test(f))
      .map((f) => f.replace(/\.[^.]+$/, ''))
      .sort()
  : [];
out += `\n// Gerado de static/img/ — a home só pede imagem que existe.\nexport const COM_IMAGEM = new Set(${JSON.stringify(comImagem)});\n`;

if (CONFERIR) {
  const atual = readFileSync(alvo, 'utf8');
  if (atual === out) {
    console.log(`\n✓ outline.gen.ts em dia · ${partes.length} partes\n`);
    process.exit(0);
  }
  console.log('\n✗ outline.gen.ts DESATUALIZADO em relação aos episódios.');
  console.log('  Um título mudou, uma parte nasceu ou uma parte saiu, e o índice não acompanhou.');
  console.log('  Rode: npm run outline\n');
  process.exit(1);
}

writeFileSync(alvo, out);
console.log(`\n✓ outline.gen.ts gerado · ${partes.length} partes`);
for (const mod of contrato.modulos) {
  const n = partes.filter((p) => p.nivel === mod.id).length;
  if (n) console.log(`   ${mod.nome_pt.padEnd(12)} ${n}`);
}
console.log();
