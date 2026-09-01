//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Message } from '@dxos/types';

import * as Alarm from './Alarm';
import * as SessionLink from './SessionLink';
import { SessionStore, getAck, isQueued } from './SessionStore';

// Monotonic timestamps so chronological sorting in SessionStore is deterministic.
let clock = 0;
const makeMessage = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

describe('SessionStore', () => {
  const TestLayer = TestDatabaseLayer({ types: [Feed.Feed, Message.Message, SessionLink.SessionLink, Alarm.Alarm] });

  describe('reifyHistory', () => {
    it.effect('returns original messages when no SessionLink exists in feed', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const message = makeMessage('hello');
        yield* Feed.append(feed, [message]);

        const result = yield* new SessionStore().reifyHistory(feed, [message]);

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

        const result = yield* new SessionStore().reifyHistory(forkFeed, [forkMsg]);

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

        const result = yield* new SessionStore().reifyHistory(forkFeed, []);

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

        const result = yield* new SessionStore().reifyHistory(forkFeed, [currentMsg]);

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
        const result = yield* new SessionStore().reifyHistory(forkFeed, [currentMsg]);

        expect(result.map((msg) => msg.id)).toEqual([currentMsg.id]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('drops queued originals from history — their echoes carry it', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        const queued = yield* store.enqueueMessage(feed, makeMessage('queued prompt'));
        const answered = makeMessage('regular message');
        yield* Feed.append(feed, [answered]);

        const result = yield* store.reifyHistory(feed, [queued, answered]);

        expect(result.map((msg) => msg.id)).toEqual([answered.id]);
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe('input queue', () => {
    it.effect('enqueued messages are pending in feed order', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        const first = yield* store.enqueueMessage(feed, makeMessage('first'));
        const second = yield* store.enqueueMessage(feed, makeMessage('second'));
        expect(isQueued(first)).toBe(true);

        const { pendingMessages } = yield* store.loadState(feed);

        expect(pendingMessages.map((msg) => msg.id)).toEqual([first.id, second.id]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('acking dequeues without removing — echo enters history, original stays in feed', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        const original = yield* store.enqueueMessage(feed, makeMessage('prompt'));
        const echo = yield* store.ackMessage(feed, original);

        expect(echo.id).not.toEqual(original.id);
        expect(getAck(echo)).toEqual(original.id);
        expect(Message.extractText(echo)).toEqual('prompt');
        expect(echo.sender).toEqual(original.sender);
        expect(echo.created).toEqual(original.created);

        const state = yield* store.loadState(feed);
        expect(state.pendingMessages).toEqual([]);
        expect(state.history.map((msg) => msg.id)).toEqual([echo.id]);

        // The original is still in the feed (only filtered from the queue projection).
        const items = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        expect(items.map((item) => item.id)).toContain(original.id);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('cancelling a queued message removes it from the pending set', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        const first = yield* store.enqueueMessage(feed, makeMessage('keep'));
        const second = yield* store.enqueueMessage(feed, makeMessage('cancel me'));
        yield* Feed.remove(feed, [second]);

        const { pendingMessages } = yield* store.loadState(feed);

        expect(pendingMessages.map((msg) => msg.id)).toEqual([first.id]);
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe('alarms', () => {
    it.effect('pending alarms sort by wakeAt and support multiple entries', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        const later = yield* store.setAlarm(feed, { wakeAt: 2_000, message: 'later' });
        const sooner = yield* store.setAlarm(feed, { wakeAt: 1_000, message: 'sooner' });

        const { pendingAlarms } = yield* store.loadState(feed);

        expect(pendingAlarms.map((alarm) => alarm.id)).toEqual([sooner.id, later.id]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('acking a fired alarm filters it from the pending set; the wake message enters history', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        const alarm = yield* store.setAlarm(feed, { wakeAt: 1_000, message: 'wake up' });
        const wakeMessage = yield* store.ackAlarm(feed, alarm, makeMessage('alarm fired: wake up'));

        expect(getAck(wakeMessage)).toEqual(alarm.id);

        const state = yield* store.loadState(feed);
        expect(state.pendingAlarms).toEqual([]);
        expect(state.history.map((msg) => msg.id)).toEqual([wakeMessage.id]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('cancelling an alarm removes it from the pending set', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        const keep = yield* store.setAlarm(feed, { wakeAt: 1_000 });
        const cancelled = yield* store.setAlarm(feed, { wakeAt: 2_000 });
        yield* store.cancelAlarm(feed, cancelled);

        const { pendingAlarms } = yield* store.loadState(feed);

        expect(pendingAlarms.map((alarm) => alarm.id)).toEqual([keep.id]);
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe('loadState', () => {
    it.effect('partitions one feed into history, pending messages, and pending alarms', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();

        // A processed turn: queued prompt + its ack echo + the assistant reply.
        const processed = yield* store.enqueueMessage(feed, makeMessage('answered prompt'));
        const echo = yield* store.ackMessage(feed, processed);
        const reply = makeMessage('the answer', 'assistant');
        yield* Feed.append(feed, [reply]);

        // Unprocessed input and alarms.
        const pending = yield* store.enqueueMessage(feed, makeMessage('unanswered prompt'));
        const alarm = yield* store.setAlarm(feed, { wakeAt: 1_000, message: 'later' });

        const state = yield* store.loadState(feed);

        expect(state.history.map((msg) => msg.id)).toEqual([echo.id, reply.id]);
        expect(state.pendingMessages.map((msg) => msg.id)).toEqual([pending.id]);
        expect(state.pendingAlarms.map((entry) => entry.id)).toEqual([alarm.id]);
      }).pipe(Effect.provide(TestLayer)),
    );
  });
});
