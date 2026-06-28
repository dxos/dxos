//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { captureCommit } from './dispatch';
import { runLivePipeline } from './live';
import { makeCorrectionStage } from './stages';

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
});
