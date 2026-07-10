//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Database, Feed, Filter } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { fixtureExists, loadFixtureMessages, seedFeed } from './harness';

/** Trivial, LLM-free feed statistics. */
type FeedStats = {
  messages: number;
  threads: number;
  senders: Set<string>;
};

describe.skipIf(!fixtureExists())('feed stats pipeline over a mailbox feed fixture', () => {
  let builder: EchoTestBuilder;

  test('gathers message, thread, and sender-email counts (no LLM)', async ({ expect }) => {
    builder = await new EchoTestBuilder().open();
    try {
      const messages = loadFixtureMessages();
      expect(messages.length).toBeGreaterThan(0);

      const { db } = await builder.createDatabase({ types: [Feed.Feed, Message.Message] });
      const feed = await seedFeed(db, messages);

      const start = performance.now();
      const stats = await Effect.gen(function* () {
        const items = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        // Un-threaded messages each count as their own thread (keyed by id).
        return {
          messages: items.length,
          threads: new Set(items.map((message) => message.threadId ?? message.id)).size,
          senders: new Set(
            items.map((message) => message.sender.email).filter((email): email is string => email !== undefined),
          ),
        } satisfies FeedStats;
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
      const durationMs = Math.round(performance.now() - start);

      log.info('feed stats', {
        messages: stats.messages,
        threads: stats.threads,
        senders: [...stats.senders],
        durationMs,
      });

      // The feed round-trips every seeded message; derived aggregates are non-empty.
      expect(stats.messages).toBe(messages.length);
      expect(stats.threads).toBeGreaterThan(0);
      expect(stats.senders.size).toBeGreaterThan(0);
    } finally {
      await builder.close();
    }
  });
});
