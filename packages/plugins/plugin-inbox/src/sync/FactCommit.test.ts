//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type FactUnit } from '@dxos/pipeline-email';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';
import { SyncBinding } from '@dxos/plugin-connector';
import { Cursor } from '@dxos/types';

import * as FactCommit from './FactCommit';

const makeFact = (id: string, object = 'paris'): RDF.Fact => ({
  id,
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: object },
    validFrom: '2026-06-12',
    quote: "I think I'm probably going to Paris next week",
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: {
    agent: 'alice',
    source: 'dxn:queue:...:msg-1',
    generatedAtTime: '2026-06-06T00:00:00.000Z',
  },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'ai.claude.model.claude-haiku-4-5', version: '1' },
  sourceHash: 'abc123',
});

describe('FactCommit.factsCommit', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor] });
    const cursor = db.add(Cursor.make());
    const binding: SyncBinding.CursorHolder = { cursor: Ref.make(cursor) };
    return { db, cursor, binding };
  };

  test('persists a page of facts and advances the cursor to the page max key', async ({ expect }) => {
    const { db, cursor, binding } = await setup();
    const page: Chunk.Chunk<FactUnit> = Chunk.fromIterable([
      { facts: [makeFact('fact-1', 'paris')], foreignId: 'm1', key: 100 },
      { facts: [makeFact('fact-2', 'london')], foreignId: 'm2', key: 200 },
    ]);

    const result = await Effect.gen(function* () {
      yield* FactCommit.factsCommit(page);
      const store = yield* FactStore;
      const facts = yield* store.query({});
      const state = yield* SyncBinding.Service;
      return { facts, cursorValue: state.cursor.value, dedupSet: state.dedupSet };
    }).pipe(
      Effect.provide(
        SyncBinding.layer({ binding, foreignKeySource: 'inbox.facts', cursorKey: 0, stats: { newMessages: 0 } }),
      ),
      Effect.provide(Database.layer(db)),
      Effect.provide(FactStore.layerMemory),
      EffectEx.runAndForwardErrors,
    );

    expect(result.facts.length).toBe(2);
    expect(Cursor.parseKey(result.cursorValue)).toBe(200);
    expect(result.dedupSet.has('m1')).toBe(true);
    expect(result.dedupSet.has('m2')).toBe(true);
    expect(cursor.value).toBe(result.cursorValue);
  });

  test('is a no-op for an empty page', async ({ expect }) => {
    const { db, cursor, binding } = await setup();
    const originalValue = cursor.value;

    await Effect.gen(function* () {
      yield* FactCommit.factsCommit(Chunk.empty());
    }).pipe(
      Effect.provide(
        SyncBinding.layer({ binding, foreignKeySource: 'inbox.facts', cursorKey: 0, stats: { newMessages: 0 } }),
      ),
      Effect.provide(Database.layer(db)),
      Effect.provide(FactStore.layerMemory),
      EffectEx.runAndForwardErrors,
    );

    expect(cursor.value).toBe(originalValue);
  });
});
