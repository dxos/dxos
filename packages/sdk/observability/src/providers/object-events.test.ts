//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import { describe, test } from 'vitest';

import * as Database from '@dxos/echo/Database';
import { EffectEx } from '@dxos/effect';
import { type EventAttributes, RemoteEvents } from '@dxos/tracing';

import { EVENTS, listen } from './object-events.ts';

const DRAFT_WINDOW = Duration.millis(10);

type Captured = { name: string; properties?: Record<string, unknown> };

const entity = (objectId: string, attributes: EventAttributes = {}): EventAttributes => ({
  spaceId: 'space-1',
  objectId,
  typename: 'com.example.type.person',
  relation: false,
  userType: true,
  origin: 'user',
  ...attributes,
});

const reported = (name: string, objectId: string, origin = 'user'): Captured => ({
  name,
  properties: { spaceId: 'space-1', objectId, typename: 'com.example.type.person', origin },
});

/** Runs the listener over a private event channel; `next` waits for the next event it captures. */
const setup = Effect.gen(function* () {
  const events = new RemoteEvents();
  const sent = yield* Queue.unbounded<Captured>();
  yield* listen(events, (name, properties) => Queue.offerUnsafe(sent, { name, properties }), DRAFT_WINDOW);
  return { events, next: Queue.take(sent), pending: Queue.size(sent) };
});

describe('object events', () => {
  test('reports an object once it outlives the draft window, including one nobody attributed', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { events, next } = yield* setup;

        events.emit(Database.TraceEvents.objectAdd, entity('a', { origin: 'unknown' }));

        expect(yield* next).toEqual(reported(EVENTS.objectAdd, 'a', 'unknown'));
      }).pipe(Effect.scoped),
    ));

  test('skips internal types and cancelled drafts, and reports system writes with their origin', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { events, next, pending } = yield* setup;

        events.emit(Database.TraceEvents.objectAdd, entity('internal', { userType: false }));
        events.emit(Database.TraceEvents.objectAdd, entity('draft'));
        events.emit(Database.TraceEvents.objectRemove, entity('draft'));
        // Events are handled in order, so once this one is reported every earlier one has been decided.
        events.emit(Database.TraceEvents.objectAdd, entity('seeded', { origin: 'system' }));

        expect(yield* next).toEqual(reported(EVENTS.objectAdd, 'seeded', 'system'));
        yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));
        expect(yield* pending).toBe(0);
      }).pipe(Effect.scoped),
    ));

  test('reports relations, removals, types and feed appends', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { events, next } = yield* setup;

        events.emit(Database.TraceEvents.objectRemove, entity('old'));
        events.emit(Database.TraceEvents.objectAdd, entity('link', { relation: true, userType: false }));
        events.emit(Database.TraceEvents.typeAdd, {
          spaceId: 'space-1',
          typename: 'com.example.type.task',
          version: '0.1.0',
          origin: 'user',
        });
        events.emit(Database.TraceEvents.feedAppend, { ...entity('message'), feedId: 'feed-1' });

        expect(yield* next).toEqual(reported(EVENTS.objectRemove, 'old'));
        expect(yield* next).toEqual({
          name: EVENTS.typeAdd,
          properties: { spaceId: 'space-1', typename: 'com.example.type.task', version: '0.1.0', origin: 'user' },
        });
        expect(yield* next).toEqual({
          name: EVENTS.feedAppend,
          properties: { ...reported(EVENTS.feedAppend, 'message').properties, feedId: 'feed-1' },
        });
        expect(yield* next).toEqual(reported(EVENTS.relationAdd, 'link'));
      }).pipe(Effect.scoped),
    ));

  test('a draft removed in one space does not cancel the same object id in another', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { events, next } = yield* setup;

        events.emit(Database.TraceEvents.objectAdd, entity('shared', { spaceId: 'space-2' }));
        events.emit(Database.TraceEvents.objectAdd, entity('shared'));
        events.emit(Database.TraceEvents.objectRemove, entity('shared'));

        expect(yield* next).toEqual({
          ...reported(EVENTS.objectAdd, 'shared'),
          properties: { ...reported(EVENTS.objectAdd, 'shared').properties, spaceId: 'space-2' },
        });
      }).pipe(Effect.scoped),
    ));

  test('stops listening when its scope closes', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const events = new RemoteEvents();
        const sent: Captured[] = [];
        yield* listen(events, (name, properties) => sent.push({ name, properties }), DRAFT_WINDOW).pipe(Effect.scoped);

        events.emit(Database.TraceEvents.objectAdd, entity('late'));
        yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));

        expect(sent).toEqual([]);
      }),
    ));
});
