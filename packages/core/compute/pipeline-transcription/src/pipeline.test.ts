//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type ContentBlock, Organization, Person } from '@dxos/types';

import { TranscriptionPipeline } from './pipeline';
import { type CommitFn } from './runtime';
import { makeDatabaseLookup } from './types/lookup';
import { TranscriptEvent } from './types/transcript-event';

// Reproduces the Pipeline testbench path: correction + extraction through the runtime, asserting that
// recognized entities are linked in the final corrected text (regardless of stage commit ordering).
describe('pipeline integration (correction + extraction)', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('links seeded entities in corrected text', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] });
    db.add(Obj.make(Organization.Organization, { name: 'DXOS' }));
    db.add(Obj.make(Person.Person, { fullName: 'Sarah Johnson' }));
    await db.flush({ indexes: true });

    const blocks: ContentBlock.Transcript[] = [
      { _tag: 'transcript', started: 's0', text: 'So I caught up with Sarah Johnson this morning' },
      { _tag: 'transcript', started: 's1', text: 'We discussed the DXOS roadmap' },
    ];
    const source = Stream.fromIterable([
      ...blocks.map((block) => TranscriptEvent.block(block)),
      TranscriptEvent.silence(5_000),
    ]);

    // Mutate the window blocks in place (mirrors the story commit).
    const commit: CommitFn = (write, window) =>
      Effect.sync(() => {
        for (const update of write.blockUpdates ?? []) {
          const block = window[update.index];
          if (block) {
            const { index: _index, ...patch } = update;
            Object.assign(block, patch);
          }
        }
      });

    await EffectEx.runPromise(
      TranscriptionPipeline.run({
        source,
        lookup: makeDatabaseLookup(db),
        commit,
      }),
    );

    expect(blocks[0].corrected).toMatch(/\[Sarah Johnson\]\(echo:\/[^)]+\)/);
    expect(blocks[1].corrected).toMatch(/\[DXOS\]\(echo:\/[^)]+\)/);
  });
});
