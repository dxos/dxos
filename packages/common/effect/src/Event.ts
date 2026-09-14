import { Context, Effect, Function, Layer, Scope } from 'effect';

// @import-as-namespace

export type Strategy = 'serial' | 'parallel';

export const TypeId = '~@dxos/effect/Event';
export type TypeId = typeof TypeId;

export interface Event<Id extends string, T> {
  readonly [TypeId]: {
    _Data: T;
  };
  readonly id: Id;
  readonly strategy: Strategy;
}

export type Any = {
  readonly [TypeId]: {
    _Data: any;
  };
  readonly id: string;
  readonly strategy: Strategy;
};

export type Payload<E extends Any> = E extends Event<infer _Id, infer T> ? T : never;

export interface Handler<E extends Any> {
  readonly event: E;
  readonly handler: (payload: Payload<E>) => Effect.Effect<void>;
}

export const handler: {
  <E extends Any>(event: E, handler: (payload: Payload<E>) => Effect.Effect<void>): Handler<E>;
  <E extends Any>(event: E): (handler: (payload: Payload<E>) => Effect.Effect<void>) => Handler<E>;
} = Function.dual(2, <E extends Any>(event: E, handler: (payload: Payload<E>) => Effect.Effect<void>) => ({
  event,
  handler,
}));

export const make =
  <const T>() =>
  <const Id extends string>(id: Id, options?: { strategy?: Strategy }): Event<Id, T> => ({
    [TypeId]: { _Data: undefined as any },
    id,
    strategy: options?.strategy ?? 'parallel',
  });

interface BusService {
  subscribe<E extends Any>(handler: Handler<E>): Effect.Effect<void, never, Scope.Scope>;
  emit<E extends Any>(event: E, payload: Payload<E>): Effect.Effect<void>;
}

export class Bus extends Context.Service<Bus, BusService>()('@dxos/effect/Event.Bus') {}

export const subscribe = <E extends Any>(handler: Handler<E>): Effect.Effect<void, never, Bus | Scope.Scope> =>
  Bus.pipe(Effect.flatMap((bus) => bus.subscribe(handler)));

export const emit = <E extends Any>(event: E, payload: Payload<E>): Effect.Effect<void, never, Bus> =>
  Bus.pipe(Effect.flatMap((bus) => bus.emit(event, payload)));

export const makeBus = (): BusService => {
  const subscribers = new Map<string, Set<Handler<Any>>>();

  return {
    subscribe: (handler) =>
      Effect.gen(function* () {
        const scope = yield* Effect.scope;
        const handlers = (subscribers.get(handler.event.id) ?? new Set<Handler<Any>>()).add(handler);
        if (!subscribers.has(handler.event.id)) {
          subscribers.set(handler.event.id, handlers);
        }
        yield* Scope.addFinalizer(
          scope,
          Effect.sync(() => void handlers.delete(handler)),
        );
      }),
    emit: (event, payload) =>
      Effect.gen(function* () {
        const handlers = subscribers.get(event.id);
        if (handlers === undefined) {
          return;
        }
        const dispatch = Array.from(handlers, (entry) => entry.handler(payload));
        if (event.strategy === 'serial') {
          yield* Effect.forEach(dispatch, (effect) => effect);
        } else {
          yield* Effect.all(dispatch, { discard: true });
        }
      }),
  };
};

export const busLayer: Layer.Layer<Bus> = Layer.succeed(Bus, makeBus());
