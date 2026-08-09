#!/usr/bin/env node
// GERA O ÍNDICE DO MODO CONSULTA a partir dos episódios já gravados.
//
//   node scripts/build-consulta.mjs            → escreve src/lib/course/consulta.json
//   node scripts/build-consulta.mjs --cobertura → só o mapa de folhas × cards
//
// POR QUE ISTO EXISTE, nas palavras do dono: *"uma coisa é progredir do Básico ao
// Avançado nas semanas antes da viagem; outra é estar lá, sentado numa mesa de
// restaurante, consultar o guia."* O treino acaba quando a viagem começa; o modo
// consulta é o que mantém o app no bolso DURANTE a viagem.
//
// O DIFERENCIAL, e ele está inteiro no formato do card: o phrasebook dá a SUA
// fala e te abandona no segundo seguinte, quando o garçom responde. Nós damos a
// **TROCA** — você diz X, ouve Y, responde Z. E a troca já está paga: toda escada
// de escalada autorada nos episódios (o garçom que desmente "un poquito no pasa
// nada, ¿no?", a garçonete que elogia o prato, admite o presunto e ainda entrega
// o caldo de peixe no arroz) hoje é ouvida uma vez e descartada no fim da lição.
// Este script não inventa troca nenhuma: desenterra a que já foi escrita.
//
// COMO UM STEP VIRA CARD: o autor marca `consulta: ["mesa/bebida", ...]` num
// step `responde`. O card nasce desse step e ABSORVE os vizinhos — o `ouvir`
// imediatamente anterior (o que ELE diz antes) e o imediatamente posterior (o que
// ELE responde). É isso que transforma uma frase solta numa troca.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'lib', 'course');
const COBERTURA = process.argv.includes('--cobertura');

