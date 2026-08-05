#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// G18 — ARTE DE OUTRO DESTINO
//
// O sétimo caso do mesmo acidente, e o primeiro que um portão vai pegar.
//
// A história: um SKU novo nasce copiando outro, e a cópia traz `static/img`
// junto. O app monta `src="{base}/img/{slot}.webp"`, então o arquivo existe, a
// página renderiza, o build fica verde e ninguém percebe que o curso de Istambul
// está mostrando uma foto de Madri. Já aconteceu com a França, a Grécia, a
// Itália, o México, a Türkiye e Portugal — e no México ainda aconteceu ao
// contrário, com 33 PNGs de arte PRÓPRIA que o app nunca lia porque o nome do
// arquivo não era o do slot.
//
// A REGRA, e ela é a mesma do áudio nativo: **arte é ativo de DESTINO**.
// Dois SKUs do mesmo destino PODEM e DEVEM compartilhar a arte byte a byte —
// EN→Espanha e DE→Espanha mostram a mesma Espanha, e reilustrar seria queimar
// dinheiro. Dois SKUs de destinos DIFERENTES nunca podem: se o arquivo é
// idêntico, a arte é de outro país.
//
// Comparar por HASH e não por nome é o ponto. Todos os casos reais passaram
// pelo teste do nome — `b06.webp` existia em todos eles.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raiz = join(root, '..');
const pasta = basename(root);
const destino = (/^curso-([a-z]+)/.exec(pasta) || [, ''])[1];

const SLOTS = [
  ...Array.from({ length: 18 }, (_, i) => `b${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, i) => `i${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, i) => `a${String(i + 1).padStart(2, '0')}`)
];

const hash = (p) => (existsSync(p) ? createHash('md5').update(readFileSync(p)).digest('hex') : null);

// ── PROCEDÊNCIA: quem é o dono, segundo a ponte ─────────────────────────────
//
// Comparar hash entre dois cursos diz que há colisão, não diz quem copiou de
// quem — a primeira versão deste portão acusou a Espanha de usar arte da
// Türkiye, quando era o contrário. A verdade está na ponte de imagens: um
// arquivo em `entregues/destino-<X>/` foi gerado PARA o destino X.
//
// Sem a ponte montada o portão não inventa culpado: rebaixa a acusação a aviso.
const PONTE = 'E:/dev-d/kit-imagens/entregues';
const dono = new Map(); // hash → destino que encomendou
let ponteViva = false;
try {
  for (const d of readdirSync(PONTE)) {
    const m = /^destino-([a-z]+)$/.exec(d);
    if (!m) continue;
    ponteViva = true;
    for (const f of readdirSync(join(PONTE, d))) {
      if (!f.endsWith('.webp')) continue;
      const h = hash(join(PONTE, d, f));
      if (h && !dono.has(h)) dono.set(h, m[1]);
    }
  }
} catch { /* ponte ausente: seguimos sem procedência */ }

// ── o acervo dos IRMÃOS DE OUTRO DESTINO ────────────────────────────────────
const alheio = new Map(); // hash → "curso (slot)"
let vizinhos = 0;
for (const d of readdirSync(raiz)) {
  if (!d.startsWith('curso-') || d === pasta) continue;
  const dest = (/^curso-([a-z]+)/.exec(d) || [, ''])[1];
  if (dest === destino) continue; // mesmo destino: compartilhar é o desenho
  vizinhos++;
  for (const s of SLOTS) {
    const h = hash(join(raiz, d, 'static', 'img', `${s}.webp`));
    if (h && !alheio.has(h)) alheio.set(h, `${d} (${s})`);
  }
}

const erros = [];
const colisoes = [];
const avisos = [];
let proprias = 0;
for (const s of SLOTS) {
  const p = join(root, 'static', 'img', `${s}.webp`);
  const h = hash(p);
  if (!h) { avisos.push(s); continue; }
  const encomendadaPor = dono.get(h);
  const vizinho = alheio.get(h);
  if (encomendadaPor && encomendadaPor !== destino) {
    erros.push(
      `${s}.webp foi encomendada para o destino "${encomendadaPor}" e está servindo "${destino}"` +
        (vizinho ? ` — mesma imagem em ${vizinho}` : '')
    );
  } else if (encomendadaPor === destino) {
    proprias++;
  } else if (vizinho) {
    colisoes.push(`${s}.webp é byte a byte igual à de ${vizinho}, e a ponte não registra dona`);
  } else {
    proprias++;
  }
}

// ── arquivos que o app nunca vai ler ─────────────────────────────────────────
// O outro lado do mesmo acidente: arte própria, gravada e paga, com nome que o
// app não procura. No México foram 33 PNGs invisíveis.
const orfas = [];
const dirImg = join(root, 'static', 'img');
if (existsSync(dirImg)) {
  for (const f of readdirSync(dirImg)) {
    const m = /^(.+)\.webp$/.exec(f);
    if (m && !SLOTS.includes(m[1])) orfas.push(f);
  }
}

console.log(
  `\nvalida-arte · ${pasta} · destino "${destino}" · ${vizinhos} SKU(s) de outro destino no acervo` +
    ` · procedência ${ponteViva ? `da ponte (${dono.size} imagens)` : 'INDISPONÍVEL'}\n`
);
console.log(`  próprias ......... ${proprias}/36`);
console.log(`  DE OUTRO DESTINO . ${erros.length}`);
if (colisoes.length) console.log(`  colisões ......... ${colisoes.length}   (sem procedência: aviso, não erro)`);
console.log(`  ausentes ......... ${avisos.length}${avisos.length ? '   ' + avisos.join(' ') : ''}`);
if (orfas.length)
  console.log(
    `  órfãs ............ ${orfas.length}   ${orfas.join(' ')}\n` +
      `                     (o app pede img/<slot>.webp e nunca vai ler estas)`
  );

// ESTE PORTÃO NÃO BLOQUEIA O BUILD, e a escolha é deliberada. Arte errada tem de
// impedir PUBLICAR, não impedir construir e testar: travar o `build` de cinco
// cursos até a estação Mac entregar imagem pararia o trabalho em tudo o mais —
// conteúdo, áudio, portões — que não depende dela em nada. Sem `--estrito` ele
// grita e devolve zero; com `--estrito`, reprova. É o `--estrito` que roda antes
// de publicar.
const estrito = process.argv.includes('--estrito');

if (erros.length) {
  console.log('\nARTE DE OUTRO DESTINO:');
  for (const e of erros) console.log(`  ✗ ${e}`);
  console.log(
    '\nArte é ativo de DESTINO, igual ao áudio nativo. Dois SKUs do mesmo destino\n' +
      'devem compartilhá-la byte a byte; dois SKUs de destinos diferentes, nunca.\n' +
      (estrito ? '' : 'NÃO PUBLICAR assim. Rode com --estrito para tratar isto como reprovação.\n')
  );
}
if (avisos.length)
  console.log(`\n⚠ ${avisos.length} slot(s) sem arte — o app vai mostrar imagem quebrada.\n`);
if (estrito && (erros.length || avisos.length)) process.exit(1);
if (erros.length || avisos.length) process.exit(0);
console.log('\n✓ toda a arte é do destino certo.\n');
