//
// Copyright 2026 DXOS.org
//

/**
 * Aggregate self-time in a .cpuprofile by function, optionally filtered by a
 * substring of the script URL. Companion to profile-startup.mjs.
 *
 * Usage:
 *   node scripts/analyze-cpuprofile.mjs <file.cpuprofile> [--filter plugin-calls] [--top 25]
 */

import { readFileSync } from 'node:fs';

const [file] = process.argv.slice(2).filter((value) => !value.startsWith('--'));
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const filter = arg('filter', '');
const top = Number(arg('top', '25'));

const profile = JSON.parse(readFileSync(file, 'utf8'));
const nodeById = new Map(profile.nodes.map((node) => [node.id, node]));
const selfMicros = new Map();
for (let i = 0; i < profile.samples.length; i++) {
  const delta = profile.timeDeltas[i] ?? 0;
  if (delta <= 0) {
    continue;
  }
  const node = nodeById.get(profile.samples[i]);
  const frame = node?.callFrame ?? {};
  const url = frame.url ?? '';
  if (filter && !url.includes(filter)) {
    continue;
  }
  const location = url.split('/').slice(-2).join('/');
  const key = `${frame.functionName || '(anon)'} @ ${location}:${frame.lineNumber + 1}`;
  selfMicros.set(key, (selfMicros.get(key) ?? 0) + delta);
}

const rows = [...selfMicros.entries()].sort((a, b) => b[1] - a[1]);
const total = rows.reduce((sum, [, micros]) => sum + micros, 0);
console.log(`total self-time${filter ? ` for '${filter}'` : ''}: ${Math.round(total / 1000)} ms\n`);
for (const [key, micros] of rows.slice(0, top)) {
  console.log(`${String(Math.round(micros / 1000)).padStart(7)} ms  ${key}`);
}
