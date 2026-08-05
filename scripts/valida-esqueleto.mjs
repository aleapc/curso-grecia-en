#!/usr/bin/env node
// PORTÃO DE RESÍDUO DE ESQUELETO — Kit de Bordo
//
//   node scripts/valida-esqueleto.mjs   → sai 1 se o curso ainda for a Espanha por baixo
//
// POR QUE ISTO EXISTE, e o número que o motivou: em 2026-08-04 uma sessão
// encontrou CINCO defeitos independentes com exatamente a mesma forma — clonar o
// esqueleto de um SKU pronto e trocar só ALGUMAS das camadas:
//
//   1. o roster de moldes do México era o da Espanha, palavra por palavra, com
//      casas apontando para ep-e06a.json e encaixes como «una caña»;
//   2. o áudio do México era gravado em static/audio/mexico/<slot>/ e o app só
//      lê o caminho plano — 806 clipes que nunca tocaram;
//   3. curso-franca-*, curso-grecia-* e curso-italia-* serviam ARTE espanhola;
//   4. curso-espanha ficou 15 imagens atrás das próprias variantes;
//   5. nove worktrees inteiras (franca, grecia, italia, turquia, portugal) são
//      o curso da Espanha com outro nome de pasta: episódios em espanhol,
//      moldes.json dizendo «→ Espanha», manifesto com 2.850 chaves e ZERO mp3.
//
// EM NENHUM DOS CINCO O BUILD RECLAMOU. Todos os portões existentes olham para
// dentro de uma camada e nenhum olha ENTRE camadas — e é exatamente entre elas
// que a herança sobrevive. Este portão cruza a única camada que a equipe mantém
// religiosamente em dia (src/lib/curso.config.ts, que estava certo nos nove
// clones) contra as camadas que ficam para trás.
//
// A pergunta que ele faz, e que vale para todo SKU novo, é uma só:
// «O QUE AQUI AINDA É DA ESPANHA?»

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = basename(root);
const erros = [];
const avisos = [];

const semAcento = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const lerJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

// A pasta é a fonte do par: curso-<destino>-<linguaDoComprador>.
const m = /^curso-([a-z]+)(?:-([a-z]{2}))?$/.exec(pasta);
if (!m) {
  console.log(`\nvalida-esqueleto · pasta "${pasta}" fora do padrão curso-<destino>[-<lingua>] — portão DESLIGADO\n`);
  process.exit(0);
}
const destino = m[1];

// Destino → língua falada no destino. É o cruzamento que pega clone: a config
// já vem certa no clone (foi a camada que trocaram), o conteúdo não.
const LINGUA_DO_DESTINO = {
  espanha: 'es', mexico: 'es', franca: 'fr', italia: 'it',
  grecia: 'el', turquia: 'tr', portugal: 'pt', alemanha: 'de'
};

// ── 1. package.json chama a si mesmo pelo nome certo ─────────────────────────
// Pega o caso mais barato e mais comum: curso-franca-en dizendo "curso-espanha".
const pkg = lerJson(join(root, 'package.json'));
if (pkg && pkg.name && pkg.name !== pasta)
  erros.push(`package.json diz name "${pkg.name}" e a worktree é "${pasta}" — sobra do SKU de origem`);

// ── 2. curso.config.ts aponta para a língua do destino ───────────────────────
const cfgPath = join(root, 'src', 'lib', 'curso.config.ts');
let targetLang = null;
if (existsSync(cfgPath)) {
  const cfg = readFileSync(cfgPath, 'utf8');
  targetLang = (cfg.match(/targetLang:\s*'([a-z-]+)'/) || [])[1] || null;
  const esperada = LINGUA_DO_DESTINO[destino];
  if (targetLang && esperada && targetLang !== esperada)
    erros.push(`curso.config.ts tem targetLang "${targetLang}" e o destino "${destino}" fala "${esperada}"`);
} else {
  avisos.push('src/lib/curso.config.ts não existe — não dá para cruzar destino com conteúdo');
}

