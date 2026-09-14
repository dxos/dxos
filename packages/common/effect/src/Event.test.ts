//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Ref from 'effect/Ref';

import * as Event from './Event.ts';

const Foo = Event.make<number>()('foo');
const Serial = Event.make<number>()('serial', { strategy: 'serial' });

describe('Event bus', () => {
  it.effect(
    'dispatches an event to a subscribed handler',
    Effect.fn(function* ({ expect }) {
      const observed = yield* Ref.make<number[]>([]);

      yield* Event.subscribe(Event.handler(Foo, (payload) => Ref.update(observed, (items) => [...items, payload])));

      yield* Event.emit(Foo, 1);
      yield* Event.emit(Foo, 2);

      expect(yield* Ref.get(observed)).to.deep.equal([1, 2]);
    }, Effect.provide(Event.busLayer)),
  );

  it.effect(
    'is a no-op when the event has no subscribers',
    Effect.fn(function* () {
      yield* Event.emit(Foo, 42);
    }, Effect.provide(Event.busLayer)),
  );

  it.effect(
    'delivers to every subscriber',
    Effect.fn(function* ({ expect }) {
      const seen = yield* Ref.make<number[]>([]);

      yield* Event.subscribe(Event.handler(Foo, (payload) => Ref.update(seen, (items) => [...items, payload * 10])));
      yield* Event.subscribe(Event.handler(Foo, (payload) => Ref.update(seen, (items) => [...items, payload * 100])));

      yield* Event.emit(Foo, 3);

      expect((yield* Ref.get(seen)).sort((a, b) => a - b)).to.deep.equal([30, 300]);
    }, Effect.provide(Event.busLayer)),
  );

  it.effect(
    'stops delivering to a handler once its scope closes',
    Effect.fn(function* ({ expect }) {
      const observed = yield* Ref.make<number[]>([]);

      yield* Effect.gen(function* () {
        yield* Event.subscribe(Event.handler(Foo, (payload) => Ref.update(observed, (items) => [...items, payload])));
        yield* Event.emit(Foo, 1);
      }).pipe(Effect.scoped);

      yield* Event.emit(Foo, 2);

      expect(yield* Ref.get(observed)).to.deep.equal([1]);
    }, Effect.provide(Event.busLayer)),
  );

  it.effect(
    'lets a handler emit a follow-up event through the pipe form',
    Effect.fn(function* ({ expect }) {
      const seen = yield* Ref.make<string[]>([]);

      yield* Foo.pipe(
        Event.handler((payload) =>
          Ref.update(seen, (items) => [...items, `foo:${payload}`]).pipe(Effect.andThen(Event.emit(Serial, payload))),
        ),
        Event.subscribe,
      );
      yield* Serial.pipe(
        Event.handler((payload) => Ref.update(seen, (items) => [...items, `serial:${payload}`])),
        Event.subscribe,
      );

      yield* Event.emit(Foo, 7);

      expect(yield* Ref.get(seen)).to.deep.equal(['foo:7', 'serial:7']);
    }, Effect.provide(Event.busLayer)),
  );

  it.effect(
    'runs handlers concurrently for "parallel" events',
    Effect.fn(function* ({ expect }) {
      // The first handler only completes once the second has run, which deadlocks under serial dispatch.
      const gate = yield* Deferred.make<void>();
      const order = yield* Ref.make<string[]>([]);

      yield* Event.subscribe(
        Event.handler(Foo, () =>
          Deferred.await(gate).pipe(Effect.andThen(Ref.update(order, (items) => [...items, 'a']))),
        ),
      );
      yield* Event.subscribe(
        Event.handler(Foo, () =>
          Ref.update(order, (items) => [...items, 'b']).pipe(Effect.andThen(Deferred.succeed(gate, undefined))),
        ),
      );

      yield* Event.emit(Foo, 1);

      expect(yield* Ref.get(order)).to.deep.equal(['b', 'a']);
    }, Effect.provide(Event.busLayer)),
  );

  it.effect(
    'keeps events with the same id apart',
    Effect.fn(function* ({ expect }) {
      const Twin = Event.make<string>()('foo');
      const seen = yield* Ref.make<string[]>([]);

      yield* Event.subscribe(Event.handler(Twin, (payload) => Ref.update(seen, (items) => [...items, payload])));

      yield* Event.emit(Foo, 1);

      expect(yield* Ref.get(seen)).to.deep.equal([]);
    }, Effect.provide(Event.busLayer)),
  );

  it.effect(
    'runs handlers sequentially for "serial" events',
    Effect.fn(function* ({ expect }) {
      const order = yield* Ref.make<string[]>([]);

      yield* Event.subscribe(Event.handler(Serial, () => Ref.update(order, (items) => [...items, 'a'])));
      yield* Event.subscribe(Event.handler(Serial, () => Ref.update(order, (items) => [...items, 'b'])));

      yield* Event.emit(Serial, 1);

      expect(yield* Ref.get(order)).to.deep.equal(['a', 'b']);
    }, Effect.provide(Event.busLayer)),
  );
});
