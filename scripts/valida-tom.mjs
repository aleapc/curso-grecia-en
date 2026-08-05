#!/usr/bin/env node
// PORTÃO DE TOM — Kit de Bordo
//
//   node scripts/valida-tom.mjs             → os portões G1–G16; sai 1 se algum falhar
//   node scripts/valida-tom.mjs --outline   → o gate da fase de SYLLABUS: roda o G1 sobre
//                                             src/lib/course/index.ts, ANTES de existir roteiro
//   node scripts/valida-tom.mjs --relatorio → mede e imprime, nunca falha (fita métrica do retrofit)
//
// POR QUE ISTO EXISTE. Pedimos toda a pesquisa dos destinos em cima de "perrengue",
// "golpe" e "multa", e criamos uma régua de severidade. O pipeline inteiro foi
// otimizado para o PERIGO e o conteúdo herdou a lente do medo, sem ninguém decidir
// isso: moldura defensiva no título — Hablá 14% · Shuō! 21% · Phûut! 29% · ¡Dime! 46%.
// Nas 252 frases-alvo do ¡Dime!, a ÚNICA fala de apreciação que o aluno produz é
// "¿Qué me recomienda?". Zero elogio, zero brinde, zero puxar conversa.
//
// O produto prepara para GOSTAR do destino, não só para sobreviver a ele. Deriva de
// tom não se corrige relendo — se corrige medindo, e antes de gravar, porque depois
// de gravado o custo vira crédito queimado.
//
// OS PORTÕES QUE MORAM AQUI (a tabela canônica é PRODUTO §9):
//   G1  moldura de episódio      G2  saldo apetitivo         G3  densidade de produção
//   G4  anti-palestra (média)    G4b anti-palestra (teto)    G5  permissão
//   G6  zero adjetivo de povo    G7  contraexemplo+espelho   G8  cobertura da consulta
//   G9  taxa de geração          G10 encaixe do mundo        G11 whitelist de formas verbais
//   G12 núcleo receptivo         G13 fato com validade       G15 redação do drill
//   G16 anatomia da parte
// G14 (integridade de voz e áudio) NÃO mora aqui: a metade que existe está em
// scripts/valida-audio.mjs, e a checagem voz × língua continua PENDENTE.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { g14 } from './lib/g14-voz-lingua.mjs';
import { achaGentilicos, LINGUAS_G6 } from './lib/g6-gentilico.mjs';
import { collectJobs } from './lib/collect-audio.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'lib', 'course');
const SO_OUTLINE = process.argv.includes('--outline');
const RELATORIO = process.argv.includes('--relatorio');

const erros = [];
const avisos = [];
const medidas = [];

// Números que a linha única do fim (o "IT") imprime. Cada portão deposita o seu.
const IT = {};

// ── A ESCALADA POR PARTE, e por que ela não é frouxidão ─────────────────────
//
// Um retrofit de 36 partes leva seis ondas. Se o portão cobrar de todas desde o
// primeiro dia, a build nasce vermelha com centenas de erros verdadeiros porém
// já conhecidos, e a equipe passa a rodar `build` ignorando a saída — que é como
// se perde um portão para sempre. Mas adiar o portão até o fim é pior: as partes
// NOVAS, escritas justamente agora, ficariam sem cobrança nenhuma no único
// momento em que a cobrança sairia barata.
//
// Então a régua não é global, é por arquivo, e o gatilho é o próprio schema:
//
//   parte com `dissolveEm`      → IGNORADA. Vai ser apagada; cobrar dela é ruído.
//   parte sem `cena`            → LEGADO. Tudo vira aviso. Ainda não foi reescrita.
//   parte com `cena`            → VIGENTE. Tudo vira erro. Ela adotou o schema.
//
// O efeito é que cada parte **entra em vigor sozinha** no instante em que é
// reescrita, sem ninguém lembrar de mexer numa lista, e a build só fica vermelha
// por erro em código que alguém acabou de escrever. Quando a última parte
// ganhar `cena`, o modo estrito já estará ligado de fato, sem nenhuma virada de
// chave — que é a única migração que não é esquecida no meio.
// A reclassificação acontece num PONTO SÓ, no fim, em vez de em cada uma das
// vinte chamadas de `erros.push`. Não é economia de digitação: é que um portão
// escrito amanhã entra na regra sem o autor precisar saber que a regra existe —
// e portão novo escrito por quem não leu esta seção é exatamente o caso que
// quebraria a build no meio da obra. Toda mensagem já nomeia o arquivo, então a
// reclassificação só precisa saber quais arquivos são legado.
const escalonaPorParte = () => {
  const legado = new Set(
    partes.filter((p) => !p.j.cena && !p.j.dissolveEm).map((p) => p.f)
  );
  const morrendo = new Set(partes.filter((p) => p.j.dissolveEm).map((p) => p.f));
  if (!legado.size && !morrendo.size) return { legado, morrendo, movidos: 0, calados: 0 };

  let movidos = 0, calados = 0, agregados = 0;
  const restam = [];
  for (const e of erros) {
    const arq = (e.match(/ep-[\w-]+\.json/) || [])[0];
    if (arq && morrendo.has(arq)) { calados++; continue; }   // vai ser apagado
    if (arq && legado.has(arq)) { avisos.push(e); movidos++; continue; }
    if (!arq && legado.size) {
      // Erro AGREGADO (média do módulo, taxa de geração, contagem de moldura)
      // num curso meio reescrito. Ele mede uma MISTURA — 13 partes novas com 13
      // intocadas — e por isso não tem veredito nenhum a dar: reprovaria mesmo
      // que cada parte nova estivesse perfeita, e passaria a aprovar sozinho
      // conforme as antigas somem, sem ninguém ter melhorado nada. Vira aviso
      // até a última parte ganhar `cena`, e aí volta a valer inteiro — no dia em
      // que a média finalmente significa alguma coisa.
      avisos.push(e + '  (agregado: só vale quando as 36 partes estiverem escritas)');
      agregados++;
      continue;
    }
    restam.push(e);
  }
  erros.length = 0;
  erros.push(...restam);
  return { legado, morrendo, movidos, calados, agregados };
};

// ── a regra de degradação, que vale para TODO portão novo ────────────────────
//
// Um portão que lê um campo que ainda não existe em lugar nenhum NÃO pode
// falhar o build. Se falhar, a build fica vermelha durante a obra inteira e as
// pessoas aprendem a ignorar o vermelho — que é como se perde um portão para
// sempre (é a mesma razão pela qual o validador de estrutura tem modo aviso
// enquanto um módulo travado tiver slot vazio). Então:
//
//   nenhum arquivo usa o campo  → AVISO, com o que precisa ser acrescentado
//   ao menos um já usa          → ERRO em quem não usa: o campo entrou em vigor
//
// `emUso()` é esse interruptor, e é ele que faz o portão nascer desligado e
// ligar sozinho no dia em que o primeiro autor declara o campo.
const emUso = (n) => n > 0;

