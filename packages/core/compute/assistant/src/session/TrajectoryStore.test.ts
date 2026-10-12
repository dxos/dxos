//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Annotation, Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { DXN } from '@dxos/keys';
import { Durable, Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as AiContext from './AiContext.ts';
import * as Alarm from './Alarm.ts';
import * as SessionLink from './SessionLink.ts';
import { ConsumedAnnotation, QueuedAnnotation, SessionStore } from './SessionStore.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

let clock = 0;
const message = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

const texts = (messages: readonly Message.Message[]) => messages.map((item) => Message.extractText(item));

const TestLayer = TestDatabaseLayer({
  types: [Feed.Feed, Message.Message, SessionLink.SessionLink, Alarm.Alarm, AiContext.Binding, Trajectory.Event],
});

describe('TrajectoryStore', () => {
  it.effect('a legacy feed loads the same history SessionStore built', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      const queued = message('queued then answered');
      Obj.update(queued, (queued) => {
        Annotation.set(queued, QueuedAnnotation, true);
        Annotation.set(queued, ConsumedAnnotation, true);
      });
      const pending = message('still queued');
      Obj.update(pending, (pending) => Annotation.set(pending, QueuedAnnotation, true));
      yield* Feed.append(feed, [
        message('hello'),
        message('hi', 'assistant'),
        queued,
        message('queued then answered'),
        message('answer', 'assistant'),
        pending,
      ]);

      const legacy = yield* new SessionStore().loadState(feed);
      const history = yield* TrajectoryStore.history(feed);
      expect(texts(history)).toEqual(texts(legacy.history));
      expect(texts(history)).toEqual(['hello', 'hi', 'queued then answered', 'answer']);

      const { state } = yield* TrajectoryStore.load(feed, Durable.session);
      expect(state.queue).toEqual([pending.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a rewound legacy turn is not in the history', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      const first = message('first');
      yield* Feed.append(feed, [first, message('abandoned', 'assistant')]);
      yield* Feed.append(feed, [message('retried', 'assistant')], { parent: first.id });

      expect(texts(yield* TrajectoryStore.history(feed))).toEqual(['first', 'retried']);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('legacy bindings and alarms fold into session state', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      const target = db.add(Feed.make());
      const fired = Alarm.make({ wakeAt: 1 });
      Obj.update(fired, (fired) => Annotation.set(fired, ConsumedAnnotation, true));
      const pending = Alarm.make({ wakeAt: 2, message: 'later' });
      yield* Feed.append(feed, [
        Obj.make(AiContext.Binding, {
          skills: { added: [], removed: [] },
          objects: { added: [Ref.make(target)], removed: [] },
        }),
        fired,
        pending,
      ]);

      const { state } = yield* TrajectoryStore.load(feed, Durable.session);
      expect(state.objects.map((ref) => ref.uri)).toEqual([Ref.make(target).uri]);
      expect(state.alarms.map((alarm) => alarm.id)).toEqual([pending.id]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a legacy fork and new events on top of legacy records load as one conversation', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const source = db.add(Feed.make());
      const point = message('fork point', 'assistant');
      yield* Feed.append(source, [message('before'), point, message('after the fork point', 'assistant')]);

      const feed = db.add(Feed.make());
      yield* Feed.append(feed, [
        Obj.make(SessionLink.SessionLink, { feedRef: Ref.make(source), messageId: point.id }),
        message('legacy question'),
        message('legacy answer', 'assistant'),
      ]);

      // The format switched mid-conversation: a new prompt is queued, consumed by a turn, answered.
      const question = Trajectory.make({
        payload: { _tag: 'message', blocks: [{ _tag: 'text', text: 'new question' }] },
        sender: { role: 'user' },
      });
      const turn = Trajectory.make({
        payload: { _tag: 'turnBegin', model: DXN.make('com.anthropic.model.claude-sonnet-5.default') },
        sender: { role: 'assistant' },
      });
      yield* TrajectoryStore.append(feed, [
        question,
        turn,
        Trajectory.make({
          payload: { _tag: 'promptConsume', message: question.id },
          sender: { role: 'assistant' },
          thread: turn.id,
        }),
        Trajectory.make({
          payload: { _tag: 'message', blocks: [{ _tag: 'text', text: 'new answer' }] },
          sender: { role: 'assistant' },
          thread: turn.id,
        }),
        Trajectory.make({
          payload: { _tag: 'turnEnd', begin: turn.id, finishReason: 'stop' },
          sender: { role: 'assistant' },
        }),
      ]);

      expect(texts(yield* TrajectoryStore.history(feed))).toEqual([
        'before',
        'fork point',
        'legacy question',
        'legacy answer',
        'new question',
        'new answer',
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );
});
