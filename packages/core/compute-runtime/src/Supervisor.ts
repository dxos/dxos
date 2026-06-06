//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';

import { type Operation, type Process } from '@dxos/compute';

import * as ProcessOperationInvoker from './ProcessOperationInvoker';

/**
 * Delegates work to a child process running `operation`, linked to the current process so the
 * child's completion is delivered to the parent's `onChildEvent`.
 *
 * Non-blocking: returns the child's process id immediately without awaiting its output.
 * This is the supervisor primitive — unlike `Operation.invoke` (which awaits the child and blocks the
 * handler) and `Operation.schedule` (which detaches the child, so no `onChildEvent` fires).
 */
export const delegate = <I, O>(
  operation: Operation.Definition<I, O>,
  input: I,
): Effect.Effect<Process.ID, never, ProcessOperationInvoker.Service> =>
  Effect.gen(function* () {
    const invoker = yield* ProcessOperationInvoker.Service;
    const fiber = yield* invoker.invokeFiber(operation, input);
    return fiber.pid;
  });

/**
 * Reads the result of a finished child process. Intended for use inside `onChildEvent`,
 * where `Process.ChildEvent` carries only the exit signal, not the child's output value.
 * A child failure is returned as a failed `Exit` (the caller decides how to handle it);
 * a missing process is an invariant violation (the child just reported its exit) and dies.
 */
export const collectResult = <O>(
  pid: Process.ID,
): Effect.Effect<Exit.Exit<O>, never, ProcessOperationInvoker.Service> =>
  Effect.gen(function* () {
    const invoker = yield* ProcessOperationInvoker.Service;
    const fiber = yield* invoker.attachFiber<O>(pid).pipe(Effect.orDie);
    return yield* fiber.await;
  });
