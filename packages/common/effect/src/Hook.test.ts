//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Ref from 'effect/Ref';

import * as Hook from './Hook.ts';

const Foo = Hook.make<number>()('foo');
const Serial = Hook.make<number>()('serial', { strategy: 'serial' });

describe('Hook controller', () => {
  it.effect(
    'dispatches a hook to a subscribed handler',
    Effect.fn(function* ({ expect }) {
      const observed = yield* Ref.make<number[]>([]);

      yield* Hook.subscribe(Hook.handler(Foo, (payload) => Ref.update(observed, (items) => [...items, payload])));

      yield* Hook.emit(Foo, 1);
      yield* Hook.emit(Foo, 2);

      expect(yield* Ref.get(observed)).to.deep.equal([1, 2]);
    }, Effect.provide(Hook.controllerLayer)),
  );

  it.effect(
    'is a no-op when the hook has no subscribers',
    Effect.fn(function* () {
      yield* Hook.emit(Foo, 42);
    }, Effect.provide(Hook.controllerLayer)),
  );

  it.effect(
    'delivers to every subscriber',
    Effect.fn(function* ({ expect }) {
      const seen = yield* Ref.make<number[]>([]);

      yield* Hook.subscribe(Hook.handler(Foo, (payload) => Ref.update(seen, (items) => [...items, payload * 10])));
      yield* Hook.subscribe(Hook.handler(Foo, (payload) => Ref.update(seen, (items) => [...items, payload * 100])));

      yield* Hook.emit(Foo, 3);

      expect((yield* Ref.get(seen)).sort((a, b) => a - b)).to.deep.equal([30, 300]);
    }, Effect.provide(Hook.controllerLayer)),
  );

  it.effect(
    'stops delivering to a handler once its scope closes',
    Effect.fn(function* ({ expect }) {
      const observed = yield* Ref.make<number[]>([]);

      yield* Effect.gen(function* () {
        yield* Hook.subscribe(Hook.handler(Foo, (payload) => Ref.update(observed, (items) => [...items, payload])));
        yield* Hook.emit(Foo, 1);
      }).pipe(Effect.scoped);

      yield* Hook.emit(Foo, 2);

      expect(yield* Ref.get(observed)).to.deep.equal([1]);
    }, Effect.provide(Hook.controllerLayer)),
  );

  it.effect(
    'lets a handler emit a follow-up hook through the pipe form',
    Effect.fn(function* ({ expect }) {
      const seen = yield* Ref.make<string[]>([]);

      yield* Foo.pipe(
        Hook.handler((payload) =>
          Ref.update(seen, (items) => [...items, `foo:${payload}`]).pipe(Effect.andThen(Hook.emit(Serial, payload))),
        ),
        Hook.subscribe,
      );
      yield* Hook.on(
        Serial,
        Effect.fn('onSerial')(function* (payload) {
          yield* Ref.update(seen, (items) => [...items, `serial:${payload}`]);
        }),
      );

      yield* Hook.emit(Foo, 7);

      expect(yield* Ref.get(seen)).to.deep.equal(['foo:7', 'serial:7']);
    }, Effect.provide(Hook.controllerLayer)),
  );

  it.effect(
    'runs handlers concurrently for "parallel" hooks',
    Effect.fn(function* ({ expect }) {
      // The first handler only completes once the second has run, which deadlocks under serial dispatch.
      const gate = yield* Deferred.make<void>();
      const order = yield* Ref.make<string[]>([]);

      yield* Hook.subscribe(
        Hook.handler(Foo, () =>
          Deferred.await(gate).pipe(Effect.andThen(Ref.update(order, (items) => [...items, 'a']))),
        ),
      );
      yield* Hook.subscribe(
        Hook.handler(Foo, () =>
          Ref.update(order, (items) => [...items, 'b']).pipe(Effect.andThen(Deferred.succeed(gate, undefined))),
        ),
      );

      yield* Hook.emit(Foo, 1);

      expect(yield* Ref.get(order)).to.deep.equal(['b', 'a']);
    }, Effect.provide(Hook.controllerLayer)),
  );

  // The id is the contract, not the object: a module instantiated twice must not split the controller.
  it.effect(
    'delivers to a handler subscribed through a separate hook object with the same id',
    Effect.fn(function* ({ expect }) {
      const Twin = Hook.make<number>()('foo');
      const seen = yield* Ref.make<number[]>([]);

      yield* Hook.subscribe(Hook.handler(Twin, (payload) => Ref.update(seen, (items) => [...items, payload])));

      yield* Hook.emit(Foo, 1);

      expect(yield* Ref.get(seen)).to.deep.equal([1]);
    }, Effect.provide(Hook.controllerLayer)),
  );

  it.effect(
    'fails when one id is declared with two dispatch strategies',
    Effect.fn(function* ({ expect }) {
      const Twin = Hook.make<number>()('foo', { strategy: 'serial' });

      yield* Hook.subscribe(Hook.handler(Foo, () => Effect.void));
      const result = yield* Effect.exit(Hook.subscribe(Hook.handler(Twin, () => Effect.void)));

      expect(Exit.isFailure(result)).to.be.true;
    }, Effect.provide(Hook.controllerLayer)),
  );

  it.effect(
    'runs handlers sequentially for "serial" hooks',
    Effect.fn(function* ({ expect }) {
      const order = yield* Ref.make<string[]>([]);

      yield* Hook.subscribe(Hook.handler(Serial, () => Ref.update(order, (items) => [...items, 'a'])));
      yield* Hook.subscribe(Hook.handler(Serial, () => Ref.update(order, (items) => [...items, 'b'])));

      yield* Hook.emit(Serial, 1);

      expect(yield* Ref.get(order)).to.deep.equal(['a', 'b']);
    }, Effect.provide(Hook.controllerLayer)),
  );
});
