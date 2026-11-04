//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as TestClock from 'effect/testing/TestClock';
import { expect } from 'vitest';

import * as Chat from '@dxos/assistant/Chat';
import * as Trace from '@dxos/compute/Trace';
import { Feed, Ref } from '@dxos/echo';

import { agentProgressKey, withTurnStatus } from './turn-status.ts';

/** The status updates a run wrote, as `[key, message]` pairs in order. */
const collect = () => {
  const updates: [string | undefined, string | undefined][] = [];
  const layer = Trace.testTraceService().pipe(
    Layer.provide(
      Layer.succeed(Trace.TraceSink, {
        write: (message) => {
          for (const event of message.events) {
            if (event.type === Trace.StatusUpdate.key) {
              const data = event.data as Trace.PayloadType<typeof Trace.StatusUpdate>;
              updates.push([data.progress?.key, data.message]);
            }
          }
        },
      }),
    ),
  );
  return { updates, layer };
};

const makeChat = () => Chat.make({ feed: Ref.make(Feed.make()) });

describe('withTurnStatus', () => {
  it.effect('reports a turn as working, then complete', () => {
    const { updates, layer } = collect();
    const chat = makeChat();
    const key = agentProgressKey(chat);
    return Effect.gen(function* () {
      yield* Effect.void.pipe(withTurnStatus(chat));
      expect(updates).toEqual([
        [key, 'Assistant is working'],
        [key, Trace.StatusComplete],
      ]);
    }).pipe(Effect.provide(layer));
  });

  it.effect('reports a companion turn on the object it accompanies too', () => {
    const { updates, layer } = collect();
    const chat = makeChat();
    const subject = makeChat();
    Chat.linkCompanion({ chat, subject });
    return Effect.gen(function* () {
      yield* Effect.void.pipe(withTurnStatus(chat));
      expect(updates.slice(0, 2)).toEqual([
        [agentProgressKey(chat), 'Assistant is working'],
        [agentProgressKey(subject), 'Assistant is working on this'],
      ]);
    }).pipe(Effect.provide(layer));
  });

  it.effect('ends a failed turn as failed and a stopped one as cancelled', () => {
    const { updates, layer } = collect();
    const chat = makeChat();
    return Effect.gen(function* () {
      yield* Effect.fail('boom').pipe(withTurnStatus(chat), Effect.ignore);
      yield* Effect.interrupt.pipe(withTurnStatus(chat), Effect.exit);
      expect(updates.map(([, message]) => message)).toEqual([
        'Assistant is working',
        Trace.StatusFailed,
        'Assistant is working',
        Trace.StatusCancelled,
      ]);
    }).pipe(Effect.provide(layer));
  });

  it.effect('repeats the update while a long turn runs', () => {
    const { updates, layer } = collect();
    const chat = makeChat();
    return Effect.gen(function* () {
      const release = yield* Deferred.make<void>();
      const turn = yield* Deferred.await(release).pipe(withTurnStatus(chat), Effect.forkChild);
      yield* TestClock.adjust('65 seconds');
      expect(updates.length).toBe(3);
      yield* Deferred.succeed(release, undefined);
      yield* Fiber.join(turn);
      expect(updates.at(-1)?.[1]).toBe(Trace.StatusComplete);
    }).pipe(Effect.provide(layer));
  });
});
