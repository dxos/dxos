//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Database, Filter, Obj, Relation, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type ExtractError, type ExtractResult, type ObjectExtractor } from '@dxos/extractor';
import { Message } from '@dxos/types';

import { ExtractedFrom, InboxCapabilities, InboxOperation } from '../../types';
import handler from './extract-message';

const runExtractMessage = (
  input: { source: Obj.Any; extractorId?: string },
  layers: {
    db: Database.Database;
    capabilityService: ReturnType<typeof makeCapabilityService>;
  },
) =>
  handler
    .handler(input)
    .pipe(
      Effect.provideService(Database.Service, Database.makeService(layers.db)),
      Effect.provideService(Capability.Service, layers.capabilityService),
      Effect.provide(AiService.notAvailable),
    );

// Stub builder for ObjectExtractor instances. The `operation` field is optional and unused by
// the dispatcher (which calls `extract` directly), but kept here for parity with real extractors.
const stubExtractor = (opts: {
  id: string;
  matched: boolean;
  confidence?: number;
  extract?: () => Effect.Effect<ExtractResult, ExtractError>;
}): ObjectExtractor => ({
  id: opts.id,
  title: opts.id,
  description: opts.id,
  kinds: [],
  sourceTypes: [Type.getTypename(Message.Message)!],
  match: () => ({ matched: opts.matched, confidence: opts.confidence }),
  operation: InboxOperation.ExtractContactFromMessage,
  extract: opts.extract ?? (() => Effect.succeed({ created: [], updated: [], relations: [] })),
});

// Create a test Message object.
const makeMessage = () =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { email: 'test@example.com' },
    blocks: [],
  });

// Build a Capability.Service from a list of ObjectExtractor instances.
const makeCapabilityService = (extractors: ObjectExtractor[]) => {
  const registry = Registry.make();
  const manager = CapabilityManager.make({ registry });
  for (const extractor of extractors) {
    manager.contribute({
      interface: InboxCapabilities.ObjectExtractor,
      implementation: extractor,
      module: extractor.id,
    });
  }
  return manager;
};

describe('ExtractMessage operation handler', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('no matching extractor → operation fails', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, ExtractedFrom.ExtractedFrom],
    });
    const message = db.add(makeMessage());
    await db.flush();

    const noMatchExtractor = stubExtractor({ id: 'no-match', matched: false });
    const capabilityService = makeCapabilityService([noMatchExtractor]);

    const result = await runExtractMessage({ source: message }, { db, capabilityService }).pipe(Effect.either).pipe(
      Effect.runPromise,
    );

    expect(result._tag).toBe('Left');
  });

  test('selects highest-confidence extractor', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, ExtractedFrom.ExtractedFrom],
    });
    const message = db.add(makeMessage());
    await db.flush();

    let calledExtractorId: string | undefined;

    const lowConfidence = stubExtractor({
      id: 'low',
      matched: true,
      confidence: 0.6,
      extract: () => {
        calledExtractorId = 'low';
        return Effect.succeed({ created: [], relations: [] });
      },
    });

    const highConfidence = stubExtractor({
      id: 'high',
      matched: true,
      confidence: 0.9,
      extract: () => {
        calledExtractorId = 'high';
        return Effect.succeed({ created: [], relations: [] });
      },
    });

    const capabilityService = makeCapabilityService([lowConfidence, highConfidence]);

    const result = await runExtractMessage({ source: message }, { db, capabilityService }).pipe(
      EffectEx.runAndForwardErrors,
    );

    expect(calledExtractorId).toBe('high');
    expect(result.extractorId).toBe('high');
  });

  test('persists ExtractedFrom relation for each created object', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, ExtractedFrom.ExtractedFrom],
    });
    const message = db.add(makeMessage());
    await db.flush();

    const createdObj = Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { email: 'extracted@example.com' },
      blocks: [],
    });

    const extractorId = 'trip-extractor';
    const extractorWithCreated = stubExtractor({
      id: extractorId,
      matched: true,
      confidence: 0.8,
      extract: () => Effect.succeed({ created: [createdObj], relations: [] }),
    });

    const capabilityService = makeCapabilityService([extractorWithCreated]);

    const result = await runExtractMessage({ source: message }, { db, capabilityService }).pipe(
      EffectEx.runAndForwardErrors,
    );

    expect(result.created).toBe(1);
    expect(result.extractorId).toBe(extractorId);

    await db.flush();

    // Query for ExtractedFrom relations by type.
    const relations = await db.query(Filter.type(ExtractedFrom.ExtractedFrom)).run();

    // Should have exactly 1 ExtractedFrom relation.
    expect(relations).toHaveLength(1);
    const rel = relations[0] as ExtractedFrom.ExtractedFrom;
    expect(rel.extractorId).toBe(extractorId);
    expect(Relation.getTarget(rel).id).toBe(message.id);
  });
});
