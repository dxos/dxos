//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-db/testing';
import { Message } from '@dxos/types';

import * as SessionLink from './SessionLink';
import { SessionLoader } from './SessionLoader';

// Monotonic timestamps so chronological sorting in SessionLoader is deterministic.
let clock = 0;
const makeMessage = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

describe('SessionLoader', () => {
  const TestLayer = TestDatabaseLayer({ types: [Feed.Feed, Message.Message, SessionLink.SessionLink] });

  it.effect('returns original messages when no SessionLink exists in feed', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      const message = makeMessage('hello');
      yield* Feed.append(feed, [message]);

      const result = yield* new SessionLoader().reifyHistory(feed, [message]);

      expect(result.map((msg) => msg.id)).toEqual([message.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('prepends source history when SessionLink resolves to a valid message', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const sourceFeed = db.add(Feed.make());
      const forkFeed = db.add(Feed.make());

      const msg1 = makeMessage('first');
      const msg2 = makeMessage('second', 'assistant');
      const forkMsg = makeMessage('new turn');
      yield* Feed.append(sourceFeed, [msg1, msg2]);

      yield* Feed.append(forkFeed, [
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(sourceFeed), messageId: msg2.id }),
      ]);

      const result = yield* new SessionLoader().reifyHistory(forkFeed, [forkMsg]);

      expect(result.map((msg) => msg.id)).toEqual([msg1.id, msg2.id, forkMsg.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('respects the fork cutoff — excludes messages after messageId', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const sourceFeed = db.add(Feed.make());
      const forkFeed = db.add(Feed.make());

      const msg1 = makeMessage('a');
      const msg2 = makeMessage('b', 'assistant');
      const msg3 = makeMessage('c — after fork');
      yield* Feed.append(sourceFeed, [msg1, msg2, msg3]);

      yield* Feed.append(forkFeed, [
        // Fork at msg2; msg3 should be excluded.
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(sourceFeed), messageId: msg2.id }),
      ]);

      const result = yield* new SessionLoader().reifyHistory(forkFeed, []);

      expect(result.map((msg) => msg.id)).toEqual([msg1.id, msg2.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('returns original messages when messageId is not found in source feed (fail-closed)', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const sourceFeed = db.add(Feed.make());
      const forkFeed = db.add(Feed.make());

      const msg1 = makeMessage('existing');
      const currentMsg = makeMessage('new turn');
      yield* Feed.append(sourceFeed, [msg1]);

      yield* Feed.append(forkFeed, [
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(sourceFeed), messageId: Obj.ID.random() }),
      ]);

      const result = yield* new SessionLoader().reifyHistory(forkFeed, [currentMsg]);

      expect(result.map((msg) => msg.id)).toEqual([currentMsg.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('returns original messages when source feed reference is unresolvable', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const forkFeed = db.add(Feed.make());
      const unresolvedFeed = Feed.make(); // Intentionally not added to the database.

      yield* Feed.append(forkFeed, [
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(unresolvedFeed), messageId: Obj.ID.random() }),
      ]);

      const currentMsg = makeMessage('hello');
      const result = yield* new SessionLoader().reifyHistory(forkFeed, [currentMsg]);

      expect(result.map((msg) => msg.id)).toEqual([currentMsg.id]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