// ── 3. o roster de moldes é DESTE par ────────────────────────────────────────
// O roster é ativo de PAR (L1 × destino) e não se traduz — ele se re-deriva.
// Um roster herdado é invisível para todo outro portão: o G9 mede a taxa de
// geração contra ele e passa, medindo o curso errado.
const moldesPath = join(root, 'src', 'lib', 'course', 'moldes.json');
const moldes = lerJson(moldesPath);
if (moldes) {
  const sku = semAcento(moldes.sku || '');
  if (sku && !sku.includes(semAcento(destino)))
    erros.push(`moldes.json declara sku "${moldes.sku}" e este curso é de destino "${destino}" — roster herdado`);
} else if (existsSync(join(root, 'src', 'lib', 'course'))) {
  avisos.push('moldes.json não existe — a taxa de geração (G9) não é medida');
}

// ── 4. o áudio mora no caminho que o app REALMENTE lê ────────────────────────
// src/lib/audio.ts monta `${base}/audio/${key}.mp3`. Subpasta = 404 silencioso.
const audioDir = join(root, 'static', 'audio');
let mp3s = 0;
if (existsSync(audioDir)) {
  const subpastas = [];
  for (const e of readdirSync(audioDir)) {
    const p = join(audioDir, e);
    if (statSync(p).isDirectory()) subpastas.push(e);
    else if (e.endsWith('.mp3')) mp3s++;
  }
  if (subpastas.length)
    erros.push(
      `static/audio tem subpasta(s) [${subpastas.join(', ')}] — o app lê static/audio/<chave>.mp3 e nada dentro delas toca`
    );

  // ── 5. manifesto cheio + disco vazio = clone ────────────────────────────────
  const manPath = join(audioDir, 'manifest.json');
  const man = lerJson(manPath);
  const chaves = man ? Object.keys(man).length : 0;
  if (chaves > 0 && mp3s === 0)
    erros.push(
      `manifesto de áudio com ${chaves} chaves e ZERO mp3 no disco — o manifesto veio do SKU de origem`
    );
}

// ── 6. pontuação espanhola em curso que não é de espanhol ────────────────────
// ¿ e ¡ são exclusivos do espanhol. Num curso de destino francês, italiano,
// grego, turco ou português, encontrá-los numa frase-alvo é prova de que o
// conteúdo nunca foi trocado. É o teste mais barato e o de maior sinal do
// arquivo: teria pegado os cinco clones de uma vez.
const cursoDir = join(root, 'src', 'lib', 'course');
if (targetLang && targetLang !== 'es' && existsSync(cursoDir)) {
  const suspeitos = [];
  for (const f of readdirSync(cursoDir).filter((x) => /^ep-.*\.json$/.test(x))) {
    const j = lerJson(join(cursoDir, f));
    for (const s of j?.steps || []) {
      const alvo = s.es ?? s[targetLang] ?? '';
      if (/[¿¡]/.test(String(alvo))) { suspeitos.push(`${f}: "${String(alvo).slice(0, 40)}"`); break; }
    }
  }
  if (suspeitos.length)
    erros.push(
      `${suspeitos.length} episódio(s) com pontuação espanhola (¿ ¡) num curso de "${targetLang}" — conteúdo da Espanha não substituído\n` +
        suspeitos.slice(0, 3).map((s) => '        ' + s).join('\n')
    );
}

