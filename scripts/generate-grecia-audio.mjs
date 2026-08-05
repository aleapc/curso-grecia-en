#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(root, 'docs', 'content-grecia');
const outRoot = join(root, 'static', 'audio');
const statePath = join(outRoot, 'manifest.json');
const config = JSON.parse(readFileSync(join(root, 'audio.config.json'), 'utf8'));

function loadKey() {
  const fromEnv = process.env.ELEVENLABS_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const file = join(root, '.env');
  if (!existsSync(file)) throw new Error('Falta .env com a chave da ElevenLabs.');
  const raw = readFileSync(file, 'utf8').trim();
  const assignment = raw.match(/^ELEVENLABS_API_KEY\s*=\s*(.+)$/m);
  return (assignment?.[1] || raw).replace(/^["']|["']$/g, '').trim();
}

const apiKey = loadKey();
const onlySlot = process.argv.includes('--slot')
  ? process.argv[process.argv.indexOf('--slot') + 1]?.toUpperCase()
  : null;
const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.includes('--limit')
  ? Number(process.argv[process.argv.indexOf('--limit') + 1])
  : Infinity;

function request(path, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        hostname: 'api.elevenlabs.io',
        path,
        method,
        headers: {
          'xi-api-key': apiKey,
          ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {})
        },
        // A inspeção TLS local do Windows não é reconhecida pelo Node. A exceção
        // fica confinada ao host exato da API da ElevenLabs.
        rejectUnauthorized: false
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const data = Buffer.concat(chunks);
          if ((response.statusCode || 500) >= 400) {
            reject(new Error(`${response.statusCode}: ${data.toString('utf8')}`));
          } else resolve({ status: response.statusCode, data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function resolveText(clip, episode, quiz) {
  if (clip.text) return clip.text;
  if (clip.key === quiz.introAudioKey) return quiz.introPt;
  const dialogue = quiz.dialogo?.find((line) => line.audioKey === clip.key);
  if (dialogue) return dialogue.tts || dialogue.es;
  const prompt = episode.steps.find((step) => step.promptAudioKey === clip.key);
  if (prompt) return prompt.promptPt;
  const step = episode.steps.find((item) => item.audioKey === clip.key);
  if (!step) throw new Error(`${clip.key}: texto não encontrado no episódio/quiz.`);
  return clip.role.startsWith('guide_') ? step.pt : step.tts || step.es;
}

function canonicalSlots() {
  return [
    ...Array.from({ length: 18 }, (_, index) => `B${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 10 }, (_, index) => `I${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 8 }, (_, index) => `A${String(index + 1).padStart(2, '0')}`)
  ];
}

function collectJobs() {
  const jobs = [];
  for (const slot of onlySlot ? [onlySlot] : canonicalSlots()) {
    const dir = join(contentRoot, slot);
    const files = ['episode.json', 'quiz.json', 'audio-manifest.pre.json'].map((f) => join(dir, f));
    if (!files.every(existsSync)) continue;
    const [episode, quiz, manifest] = files.map(readJson);
    for (const clip of manifest.clips) {
      const role = config.roles[clip.role];
      if (!role) throw new Error(`${slot}/${clip.key}: papel de voz desconhecido ${clip.role}.`);
      jobs.push({
        slot,
        key: clip.key,
        kind: clip.kind,
        text: resolveText(clip, episode, quiz),
        role: clip.role,
        voice: role,
        model: clip.role.startsWith('guide_') ? config.guideModel : config.targetModel
      });
    }
  }
  return jobs;
}

function loadState() {
  if (!existsSync(statePath)) return {};
  try { return readJson(statePath); } catch { return {}; }
}

async function subscription() {
  const { data } = await request('/v1/user/subscription');
  const value = JSON.parse(data.toString('utf8'));
  console.log(JSON.stringify({
    tier: value.tier,
    characterCount: value.character_count,
    characterLimit: value.character_limit
  }, null, 2));
}

async function synthesize(job) {
  const { data } = await request(`/v1/text-to-speech/${job.voice.voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    body: {
      text: job.text,
      model_id: job.model,
      language_code: job.voice.languageCode,
      voice_settings: {
        stability: job.role.startsWith('guide_') ? 0.78 : 0.72,
        similarity_boost: 0.88,
        style: 0,
        use_speaker_boost: true,
        speed: job.kind === 'target' || job.kind === 'return' ? 0.94 : 1
      },
      seed: 4242,
      apply_text_normalization: 'auto'
    }
  });
  return data;
}

async function generate() {
  const jobs = collectJobs();
  if (!jobs.length) throw new Error('Nenhum pacote pré-áudio completo encontrado.');
  const state = loadState();
  const pending = jobs.filter((job) => state[job.key] !== job.text).slice(0, limitArg);
  const characters = pending.reduce((total, job) => total + job.text.length, 0);
  console.log(`Jobs: ${jobs.length} · pendentes: ${pending.length} · caracteres: ${characters}` +
    (onlySlot ? ` · slot: ${onlySlot}` : ''));
  for (const job of pending) {
    console.log(`${dryRun ? '·' : '→'} ${job.key} · ${job.voice.name} · ${job.text.length} chars`);
    if (dryRun) continue;
    const bytes = await synthesize(job);
    mkdirSync(outRoot, { recursive: true });
    writeFileSync(join(outRoot, `${job.key}.mp3`), bytes);
    state[job.key] = job.text;
    writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
  if (!dryRun) console.log(`Concluído: ${pending.length} clipes gerados.`);
}

if (process.argv.includes('--balance')) await subscription();
else await generate();
