//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as Alarm from './Alarm.ts';
import * as SessionLink from './SessionLink.ts';
import { SessionStore } from './SessionStore.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

let clock = 0;
const makeMessage = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

const texts = (messages: readonly Message.Message[]) => messages.map((message) => Message.extractText(message));

/** What a turn writes when it takes `message` from the queue. */
const consume = (message: Message.Message) =>
  Trajectory.make({ payload: { _tag: 'promptConsume', message: message.id }, sender: { role: 'assistant' } });

describe('SessionStore', () => {
  const TestLayer = TestDatabaseLayer({
    types: [Feed.Feed, Message.Message, SessionLink.SessionLink, Alarm.Alarm, Trajectory.Event],
  });

  describe('input queue', () => {
    it.effect('enqueued messages are pending in feed order', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();
        const first = yield* store.enqueueMessage(feed, makeMessage('first'));
        const second = yield* store.enqueueMessage(feed, makeMessage('second'));

        const { pendingMessages } = yield* store.loadPending(feed);
        expect(pendingMessages.map((message) => message.id)).toEqual([first.id, second.id]);
        expect(texts(pendingMessages)).toEqual(['first', 'second']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('a consumed message leaves the queue and enters history once, where it was consumed', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();
        const queued = yield* store.enqueueMessage(feed, makeMessage('question'));
        yield* TrajectoryStore.append(feed, [consume(queued)]);

        const state = yield* store.loadState(feed);
        expect(state.pendingMessages).toEqual([]);
        expect(texts(state.history)).toEqual(['question']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('acking a message no turn consumed cancels it', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();
        const queued = yield* store.enqueueMessage(feed, makeMessage('stale'));
        yield* store.ack(feed, queued);

        const state = yield* store.loadState(feed);
        expect(state.pendingMessages).toEqual([]);
        expect(state.history).toEqual([]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('acking a consumed message writes nothing', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();
        const queued = yield* store.enqueueMessage(feed, makeMessage('question'));
        yield* TrajectoryStore.append(feed, [consume(queued)]);
        const before = (yield* TrajectoryStore.read(feed)).length;
        yield* store.ack(feed, queued);
        expect((yield* TrajectoryStore.read(feed)).length).toBe(before);
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe('alarms', () => {
    it.effect('pending alarms sort by wakeAt and support multiple entries', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();
        const late = yield* store.setAlarm(feed, { wakeAt: 2000 });
        const early = yield* store.setAlarm(feed, { wakeAt: 1000, message: 'first' });

        const { pendingAlarms } = yield* store.loadPending(feed);
        expect(pendingAlarms.map((alarm) => alarm.id)).toEqual([early.id, late.id]);
        expect(pendingAlarms[0].message).toBe('first');
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('acking or cancelling an alarm takes it out of the pending set', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const store = new SessionStore();
        const fired = yield* store.setAlarm(feed, { wakeAt: 1000 });
        const cancelled = yield* store.setAlarm(feed, { wakeAt: 2000 });
        const kept = yield* store.setAlarm(feed, { wakeAt: 3000 });
        yield* store.ack(feed, fired);
        yield* store.cancelAlarm(feed, cancelled);

        const { pendingAlarms } = yield* store.loadPending(feed);
        expect(pendingAlarms.map((alarm) => alarm.id)).toEqual([kept.id]);
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe('loadState', () => {
    it.effect('a fork prepends its source history up to the fork point', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const source = db.add(Feed.make());
        const point = makeMessage('b', 'assistant');
        yield* Feed.append(source, [makeMessage('a'), point, makeMessage('c — after fork', 'assistant')]);

        const fork = db.add(Feed.make());
        yield* Feed.append(fork, [
          Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(source), messageId: point.id }),
        ]);

        const { history } = yield* new SessionStore().loadState(fork);
        expect(texts(history)).toEqual(['a', 'b']);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect('a fork whose point is missing or whose source is unresolvable adds no history', () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const source = db.add(Feed.make());
        yield* Feed.append(source, [makeMessage('a')]);

        const missingPoint = db.add(Feed.make());
        yield* Feed.append(missingPoint, [
          Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(source), messageId: Obj.ID.random() }),
        ]);
        expect((yield* new SessionStore().loadState(missingPoint)).history).toEqual([]);

        const unresolvable = db.add(Feed.make());
        yield* Feed.append(unresolvable, [
          Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(Feed.make()), messageId: Obj.ID.random() }),
        ]);
        expect((yield* new SessionStore().loadState(unresolvable)).history).toEqual([]);
      }).pipe(Effect.provide(TestLayer)),
    );
  });
});
