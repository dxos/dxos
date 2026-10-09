//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as PubSub from 'effect/PubSub';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Tracer from 'effect/Tracer';

import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { Context as DxosContext } from '@dxos/context';
import { Database } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as SpanAttributes from '@dxos/effect/SpanAttributes';
import { log } from '@dxos/log';
import { type OperationInvoker } from '@dxos/operation';
import { markWork } from '@dxos/util';

import * as OperationProcess from './OperationProcess.ts';
import * as RemoteOperationInvoker from './RemoteOperationInvoker.ts';

export type ProcessOperationInvoker = Operation.OperationService & OperationInvoker.OperationInvokerInternal;

export class Service extends Context.Service<Service, ProcessOperationInvoker>()(
  '@dxos/functions/ProcessOperationInvoker',
) {}

/**
 * Creates an invoker that runs every operation as a process spawned through `manager`, which owns service
 * resolution, storage and lifecycle. `InvokeOptions.on === 'edge'` runs it on EDGE for `InvokeOptions.spaceId`:
 * one request through `remote` when given, or else a process spawned on the EDGE runtime.
 */
export const make = ({
  manager,
  origin,
  tracer,
  remote,
}: {
  /** Inside a process, the one whose spawns default their parent to that process. */
  manager: Process.Manager;
  /** Who the spawned processes attribute their database writes to (see `Database.Origin`). */
  origin?: Database.Origin;
  tracer?: Tracer.Tracer;
  /**
   * Runs an `on: 'edge'` invocation as one request to EDGE's operation host: an operation is a call, not a
   * process, so it gets no Durable Object of its own. Resolved per call, since the host may not have it ready.
   */
  remote?: Effect.Effect<RemoteOperationInvoker.Invoker>;
}): ProcessOperationInvoker => {
  // Beneath the caller's context: `invokePromise` starts a fresh, empty-context fiber that would otherwise
  // fall back to Effect's native tracer, whose spans never reach OpenTelemetry.
  const withFallbackTracer = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
    tracer === undefined
      ? effect
      : effect.pipe(
          Effect.updateContext((context: Context.Context<never>) =>
            Context.merge(Context.make(Tracer.Tracer, tracer), context),
          ),
        );

  const pubsub = Effect.runSync(PubSub.unbounded<OperationInvoker.InvocationEvent>());
  const pendingCount = Effect.runSync(Ref.make(0));
  const pendingFibers = new Set<Fiber.Fiber<any>>();

  // Scheduled invocations are detached: they stay out of the caller's child set, so a parent that does not
  // await them is neither woken by nor kept alive by their exit.
  const spawn = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options: Operation.InvokeOptions | undefined,
    detached: boolean,
  ): Effect.Effect<Process.Process<I, O, never>> =>
    Effect.gen(function* () {
      if (options?.on === 'edge' && options.spaceId === undefined) {
        return yield* Effect.die(new Error(`Operation '${op.meta.key}' requested edge execution without a spaceId.`));
      }
      const handle = yield* Process.spawn(OperationProcess.make(op), input, {
        ...(detached ? { parentProcessId: undefined } : {}),
        // Spread only when set: an explicit `undefined` would override the origin a parent passes down.
        ...(origin !== undefined ? { origin } : {}),
        traceMeta: options?.tracing,
        // Notifications ride the process manager: forward `notify` onto the spawned process's params.
        notify: options?.notify,
        environment: {
          ...(options?.spaceId !== undefined ? { space: options.spaceId } : {}),
          ...(options?.conversation !== undefined ? { conversation: options.conversation } : {}),
        },
        ...(options?.on === 'edge' && options.spaceId !== undefined
          ? { location: { kind: 'edge', space: options.spaceId } as const }
          : {}),
      }).pipe(Effect.provideService(Process.ManagerService, manager));
      markWork('process.input-submitted');
      return handle;
    }).pipe(
      Effect.withSpan('ProcessOperationInvoker.invoke', {
        attributes: { [SpanAttributes.OPERATION.key]: op.meta.key.toString() },
      }),
    );

  /** The output of `op`, run on EDGE through `remote`; input and output cross the wire in their encoded form. */
  const invokeRemote = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options: Operation.InvokeOptions & { spaceId: NonNullable<Operation.InvokeOptions['spaceId']> },
    invoker: Effect.Effect<RemoteOperationInvoker.Invoker>,
  ): Effect.Effect<O> =>
    Effect.gen(function* () {
      const encoded = yield* Schema.encodeEffect(op.input)(input).pipe(Effect.orDie);
      const output = yield* (yield* invoker).invoke(DxosContext.default(), String(op.meta.key), encoded, {
        spaceId: options.spaceId,
      });
      return yield* Schema.decodeUnknownEffect(op.output)(output).pipe(Effect.orDie);
    }).pipe(
      Effect.withSpan('ProcessOperationInvoker.invokeRemote', {
        attributes: { [SpanAttributes.OPERATION.key]: op.meta.key.toString() },
      }),
    );

  /** Runs `op` to its output: on EDGE through `remote` when asked for and available, else as a process. */
  const run = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options: Operation.InvokeOptions | undefined,
    detached: boolean,
  ): Effect.Effect<O> =>
    options?.on === 'edge' && options.spaceId !== undefined && remote !== undefined
      ? invokeRemote(op, input, { ...options, spaceId: options.spaceId }, remote)
      : spawn(op, input, options, detached).pipe(Effect.flatMap((handle) => Process.awaitOutput(handle)));

  const invoke: Operation.OperationService['invoke'] = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Effect.Effect<O> => {
    const input = args[0] as I;
    const options = args[1] as Operation.InvokeOptions | undefined;
    return Effect.gen(function* () {
      const output = yield* run(op, input, options, false);
      yield* PubSub.publish(pubsub, { operation: op, input, output, timestamp: Date.now() });
      return output;
    }).pipe(
      Effect.tapCause((cause) =>
        Effect.sync(() => {
          if (!Cause.hasInterruptsOnly(cause)) {
            log.error('operation invocation failed', { opKey: op.meta.key, cause: Cause.pretty(cause) });
          }
        }),
      ),
      withFallbackTracer,
    );
  };

  const schedule: Operation.OperationService['schedule'] = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Effect.Effect<void> => {
    const input = args[0] as I;
    const options = args[1] as Operation.InvokeOptions | undefined;
    return Effect.gen(function* () {
      yield* Ref.update(pendingCount, (count) => count + 1);
      // Through the output, not just the spawn: `awaitFollowups` waits for the operation to finish.
      const fiber = yield* run(op, input, options, true).pipe(
        Effect.ensuring(Ref.update(pendingCount, (count) => count - 1)),
        Effect.tapCause((cause) =>
          Effect.sync(() => {
            if (Cause.hasInterruptsOnly(cause)) {
              log.warn('scheduled operation interrupted', { opKey: op.meta.key });
            } else {
              log.error('scheduled operation failed', { opKey: op.meta.key, cause: Cause.pretty(cause) });
            }
          }),
        ),
        Effect.ignore,
        Effect.forkDetach,
      );
      pendingFibers.add(fiber);
      fiber.addObserver(() => {
        pendingFibers.delete(fiber);
      });
    }).pipe(withFallbackTracer);
  };

  const invokePromise: Operation.OperationService['invokePromise'] = async <I, O>(
    op: Operation.Definition<I, O>,
    ...args: any[]
  ): Promise<{ data?: O; error?: Error }> => {
    try {
      const data = await EffectEx.runAndForwardErrors(invoke(op, ...args) as Effect.Effect<O, Error>);
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  return {
    invoke,
    schedule,
    invokePromise,
    invocations: pubsub,
    pendingFollowups: Ref.get(pendingCount),
    awaitFollowups: Effect.suspend(() => Fiber.awaitAll(globalThis.Array.from(pendingFibers)).pipe(Effect.asVoid)),
    // A process-backed invocation has no path that skips publishing its event.
    _invokeCore: (op, input, options) => invoke(op, input, options),
  };
};

/**
 * Provides `Operation.Service` (and {@link Service}, its full surface) by running every invocation as a
 * process spawned through {@link Process.ManagerService}.
 */
export const layer: Layer.Layer<Operation.Service | Service, never, Process.ManagerService> = Layer.effectContext(
  Effect.gen(function* () {
    const manager = yield* Process.ManagerService;
    // A host provides `Database.Origin` to label what its root invocations write, e.g. `user` for an app's UI.
    const origin = yield* Database.Origin;
    const tracer = yield* Effect.tracer;
    const remote = yield* Effect.serviceOption(RemoteOperationInvoker.Service);
    const invoker = make({
      manager,
      origin,
      tracer,
      remote: Option.getOrUndefined(Option.map(remote, (remoteInvoker) => Effect.succeed(remoteInvoker))),
    });
    return Context.make(Operation.Service, invoker).pipe(Context.add(Service, invoker));
  }),
);
