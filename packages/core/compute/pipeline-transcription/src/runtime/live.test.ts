//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeCorrectionStage } from '../stages';
import { captureCommit } from './dispatch';
import { runLivePipeline } from './live';

describe('runLivePipeline', () => {
  test('drives per-block stages from pushed blocks and drains on end', async ({ expect }) => {
    const { commit, writes } = captureCommit();
    const live = runLivePipeline({ stages: [makeCorrectionStage()], commit });
    live.block({ _tag: 'transcript', started: 's', text: 'so i think we should ship munich on friday' });
    live.block({ _tag: 'transcript', started: 's', text: 'and review the docs next week' });
    await live.end();

    const corrected = writes.flatMap((write) => write.blockUpdates ?? []).map((update) => update.corrected);
    expect(corrected.length).toBeGreaterThanOrEqual(2);
  });

  test('end resolves with no events pushed', async ({ expect }) => {
    const { commit, writes } = captureCommit();
    const live = runLivePipeline({ stages: [makeCorrectionStage()], commit });
    await live.end();
    expect(writes).toHaveLength(0);
  });

  // Headless equivalent of the file-transcription story: Whisper-style fragments (cut mid-sentence
  // across chunk windows) streamed through correction. Guards the deterministic correction output —
  // notably that a fragment ending in a comma does not become "Years,.".
  test('corrects a fragmented transcript without punctuation artifacts', async ({ expect }) => {
    const { commit, writes } = captureCommit();
    const live = runLivePipeline({ stages: [makeCorrectionStage()], commit });
    const fragments = [
      "I've been living in London for about",
      'Years,',
      'maybe a bit longer',
      "I've lived kind of mostly in",
      'and east London, so I moved to Camden originally',
      'and now I live in Hackney, which is probably',
      'the kind of trendiest area of London',
    ];
    for (const text of fragments) {
      live.block({ _tag: 'transcript', started: 's', text });
    }
    await live.end();

    const corrected = writes
      .flatMap((write) => write.blockUpdates ?? [])
      .map((update) => update.corrected)
      .filter((text): text is string => typeof text === 'string');

    expect(corrected.length).toBeGreaterThan(0);
    for (const text of corrected) {
      // Every corrected block ends with terminal punctuation and never a "comma + period" artifact.
      expect(text).toMatch(/[.!?]$/);
      expect(text).not.toMatch(/[,;:]\.$/);
    }
    expect(corrected).toContain('Years.');
  });
});
