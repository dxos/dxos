//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Filter, Obj, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Message } from '@dxos/types';

import { MessageExtractor } from '../../capabilities';
import { ExtractedFrom, InboxCapabilities, InboxOperation } from '../../types';
import handler from './extract-message';

// Stub builder for MessageExtractor instances. The `operation` field is required by the
// interface for first-class registry, but the dispatcher calls `extract` directly — stubs
// can point all `operation` fields at the same real definition since registry traceability
// is moot in unit tests.
const stubExtractor = (opts: {
  id: string;
  matched: boolean;
  confidence?: number;
  extract?: () => Effect.Effect<MessageExtractor.ExtractResult, MessageExtractor.ExtractError>;
}): MessageExtractor.MessageExtractor => ({
  id: opts.id,
  description: opts.id,
  kinds: [],
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

// Build a Capability.Service from a list of MessageExtractor instances.
const makeCapabilityService = (extractors: MessageExtractor.MessageExtractor[]) => {
  const registry = Registry.make();
  const manager = CapabilityManager.make({ registry });
  for (const extractor of extractors) {
    manager.contribute({
      interface: InboxCapabilities.MessageExtractor,
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

    const result = await handler
      .handler({ db, message })
      .pipe(Effect.provideService(Capability.Service, capabilityService), Effect.either)
      .pipe(Effect.runPromise);

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

    const result = await handler
      .handler({ db, message })
      .pipe(Effect.provideService(Capability.Service, capabilityService))
      .pipe(runAndForwardErrors);

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

    const result = await handler
      .handler({ db, message })
      .pipe(Effect.provideService(Capability.Service, capabilityService))
      .pipe(runAndForwardErrors);

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