// ── léxico de perda, e a assimetria que o torna confiável ───────────────────
//
// Um léxico sobre título NUNCA vai ter cobertura. Medido nos 24 títulos do ¡Dime!:
// a leitura humana achou 11 partes defensivas (46%), o léxico achou 3. Os oito que
// escaparam diziam "The con", "mug", "distract", "cost €300 here", "the room that
// doesn't work", "the tip you shouldn't leave" — nenhuma lista fecha isso, porque
// a defensividade está na CENA, não nas palavras.
//
// Então a declaração do autor é a fonte de verdade, e o léxico entra só como
// arame de tropeço, numa direção só:
//
//   declarou 'ganha'  + léxico diz 'protege'  → ERRO   (está escondendo defesa)
//   declarou 'protege'+ léxico diz 'ganha'    → ok     (honesto além do léxico)
//   não declarou                              → ERRO   (omitir não pode ser a saída fácil)
//
// O léxico só ACUSA, nunca ABSOLVE. Assim a cobertura fraca dele nunca vira
// permissão — no máximo deixa passar o que a revisão humana ainda pega.
const LEXICO_PERDA =
  /\b(scam|con\b|con man|rip[- ]?off|rob\w*|mug\w*|pickpocket\w*|theft|stolen|steal|thief|fine[ds]?\b|penalty|penalties|trap\w*|avoid|beware|danger\w*|emergenc\w+|hospital|pharmac\w+|sick|illness|injur\w+|allerg\w+|police|lost|lose|losing|wrong|mistake|overcharg\w*|cheat\w*|fake|refuse|complain\w*|broken|(does ?n[o']t|not) work|problem|trouble|risk\w*|warning|careful|panic|distract\w*|shouldn.?t|must ?n.?t|is not a|charge[ds]?|cover you already)\b/i;
const LEXICO_PERDA_PT =
  /\b(golpe|multa\w*|roubo|roubad\w+|furto|batedor|perigo\w*|emergênci\w+|hospital|farmácia|doente|doença|alergi\w+|polícia|perdid\w+|errad\w+|problema|cuidado|reclamaç\w+|pânico|não funciona|não é um)\b/i;
const LEXICO_PERDA_DE =
  /\b(Betrug|Strafe\w*|Bußgeld|gestohlen|Diebstahl|Gefahr\w*|Notfall|Krankenhaus|Apotheke|Allergie|Polizei|verloren|falsch|Problem|Vorsicht|Panik|funktioniert nicht)\b/i;
const LEXICO_PERDA_IT =
  /\b(truffa|multa\w*|furto|rubat\w+|smarrit\w+|pers[oi]\b|perder\w*|sbagliat\w+|rott[oaie]|non funziona|pericol\w*|emergenz\w+|ospedale|farmacia|malat\w+|allergi\w+|polizia|evitare|attenzione|problema|rischi\w*|reclam\w+|panico|scadenz\w+|denunc\w+|non è un[oa]?)\b/i;
const LEXICO_PERDA_FR =
  /\b(arnaqu\w*|amende\w*|vol\b|volé\w*|pickpocket|danger\w*|urgence|hôpital|pharmacie|malad\w+|allergi\w+|police|perdu\w*|fauss?e?|erreur|problème|attention|panique|(ne )?marche pas|escroc\w*)\b/i;
// O título é na LÍNGUA DO COMPRADOR (a narração). Rodar todos os léxicos juntos
// dava falso positivo entre línguas — o «con» inglês (con man/golpe) tropeçava
// no «con» PREPOSIÇÃO italiana. Roteia por guiaLingua; sem língua conhecida, cai
// no comportamento antigo (não afrouxa). Mesma lição de G6/G14 (portão que não
// lê a língua do SKU é decoração).
const _lgPerda = (() => {
  try { return JSON.parse(readFileSync(join(root, 'audio.config.json'), 'utf8'))._g14?.guiaLingua; }
  catch { return undefined; }
})();
const _LEXICOS_PERDA = { en: LEXICO_PERDA, pt: LEXICO_PERDA_PT, de: LEXICO_PERDA_DE, it: LEXICO_PERDA_IT, fr: LEXICO_PERDA_FR };
const cheiraPerda = _LEXICOS_PERDA[_lgPerda]
  ? (t) => _LEXICOS_PERDA[_lgPerda].test(t)
  : (t) => LEXICO_PERDA.test(t) || LEXICO_PERDA_PT.test(t) || LEXICO_PERDA_DE.test(t);

// ── carga dos episódios ─────────────────────────────────────────────────────
const partes = [];
if (existsSync(dir)) {
  for (const f of readdirSync(dir).filter((x) => /^ep-.*\.json$/.test(x))) {
    try {
      partes.push({ f, j: JSON.parse(readFileSync(join(dir, f), 'utf8')) });
    } catch (e) {
      erros.push(`${f}: JSON inválido — ${e.message}`);
    }
  }
}

const contratoPath = join(dir, 'slots.json');
const contrato = existsSync(contratoPath) ? JSON.parse(readFileSync(contratoPath, 'utf8')) : null;
const moduloDoSlot = new Map((contrato?.slots || []).map((s) => [s.id, s.modulo]));
const modOf = (p) => moduloDoSlot.get(p.j.slot) || p.j.nivel || '?';

const MODULOS = ['basico', 'intermediario', 'avancado'];
const nomeMod = { basico: 'ME VIRO', intermediario: 'APROVEITO', avancado: 'LEIO A SALA' };

// Teto de partes defensivas por módulo (G1). Vive aqui em cima porque tanto o
// gate de syllabus (--outline) quanto o G1 sobre os roteiros medem contra ele.
const TETO_G1 = { basico: 4, intermediario: 1, avancado: 1 };

// ════════════════════════════════════════════════════════════════════════════
// --outline — O GATE DA FASE DE SYLLABUS, sobre src/lib/course/index.ts
//
// POR QUE ELE RODA SOBRE O ÍNDICE E NÃO SOBRE OS ep-*.json. Deriva de tom se
// corrige medindo ANTES de gravar: depois de gravado o custo já virou crédito
// queimado (o ¡Dime! custou 110.160 créditos, 85,6% deles em narração da guia).
// Quando existe `ep-*.json` a decisão de moldura já está paga. O único momento
// em que ela é grátis é quando o curso ainda é uma lista de títulos — e a lista
// de títulos é `index.ts`. Rodar o G1 sobre os roteiros, como este script fazia,
// é medir o paciente depois do enterro.
//
// O parse é textual de propósito: este arquivo é .mjs e roda sem toolchain, e
// pôr um transpilador de TypeScript no caminho de um portão é como se garante
// que o portão não roda. O índice é um literal de array plano; se um dia deixar
// de ser, o parser avisa em vez de mentir.
// ════════════════════════════════════════════════════════════════════════════
function lerOutlineTs() {
  const p = join(dir, 'index.ts');
  if (!existsSync(p)) return { erro: `${p} não existe` };
  const src = readFileSync(p, 'utf8');
  const ini = src.indexOf('export const outline');
  if (ini < 0) return { erro: 'index.ts não exporta `outline`' };
  const fim = src.indexOf('\n];', ini);
  const bloco = src.slice(ini, fim < 0 ? src.length : fim);

  const cortes = [];
  const reNivel = /nivel:\s*'([^']+)'/g;
  let m;
  while ((m = reNivel.exec(bloco))) cortes.push({ nivel: m[1], at: m.index });
  if (!cortes.length) return { erro: 'não achei nenhum módulo (`nivel:`) dentro de `outline`' };

  const campo = (obj, nome) => {
    const r = new RegExp(nome + String.raw`:\s*'((?:[^'\\]|\\.)*)'`).exec(obj);
    return r ? r[1].replace(/\\'/g, "'") : undefined;
  };
  const mods = [];
  for (let k = 0; k < cortes.length; k++) {
    const pedaco = bloco.slice(cortes[k].at, k + 1 < cortes.length ? cortes[k + 1].at : bloco.length);
    const licoes = [];
    for (const obj of pedaco.match(/\{[^{}]*\}/g) || []) {
      if (!/\bid:\s*'/.test(obj) || !/\btitulo:\s*'/.test(obj)) continue;
      licoes.push({
        id: campo(obj, 'id'),
        titulo: campo(obj, 'titulo'),
        subtitulo: campo(obj, 'subtitulo'),
        slot: campo(obj, 'slot'),
        moldura: campo(obj, 'moldura')
      });
    }
    mods.push({ nivel: cortes[k].nivel, licoes });
  }
  return { mods };
}

if (SO_OUTLINE) {
  console.log('\nvalida-tom --outline · G1 sobre src/lib/course/index.ts (fase de syllabus)\n');
  const { mods, erro } = lerOutlineTs();
  if (erro) {
    console.log(`  ✗ ${erro}\n`);
    process.exit(1);
  }

  const todas = mods.flatMap((mo) => mo.licoes.map((l) => ({ ...l, nivel: mo.nivel })));
  const comMoldura = todas.filter((l) => l.moldura).length;
  const comSlot = todas.filter((l) => l.slot).length;

  for (const mo of mods) {
    const alvo = (contrato?.modulos || []).find((x) => x.id === mo.nivel);
    const prevista = alvo?.partes ?? alvo?.min;
    console.log(
      `  ${(nomeMod[mo.nivel] || mo.nivel).padEnd(11)} ${String(mo.licoes.length).padStart(2)} lições` +
        (prevista ? `  (contrato: ${prevista})` : '')
    );
    // Contagem abaixo do contrato é obra em andamento, não divergência: o índice
    // cresce lição a lição. Divergência é ter MAIS do que o contrato permite.
    if (prevista && mo.licoes.length > prevista && alvo?.travado)
      erros.push(`--outline: ${nomeMod[mo.nivel]} com ${mo.licoes.length} lições, o contrato trava em ${prevista}`);
    else if (prevista && mo.licoes.length < prevista)
      avisos.push(`--outline: ${nomeMod[mo.nivel]} tem ${mo.licoes.length}/${prevista} lições — syllabus incompleto`);
  }

  // Os `slot` só são conferidos quando alguém já os declara (regra de degradação).
  if (emUso(comSlot)) {
    const vistos = new Map();
    for (const l of todas) {
      if (!l.slot) {
        erros.push(`--outline: lição "${l.id}" sem "slot" — o índice já declara slot em ${comSlot} lições`);
        continue;
      }
      const def = (contrato?.slots || []).find((s) => s.id === l.slot);
      if (!def) erros.push(`--outline: lição "${l.id}" aponta para o slot "${l.slot}", que não existe no contrato`);
      else if (def.modulo !== l.nivel)
        erros.push(`--outline: slot ${l.slot} é do módulo "${def.modulo}", mas está listado em "${l.nivel}"`);
      if (vistos.has(l.slot)) erros.push(`--outline: slot ${l.slot} aparece duas vezes (${vistos.get(l.slot)} e ${l.id})`);
      else vistos.set(l.slot, l.id);
    }
  } else {
    avisos.push('--outline: nenhuma lição declara "slot" — sem isso o gate não sabe a que módulo o teto se aplica pelo contrato');
  }

  if (!emUso(comMoldura)) {
    // Degradação: o campo `moldura` não existe em index.ts em nenhum curso ainda,
    // e falhar por isso seria falhar por uma obra que ninguém começou. Repare que
    // isto NÃO anistia o que já foi conferido acima: contrato estourado e slot
    // duplicado seguem quebrando, porque ali o campo existe e a divergência é
    // real. Degrada-se o portão que não tem o que medir, nunca o que mediu e
    // achou erro.
    console.log('\n  ⚠ nenhuma lição declara "moldura" — o G1 de syllabus ainda não pode ser medido.');
    console.log('\n  O que precisa ser acrescentado a src/lib/course/index.ts para este gate funcionar:');
    console.log("    · em CADA lição:  moldura: 'ganha' | 'protege'   ← obrigatório, é o que o G1 confere");
    console.log("    · em CADA lição:  slot: 'B12'                    ← o id canônico de slots.json");
    console.log("    · opcional, e melhora muito a acusação do léxico: subtitulo: '…'");
    console.log('    · e em src/lib/types.ts, estender ModuloOutline.licoes:');
    console.log("        { id: string; titulo: string; pronta: boolean;");
    console.log("          slot?: string; moldura?: 'ganha' | 'protege'; subtitulo?: string }[]");
    const faltamMods = (contrato?.modulos || []).filter((mo) => !mods.some((x) => x.nivel === mo.id));
    for (const mo of faltamMods)
      console.log(
        `    · o índice deste SKU não tem o bloco  nivel: '${mo.id}'  — faltam as ` +
          `${mo.partes ?? mo.min} lições de ${mo.nome_pt}.`
      );
    console.log('');
    if (avisos.length) avisos.forEach((a) => console.log('  ⚠ ' + a));
    if (erros.length && !RELATORIO) {
      console.log('\nERROS:');
      erros.forEach((e) => console.log('  ✗ ' + e));
      console.log('');
      process.exit(1);
    }
    console.log('');
    process.exit(0);
  }

  const cont = { basico: 0, intermediario: 0, avancado: 0 };
  const tot = { basico: 0, intermediario: 0, avancado: 0 };
  for (const l of todas) {
    if (!(l.nivel in tot)) continue;
    tot[l.nivel]++;
    const cheira = cheiraPerda(`${l.titulo || ''} ${l.subtitulo || ''}`);
    if (!l.moldura)
      erros.push(`--outline: lição "${l.id}" sem "moldura" — toda parte declara se GANHA ou PROTEGE`);
    else if (l.moldura === 'ganha' && cheira)
      erros.push(`--outline: "${l.id}" declara "ganha", mas o título é de perda — "${(l.titulo || '').slice(0, 55)}"`);
    if ((l.moldura || (cheira ? 'protege' : 'ganha')) === 'protege') cont[l.nivel]++;
  }
  const nT = MODULOS.reduce((a, x) => a + tot[x], 0);
  const nP = MODULOS.reduce((a, x) => a + cont[x], 0);
  console.log(`\n  moldura defensiva no syllabus: ${nP}/${nT} (${nT ? Math.round((nP / nT) * 100) : 0}%) — teto 6/36 (17%)`);
  for (const mo of MODULOS) {
    if (!tot[mo]) continue;
    console.log(`     ${nomeMod[mo].padEnd(11)} ${cont[mo]}/${tot[mo]}  (teto ${TETO_G1[mo]})`);
    if (cont[mo] > TETO_G1[mo])
      erros.push(`--outline: ${nomeMod[mo]} com ${cont[mo]} lições defensivas, teto é ${TETO_G1[mo]}`);
  }
  if (nT >= 36 && nP > 6) erros.push(`--outline: curso com ${nP}/36 lições defensivas, teto é 6/36 (17%)`);

  if (avisos.length) {
    console.log(`\n${avisos.length} aviso(s):`);
    avisos.forEach((a) => console.log('  ⚠ ' + a));
  }
  if (erros.length && !RELATORIO) {
    console.log('\nERROS:');
    erros.forEach((e) => console.log('  ✗ ' + e));
    console.log('\nMoldura se conserta aqui, na lista de títulos, onde ainda é de graça.\n');
    process.exit(1);
  }
  console.log('\n✓ moldura do syllabus dentro do teto.\n');
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════════════
// G1 — MOLDURA DE EPISÓDIO (o portão principal)
// Cada parte declara `moldura: 'ganha' | 'protege'`. O script classifica o título
// pelo léxico e COMPARA com o declarado: a declaração impede que o autor se
// engane sozinho, e o léxico impede que a declaração seja decorativa.
// ════════════════════════════════════════════════════════════════════════════
const contagemG1 = { basico: 0, intermediario: 0, avancado: 0 };
const totalPorMod = { basico: 0, intermediario: 0, avancado: 0 };

for (const p of partes) {
  const m = modOf(p);
  if (!(m in totalPorMod)) continue;
  totalPorMod[m]++;
  const texto = `${p.j.titulo || ''} ${p.j.subtitulo || ''}`;
  const cheira = cheiraPerda(texto);
  const declarado = p.j.moldura;

  if (!declarado) {
    (RELATORIO ? avisos : erros).push(
      `G1: ${p.f} sem campo "moldura" — toda parte declara se GANHA ou PROTEGE`
    );
  } else if (declarado === 'ganha' && cheira) {
    // A única direção que acusa: o autor chamou de ganho algo que o léxico leu
    // como perda. Ou o título muda, ou a declaração muda — mas não passa calado.
    erros.push(
      `G1: ${p.f} declara "ganha", mas o título é de perda — "${(p.j.titulo || '').slice(0, 55)}"`
    );
  }

  // ── G1b — MOLDURA FORA DO ENUM ─────────────────────────────────────────────
  // O contrato tem DOIS valores: 'ganha' e 'protege'. Um terceiro passa calado
  // pelos dois ramos acima — não é falsy, então não acusa campo ausente; não é
  // 'ganha', então o léxico de perda nunca roda; não é 'protege', então não conta
  // na cota defensiva. É um valor que PAGA AO AUTOR, e foi assim que 27 partes do
  // catálogo escaparam do G1 sem ninguém perceber. Duas delas foram marcadas
  // assim deliberadamente quando a cota de 'protege' encheu — que é exatamente o
  // incentivo que este teste existe para remover.
  if (declarado && declarado !== 'ganha' && declarado !== 'protege')
    erros.push(
      `G1b: ${p.f} declara moldura "${declarado}", que não existe — o contrato tem ` +
        `'ganha' e 'protege' e mais nada. Um terceiro valor não é uma terceira opção: é uma ` +
        `saída do portão. Se a parte protege, declare 'protege' e pague a cota; se ela dá uma ` +
        `capacidade, declare 'ganha' e faça o título dizer isso.`
    );

  if ((declarado || (cheira ? 'protege' : 'ganha')) === 'protege') contagemG1[m]++;
}

const totalPartes = MODULOS.reduce((a, m) => a + totalPorMod[m], 0);
const totalProtege = MODULOS.reduce((a, m) => a + contagemG1[m], 0);
const pct = totalPartes ? Math.round((totalProtege / totalPartes) * 100) : 0;
medidas.push(`G1 moldura defensiva: ${totalProtege}/${totalPartes} (${pct}%) — teto 6/36 (17%)`);
for (const m of MODULOS) {
  if (!totalPorMod[m]) continue;
  medidas.push(`     ${nomeMod[m].padEnd(11)} ${contagemG1[m]}/${totalPorMod[m]}  (teto ${TETO_G1[m]})`);
  if (contagemG1[m] > TETO_G1[m])
    erros.push(`G1: ${nomeMod[m]} tem ${contagemG1[m]} partes defensivas, teto é ${TETO_G1[m]}`);
}
if (totalPartes >= 36 && totalProtege > 6)
  erros.push(`G1: curso com ${totalProtege}/36 partes defensivas (${pct}%), teto é 6/36 (17%)`);

IT.moldura = { protege: totalProtege, total: totalPartes, pct };

// ════════════════════════════════════════════════════════════════════════════
// G2 — SALDO APETITIVO: steps de ganho ÷ steps de proteção, por parte
// ════════════════════════════════════════════════════════════════════════════
let totGanha = 0, totProtege = 0;
for (const p of partes) {
  const m = modOf(p);
  const ganha = (p.j.steps || []).filter((s) => s.tom === 'ganha').length;
  const protege = (p.j.steps || []).filter((s) => s.tom === 'protege').length;
  totGanha += ganha;
  totProtege += protege;
  if (!ganha && !protege) {
    avisos.push(`${p.f}: nenhum step declara "tom" — G2 não pode ser medido`);
    continue;
  }
  const razao = protege ? ganha / protege : Infinity;
  const minimo = m === 'basico' ? 1 : 2;
  if (razao < minimo) {
    const msg = `G2: ${p.f} saldo ${ganha}:${protege} (${razao.toFixed(1)}:1), mínimo ${minimo}:1 em ${nomeMod[m]}`;
    m === 'basico' ? avisos.push(msg) : erros.push(msg);
  }
}
if (totGanha || totProtege) IT.saldo = totProtege ? totGanha / totProtege : Infinity;

// ════════════════════════════════════════════════════════════════════════════
// G3 — DENSIDADE DE PRODUÇÃO (INV-4): o aluno FALA
// Exatamente uma parte pode ter zero: o EAR MODULE (A01), onde ouvir é o exercício.
// ════════════════════════════════════════════════════════════════════════════
const respondePorMod = {};
let zerados = [];
for (const p of partes) {
  const m = modOf(p);
  const n = (p.j.steps || []).filter((s) => s.tipo === 'responde').length;
  (respondePorMod[m] ??= []).push({ f: p.f, slot: p.j.slot, n });
  if (n === 0) zerados.push(p.j.slot || p.f);
  else if (n < 4) erros.push(`G3: ${p.f} tem ${n} "responde", mínimo é 4 por parte`);
}
if (zerados.length > 1 || (zerados.length === 1 && zerados[0] !== 'A01'))
  erros.push(`G3: partes sem produção falada: ${zerados.join(', ')} — só A01 (o ear module) pode ter zero`);

// A média do IT é a do curso inteiro, com A01 fora da conta pela mesma razão que
// o G3 o isenta: o ear module tem zero produção por desenho, e deixá-lo dentro
// faria o número único punir o cumprimento de um invariante.
{
  const todos = Object.values(respondePorMod).flat().filter((x) => x.slot !== 'A01');
  if (todos.length) IT.responde = todos.reduce((a, x) => a + x.n, 0) / todos.length;
}

const MEDIA_MIN = { basico: 8, intermediario: 8, avancado: 5 };
for (const m of MODULOS) {
  const lista = (respondePorMod[m] || []).filter((x) => x.slot !== 'A01');
  if (!lista.length) continue;
  const media = lista.reduce((a, x) => a + x.n, 0) / lista.length;
  const comSeis = lista.filter((x) => x.n >= 6).length;
  medidas.push(
    `G3 ${nomeMod[m].padEnd(11)} média ${media.toFixed(1)} responde/parte (mín ${MEDIA_MIN[m]}) · ${comSeis}/${lista.length} com ≥6`
  );
  if (media < MEDIA_MIN[m])
    erros.push(`G3: ${nomeMod[m]} média ${media.toFixed(1)} responde/parte, mínimo ${MEDIA_MIN[m]}`);
  if (comSeis / lista.length < 0.5)
    erros.push(`G3: ${nomeMod[m]} só ${comSeis}/${lista.length} partes com ≥6 responde (mínimo 50%)`);
}

// ════════════════════════════════════════════════════════════════════════════
// G4 — ANTI-PALESTRA: caracteres por clipe de narração
// A trava de tom que também é a maior economia de crédito. O guia que palestra
// rouba o tempo em que o aluno deveria estar falando.
// ════════════════════════════════════════════════════════════════════════════
let somaChars = 0, nClipes = 0;
for (const p of partes) {
  const narr = (p.j.steps || []).filter((s) => s.tipo === 'intro' || s.tipo === 'recap');
  if (!narr.length) continue;
  const chars = narr.reduce((a, s) => a + (s.pt || '').length, 0);
  const media = chars / narr.length;
  somaChars += chars;
  nClipes += narr.length;
  if (media > 120)
    erros.push(`G4: ${p.f} narração com ${Math.round(media)} chars/clipe, teto 120 — o guia está palestrando`);

  // A segunda metade do G4 NÃO é opcional: um bloco de molde cheio de clipes
  // curtos derruba a média e esconde uma palestra de 400 caracteres no mesmo
  // episódio. A média mede a dieta; o teto por clipe mede o pior momento.
  for (const s of narr)
    if ((s.pt || '').length > 320)
      erros.push(
        `G4: ${p.f} ${s.audioKey || ''} tem ${(s.pt || '').length} chars num clipe só, teto 320 — ninguém escuta isso de pé`
      );
}
if (nClipes) {
  IT.chars = somaChars / nClipes;
  medidas.push(`G4 narração: ${Math.round(somaChars / nClipes)} chars/clipe no curso (teto 120)`);
}

// ════════════════════════════════════════════════════════════════════════════
// G5 — PERMISSÃO (INV-11): junto de toda proibição, o que VOCÊ PODE fazer
// ════════════════════════════════════════════════════════════════════════════
// A regra é "≥1 por parte de M2/M3 **e por parte cultural de M1**". A versão
// anterior pulava ME VIRO inteiro com o comentário "em M1 só as partes
// culturais" — e nunca chegava a conferir quais eram. O resultado é que B13
// (alergia) e B02, que carregam proibição pesada, não eram cobradas por
// nenhuma permissão, que é exatamente o furo que produz o briefing de medo.
// Parte cultural de M1 = a que declara ficha cultural. Objetiva e conferível.
for (const p of partes) {
  const m = modOf(p);
  const cultural = Array.isArray(p.j.fichasCulturais) && p.j.fichasCulturais.length > 0;
  if (m === 'basico' && !cultural) continue;
  if (!p.j.permissao || !String(p.j.permissao).trim())
    erros.push(
      `G5: ${p.f} (${nomeMod[m]}${m === 'basico' ? ', parte cultural' : ''}) sem campo "permissao" — toda proibição vem com uma permissão`
    );
}

// ════════════════════════════════════════════════════════════════════════════
// G6 — TRAVA-A: zero adjetivo de povo. Cultura é comportamento com consequência,
// nunca "os espanhóis são calorosos". Gentílico + cópula = estereótipo.
// ════════════════════════════════════════════════════════════════════════════
// O regex vive em scripts/lib/g6-gentilico.mjs, POR LÍNGUA da narração — o SKU
// alemão narra em alemão, e um regex só de inglês/português dava VERDE sem olhar.
// A língua vem do `_g14.guiaLingua` do audio.config, que o SKU já declara.
const linguaGuia = (() => {
  try {
    const c = JSON.parse(readFileSync(join(root, 'audio.config.json'), 'utf8'));
    return c._g14?.guiaLingua;
  } catch {
    return undefined;
  }
})();

if (!linguaGuia) {
  avisos.push('G6: audio.config não declara _g14.guiaLingua — não sei em que língua checar estereótipo. Portão DESLIGADO.');
} else if (!LINGUAS_G6.includes(linguaGuia)) {
  avisos.push(
    `G6: não sei checar estereótipo em "${linguaGuia}" — acrescente as regras em scripts/lib/g6-gentilico.mjs. Portão DESLIGADO nesta língua.`
  );
} else {
  let n = 0;
  for (const p of partes)
    for (const s of p.j.steps || []) {
      for (const g of achaGentilicos(s.pt || '', linguaGuia)) {
        erros.push(`G6: ${p.f} ${s.audioKey || ''} — adjetivo de povo: "${g}"`);
        n++;
      }
    }
  medidas.push(`G6 estereótipo (${linguaGuia}): ${n} ocorrência(s) — teto 0`);
}

// ════════════════════════════════════════════════════════════════════════════
// G7 — TRAVA-B (onde não vale) + TRAVA-C (o espelho)
// Toda ficha cultural diz onde a regra NÃO vale, senão vira lei sobre um povo.
// Todo módulo 3 tem o espelho: o que o estrangeiro faz que estranha o anfitrião.
// ════════════════════════════════════════════════════════════════════════════
for (const p of partes) {
  for (const fc of p.j.fichasCulturais || []) {
    if (!fc.ondeNaoVale || !String(fc.ondeNaoVale).trim())
      erros.push(`G7: ${p.f} ficha "${(fc.sinal || '').slice(0, 40)}" sem "ondeNaoVale"`);
  }
  if (modOf(p) === 'avancado') {
    const temEspelho =
      p.j.espelho || (p.j.steps || []).some((s) => s.bloco === 'espelho' || s.tipo === 'espelho');
    if (!temEspelho) erros.push(`G7: ${p.f} (LEIO A SALA) sem bloco "espelho"`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// G8 — COBERTURA DO MODO CONSULTA
// ════════════════════════════════════════════════════════════════════════════
const consultaPath = join(dir, 'consulta.json');
if (existsSync(consultaPath)) {
  const c = JSON.parse(readFileSync(consultaPath, 'utf8'));
  const cards = c.cards || [];
  const porFolha = {};
  // Um card serve VÁRIAS folhas: agrupa pelo array `folhas`, não por um campo
  // singular `folha` que não existe no schema. O bug: com `card.folha` todos os
  // cards caíam num balde `undefined`, e o G8 via as 69 folhas como vazias.
  // Ficou latente no inglês porque as partes legadas rebaixam o erro agregado a
  // aviso; apareceu como falha dura no alemão, que não tem legado. E o piso de
  // simpatia testava `folha.id === 'simpatia'`, id que nunca existe (as folhas
  // são `simpatia/elogiar-comida`…) — soma-se o TILE, não a folha.
  for (const card of cards) for (const t of card.folhas || []) (porFolha[t] ??= []).push(card);
  let simpatia = 0;
  for (const folha of c.taxonomia || []) {
    const n = (porFolha[folha.id] || []).length;
    if (n === 0) erros.push(`G8: folha "${folha.id}" (${folha.rotulo || folha.nome || ''}) sem nenhum card`);
    if (folha.tile === 'simpatia') simpatia += n;
  }
  if (simpatia < 8)
    erros.push(`G8: tile "simpatia" com ${simpatia} cards, mínimo 8 — é onde a viagem fica boa`);
  const marcados = cards.filter((x) => x.aviso).length;
  const pctAviso = cards.length ? (marcados / cards.length) * 100 : 0;
  IT.cards = pctAviso;
  medidas.push(`G8 consulta: ${cards.length} cards · ${pctAviso.toFixed(0)}% com ⚠ (teto 15%)`);
  if (pctAviso > 15) erros.push(`G8: ${pctAviso.toFixed(0)}% dos cards de consulta são avisos, teto 15%`);
} else {
  avisos.push('G8: src/lib/course/consulta.json ainda não existe — modo consulta não construído');
}

// ════════════════════════════════════════════════════════════════════════════
// G9 — TAXA DE GERAÇÃO: quanto do que o aluno fala ele consegue REMONTAR
//
// É o portão que os outros oito não pegam. O Hablá passa em G1, G3 e G4 com folga
// e mesmo assim é o pior curso do acervo nesta métrica: 2%. Sessenta e nove partes,
// gramática explícita, e ainda assim o aluno sai com um inventário FIXO — só
// consegue repetir as frases que escrevemos. Quando a cena desvia dois graus, ele
// trava. É exatamente a limitação que atribuímos ao phrasebook concorrente.
//
// Medimos: das frases-alvo únicas do curso, quantas são instâncias de um molde
// declarado. Um molde é `Quería + [X]` — encaixe com buraco, onde o buraco é
// preenchido por uma coisa do mundo (café, a conta, outro quarto), não por um
// cálculo de conjugação. Molde bem feito AUMENTA a produção falada: 4 encaixes
// viram 4 "responde".
// ════════════════════════════════════════════════════════════════════════════
const moldesPath = join(dir, 'moldes.json');
if (existsSync(moldesPath)) {
  const cat = JSON.parse(readFileSync(moldesPath, 'utf8'));
  const declarados = new Set((cat.moldes || []).map((m) => m.id));

  // ── G9b — o cruzamento entre a RAIZ da parte e o roster ───────────────────
  //
  // A parte declara em `moldes[]` quais moldes ela carrega; os steps declaram
  // `molde` frase a frase. Os dois têm que falar a mesma língua, e nada conferia:
  // quando os ids ordinais viraram slugs, o script de migração trocou os steps e
  // ESQUECEU a raiz — e o arquivo que ficou com `["M5","M1"]` era justamente o
  // modelo que os autores estavam sendo mandados copiar. Ninguém viu, porque um
  // id inexistente na raiz não produzia erro em lugar nenhum.
  //
  // Também confere a CASA: se o roster diz que o molde mora na parte X, a parte X
  // tem que declará-lo. Casa declarada num arquivo e ensinada em outro é como o
  // molde some do curso sem ninguém notar.
  const casaDoMolde = new Map((cat.moldes || []).map((m) => [m.id, m.casa]));
  for (const p of partes) {
    for (const id of p.j.moldes || []) {
      if (!declarados.has(id))
        erros.push(
          `G9b: ${p.f} declara na raiz o molde "${id}", que não existe em moldes.json v${cat.versao}`
        );
    }
    if (!p.j.slot) continue;
    for (const [id, casa] of casaDoMolde) {
      if (casa !== p.j.slot) continue;
      if (!(p.j.moldes || []).includes(id))
        (emUso((p.j.moldes || []).length) ? erros : avisos).push(
          `G9b: ${p.f} é a CASA de "${id}" segundo o roster, mas não o declara em moldes[]`
        );
    }
  }

  // ── G9d — a CASA vem antes de todo redisparo ──────────────────────────────
  //
  // Um redisparo é o molde VOLTANDO. Se ele "volta" numa parte que o aluno ouve
  // ANTES da casa, ele não voltou: apareceu do nada, sem os quatro tempos, e o
  // aluno é mandado usar uma forma que ninguém ensinou. É o mesmo defeito do
  // `Otro café` — mandar calcular em vez de escolher — só que causado pela ORDEM
  // e não pela falta de modelo, e por isso invisível lendo a parte isolada.
  //
  // Achado num caso real: YA-ESTA tinha casa em B14 e redisparo em B09, que vem
  // cinco slots antes. A narração do B14 chegou a dizer "agora o molde que evita
  // você pagar duas vezes" para um aluno que já o tinha encontrado.
  const ordemDoSlot = new Map(contrato ? contrato.slots.map((s, i) => [s.id, i]) : []);
  for (const m of cat.moldes || []) {
    const oCasa = ordemDoSlot.get(m.casa);
    if (oCasa === undefined) continue;
    for (const slot of m.redisparos || []) {
      const o = ordemDoSlot.get(slot);
      if (o !== undefined && o < oCasa)
        erros.push(
          `G9d: "${m.id}" tem casa em ${m.casa} e redisparo em ${slot}, que vem ANTES — ` +
            `ou a casa muda para ${slot}, ou ${slot} sai dos redisparos. Não se redispara o que ainda não foi ensinado.`
        );
    }
  }

  // ── G9c — a promessa de REDISPARO tem que ser cumprida ────────────────────
  //
  // O roster diz onde cada molde VOLTA com encaixe novo. Isso não é decoração:
  // é o que separa um molde de uma frase — ele atravessa a jornada, e um molde
  // ensinado numa parte e nunca mais visto é inventário fixo com outro nome.
  // O G9b confere só a CASA, então o roster podia prometer que YA-ESTA volta em
  // B09 e B16 sem nenhum dos dois declarar nada, e portão nenhum acusava. Achado
  // por um revisor lendo o roster contra o corpus — trabalho que um script faz.
  //
  // Enquanto o slot prometido ainda não foi escrito, é aviso: a promessa não foi
  // quebrada, só ainda não chegou a hora dela.
  const slotsEscritos = new Set(partes.filter((p) => p.j.slot).map((p) => p.j.slot));
  for (const m of cat.moldes || []) {
    for (const slot of m.redisparos || []) {
      if (!slotsEscritos.has(slot)) continue; // ainda não escrito
      const p = partes.find((x) => x.j.slot === slot);
      const usa =
        (p.j.moldes || []).includes(m.id) ||
        (p.j.steps || []).some((s) => s.molde === m.id);
      if (!usa)
        (p.j.cena && !p.j.dissolveEm ? erros : avisos).push(
          `G9c: o roster promete que "${m.id}" redispara em ${slot} (${p.f}) e a parte não o usa — ` +
            `molde que não atravessa a jornada é inventário fixo com outro nome`
        );
    }
  }

  // LEIO A SALA FICA FORA DA CONTA DO SKU, e isso é lei da spec, não conveniência:
  // "≥45% no SKU · ≥50% em M1 · ≥35% em M2 · M3 fora da conta". M3 não produz
  // molde por DESENHO — a relação dele com os moldes é auditiva, reconhecer e não
  // montar. Contá-lo no denominador faz cada parte de M3 escrita derrubar a taxa,
  // ou seja: o portão reprovaria um curso correto, e reprovaria mais quanto mais
  // certo ele estivesse. Medido quando M3 chegou a 6 partes — a taxa caiu de 46%
  // para 43% sem uma linha de M1 ou M2 ter piorado.
  const alvos = new Map(); // frase-alvo única → molde que a gera (ou null)
  for (const p of partes) {
    if (modOf(p) === 'avancado') continue;
    for (const s of p.j.steps || []) {
      if (s.tipo !== 'responde' && s.tipo !== 'shadow') continue;
      const frase = (s.es || '').trim();
      if (!frase) continue;
      if (!alvos.has(frase) || (s.molde && !alvos.get(frase))) alvos.set(frase, s.molde || null);
      if (s.molde && !declarados.has(s.molde))
        erros.push(`G9: ${p.f} usa molde "${s.molde}", que não está em moldes.json`);
    }
  }

  const total = alvos.size;
  const geradas = [...alvos.values()].filter(Boolean).length;
  const taxa = total ? (geradas / total) * 100 : 0;
  IT.geracao = taxa;
  medidas.push(`G9 taxa de geração: ${geradas}/${total} frases-alvo vêm de molde (${taxa.toFixed(0)}%) — mínimo 45%`);
  if (taxa < 45)
    erros.push(
      `G9: taxa de geração ${taxa.toFixed(0)}%, mínimo 45% — o aluno está decorando inventário, não montando frase`
    );

  // Em ME VIRO a exigência é maior: é onde o ferramental tem que nascer.
  const alvosM1 = new Map();
  for (const p of partes.filter((x) => modOf(x) === 'basico')) {
    for (const s of p.j.steps || []) {
      if (s.tipo !== 'responde' && s.tipo !== 'shadow') continue;
      const frase = (s.es || '').trim();
      if (frase && (!alvosM1.has(frase) || (s.molde && !alvosM1.get(frase))))
        alvosM1.set(frase, s.molde || null);
    }
  }
  // Por módulo: ME VIRO ≥50% (é onde o ferramental nasce), APROVEITO ≥35% (carrega
  // inventário cultural legítimo, então o piso é menor), LEIO A SALA fora da conta
  // (a relação dele com molde é auditiva — reconhecer, não montar).
  for (const [mod, piso] of [['basico', 50], ['intermediario', 35]]) {
    const alvosMod = new Map();
    for (const p of partes.filter((x) => modOf(x) === mod))
      for (const s of p.j.steps || []) {
        if (s.tipo !== 'responde' && s.tipo !== 'shadow') continue;
        const frase = (s.es || '').trim();
        if (frase && (!alvosMod.has(frase) || (s.molde && !alvosMod.get(frase))))
          alvosMod.set(frase, s.molde || null);
      }
    if (!alvosMod.size) continue;
    const t = ([...alvosMod.values()].filter(Boolean).length / alvosMod.size) * 100;
    medidas.push(`     ${nomeMod[mod].padEnd(11)} ${t.toFixed(0)}% (mínimo ${piso}%)`);
    if (t < piso) erros.push(`G9: ${nomeMod[mod]} com ${t.toFixed(0)}% de geração, mínimo ${piso}%`);
  }

  // Trava anti-fraude do próprio G9: inflar a lista de moldes declarados aumenta
  // o numerador sem ensinar nada. O teto é LEI e tem duas metades (PRODUTO §5.1 e
  // INV-14): 12 moldes OPERACIONAIS + até 3 moldes SOCIAIS = 15 declarados.
  //
  // Os três sociais são exceção FECHADA e nomeada — APRECIAÇÃO (casa I07), ESCOLHA
  // (I03) e PREFERÊNCIA (I05) — porque a família apetitiva não tem cena em M1 e
  // deixá-la de fora foi o que produziu um curso sem uma única fala de elogio. Que
  // a exceção seja contada aqui, e não só escrita em prosa, é o que impede que ela
  // vire porta de entrada para um quarto, um quinto e a volta do "M2 introduz
  // molde". Molde sem `categoria` conta como operacional — o default é o regime
  // apertado, nunca o frouxo.
  const catDe = (m) => (m.categoria === 'social' ? 'social' : 'operacional');
  const nOperacionais = (cat.moldes || []).filter((m) => catDe(m) === 'operacional').length;
  const nSociais = (cat.moldes || []).filter((m) => catDe(m) === 'social').length;
  medidas.push(`G9 roster: ${nOperacionais} operacionais (teto 12) + ${nSociais} sociais (teto 3)`);
  if (nOperacionais > 12)
    erros.push(
      `G9: ${nOperacionais} moldes operacionais declarados, teto é 12 — lista inflada aumenta a taxa sem ensinar nada`
    );
  if (nSociais > 3)
    erros.push(
      `G9: ${nSociais} moldes sociais declarados, teto é 3 — a exceção de M2 é fechada e nomeada (APRECIAÇÃO, ESCOLHA, PREFERÊNCIA); um quarto exige decisão do dono`
    );

  // Trava estrutural: nenhum molde ganha parte própria. Molde é ferramenta que
  // atravessa a jornada; virar episódio é como a gramática volta pela janela.
  const porMolde = {};
  for (const p of partes)
    for (const s of p.j.steps || []) if (s.molde) (porMolde[s.molde] ??= new Set()).add(p.j.slot || p.f);
  for (const [id, slots] of Object.entries(porMolde))
    if (slots.size === 1)
      erros.push(`G9: molde "${id}" aparece em uma parte só (${[...slots][0]}) — molde atravessa a jornada`);
} else {
  avisos.push('G9: src/lib/course/moldes.json ainda não existe — taxa de geração não medida');
}

// ════════════════════════════════════════════════════════════════════════════
// G10 — ENCAIXE DO MUNDO: o buraco do molde se preenche com COISA, não com FORMA
//
// POR QUE ISTO EXISTE, e é o portão que impede a recaída mais cara do projeto.
// A versão anterior da spec trazia uma "tabela de exílio da gramática" indexada
// por `Passado`, `Subjuntivo`, `Comparativo`. Tabela cuja chave primária é o nome
// do paradigma É uma tabela de paradigmas, mesmo com "exílio" no título: o agente
// seguinte leu "Passado → M2" e escreveu um episódio de passado. Nós dizemos que
// `quería + [X]` entra e "o pretérito" fica fora — mas até aqui isso era prosa,
// e prosa não sobrevive a três agentes.
//
// O que separa os dois é UM campo: o que preenche o buraco. Se é café, farmácia,
// meio quilo, dor de garganta — é ESCOLHA, o aluno lê a resposta na vitrine. Se é
// pessoa, tempo, modo, aspecto ou gênero — é CÁLCULO, e cálculo sob estresse na
// fila do balcão é exatamente o que o produto promete não pedir.
// ════════════════════════════════════════════════════════════════════════════
const TIPOS_MUNDO = new Set([
  'coisa', 'lugar', 'comida', 'ingrediente', 'numero',
  'defeito', 'sintoma', 'acao', 'objeto-perdido', 'quantidade'
]);
const TIPOS_SISTEMA = new Set(['pessoa', 'tempo', 'modo', 'aspecto', 'genero']);

{
  const declaracoes = []; // { onde, valor }
  if (existsSync(moldesPath)) {
    const cat = JSON.parse(readFileSync(moldesPath, 'utf8'));
    for (const md of cat.moldes || [])
      if (md.tipoBuraco) declaracoes.push({ onde: `moldes.json ${md.id}`, valor: md.tipoBuraco });
  }
  for (const p of partes)
    for (const s of p.j.steps || [])
      if (s.tipoBuraco) declaracoes.push({ onde: `${p.f} ${s.audioKey || ''}`, valor: s.tipoBuraco });

  if (!emUso(declaracoes.length)) {
    avisos.push(
      'G10: nenhum molde declara "tipoBuraco" — portão desligado. Acrescente a cada entrada de ' +
        `moldes.json: "tipoBuraco": "<${[...TIPOS_MUNDO].join('|')}>"`
    );
  } else {
    // Com o campo em vigor, quem não declara passa a ser erro: um molde sem
    // tipo de buraco é um molde que ninguém submeteu ao portão P1.
    if (existsSync(moldesPath)) {
      const cat = JSON.parse(readFileSync(moldesPath, 'utf8'));
      for (const md of cat.moldes || [])
        if (!md.tipoBuraco) erros.push(`G10: molde "${md.id}" (${md.forma || ''}) sem "tipoBuraco"`);
    }
  }

  // O valor proibido acusa SEMPRE, mesmo que seja a única declaração do corpus:
  // o dia em que alguém escreve `tipoBuraco: "tempo"` é o dia em que o episódio
  // do pretérito voltou, e esperar por um quórum de declarações para dizer isso
  // seria esperar o erro ficar grande.
  for (const d of declaracoes) {
    if (TIPOS_SISTEMA.has(d.valor))
      erros.push(
        `G10: ${d.onde} tem tipoBuraco "${d.valor}" — isso é do SISTEMA, não do mundo. ` +
          'O aluno teria que CALCULAR a forma; molde é escolha de coisa (P1 do §5.1)'
      );
    else if (!TIPOS_MUNDO.has(d.valor))
      erros.push(
        `G10: ${d.onde} tem tipoBuraco "${d.valor}", fora do catálogo — use um de: ${[...TIPOS_MUNDO].join(', ')}`
      );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// G11 — WHITELIST DE FORMAS VERBAIS: nada de verbo entra sem alguém assinar
//
// POR QUE ISTO EXISTE. O produto promete que o aluno NUNCA conjuga: ele escolhe
// entre abridores já conjugados, e o curso produz "eu" e pergunta em "você", os
// dois pré-cozidos dentro dos moldes. Só que hoje ninguém sabe quantas formas
// verbais o corpus manda o aluno produzir — medido: 489 frases-alvo no ¡Dime! e
// ZERO inventário verbal declarado. Sem lista, cada autor novo acrescenta "só
// mais uma forma" que parecia inofensiva, e em seis partes o curso conjuga.
//
// O formato é o mesmo dos outros portões: o AUTOR declara, o script confere. A
// justificativa escrita é o item caro de propósito — é ela que faz alguém pensar
// duas vezes antes da décima quinta forma.
// ════════════════════════════════════════════════════════════════════════════
const formasPath = join(dir, 'formas-verbais.json');
{
  // Formatos aceitos por step: "formasVerbais": ["quería", "hay"] (ou string única).
  const declaradasNoCorpus = [];
  for (const p of partes)
    for (const s of p.j.steps || []) {
      const fv = s.formasVerbais ?? s.formaVerbal;
      if (!fv) continue;
      for (const f of Array.isArray(fv) ? fv : [fv])
        declaradasNoCorpus.push({ f: String(f).toLowerCase().trim(), onde: `${p.f} ${s.audioKey || ''}` });
    }

  if (!existsSync(formasPath)) {
    avisos.push(
      'G11: src/lib/course/formas-verbais.json ainda não existe — portão desligado. ' +
        'Formato: { "versao": 1, "formas": [ { "forma": "quería", "lema": "querer", ' +
        '"justificativa": "abridor de balcão que não codifica interlocutor", "molde": "M1" } ], ' +
        '"naoVerbos": ["policía", "día"] }'
    );
    if (declaradasNoCorpus.length)
      avisos.push(`G11: ${declaradasNoCorpus.length} step(s) já declaram forma verbal e não há lista para conferir contra`);
  } else {
    const wl = JSON.parse(readFileSync(formasPath, 'utf8'));
    const lista = wl.formas || [];
    const permitidas = new Set(lista.map((x) => String(x.forma || '').toLowerCase().trim()).filter(Boolean));
    const naoVerbos = new Set((wl.naoVerbos || []).map((x) => String(x).toLowerCase()));

    for (const e of lista)
      if (!e.justificativa || !String(e.justificativa).trim())
        erros.push(`G11: forma "${e.forma}" na whitelist sem "justificativa" — forma nova entra com motivo escrito`);

    for (const d of declaradasNoCorpus)
      if (!permitidas.has(d.f))
        erros.push(`G11: ${d.onde} produz a forma "${d.f}", que não está em formas-verbais.json`);

    // O braço acusador, na mesma assimetria do léxico de perda do G1: ele só
    // ACUSA (aponta um token com cara de verbo que ninguém assinou), nunca
    // ABSOLVE (não estar na lista de formas suspeitas não prova nada). Nomes que
    // caem na forma por acaso — "policía", "cuchara" — saem uma vez, para sempre,
    // pela lista `naoVerbos` do próprio arquivo.
    const CARA_DE_VERBO =
      /^(?=.{5,})[a-záéíóúüñ]+(ría|rías|ríamos|rían|aba|abas|ábamos|aban|ía|ías|íamos|ían|ase|ases|ese|eses|iera|ieras|iese|ara|aras|aron|ieron|ando|iendo|aré|arás|aremos|arán|eré|erá|iré|irá)$/;
    const suspeitas = new Map();
    for (const p of partes)
      for (const s of p.j.steps || []) {
        if (s.tipo !== 'responde' && s.tipo !== 'shadow') continue;
        for (const tk of ((s.es || '').toLowerCase().match(/[a-záéíóúüñ]+/g) || [])) {
          if (permitidas.has(tk) || naoVerbos.has(tk) || !CARA_DE_VERBO.test(tk)) continue;
          if (!suspeitas.has(tk)) suspeitas.set(tk, `${p.f} "${(s.es || '').slice(0, 40)}"`);
        }
      }
    for (const [tk, onde] of suspeitas)
      erros.push(
        `G11: "${tk}" aparece numa frase-alvo (${onde}) e não está na whitelist — ` +
          'acrescente com justificativa, ou ponha em "naoVerbos" se não for verbo'
      );

    const usadas = new Set(declaradasNoCorpus.map((d) => d.f));
    for (const e of lista) {
      const f = String(e.forma || '').toLowerCase();
      if (!usadas.has(f) && ![...suspeitas.keys()].includes(f))
        avisos.push(`G11: forma "${e.forma}" está na whitelist e não aparece em nenhuma frase-alvo — lista inflada`);
    }
    medidas.push(`G11 formas verbais: ${lista.length} na whitelist · ${suspeitas.size} suspeita(s) não assinada(s)`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// G12 — NÚCLEO RECEPTIVO: o que se ouve e não se responde
//
// POR QUE ISTO EXISTE. INV-9 diz que placas, sinais e fala rápida são passivos
// POR DESIGN, com zero `responde`, e a DESTRAVA DE OUVIDO (§5.1) é a categoria
// de molde que nunca se produz: ouviu X → faça Z. É a metade do produto que o
// G3 não só deixa de proteger como PRESSIONA na direção oposta — G3 cobra ≥4
// `responde` por parte, e o caminho mais fácil de satisfazê-lo é transformar
// reconhecimento em produção. Foi assim que "escreva a placa no ar" virou uma
// tentação real. Este portão é o contrapeso: o SKU tem que ter um piso de coisas
// que o aluno só reconhece.
//
// Medido em 27/07/2026 no ¡Dime!: 53 steps `ouvir` já carregam o marcador 👂 —
// o campo está em uso, então este portão nasce LIGADO.
// ════════════════════════════════════════════════════════════════════════════
{
  const marcado = (s) => s.receptivo === true || (s.pt || '').includes('👂') || (s.es || '').includes('👂');
  let marcados = 0, pares = 0, comAcao = 0;
  const semAcao = [];
  for (const p of partes) {
    const st = p.j.steps || [];
    st.forEach((s, i) => {
      if (s.tipo !== 'ouvir' || !marcado(s)) return;
      marcados++;
      // "par ouvir→agir" = o step marcado NÃO é degrau de um drill de produção.
      // Se o próximo step é um `responde`, aquilo é modelo de fala, não destrava
      // de ouvido — e contá-lo aqui deixaria o piso passar sem nada receptivo.
      if (st[i + 1] && st[i + 1].tipo === 'responde') return;
      pares++;
      if (s.acao && String(s.acao).trim()) comAcao++;
      else semAcao.push(`${p.f} ${s.audioKey || ''}`);
    });
  }
  if (!emUso(marcados)) {
    avisos.push(
      'G12: nenhum step marca conteúdo receptivo — portão desligado. Marque com "receptivo": true ' +
        '(ou 👂 no texto) os steps `ouvir` de placa, sinal e fala rápida'
    );
  } else {
    medidas.push(`G12 receptivo: ${pares} pares ouvir→agir sem responde (mínimo 8) · ${marcados} steps marcados`);
    if (pares < 8)
      erros.push(`G12: só ${pares} pares ouvir→agir sem "responde", mínimo 8 por SKU — o produto virou só produção`);
    // A metade "agir" do par não é conferível enquanto ninguém declarar a ação.
    // Quando o primeiro autor declarar, ela passa a ser cobrada de todos.
    if (emUso(comAcao)) for (const o of semAcao) erros.push(`G12: ${o} é receptivo e não diz o que FAZER — falta "acao"`);
    else avisos.push('G12: nenhum step receptivo declara "acao" — a metade "→ agir" do par ainda não é conferida');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// G13 — FATO COM VALIDADE (INV-23)
//
// POR QUE ISTO EXISTE. O SKU inteiro envelhece na velocidade do seu fato mais
// perecível, e o mais perecível está sempre em B04. O ¡Dime! carrega os piores
// do catálogo — EES, ETIAS, a ZBE, o menú del día a €14,20, o contactless — e
// medido em 27/07/2026: NENHUM fato datado do corpus tem data de revalidação.
// Um curso que afirma "ETIAS ainda não é exigido" sem carregar o prazo dessa
// afirmação não é um curso desatualizado: é um curso que dá conselho errado na
// fronteira, com a autoridade de quem cobrou por ele.
// ════════════════════════════════════════════════════════════════════════════
{
  const hoje = new Date();
  let comLista = 0, itens = 0;
  for (const p of partes) {
    const fd = p.j.fatosDatados;
    if (!Array.isArray(fd) || !fd.length) continue;
    comLista++;
    for (const fato of fd) {
      itens++;
      const nome = (fato.fato || fato.id || '').slice(0, 45);
      for (const campo of ['fonte', 'ano', 'revisarAte'])
        if (fato[campo] === undefined || String(fato[campo]).trim() === '')
          erros.push(`G13: ${p.f} fato "${nome}" sem "${campo}" — fato datado sem validade é dívida com juros`);
      if (fato.revisarAte) {
        const d = new Date(fato.revisarAte);
        if (isNaN(d)) erros.push(`G13: ${p.f} fato "${nome}" com "revisarAte" ilegível: "${fato.revisarAte}"`);
        else if (d < hoje)
          erros.push(`G13: ${p.f} fato "${nome}" venceu em ${fato.revisarAte} — revalide ou reescreva antes de publicar`);
      }
    }
  }
  if (!emUso(comLista))
    avisos.push(
      'G13: nenhuma parte declara "fatosDatados" — portão desligado. Formato: ' +
        '"fatosDatados": [ { "fato": "…", "fonte": "…", "ano": 2026, "revisarAte": "2027-01-31" } ]. ' +
        'Os slots que os concentram são B04, B05 e I09'
    );
  else medidas.push(`G13 fatos datados: ${itens} item(ns) com validade declarada em ${comLista} parte(s)`);
}

// ════════════════════════════════════════════════════════════════════════════
// G15 — REDAÇÃO DO DRILL: as três regras que transformam lista em cena
//
// POR QUE ISTO EXISTE. R-B e R-E são as duas regras do §5.2 que o revisor
// seguinte desfaz sem perceber que está desfazendo alguma coisa — ele acha que
// está "deixando o prompt mais claro". Se o prompt diz "peça um café", o aluno
// traduz em vez de escolher, e o molde deixa de ser molde. Se o áudio anuncia
// "agora tente com outra palavra", o aluno é avisado do poder do molde em vez de
// senti-lo trocando. Medido hoje: ZERO ocorrências de anúncio de troca no corpus
// — a régua nasce limpa, e é por isso que ela é útil: qualquer ocorrência futura
// é regressão, não dívida herdada.
// ════════════════════════════════════════════════════════════════════════════
const ANUNCIA_TROCA =
  /\b(now try (it )?with|same sentence,? but|same phrase,? but|now swap|just swap|swap (it |the )?(word|out)|now change the (word|noun)|replace [a-z' ]{1,15} with)\b|\b(mesma frase|só troque|agora troque|troque (a palavra|apenas)|substitua)\b|\b(gleicher satz|jetzt mit)\b/i;

// O NOME CANÔNICO DA PEÇA É ESTÁVEL POR SKU, e vem do moldes.json — não é fixo
// no script. PT-BR "molde", EN "the frame", DE "Baustein" (tijolinho de encaixe,
// que casa com a metáfora Lego do método). Fixar "the frame" aqui acusou 11 das
// 12 partes alemãs de "nunca nomear o molde", quando elas nomeiam "Baustein" 16
// vezes — o portão cobrava uma palavra que não existe na língua do curso.
const vocabMolde = (() => {
  try {
    const c = JSON.parse(readFileSync(moldesPath, 'utf8'));
    return c._regras?.vocabulario_molde?.termo;
  } catch {
    return undefined;
  }
})();
// slot → conjunto de moldes de que ele é CASA, lido do roster. É a fonte de
// verdade sobre quem tem que ensinar os quatro tempos.
const ehCasa = (() => {
  const m = new Map();
  try {
    const c = JSON.parse(readFileSync(moldesPath, 'utf8'));
    for (const md of c.moldes || [])
      if (md.casa) (m.get(md.casa) || m.set(md.casa, new Set()).get(md.casa)).add(md.id);
  } catch {}
  return m;
})();
// Termo canônico do SKU, mais os dois universais que sempre valem (o corpus tem
// PT e EN). Regex que casa "nomear a peça".
const NOMEIA_MOLDE = new RegExp(
  `\\b(the frame|molde${vocabMolde ? '|' + vocabMolde.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''})\\b`,
  'i'
);

// Sinônimos que competem com o nome canônico. O vocabulário instável é o que faz
// o aluno achar que "the frame", "the pattern" e "the formula" são três coisas —
// e aí ele para de reconhecer a mesma peça voltando.
const SINONIMO_DE_MOLDE =
  /\b(the (pattern|template|formula|structure|building block|sentence frame))\b|\b(o (padrão|gabarito|modelo)|a (fórmula|estrutura))\b/i;

{
  const PARADAS = new Set([
    'para', 'por', 'favor', 'esto', 'esta', 'este', 'aquí', 'tiene', 'puede', 'pone', 'pones',
    'usted', 'donde', 'dónde', 'gracias', 'perdone', 'perdona', 'hola', 'buenos', 'buenas',
    'that', 'this', 'with', 'from', 'have', 'what', 'your', 'please'
  ]);
  // Fala-alvo citada dentro de aspas no prompt é CENA ("ela pergunta '¿cuántos
  // días?'"), não vazamento: o aluno ouve isso no balcão de verdade. Só conta o
  // que está fora de aspas.
  const foraDeAspas = (t) => String(t).replace(/["'“”«»‘’][^"'“”«»‘’]*["'“”«»‘’]/g, ' ');

  let comEncaixe = 0, vazamentosDeclarados = 0, vazamentosSuspeitos = 0, anuncios = 0;
  for (const p of partes) {
    for (const s of p.j.steps || []) {
      // R-E — vale para a narração e para o próprio prompt.
      for (const [campo, txt] of [['pt', s.pt], ['promptPt', s.promptPt]]) {
        if (!txt) continue;
        if ((s.tipo === 'intro' || s.tipo === 'recap' || campo === 'promptPt') && ANUNCIA_TROCA.test(txt)) {
          anuncios++;
          erros.push(
            `G15/R-E: ${p.f} ${s.audioKey || ''} anuncia a troca — "${txt.match(ANUNCIA_TROCA)[0]}". ` +
              'O aluno sente o molde trocando, não sendo avisado de que vai trocar'
          );
        }
      }
      if (s.tipo !== 'responde' || !s.promptPt) continue;
      const prompt = foraDeAspas(s.promptPt).toLowerCase();

      // R-B, braço da declaração: o encaixe declarado (e a glosa dele na língua
      // do comprador) não podem aparecer no prompt. Aqui não há heurística — é
      // exatamente a palavra que o autor disse ser a peça trocável.
      if (s.encaixe) {
        comEncaixe++;
        for (const w of [s.encaixe, s.encaixeGloss].filter(Boolean)) {
          if (prompt.includes(String(w).toLowerCase())) {
            vazamentosDeclarados++;
            erros.push(
              `G15/R-B: ${p.f} ${s.promptAudioKey || ''} entrega o encaixe "${w}" dentro do prompt — ` +
                'diga a cena, não a resposta, senão o aluno traduz em vez de escolher'
            );
          }
        }
      }

      // R-B, braço da acusação: a frase-alvo inteira aparecendo no prompt. Acusa
      // e nunca absolve — nome próprio e citação de cena escapam de propósito,
      // então isto é aviso, e a revisão humana fica com o resto.
      const proprios = new Set(((s.es || '').match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+/g) || []).map((x) => x.toLowerCase()));
      const vaza = [...new Set((s.es || '').toLowerCase().match(/[a-záéíóúüñ]{4,}/g) || [])].filter(
        (w) => !PARADAS.has(w) && !proprios.has(w) && prompt.includes(w)
      );
      if (vaza.length && !s.encaixe) {
        vazamentosSuspeitos++;
        avisos.push(`G15/R-B: ${p.f} ${s.promptAudioKey || ''} — o prompt já contém "${vaza.join('", "')}" da frase-alvo`);
      }
    }

    // "Nomear a peça" é o primeiro dos quatro tempos, e ele é obrigação da CASA —
    // onde o molde nasce — não de todo slot que o toca. Um REDISPARO reusa o molde
    // com encaixe novo, sem reapresentação (é a própria definição de redisparo);
    // cobrar dele o batismo acusava B15 e B17 do alemão, que declaram em voz alta
    // "quatro Bausteine das partes anteriores trabalharam, nenhum era novo".
    // A casa é o que o roster diz ser casa — não o que a parte declara sobre si.
    const casasDoSlot = ehCasa.get(p.j.slot);
    if (!casasDoSlot || !casasDoSlot.size) continue;
    // O prompt de `responde` também é a guia falando — medido no corpus: é
    // dentro de um `promptPt` que está o "swap the middle of the template" que
    // batiza a peça de três jeitos na mesma parte. Deixar o prompt de fora
    // deixaria de fora justamente onde a deriva de vocabulário acontece.
    const narracao = (p.j.steps || []).filter((s) => s.tipo === 'intro' || s.tipo === 'recap');
    const falaDaGuia = [
      ...narracao.map((s) => [s.audioKey, s.pt]),
      ...(p.j.steps || []).filter((s) => s.promptPt).map((s) => [s.promptAudioKey, s.promptPt])
    ];
    for (const [chave, txt] of falaDaGuia) {
      const hit = String(txt || '').match(SINONIMO_DE_MOLDE);
      if (hit)
        erros.push(
          `G15: ${p.f} ${chave || ''} chama o molde de "${hit[0]}" — o nome é "molde" (PT-BR) ou "the frame" (EN), ` +
            'e ele não muda de parte para parte'
        );
    }
    const nomeia = falaDaGuia.some(([, txt]) => NOMEIA_MOLDE.test(String(txt || '')));
    if (!nomeia)
      erros.push(
        `G15: ${p.f} ensina molde e nunca o NOMEIA — o primeiro dos quatro tempos é nomear a peça ` +
          `(o termo do SKU: ${vocabMolde ? `"${vocabMolde}"` : '"the frame"/"molde"'})`
      );
  }
  if (!emUso(comEncaixe))
    avisos.push(
      'G15/R-B: nenhum step declara "encaixe" — o braço forte do R-B está desligado. ' +
        'Em cada `responde` de bloco de molde: "encaixe": "<a palavra que o aluno escolhe>" ' +
        '(e "encaixeGloss" se a glosa dela aparece na língua do comprador)'
    );
  medidas.push(
    `G15 drill: ${anuncios} anúncio(s) de troca · ${vazamentosDeclarados} vazamento(s) de encaixe declarado · ${vazamentosSuspeitos} suspeito(s)`
  );
}

// ════════════════════════════════════════════════════════════════════════════
// G16 — ANATOMIA DA PARTE: os campos sem os quais as travas do §4 são só prosa
//
// POR QUE ISTO EXISTE, e o número que o motivou: o invariante do gesto manda
// reativar a mão de B01 em TODA parte, e medido em 27/07/2026 o corpus inteiro
// tem 11 steps com o campo `gesto` — dos quais só 3 no primeiro step. A regra
// está sendo violada em 21 das 24 partes há meses, e ninguém viu, porque não
// havia nada que olhasse. É o caso exemplar do que este arquivo existe para
// impedir: uma lei que só vive em documento é uma lei que já não está valendo.
//
// A trava T2 (âncora de consumo em M2) é a que se perde mais fácil, porque as
// partes de ganho parecem se justificar sozinhas — sem `decisao` não vazio, M2
// vira "conversação", que é o gênero de curso que este produto existe para não
// ser. E T1 (título nomeia cena, nunca categoria) é o teste do anti-padrão 6.
// ════════════════════════════════════════════════════════════════════════════

// Lista deliberadamente CURTA. Um regex largo pega "presente" de presente de
// aniversário, alguém desliga o portão, e aí não há portão nenhum. Só entram
// termos que, num título, não têm outra leitura possível.
const CATEGORIA_GRAMATICAL =
  /\b(subjunctive|imperfect|preterite|(past|present|future) tense|conditional (tense|mood)|pronouns?|prepositions?|conjunctions?|connectors?|classifiers?|conjugation|verb (forms?|endings?|tenses?)|grammar)\b|\b(subjuntivo|imperfeito|pretérito|passado|condicional|pronomes?|preposiç\w+|conjunç\w+|conectores?|classificadores?|conjugaç\w+|gramática|verbos?)\b|\b(Konjunktiv|Präteritum|Vergangenheit|Pronomen|Präpositionen|Konjugation|Grammatik)\b/i;

function portaoDeCampo(nome, faltantes, usados, dica) {
  if (!emUso(usados)) {
    avisos.push(`G16: nenhuma parte declara "${nome}" — portão desligado. ${dica}`);
    return;
  }
  for (const f of faltantes) erros.push(`G16: ${f} sem "${nome}" — ${dica}`);
}

{
  const naoVazio = (v) => v !== undefined && String(v).trim() !== '';

  // 1. `cena` — INV-1: toda parte nomeia uma cena com consequência.
  const semCena = partes.filter((p) => !naoVazio(p.j.cena)).map((p) => p.f);
  portaoDeCampo('cena', semCena, partes.length - semCena.length,
    'INV-1: toda parte nomeia um lugar, um momento, uma pessoa ou um objeto — "cena": "o balcão do bar às 8 da manhã"');

  // 2. `decisao` em M2 — trava T2.
  const m2 = partes.filter((p) => modOf(p) === 'intermediario');
  const semDecisao = m2.filter((p) => !naoVazio(p.j.decisao)).map((p) => p.f);
  portaoDeCampo('decisao', semDecisao, m2.length - semDecisao.length,
    'T2: toda parte de APROVEITO se prende a uma decisão com dinheiro ou tempo em jogo. Sem ela, M2 vira conversação');

  // 3. `gesto` no primeiro step — o invariante da §3.4.
  const comGestoNoPrimeiro = partes.filter((p) => (p.j.steps || [])[0]?.gesto).length;
  const semGesto = partes.filter((p) => !(p.j.steps || [])[0]?.gesto).map((p) => p.f);
  portaoDeCampo('gesto (no primeiro step)', semGesto, comGestoNoPrimeiro,
    'a mão de B01 é reativada como aquecimento em TODA parte, e o campo `gesto` do primeiro step é o que torna a regra conferível');
  const gestoFora = partes.flatMap((p) =>
    (p.j.steps || []).slice(1).filter((s) => s.gesto).map((s) => `${p.f} ${s.audioKey || ''}`)
  );
  if (gestoFora.length)
    avisos.push(`G16: ${gestoFora.length} step(s) declaram "gesto" fora do primeiro step — o aquecimento abre a parte`);

  // 4. `frasePiso` — INV-18, pelo menos uma por módulo.
  const comPiso = partes.filter((p) => naoVazio(p.j.frasePiso));
  if (!emUso(comPiso.length)) {
    avisos.push(
      'G16: nenhuma parte declara "frasePiso" — portão desligado. É ≥1 por módulo, e o sucesso é ' +
        'comparado ao turista médio, nunca ao nativo'
    );
  } else {
    for (const m of MODULOS) {
      if (!totalPorMod[m]) continue;
      if (!comPiso.some((p) => modOf(p) === m))
        erros.push(`G16: ${nomeMod[m]} sem nenhuma "frasePiso" — INV-18 pede ≥1 por módulo`);
    }
  }

  // 5. T1 — título não nomeia categoria gramatical. Roda sempre: `titulo` existe
  //    em 100% do corpus desde o primeiro dia, então não há o que degradar.
  for (const p of partes) {
    const hit = (p.j.titulo || '').match(CATEGORIA_GRAMATICAL);
    if (hit)
      erros.push(
        `G16/T1: ${p.f} tem "${hit[0]}" no título — título nomeia lugar, momento, pessoa ou objeto. ` +
          'Episódio chamado "O passado" é o anti-padrão 6 em pessoa'
      );
  }

  // 6. `clique` nas partes que PLANTAM molde — o fecho de três batidas do §5.2.
  //    A contagem devolve os LUGARES onde o molde pagou, nunca as frases: o aluno
  //    desconta reivindicação da guia e conta o próprio inventário.
  //
  //    O GATILHO É A RAIZ `moldes`, NUNCA O `molde` DE STEP — e a distinção não é
  //    detalhe de implementação, é a diferença entre casa e redisparo. PRODUTO §9
  //    escreve o portão como "parte com `moldes` tem `clique`", e a trava T4 (§4)
  //    é ainda mais explícita: "Quando a parte declara `moldes`, este slot é
  //    ocupado pelo clique" — sem isso, o bloco final de M1 é "Gramática em foco".
  //    SCHEMA §4.13 fecha a semântica: `moldes` lista os moldes de que a parte é
  //    CASA, "não os que ela redispara", justamente para o G16 não cobrar clique
  //    de vinte partes.
  //
  //    A versão anterior desta linha também acendia com `steps[].molde`, o que
  //    cobrava clique de REDISPARO PURO. Medido em B04 (ep-e02a) em 28/07/2026, o
  //    efeito foi o pior possível: a parte redispara ME-PUEDE UMA vez (casa é B03),
  //    não tem como contar três lugares honestamente, e o portão exigindo três
  //    produziu uma contagem inventada — dois dos três lugares eram de frases que
  //    não são daquele molde, e o `cliqueAudioKey` apontava para um mp3 que não
  //    diz nenhuma das três batidas. Um portão que só pode ser satisfeito
  //    inventando é um portão que ENSINA a inventar, e some do lado do autor.
  const comMolde = partes.filter((p) => Array.isArray(p.j.moldes) && p.j.moldes.length);
  if (!comMolde.length) {
    avisos.push('G16: nenhuma parte declara molde — o portão do "clique" está desligado (acende junto com o G9)');
  } else {
    for (const p of comMolde) {
      const c = p.j.clique;
      if (!c) {
        erros.push(
          `G16: ${p.f} planta molde e não tem "clique" — o fecho de três batidas ` +
            '(contagem dos lugares · o desconto · o piso falsificável) é o que faz o molde ser sentido'
        );
        continue;
      }
      const contagem = Array.isArray(c) ? c : c.contagem;
      if (!Array.isArray(contagem) || contagem.length < 3)
        erros.push(
          `G16: ${p.f} tem "clique" com ${Array.isArray(contagem) ? contagem.length : 0} lugares na contagem, ` +
            'mínimo 3 — "clique": { "contagem": ["a padaria", "o mercado", "a recepção"], "desconto": "…", "piso": "…" }'
        );
      const txt = JSON.stringify(c);
      const hit = txt.match(CATEGORIA_GRAMATICAL);
      if (hit)
        erros.push(`G16: ${p.f} tem "${hit[0]}" dentro do "clique" — a contagem devolve LUGARES, não nomes de forma`);
      // "da própria parte": o lugar contado tem que ter acontecido no episódio.
      const corpo = JSON.stringify(p.j.steps || []).toLowerCase();
      for (const lugar of Array.isArray(contagem) ? contagem : [])
        if (String(lugar).length >= 4 && !corpo.includes(String(lugar).toLowerCase().replace(/^(a|o|as|os|la|el|the) /, '')))
          avisos.push(`G16: ${p.f} conta "${lugar}" no clique e esse lugar não aparece na parte — a contagem é do que ELE fez aqui`);
    }
  }
}


// ════════════════════════════════════════════════════════════════════════════
// G14 — INTEGRIDADE DE VOZ × LÍNGUA (ver scripts/lib/g14-voz-lingua.mjs)
// Roda ANTES de gravar, que é quando ainda é de graça. Foi a ausência dele que
// deixou 460 clipes de narração inglesa passarem por alemães no SKU DE.
// ════════════════════════════════════════════════════════════════════════════
try {
  const cfgVoz = existsSync(join(root, 'audio.config.json'))
    ? JSON.parse(readFileSync(join(root, 'audio.config.json'), 'utf8'))
    : {};
  const g14cfg = cfgVoz._g14;
  if (g14cfg) {
    const errosG14 = g14(collectJobs(root, cfgVoz._vozAlvo ? { vozAlvo: cfgVoz._vozAlvo } : undefined), g14cfg);
    for (const e of errosG14) erros.push(e);
    medidas.push(
      `G14 voz × língua: ${errosG14.length} divergência(s) · guia ${g14cfg.guiaLingua} (${g14cfg.guia.join(', ')}) · alvo ${g14cfg.alvoLingua} (${g14cfg.alvo.join(', ')})`
    );
  } else {
    avisos.push('G14: audio.config.json não declara "_g14" — portão de voz × língua desligado. Ver scripts/lib/g14-voz-lingua.mjs');
  }
} catch (e) {
  avisos.push('G14 não pôde rodar: ' + e.message);
}

// ── relatório ───────────────────────────────────────────────────────────────
console.log(`\nvalida-tom · ${partes.length} partes\n`);
medidas.forEach((l) => console.log('  ' + l));

if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s):`);
  avisos.slice(0, 25).forEach((a) => console.log('  ⚠ ' + a));
  if (avisos.length > 25) console.log(`  … e mais ${avisos.length - 25}`);
}

// ── O NÚMERO ÚNICO ──────────────────────────────────────────────────────────
//
// POR QUE UMA LINHA SÓ. Um relatório de trinta linhas não é citado em reunião,
// não cabe num commit e não é comparado entre SKUs — e comparar entre SKUs é
// como se descobriu a deriva (Hablá 14% · Shuō! 21% · Phûut! 29% · ¡Dime! 46%
// de moldura defensiva). O IT é a linha que se copia.
//
// CUIDADO DE LEITURA, e ele é LEI: `chars/clipe` aqui é a média dos clipes de
// NARRAÇÃO (`intro`+`recap`) — a mesma coisa que o G4 mede. Números históricos
// calculados sobre TODOS os clipes (narração + língua-alvo) são outra régua e
// não se comparam com este. Ao citar a linha, cite sempre qual das duas.
const numero = (v, casas = 1) =>
  v === undefined || v === null || Number.isNaN(v) ? '—' : v.toFixed(casas).replace('.', ',');
const skuNome = (() => {
  if (existsSync(moldesPath)) {
    try {
      const m = JSON.parse(readFileSync(moldesPath, 'utf8'));
      if (m.sku) return m.sku;
    } catch {}
  }
  const pkg = join(root, 'package.json');
  if (existsSync(pkg)) {
    try {
      return JSON.parse(readFileSync(pkg, 'utf8')).name || '?';
    } catch {}
  }
  return '?';
})();

// A escalada roda AQUI, depois de todo portão ter falado e antes de qualquer
// contagem que decida o destino do processo. As MEDIDAS acima ficam sobre o
// curso inteiro de propósito: a fita métrica tem que mostrar a obra como ela
// está, incluindo o que ainda não foi tocado. O que a escalada muda é só quem
// derruba a build.
const obra = escalonaPorParte();
if (obra.movidos || obra.calados || obra.agregados) {
  console.log(
    `\nobra em andamento: ${obra.legado.size} parte(s) ainda não reescritas · ` +
      `${obra.movidos} erro(s) de parte legada e ${obra.agregados} agregado(s) viraram aviso` +
      (obra.calados ? ` · ${obra.morrendo.size} em trânsito, ${obra.calados} ignorados` : '')
  );
  console.log('  Uma parte entra em vigor sozinha quando ganha o campo "cena".');
  console.log('  Os erros que restam são de partes JÁ reescritas — esses quebram a build.');
}

const it = [
  IT.moldura ? `moldura ${IT.moldura.protege}/${IT.moldura.total} (${IT.moldura.pct}%)` : 'moldura —',
  `saldo ${IT.saldo === undefined ? '—' : (IT.saldo === Infinity ? '∞:1' : numero(IT.saldo) + ':1')}`,
  `responde ${numero(IT.responde)}`,
  `chars/clipe ${IT.chars === undefined ? '—' : Math.round(IT.chars)}`,
  `geração ${IT.geracao === undefined ? '—' : Math.round(IT.geracao) + '%'}`,
  `⚠cards ${IT.cards === undefined ? '—' : Math.round(IT.cards) + '%'}`
].join(' · ');
const veredito = erros.length ? 'FALHA' : obra.legado.size ? 'PARCIAL' : 'PASSA';
console.log(`\nIT  ${skuNome}  ${it}  → ${veredito}`);
if (veredito === 'PARCIAL')
  console.log(`    (as partes já reescritas passam; ${obra.legado.size} ainda não foram escritas)`);

if (RELATORIO) {
  // Em modo fita métrica os erros valem AGRUPADOS: 297 linhas soltas não dizem
  // se o problema é um portão ou dezesseis, e é essa distinção que decide a
  // ordem de trabalho da obra. A lista completa sai no modo que quebra o build.
  if (erros.length) {
    const porPortao = new Map();
    for (const e of erros) {
      const g = (e.match(/^(G\d+\w*)/) || ['—'])[0];
      if (!porPortao.has(g)) porPortao.set(g, []);
      porPortao.get(g).push(e);
    }
    console.log(`\n${erros.length} erro(s) medidos, por portão:`);
    for (const [g, lista] of [...porPortao].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${g.padEnd(7)} ${String(lista.length).padStart(3)}  ${lista[0].replace(/^G\d+\w*: /, '').slice(0, 90)}`);
    }
  }
  console.log(`\n(--relatorio: ${erros.length} erro(s) medidos, mas não falho)\n`);
  process.exit(0);
}

if (erros.length) {
  console.log(`\n${erros.length} ERRO(S) de tom:`);
  erros.slice(0, 30).forEach((e) => console.log('  ✗ ' + e));
  if (erros.length > 30) console.log(`  … e mais ${erros.length - 30}`);
  console.log('\nO produto prepara para GOSTAR do destino, não só para sobreviver a ele.\n');
  process.exit(1);
}
console.log('\n✓ os portões de tom passam.\n');
