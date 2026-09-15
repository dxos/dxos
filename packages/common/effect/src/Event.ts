//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Pipeable from 'effect/Pipeable';
import * as Scope from 'effect/Scope';

import { invariant } from '@dxos/invariant';

// @import-as-namespace

/**
 * How the handlers of one event are dispatched: `parallel` runs them concurrently and is the
 * default; `serial` runs them one after another in subscription order.
 */
export type Strategy = 'serial' | 'parallel';

export const TypeId = '~@dxos/effect/Event';
export type TypeId = typeof TypeId;

export interface Event<Id extends string, T> extends Pipeable.Pipeable {
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

export type Payload<E extends Any> = E[TypeId]['_Data'];

/**
 * Handlers run in the subscriber's bus so they can emit further events; failures are defects since
 * an event cannot enumerate the errors of every subscriber.
 */
export type HandlerFn<E extends Any> = (payload: Payload<E>) => Effect.Effect<void, never, Bus>;

export interface Handler<E extends Any> {
  readonly event: E;
  readonly handler: HandlerFn<E>;
}

export const handler: {
  <E extends Any>(event: E, handler: HandlerFn<E>): Handler<E>;
  <E extends Any>(handler: HandlerFn<E>): (event: E) => Handler<E>;
} = Function.dual(2, <E extends Any>(event: E, handler: HandlerFn<E>): Handler<E> => ({ event, handler }));

export const make =
  <const T>() =>
  <const Id extends string>(id: Id, options?: { strategy?: Strategy }): Event<Id, T> => ({
    ...Pipeable.Prototype,
    [TypeId]: { _Data: undefined as any },
    id,
    strategy: options?.strategy ?? 'parallel',
  });

export interface BusService {
  subscribe<E extends Any>(handler: Handler<E>): Effect.Effect<void, never, Scope.Scope>;
  emit<E extends Any>(event: E, payload: Payload<E>): Effect.Effect<void>;
}

export class Bus extends Context.Service<Bus, BusService>()('@dxos/effect/Event.Bus') {}

/**
 * Registers the handler until the current scope closes; unsubscription is a plain removal.
 */
export const subscribe = <E extends Any>(handler: Handler<E>): Effect.Effect<void, never, Bus | Scope.Scope> =>
  Bus.pipe(Effect.flatMap((bus) => bus.subscribe(handler)));

/**
 * Subscribes `fn` to `event` for the current scope: `handler` and `subscribe` in one call.
 */
export const on = <E extends Any>(event: E, fn: HandlerFn<E>): Effect.Effect<void, never, Bus | Scope.Scope> =>
  subscribe(handler(event, fn));

/**
 * Dispatches to every subscriber and completes once all of them have, so an emit doubles as a
 * barrier for the work the event triggers.
 */
export const emit = <E extends Any>(event: E, payload: Payload<E>): Effect.Effect<void, never, Bus> =>
  Bus.pipe(Effect.flatMap((bus) => bus.emit(event, payload)));

// Erases the payload type so handlers for different events can share one registry.
type AnyHandler = {
  readonly event: Any;
  readonly handler: (payload: any) => Effect.Effect<void, never, Bus>;
};

export const makeBus = (): BusService => {
  // Keyed by id, not by the event object: these events cross package and bundle boundaries, and a
  // module instantiated twice (dual resolution, a dep-optimizer re-bundle, HMR) would otherwise give
  // publisher and subscriber different objects for the same event and turn the cascade into a silent
  // no-op. The registry holds the event it first saw, so a genuine id collision is loud instead.
  const subscribers = new Map<string, { readonly event: Any; readonly handlers: Set<AnyHandler> }>();

  const bus: BusService = {
    subscribe: (handler) =>
      Effect.gen(function* () {
        const scope = yield* Effect.scope;
        const entry = subscribers.get(handler.event.id) ?? { event: handler.event, handlers: new Set<AnyHandler>() };
        // A duplicated module and a genuine id collision both present as two objects with one id, so
        // identity cannot separate them; a differing strategy is the one inconsistency that can only
        // be a collision, and it is worth failing on rather than dispatching two contracts as one.
        invariant(
          entry.event.strategy === handler.event.strategy,
          `Event id collision: ${handler.event.id} is declared with two dispatch strategies`,
        );
        subscribers.set(handler.event.id, entry);
        entry.handlers.add(handler);
        yield* Scope.addFinalizer(
          scope,
          Effect.sync(() => {
            entry.handlers.delete(handler);
            if (entry.handlers.size === 0) {
              subscribers.delete(handler.event.id);
            }
          }),
        );
      }),
    emit: (event, payload) =>
      Effect.gen(function* () {
        const handlers = subscribers.get(event.id)?.handlers;
        if (handlers === undefined) {
          return;
        }
        const dispatch = Array.from(handlers, (entry) => entry.handler(payload));
        if (event.strategy === 'serial') {
          yield* Effect.forEach(dispatch, (effect) => effect, { discard: true });
        } else {
          yield* Effect.all(dispatch, { concurrency: 'unbounded', discard: true });
        }
      }).pipe(Effect.provideService(Bus, bus)),
  };

  return bus;
};

/**
 * One bus per layer build, so separate runtimes never share subscribers.
 */
export const busLayer: Layer.Layer<Bus> = Layer.sync(Bus, makeBus);
