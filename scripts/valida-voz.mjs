#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// G19 — UMA CHAVE, DUAS VOZES
//
// Um `audioKey` é o nome de UM arquivo mp3. Quando dois steps reusam a mesma
// chave — o `ouvir` que apresenta o modelo e o `responde` que o cobra — os dois
// têm de declarar a MESMA voz, porque o gerador grava uma vez só: ele mantém um
// conjunto de chaves já vistas e ignora a segunda ocorrência. A voz que vai para
// o disco é a da PRIMEIRA aparição, em ordem de step.
//
// Se as duas declarações divergem, nada quebra e nada avisa. O clipe existe, o
// build fica verde, e o aluno ouve uma mulher onde a interface disse que era um
// homem. Foi assim em 14 clipes de cinco cursos — Espanha, França (EN e DE) e
// Itália (EN e DE) — e ninguém notou até um verificador de Portugal tropeçar
// no caso enquanto conferia outra coisa.
//
// O conserto NÃO é regravar: o mp3 já está no disco com a voz da primeira
// declaração. É alinhar a segunda declaração ao que foi de fato gravado.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'lib', 'course');
if (!existsSync(dir)) {
  console.log('valida-voz · sem src/lib/course, nada a conferir');
  process.exit(0);
}

const primeira = new Map(); // audioKey → { voz, onde }
const colisoes = [];
let chaves = 0;

const arquivos = readdirSync(dir).filter((f) => /^(ep|quiz-ep)-.*\.json$/.test(f)).sort();
for (const f of arquivos) {
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const ver = (chave, voz, campo) => {
    if (!chave || !voz) return;
    const ja = primeira.get(chave);
    if (!ja) { primeira.set(chave, { voz, onde: `${f} ${campo}` }); chaves++; return; }
    if (ja.voz !== voz)
      colisoes.push(
        `${chave} · gravado como ${ja.voz} (${ja.onde}) e declarado ${voz} em ${f} ${campo}`
      );
  };
  for (const s of j.steps || []) {
    ver(s.audioKey, s.voz, s.tipo || 'step');
    ver(s.promptAudioKey, s.promptVoz, `${s.tipo || 'step'}/prompt`);
  }
  for (const d of j.dialogo || []) ver(d.audioKey, d.voz, 'diálogo');
}

console.log(`\nvalida-voz · ${basename(root)} · ${chaves} chaves de áudio distintas\n`);
if (colisoes.length) {
  console.log(`  UMA CHAVE, DUAS VOZES: ${colisoes.length}\n`);
  for (const c of colisoes) console.log(`  ✗ ${c}`);
  console.log(
    '\nO gerador grava a PRIMEIRA declaração e ignora as demais. Alinhe a segunda\n' +
      'ao que já está no disco — regravar trocaria a voz do clipe que o aluno já ouviu.\n'
  );
  process.exit(1);
}
console.log('  ✓ toda chave de áudio tem uma voz só.\n');
