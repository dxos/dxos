//
// Copyright 2026 DXOS.org
//

/**
 * Replays the agents-scope voice fixtures through Whistle in Node (the audio-view skill's `whistle-replay.mjs`, which
 * runs the engine and model this story pins) and checks what the story would show. The recordings are private
 * fixtures in the `test-fixtures` R2 bucket, under `agents/`; pull them with
 * `moon run fixtures:pull -- <name> --scope agents` (`private-fixtures` skill):
 *
 * - `whistle-silence`: room tone only.
 * - `whistle-one-two-three`: "one two three".
 * - `whistle-echo-query-a`, `whistle-echo-query-b`: "pull up the echo query framework", two takes.
 *
 * Tagged `manual` (run with `DX_RUN_MANUAL_TESTS=1`) because each replay downloads and runs the model, and every
 * suite skips unless its fixture has been pulled.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { fixtureExists, fixturePath } from '@dxos/fixtures';

const REPLAY = join(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..'),
  '.agents/skills/audio-view/scripts/whistle-replay.mjs',
);

/** The bias terms the story starts with that these recordings say. */
const KEYWORDS = ['ECHO', 'DXOS', 'Composer'];

/** The story's two pass intervals. */
const MODES = { accurate: 1_000, lowLatency: 200 } as const;

type ReplaySummary = {
  transcript: string;
  wer: number;
  inSilence: { word: string; start: number }[];
  keywordRecall: { expected: string[]; found: string[]; missed: string[] };
  meanCommitLag?: number;
};

/** The pulled fixture's path; the suites skip when it is missing, so a missing one here is a bug. */
const pulled = (name: string): string => {
  const file = fixturePath(name, { extension: 'wav' });
  if (!file) {
    throw new Error(`Fixture ${name} is not pulled`);
  }
  return file;
};

const replay = (file: string, reference: string, passMs: number): ReplaySummary => {
  const args = [REPLAY, file, '--json', '--pass-ms', String(passMs), '--keywords', KEYWORDS.join(', ')];
  const result = spawnSync(process.execPath, [...args, '--reference', reference], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`whistle-replay failed: ${result.stderr}`);
  }
  const summary: ReplaySummary = JSON.parse(result.stdout);
  console.log(
    JSON.stringify({
      file: file.split('/').at(-1),
      passMs,
      transcript: summary.transcript,
      wer: Number(summary.wer.toFixed(2)),
      inSilence: summary.inSilence.map(({ word }) => word),
      keywords: summary.keywordRecall,
      commitLag: summary.meanCommitLag,
    }),
  );
  return summary;
};

const options = { tags: ['manual'], timeout: 120_000 };

const speech = [
  { name: 'whistle-one-two-three', reference: 'one two three' },
  { name: 'whistle-echo-query-a', reference: 'pull up the echo query framework' },
  { name: 'whistle-echo-query-b', reference: 'pull up the echo query framework' },
];

describe.skipIf(!fixtureExists('whistle-silence', { extension: 'wav' }))('whistle-silence', () => {
  // Whistle alone commits "Thank you." over this room tone; the story's gate keeps it from being decoded.
  test('commits no words', options, ({ expect }) => {
    const file = pulled('whistle-silence');
    for (const passMs of Object.values(MODES)) {
      expect(replay(file, '', passMs).transcript).toBe('');
    }
  });
});

for (const { name, reference } of speech) {
  describe.skipIf(!fixtureExists(name, { extension: 'wav' }))(name, () => {
    test('accurate mode transcribes it closely, with nothing invented in silence', options, ({ expect }) => {
      const file = pulled(name);
      expect(file).toBeDefined();
      const summary = replay(file, reference, MODES.accurate);
      expect(summary.wer).toBeLessThanOrEqual(0.5);
      expect(summary.inSilence).toEqual([]);
    });

    test('low-latency mode commits words', options, ({ expect }) => {
      const file = pulled(name);
      expect(file).toBeDefined();
      // Reported, not bounded: passes 200 ms apart trade accuracy for latency by design.
      const summary = replay(file, reference, MODES.lowLatency);
      expect(summary.transcript).not.toBe('');
    });
  });
}