// A taxonomia é TS; leio como texto e extraio os ids, para não precisar de build.
const taxSrc = readFileSync(join(root, 'src', 'lib', 'consulta', 'taxonomia.ts'), 'utf8');
// Aspas SIMPLES ou DUPLAS: o rótulo do tile `dieta` é "Can't eat it", com
// apóstrofo, então está entre aspas duplas. Um parser que só aceitasse simples
// perderia o tile inteiro — e perdeu, na primeira execução: a tabela de
// cobertura saiu com 11 tiles e ninguém notaria, porque um tile ausente não
// produz folha vazia, produz silêncio.
const STR = `(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`;
const desescapa = (s) => (s || '').replace(/\\(['"])/g, '$1');

const tiles = [...taxSrc.matchAll(new RegExp(`\\{\\s*id:\\s*'([a-z]+)',\\s*ordem:\\s*(\\d+),\\s*rotulo:\\s*${STR}`, 'g'))].map(
  (m) => ({ id: m[1], ordem: +m[2], rotulo: desescapa(m[3] ?? m[4]) })
);
const folhas = [...taxSrc.matchAll(new RegExp(`\\{\\s*id:\\s*'([a-z]+\\/[a-z0-9-]+)',\\s*tile:\\s*'([a-z]+)',\\s*rotulo:\\s*${STR}(,\\s*reativa:\\s*true)?`, 'g'))].map(
  (m) => ({ id: m[1], tile: m[2], rotulo: desescapa(m[3] ?? m[4]), reativa: !!m[5] })
);
if (tiles.length !== 12)
  throw new Error(
    `A taxonomia tem que ter exatamente 12 tiles (o número é derivação física da tela); o parser achou ${tiles.length}. ` +
      `Se a taxonomia mudou de forma, conserte o parser — não o teto.`
  );
const folhaValida = new Set(folhas.map((f) => f.id));

// Compara por CONTEÚDO, não por pontuação: o modelo nativo e a frase-alvo às
// vezes diferem só numa vírgula ou num «por favor» de cortesia.
const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const erros = [];
const cards = [];

for (const f of readdirSync(dir).filter((x) => /^ep-.*\.json$/.test(x))) {
  const ep = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (ep.dissolveEm) continue; // vai ser apagado; não entra no índice
  const steps = ep.steps || [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const tags = s.consulta;
    if (!Array.isArray(tags) || !tags.length) continue;
    if (s.tipo !== 'responde') {
      erros.push(`${f} ${s.audioKey}: só step "responde" vira card (este é "${s.tipo}")`);
      continue;
    }
    for (const t of tags)
      if (!folhaValida.has(t)) erros.push(`${f} ${s.audioKey}: folha "${t}" não existe na taxonomia`);

    // A TROCA: o que ele diz antes (ouvir anterior), a sua fala, o que ele
    // responde (ouvir seguinte). Os dois vizinhos são opcionais — há cenas em que
    // você abre a conversa e cenas em que ninguém responde nada.
    const turnos = [];
    const antes = steps[i - 1];
    // A GUARDA DO MODELO NATIVO, e ela existe por uma medição: em 88 dos 195
    // primeiros cards o `ouvir` anterior NÃO era a fala do garçom — era o modelo
    // nativo da própria frase-alvo, que é o padrão dominante do corpus (ouvir
    // modelo → responde o mesmo `es`). Absorvido como turno, o card saía com
    // "ele" e "você" dizendo exatamente a mesma frase.
    //
    // Isso não é um card feio: é o card mentindo sobre o que ele é. A TROCA é o
    // diferencial inteiro contra o phrasebook — você diz X, ouve Y, responde Z —
    // e um turno "ele" que repete o "você" transforma a troca em eco.
    const ehModeloDaPropriaFrase = antes && norm(antes.es) === norm(s.es);
    if (antes && antes.tipo === 'ouvir' && !ehModeloDaPropriaFrase)
      turnos.push({ quem: 'ele', es: antes.es, en: antes.pt, audioKey: antes.audioKey });
    turnos.push({
      quem: 'voce',
      es: s.es,
      en: s.pt,
      audioKey: s.audioKey,
      pron: s.pinyin || undefined
    });
    const depois = steps[i + 1];
    if (depois && depois.tipo === 'ouvir')
      turnos.push({ quem: 'ele', es: depois.es, en: depois.pt, audioKey: depois.audioKey });

    cards.push({
      id: s.audioKey,
      folhas: tags.filter((t) => folhaValida.has(t)),
      titulo: s.en || s.pt || s.es,
      troca: turnos,
      info: s.info || undefined,
      aviso: tags.some((t) => folhas.find((x) => x.id === t)?.reativa) || undefined,
      origem: ep.slot || ep.id,
      molde: s.molde || undefined
    });
  }
}

// ── cobertura ───────────────────────────────────────────────────────────────
const porFolha = {};
for (const c of cards) for (const t of c.folhas) (porFolha[t] ??= []).push(c);

if (COBERTURA || !cards.length) {
  console.log(`\nCOBERTURA DO MODO CONSULTA — ${cards.length} cards em ${folhas.length} folhas\n`);
  for (const t of tiles.sort((a, b) => a.ordem - b.ordem)) {
    const doTile = folhas.filter((x) => x.tile === t.id);
    const n = doTile.reduce((a, x) => a + (porFolha[x.id]?.length || 0), 0);
    console.log(`  ${String(t.ordem).padStart(2)}. ${t.id.padEnd(12)} ${String(n).padStart(3)} cards   ${t.rotulo}`);
    for (const x of doTile) {
      const k = porFolha[x.id]?.length || 0;
      const marca = k ? '·' : '✗';
      console.log(`      ${marca} ${x.id.padEnd(28)} ${k || 'VAZIA'}${x.reativa ? '  ⚠' : ''}`);
    }
  }
  const av = cards.filter((c) => c.aviso).length;
  console.log(`\n  cards ⚠ (folha reativa): ${av} de ${cards.length}` + (cards.length ? ` = ${Math.round((av / cards.length) * 100)}% (teto 15%)` : ''));
  console.log('\n  G8 exige: nenhuma folha vazia · tile "simpatia" ≥8 cards · ⚠ ≤15%\n');
  if (COBERTURA) process.exit(0);
}

if (erros.length) {
  console.log(`\n${erros.length} ERRO(S) na marcação de consulta:`);
  erros.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}

writeFileSync(
  join(dir, 'consulta.json'),
  JSON.stringify({ versao: 1, sku: 'EN → Espanha', taxonomia: folhas, tiles, cards }, null, 2) + '\n'
);
console.log(`\n✓ consulta.json gerado · ${cards.length} cards · ${Object.keys(porFolha).length}/${folhas.length} folhas preenchidas\n`);
