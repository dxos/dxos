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
 * How the handlers of one hook are dispatched: `parallel` runs them concurrently and is the
 * default; `serial` runs them one after another in subscription order.
 */
export type Strategy = 'serial' | 'parallel';

export const TypeId = '~@dxos/effect/Hook';
export type TypeId = typeof TypeId;

export interface Hook<Id extends string, T> extends Pipeable.Pipeable {
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
 * Handlers run in the subscriber's controller so they can emit further hooks; failures are defects
 * since a hook cannot enumerate the errors of every subscriber.
 */
export type HandlerFn<E extends Any> = (payload: Payload<E>) => Effect.Effect<void, never, Controller>;

export interface Handler<E extends Any> {
  readonly hook: E;
  readonly handler: HandlerFn<E>;
}

/**
 * Pairs a hook with the function that runs on it, ready to pass to `subscribe`. Dual: called with
 * one argument it returns the pipeable form, so `handler(fn)` composes onto the hook.
 *
 * @param hook The hook to bind to.
 * @param handler Runs per emit, receiving the hook's payload.
 * @returns The pairing `subscribe` registers.
 */
export const handler: {
  <E extends Any>(hook: E, handler: HandlerFn<E>): Handler<E>;
  <E extends Any>(handler: HandlerFn<E>): (hook: E) => Handler<E>;
} = Function.dual(2, <E extends Any>(hook: E, handler: HandlerFn<E>): Handler<E> => ({ hook, handler }));

/**
 * Declares a hook. Curried so the payload type is given explicitly while the id stays inferred:
 * `make<Payload>()('my/id')`.
 *
 * @param id Identifies the hook across package and bundle boundaries, so it must be unique.
 * @param options.strategy How subscribers are dispatched; `parallel` by default.
 * @returns The hook to emit and subscribe to.
 */
export const make =
  <const T>() =>
  <const Id extends string>(id: Id, options?: { strategy?: Strategy }): Hook<Id, T> => ({
    ...Pipeable.Prototype,
    [TypeId]: { _Data: undefined as any },
    id,
    strategy: options?.strategy ?? 'parallel',
  });

export interface ControllerService {
  subscribe<E extends Any>(handler: Handler<E>): Effect.Effect<void, never, Scope.Scope>;
  emit<E extends Any>(hook: E, payload: Payload<E>): Effect.Effect<void>;
}

export class Controller extends Context.Service<Controller, ControllerService>()('@dxos/effect/Hook.Controller') {}

/**
 * Registers the handler until the current scope closes; unsubscription is a plain removal.
 */
export const subscribe = <E extends Any>(handler: Handler<E>): Effect.Effect<void, never, Controller | Scope.Scope> =>
  Controller.pipe(Effect.flatMap((controller) => controller.subscribe(handler)));

/**
 * Subscribes `fn` to `hook` for the current scope: `handler` and `subscribe` in one call.
 */
export const on = <E extends Any>(hook: E, fn: HandlerFn<E>): Effect.Effect<void, never, Controller | Scope.Scope> =>
  subscribe(handler(hook, fn));

/**
 * Dispatches to every subscriber and completes once all of them have — including the hooks those
 * handlers emit in turn — so an emit doubles as a barrier for the work the hook triggers. A
 * handler that fails fails the emitter as a defect, so this is not a fire-and-forget notification.
 */
export const emit = <E extends Any>(hook: E, payload: Payload<E>): Effect.Effect<void, never, Controller> =>
  Controller.pipe(Effect.flatMap((controller) => controller.emit(hook, payload)));

// Erases the payload type so handlers for different hooks can share one registry.
type AnyHandler = {
  readonly hook: Any;
  readonly handler: (payload: any) => Effect.Effect<void, never, Controller>;
};

export const makeController = (): ControllerService => {
  // Keyed by id, not by the hook object: these hooks cross package and bundle boundaries, and a
  // module instantiated twice (dual resolution, a dep-optimizer re-bundle, HMR) would otherwise give
  // publisher and subscriber different objects for the same hook and turn the cascade into a silent
  // no-op. The registry holds the hook it first saw, so a genuine id collision is loud instead.
  const subscribers = new Map<string, { readonly hook: Any; readonly handlers: Set<AnyHandler> }>();

  const controller: ControllerService = {
    subscribe: (handler) =>
      Effect.gen(function* () {
        const scope = yield* Effect.scope;
        const entry = subscribers.get(handler.hook.id) ?? { hook: handler.hook, handlers: new Set<AnyHandler>() };
        // A duplicated module and a genuine id collision both present as two objects with one id, so
        // identity cannot separate them; a differing strategy is the one inconsistency that can only
        // be a collision, and it is worth failing on rather than dispatching two contracts as one.
        invariant(
          entry.hook.strategy === handler.hook.strategy,
          `Hook id collision: ${handler.hook.id} is declared with two dispatch strategies`,
        );
        subscribers.set(handler.hook.id, entry);
        entry.handlers.add(handler);
        yield* Scope.addFinalizer(
          scope,
          Effect.sync(() => {
            entry.handlers.delete(handler);
            if (entry.handlers.size === 0) {
              subscribers.delete(handler.hook.id);
            }
          }),
        );
      }),
    emit: (hook, payload) =>
      Effect.gen(function* () {
        const handlers = subscribers.get(hook.id)?.handlers;
        if (handlers === undefined) {
          return;
        }
        const dispatch = Array.from(handlers, (entry) => entry.handler(payload));
        if (hook.strategy === 'serial') {
          yield* Effect.forEach(dispatch, (effect) => effect, { discard: true });
        } else {
          yield* Effect.all(dispatch, { concurrency: 'unbounded', discard: true });
        }
      }).pipe(Effect.provideService(Controller, controller)),
  };

  return controller;
};

/**
 * One controller per layer build, so separate runtimes never share subscribers.
 */
export const controllerLayer: Layer.Layer<Controller> = Layer.sync(Controller, makeController);