// ════════════════════════════════════════════════════════════════════════════
// A SEGUNDA METADE DO PORTÃO: A CAMADA DE ORIGEM
//
// Os seis testes acima conferem o DESTINO e foram escritos olhando para os
// cinco clones de 2026-08-04. Em 2026-08-05, ao derivar DE→Itália a partir de
// EN→Itália, o mesmo padrão apareceu uma camada adiante e passou por todos
// eles: o destino estava perfeito — italiano correto, roster certo, 551 mp3
// no caminho certo — e a ORIGEM inteira era a do irmão. moldes.json dizia
// «EN → Itália» e as 531 narrações estavam em inglês sob vozes alemãs, que é
// literalmente o acidente dos 460 clipes que originou o G14.
//
// Passou porque o G14 depende dos pacotes pré-áudio em docs/content-<destino>/,
// que num SKU recém-derivado ainda não existem: sem jobs, zero divergências,
// portão verde. Um portão que só funciona depois de o trabalho estar feito não
// protege a derivação, que é justamente quando o erro entra.
//
// Estes dois testes leem o EPISÓDIO, que existe desde o primeiro minuto.
// ════════════════════════════════════════════════════════════════════════════
const buyerLang = existsSync(cfgPath)
  ? (readFileSync(cfgPath, 'utf8').match(/buyerLang:\s*'([a-z-]+)'/) || [])[1] || null
  : null;
const linguaDaPasta = m[2] || null;

if (buyerLang && linguaDaPasta && buyerLang !== linguaDaPasta)
  erros.push(`curso.config.ts tem buyerLang "${buyerLang}" e a worktree é "-${linguaDaPasta}" — config do SKU de origem`);

// ── 7. o roster nomeia a ORIGEM certa, não só o destino ──────────────────────
// O teste 3 pergunta «é do destino certo?». Um roster copiado do SKU irmão
// responde que sim e continua errado: o roster é ativo de PAR, e o par tem
// duas pontas.
if (moldes && moldes.sku && linguaDaPasta) {
  const sku = semAcento(moldes.sku);
  const origem = sku.split(/->|→/)[0] || '';
  if (origem && !origem.includes(linguaDaPasta))
    erros.push(
      `moldes.json declara sku "${moldes.sku}" e a origem desta worktree é "${linguaDaPasta}" — roster do SKU irmão`
    );
}

