//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Stream from 'effect/Stream';

import * as EffectEx from '@dxos/effect/EffectEx';
import { throwUnhandledError } from '@dxos/util';

import { RpcClosedError, TimeoutError } from './errors/index.ts';

// Bridges between Effect programs and the imperative Promise/callback boundaries of the client
// and ECHO. Kept protobufjs-free (no proto codec imports) so edge/workerd consumers can run
// effect-rpc calls without pulling the protobuf runtime into their bundle.

type ServiceMethod = (payload: any) => Effect.Effect<any, any, never>;

/**
 * Calls the `tag` method of a service-rpc client at a Promise boundary; the tag names the call in
 * timeout errors.
 */
export const runServiceCall = <C extends { readonly [K in T]: ServiceMethod }, const T extends string>(
  runtime: Context.Context<never>,
  client: C,
  tag: T,
  payload: Parameters<C[T]>[0],
  options?: { timeout?: number },
): Promise<Effect.Success<ReturnType<C[T]>>> =>
  runServiceEffect(runtime, client[tag](payload), { ...options, label: tag });

/**
 * Runs a service-rpc effect at a Promise boundary.
 * Interruption (connection closed underneath the call) surfaces as {@link RpcClosedError} so
 * callers can suppress shutdown races; other failures rethrow with their original identity.
 */
export const runServiceEffect = <A>(
  runtime: Context.Context<never>,
  effect: Effect.Effect<A, any, never>,
  options: { timeout?: number; label: string },
): Promise<A> => {
  const call = options.timeout
    ? effect.pipe(
        Effect.timeoutOrElse({
          duration: options.timeout,
          orElse: () =>
            Effect.fail(
              new TimeoutError({
                message: `RPC timeout: ${options.label}`,
                context: { timeout: options.timeout },
              }),
            ),
        }),
      )
    : effect;
  return Effect.runPromiseExit(Effect.provideContext(call, runtime)).then((exit) => {
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }
    if (Cause.hasInterruptsOnly(exit.cause)) {
      throw new RpcClosedError();
    }
    throw EffectEx.causeToError(exit.cause);
  });
};

export type StreamSubscription<A> = {
  onData: (value: A) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
};

/**
 * Subscribes to a service-rpc stream with callback semantics matching the protobuf `Stream`.
 * Returns a cleanup function that interrupts the underlying subscription; the fiber is a daemon
 * so it survives being forked from a short-lived effect, and cleanup is the sole owner.
 * A throwing `onData` is rethrown as an unhandled error and the subscription keeps delivering.
 */
export const subscribeStream = <A>(
  runtime: Context.Context<never>,
  stream: Stream.Stream<A, any, never>,
  { onData, onError, onClose }: StreamSubscription<A>,
): (() => void) => {
  let done = false;
  const finish = (err?: Error) => {
    if (done) {
      return;
    }
    done = true;
    if (err) {
      onError?.(err);
    } else {
      onClose?.();
    }
  };
  const fiber = stream.pipe(
    Stream.runForEach((value) =>
      Effect.sync(() => {
        try {
          onData(value);
        } catch (err) {
          // Callers rarely pass `onError`, so ending the stream here would hide the subscriber's bug.
          throwUnhandledError(err instanceof Error ? err : new Error(String(err)));
        }
      }),
    ),
    Effect.matchCause({
      onFailure: (cause) => finish(Cause.hasInterruptsOnly(cause) ? undefined : EffectEx.causeToError(cause)),
      onSuccess: () => finish(),
    }),
    Effect.provideContext(runtime),
    Effect.runFork,
  );
  return () => {
    done = true;
    fiber.interruptUnsafe();
  };
};
