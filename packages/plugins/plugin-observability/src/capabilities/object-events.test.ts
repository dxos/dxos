//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { type EventAttributes, RemoteEvents } from '@dxos/tracing';

import { type MappedEvent } from './invocation-listener.ts';
import { OBJECT_CREATED_EVENT, listen } from './object-events.ts';

const DRAFT_WINDOW = Duration.millis(10);

const added = (objectId: string, attributes: EventAttributes = {}): EventAttributes => ({
  spaceId: 'space-1',
  objectId,
  typename: 'com.example.type.person',
  userType: true,
  external: false,
  ...attributes,
});

const reported = (objectId: string): MappedEvent => ({
  name: OBJECT_CREATED_EVENT,
  properties: { spaceId: 'space-1', objectId, typename: 'com.example.type.person' },
});

/** Runs the listener over a private event channel; `next` waits for the next event it sends. */
const setup = Effect.gen(function* () {
  const events = new RemoteEvents();
  const sent = yield* Queue.unbounded<MappedEvent>();
  yield* listen(events, (event) => Queue.offer(sent, event).pipe(Effect.asVoid), DRAFT_WINDOW);
  return { events, next: Queue.take(sent), pending: Queue.size(sent) };
});

describe('object events', () => {
  test('reports a user-created object once it outlives the draft window', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { events, next } = yield* setup;

        events.emit('echo.object.add', added('a'));

        expect(yield* next).toEqual(reported('a'));
      }).pipe(Effect.scoped),
    ));

  test('skips internal types, integration-created objects and cancelled drafts', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { events, next, pending } = yield* setup;

        events.emit('echo.object.add', added('internal', { userType: false }));
        events.emit('echo.object.add', added('synced', { external: true }));
        events.emit('echo.object.add', added('draft'));
        events.emit('echo.object.remove', { spaceId: 'space-1', objectId: 'draft' });
        // Events are handled in order, so once this one is reported every earlier one has been decided.
        events.emit('echo.object.add', added('kept'));

        expect(yield* next).toEqual(reported('kept'));
        yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));
        expect(yield* pending).toBe(0);
      }).pipe(Effect.scoped),
    ));

  test('stops listening when its scope closes', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const events = new RemoteEvents();
        const sent: MappedEvent[] = [];
        yield* listen(events, (event) => Effect.sync(() => sent.push(event)), DRAFT_WINDOW).pipe(Effect.scoped);

        events.emit('echo.object.add', added('late'));
        yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));

        expect(sent).toEqual([]);
      }),
    ));
});
