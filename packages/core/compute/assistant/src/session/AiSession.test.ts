//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Message } from '@dxos/types';

import * as AiSession from './AiSession';
import * as SessionLink from './SessionLink';

// Monotonic timestamps so chronological sorting in SessionLoader is deterministic.
let clock = 0;
const makeMessage = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

describe('AiSession.Session.getHistory', () => {
  const TestLayer = TestDatabaseLayer({ types: [Feed.Feed, Message.Message, SessionLink.SessionLink] });

  it.effect('returns messages from the session feed', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      const message = makeMessage('hello');
      yield* Feed.append(feed, [message]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed, runtime });

      const result = yield* Effect.promise(() => session.getHistory());

      expect(result.map((msg) => msg.id)).toEqual([message.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('prepends source history through a SessionLink (fork scenario)', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const sourceFeed = db.add(Feed.make());
      const forkFeed = db.add(Feed.make());

      const msg1 = makeMessage('original question');
      const msg2 = makeMessage('original answer', 'assistant');
      const forkMsg = makeMessage('follow-up from fork');
      yield* Feed.append(sourceFeed, [msg1, msg2]);
      yield* Feed.append(forkFeed, [
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(sourceFeed), messageId: msg2.id }),
        forkMsg,
      ]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed: forkFeed, runtime });

      const result = yield* Effect.promise(() => session.getHistory());

      // Source messages up to the cutoff are prepended; the fork message follows.
      expect(result.map((msg) => msg.id)).toEqual([msg1.id, msg2.id, forkMsg.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('respects the fork cutoff — excludes source messages after messageId', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const sourceFeed = db.add(Feed.make());
      const forkFeed = db.add(Feed.make());

      const msg1 = makeMessage('a');
      const msg2 = makeMessage('b', 'assistant');
      const msg3 = makeMessage('c — beyond fork point');
      yield* Feed.append(sourceFeed, [msg1, msg2, msg3]);
      yield* Feed.append(forkFeed, [
        // Fork at msg2; msg3 must be excluded.
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(sourceFeed), messageId: msg2.id }),
      ]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed: forkFeed, runtime });

      const result = yield* Effect.promise(() => session.getHistory());

      expect(result.map((msg) => msg.id)).toEqual([msg1.id, msg2.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('returns only fork-feed messages when SessionLink messageId is not found (fail-closed)', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const sourceFeed = db.add(Feed.make());
      const forkFeed = db.add(Feed.make());

      const sourceMsg = makeMessage('source');
      const forkMsg = makeMessage('fork only');
      yield* Feed.append(sourceFeed, [sourceMsg]);
      yield* Feed.append(forkFeed, [
        // messageId does not exist in sourceFeed.
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(sourceFeed), messageId: Obj.ID.random() }),
        forkMsg,
      ]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed: forkFeed, runtime });

      const result = yield* Effect.promise(() => session.getHistory());

      expect(result.map((msg) => msg.id)).toEqual([forkMsg.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  // Soft fork: the continuation names an earlier message as its lineage parent, so everything appended
  // between the two is unreachable and must not reach the model.
  it.effect('excludes turns a soft fork left unreachable', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());

      const prompt1 = makeMessage('first question');
      const answer1 = makeMessage('first answer', 'assistant');
      const prompt2 = makeMessage('abandoned question');
      const answer2 = makeMessage('abandoned answer', 'assistant');
      yield* Feed.append(feed, [prompt1, answer1, prompt2, answer2]);

      // Continue from the first answer rather than the tip.
      const retry = makeMessage('better question');
      yield* Feed.append(feed, [retry], { parent: answer1 });

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed, runtime });

      const result = yield* Effect.promise(() => session.getHistory());

      expect(result.map((msg) => msg.id)).toEqual([prompt1.id, answer1.id, retry.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('returns the whole feed when nothing has been forked', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());

      const messages = [makeMessage('one'), makeMessage('two', 'assistant'), makeMessage('three')];
      yield* Feed.append(feed, messages);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed, runtime });

      const result = yield* Effect.promise(() => session.getHistory());

      expect(result.map((msg) => msg.id)).toEqual(messages.map((msg) => msg.id));
    }).pipe(Effect.provide(TestLayer)),
  );
});

//
// Soft fork (write side).
//
// The rewind is decided by the client, which appends a `Feed.Reset` when the revised prompt is sent. The
// session then appends the turn with no lineage at all: the reset is the tip, so continuing from the tip
// continues from the fork. These pin that the session stays ignorant of forking, and that its resolved
// history still follows one.
//

describe('AiSession.Session rewind', () => {
  const TestLayer = TestDatabaseLayer({
    types: [Feed.Feed, Feed.Reset, Message.Message, SessionLink.SessionLink],
  });

  it.effect('appends the turn without lineage, even across a fork', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());

      const first = makeMessage('first');
      const answer = makeMessage('answer', 'assistant');
      const abandoned = makeMessage('abandoned');
      yield* Feed.append(feed, [first, answer, abandoned]);
      yield* Feed.append(feed, [Feed.makeReset(answer)]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed, runtime });

      // Stands in for the request loop: `onOutput` is the single funnel every persisted message passes
      // through. Nothing it appends carries a parent — the fork is already in the log.
      const retry = makeMessage('retry');
      yield* Effect.promise(() => session.appendTurnMessage(retry));
      expect(Feed.getParent(retry)).toBeUndefined();

      const followUp = makeMessage('follow up', 'assistant');
      yield* Effect.promise(() => session.appendTurnMessage(followUp));
      expect(Feed.getParent(followUp)).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('the resolved history follows the fork once the continuation lands', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());

      const first = makeMessage('first');
      const answer = makeMessage('answer', 'assistant');
      const abandoned = makeMessage('abandoned');
      yield* Feed.append(feed, [first, answer, abandoned]);
      yield* Feed.append(feed, [Feed.makeReset(answer)]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed, runtime });
      const retry = makeMessage('retry');
      yield* Effect.promise(() => session.appendTurnMessage(retry));

      // The reset took part in the walk but is not conversation, so the model never sees it.
      const history = yield* Effect.promise(() => session.getHistory());
      expect(history.map((message) => message.id)).toEqual([first.id, answer.id, retry.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a fork of the very first turn resolves to a history with nothing before it', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());

      const first = makeMessage('first');
      const answer = makeMessage('answer', 'assistant');
      yield* Feed.append(feed, [first, answer]);
      // Nothing precedes the discarded turn, so the reset has no parent to name.
      yield* Feed.append(feed, [Feed.makeReset()]);

      const runtime = yield* Effect.runtime<Database.Service>();
      const session = new AiSession.Session({ feed, runtime });
      const retry = makeMessage('asking afresh');
      yield* Effect.promise(() => session.appendTurnMessage(retry));

      const history = yield* Effect.promise(() => session.getHistory());
      expect(history.map((message) => message.id)).toEqual([retry.id]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