// ── 8. a narração está na língua do COMPRADOR ────────────────────────────────
// O G14 faz esta pergunta sobre os jobs de áudio; aqui ela é feita sobre o
// texto, que existe antes de qualquer job. Palavras-função são o sinal barato:
// elas são frequentes, curtas e não atravessam língua por acaso.
const FUNCIONAIS = {
  en: /\b(the|you|your|and|that|this|with|what|when|they|is not|does not)\b/gi,
  de: /\b(der|die|das|und|nicht|Sie|dass|mit|ist|dem|den|ein|eine|sich|auch|noch|aber)\b/g,
  fr: /\b(le|la|les|des|vous|et|que|qui|pas|avec|c'est|dans|pour)\b/gi,
  it: /\b(il|lo|la|gli|che|non|con|per|una|del|sono|questo)\b/gi,
  pt: /\b(o|a|os|as|que|não|com|para|uma|do|isso|você)\b/gi
};
if (buyerLang && FUNCIONAIS[buyerLang] && existsSync(cursoDir)) {
  const conta = (re, t) => ((t.match(new RegExp(re.source, re.flags)) || []).length);
  let narracao = '';
  for (const f of readdirSync(cursoDir).filter((x) => /^ep-.*\.json$/.test(x))) {
    const j = lerJson(join(cursoDir, f));
    for (const s of j?.steps || []) {
      // só voz-guia: é a única que deve falar a língua do comprador
      if (String(s.voz || '').startsWith('guide_') && s.pt) narracao += ' ' + s.pt;
      if (String(s.promptVoz || '').startsWith('guide_') && s.promptPt) narracao += ' ' + s.promptPt;
    }
  }
  if (narracao.trim().length > 500) {
    const meu = conta(FUNCIONAIS[buyerLang], narracao);
    const intrusos = Object.entries(FUNCIONAIS)
      .filter(([lg]) => lg !== buyerLang && lg !== targetLang)
      .map(([lg, re]) => [lg, conta(re, narracao)])
      .sort((a, b) => b[1] - a[1]);
    const [lgIntruso, nIntruso] = intrusos[0] || [null, 0];
    if (lgIntruso && nIntruso > meu * 2 && nIntruso > 30)
      erros.push(
        `a narração de voz-guia parece estar em "${lgIntruso}" e o comprador deste SKU fala "${buyerLang}" ` +
          `(${nIntruso} palavras-função de ${lgIntruso} contra ${meu} de ${buyerLang}) — ` +
          'é o acidente dos 460 clipes: texto do SKU irmão sob as vozes deste'
      );
  }
}

// ── 9. a frase-alvo está no ALFABETO do destino ──────────────────────────────
// Só vale para destino de escrita não-latina, e ali é o teste de resíduo mais
// forte que existe: uma frase-alvo em alfabeto latino num curso de grego é ou
// sobra do SKU de origem, ou — o caso mais provável e mais insidioso —
// TRANSLITERAÇÃO escrita no campo errado. «Póso káni» no lugar de «Πόσο κάνει»
// passa por todos os outros portões: o texto existe, o áudio grava, o build fica
// verde, e o aluno recebe um curso que nunca lhe mostra a palavra que ele vai
// ter que reconhecer numa placa. A transliteração tem um campo próprio (pinyin);
// o campo `es` é a língua escrita como ela é escrita.
const ESCRITA = {
  el: { re: /[Ͱ-Ͽἀ-῿]/, nome: 'grego' },
  ru: { re: /[Ѐ-ӿ]/, nome: 'cirílico' },
  ar: { re: /[؀-ۿ]/, nome: 'árabe' },
  he: { re: /[֐-׿]/, nome: 'hebraico' },
  th: { re: /[฀-๿]/, nome: 'tailandês' },
  ja: { re: /[぀-ヿ一-鿿]/, nome: 'japonês' },
  zh: { re: /[一-鿿]/, nome: 'chinês' }
};
if (targetLang && ESCRITA[targetLang] && existsSync(cursoDir)) {
  const { re, nome } = ESCRITA[targetLang];
  const latinas = [];
  for (const f of readdirSync(cursoDir).filter((x) => /^ep-.*\.json$/.test(x))) {
    const j = lerJson(join(cursoDir, f));
    for (const s of j?.steps || []) {
      const alvo = String(s.es ?? '').trim();
      // só passos de voz-alvo; a narração-guia é latina por definição
      if (!alvo || !String(s.voz || '').startsWith('target_')) continue;
      if (!re.test(alvo)) {
        latinas.push(`${f} ${s.audioKey || ''}: "${alvo.slice(0, 44)}"`);
        break;
      }
    }
  }
  if (latinas.length)
    erros.push(
      `${latinas.length} episódio(s) com frase-alvo FORA do alfabeto ${nome} — ou é sobra do SKU de ` +
        `origem, ou é transliteração no campo errado (ela vai em "pinyin", não em "es")\n` +
        latinas.slice(0, 3).map((s) => '        ' + s).join('\n')
    );
}

// ── saída ────────────────────────────────────────────────────────────────────
console.log(
  `\nvalida-esqueleto · ${pasta} · ${buyerLang ?? '—'} → destino "${destino}" ` +
    `(alvo "${targetLang ?? '—'}") · ${mp3s} mp3`
);

if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s):`);
  avisos.forEach((a) => console.log('  ⚠ ' + a));
}

if (erros.length) {
  console.log(`\n${erros.length} RESÍDUO(S) DE ESQUELETO:`);
  erros.forEach((e) => console.log('  ✗ ' + e));
  console.log('\nUm SKU novo nasce copiando outro. A pergunta é sempre: o que aqui ainda é da Espanha?\n');
  process.exit(1);
}

console.log('\n✓ nenhum resíduo do SKU de origem.\n');
