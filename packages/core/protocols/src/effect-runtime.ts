//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Runtime from 'effect/Runtime';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';

import { RpcClosedError, TimeoutError } from './errors/index.ts';

// Bridges between Effect programs and the imperative Promise/callback boundaries of the client
// and ECHO. Kept protobufjs-free (no proto codec imports) so edge/workerd consumers can run
// effect-rpc calls without pulling the protobuf runtime into their bundle.

/**
 * Runs a service-rpc call at a Promise boundary.
 * Interruption (connection closed underneath the call) surfaces as {@link RpcClosedError} so
 * callers can suppress shutdown races; other failures rethrow with their original identity.
 */
export const runServiceCall = <A>(
  runtime: Runtime.Runtime<never>,
  effect: Effect.Effect<A, any, never>,
  options?: { timeout?: number; label?: string },
): Promise<A> => {
  const call = options?.timeout
    ? effect.pipe(
        Effect.timeoutFail({
          duration: options.timeout,
          onTimeout: () =>
            new TimeoutError({
              message: `RPC timeout: ${options.label ?? 'call'}`,
              context: { timeout: options.timeout },
            }),
        }),
      )
    : effect;
  return Runtime.runPromiseExit(runtime)(call).then((exit) => {
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }
    if (Cause.isInterruptedOnly(exit.cause)) {
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
 */
export const subscribeStream = <A>(
  runtime: Runtime.Runtime<never>,
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
    Stream.runForEach((value) => Effect.sync(() => onData(value))),
    Effect.matchCause({
      onFailure: (cause) => finish(Cause.isInterruptedOnly(cause) ? undefined : EffectEx.causeToError(cause)),
      onSuccess: () => finish(),
    }),
    Runtime.runFork(runtime),
  );
  return () => {
    done = true;
    fiber.unsafeInterruptAsFork(fiber.id());
  };
};
