#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Describes an audio file as text an LLM can reason about: levels, noise floor, clipping, and the speech/silence
// timeline. Usage: node describe.mjs <file> [--json]

import { analyze, formatTime, loadAudio, parseArgs } from './lib/audio.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const file = positional[0];
if (!file) {
  console.error('Usage: node describe.mjs <audio file> [--json]');
  process.exit(1);
}

const result = analyze(loadAudio(file));
const { duration, peakDb, rmsDb, floorDb, thresholdDb, clipped, segments, frames } = result;

if (flags.json) {
  console.log(JSON.stringify({ file, duration, peakDb, rmsDb, floorDb, thresholdDb, clipped, segments }, null, 2));
  process.exit(0);
}

const speech = segments.filter(({ kind }) => kind === 'speech');
const speechSeconds = speech.reduce((sum, { start, end }) => sum + end - start, 0);
const pauses = segments.filter(({ kind }, index) => kind === 'silence' && index > 0 && index < segments.length - 1);

console.log(`file:        ${file}`);
console.log(`duration:    ${duration.toFixed(2)} s (analysed as 16 kHz mono)`);
console.log(`level:       peak ${peakDb.toFixed(1)} dBFS, mean ${rmsDb.toFixed(1)} dBFS`);
console.log(`noise floor: ${floorDb.toFixed(1)} dBFS; speech counted above ${thresholdDb.toFixed(1)} dBFS`);
console.log(`clipping:    ${clipped === 0 ? 'none' : `${clipped} samples at full scale`}`);
console.log(
  `speech:      ${speechSeconds.toFixed(1)} s in ${speech.length} runs; ${pauses.length} pauses between them` +
    (pauses.length > 0 ? ` (longest ${Math.max(...pauses.map(({ start, end }) => end - start)).toFixed(2)} s)` : ''),
);

console.log('\nTimeline (speech/silence, merged: speech ≥ 0.1 s, silence ≥ 0.3 s):');
console.log('  start    end      length  kind     mean dB  max dB');
for (const { kind, start, end, meanDb, maxDb } of segments) {
  console.log(
    `  ${formatTime(start).padEnd(8)} ${formatTime(end).padEnd(8)} ${(end - start).toFixed(2).padStart(6)}  ` +
      `${kind.padEnd(8)} ${meanDb.toFixed(1).padStart(7)} ${maxDb.toFixed(1).padStart(7)}`,
  );
}

// One character per 100 ms, so a minute of audio is 600 characters: enough to see rhythm without a picture.
const BARS = ' ▁▂▃▄▅▆▇█';
const perCell = 5;
let line = '';
for (let index = 0; index < frames.length; index += perCell) {
  const level = Math.max(...frames.slice(index, index + perCell).map(({ rmsDb }) => rmsDb));
  const scaled = (level - floorDb) / Math.max(1, -6 - floorDb);
  line += BARS[Math.max(0, Math.min(BARS.length - 1, Math.round(scaled * (BARS.length - 1))))];
}
console.log('\nLoudness, one character per 100 ms (rows of 10 s):');
for (let offset = 0; offset < line.length; offset += 100) {
  console.log(`  ${formatTime(offset / 10).padEnd(7)} |${line.slice(offset, offset + 100)}|`);
}
