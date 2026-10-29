#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Replays an audio file through Whistle as the browser story streams it, and reports what happened on one clock:
// every pass (committed words, the pending tail, pass time), the final transcript, and the words worth a look -
// committed in silence (likely invented), low confidence, or slow to commit.
//
// Usage: node whistle-replay.mjs <file> [--pass-ms 1000] [--keywords "ECHO, DXOS"] [--language en]
//                                       [--reference "expected text"] [-o timeline.jsonl] [--json] [--no-gate]
// --no-gate decodes from the first sample instead of waiting, as the story does, for sound.

import { writeFileSync } from 'node:fs';

import { analyze, formatTime, loadAudio, parseArgs, segmentAt } from './lib/audio.mjs';
import { termRecall, wordErrorRate } from './lib/score.mjs';
import { loadWhistle } from './lib/whistle.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const file = positional[0];
if (!file) {
  console.error(
    'Usage: node whistle-replay.mjs <file> [--pass-ms 1000] [--keywords "a, b"] [--language en] [--reference text] [-o out.jsonl] [--json]',
  );
  process.exit(1);
}

const keywords =
  typeof flags.keywords === 'string'
    ? flags.keywords
        .split(/[,\n]/)
        .map((term) => term.trim())
        .filter(Boolean)
    : [];
const passMs = Number(flags['pass-ms'] ?? 1_000);
const samples = loadAudio(file);
const analysis = analyze(samples);
const whistle = await loadWhistle({ language: flags.language ?? 'en', keywords });
const events = whistle.replay(samples, { passMs, gate: !flags['no-gate'] });

const words = events.flatMap(({ at, committed }) =>
  committed.map((word) => ({ ...word, committedAt: at, lag: at - word.end })),
);
const transcript = words.map(({ word }) => word).join(' ');
const inSilence = words.filter(({ start, end }) => segmentAt(analysis.segments, (start + end) / 2)?.kind === 'silence');
const lowConfidence = words.filter(({ probability }) => probability !== undefined && probability < 0.5);
const passTimes = events.filter(({ type }) => type === 'pass').map(({ passMs: ms }) => ms);
const lags = words.filter(({ lag }) => lag >= 0).map(({ lag }) => lag);
const mean = (values) =>
  values.length === 0 ? undefined : values.reduce((sum, value) => sum + value, 0) / values.length;

const summary = {
  file,
  duration: analysis.duration,
  passMs,
  keywords,
  loadMs: Math.round(whistle.loadMs),
  meanPassMs: mean(passTimes),
  maxPassMs: passTimes.length > 0 ? Math.max(...passTimes) : undefined,
  meanCommitLag: mean(lags),
  transcript,
  inSilence: inSilence.map(({ word, start }) => ({ word, start })),
  lowConfidence: lowConfidence.map(({ word, start, probability }) => ({ word, start, probability })),
};
if (typeof flags.reference === 'string') {
  summary.reference = flags.reference;
  summary.wer = wordErrorRate(flags.reference, transcript);
  summary.keywordRecall = termRecall(flags.reference, transcript, keywords);
}

if (flags.out) {
  writeFileSync(
    flags.out,
    [...events, { type: 'summary', ...summary }].map((event) => JSON.stringify(event)).join('\n') + '\n',
  );
}
if (flags.json) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

console.log(`file:         ${file} (${analysis.duration.toFixed(2)} s)`);
console.log(`replay:       a pass every ${passMs} ms; model load ${summary.loadMs} ms`);
console.log(
  `passes:       ${passTimes.length}, mean ${summary.meanPassMs?.toFixed(0) ?? '-'} ms, max ${summary.maxPassMs ?? '-'} ms`,
);
console.log(`commit lag:   mean ${summary.meanCommitLag?.toFixed(2) ?? '-'} s after a word ends`);
console.log(`transcript:   ${transcript || '(nothing)'}`);
if (summary.reference !== undefined) {
  console.log(`reference:    ${summary.reference}`);
  console.log(`WER:          ${(summary.wer * 100).toFixed(0)}%`);
  const { expected, found, missed } = summary.keywordRecall;
  if (expected.length > 0) {
    console.log(
      `keywords:     ${found.length}/${expected.length} recognised${missed.length > 0 ? `; missed ${missed.join(', ')}` : ''}`,
    );
  }
}

console.log('\nPasses (audio time when the pass ran):');
for (const { type, at, passMs: ms, committed, pending } of events) {
  const label = type === 'stop' ? 'stop' : `${ms} ms`;
  const added = committed.map(({ word }) => word).join(' ');
  console.log(
    `  ${formatTime(at).padEnd(7)} ${label.padStart(7)}  ${added ? `+ ${added}` : ''}${pending ? `  ...${pending}` : ''}`,
  );
}

console.log('\nWords:');
console.log('  start    end      p     lag    audio    word');
for (const { word, start, end, probability, lag } of words) {
  const kind = segmentAt(analysis.segments, (start + end) / 2)?.kind ?? '?';
  console.log(
    `  ${formatTime(start).padEnd(8)} ${formatTime(end).padEnd(8)} ${(probability ?? NaN).toFixed(2).padStart(5)} ` +
      `${lag.toFixed(2).padStart(5)}s  ${kind.padEnd(8)} ${word}`,
  );
}
if (inSilence.length > 0) {
  console.log(`\nCommitted during silence (likely invented): ${inSilence.map(({ word }) => word).join(' ')}`);
}
