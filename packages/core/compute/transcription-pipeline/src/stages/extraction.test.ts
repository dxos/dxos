//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { extractProperNouns, makeExtractionStage } from './extraction';

describe('extraction', () => {
  test('extractProperNouns finds capitalized runs minus stop-words', ({ expect }) => {
    expect(extractProperNouns('We should ship Munich with Anna')).toEqual(['Munich', 'Anna']);
  });

  test('reports unmatched proper nouns as candidates when no db is provided', async ({ expect }) => {
    const stage = makeExtractionStage();
    const block = { _tag: 'transcript' as const, started: 's', text: 'ship Munich on Friday' };
    const write = await EffectEx.runPromise(stage.run({ window: [block] }, { model: stage.model! }));
    const candidates = (write.blockUpdates?.[0].candidates ?? []).map((candidate) => candidate.text);
    expect(candidates).toContain('Munich');
    expect(candidates).toContain('Friday');
  });
});
