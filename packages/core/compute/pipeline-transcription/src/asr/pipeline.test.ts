//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { captureCommit } from '../runtime/index.ts';
import { makeCorrectionStage } from '../stages/index.ts';
import { createScriptedTranscriber } from '../testing/index.ts';
import { runAsrPipeline } from './pipeline.ts';

describe('runAsrPipeline', () => {
  test('feeds a transcriber’s segments through the stages to the sink, in spoken order', async ({ expect }) => {
    const { commit, writes } = captureCommit();
    const seen: string[] = [];
    const asr = runAsrPipeline({
      createTranscriber: createScriptedTranscriber({
        intervalMs: 1,
        segments: [{ text: 'so i think we should ship on friday' }, { text: 'and review the docs next week' }],
      }),
      stages: [makeCorrectionStage()],
      commit,
      onSegment: (block) => seen.push(block.text),
      drainSilenceMs: 0,
    });

    await asr.open();
    asr.start();
    await vi.waitFor(() => expect(seen).toHaveLength(2));
    await asr.end();

    expect(seen).toEqual(['so i think we should ship on friday', 'and review the docs next week']);
    expect(writes.flatMap((write) => write.blockUpdates ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
