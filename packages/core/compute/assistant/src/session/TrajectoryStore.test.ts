//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Annotation, Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { DXN } from '@dxos/keys';
import { Message } from '@dxos/types';

import * as AiContext from './AiContext.ts';
import * as Alarm from './Alarm.ts';
import * as Legacy from './Legacy.ts';
import * as SessionLink from './SessionLink.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

let clock = 0;
const message = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

const texts = (messages: readonly Message.Message[]) => messages.map((item) => Message.extractText(item));

const TestLayer = TestDatabaseLayer({
  types: [Feed.Feed, Message.Message, SessionLink.SessionLink, Alarm.Alarm, AiContext.Binding, Trajectory.Event],
});

describe('TrajectoryStore', () => {
  it.effect('a legacy feed loads the history the annotation queue showed', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      const queued = message('queued then answered');
      Obj.update(queued, (queued) => {
        Annotation.set(queued, Legacy.QueuedAnnotation, true);
        Annotation.set(queued, Legacy.ConsumedAnnotation, true);
      });
      const pending = message('still queued');
      Obj.update(pending, (pending) => Annotation.set(pending, Legacy.QueuedAnnotation, true));
      yield* Feed.append(feed, [
        message('hello'),
        message('hi', 'assistant'),
        queued,
        message('queued then answered'),
        message('answer', 'assistant'),
        pending,
      ]);

      const history = yield* TrajectoryStore.history(feed);
      expect(texts(history)).toEqual(['hello', 'hi', 'queued then answered', 'answer']);

      const { state } = yield* TrajectoryStore.load(feed, Reducer.session);
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
      Obj.update(fired, (fired) => Annotation.set(fired, Legacy.ConsumedAnnotation, true));
      const pending = Alarm.make({ wakeAt: 2, message: 'later' });
      yield* Feed.append(feed, [
        Obj.make(AiContext.Binding, {
          skills: { added: [], removed: [] },
          objects: { added: [Ref.make(target)], removed: [] },
        }),
        fired,
        pending,
      ]);

      const { state } = yield* TrajectoryStore.load(feed, Reducer.session);
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
      yield* TrajectoryStore.append(feed, [question]);
      const turn = yield* TrajectoryStore.beginTurn(feed, {
        model: DXN.make('com.anthropic.model.claude-sonnet-5.default'),
      });
      yield* TrajectoryStore.append(
        feed,
        TrajectoryStore.promptEvents(Message.make({ id: question.id, sender: 'user', blocks: [] }), turn, {
          message: question.id,
        }),
      );
      yield* TrajectoryStore.appendMessages(
        feed,
        [Message.make({ sender: 'assistant', blocks: [{ _tag: 'text', text: 'new answer' }] })],
        { thread: turn },
      );
      yield* TrajectoryStore.endTurn(feed, turn, Exit.void);

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
