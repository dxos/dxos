//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { Database, Obj } from '@dxos/echo';
import { Feed } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Message } from '@dxos/types';

import { generateReply, replySubject } from './generate-reply';

const makeMessage = (sender: string, subject: string, text: string, created: string) =>
  Obj.make(Message.Message, {
    created,
    sender: { name: sender, email: `${sender.toLowerCase()}@example.com` },
    blocks: [{ _tag: 'text', text }],
    properties: { subject },
  });

const ALICE_FACT: RDF.Fact = {
  id: 'f-alice-1',
  assertion: {
    subject: { entity: 'alice', label: 'Alice' },
    predicate: 'works-at',
    object: { entity: 'acme', label: 'Acme' },
  },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.95, nature: 'epistemic' },
  attribution: { source: 'dxn:echo:@:m-1', generatedAtTime: '2026-07-01T00:00:00.000Z' },
  recordedAt: '2026-07-01T12:00:00.000Z',
  extractor: { id: 'test', model: 'stub', version: '1' },
  sourceHash: 'h-1',
};

/** Stub `AiService` returning a canned body while capturing prompts for grounding assertions. */
const capturingAiService = (text: string): { layer: Layer.Layer<AiService.AiService>; prompts: string[] } => {
  const prompts: string[] = [];
  const layer = Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: (options: { prompt: string }) =>
          Effect.sync(() => {
            prompts.push(String(options.prompt));
            return { text, content: [] };
          }),
        generateObject: () => Effect.succeed({ value: {}, content: [] }),
        streamText: () => Stream.empty,
        // Test stub: the LanguageModel surface is wider than the three methods exercised here.
      } as any),
  });
  return { layer, prompts };
};

describe('generateReply', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('grounds the draft on thread context and participant facts', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Message.Message, Mailbox.Mailbox, Feed.Feed] });
    const mailbox = Mailbox.make({ name: 'Inbox' });
    db.add(mailbox);
    const feed = mailbox.feed.target!;
    const thread = [
      makeMessage('Alice', 'Q2 report', 'Can you send the Q2 numbers?', '2026-07-01T10:00:00.000Z'),
      makeMessage('Me', 'Re: Q2 report', 'Working on it.', '2026-07-01T11:00:00.000Z'),
    ];
    await db.appendToFeed(feed, thread);
    await db.appendToFeed(feed, [makeMessage('Carol', 'Unrelated', 'Lunch?', '2026-07-01T12:00:00.000Z')]);
    await db.flush();

    const ai = capturingAiService('Here are the Q2 numbers.');
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* FactStore;
        yield* store.putFacts([ALICE_FACT]);
        return yield* generateReply({ mailbox, message: thread[0] });
      }).pipe(Effect.provide(Database.layer(db)), Effect.provide(FactStore.layerMemory), Effect.provide(ai.layer)),
    );

    expect(result.subject).toBe('Re: Q2 report');
    expect(result.body).toBe('Here are the Q2 numbers.');
    expect(ai.prompts).toHaveLength(1);
    // The prompt carries the thread (both same-subject messages, not the unrelated one) and the fact.
    expect(ai.prompts[0]).toContain('Can you send the Q2 numbers?');
    expect(ai.prompts[0]).toContain('Working on it.');
    expect(ai.prompts[0]).not.toContain('Lunch?');
    expect(ai.prompts[0]).toContain('works-at');
  });

  test('drafts without facts when the store is empty', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Message.Message, Mailbox.Mailbox, Feed.Feed] });
    const mailbox = Mailbox.make({ name: 'Inbox' });
    db.add(mailbox);
    const feed = mailbox.feed.target!;
    const message = makeMessage('Bob', 'Hello', 'Quick question.', '2026-07-01T10:00:00.000Z');
    await db.appendToFeed(feed, [message]);
    await db.flush();

    const ai = capturingAiService('Sure, ask away.');
    const result = await EffectEx.runPromise(
      generateReply({ mailbox, message }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.provide(FactStore.layerMemory),
        Effect.provide(ai.layer),
      ),
    );

    expect(result.body).toBe('Sure, ask away.');
    expect(ai.prompts[0]).not.toContain('Known facts');
  });
});

describe('replySubject', () => {
  test('prefixes once without stacking', ({ expect }) => {
    expect(replySubject('Q2 report')).toBe('Re: Q2 report');
    expect(replySubject('Re: Q2 report')).toBe('Re: Q2 report');
    expect(replySubject('re: RE: Q2 report')).toBe('Re: Q2 report');
    expect(replySubject(undefined)).toBe('Re:');
  });
});
