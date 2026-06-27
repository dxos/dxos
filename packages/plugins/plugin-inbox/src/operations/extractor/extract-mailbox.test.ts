//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type ExtractError, ExtractError as ExtractErrorClass, type ExtractResult, type ObjectExtractor } from '@dxos/extractor';
import { Message } from '@dxos/types';

import { InboxCapabilities, InboxOperation, Mailbox } from '../../types';
import extractMailboxHandler from './extract-mailbox';
import extractMessageHandler from './extract-message';

const EXTRACTOR_ID = 'test-extractor';

const stubExtractor = (opts: {
  onExtract?: (message: Message.Message) => Effect.Effect<ExtractResult, ExtractError>;
}): ObjectExtractor => ({
  id: EXTRACTOR_ID,
  title: EXTRACTOR_ID,
  description: EXTRACTOR_ID,
  kinds: [],
  sourceTypes: [Type.getTypename(Message.Message)!],
  match: () => ({ matched: true, confidence: 1 }),
  operation: InboxOperation.ExtractContactFromMessage,
  extract: ({ source }) =>
    opts.onExtract?.(source as Message.Message) ?? Effect.succeed({ created: [], updated: [], relations: [] }),
});

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

const makeMessage = (suffix: string) =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { email: `test-${suffix}@example.com` },
    blocks: [{ _tag: 'text', text: `Message ${suffix}` }],
  });

const runExtractMailbox = (
  input: { mailbox: Ref.Ref<Mailbox.Mailbox>; extractorId: string; concurrency?: number },
  layers: {
    db: Database.Database;
    capabilityService: ReturnType<typeof makeCapabilityService>;
  },
) =>
  extractMailboxHandler.handler(input).pipe(
    Effect.provideService(Database.Service, Database.makeService(layers.db)),
    Effect.provideService(Capability.Service, layers.capabilityService),
    Effect.provideService(
      Operation.Service,
      {
        invoke: (
          operation: typeof InboxOperation.ExtractMessage,
          input: { source: Obj.Any; extractorId?: string },
        ) => {
          if (operation === InboxOperation.ExtractMessage) {
            return extractMessageHandler.handler(input).pipe(
              Effect.provideService(Database.Service, Database.makeService(layers.db)),
              Effect.provideService(Capability.Service, layers.capabilityService),
              Effect.provide(AiService.notAvailable),
            );
          }
          return Effect.die('Unexpected operation');
        },
        schedule: () => Effect.void,
        invokePromise: async () => ({ error: new Error('Not available') }),
      } as Context.Tag.Service<typeof Operation.Service>,
    ),
    Effect.provide(AiService.notAvailable),
  );

describe('ExtractMailbox operation handler', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('runs the selected extractor over every feed message with bounded concurrency', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed],
    });

    const mailbox = Mailbox.make({ name: 'Inbox' });
    db.add(mailbox);
    const feed = mailbox.feed.target!;
    const messages = [makeMessage('1'), makeMessage('2'), makeMessage('3')];
    await db.appendToFeed(feed, messages);
    await db.flush();

    const extractedIds: string[] = [];
    const capabilityService = makeCapabilityService([
      stubExtractor({
        onExtract: (message) =>
          Effect.sync(() => {
            extractedIds.push(message.id);
            return { created: [], updated: [], relations: [] };
          }),
      }),
    ]);

    const result = await runExtractMailbox(
      { mailbox: Ref.make(mailbox), extractorId: EXTRACTOR_ID, concurrency: 2 },
      { db, capabilityService },
    ).pipe(EffectEx.runAndForwardErrors);

    expect(result).toEqual({
      extractorId: EXTRACTOR_ID,
      processed: 3,
      succeeded: 3,
      failed: 0,
      created: 0,
      updated: 0,
    });
    expect(extractedIds.sort()).toEqual(messages.map((message) => message.id).sort());
  });

  test('uses default concurrency when omitted', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed],
    });

    const mailbox = Mailbox.make();
    db.add(mailbox);
    const messages = Array.from({ length: 3 }, (_, index) => makeMessage(String(index)));
    await db.appendToFeed(mailbox.feed.target!, messages);
    await db.flush();

    const capabilityService = makeCapabilityService([stubExtractor({})]);

    const result = await runExtractMailbox({ mailbox: Ref.make(mailbox), extractorId: EXTRACTOR_ID }, { db, capabilityService }).pipe(
      EffectEx.runAndForwardErrors,
    );

    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(3);
  });

  test('retries a failed extraction once before counting the message as failed', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed],
    });

    const mailbox = Mailbox.make();
    db.add(mailbox);
    const recoverable = makeMessage('recoverable');
    const permanent = makeMessage('permanent');
    const healthy = makeMessage('healthy');
    await db.appendToFeed(mailbox.feed.target!, [recoverable, permanent, healthy]);
    await db.flush();

    const attempts = new Map<string, number>();
    const capabilityService = makeCapabilityService([
      stubExtractor({
        onExtract: (message) => {
          const attempt = (attempts.get(message.id) ?? 0) + 1;
          attempts.set(message.id, attempt);

          if (message.id === permanent.id) {
            return Effect.fail(new ExtractErrorClass('permanent failure', new Error('permanent failure')));
          }

          if (message.id === recoverable.id && attempt === 1) {
            return Effect.fail(new ExtractErrorClass('transient failure', new Error('transient failure')));
          }

          return Effect.succeed({ created: [], updated: [], relations: [] });
        },
      }),
    ]);

    const result = await runExtractMailbox({ mailbox: Ref.make(mailbox), extractorId: EXTRACTOR_ID }, { db, capabilityService }).pipe(
      EffectEx.runAndForwardErrors,
    );

    expect(result).toEqual({
      extractorId: EXTRACTOR_ID,
      processed: 3,
      succeeded: 2,
      failed: 1,
      created: 0,
      updated: 0,
    });
    expect(attempts.get(recoverable.id)).toBe(2);
    expect(attempts.get(permanent.id)).toBe(2);
    expect(attempts.get(healthy.id)).toBe(1);
  });

  test('retries and continues when extraction defects', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Message.Message, Mailbox.Mailbox, Feed.Feed],
    });

    const mailbox = Mailbox.make();
    db.add(mailbox);
    const defect = makeMessage('defect');
    const healthy = makeMessage('healthy');
    await db.appendToFeed(mailbox.feed.target!, [defect, healthy]);
    await db.flush();

    const capabilityService = makeCapabilityService([
      stubExtractor({
        onExtract: (message) =>
          message.id === defect.id
            ? Effect.die(new Error('unexpected defect'))
            : Effect.succeed({ created: [], updated: [], relations: [] }),
      }),
    ]);

    const result = await runExtractMailbox({ mailbox: Ref.make(mailbox), extractorId: EXTRACTOR_ID }, { db, capabilityService }).pipe(
      EffectEx.runAndForwardErrors,
    );

    expect(result).toEqual({
      extractorId: EXTRACTOR_ID,
      processed: 2,
      succeeded: 1,
      failed: 1,
      created: 0,
      updated: 0,
    });
  });
});
