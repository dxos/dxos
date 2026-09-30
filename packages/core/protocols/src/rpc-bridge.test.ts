//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { makeInProcessClient, normalizeHandlers } from './rpc-bridge.ts';

class TestRpcs extends RpcGroup.make(
  Rpc.make('add', { payload: Schema.Struct({ a: Schema.Number, b: Schema.Number }), success: Schema.Number }),
  Rpc.make('count', { payload: Schema.Struct({ to: Schema.Number }), success: Schema.Number, stream: true }),
).prefix('Test.') {}

const handlers: RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof TestRpcs>> = {
  'Test.add': ({ a, b }) => Effect.succeed(a + b),
  'Test.count': ({ to }) => Stream.range(1, to),
};

// Class-instance handlers define their RPC methods on the prototype (not own-enumerable).
class TestHandlers implements RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof TestRpcs>> {
  ['Test.add']({ a, b }: { a: number; b: number }) {
    return Effect.succeed(a + b);
  }

  ['Test.count']({ to }: { to: number }) {
    return Stream.range(1, to);
  }
}

describe('makeInProcessClient', () => {
  test('bridges class-instance handlers (prototype methods) to a client', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* makeInProcessClient(TestRpcs, new TestHandlers());
      const sum = yield* client['Test.add']({ a: 4, b: 5 });
      expect(sum).toEqual(9);
      const counted = yield* client['Test.count']({ to: 2 }).pipe(Stream.runCollect);
      expect([...counted]).toEqual([1, 2]);
    }).pipe(Effect.scoped, EffectEx.runPromise));

  test('bridges unary and streaming handlers to a client without serialization', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* makeInProcessClient(TestRpcs, handlers);

      const sum = yield* client['Test.add']({ a: 2, b: 3 });
      expect(sum).toEqual(5);

      const counted = yield* client['Test.count']({ to: 3 }).pipe(Stream.runCollect);
      expect([...counted]).toEqual([1, 2, 3]);
    }).pipe(Effect.scoped, EffectEx.runPromise));
});

describe('normalizeHandlers', () => {
  // The hang this guards against: effect-rpc calls a stored handler unbound, so a class
  // implementation throws on its first private-field access inside dispatch, where nothing carries
  // the throw back to the caller.
  class PrivateStateHandlers {
    #offset = 10;

    ['Test.add']({ a, b }: { a: number; b: number }) {
      return Effect.succeed(a + b + this.#offset);
    }

    ['Test.count']({ to }: { to: number }) {
      return Stream.range(this.#offset, this.#offset + to);
    }
  }

  test('keys every rpc the implementation provides, and only those', ({ expect }) => {
    expect(Object.keys(normalizeHandlers(TestRpcs, new PrivateStateHandlers())).sort()).toEqual([
      'Test.add',
      'Test.count',
    ]);
    expect(Object.keys(normalizeHandlers(TestRpcs, { 'Test.add': handlers['Test.add'] } as never))).toEqual([
      'Test.add',
    ]);
  });

  test('binds the implementation, so a private field survives dispatch', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* makeInProcessClient(TestRpcs, new PrivateStateHandlers());
      expect(yield* client['Test.add']({ a: 1, b: 2 })).toEqual(13);
      expect([...(yield* client['Test.count']({ to: 2 }).pipe(Stream.runCollect))]).toEqual([10, 11, 12]);
    }).pipe(Effect.scoped, EffectEx.runPromise));
});
