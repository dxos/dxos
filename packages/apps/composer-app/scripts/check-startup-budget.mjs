//
// Copyright 2026 DXOS.org
//

/**
 * Runtime guardrail on startup: fails when the median number of modules activated by the time the
 * app reports ready regresses past budget. Reads the JSONL sample log that the warm-cold harness
 * scenario appends to (`appendRunSample`), so it must run after the harness, over several repeats.
 *
 * Why this metric and no other. Startup TIMINGS are unusable as a gate here, because CI has no
 * fixed runner: repeats of a single unchanged commit have spanned 3828-7330 ms of `profilerTotal`
 * (a 1.9x swing) and 6851-10576 ms of `navToReady`, purely from container contention. On real
 * hardware the same branch measured +/-1.7%, so the noise is environmental, not inherent.
 * Modules-at-ready is a COUNT, so it barely moves with machine speed: same-commit repeats vary by
 * <=10 (3.3%), while the activation regression this branch actually shipped and reverted moved it
 * +17 to +27 (289 -> 306/316). Signal clears noise by 2-3x, which no timing here does.
 *
 * That also makes it the metric that catches the failure mode this work introduces: moving a
 * module back onto the startup pass changes nothing statically — the boot budget cannot see it —
 * and shows up only as more activations before ready.
 *
 * TODO(startup-latency): gate on `profilerTotal` / `navToReady` / TBT once a fixed (self-hosted or
 * consistently-sized) runner exists; until then they are recorded per run and trended, never
 * failed on. Revisit the thresholds here at the same time — see BENCHMARKS.md for the series.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Median must stay at or under this. Baseline 283 (2026-08-03); headroom covers same-commit jitter. */
const MAX_MODULES_AT_READY = 300;

/** Below this the median is not meaningful — one sample decides nothing. */
const MIN_SAMPLES = 3;

const samplePath = path.join(
  process.cwd(),
  '..',
  '..',
  '..',
  'test-results',
  'composer-app',
  'startup-warm-cold.runs.jsonl',
);

if (!existsSync(samplePath)) {
  console.error(
    `ERROR: no startup samples at ${samplePath}.\n` +
      'Run the harness first: moon run composer-app:check-startup-budget (which repeats the\n' +
      'warm-cold scenario), or DX_PWA=false moon run composer-app:e2e -- --grep "warm-cold".',
  );
  process.exit(1);
}

const samples = readFileSync(samplePath, 'utf8')
  .split('\n')
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line));

if (samples.length < MIN_SAMPLES) {
  console.error(`ERROR: ${samples.length} startup sample(s), need at least ${MIN_SAMPLES} to take a median.`);
  process.exit(1);
}

const median = (values) => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const counts = samples.map((sample) => sample.modulesAtReady);
const medianCount = median(counts);

// Reported, never gated — see the TODO above.
const trend = ['profilerTotal', 'navigationToReady']
  .map((key) => `${key} median ${Math.round(median(samples.map((sample) => sample[key])))} ms`)
  .join(', ');

console.log(
  `startup: modules at ready median ${medianCount} over ${samples.length} runs ` +
    `[${counts.join(', ')}] (budget: ${MAX_MODULES_AT_READY})`,
);
console.log(`startup (trend only, not gated): ${trend}`);

if (medianCount > MAX_MODULES_AT_READY) {
  console.error(
    `\nERROR: ${medianCount} modules activated before ready exceeds ${MAX_MODULES_AT_READY}.\n` +
      'Something that used to activate on demand now activates during startup. Usual causes: a\n' +
      'module maker whose default `activatesOn` was dropped or widened, or a capability newly\n' +
      'required by a boot module (which pulls its provider onto the startup pass).\n' +
      'Compare the `modules` column across BENCHMARKS.md rows to find where it moved.',
  );
  process.exit(1);
}
