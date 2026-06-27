//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Organization } from '@dxos/types';

import { makeDatabaseLookup } from '../lookup';
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

describe('extraction (with full-text index)', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('links matching proper nouns to objects and reports the rest as candidates', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Organization.Organization] });
    db.add(Obj.make(Organization.Organization, { name: 'Amco' }));
    await db.flush({ indexes: true });

    const stage = makeExtractionStage();
    const block = { _tag: 'transcript' as const, started: 's', text: 'we met Amco and Globex today' };
    const write = await EffectEx.runPromise(
      stage.run({ window: [block] }, { lookup: makeDatabaseLookup(db), model: stage.model! }),
    );

    const update = write.blockUpdates![0];
    expect(update.references).toHaveLength(1);
    // Matched entity is rewritten as an inline echo link (dx-anchor) in the corrected text.
    expect(update.corrected).toMatch(/\[Amco\]\(echo:\/[^)]+\)/);
    const candidates = (update.candidates ?? []).map((candidate) => candidate.text);
    expect(candidates).toContain('Globex');
    expect(candidates).not.toContain('Amco');
  });
});
