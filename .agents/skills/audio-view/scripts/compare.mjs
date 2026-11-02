#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Runs one recording through Whistle and through bigger hosted speech models, and prints the transcripts side by side
// with each one's time and, given --reference, its word error rate. A provider without credentials is skipped, not
// failed. Anthropic's API takes no audio input, so it has no row.
//
// Usage: node compare.mjs <file> [--reference "expected text"] [--keywords "ECHO, DXOS"] [--language en] [--json]
//
// Credentials (environment): OPENAI_API_KEY for whisper-1 and gpt-4o-transcribe; CLOUDFLARE_API_TOKEN and
// CLOUDFLARE_ACCOUNT_ID for Workers AI (@cf/openai/whisper-large-v3-turbo).

import { readFileSync } from 'node:fs';

import { SAMPLE_RATE, loadAudio, parseArgs } from './lib/audio.mjs';
import { termRecall, wordErrorRate } from './lib/score.mjs';
import { loadWhistle } from './lib/whistle.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const file = positional[0];
if (!file) {
  console.error('Usage: node compare.mjs <file> [--reference text] [--keywords "a, b"] [--language en] [--json]');
  process.exit(1);
}

const language = typeof flags.language === 'string' ? flags.language : 'en';
const keywords =
  typeof flags.keywords === 'string'
    ? flags.keywords
        .split(/[,\n]/)
        .map((term) => term.trim())
        .filter(Boolean)
    : [];
const reference = typeof flags.reference === 'string' ? flags.reference : undefined;

/** 16-bit PCM WAV of the decoded samples, so every provider receives the same audio whatever the input format. */
const toWav = (samples) => {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) =>
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2),
  );
  return buffer;
};

const samples = loadAudio(file);
const wav = file.toLowerCase().endsWith('.wav') ? readFileSync(file) : toWav(samples);

const openai = (model) => ({
  name: `openai/${model}`,
  missing: process.env.OPENAI_API_KEY ? undefined : 'OPENAI_API_KEY',
  run: async () => {
    const form = new FormData();
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', model);
    form.append('language', language);
    if (keywords.length > 0) {
      // The prompt is OpenAI's only bias input; it reads as preceding context, so a list of terms works.
      form.append('prompt', keywords.join(', '));
    }
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${await response.text()}`);
    }
    return (await response.json()).text;
  },
});

const PROVIDERS = [
  {
    // Streamed as the story does; its time includes loading the model.
    name: 'whistle (on-device, streamed)',
    run: async () => {
      const whistle = await loadWhistle({ language, keywords });
      return whistle
        .replay(samples, { passMs: 1_000 })
        .flatMap(({ committed }) => committed.map(({ word }) => word))
        .join(' ');
    },
  },
  openai('whisper-1'),
  openai('gpt-4o-transcribe'),
  {
    name: 'cloudflare/@cf/openai/whisper-large-v3-turbo',
    missing:
      ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter((name) => !process.env[name]).join(', ') || undefined,
    run: async () => {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/openai/whisper-large-v3-turbo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: wav.toString('base64'),
            language,
            ...(keywords.length > 0 ? { initial_prompt: keywords.join(', ') } : {}),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(`${response.status} ${JSON.stringify(body.errors ?? body)}`);
      }
      return body.result.text;
    },
  },
];

const rows = [];
for (const provider of PROVIDERS) {
  if (provider.missing) {
    rows.push({ name: provider.name, skipped: `no ${provider.missing}` });
    continue;
  }
  const started = performance.now();
  try {
    const transcript = (await provider.run()).trim();
    rows.push({
      name: provider.name,
      ms: Math.round(performance.now() - started),
      transcript,
      ...(reference !== undefined
        ? { wer: wordErrorRate(reference, transcript), keywords: termRecall(reference, transcript, keywords) }
        : {}),
    });
  } catch (err) {
    rows.push({ name: provider.name, error: err instanceof Error ? err.message : String(err) });
  }
}
rows.push({ name: 'anthropic', skipped: 'the Messages API takes no audio input' });

if (flags.json) {
  console.log(JSON.stringify({ file, reference, keywords, rows }, null, 2));
  process.exit(0);
}

console.log(`file:       ${file} (${(samples.length / SAMPLE_RATE).toFixed(2)} s)`);
if (reference !== undefined) {
  console.log(`reference:  ${reference}`);
}
const width = Math.max(...rows.map(({ name }) => name.length));
for (const row of rows) {
  if (row.skipped || row.error) {
    console.log(`\n${row.name.padEnd(width)}  ${row.skipped ? `skipped: ${row.skipped}` : `error: ${row.error}`}`);
    continue;
  }
  const score = row.wer === undefined ? '' : `  WER ${(row.wer * 100).toFixed(0)}%`;
  const missed = row.keywords?.missed.length ? `  missed ${row.keywords.missed.join(', ')}` : '';
  console.log(`\n${row.name.padEnd(width)}  ${row.ms} ms${score}${missed}`);
  console.log(`  ${row.transcript || '(nothing)'}`);
}
