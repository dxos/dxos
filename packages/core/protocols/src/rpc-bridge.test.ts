//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { makeInProcessClient } from './rpc-bridge.ts';

class TestRpcs extends RpcGroup.make(
  Rpc.make('add', { payload: Schema.Struct({ a: Schema.Number, b: Schema.Number }), success: Schema.Number }),
  Rpc.make('count', { payload: Schema.Struct({ to: Schema.Number }), success: Schema.Number, stream: true }),
).prefix('Test.') {}

const handlers: RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof TestRpcs>> = {
  'Test.add': ({ a, b }) => Effect.succeed(a + b),
  'Test.count': ({ to }) => Stream.range(1, to),
};

describe('makeInProcessClient', () => {
  test('bridges unary and streaming handlers to a client without serialization', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* makeInProcessClient(TestRpcs, handlers);

      const sum = yield* client.Test.add({ a: 2, b: 3 });
      expect(sum).toEqual(5);

      const counted = yield* client.Test.count({ to: 3 }).pipe(Stream.runCollect);
      expect([...counted]).toEqual([1, 2, 3]);
    }).pipe(Effect.scoped, Effect.runPromise));
});
