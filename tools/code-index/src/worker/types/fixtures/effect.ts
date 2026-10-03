//
// Copyright 2026 DXOS.org
//

// Agreement fixture for the Effect models: every declaration is scored against `tsc`.

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { type Remote } from './remote.ts';

export interface StoreApi {
  readonly get: (key: string) => Effect.Effect<string>;
}

export class Store extends Context.Service<Store, StoreApi>()('fixture/Store') {}

export class Clock extends Context.Service<Clock, { readonly now: () => number }>()('fixture/Clock') {}

export class Logger extends Context.Service<Logger, { readonly log: (line: string) => void }>()('fixture/Logger') {}

export class NotFound {
  readonly _tag = 'NotFound';
}

export const succeed = Effect.succeed(1);
export const fail = Effect.fail(new NotFound());
export const sync = Effect.sync(() => 'a');
export const unit = Effect.void;
export const annotated: Effect.Effect<number> = Effect.succeed(1);

export const program = Effect.gen(function* () {
  const store = yield* Store;
  const value = yield* store.get('x');
  return value.length;
});

export const failing = Effect.gen(function* () {
  return yield* Effect.fail(new NotFound());
});

export const clockLayer = Layer.succeed(Clock, { now: () => 0 });

export const storeLayer = Layer.effect(
  Store,
  Effect.gen(function* () {
    const clock = yield* Clock;
    return { get: (key: string) => Effect.succeed(`${key}${clock.now()}`) };
  }),
);

export const loggerLayer = Layer.succeed(Logger, { log: () => undefined });

export const merged = Layer.mergeAll(loggerLayer, storeLayer);
export const provided = storeLayer.pipe(Layer.provide(clockLayer));
export const providedDirect = Layer.provide(storeLayer, clockLayer);
export const mergedTwo = Layer.merge(clockLayer, storeLayer);

export const Person = Schema.Struct({ name: Schema.String, age: Schema.Number });
export const Kind = Schema.Literal('person');
export const remote: Remote = { remote: true };
